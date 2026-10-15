#!/usr/bin/env python3
"""Local structural checks only; no cluster or cloud access."""
from pathlib import Path
import ipaddress
import yaml
root = Path(__file__).resolve().parents[2]
network = ipaddress.ip_network('10.20.0.0/16')
for known in ['10.0.0.0/16', '172.31.0.0/16']:
    assert not network.overlaps(ipaddress.ip_network(known)), known
objects = []
for path in (root / 'infrastructure/kubernetes').glob('*.yaml'):
    for obj in yaml.safe_load_all(path.read_text()):
        assert isinstance(obj, dict) and obj.get('kind') and obj.get('apiVersion'), path
        if obj['kind'] != 'Kustomization':
            objects.append(obj)
ids = [(o['kind'], o['metadata'].get('namespace'), o['metadata']['name']) for o in objects]
assert len(ids) == len(set(ids)), 'duplicate Kubernetes objects'
deployments = [o for o in objects if o['kind'] == 'Deployment']
assert len(deployments) == 6
for deploy in deployments:
    pod = deploy['spec']['template']['spec']
    assert pod['automountServiceAccountToken'] is False
    for c in pod['containers']:
        assert all(k in c for k in ['resources', 'readinessProbe', 'livenessProbe', 'startupProbe'])
        assert c['securityContext']['allowPrivilegeEscalation'] is False
for svc in [o for o in objects if o['kind'] == 'Service']:
    assert svc['spec'].get('type', 'ClusterIP') == 'ClusterIP'
print(f'PASS: {len(objects)} Kubernetes objects parsed; six deployments; known CIDRs do not overlap.')
print('Templates retain placeholders. This is not API-server or application validation.')
