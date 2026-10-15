"""Test the SSM transport boundary without contacting AWS."""
import argparse
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shlex
import tarfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('run_ssm', Path(__file__).parents[1] / 'run_ssm.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class TransportTests(unittest.TestCase):
    def test_bundle_is_deterministic_and_contains_only_public_automation(self):
        payload = runner.bundle()
        self.assertEqual(payload, runner.bundle())
        with tarfile.open(fileobj=io.BytesIO(payload), mode='r:gz') as archive:
            names = archive.getnames()
            self.assertIn('infrastructure/kubernetes/supabase-db-ca.yaml', names)
            self.assertIn('infrastructure/ansible/common.yml', names)
            self.assertTrue(all(name.startswith(('infrastructure/ansible/', 'infrastructure/kubernetes/')) for name in names))
            self.assertFalse(any('..' in Path(name).parts or name.startswith('/') for name in names))
            self.assertFalse(any('.env' in name or 'secrets' in name or '/local/' in name or '/tests/' in name for name in names))
            self.assertTrue(all(item.isfile() for item in archive.getmembers()))

    def invoke(self, *, check=False, image=None, result='Success'):
        runner.OPTIONS = argparse.Namespace(playbook='common', region='ap-southeast-1', cluster='waypoint-dev',
                                            instance_id='i-test', check=check, syntax_check=False, image=image)
        with patch.object(runner, 'aws', side_effect=[{'Command': {'CommandId': 'test'}}, {'Status': result}]) as aws_call, \
             patch.object(runner.time, 'sleep'), contextlib.redirect_stdout(io.StringIO()):
            code = runner.main()
        args = aws_call.call_args_list[0].args
        parameters = json.loads(args[args.index('--parameters') + 1])
        return code, parameters['commands']

    def test_check_mode_does_not_bootstrap_packages(self):
        code, commands = self.invoke(check=True)
        self.assertEqual(code, 0)
        self.assertNotIn('bash bootstrap.sh', commands)
        self.assertIn('--check', shlex.split(commands[-1]))

    def test_variables_are_single_shell_quoted_arguments(self):
        value = 'example:tag; $(touch /tmp/never-executed)'
        _, commands = self.invoke(image=value)
        argv = shlex.split(commands[-1])
        variables = json.loads(argv[argv.index('--extra-vars') + 1])
        self.assertEqual(variables['planning_image'], value)
        self.assertEqual(len(argv), 4)

    def test_remote_failure_is_not_reported_as_success(self):
        code, _ = self.invoke(result='Failed')
        self.assertEqual(code, 1)


if __name__ == '__main__':
    unittest.main()
