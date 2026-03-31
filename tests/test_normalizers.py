import unittest

from api.adapters.trivy import TrivyAdapter
from api.adapters.gitleaks import GitleaksAdapter
from api.adapters.checkov import CheckovAdapter
from api.adapters.sbom import SbomAdapter


class NormalizerTests(unittest.TestCase):
    def test_trivy_normalize(self):
        payload = {"Results": [{"Target": "image:app", "Vulnerabilities": [{"VulnerabilityID": "CVE-1", "PkgName": "openssl", "Severity": "HIGH"}]}]}
        out = TrivyAdapter().normalize(payload)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["tool"], "trivy")

    def test_gitleaks_normalize(self):
        payload = {"leaks": [{"File": "a.txt", "RuleID": "secret-rule", "Description": "AWS key"}]}
        out = GitleaksAdapter().normalize(payload)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["domain"], "secrets")

    def test_checkov_normalize(self):
        payload = {"results": {"failed_checks": [{"check_id": "CKV_1", "check_name": "No public bucket", "severity": "HIGH", "file_path": "main.tf"}]}}
        out = CheckovAdapter().normalize(payload)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["tool"], "checkov")

    def test_sbom_cyclonedx(self):
        payload = {"components": [{"name": "openssl", "version": "3.0.0", "purl": "pkg:generic/openssl@3.0.0"}]}
        out = SbomAdapter().normalize(payload)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["domain"], "sbom")


if __name__ == '__main__':
    unittest.main()
