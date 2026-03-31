from api.adapters.base import BaseAdapter

class Defender_for_cloudAdapter(BaseAdapter):
    tool_name = "defender_for_cloud"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
