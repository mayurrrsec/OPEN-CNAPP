from api.adapters.base import BaseAdapter

class KubescapeAdapter(BaseAdapter):
    tool_name = "kubescape"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
