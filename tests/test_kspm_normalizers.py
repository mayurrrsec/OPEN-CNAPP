"""Tests for KSPM ingest normalizers and ingest body wrapping."""

import unittest

from api.adapters.kubescape import KubescapeAdapter
from api.adapters.kubebench import KubebenchAdapter
from api.adapters.polaris import PolarisAdapter
from api.adapters.kubehunter import KubehunterAdapter
from api.ingest_service import prepare_ingest_body


class KspmNormalizerTests(unittest.TestCase):
    def test_prepare_ingest_body_wrapped(self):
        inner = {"resources": []}
        body = {"data": inner, "connector_id": "c1"}
        payload, cid = prepare_ingest_body(body)
        self.assertEqual(cid, "c1")
        self.assertEqual(payload, inner)

    def test_prepare_ingest_body_raw(self):
        body = {"resources": [{"resourceID": "r1", "failedControls": []}]}
        payload, cid = prepare_ingest_body(body)
        self.assertIsNone(cid)
        self.assertIn("resources", payload)

    def test_kubescape_resources(self):
        payload = {
            "resources": [
                {
                    "resourceID": "default/apps/v1/Deployment/test",
                    "resourceKind": "Deployment",
                    "namespace": "default",
                    "resourceName": "test",
                    "failedControls": [
                        {
                            "controlID": "C-0001",
                            "name": "Privileged container",
                            "severity": "High",
                        }
                    ],
                }
            ]
        }
        out = KubescapeAdapter().normalize(payload)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["tool"], "kubescape")
        self.assertEqual(out[0]["check_id"], "C-0001")
        self.assertEqual(out[0]["domain"], "kspm")

    def test_kubebench_controls(self):
        payload = {
            "Controls": [
                {
                    "id": "1",
                    "tests": [
                        {
                            "section": "1.1",
                            "results": [
                                {
                                    "test_number": "1.1.1",
                                    "test_desc": "Ensure something",
                                    "test_result": "FAIL",
                                    "remediation": "Fix it",
                                }
                            ],
                        }
                    ],
                }
            ]
        }
        out = KubebenchAdapter().normalize(payload)
        self.assertGreaterEqual(len(out), 1)
        self.assertEqual(out[0]["tool"], "kubebench")
        self.assertEqual(out[0]["domain"], "kspm")

    def test_polaris_results(self):
        payload = {
            "Results": [
                {
                    "Namespace": "default",
                    "Name": "web",
                    "Kind": "Deployment",
                    "Results": {
                        "cpuLimits": {"Severity": "danger", "Message": "CPU limits not set"}
                    },
                }
            ]
        }
        out = PolarisAdapter().normalize(payload)
        self.assertGreaterEqual(len(out), 1)
        self.assertEqual(out[0]["tool"], "polaris")

    def test_kubehunter_vulns(self):
        payload = {
            "vulnerabilities": [
                {
                    "vid": "KHV001",
                    "severity": "high",
                    "title": "Test issue",
                    "location": "Master",
                }
            ]
        }
        out = KubehunterAdapter().normalize(payload)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["check_id"], "KHV001")


if __name__ == "__main__":
    unittest.main()
