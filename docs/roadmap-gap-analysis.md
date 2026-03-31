# OpenCNAPP Roadmap Gap Analysis (Section 13)

Source: `raw cnapp idea/opencnapp_final_spec_v3.md` (Section **13. Implementation Roadmap**).

## Totals
- Total checklist items: **51**
- Implemented (done): **31**
- Partial (baseline exists, needs hardening): **8**
- Remaining (not implemented yet): **12**

## By phase

### Phase 1 — Foundation (8)
- Done: 8
- Partial: 0
- Remaining: 0

### Phase 2 — First scanners (9)
- Done: 9
- Partial: 0
- Remaining: 0

### Phase 3 — Runtime + Pentest (9)
- Done: 4
- Partial: 3
- Remaining: 2

### Phase 4 — CIEM + Native Ingest + Attack Paths (8)
- Done: 4
- Partial: 2
- Remaining: 2

### Phase 5 — SSPM + Compliance + CI connectors (10)
- Done: 3
- Partial: 3
- Remaining: 4

### Phase 6 — Open-source release (7)
- Done: 3
- Partial: 0
- Remaining: 4

## Remaining items to build next
1. Kubernetes security plugins beyond baseline stubs (`kube-bench`, `Polaris`, `kube-hunter`).
2. Alerts & Rules management UI + Apprise notification dispatch.
3. BloodHound CE compose profile + AzureHound collector flow.
4. PMapper AWS CIEM integration.
5. Wazuh integration for VM/bare-metal CWPP.
6. ScubaGear and TruffleHog plugin integrations.
7. SonarQube pull + webhook connector.
8. OWASP ZAP ingest adapter.
9. Snyk ingest adapter.
10. Full SBOM support for CycloneDX/SPDX validation/parsing pipeline hardening.
11. Helm chart hardening (worker/dashboard/postgres/redis templates + values/secrets).
12. Community launch tasks (GitHub/ProductHunt/HackerNews rollout).

## Notes
- “Done” means the feature exists in usable baseline form in the repo.
- “Partial” means endpoint/screen/contract exists but enterprise-depth integration is pending.
