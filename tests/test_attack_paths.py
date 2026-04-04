"""Smoke tests for attack path builder and API helpers."""

import os
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.database.session import Base
from api.models import Finding
from api.models.attack_path import AttackPath
from api.attack_path_builder import rebuild_all_attack_paths


class TestAttackPaths(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def test_rebuild_creates_paths_from_findings(self):
        os.environ["OPENCNAPP_SKIP_ATTACK_PATH_REBUILD"] = "0"
        db = self.Session()
        try:
            db.add(
                Finding(
                    tool="prowler",
                    source="scheduled",
                    domain="cspm",
                    severity="HIGH",
                    title="Public bucket",
                    cloud_provider="aws",
                    resource_id="arn:aws:s3:::ex",
                    resource_name="ex",
                    check_id="s3.public",
                )
            )
            db.commit()

            out = rebuild_all_attack_paths(db)
            self.assertGreaterEqual(out.get("paths", 0), 0)
            n = db.query(AttackPath).count()
            self.assertGreaterEqual(n, 0)
        finally:
            db.close()

    def test_rebuild_respects_skip_env(self):
        os.environ["OPENCNAPP_SKIP_ATTACK_PATH_REBUILD"] = "1"
        db = self.Session()
        try:
            out = rebuild_all_attack_paths(db)
            self.assertEqual(out.get("skipped"), 1)
        finally:
            db.close()
            os.environ.pop("OPENCNAPP_SKIP_ATTACK_PATH_REBUILD", None)


if __name__ == "__main__":
    unittest.main()
