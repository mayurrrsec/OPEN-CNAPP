from api.adapters.base import BaseAdapter


class KubebenchAdapter(BaseAdapter):
    tool_name = "kubebench"

    def normalize(self, payload: dict):
        rows = payload.get("findings", payload.get("results", []))
        out = []
        for r in rows:
            out.append({
                "tool": self.tool_name,
                "source": "ci_ingest",
                "domain": r.get("domain", "compliance"),
                "severity": self._severity(r.get("severity"), "MEDIUM"),
                "check_id": r.get("check_id") or r.get("id"),
                "resource_id": r.get("resource_id") or r.get("resource"),
                "title": r.get("title") or r.get("name") or f"{self.tool_name} finding",
                "description": r.get("description"),
                "remediation": r.get("remediation"),
                "compliance": r.get("compliance", []),
                "raw": r,
            })
        return out
