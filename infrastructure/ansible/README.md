# Common dependencies with Ansible

Run the common setup repeatedly to install missing tools and reconcile shared Kubernetes
configuration. This targets the existing Amazon Linux 2023 x86_64 management runner and
`waypoint-dev` EKS cluster. Terraform continues to own the VPC, EKS, IAM, storage class,
namespace, and network policies.

From the repository root, using your existing AWS CLI identity:

```bash
# Install/repair runner tools, verify existing secrets, reconcile CA/config/RabbitMQ.
python3 infrastructure/ansible/run_ssm.py common

# Preview drift after the initial setup; no package bootstrap or kubectl apply.
python3 infrastructure/ansible/run_ssm.py common --check

# Verify RabbitMQ and a real database connection with hostname/certificate validation.
python3 infrastructure/ansible/run_ssm.py preflight
```

The defaults are instance `i-0aff1c6a497d5032c`, region `ap-southeast-1`, cluster
`waypoint-dev`. Override with `--instance-id`, `--region`, and `--cluster` when targeting
another already-provisioned environment with the same `waypoint-dev` namespace contract.
The AWS identity needs SSM send/get-command access; the runner's identity needs EKS
cluster discovery and the existing Kubernetes administrator access for common resources.

The launcher transfers an explicit allowlist of automation and public manifests using
SSM Run Command, then runs Ansible locally on the private runner. A host-wide
`flock` serializes runs to avoid concurrent package or cluster changes. It requires no SSH,
SSM connection collection, or S3 transfer bucket. `.env`, secrets, Terraform state, and
application source are excluded. Check mode still uploads this static automation bundle;
it does not bootstrap Python/Ansible or apply infrastructure. Run setup once before check
mode. SSM command IDs and the remote automation directory are printed for troubleshooting.

## Managed dependencies

- Docker (enabled/started; a running daemon is not restarted).
- Corretto Java 21 and Maven 3.9; AWS CLI v2, Git, jq, OpenSSL and archive utilities.
- Go, .NET SDK 8, Node.js 22/npm and Python YAML for `scripts/ci-test.sh`.
- Python 3.12 and an isolated Ansible controller under `/opt/waypoint/ansible-venv`.
- Checksum-verified kubectl and Trivy in versioned `/opt/waypoint/tools` directories.
- Dedicated EKS kubeconfig at `/opt/waypoint/ansible/waypoint-dev-kubeconfig`.
- `application-config`, the public `supabase-db-ca`, and persistent RabbitMQ, reusing
  the existing Kubernetes manifests and `waypoint-gp3-retain` storage class.

Version settings and package names live in `group_vars/all.yml`; the controller and
its Python dependencies are pinned in `requirements.txt`. OS packages use `state: present`
from the configured AL2023 repositories, not `latest` or a full system update. Set
`waypoint_install_ci_toolchains: false` for a Java-only runner when invoking Ansible
directly. Installing common toolchains does not change Maven application dependencies or
upgrade the bases in service Dockerfiles.

Secrets must already exist as `planning-service-secrets` and `rabbitmq-secrets`. The
playbook checks required keys and broker credential consistency with `no_log: true`.
It does not create, print, rotate, or copy secret values into files. The CA is public,
version-controlled, and mounted at `/etc/db-ca/root.crt`; verification uses
`sslmode=verify-full`. The preflight job runs only `SELECT 1` and is deleted in an
`always` block, with a TTL as backup cleanup. It never changes application records.

## Separate playbooks and release checks

```bash
python3 infrastructure/ansible/run_ssm.py runner --syntax-check
python3 infrastructure/ansible/run_ssm.py cluster
python3 infrastructure/ansible/run_ssm.py verify-planning --image '<built-image-tag-or-digest>'
```

`verify-planning.yml` runs Maven verification in `/opt/waypoint/repo`, rejects missing,
failed, or skipped PostgreSQL integration tests, then runs the image's CRITICAL vulnerability
and secret scan. Any failed task stops the playbook. There is no image push or application
deployment in these common dependency playbooks. Existing Tomcat/Spring CVE findings
still require application dependency updates and a passing scan before release.

To run directly inside an SSM session from this directory:

```bash
sudo bash bootstrap.sh
sudo /opt/waypoint/ansible-venv/bin/ansible-playbook common.yml
sudo /opt/waypoint/ansible-venv/bin/ansible-playbook common.yml --check
```

The bootstrap installs only the controller prerequisites; Ansible owns subsequent common
configuration. It preserves the system Python used by AL2023's DNF modules. Jenkins
itself, its credentials, application deployments, ingress, database migrations, and other
services' persistent volumes remain outside this setup.

## Validation

```bash
python3 -m unittest discover -s infrastructure/ansible/tests -v
bash -n infrastructure/ansible/bootstrap.sh
python3 infrastructure/ansible/run_ssm.py common --syntax-check
```

For idempotence, apply `common` twice: the second Ansible recap should report `changed=0`.
`preflight` intentionally creates and removes a diagnostic Job, so it is separate from
that measurement. Check mode previews package/config drift; first-time binary extraction
is skipped because no archive is downloaded in check mode.
