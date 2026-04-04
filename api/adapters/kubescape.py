"""Normalize Kubescape CLI JSON (`kubescape scan --format json`) into Finding rows."""

from __future__ import annotations

from typing import Any

from api.adapters.base import BaseAdapter
from api.adapters.kspm_common import kspm_domain, normalize_severity, safe_str


class KubescapeAdapter(BaseAdapter):
    tool_name = "kubescape"

    def normalize(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        # Already-unified list (CI / agent pre-shaped)
        findings = payload.get("findings")
        if isinstance(findings, list) and findings:
            first = findings[0]
            if isinstance(first, dict) and first.get("tool") == self.tool_name and first.get("title"):
                return [self._ensure_row(f) for f in findings]

        root = payload.get("report") if isinstance(payload.get("report"), dict) else payload
        out: list[dict[str, Any]] = []

        for res in root.get("resources") or []:
            out.extend(self._from_resource(res))

        # Alternate: flat results[] with control rows (some versions)
        for row in root.get("results") or []:
            out.extend(self._from_result_row(row))

        # Cluster / framework summary rows with nested controls
        for ctrl in root.get("controls") or []:
            out.extend(self._from_control_summary(ctrl))

        return out

    def _ensure_row(self, f: dict[str, Any]) -> dict[str, Any]:
        row = dict(f)
        row.setdefault("tool", self.tool_name)
        row.setdefault("source", "ingest")
        row.setdefault("domain", kspm_domain())
        row["severity"] = normalize_severity(row.get("severity"), "MEDIUM")
        row.setdefault("compliance", row.get("compliance") or [])
        row.setdefault("raw", row.get("raw") or {})
        return row

    def _from_resource(self, res: dict[str, Any]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        rid = safe_str(res.get("resourceID") or res.get("resourceId") or "")
        rkind = safe_str(res.get("resourceKind") or res.get("kind") or "")
        ns = safe_str(res.get("namespace") or "")
        rname = safe_str(res.get("resourceName") or res.get("name") or "")

        for fc in res.get("failedControls") or []:
            cid = safe_str(fc.get("controlID") or fc.get("id") or fc.get("controlId") or "")
            title = safe_str(fc.get("name") or fc.get("controlName") or cid or "Kubescape control")
            sev = normalize_severity(fc.get("severity") or fc.get("severityText"), "MEDIUM")
            desc = fc.get("description") or fc.get("longDescription") or fc.get("remediation")
            rem = fc.get("remediation") or fc.get("fix")
            out.append(
                {
                    "tool": self.tool_name,
                    "source": "ingest",
                    "domain": kspm_domain(),
                    "severity": sev,
                    "check_id": cid or None,
                    "resource_type": rkind or None,
                    "resource_id": rid or None,
                    "resource_name": rname or None,
                    "namespace": ns or None,
                    "title": title,
                    "description": safe_str(desc) if desc else None,
                    "remediation": safe_str(rem) if rem else None,
                    "compliance": fc.get("compliance") or [],
                    "raw": {"resource": res, "failedControl": fc},
                }
            )
        return out

    def _from_result_row(self, row: dict[str, Any]) -> list[dict[str, Any]]:
        """Handle result objects that embed controls or a single control."""
        out: list[dict[str, Any]] = []
        rid = safe_str(row.get("resourceID") or row.get("resourceId") or "")
        if row.get("controlID") or row.get("id"):
            cid = safe_str(row.get("controlID") or row.get("id") or "")
            title = safe_str(row.get("name") or row.get("controlName") or cid)
            sev = normalize_severity(row.get("severity"), "MEDIUM")
            out.append(
                {
                    "tool": self.tool_name,
                    "source": "ingest",
                    "domain": kspm_domain(),
                    "severity": sev,
                    "check_id": cid or None,
                    "resource_id": rid or None,
                    "title": title,
                    "description": safe_str(row.get("description")) or None,
                    "remediation": safe_str(row.get("remediation")) or None,
                    "compliance": row.get("compliance") or [],
                    "raw": row,
                }
            )
        for c in row.get("controls") or []:
            out.extend(self._from_control_summary(c, resource_id=rid))
        return out

    def _from_control_summary(
        self, ctrl: dict[str, Any], resource_id: str = ""
    ) -> list[dict[str, Any]]:
        status = safe_str(ctrl.get("status") or ctrl.get("Status") or "").lower()
        if status in ("passed", "pass", "skipped", "skip"):
            return []

        cid = safe_str(ctrl.get("controlID") or ctrl.get("id") or "")
        title = safe_str(ctrl.get("name") or ctrl.get("controlName") or cid or "Kubescape control")
        sev = normalize_severity(ctrl.get("severity"), "MEDIUM")
        return [
            {
                "tool": self.tool_name,
                "source": "ingest",
                "domain": kspm_domain(),
                "severity": sev,
                "check_id": cid or None,
                "resource_id": resource_id or None,
                "title": title,
                "description": safe_str(ctrl.get("description")) or None,
                "remediation": safe_str(ctrl.get("remediation")) or None,
                "compliance": ctrl.get("compliance") or [],
                "raw": ctrl,
            }
        ]
