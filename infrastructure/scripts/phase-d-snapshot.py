#!/usr/bin/env python3
"""Copy source for isolated builds without local credential files, build outputs or Terraform state."""
from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[2]
dest = root / 'infrastructure/local/phase-d-source'
if dest.exists():
    raise SystemExit('Snapshot already exists; choose a new path or deliberately refresh reviewed files.')
def ignore(directory, names):
    return [n for n in names if n in {'.git','.terraform','node_modules','bin','obj','target','dist','backups','local','rendered'}
            or n == '.env' or n.startswith('.env.') and n != '.env.example'
            or n.endswith(('.tfstate','.tfvars','.tfplan','.key','.pem','.pfx'))]
shutil.copytree(root,dest,ignore=ignore)
print(dest)
