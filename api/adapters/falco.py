from api.adapters.base import BaseAdapter

class FalcoAdapter(BaseAdapter):
    tool_name = "falco"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
