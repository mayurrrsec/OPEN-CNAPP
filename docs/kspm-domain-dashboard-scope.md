# KSPM domain dashboard — AccuKnox parity (scope)

AccuKnox’s **KSPM Dashboard** can show on the order of **~25 configurable widgets** (their “Create Dashboard” flow stores a `widgets` array of opaque UUIDs, e.g. `{"name":"test","description":"…","widgets":["a9bbed6b-…",…]}`). Those IDs are **AccuKnox-internal**; they are not usable in OpenCNAPP without a private mapping table from their product.

OpenCNAPP’s **`/dashboard/kspm`** page originally implemented a **small domain summary** (four charts + findings-by-cloud) driven by **`GET /dashboard/summary?domain=kspm`**, which is appropriate for a **cross-cutting domain rollup**, not a full cluster-level operational dashboard.

## What we can do

| Approach | Effort | Notes |
|----------|--------|--------|
| **25 widget shells** | Low | Same layout density as AccuKnox; many show “No Graph data available!” until APIs exist (matches their empty states). |
| **Wire widgets to real data** | High per widget | Each tile needs a clear aggregation (findings queries, cluster inventory, policies). Reuse `/inventory/…` and `/inventory/clusters/{id}/…` patterns where possible. |
| **User-defined layouts (JSON)** | Medium | Store selected widget **slugs** (not AccuKnox UUIDs) in DB or localStorage; render from a registry. |

## Implementation in this repo

- **Stable widget IDs** live in `dashboard/src/config/kspmDashboardWidgets.ts` (slugs such as `domain-risk-score`, `clusters-public-exposure`).
- **KSPM page** (`dashboard/src/pages/KspmDomainDashboard.tsx`) renders **25 slots**: the first five use existing summary components; the rest are placeholders until backend endpoints are added.
- AccuKnox sample UUIDs are **documentation-only**; OpenCNAPP does not call AccuKnox APIs.

## Sample AccuKnox `widgets` array (reference)

The following 25 UUIDs appeared in a captured “Create Dashboard” payload (order preserved; **semantic mapping unknown**):

`a9bbed6b-482d-4977-8beb-ef69ccf04707`, `5f97ca0c-1405-4dfb-ad35-ae46300203e3`, `a0008c23-39eb-4979-9396-a4521edd2aec`, `8b546c23-7c53-4f6a-805e-11c9bd6deb62`, `c91416e6-20e3-4372-bbca-b5d1186affe5`, `37320970-4cc7-4a9f-a63e-9661dba836a7`, `b889c1b5-fcbe-43c5-b984-bb272454cadd`, `369e8e5a-168a-426b-b1fd-16392da6b66a`, `54a5d730-8601-439b-b0cf-960c0b26e872`, `bc1388cf-a882-4196-b826-166382382702`, `49c2a42e-7fdc-412c-9826-cb7414a636e2`, `baacbdd8-99aa-4d07-b634-40b62f99c387`, `4c43667d-65c3-4fc4-988d-37d68f1e20bd`, `861ed5af-9d52-4594-8323-483e4baeb983`, `4f5c8b60-1963-484e-b619-bf0e61d8188b`, `c27b896b-d9c6-4d3b-8f33-7b2365ff78ce`, `b45342d9-b8f5-45bf-ac6c-b62f8c1fb669`, `7619b250-1ec0-4123-97f5-e61d9b20c590`, `3a564854-5f0e-45c5-b12b-4b4e6c60d25b`, `c582f4e2-0b9b-4204-b53a-b18ddd9f3115`, `ec7ab744-02fa-42af-ae1d-06b2d84d8d0a`, `07099587-3d57-48ef-b5d9-66cf3b2c18bf`, `a9fccd93-cf95-43f5-bcf7-c6ba1a760504`, `9bf2e80b-e1a8-4b26-aacc-04182ad9e727`, `57acbaea-951d-4a43-a184-1b1470e6720b`

## Next steps (product)

1. Prioritize which of the 25 tiles matter first (e.g. connection status, findings by severity, CIS strip).
2. Add **`/dashboard/kspm/...`** or **`/inventory/aggregates/...`** endpoints per tile.
3. Replace placeholders in `KspmDomainDashboard` with real charts/tables.
