# OpenCNAPP Roadmap Gap Analysis (Section 13)

Source: `raw cnapp idea/opencnapp_final_spec_v3.md` (Section **13. Implementation Roadmap**).

## Totals
- Total checklist items: **51**
- Implemented (done): **44**
- Partial (baseline exists, needs hardening): **5**
- Remaining (not implemented yet): **2**

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
- Done: 9
- Partial: 0
- Remaining: 0

### Phase 4 — CIEM + Native Ingest + Attack Paths (8)
- Done: 7
- Partial: 1
- Remaining: 0

### Phase 5 — SSPM + Compliance + CI connectors (10)
- Done: 8
- Partial: 2
- Remaining: 0

### Phase 6 — Open-source release (7)
- Done: 3
- Partial: 2
- Remaining: 2

## Remaining items to build next
1. Launch on GitHub / ProductHunt / HackerNews (operational go-to-market step).
2. Production-grade artifact signing/SBOM attestation pipeline for container releases.

## Partial items to harden
1. Native cloud ingest: currently file-backed import hooks; direct SDK/API auth/pagination still needs hardening.
2. Attack path graph: currently API+UI baseline; advanced D3 risk path ranking pending.
3. Compliance reports: CSV + heatmap implemented; enterprise PDF with templated branding/workflow pending.
4. Helm chart: baseline templates present; secrets, ingress, autoscaling and persistence templates need hardening.
5. CI connectors: SonarQube/ZAP/Snyk adapters and routes implemented in baseline form, production connectors need auth/rate-limit/retry hardening.

## Notes
- “Done” means the feature exists in usable baseline form in the repo.
- “Partial” means endpoint/screen/contract exists but enterprise-depth integration is pending.
