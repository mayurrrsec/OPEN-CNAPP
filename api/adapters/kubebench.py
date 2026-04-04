"""Normalize kube-bench JSON (`kube-bench --json`) into Finding rows."""

from __future__ import annotations

from typing import Any

from api.adapters.base import BaseAdapter
from api.adapters.kspm_common import kspm_domain, normalize_severity, safe_str


class KubebenchAdapter(BaseAdapter):
    tool_name = "kubebench"

    def normalize(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        # Pre-shaped list
        rows = payload.get("findings")
        if isinstance(rows, list) and rows and isinstance(rows[0], dict) and rows[0].get("tool") == self.tool_name:
            return [self._row(r) for r in rows]

        out: list[dict[str, Any]] = []
        controls = payload.get("Controls")
        if isinstance(controls, list):
            for c in controls:
                self._walk(c, out)
        elif isinstance(controls, dict):
            self._walk(controls, out)

        # Some builds emit a single top-level tests array
        if not out and payload.get("tests"):
            self._walk({"tests": payload["tests"]}, out)

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

    def _walk(self, node: Any, out: list[dict[str, Any]], section: str = "") -> None:
        if isinstance(node, dict):
            tr = node.get("test_result") or node.get("TestResult") or node.get("audit_result")
            if tr is not None:
                result = safe_str(tr).upper()
                if result in ("FAIL", "WARN", "WARNING"):
                    tid = safe_str(
                        node.get("test_number")
                        or node.get("test_id")
                        or node.get("id")
                        or node.get("test_desc", "")[:24]
                    )
                    title = safe_str(node.get("test_desc") or tid or "kube-bench check")
                    sev = "HIGH" if result == "FAIL" else "MEDIUM"
                    out.append(
                        {
                            "tool": self.tool_name,
                            "source": "ingest",
                            "domain": kspm_domain(),
                            "severity": sev,
                            "check_id": tid or None,
                            "resource_id": section or None,
                            "title": title,
                            "description": safe_str(node.get("reason") or node.get("audit")) or None,
                            "remediation": safe_str(node.get("remediation")) or None,
                            "compliance": [{"framework": "CIS", "section": section}] if section else [],
                            "raw": node,
                        }
                    )
            sec = safe_str(node.get("section") or node.get("id") or section)
            for key in ("tests", "groups", "controls", "results"):
                child = node.get(key)
                if isinstance(child, list):
                    for item in child:
                        self._walk(item, out, sec or section)
                elif isinstance(child, dict):
                    self._walk(child, out, sec or section)
        elif isinstance(node, list):
            for item in node:
                self._walk(item, out, section)
