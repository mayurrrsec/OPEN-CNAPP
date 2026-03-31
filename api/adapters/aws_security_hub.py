from api.adapters.base import BaseAdapter

class Aws_security_hubAdapter(BaseAdapter):
    tool_name = "aws_security_hub"

    def normalize(self, payload: dict):
        findings = payload.get("findings", [])
        return findings if isinstance(findings, list) else []
