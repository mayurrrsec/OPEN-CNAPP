from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from sqlalchemy.orm import Session

from api.models import Plugin


@dataclass
class PluginSpec:
    name: str
    display_name: str
    domain: str
    run_mode: str
    enabled: bool
    schedule: str | None
    image: str | None
    normalizer: str | None
    config: dict[str, Any]

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "PluginSpec":
        return cls(
            name=raw["name"],
            display_name=raw.get("display_name", raw["name"].title()),
            domain=raw.get("domain", "cnapp"),
            run_mode=raw.get("run_mode", "container"),
            enabled=bool(raw.get("enabled", True)),
            schedule=raw.get("schedule"),
            image=raw.get("image"),
            normalizer=raw.get("normalizer"),
            config=raw.get("config", {}),
        )


def discover_plugin_specs(plugins_dir: str = "plugins") -> list[PluginSpec]:
    specs: list[PluginSpec] = []
    for path in Path(plugins_dir).glob("*/plugin.yaml"):
        raw = yaml.safe_load(path.read_text()) or {}
        specs.append(PluginSpec.from_dict(raw))
    specs.sort(key=lambda p: p.name)
    return specs


def sync_plugins_to_db(db: Session, plugins_dir: str = "plugins") -> int:
    specs = discover_plugin_specs(plugins_dir)
    synced = 0
    for spec in specs:
        existing = db.query(Plugin).filter(Plugin.name == spec.name).first()
        if existing:
            existing.display_name = spec.display_name
            existing.domain = spec.domain
            existing.run_mode = spec.run_mode
            existing.enabled = spec.enabled
            existing.schedule = spec.schedule
            existing.image = spec.image
            existing.normalizer = spec.normalizer
            existing.config = spec.config
        else:
            db.add(
                Plugin(
                    name=spec.name,
                    display_name=spec.display_name,
                    domain=spec.domain,
                    run_mode=spec.run_mode,
                    enabled=spec.enabled,
                    schedule=spec.schedule,
                    image=spec.image,
                    normalizer=spec.normalizer,
                    config=spec.config,
                )
            )
        synced += 1
    db.commit()
    return synced
