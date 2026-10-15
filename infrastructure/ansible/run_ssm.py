#!/usr/bin/env python3
"""Run the bounded Ansible bundle on the existing private runner via SSM."""
import argparse
import base64
import hashlib
import gzip
import io
import json
from pathlib import Path
import shlex
import subprocess
import tarfile
import time


def aws(*args):
    result = subprocess.run(["aws", *args, "--region", OPTIONS.region, "--output", "json"],
                            text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout)


def bundle():
    root = Path(__file__).resolve().parents[2]
    # Only automation code and public manifests; never package .env, source builds,
    # local inventories, secret files, Terraform state, or the repository wholesale.
    relative_paths = [
        "infrastructure/ansible/ansible.cfg", "infrastructure/ansible/inventory.yml",
        "infrastructure/ansible/requirements.txt", "infrastructure/ansible/bootstrap.sh",
        "infrastructure/ansible/group_vars/all.yml",
        "infrastructure/ansible/roles/runner/tasks/main.yml",
        "infrastructure/ansible/roles/cluster/tasks/main.yml",
        "infrastructure/ansible/templates/db-check.yml.j2",
        *[f"infrastructure/ansible/{name}.yml" for name in
          ("common", "runner", "cluster", "preflight", "verify-planning")],
        *[f"infrastructure/kubernetes/{name}.yaml" for name in
          ("configmap", "supabase-db-ca", "rabbitmq")],
    ]
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode="w") as tar:
        for relative in relative_paths:
            data = (root / relative).read_bytes()
            info = tarfile.TarInfo(relative)
            info.size = len(data)
            info.mode = 0o644
            tar.addfile(info, io.BytesIO(data))
    return gzip.compress(archive.getvalue(), mtime=0)


def main():
    payload = bundle()
    release = hashlib.sha256(payload).hexdigest()[:20]
    destination = f"/opt/waypoint/automation/{release}"
    playbook_dir = f"{destination}/infrastructure/ansible"
    variables = {"waypoint_region": OPTIONS.region, "waypoint_cluster": OPTIONS.cluster}
    if OPTIONS.image:
        variables["planning_image"] = OPTIONS.image
    invocation = ["/opt/waypoint/ansible-venv/bin/ansible-playbook", f"{OPTIONS.playbook}.yml",
                  "--extra-vars", json.dumps(variables)]
    if OPTIONS.check:
        invocation.append("--check")
    if OPTIONS.syntax_check:
        invocation.append("--syntax-check")
    commands = ["set -eu", "mkdir -p /opt/waypoint/automation",
                "exec 9>/opt/waypoint/automation/run.lock", "flock -x -w 1500 9",
                f"mkdir -p {shlex.quote(destination)}",
                f"printf '%s' '{base64.b64encode(payload).decode()}' | base64 -d | tar -xzf - -C {shlex.quote(destination)}",
                f"cd {shlex.quote(playbook_dir)}"]
    if OPTIONS.check:
        commands.append("test -x /opt/waypoint/ansible-venv/bin/ansible-playbook || { echo 'Run bootstrap through a normal runner invocation before check mode.'; exit 1; }")
    else:
        commands.append("bash bootstrap.sh")
    commands.append(shlex.join(invocation))
    parameters = json.dumps({"commands": commands, "executionTimeout": ["1800"]})
    if len(parameters.encode()) > 60000:
        raise RuntimeError("Automation bundle exceeds the bounded SSM inline payload budget")
    result = aws("ssm", "send-command", "--instance-ids", OPTIONS.instance_id,
                 "--document-name", "AWS-RunShellScript", "--parameters", parameters)
    command_id = result["Command"]["CommandId"]
    print(f"SSM command: {command_id}", flush=True)
    print(f"Automation directory: {playbook_dir}", flush=True)
    while True:
        time.sleep(10)
        try:
            result = aws("ssm", "get-command-invocation", "--command-id", command_id,
                         "--instance-id", OPTIONS.instance_id)
        except RuntimeError as error:
            if "InvocationDoesNotExist" in str(error):
                continue
            raise
        status = result["Status"]
        if status not in ("Pending", "InProgress", "Delayed"):
            print(result.get("StandardOutputContent", ""))
            print(result.get("StandardErrorContent", ""))
            print(f"Status: {status}")
            return 0 if status == "Success" else 1
        print(f"SSM status: {status}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("playbook", choices=["common", "runner", "cluster", "preflight", "verify-planning"])
    parser.add_argument("--instance-id", default="i-0aff1c6a497d5032c")
    parser.add_argument("--region", default="ap-southeast-1")
    parser.add_argument("--cluster", default="waypoint-dev")
    parser.add_argument("--image", help="Image selected for verify-planning")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--syntax-check", action="store_true")
    OPTIONS = parser.parse_args()
    raise SystemExit(main())
