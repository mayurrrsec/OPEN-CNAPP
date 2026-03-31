from api.adapters.base import BaseAdapter

class ProwlerAdapter(BaseAdapter):
    tool_name = "prowler"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
