from api.adapters.base import BaseAdapter

class NucleiAdapter(BaseAdapter):
    tool_name = "nuclei"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
