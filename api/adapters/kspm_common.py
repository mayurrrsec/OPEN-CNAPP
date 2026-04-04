"""Shared helpers for KSPM tool adapters."""

from __future__ import annotations

from typing import Any


def kspm_domain() -> str:
    return "kspm"


def safe_str(v: Any, default: str = "") -> str:
    if v is None:
        return default
    return str(v)


def normalize_severity(value: str | None, default: str = "MEDIUM") -> str:
    if not value:
        return default
    normalized = str(value).upper()
    aliases = {
        "WARNING": "MEDIUM",
        "WARN": "MEDIUM",
        "ERROR": "HIGH",
        "CRIT": "CRITICAL",
        "DANGER": "HIGH",
        "DANGEROUS": "HIGH",
        "INFO": "LOW",
        "INFORMATIONAL": "LOW",
        "PASS": "LOW",
    }
    return aliases.get(normalized, normalized)
