from api.adapters.base import BaseAdapter


class DefenderForCloudAdapter(BaseAdapter):
    tool_name = "defender_for_cloud"

    def normalize(self, payload: dict | list):
        if isinstance(payload, list):
            items = payload
        else:
            items = payload.get("findings", payload.get("value", []))
            if not isinstance(items, list):
                items = []
        out: list[dict] = []
        for row in items:
            if not isinstance(row, dict):
                continue
            props = row.get("properties") if isinstance(row.get("properties"), dict) else row
            title = (
                props.get("displayName")
                or props.get("alertDisplayName")
                or row.get("name")
                or "Defender finding"
            )
            sev = self._severity(str(props.get("severity") or row.get("Severity") or "MEDIUM"))
            rid = None
            rname = None
            ris = props.get("resourceIdentifiers")
            if isinstance(ris, list) and ris and isinstance(ris[0], dict):
                rid = ris[0].get("azureResourceId") or ris[0].get("id")
            ce = props.get("compromisedEntity")
            if isinstance(ce, str):
                rname = ce
            out.append(
                {
                    "tool": self.tool_name,
                    "source": "native_ingest",
                    "domain": "cspm",
                    "severity": sev,
                    "title": str(title)[:2000],
                    "description": props.get("description"),
                    "remediation": None,
                    "check_id": str(row.get("name") or props.get("alertIdentifier") or "")[:200] or None,
                    "resource_id": rid,
                    "resource_name": (rname or props.get("compromisedEntity") or "")[:500] or None,
                    "cloud_provider": "azure",
                    "raw": row,
                }
            )
        return out
