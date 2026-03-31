from api.adapters.base import BaseAdapter


class CheckovAdapter(BaseAdapter):
    tool_name = "checkov"

    def normalize(self, payload: dict):
        reports = payload.get("results", {})
        failed = reports.get("failed_checks", [])
        normalized = []
        for row in failed:
            normalized.append(
                {
                    "tool": self.tool_name,
                    "source": "ci_ingest",
                    "domain": "iac",
                    "severity": self._severity(row.get("severity")),
                    "check_id": row.get("check_id"),
                    "title": row.get("check_name", "Checkov policy failed"),
                    "description": row.get("guideline"),
                    "resource_id": row.get("file_path"),
                    "resource_name": row.get("resource"),
                    "compliance": row.get("check_class", []),
                    "raw": row,
                }
            )
        return normalized
