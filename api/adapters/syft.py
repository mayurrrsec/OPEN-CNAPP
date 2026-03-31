from api.adapters.base import BaseAdapter


class SyftAdapter(BaseAdapter):
    tool_name = "syft"

    def normalize(self, payload: dict):
        artifacts = payload.get("artifacts", [])
        normalized = []
        for artifact in artifacts:
            normalized.append(
                {
                    "tool": self.tool_name,
                    "source": "ci_ingest",
                    "domain": "sbom",
                    "severity": "INFO",
                    "resource_id": artifact.get("name"),
                    "check_id": artifact.get("purl"),
                    "title": f"SBOM package: {artifact.get('name', 'unknown')}",
                    "description": f"Version: {artifact.get('version', 'n/a')}",
                    "raw": artifact,
                }
            )
        return normalized
