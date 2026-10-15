#!/usr/bin/env bash
set -euo pipefail
# Run on the private AL2023 runner through SSM, not on a developer workstation.
[[ $(id -u) == 0 ]] || { echo 'Bootstrap requires root on the runner.' >&2; exit 1; }
source /etc/os-release
[[ $ID == amzn && $VERSION_ID == 2023 ]] || { echo 'Amazon Linux 2023 required.' >&2; exit 1; }
ansible_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
controller_env=/opt/waypoint/ansible-venv
if ! command -v python3.12 >/dev/null; then
  dnf install -y python3.12 python3.12-pip
fi
if [[ ! -x $controller_env/bin/python ]]; then
  python3.12 -m venv "$controller_env"
fi
"$controller_env/bin/python" -m pip install --disable-pip-version-check -r "$ansible_dir/requirements.txt"
