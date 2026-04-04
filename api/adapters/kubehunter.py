"""Normalize kube-hunter JSON report (`kube-hunter --report json`) into Finding rows."""

from __future__ import annotations

from typing import Any

from api.adapters.base import BaseAdapter
from api.adapters.kspm_common import kspm_domain, normalize_severity, safe_str


class KubehunterAdapter(BaseAdapter):
    tool_name = "kubehunter"

    def normalize(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        rows = payload.get("findings")
        if isinstance(rows, list) and rows and isinstance(rows[0], dict) and rows[0].get("tool") == self.tool_name:
            return [self._row(r) for r in rows]

        out: list[dict[str, Any]] = []
        vulns = payload.get("vulnerabilities")
        if not isinstance(vulns, list):
            vulns = payload.get("vulnerability") or payload.get("items") or []

        for v in vulns:
            if not isinstance(v, dict):
                continue
            vid = safe_str(v.get("vid") or v.get("id") or v.get("hunter") or "")
            title = safe_str(v.get("title") or v.get("name") or vid or "kube-hunter finding")
            sev = normalize_severity(v.get("severity"), "MEDIUM")
            loc = safe_str(v.get("location") or v.get("node") or v.get("category") or "")
            out.append(
                {
                    "tool": self.tool_name,
                    "source": "ingest",
                    "domain": kspm_domain(),
                    "severity": sev,
                    "check_id": vid or None,
                    "resource_type": loc or None,
                    "resource_id": loc or None,
                    "title": title,
                    "description": safe_str(v.get("description") or v.get("desc")) or None,
                    "remediation": safe_str(v.get("remediation") or v.get("fix")) or None,
                    "compliance": [],
                    "raw": v,
                }
            )
        return out

    def _row(self, r: dict[str, Any]) -> dict[str, Any]:
        x = dict(r)
        x.setdefault("tool", self.tool_name)
        x.setdefault("source", "ingest")
        x.setdefault("domain", kspm_domain())
        x["severity"] = normalize_severity(x.get("severity"), "MEDIUM")
        x.setdefault("compliance", x.get("compliance") or [])
        x.setdefault("raw", x.get("raw") or {})
        return x
