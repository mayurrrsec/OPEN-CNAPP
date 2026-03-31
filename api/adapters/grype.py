from api.adapters.base import BaseAdapter


class GrypeAdapter(BaseAdapter):
    tool_name = "grype"

    def normalize(self, payload: dict):
        matches = payload.get("matches", [])
        normalized = []
        for m in matches:
            vuln = m.get("vulnerability", {})
            artifact = m.get("artifact", {})
            normalized.append(
                {
                    "tool": self.tool_name,
                    "source": "ci_ingest",
                    "domain": "sca",
                    "severity": self._severity(vuln.get("severity")),
                    "cve_id": vuln.get("id"),
                    "cvss_score": (vuln.get("cvss", [{}])[0] or {}).get("metrics", {}).get("baseScore"),
                    "resource_id": artifact.get("name"),
                    "check_id": artifact.get("purl"),
                    "title": vuln.get("id", "Dependency vulnerability"),
                    "description": vuln.get("description"),
                    "raw": m,
                }
            )
        return normalized
