from api.adapters.base import BaseAdapter


class GitleaksAdapter(BaseAdapter):
    tool_name = "gitleaks"

    def normalize(self, payload: dict):
        rows = payload.get("findings", payload.get("leaks", []))
        normalized = []
        for row in rows:
            normalized.append(
                {
                    "tool": self.tool_name,
                    "source": "ci_ingest",
                    "domain": "secrets",
                    "severity": "HIGH",
                    "resource_id": row.get("File"),
                    "check_id": row.get("RuleID"),
                    "title": f"Secret detected: {row.get('Description', 'rule match')}",
                    "description": f"Commit: {row.get('Commit', 'n/a')}, Author: {row.get('Author', 'n/a')}",
                    "raw": row,
                }
            )
        return normalized
