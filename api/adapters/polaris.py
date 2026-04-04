"""Normalize Polaris audit JSON (`polaris audit --format json`) into Finding rows."""

from __future__ import annotations

from typing import Any

from api.adapters.base import BaseAdapter
from api.adapters.kspm_common import kspm_domain, normalize_severity, safe_str


class PolarisAdapter(BaseAdapter):
    tool_name = "polaris"

    def normalize(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        rows = payload.get("findings")
        if isinstance(rows, list) and rows and isinstance(rows[0], dict) and rows[0].get("tool") == self.tool_name:
            return [self._row(r) for r in rows]

        out: list[dict[str, Any]] = []
        for pr in payload.get("Results") or []:
            if not isinstance(pr, dict):
                continue
            ns = safe_str(pr.get("Namespace") or "")
            name = safe_str(pr.get("Name") or "")
            kind = safe_str(pr.get("Kind") or "")
            base = f"{kind}/{ns}/{name}".strip("/")

            nested = pr.get("PodResult") or pr.get("Results") or pr.get("Result")
            self._walk_checks(nested, out, base, ns, name, kind)

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

    def _walk_checks(
        self,
        node: Any,
        out: list[dict[str, Any]],
        resource_hint: str,
        namespace: str,
        name: str,
        kind: str,
    ) -> None:
        if node is None:
            return
        if isinstance(node, dict):
            if "Severity" in node and "Message" in node:
                sev = normalize_severity(node.get("Severity"), "MEDIUM")
                msg = safe_str(node.get("Message") or "")
                cid = safe_str(node.get("ID") or node.get("Category") or "polaris")
                title = msg[:500] or f"Polaris: {cid}"
                out.append(
                    {
                        "tool": self.tool_name,
                        "source": "ingest",
                        "domain": kspm_domain(),
                        "severity": sev,
                        "check_id": cid or None,
                        "resource_type": kind or None,
                        "resource_id": resource_hint or None,
                        "resource_name": name or None,
                        "namespace": namespace or None,
                        "title": title,
                        "description": msg or None,
                        "remediation": safe_str(node.get("Remediation")) or None,
                        "compliance": [],
                        "raw": node,
                    }
                )
            for v in node.values():
                self._walk_checks(v, out, resource_hint, namespace, name, kind)
        elif isinstance(node, list):
            for item in node:
                self._walk_checks(item, out, resource_hint, namespace, name, kind)
