from api.adapters.base import BaseAdapter


class AwsSecurityHubAdapter(BaseAdapter):
    tool_name = "aws_security_hub"

    def normalize(self, payload: dict | list):
        if isinstance(payload, list):
            rows = payload
        else:
            rows = payload.get("Findings", payload.get("findings", []))
        if not isinstance(rows, list):
            return []
        out: list[dict] = []
        for f in rows:
            if not isinstance(f, dict):
                continue
            title = f.get("Title") or f.get("title") or "Security Hub finding"
            sev_raw = f.get("Severity")
            if isinstance(sev_raw, dict):
                sev_label = sev_raw.get("Label") or sev_raw.get("Normalized") or "MEDIUM"
            else:
                sev_label = sev_raw or "MEDIUM"
            sev = self._severity(str(sev_label))
            resources = f.get("Resources") or []
            res = resources[0] if isinstance(resources, list) and resources else {}
            rid = res.get("Id") if isinstance(res, dict) else None
            rtype = res.get("Type") if isinstance(res, dict) else None
            region = res.get("Region") if isinstance(res, dict) else None
            pf = f.get("ProductFields") or {}
            check_id = None
            if isinstance(pf, dict):
                check_id = pf.get("ControlId") or pf.get("StandardsControlArn")
            out.append(
                {
                    "tool": self.tool_name,
                    "source": "native_ingest",
                    "domain": "cspm",
                    "severity": sev,
                    "title": str(title)[:2000],
                    "description": f.get("Description"),
                    "check_id": (str(check_id)[:200] if check_id else None),
                    "resource_id": rid,
                    "resource_name": None,
                    "resource_type": rtype,
                    "cloud_provider": "aws",
                    "region": region,
                    "raw": f,
                }
            )
        return out
