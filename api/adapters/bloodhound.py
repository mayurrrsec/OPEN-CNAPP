from api.adapters.base import BaseAdapter

class BloodhoundAdapter(BaseAdapter):
    tool_name = "bloodhound"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
