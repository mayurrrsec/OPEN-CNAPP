from api.adapters.base import BaseAdapter


class ProwlerAdapter(BaseAdapter):
    tool_name = "prowler"

    def normalize(self, payload: dict):
        rows = payload.get("findings", payload if isinstance(payload, list) else [])
        normalized = []
        for row in rows:
            normalized.append(
                {
                    "tool": self.tool_name,
                    "source": "scheduled",
                    "domain": "cspm",
                    "severity": self._severity(row.get("Severity")),
                    "cloud_provider": row.get("Provider", "aws").lower(),
                    "region": row.get("Region"),
                    "resource_id": row.get("ResourceId"),
                    "resource_name": row.get("ResourceName"),
                    "check_id": row.get("CheckID"),
                    "title": row.get("CheckTitle", "Prowler finding"),
                    "description": row.get("Description"),
                    "remediation": row.get("Remediation"),
                    "compliance": row.get("Compliance", []),
                    "raw": row,
                }
            )
        return normalized
