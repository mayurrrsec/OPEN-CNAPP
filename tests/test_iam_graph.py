"""Tests for IAM graph subgraph and ETL helpers."""

import os
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.database.session import Base
from api.models import Connector
from api.models.iam_graph import GraphEdge, GraphNode
from api.services.iam_graph_etl_pmapper import ingest_pmapper_style_json
from api.services.iam_graph_subgraph import build_subgraph
from api.services.iam_graph_sync_aws import sync_aws_iam_graph


class TestIamGraph(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def test_subgraph_bfs_depth(self):
        db = self.Session()
        try:
            c = Connector(
                name="c1",
                display_name="C1",
                connector_type="aws",
                encrypted_credentials=None,
                settings={},
            )
            db.add(c)
            db.commit()
            db.refresh(c)

            a = GraphNode(
                connector_id=c.id,
                cloud_account_id="111",
                provider="aws",
                node_type="iam_role",
                external_id="arn:aws:iam::111:role/a",
                label="a",
                properties={},
            )
            b = GraphNode(
                connector_id=c.id,
                cloud_account_id="111",
                provider="aws",
                node_type="iam_policy_managed",
                external_id="arn:aws:iam::111:policy/p",
                label="p",
                properties={},
            )
            db.add_all([a, b])
            db.commit()
            db.refresh(a)
            db.refresh(b)

            db.add(
                GraphEdge(
                    connector_id=c.id,
                    source_node_id=a.id,
                    target_node_id=b.id,
                    edge_type="ATTACHED",
                    properties={},
                )
            )
            db.commit()

            out = build_subgraph(
                db,
                connector_id=c.id,
                resource_arn="arn:aws:iam::111:role/a",
                depth=2,
                max_nodes=50,
            )
            self.assertEqual(len(out["nodes"]), 2)
            self.assertEqual(len(out["edges"]), 1)
            self.assertIn("focus_id", out["meta"])
        finally:
            db.close()

    def test_live_aws_sync_disabled_by_default(self):
        db = self.Session()
        try:
            os.environ.pop("OPENCNAPP_IAM_LIVE_AWS_SYNC", None)
            c = Connector(
                name="aws-live",
                display_name="AWS",
                connector_type="aws",
                encrypted_credentials=None,
                settings={},
            )
            db.add(c)
            db.commit()

            out = sync_aws_iam_graph(db, "aws-live")
            self.assertFalse(out.get("ok"))
            self.assertEqual(out.get("error"), "live_aws_sync_disabled")
        finally:
            db.close()

    def test_pmapper_ingest(self):
        db = self.Session()
        try:
            c = Connector(
                name="ingest",
                display_name="Ingest",
                connector_type="aws",
                encrypted_credentials=None,
                settings={},
            )
            db.add(c)
            db.commit()
            db.refresh(c)

            res = ingest_pmapper_style_json(
                db,
                "ingest",
                {
                    "nodes": [
                        {
                            "external_id": "arn:x:role/r1",
                            "node_type": "iam_role",
                            "label": "r1",
                        },
                        {
                            "external_id": "arn:x:policy/p1",
                            "node_type": "iam_policy_managed",
                            "label": "p1",
                        },
                    ],
                    "edges": [
                        {
                            "source_external_id": "arn:x:role/r1",
                            "target_external_id": "arn:x:policy/p1",
                            "edge_type": "ATTACHED",
                        }
                    ],
                },
            )
            self.assertTrue(res.get("ok"))
            self.assertEqual(res.get("nodes"), 2)
            self.assertEqual(res.get("edges"), 1)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
