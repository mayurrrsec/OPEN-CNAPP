from api.adapters.base import BaseAdapter

class ThreatmapperAdapter(BaseAdapter):
    tool_name = "threatmapper"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
