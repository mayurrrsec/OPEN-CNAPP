from api.adapters.base import BaseAdapter

class GitleaksAdapter(BaseAdapter):
    tool_name = "gitleaks"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
