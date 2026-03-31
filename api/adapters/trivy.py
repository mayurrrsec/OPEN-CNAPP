from api.adapters.base import BaseAdapter

class TrivyAdapter(BaseAdapter):
    tool_name = "trivy"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
