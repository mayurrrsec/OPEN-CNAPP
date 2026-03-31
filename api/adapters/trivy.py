from api.adapters.base import BaseAdapter


class TrivyAdapter(BaseAdapter):
    tool_name = "trivy"

    def normalize(self, payload: dict):
        normalized = []
        for result in payload.get("Results", []):
            target = result.get("Target")
            for vuln in result.get("Vulnerabilities", []):
                normalized.append(
                    {
                        "tool": self.tool_name,
                        "source": "ci_ingest",
                        "domain": "image-sec",
                        "severity": self._severity(vuln.get("Severity")),
                        "cvss_score": (vuln.get("CVSS", {}).get("nvd", {}) or {}).get("V3Score"),
                        "cve_id": vuln.get("VulnerabilityID"),
                        "resource_id": target,
                        "check_id": vuln.get("PkgName"),
                        "title": vuln.get("Title") or f"{vuln.get('PkgName')} vulnerable",
                        "description": vuln.get("Description"),
                        "remediation": f"Upgrade to fixed version: {vuln.get('FixedVersion', 'n/a')}",
                        "raw": vuln,
                    }
                )
        return normalized
