import json
import os

from api.connectors.base import CloudConnector


class AwsConnector(CloudConnector):
    name = "aws"
    display_name = "AWS"
    credential_fields = [
        {"name": "access_key_id", "type": "text"},
        {"name": "secret_access_key", "type": "password"},
        {"name": "region", "type": "text"},
    ]
    supported_plugins = ["prowler", "scoutsuite", "steampipe", "pmapper", "cloudfox"]

    def validate(self):
        return {"ok": True, "message": "AWS connector schema validated"}

    def test_credentials(self, credentials: dict | None, settings: dict | None) -> dict:
        credentials = credentials or {}
        settings = settings or {}
        conn_method = (settings.get("connection_method") or "access_keys").strip().lower()
        regions = settings.get("regions") or []
        region = (credentials.get("region") or "").strip() or None
        if not region and isinstance(regions, list) and len(regions) > 0:
            region = str(regions[0])
        if not region or not isinstance(region, str):
            region = "us-east-1"

        if conn_method == "sso_profile":
            profile = (credentials.get("sso_profile") or settings.get("sso_profile") or "").strip()
            if not profile:
                return {**self.validate(), "message": "Provide an AWS CLI / SSO profile name (sso_profile).", "resource_count": 0}
            try:
                import boto3

                session = boto3.Session(profile_name=profile, region_name=region)
                sts = session.client("sts")
                ident = sts.get_caller_identity()
                arn = ident.get("Arn", "")
                return {"ok": True, "message": f"AWS profile OK: {arn}", "resource_count": 1}
            except Exception as e:
                return {"ok": False, "message": str(e), "resource_count": 0}

        ak = (credentials.get("access_key_id") or "").strip()
        sk = (credentials.get("secret_access_key") or "").strip()
        role_arn = (credentials.get("role_arn") or settings.get("role_arn") or "").strip()
        ext = (credentials.get("external_id") or settings.get("external_id") or "").strip()

        if not ak or not sk:
            return {**self.validate(), "message": "Provide access key ID and secret access key to test.", "resource_count": 0}

        try:
            import boto3

            sts = boto3.client(
                "sts",
                region_name=region,
                aws_access_key_id=ak,
                aws_secret_access_key=sk,
            )

            if role_arn:
                assumed = sts.assume_role(
                    RoleArn=role_arn,
                    RoleSessionName="opencnapp-connector-test",
                    ExternalId=ext or None,
                )
                c = assumed["Credentials"]
                sts = boto3.client(
                    "sts",
                    region_name=region,
                    aws_access_key_id=c["AccessKeyId"],
                    aws_secret_access_key=c["SecretAccessKey"],
                    aws_session_token=c["SessionToken"],
                )

            ident = sts.get_caller_identity()
            arn = ident.get("Arn", "")

            org_count = 0
            org_id = (settings.get("aws_organization_id") or "").strip()
            if org_id:
                try:
                    org = boto3.client(
                        "organizations",
                        region_name=region,
                        aws_access_key_id=ak,
                        aws_secret_access_key=sk,
                    )
                    paginator = org.get_paginator("list_accounts")
                    for page in paginator.paginate():
                        org_count += len(page.get("Accounts", []))
                except Exception:
                    pass

            msg = f"AWS identity OK: {arn}"
            if org_count:
                msg += f" · {org_count} account(s) visible in Organization"
            return {"ok": True, "message": msg, "resource_count": org_count or 1}

        except Exception as e:
            return {"ok": False, "message": str(e), "resource_count": 0}

    def get_scan_env(self):
        return {"CLOUD_PROVIDER": "aws"}

    def ingest_native_findings(self) -> list[dict]:
        # Priority 1: direct Security Hub SDK pull
        try:
            import boto3

            region = os.getenv("AWS_REGION", "us-east-1")
            client = boto3.client("securityhub", region_name=region)
            res = client.get_findings(MaxResults=100)
            return res.get("Findings", [])
        except Exception:
            pass

        # Priority 2: offline/import file
        path = os.getenv("AWS_SECURITY_HUB_FINDINGS_FILE")
        if not path or not os.path.exists(path):
            return []
        data = json.loads(open(path).read())
        return data if isinstance(data, list) else data.get("findings", [])
