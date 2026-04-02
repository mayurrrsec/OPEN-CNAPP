# OpenCNAPP — KSPM Inventory Implementation Plan
**Focus:** Inventory page — Clusters detail panel + Cloud Assets  
**Reference:** AccuKnox screenshots (images 3–9 in conversation)  
**For:** Cursor / Codex / Claude Code  
**Date:** 2026-04-02

---

## 0. Ground Rules for This Plan

1. **Light theme only** for all new components in this plan.
2. **Never show raw `null`, `[]`, or empty objects in UI.** Every empty section uses the "No Graph data available!" pattern from AccuKnox (gray chart icon + text).
3. **All new tables use TanStack Table v8** with server-side filtering, sorting, pagination.
4. **All charts use Recharts** wrapped in `<ResponsiveContainer>`.
5. **shadcn/ui** for all primitive components (Sheet, Tabs, Badge, Button, Table, Select, Input, Dialog).
6. **Lucide React** for all icons.
7. The cluster detail panel slides in from the right as a full-height **Sheet** (not navigation) — the background clusters list remains visible behind it.
8. Do NOT replicate KubeArmor-specific features (App Behaviour tab and KIEM tab are simplified — see Section 5).
9. **The "Policies" tab** does NOT use KubeArmor — it shows hardening policies from our existing findings/compliance system.
10. Every tab inside the cluster detail panel calls its own dedicated API endpoint.

---

## 1. What Already Exists (Do Not Break)

Based on the screenshots:
- `dashboard/src/pages/Inventory.tsx` exists with tabs: Assets | Clusters | Workloads
- Clusters tab shows empty state with "Onboard cluster" button ✓
- Compliance coverage section below clusters ✓  
- Connectors page with "Add cluster" working ✓
- `api/routes/inventory.py` exists (needs new endpoints)
- `api/database/init.sql` has base schema

The Clusters tab already shows the correct empty state. We need to add:
1. **Populated clusters table** (when clusters exist after onboarding)
2. **Cluster detail slide-in panel** (clicking a cluster row)
3. **Cloud Assets tab** in Inventory
4. **New API endpoints** for all cluster detail data

---

## 2. Clusters Table — When Clusters Exist

**File to modify:** `dashboard/src/pages/Inventory.tsx` (Clusters tab section only)

### 2.1 Clusters Table Structure

When at least one cluster is onboarded, replace the empty state with this table.  
**Reference:** AccuKnox image 3.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Clusters                                          [↻]  [Last 24 hours: Apr 1 – Apr 2, 2026 ▼]  [Onboard Cluster ►] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CLUSTERS    NAMESPACES    WORKLOADS  (underline tabs, not pill tabs)                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [+ FILTER]  [🔍 Search...]                                                    [⬜ column toggle]    │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ☐   Name        Alerts          Findings              Onboarded         Last Synced     Nodes  Wklds │
│                                 [CIS][KSPM][IMG][SEC]                                               │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ☐  ● [K8s]      ⚠ 0             CIS:-- KSPM:--        02-04-2026        02-04-2026       0      0   │
│    test                         IMG:-- SEC:--          10:50:44          10:50:44                    │
│                                                                                                ⋮     │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1–1 of 1          Rows per page: [10 ▼]    Go to page: [1] / 1    [|<] [<] [>] [>|]                │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Column Definitions

```typescript
// dashboard/src/pages/inventory/ClusterTable.tsx

columns = [
  { id: 'select', checkbox },
  {
    id: 'name',
    header: 'Name',
    // Renders: colored status dot (green=connected, red=disconnected, yellow=pending)
    //          + K8s hexagon icon (blue)
    //          + cluster display name
    // Status dot colors:
    //   green  = agent connected and syncing
    //   red    = agent disconnected
    //   yellow = agent installed but not yet synced
  },
  {
    id: 'alerts',
    header: 'Alerts',
    // Renders: ⚠ icon + count (red ⚠ if count > 0, gray ⚠ if 0)
  },
  {
    id: 'findings',
    header: 'Findings',
    // Renders: small finding-type pills in a row
    // Format: [CIS: N] [KSPM: N] [IMG: N] [SEC: N]
    // Each pill: gray border, finding type abbreviation, count or "--" if none
    // These come from grouping findings by domain for this cluster
  },
  { id: 'onboarded', header: 'Onboarded', render: 'datetime' },
  { id: 'last_synced', header: 'Last Synced', render: 'datetime' },
  { id: 'nodes', header: 'Nodes', render: 'number_link' },
  { id: 'workloads', header: 'Workloads', render: 'number_link' },
  { id: 'namespaces', header: 'Namespaces', render: 'number_link' },
  { id: 'active_policies', header: 'Active Policies', render: 'number_link' },
  { id: 'tags', header: 'Tags', render: 'tags' },
  {
    id: 'actions',
    header: '',
    // ⋮ context menu with:
    //   [👁 View onboarding instructions]
    //   [🗑 Delete]
  },
]
```

### 2.3 Row Click Behavior

Clicking anywhere on a cluster row (except checkbox and ⋮ menu) opens the **Cluster Detail Panel** as a right-side Sheet.

The Sheet should be wide: `w-[60vw]` minimum, `max-w-[900px]`.

---

## 3. Cluster Detail Panel — Full Specification

**File:** `dashboard/src/pages/inventory/ClusterDetailPanel.tsx`  
**Component type:** shadcn `Sheet` (slides in from right)  
**Reference:** AccuKnox images 4–8

### 3.1 Panel Header

```
[K8s icon blue] test          [● Disconnected]          [×]
```

- Cluster name (large, bold)
- Connection status badge:
  - `● Connected` → green background, green text
  - `● Disconnected` → red/pink background, red text  
  - `● Pending` → yellow background, amber text
- Close button (×) top right

### 3.2 Tab Navigation (8 tabs, icon + label)

```typescript
const CLUSTER_TABS = [
  { id: 'overview',          icon: 'ScanSearch',    label: 'OVERVIEW' },
  { id: 'misconfiguration',  icon: 'Settings2',     label: 'MISCONFIGURATION' },
  { id: 'vulnerabilities',   icon: 'ShieldAlert',   label: 'VULNERABILITIES' },
  { id: 'alerts',            icon: 'AlertTriangle', label: 'ALERTS' },
  { id: 'compliance',        icon: 'ClipboardList', label: 'COMPLIANCE' },
  { id: 'policies',          icon: 'Shield',        label: 'POLICIES' },
  { id: 'app_behaviour',     icon: 'Activity',      label: 'APP BEHAVIOUR' },
  { id: 'kiem',              icon: 'Fingerprint',   label: 'KIEM' },
]
```

Tabs are displayed as a horizontal row of icon + label. Active tab: blue underline, blue icon+text. Inactive: gray.

Tab content is lazy-loaded — only fetch data when tab is first clicked.

---

## 4. Tab Content Specifications

### 4.1 OVERVIEW Tab

**Reference:** AccuKnox image 4  
**API:** `GET /api/inventory/clusters/:id/overview`

#### Layout:

```
Insights                                              [→ expand button]
┌─────────────────────────────────────────┬───────────────────────────────────┐
│ K8s Resource Summary  ⓘ                 │ K8s Findings Trend  ⓘ             │
│                                         │                                   │
│ [0]              [0]              [0]   │   [No Graph data available!]      │
│ Readiness Probe  Liveness Probe  Image  │                                   │
│                  Tag Is Not Latest      │   (Recharts LineChart)            │
│                                         │   X-axis: dates, Y-axis: count    │
│ [0]              [0]              [0]   │                                   │
│ Immutable FS     CPU limits     Memory  │                                   │
│                  limits                 │                                   │
│                                         │                                   │
│ [0]              [0]              [0]   │                                   │
│ K8s common       CronJob        Naked   │                                   │
│ labels           usage          pods    │                                   │
└─────────────────────────────────────────┴───────────────────────────────────┘

Cluster Information
┌───────────────────────────────────────────────────────────────────────────────┐
│  ⚙ Nodes      🗂 Workloads    🖥 Namespaces    🛡 Active Policies              │
│    0              0               0                0                          │
│                                                                               │
│  Tags:  [Add Tags +]                                                          │
└───────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐  ┌────────────────────────────────────────┐
│ Cluster Connection History     │  │  (future: cluster events timeline)     │
│                                │  │                                        │
│ No connection history available│  │                                        │
└────────────────────────────────┘  └────────────────────────────────────────┘

Nodes
[🔍 Search by name]  [Onboarded ▼]  [Connection Status ▼]  [Tags ▼]

□   Name    Onboarded    Last Synced    Tags
(empty table with "No nodes" message)
```

#### K8s Resource Summary — the 9 metric cells:

```typescript
const K8S_METRICS = [
  { key: 'readiness_probe',            label: 'Readiness Probe' },
  { key: 'liveness_probe',             label: 'Liveness Probe' },
  { key: 'image_tag_not_latest',       label: 'Image Tag is Not Latest' },
  { key: 'immutable_container_fs',     label: 'Immutable Container File System' },
  { key: 'cpu_limits',                 label: 'Ensure CPU limits are set' },
  { key: 'memory_limits',              label: 'Ensure memory limits are set' },
  { key: 'common_labels',              label: 'K8s common labels usage' },
  { key: 'cronjob',                    label: 'Kubernetes CronJob' },
  { key: 'naked_pods',                 label: 'Naked pods' },
]
// Each renders as a bordered cell: large number on top, label below
// Number is a link → filters Findings page to that check
// 3-column grid layout
```

#### API Response for Overview:

```json
GET /api/inventory/clusters/:id/overview
{
  "cluster_id": "uuid",
  "connection_status": "disconnected",
  "k8s_resource_summary": {
    "readiness_probe": 0,
    "liveness_probe": 0,
    "image_tag_not_latest": 0,
    "immutable_container_fs": 0,
    "cpu_limits": 0,
    "memory_limits": 0,
    "common_labels": 0,
    "cronjob": 0,
    "naked_pods": 0
  },
  "findings_trend": [
    { "date": "2026-03-26", "count": 0 },
    { "date": "2026-03-27", "count": 0 }
  ],
  "cluster_info": {
    "nodes": 0,
    "workloads": 0,
    "namespaces": 0,
    "active_policies": 0,
    "tags": []
  },
  "connection_history": [],
  "nodes": []
}
```

---

### 4.2 MISCONFIGURATION Tab

**Reference:** AccuKnox image 5  
**API:** `GET /api/inventory/clusters/:id/misconfigurations`

#### Layout:

```
Insights                                              [→]
┌──────────────────────────────────┬─────────────────────────────────────────┐
│ Findings by Asset Categories  ⓘ  │ K8s Findings Trend  ⓘ                   │
│                                  │                                          │
│ [No Graph data available!]       │ [No Graph data available!]               │
│ (Recharts BarChart when data)    │ (Recharts LineChart when data)           │
│ X: asset category                │ X: date, Y: count                        │
│ Y: finding count                 │                                          │
└──────────────────────────────────┴─────────────────────────────────────────┘

Cluster Findings                                              [View All ↗]
[🔍 Search]  Severity: [C] [H] [M] [L] [I]    (toggle buttons, each colored)

□  Last Seen  │  Vulnerability Name  │  Risk Factor  │  Asset Name  │  Tool Output  │  Cluster Name  │  Namespace  │  Label  │  ⋮
```

#### Severity Toggle Buttons:

```typescript
// These are toggled filter buttons, not dropdowns
// Each is a small square button with colored border and letter:
const SEVERITY_TOGGLES = [
  { letter: 'C', color: '#dc2626', label: 'Critical' },  // red border
  { letter: 'H', color: '#ea580c', label: 'High' },      // orange border
  { letter: 'M', color: '#d97706', label: 'Medium' },    // amber border
  { letter: 'L', color: '#16a34a', label: 'Low' },       // green border
  { letter: 'I', color: '#2563eb', label: 'Info' },      // blue border
]
// All active by default (all borders visible)
// Clicking toggles active state: inactive = gray border
```

#### Findings Table Columns:

```typescript
const MISCONFIGURATION_COLUMNS = [
  { id: 'select',           header: '☐' },
  { id: 'last_seen',        header: 'Last Seen',        sortable: true },
  { id: 'vulnerability_name', header: 'Vulnerability Name', sortable: true },
  { id: 'risk_factor',      header: 'Risk Factor',      render: 'severity_badge' },
  { id: 'asset_name',       header: 'Asset Name' },
  { id: 'tool_output',      header: 'Tool Output' },    // tool that found it
  { id: 'cluster_name',     header: 'Cluster Name' },
  { id: 'namespace',        header: 'Namespace' },
  { id: 'label',            header: 'Label' },
  { id: 'actions',          header: '⋮', render: 'context_menu' },
]
```

#### "Findings by Asset Categories" Chart:

Recharts BarChart, horizontal bars. One bar per K8s resource type (Pod, Deployment, DaemonSet, etc.) showing finding count. Only show resource types that have findings.

#### "K8s Findings Trend" Chart:

Recharts LineChart. X-axis: dates (last 7 days). Y-axis: finding count. One line total.

#### API Response:

```json
GET /api/inventory/clusters/:id/misconfigurations?severity=all&search=&page=1&limit=25
{
  "insights": {
    "by_asset_category": [
      { "category": "Pod", "count": 12 },
      { "category": "Deployment", "count": 8 }
    ],
    "trend": [
      { "date": "2026-03-26", "count": 0 }
    ]
  },
  "findings": {
    "total": 0,
    "page": 1,
    "items": [
      {
        "id": "uuid",
        "last_seen": "2026-04-01T10:00:00Z",
        "vulnerability_name": "Pod running as root",
        "risk_factor": "HIGH",
        "asset_name": "nginx-pod",
        "tool_output": "kubescape",
        "cluster_name": "test",
        "namespace": "default",
        "label": "app=nginx"
      }
    ]
  }
}
```

**Implementation note:** These findings come from the existing `findings` table filtered by:
- `cloud_provider = 'k8s'` (or the cluster's connector ID)
- `domain IN ('kspm', 'image-sec')`
- Namespace field matches the cluster

---

### 4.3 VULNERABILITIES Tab

**Reference:** AccuKnox image 6  
**API:** `GET /api/inventory/clusters/:id/vulnerabilities`

#### Layout:

```
Insights                                              [→]
┌──────────────────────────────────┬─────────────────────────────────────────┐
│ Top 10 Container Images          │ Container Image Findings by Severity     │
│ by Vulnerabilities  ⓘ           │                                  ⓘ       │
│                                  │                                          │
│ [No Graph data available!]       │ [No Graph data available!]               │
│ (BarChart when data)             │ (DonutChart when data)                   │
│ X: image name (truncated)        │ Segments: C/H/M/L/I                     │
│ Y: vulnerability count           │ Center: total count                      │
└──────────────────────────────────┴─────────────────────────────────────────┘

Container Image Findings                              [View All ↗]
[🔍 Search]  Severity: [C] [H] [M] [L] [I]

□  Last Seen  │  Identification Num...  │  Vulnerability Name  │  Asset Name  │  Risk Factor  │  Package Name  │  Location  │  Ins Version  │  Fix Version  │  ⋮
```

#### "Top 10 Container Images by Vulnerabilities" Chart:

Recharts BarChart (horizontal). One bar per container image. Bar length = total CVE count. Clicking bar filters the findings table below.

#### "Container Image Findings by Severity" Chart:

Recharts PieChart (donut). Segments: Critical (red), High (orange), Medium (amber), Low (green), Info (blue). Center: total CVE count.

#### Container Image Findings Table Columns:

```typescript
const VULNERABILITY_COLUMNS = [
  { id: 'select' },
  { id: 'last_seen',            header: 'Last Seen',           sortable: true },
  { id: 'identification_num',   header: 'Identification Num.', render: 'cve_link' },
  // CVE ID formatted as a clickable link to CVE database
  { id: 'vulnerability_name',   header: 'Vulnerability Name' },
  { id: 'asset_name',           header: 'Asset Name' },
  { id: 'risk_factor',          header: 'Risk Factor',         render: 'severity_badge' },
  { id: 'package_name',         header: 'Package Name' },
  { id: 'location',             header: 'Location' },          // image registry path
  { id: 'installed_version',    header: 'Ins Version' },
  { id: 'fix_version',          header: 'Fix Version' },
  { id: 'actions',              header: '⋮' },
]
```

#### API Response:

```json
GET /api/inventory/clusters/:id/vulnerabilities?severity=all&search=&page=1&limit=25
{
  "insights": {
    "top_images": [
      { "image": "nginx:1.24", "count": 15 },
      { "image": "redis:7.0", "count": 8 }
    ],
    "by_severity": {
      "critical": 3,
      "high": 12,
      "medium": 24,
      "low": 48,
      "info": 6
    }
  },
  "findings": {
    "total": 0,
    "page": 1,
    "items": [
      {
        "id": "uuid",
        "last_seen": "2026-04-01T10:00:00Z",
        "cve_id": "CVE-2023-44487",
        "vulnerability_name": "HTTP/2 Rapid Reset Attack",
        "asset_name": "nginx:1.24",
        "risk_factor": "HIGH",
        "package_name": "nghttp2",
        "location": "registry.example.com/nginx:1.24",
        "installed_version": "1.43.0",
        "fix_version": "1.61.0"
      }
    ]
  }
}
```

**Implementation note:** These findings come from the `findings` table filtered by `domain = 'image-sec'` and the cluster connector.

---

### 4.4 ALERTS Tab

**Reference:** Similar to AccuKnox Alerts tab (follow existing alerts page pattern)  
**API:** `GET /api/inventory/clusters/:id/alerts`

#### Layout:

```
Insights                                              [→]
┌──────────────────────────────────┬─────────────────────────────────────────┐
│ Alerts by Severity  ⓘ           │ Alerts Trend  ⓘ                          │
│                                  │                                          │
│ [No Graph data available!]       │ [No Graph data available!]               │
│ (DonutChart when data)           │ (LineChart when data)                    │
└──────────────────────────────────┴─────────────────────────────────────────┘

Cluster Alerts                                        [View All ↗]
[🔍 Search]  Severity: [C] [H] [M] [L] [I]

□  Timestamp  │  Severity  │  Message  │  Pod  │  Namespace  │  Source  │  ⋮
```

#### Alerts Table Columns:

```typescript
const ALERT_COLUMNS = [
  { id: 'select' },
  { id: 'timestamp',   header: 'Timestamp',  sortable: true },
  { id: 'severity',    header: 'Severity',   render: 'severity_badge' },
  { id: 'message',     header: 'Message',    truncate: 80 },
  { id: 'pod',         header: 'Pod' },
  { id: 'namespace',   header: 'Namespace' },
  { id: 'source',      header: 'Source' },   // falco, tracee, etc.
  { id: 'actions',     header: '⋮' },
]
```

**Implementation note:** Alerts come from Falco webhook events stored in a new `cluster_alerts` table or from `findings` with `source='webhook'` and `tool='falco'`.

---

### 4.5 COMPLIANCE Tab

**Reference:** AccuKnox Compliance tab  
**API:** `GET /api/inventory/clusters/:id/compliance`

#### Layout:

```
Insights                                              [→]
┌──────────────────────────────────┬─────────────────────────────────────────┐
│ Compliance by Framework  ⓘ      │ Compliance Trend  ⓘ                      │
│                                  │                                          │
│ (BarChart: framework vs % pass)  │ (LineChart: % pass over time)           │
└──────────────────────────────────┴─────────────────────────────────────────┘

Compliance Findings                                   [View All ↗]
Framework: [ALL ▼]  [CIS] [NIST] [PCI-DSS] [SOC2]   Severity: [C] [H] [M] [L] [I]
[🔍 Search]

□  Last Seen  │  Control  │  Framework  │  Severity  │  Status  │  Asset  │  Namespace  │  ⋮
```

#### Compliance Table Columns:

```typescript
const COMPLIANCE_COLUMNS = [
  { id: 'select' },
  { id: 'last_seen',   header: 'Last Seen',   sortable: true },
  { id: 'control',     header: 'Control',     render: 'control_id_link' },
  // e.g., "CIS 5.2.1" as text
  { id: 'framework',   header: 'Framework',   render: 'badge' },
  { id: 'severity',    header: 'Severity',    render: 'severity_badge' },
  { id: 'status',      header: 'Status',      render: 'pass_fail_badge' },
  // PASS = green, FAIL = red
  { id: 'asset',       header: 'Asset' },
  { id: 'namespace',   header: 'Namespace' },
  { id: 'actions',     header: '⋮' },
]
```

**Data source:** `findings` table where `compliance_tags` contains "cis-k8s", "nist", "pci-dss" etc. AND the cluster's connector is matched.

---

### 4.6 POLICIES Tab

**Reference:** AccuKnox image 7  
**Note:** We do NOT use KubeArmor. Our "policies" are hardening recommendations from Kubescape/kube-bench that we treat as security policies.

**API:** `GET /api/inventory/clusters/:id/policies`

#### Layout:

```
Insights                                              [→]
┌──────────────────────────────────┬─────────────────────────────────────────┐
│ Hardening Findings by Category ⓘ │ Policy Alerts  ⓘ                        │
│                                  │                                          │
│ [No Graph data available!]       │ [No Graph data available!]               │
│ (BarChart: category vs count)    │ (LineChart: alerts over time)            │
└──────────────────────────────────┴─────────────────────────────────────────┘

Policies                                              [View All ↗]
[🔍 Search]  [Policy Status ▼]         [APPLY]

□  Name            │  Category   │  Namespaces  │  Alerts  │  Selector Labels  │  Tags  │  ⋮
```

#### Policies Table Columns — EXACT MATCH to AccuKnox image 7:

```typescript
const POLICIES_COLUMNS = [
  { id: 'select' },
  {
    id: 'name',
    header: 'Name',
    // Renders: red dot + K8s icon + policy name
    // Red dot = inactive/alert, green dot = active
  },
  { id: 'category',    header: 'Category' },
  // Category values: "hardening", "compliance", "network", "custom"
  { id: 'namespaces',  header: 'Namespaces' },
  // "--" if not namespace-scoped
  { id: 'alerts',      header: 'Alerts',    render: 'number' },
  { id: 'selector_labels', header: 'Selector Labels' },
  // "None" if no selectors
  {
    id: 'tags',
    header: 'Tags',
    // Renders compliance tag pills: [PCI_DSS_10.2.3] [+2]
    // Show first tag + "+N more" if multiple
  },
  { id: 'actions',     header: '⋮' },
]
```

#### What "Policies" means in OpenCNAPP context:

These are **Kubescape hardening recommendations** stored as findings with `domain='kspm'`. Each finding represents a hardening check that either:
- **Passed** → active policy / green dot
- **Failed** → inactive / needs attention / red dot

The "Tags" column shows compliance framework tags from the `compliance_tags` array on the finding.

**Example policy rows** (from Kubescape output):
```
● [K8s] harden-external-devices-connected    hardening    --    0    None    [PCI_DSS_10.2.3] +2
● [K8s] harden-audit-pen-test-recon-tools    hardening    --    0    None    [MITRE_T1110_BRUTE_FORCE] +2
● [K8s] harden-write-under-dev-dir           hardening    --    0    None    [NIST_PR.DS-8] +2
● [K8s] harden-write-etc-dir                 hardening    --    0    None    [MITRE_T1036_MASQUERADING] +2
● [K8s] harden-env-preset                    hardening    --    0    None    [NIST_CM-7] +2
```

#### API Response:

```json
GET /api/inventory/clusters/:id/policies?status=all&search=&page=1&limit=25
{
  "insights": {
    "by_category": [
      { "category": "hardening", "count": 45 },
      { "category": "compliance", "count": 12 }
    ],
    "alerts_trend": []
  },
  "policies": {
    "total": 57,
    "page": 1,
    "items": [
      {
        "id": "uuid-of-finding",
        "name": "harden-external-devices-connected",
        "category": "hardening",
        "namespaces": null,
        "alerts": 0,
        "selector_labels": null,
        "status": "inactive",
        "tags": ["PCI_DSS_10.2.3", "PCI_DSS_10.3.2"],
        "check_id": "C-0012"
      }
    ]
  }
}
```

**Implementation note:** Query `findings` table WHERE `cluster_id = :id` AND `domain = 'kspm'`, grouping by `check_id` to get policy-level rows.

---

### 4.7 APP BEHAVIOUR Tab

**Note:** AccuKnox's "App Behaviour" uses KubeArmor's eBPF observability. We do NOT have KubeArmor.  
**Our implementation:** Show a simplified view based on what Falco/Tracee reports from runtime scanning.

**API:** `GET /api/inventory/clusters/:id/app-behaviour`

#### Layout:

```
App Behaviour — Runtime Observability

ℹ This view shows runtime events detected by Falco/Tracee agents in this cluster.
  For full app behavior observability, deploy a Falco DaemonSet in the cluster.

Insights
┌──────────────────────────────────┬─────────────────────────────────────────┐
│ Events by Type  ⓘ               │ Events Trend  ⓘ                          │
│ Process / File / Network         │                                          │
│ (BarChart or DonutChart)         │ (LineChart)                              │
└──────────────────────────────────┴─────────────────────────────────────────┘

Runtime Events                                        [View All ↗]
[🔍 Search]  Type: [Process] [File] [Network]   Severity: [C] [H] [M] [L] [I]

□  Timestamp  │  Event Type  │  Process  │  Pod  │  Namespace  │  Action  │  ⋮
```

**Data source:** Falco alerts stored in the `findings` table with `tool='falco'` for this cluster.

If no Falco data: Show message:
```
[Terminal icon]
No runtime events detected

Deploy a Falco DaemonSet in your cluster to enable runtime observability.
[View setup instructions]
```

---

### 4.8 KIEM Tab (K8s Identity & Entitlement Management)

**Reference:** AccuKnox image 8  
**Note:** AccuKnox's KIEM is their proprietary feature. We implement a simplified version based on Kubescape RBAC findings + kube-bench IAM checks.

**API:** `GET /api/inventory/clusters/:id/kiem`

#### Layout:

```
Insights                                              [→]
┌──────────────────────────────────┬─────────────────────────────────────────┐
│ KIEM Risk Assessment  ⓘ         │ KIEM Findings by Asset Types  ⓘ          │
│                                  │                                          │
│ [No Graph data available!]       │ [No Graph data available!]               │
│ (Gauge/RadialBar when data)      │ (BarChart when data)                     │
│ Risk score 0-100                 │ X: asset type (ServiceAccount,Role,etc.) │
│                                  │ Y: finding count                         │
└──────────────────────────────────┴─────────────────────────────────────────┘

KIEM Findings                                         [View All ↗]
[🔍 Search]  Severity: [C] [H] [M] [L] [I]

□  Last Seen  │  Asset Name  │  Namespace  │  Vulnerability Name  │  Risk Factor  │  Description  │  Cluster Name  │  Resource  │  Label  │  ⋮
```

#### KIEM Table Columns — EXACT MATCH to AccuKnox image 8:

```typescript
const KIEM_COLUMNS = [
  { id: 'select' },
  { id: 'last_seen',         header: 'Last Seen',          sortable: true },
  { id: 'asset_name',        header: 'Asset Name' },
  { id: 'namespace',         header: 'Namespace' },
  { id: 'vulnerability_name', header: 'Vulnerability Name' },
  { id: 'risk_factor',       header: 'Risk Factor',        render: 'severity_badge' },
  { id: 'description',       header: 'Description',        truncate: 60 },
  { id: 'cluster_name',      header: 'Cluster Name' },
  { id: 'resource',          header: 'Resource' },
  // Resource type: ServiceAccount, ClusterRole, RoleBinding, etc.
  { id: 'label',             header: 'Label' },
  { id: 'actions',           header: '⋮' },
]
```

#### What KIEM means in OpenCNAPP context:

KIEM findings are `findings` from Kubescape where `resource_type` is one of:
- `ServiceAccount`
- `ClusterRole`
- `ClusterRoleBinding`
- `Role`
- `RoleBinding`

These are RBAC-related misconfigurations (over-permissive roles, unused service accounts, privilege escalation risks).

**KIEM Risk Score calculation:**
```python
# Simple: weighted average of RBAC finding severities for this cluster
# Critical=10, High=5, Medium=2, Low=0.5
# Score = 100 - min(sum_of_weighted_findings / 100 * 100, 100)
```

---

## 5. Namespaces Sub-Tab

**File:** `dashboard/src/pages/inventory/NamespacesTab.tsx`  
Part of the Inventory page (not inside the cluster detail panel — this is the NAMESPACES tab in the main Clusters table).

**API:** `GET /api/inventory/namespaces?cluster_id=:id`

#### Layout:

```
CLUSTERS    NAMESPACES    WORKLOADS
           ──────────

[+ FILTER]  [🔍 Search]

□  Namespace  │  Cluster  │  Workloads  │  Findings  │  Alerts  │  Last Synced  │  ⋮
```

Clicking a namespace row → opens a simplified namespace detail panel (Sheet) showing:
- Namespace name + cluster
- Workloads in this namespace (table)
- Findings scoped to this namespace

---

## 6. Workloads Sub-Tab

**File:** `dashboard/src/pages/inventory/WorkloadsTab.tsx`

**API:** `GET /api/inventory/workloads?cluster_id=:id&namespace=:ns`

#### Layout:

```
CLUSTERS    NAMESPACES    WORKLOADS
                         ──────────

[+ FILTER]  [🔍 Search]  [Kind ▼]  [Namespace ▼]

□  Name  │  Kind  │  Namespace  │  Cluster  │  Containers  │  Findings  │  Last Seen  │  ⋮
```

**Kind values:** Pod / Deployment / DaemonSet / StatefulSet / Job / CronJob / ReplicaSet

---

## 7. Cloud Assets Tab

**Reference:** AccuKnox image 9 (Cloud assets page with grouped-by-Category table)  
**File:** `dashboard/src/pages/inventory/CloudAssetsTab.tsx`

This is a **new tab** in the Inventory page. In the existing tabs (Assets | Clusters | Workloads), rename/add:
- **Assets** → rename to **Cloud Assets**
- Keep **Clusters** as is
- Keep **Workloads** as is

### 7.1 Filter Bar (2-row, multi-filter)

**Reference:** AccuKnox image 9 — 2 rows of filter dropdowns

```
Row 1:
[Label ▼]            [Finding Source ▼]    [Asset Type ▼]        [Category ▼]      [Cloud Provider ▼]    [Region ▼]

Row 2:
[Cloud Accounts ▼]   [Collector Name ▼]    [Organization/OU ▼]   [Tags 🏷 ▼]       [Date Discovered: Start – End ▼]

Row 3 (search + controls):
[🔍 Search...                                    ] [↻] [🔽] [📋] [⬆]
                                                Group By: [Category ▼] [×]    Present On Date: [Mar 31 – Apr 2, 2026 ▼] [×]
```

#### Filter definitions:

```typescript
const CLOUD_ASSET_FILTERS = {
  label:           { type: 'multiselect', placeholder: 'Select Label' },
  finding_source:  { type: 'multiselect', placeholder: 'Select Finding Source' },
  // Finding Source = which tool found issues (prowler, kubescape, trivy, etc.)
  asset_type:      { type: 'multiselect', placeholder: 'Select Asset Type' },
  // Asset types: VM, Container, Storage, Function, DB, Role, User, etc.
  category:        { type: 'multiselect', placeholder: 'Select Category' },
  // Category = broader grouping: web_app, compute, identity, network, etc.
  cloud_provider:  { type: 'multiselect', placeholder: 'Select Cloud Provider' },
  region:          { type: 'multiselect', placeholder: 'Select Region' },
  cloud_accounts:  { type: 'multiselect', placeholder: 'Select Cloud Accounts' },
  collector_name:  { type: 'multiselect', placeholder: 'Select Collector Name' },
  // Collector = which connector collected this (e.g., "aks-prod-connector")
  organization_ou: { type: 'multiselect', placeholder: 'Select Organization/OU' },
  tags:            { type: 'text', placeholder: 'Enter Tags' },
  date_discovered: { type: 'daterange', placeholder: 'Start Date - End Date' },
}

const GROUP_BY_OPTIONS = ['Category', 'Asset Type', 'Cloud Provider', 'Region', 'Finding Source']
const PRESENT_ON_DATE = 'date range picker' // filters to assets that existed on that date
```

### 7.2 Cloud Assets Table (Grouped by Category)

**Reference:** AccuKnox image 9 — table shows grouped rows with expandable sections

When grouped by Category:

```
□   Category        │  Findings                    │  Count of assets
──────────────────────────────────────────────────────────────────────────
>   web_app         │  [🟧 6] [⬛ 11] [🔵 4]      │  2
```

**Findings column** renders inline severity bars (mini bars, not text):
```typescript
// Severity mini-bars: colored vertical bars proportional to count
// Orange bar = High count, Black/dark bar = Medium count, Blue bar = Info count
// Each bar has a number label
// Format: [color_bar count] [color_bar count] [color_bar count]
```

**Expanding a group** (clicking `>` arrow):

```
>   web_app         │  [🟧 6] [🔵 4]              │  2
    ──────────────────────────────────────────────────────
    asset_name_1    │  asset_type  │  cloud  │  region  │  findings  │  last_seen
    asset_name_2    │  ...
```

### 7.3 Non-Grouped View

When "Group By" is cleared, show a flat table:

```typescript
const CLOUD_ASSET_COLUMNS = [
  { id: 'select' },
  { id: 'asset_name',      header: 'Asset Name' },
  { id: 'asset_type',      header: 'Asset Type' },
  { id: 'category',        header: 'Category' },
  { id: 'cloud_provider',  header: 'Cloud Provider',  render: 'cloud_badge' },
  { id: 'region',          header: 'Region' },
  { id: 'account',         header: 'Account' },
  { id: 'findings',        header: 'Findings',         render: 'severity_bars' },
  { id: 'date_discovered', header: 'Date Discovered',  render: 'date' },
  { id: 'last_seen',       header: 'Last Seen',        render: 'relative_date' },
  { id: 'tags',            header: 'Tags',             render: 'tag_pills' },
  { id: 'actions',         header: '',                 render: 'download_icon' },
]
```

### 7.4 Severity Bars Component

```typescript
// dashboard/src/components/ui/SeverityBars.tsx
// Renders: [bar count] [bar count] [bar count]
// Each bar: small colored rectangle (6px wide) + count number
// Colors: Critical=red, High=orange, Medium=amber, Low=green, Info=blue
// Only show non-zero severities
// Usage: <SeverityBars critical={6} high={11} medium={4} />
```

### 7.5 API Endpoints for Cloud Assets:

```python
# GET /api/inventory/assets?group_by=category&cloud_provider=&region=&asset_type=&page=1&limit=20
# &date_from=2026-03-31&date_to=2026-04-02&search=

# Response (grouped by category):
{
  "group_by": "category",
  "total_groups": 1,
  "total_assets": 2,
  "groups": [
    {
      "key": "web_app",
      "label": "web_app",
      "asset_count": 2,
      "findings": {
        "critical": 0,
        "high": 6,
        "medium": 11,
        "low": 0,
        "info": 4
      },
      "assets": [
        {
          "id": "uuid",
          "asset_name": "my-nginx-vm",
          "asset_type": "VM",
          "category": "web_app",
          "cloud_provider": "azure",
          "region": "eastus",
          "account": "sub-abc123",
          "findings": { "high": 3, "medium": 5 },
          "date_discovered": "2026-03-31T00:00:00Z",
          "last_seen": "2026-04-01T10:00:00Z",
          "tags": []
        }
      ]
    }
  ]
}

# Response (flat, no grouping):
{
  "total": 2,
  "page": 1,
  "items": [...]
}
```

**Implementation note:** Assets come from aggregating `resource_id` + `resource_type` + `cloud_provider` from the `findings` table. Each unique `resource_id` is an asset. Category is derived from `resource_type`:
```python
RESOURCE_TO_CATEGORY = {
  'vm': 'compute', 'virtual_machine': 'compute',
  'storage_account': 'storage', 's3_bucket': 'storage',
  'function': 'serverless', 'lambda': 'serverless',
  'postgresql': 'database', 'rds': 'database',
  'service_account': 'identity', 'iam_role': 'identity',
  'nginx': 'web_app', 'web_app': 'web_app',
  'k8s_pod': 'kubernetes', 'k8s_deployment': 'kubernetes',
}
```

---

## 8. Backend API — All New Endpoints

### New file: `api/routes/cluster_detail.py`

```python
from fastapi import APIRouter, Depends, Query
from typing import Optional

router = APIRouter(prefix="/api/inventory/clusters/{cluster_id}", tags=["cluster-detail"])

@router.get("/overview")
async def get_cluster_overview(cluster_id: str): ...

@router.get("/misconfigurations")
async def get_cluster_misconfigurations(
    cluster_id: str,
    severity: Optional[str] = "all",
    search: Optional[str] = "",
    page: int = 1,
    limit: int = 25
): ...

@router.get("/vulnerabilities")
async def get_cluster_vulnerabilities(
    cluster_id: str,
    severity: Optional[str] = "all",
    search: Optional[str] = "",
    page: int = 1,
    limit: int = 25
): ...

@router.get("/alerts")
async def get_cluster_alerts(
    cluster_id: str,
    severity: Optional[str] = "all",
    page: int = 1,
    limit: int = 25
): ...

@router.get("/compliance")
async def get_cluster_compliance(
    cluster_id: str,
    framework: Optional[str] = "all",
    severity: Optional[str] = "all",
    page: int = 1,
    limit: int = 25
): ...

@router.get("/policies")
async def get_cluster_policies(
    cluster_id: str,
    status: Optional[str] = "all",
    search: Optional[str] = "",
    page: int = 1,
    limit: int = 25
): ...

@router.get("/app-behaviour")
async def get_cluster_app_behaviour(
    cluster_id: str,
    event_type: Optional[str] = "all",
    page: int = 1,
    limit: int = 25
): ...

@router.get("/kiem")
async def get_cluster_kiem(
    cluster_id: str,
    severity: Optional[str] = "all",
    search: Optional[str] = "",
    page: int = 1,
    limit: int = 25
): ...
```

### Updated: `api/routes/inventory.py`

```python
# Add these new endpoints:

@router.get("/namespaces")
async def list_namespaces(
    cluster_id: Optional[str] = None,
    page: int = 1,
    limit: int = 25
): ...

@router.get("/workloads")
async def list_workloads(
    cluster_id: Optional[str] = None,
    namespace: Optional[str] = None,
    kind: Optional[str] = None,
    page: int = 1,
    limit: int = 25
): ...

@router.get("/assets")
async def list_assets(
    group_by: Optional[str] = None,
    cloud_provider: Optional[str] = None,
    region: Optional[str] = None,
    asset_type: Optional[str] = None,
    category: Optional[str] = None,
    cloud_accounts: Optional[str] = None,
    finding_source: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 20
): ...
```

---

## 9. Database — New Table Needed

```sql
-- Add to api/database/init.sql (if not already present from cluster onboarding)

-- Store K8s cluster agent registration
CREATE TABLE IF NOT EXISTS k8s_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID REFERENCES connectors(id) ON DELETE CASCADE,
  display_name VARCHAR(200) NOT NULL,
  cloud_type VARCHAR(50) NOT NULL DEFAULT 'generic',
  -- 'aks' | 'eks' | 'gke' | 'generic' | 'onprem'
  agent_token VARCHAR(100) UNIQUE NOT NULL,
  -- Token used by the agent to authenticate
  connection_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'connected' | 'disconnected' | 'pending'
  nodes INTEGER DEFAULT 0,
  workloads INTEGER DEFAULT 0,
  namespaces INTEGER DEFAULT 0,
  active_policies INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  onboarded_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store K8s nodes
CREATE TABLE IF NOT EXISTS k8s_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES k8s_clusters(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  connection_status VARCHAR(20) DEFAULT 'pending',
  onboarded_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]'
);

-- Store K8s namespaces
CREATE TABLE IF NOT EXISTS k8s_namespaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES k8s_clusters(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  workload_count INTEGER DEFAULT 0,
  finding_count INTEGER DEFAULT 0,
  alert_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ
);

-- Store K8s workloads
CREATE TABLE IF NOT EXISTS k8s_workloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES k8s_clusters(id) ON DELETE CASCADE,
  namespace_id UUID REFERENCES k8s_namespaces(id),
  name VARCHAR(200) NOT NULL,
  kind VARCHAR(50) NOT NULL,
  -- 'Pod'|'Deployment'|'DaemonSet'|'StatefulSet'|'Job'|'CronJob'|'ReplicaSet'
  namespace_name VARCHAR(200),
  container_count INTEGER DEFAULT 0,
  finding_count INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_findings_cluster 
  ON findings(resource_id) WHERE cloud_provider = 'k8s';
  
CREATE INDEX IF NOT EXISTS idx_findings_namespace 
  ON findings(namespace) WHERE namespace IS NOT NULL;
```

**Note:** The `k8s_clusters` table should already exist if cluster onboarding was implemented. Confirm and adapt as needed.

---

## 10. Frontend File List — Exactly What to Create/Modify

```
dashboard/src/pages/inventory/
├── ClusterTable.tsx              [NEW] Clusters table component
├── ClusterDetailPanel.tsx        [NEW] The Sheet that slides in
├── NamespacesTab.tsx             [NEW] Namespaces sub-tab in inventory
├── WorkloadsTab.tsx              [NEW] Workloads sub-tab in inventory
├── CloudAssetsTab.tsx            [NEW] Cloud Assets tab with grouping
├── tabs/
│   ├── ClusterOverviewTab.tsx    [NEW] Overview tab content
│   ├── MisconfigTab.tsx          [NEW] Misconfiguration tab content
│   ├── VulnerabilitiesTab.tsx    [NEW] Vulnerabilities tab content
│   ├── AlertsTab.tsx             [NEW] Alerts tab content
│   ├── ComplianceTab.tsx         [NEW] Compliance tab content
│   ├── PoliciesTab.tsx           [NEW] Policies tab content
│   ├── AppBehaviourTab.tsx       [NEW] App Behaviour tab content
│   └── KiemTab.tsx               [NEW] KIEM tab content

dashboard/src/components/
├── ui/
│   ├── SeverityBars.tsx          [NEW] Mini colored severity bars
│   ├── SeverityToggle.tsx        [NEW] C/H/M/L/I toggle filter buttons
│   └── NoGraphData.tsx           [NEW] "No Graph data available!" empty state
├── inventory/
│   ├── K8sResourceSummary.tsx    [NEW] 9-cell metrics grid
│   ├── ClusterInfoCard.tsx       [NEW] Nodes/Workloads/Namespaces/Policies row
│   └── FindingsByCategoryChart.tsx [NEW] Recharts BarChart reusable
```

**Modify:**
```
dashboard/src/pages/Inventory.tsx   [MODIFY] Add CloudAssetsTab, update Clusters tab to use ClusterTable
api/routes/inventory.py             [MODIFY] Add assets, namespaces, workloads endpoints
api/routes/cluster_detail.py        [NEW]    All 8 cluster detail endpoints
api/database/init.sql               [MODIFY] Add tables if not present
```

---

## 11. Component Specifications

### `NoGraphData.tsx`

```tsx
// Renders: gray chart icon (BarChart2 from Lucide) + text "No Graph data available!"
// Used inside every chart card when data is empty
// Usage: if (!data || data.length === 0) return <NoGraphData />

export function NoGraphData() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-2">
      <BarChart2 className="w-10 h-10 text-gray-300" />
      <p className="text-sm text-gray-400">No Graph data available!</p>
    </div>
  )
}
```

### `SeverityToggle.tsx`

```tsx
// A row of 5 toggle buttons: C H M L I
// Each is a 28×28 square with colored border and centered letter
// Active state: colored border + colored text
// Inactive state: gray border + gray text
// Usage: <SeverityToggle active={activeSeverities} onChange={setSeverities} />

const SEVERITIES = [
  { key: 'CRITICAL', letter: 'C', color: '#dc2626' },
  { key: 'HIGH',     letter: 'H', color: '#ea580c' },
  { key: 'MEDIUM',   letter: 'M', color: '#d97706' },
  { key: 'LOW',      letter: 'L', color: '#16a34a' },
  { key: 'INFO',     letter: 'I', color: '#2563eb' },
]
```

### `SeverityBars.tsx`

```tsx
// Renders inline mini severity count bars
// Usage: <SeverityBars findings={{ critical: 0, high: 6, medium: 11, low: 0, info: 4 }} />
// Only renders non-zero values
// Each entry: [colored rectangle (5px wide, 16px tall)] [count number]
// Gap between entries: 6px
```

### `K8sResourceSummary.tsx`

```tsx
// 3×3 grid of metric cells
// Each cell: bordered box, large number on top (link), label below
// If 0: number is "0" in gray, not a link
// If >0: number is blue link → navigates to /findings?check={key}&cluster={id}
```

### `FindingsByCategoryChart.tsx`

```tsx
// Recharts BarChart, horizontal orientation
// Props: data: Array<{ category: string, count: number }>
// X-axis: count, Y-axis: category names
// Bar color: based on domain color tokens
// If data is empty: <NoGraphData />
// Height: 200px minimum
// ResponsiveContainer: width 100%, height 200
```

---

## 12. Inventory Page Restructure — Final Tab Layout

The existing `Inventory.tsx` should have these tabs at the top level:

```typescript
const INVENTORY_TABS = [
  { id: 'assets',     label: 'Assets',     component: CloudAssetsTab },
  { id: 'clusters',   label: 'Clusters',   component: ClustersSection },
  // ClustersSection contains its own CLUSTERS/NAMESPACES/WORKLOADS sub-tabs
]
```

**OR** keep the flat tab structure and add Cloud Assets as a first tab:

```
[Assets]  [Clusters]  [Workloads]
```

Where:
- **Assets** = CloudAssetsTab (the grouped table from image 9)
- **Clusters** = Clusters table (image 3) + clicking opens ClusterDetailPanel
- **Workloads** = Workloads table

And inside the Clusters section, there are sub-tabs: CLUSTERS | NAMESPACES | WORKLOADS (as seen in image 2).

---

## 13. UX Behaviors — Do Not Miss These

1. **Cluster detail panel does NOT navigate away.** It is a Sheet that overlays the right side. The clusters list is still visible on the left behind a dimmed overlay.

2. **Tab state is preserved.** If the user goes to MISCONFIGURATION tab and closes the panel, reopening the same cluster opens at the last viewed tab.

3. **"View All ↗" links** in each tab open the full Findings page pre-filtered to that cluster + domain.

4. **"No Graph data available!"** always shows the gray BarChart2 icon from AccuKnox, not a different empty state.

5. **The [→] expand button** in the "Insights" section header on each tab: when clicked, it expands the insights section to full width (hides the table temporarily). When clicked again, restores normal layout.

6. **Severity toggle buttons** in each tab affect only the table below them, not the charts above.

7. **The `connection_status` badge** in the panel header updates live via polling (every 30s): `GET /api/inventory/clusters/:id/status`.

8. **Pagination** in all inner tables: `Rows per page: [10 ▼]  Go to page: [1] / N  [|<] [<] [>] [>|]` — exactly as shown in AccuKnox image 3.

9. **Context menu (⋮)** on cluster rows shows: "View onboarding instructions" + "Delete" — exactly as shown in AccuKnox image 3.

10. **When "Policies" tab is empty** (no Kubescape/kube-bench data): Show message "Run a Kubescape scan to populate hardening policies. [Run Kubescape ▶]"

---

## 14. What NOT to Build (Scope Exclusions)

- ❌ **KubeArmor policies** — do NOT implement actual KubeArmor YAML policy creation/editing. The Policies tab is READ-ONLY findings viewer.
- ❌ **Network microsegmentation** — out of scope for now.
- ❌ **KIEM full graph** (like BloodHound) — the KIEM tab shows a simple table, not a complex graph.
- ❌ **Real-time agent streaming** — the agent connection is polling-based (30s interval), not WebSocket for this phase.
- ❌ **Workload hardening enforcement** — view-only for now.
- ❌ **App Behaviour network graph** — the AccuKnox network observability graph (force-directed showing pod connections). Show only the simple events table for now.

---

## 15. Validation Checklist

```bash
# 1. Clusters table renders with one cluster
# Navigate to /inventory → Clusters tab
# Should see: "test" cluster with status dot, alerts=0, findings columns, onboarded date, ⋮ menu

# 2. Cluster detail panel opens on row click
# Click the "test" row → Sheet slides in from right
# Should see: "test" header, "● Disconnected" badge, 8 tabs

# 3. All 8 tabs load without error
# Click each tab → should see "Insights" section + table below
# Empty charts show "No Graph data available!" gray icon
# Empty tables show empty rows (not errors)

# 4. Severity toggles work
# On MISCONFIGURATION tab, click [H] button → deactivate
# Table should filter out HIGH severity rows (or show message "no results")

# 5. Cloud Assets tab loads
# Click /inventory → Assets tab
# Should see: filter bar (2 rows), Group By = Category, table with grouped rows

# 6. API endpoints respond
curl http://localhost:8000/api/inventory/clusters/{cluster_id}/overview
# → JSON with k8s_resource_summary, cluster_info, etc. (all zeros is OK)

curl http://localhost:8000/api/inventory/assets?group_by=category
# → JSON with groups array (may be empty if no findings)

# 7. "View All ↗" links work
# Click "View All" in MISCONFIGURATION tab
# Should navigate to /findings?cluster_id={id}&domain=kspm

# 8. ⋮ context menu
# Click ⋮ on cluster row → shows "View onboarding instructions" + "Delete"
# "View onboarding instructions" → opens modal with kubectl apply command
```

---

*End of KSPM Inventory plan.*  
*Implement in this order: Section 2 (table) → Section 3+4.1 (Overview tab) → Section 4.2-4.4 (Misc/Vuln/Alerts tabs) → Section 4.5-4.8 (Compliance/Policies/AppBehaviour/KIEM) → Section 7 (Cloud Assets).*