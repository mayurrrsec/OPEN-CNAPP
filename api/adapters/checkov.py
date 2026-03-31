from api.adapters.base import BaseAdapter

class CheckovAdapter(BaseAdapter):
    tool_name = "checkov"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
