# OpenCNAPP — Complete Dashboard Implementation Plan v4.0
**For:** Cursor / Codex / Claude Code / any AI coding agent  
**Date:** 2026-04-02  
**Status:** Implementation-ready. Follow phases in order. Each phase is independently shippable.  
**Reference:** Orca Security dashboard (screenshots in `/raw cnapp idea/`), AccuKnox CNAPP dashboard  
**Codebase:** React + TypeScript + Vite · FastAPI + Python · PostgreSQL · Redis · Docker Compose

---

## 0. Read This First — Ground Rules for Agents

These rules apply to every line of code in this plan. Do not deviate.

1. **Light theme is the default.** Dark mode is a toggle option, not the default. Every color must work in both modes using CSS custom properties — never hardcode `#1a1a2e` as a background.
2. **Never output raw `null`, `[]`, or `{}` to the UI.** Every empty state gets a proper empty-state component with an icon, message, and a CTA button.
3. **Never use inline `style={{}}` for colors or spacing that belong in the design system.** Use CSS custom properties or Tailwind classes.
4. **One component per file.** No 500-line component files.
5. **Every chart must be wrapped in `<ResponsiveContainer width="100%" height={height}>`** from Recharts.
6. **Every table uses TanStack Table v8** with server-side pagination, sorting, and filtering.
7. **Every form uses React Hook Form + Zod** validation. No uncontrolled inputs.
8. **All API calls go through `dashboard/src/api/client.ts`** — never call `fetch()` directly in a component.
9. **shadcn/ui for all primitive components** (Button, Card, Dialog, Select, Input, Badge, Tabs, Tooltip, Drawer, DropdownMenu). Never build primitives from scratch.
10. **Lucide React for all icons.** No emoji as icons. No other icon library.
11. **Every page that has data must support a date range filter** (Last 24h / 7d / 30d / 90d / custom). This is a global state value from Zustand.

---

## 1. Tech Stack — Final Decisions

### Frontend (`dashboard/`)
```
React 18 + TypeScript + Vite
Tailwind CSS 3 + shadcn/ui (component library)
Recharts (bar, line, area, donut, radial charts)
D3.js v7 (attack path force graph ONLY — no other D3 use)
TanStack Table v8 (all data tables)
TanStack Query v5 (all data fetching, caching, refetch)
React Hook Form + Zod (all forms)
Zustand (global state: theme, active cloud, date range, widget layout)
Lucide React (icons)
React Router v6 (routing)
```

### Backend (`api/`) — changes only, keep existing
```
FastAPI (existing — add new aggregation routes only)
PostgreSQL (existing schema — additive migrations only)
Redis (existing — add widget layout storage)
```

### New npm packages to install
```bash
cd dashboard
npm install @tanstack/react-table @tanstack/react-query zustand
npm install react-hook-form zod @hookform/resolvers
npm install d3 @types/d3
npm install lucide-react
npm install recharts  # likely already installed
npx shadcn@latest init
npx shadcn@latest add button card dialog select input badge tabs tooltip sheet dropdown-menu separator skeleton avatar progress
```

---

## 2. Design System — Implement First, Use Everywhere

### File: `dashboard/src/styles/tokens.css`

```css
:root {
  /* ── Severity colors */
  --severity-critical: #dc2626;
  --severity-critical-bg: #fef2f2;
  --severity-critical-border: #fecaca;
  --severity-high: #ea580c;
  --severity-high-bg: #fff7ed;
  --severity-high-border: #fed7aa;
  --severity-medium: #d97706;
  --severity-medium-bg: #fffbeb;
  --severity-medium-border: #fde68a;
  --severity-low: #16a34a;
  --severity-low-bg: #f0fdf4;
  --severity-low-border: #bbf7d0;
  --severity-info: #2563eb;
  --severity-info-bg: #eff6ff;
  --severity-info-border: #bfdbfe;

  /* ── Cloud provider colors */
  --cloud-azure: #0078d4;
  --cloud-azure-bg: #e6f3fb;
  --cloud-aws: #f90;
  --cloud-aws-bg: #fffbeb;
  --cloud-gcp: #4285f4;
  --cloud-gcp-bg: #eff6ff;
  --cloud-k8s: #326ce5;
  --cloud-k8s-bg: #eff2fd;
  --cloud-onprem: #6b7280;
  --cloud-onprem-bg: #f9fafb;

  /* ── Domain colors */
  --domain-cspm: #2563eb;
  --domain-kspm: #0d9488;
  --domain-cwpp: #d97706;
  --domain-ciem: #dc2626;
  --domain-imagesec: #7c3aed;
  --domain-iac: #16a34a;
  --domain-secrets: #ea580c;
  --domain-sspm: #db2777;
  --domain-pentest: #6b7280;
  --domain-sast: #0891b2;
  --domain-dast: #9333ea;

  /* ── Status colors */
  --status-open: #dc2626;
  --status-assigned: #d97706;
  --status-accepted: #6b7280;
  --status-fixed: #16a34a;
  --status-false-positive: #9ca3af;

  /* ── Layout */
  --sidebar-width: 220px;
  --topbar-height: 56px;
  --content-padding: 24px;

  /* ── Light theme surfaces */
  --bg-page: #f7f8fa;
  --bg-card: #ffffff;
  --bg-card-hover: #f9fafb;
  --bg-sidebar: #111827;
  --bg-topbar: #ffffff;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --text-on-dark: #ffffff;
  --text-sidebar: #d1d5db;
  --text-sidebar-active: #ffffff;
  --border-default: #e5e7eb;
  --border-strong: #d1d5db;
  --ring-focus: #2563eb;

  /* ── Risk score zones */
  --risk-good-start: 80;
  --risk-fair-start: 50;
  /* Score >= 80 = Good (green), 50-79 = Fair (amber), < 50 = Poor (red) */
}

[data-theme="dark"] {
  --bg-page: #0f1117;
  --bg-card: #1a1d27;
  --bg-card-hover: #1e2130;
  --bg-sidebar: #0a0d14;
  --bg-topbar: #12151f;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;
  --border-default: #1f2937;
  --border-strong: #374151;
}
```

### File: `dashboard/src/components/ui/SeverityBadge.tsx`
```tsx
// Renders: CRITICAL | HIGH | MEDIUM | LOW | INFO
// Usage: <SeverityBadge severity="CRITICAL" />
// The badge has a colored dot + text in the matching severity color
// Never use raw text for severity — always this component
```

### File: `dashboard/src/components/ui/CloudBadge.tsx`
```tsx
// Renders cloud provider icon + name
// Usage: <CloudBadge provider="azure" accountId="sub-123" />
// Shows: [Azure icon] Microsoft Azure · sub-123
// Uses cloud provider colors from tokens
```

### File: `dashboard/src/components/ui/DomainBadge.tsx`
```tsx
// Renders security domain as a colored pill
// Usage: <DomainBadge domain="cspm" />
// Shows: small colored square + uppercase domain text
```

### File: `dashboard/src/components/ui/EmptyState.tsx`
```tsx
// Usage: <EmptyState icon={ShieldAlert} title="No findings yet" description="Connect a cloud account or run a scan." action={{ label: "Add Cloud", onClick: () => navigate('/connectors') }} />
// Never show raw "No results" text — always this component
```

### File: `dashboard/src/components/ui/StatCard.tsx`
```tsx
// Usage: <StatCard label="Critical" value={12} trend={+3} severity="critical" onClick={() => {}} />
// Shows: large number, label below, optional trend delta (↑3 this week), colored border/accent
// Clicking navigates to Findings filtered by that severity
```

---

## 3. Global State — Zustand Store

### File: `dashboard/src/store/index.ts`

```typescript
interface AppStore {
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Global date range filter (applies to all dashboard widgets)
  dateRange: '24h' | '7d' | '30d' | '90d' | 'custom';
  customDateFrom: Date | null;
  customDateTo: Date | null;
  setDateRange: (range: AppStore['dateRange'], from?: Date, to?: Date) => void;

  // Active cloud/connector filter (null = all clouds)
  activeCloud: string | null;  // connector ID
  setActiveCloud: (cloudId: string | null) => void;

  // Dashboard layout — which widgets are on the unified dashboard and in what order
  // Persisted to localStorage AND to /api/dashboard/layout (PostgreSQL)
  unifiedDashboardLayout: WidgetConfig[];
  setUnifiedDashboardLayout: (layout: WidgetConfig[]) => void;

  // Per-domain dashboard layouts (cspm, kspm, cwpp, ciem, etc.)
  domainDashboardLayouts: Record<string, WidgetConfig[]>;
  setDomainDashboardLayout: (domain: string, layout: WidgetConfig[]) => void;
}

interface WidgetConfig {
  id: string;                   // unique instance ID (UUID)
  widgetType: string;           // key from WIDGET_REGISTRY
  title: string;
  colSpan: 1 | 2 | 3;          // out of 3 columns
  rowSpan: 1 | 2;
  config: Record<string, any>;  // widget-specific settings (e.g., which cloud to filter)
}
```

---

## 4. Routing — All Routes

### File: `dashboard/src/App.tsx`

```
/                           → <UnifiedDashboard />
/dashboard/:domain          → <DomainDashboard domain={params.domain} />
                              domain = cspm | kspm | cwpp | ciem | secrets | compliance
/findings                   → <FindingsExplorer />
/inventory                  → <Inventory />  (tabs: Clouds, Clusters, Namespaces, Workloads, Images)
/attack-paths               → <AttackPaths />
/attack-paths/:id           → <AttackPathDetail />  (the Orca "Attack Flow" view)
/pentest                    → <PentestRunner />
/plugins                    → <PluginManager />
/connectors                 → <Connectors />
/alerts                     → <Alerts />
/compliance                 → <Compliance />
/settings                   → <Settings />  (user, notifications, API keys)
```

---

## 5. Layout — Shell

### File: `dashboard/src/layout/AppShell.tsx`

The outer wrapper that every authenticated page uses.

**Structure:**
```
<div class="app-shell">
  <Sidebar />                 // left fixed sidebar, 220px wide
  <div class="main">
    <Topbar />                // top fixed bar, 56px tall
    <main class="content">   // scrollable content area
      {children}
    </main>
  </div>
</div>
```

### File: `dashboard/src/layout/Sidebar.tsx`

**Exact sidebar structure (match Orca's left nav):**
```
[OpenCNAPP logo]                     // top left
[Unit/Org selector dropdown]         // "Select Unit" like Orca

Navigation groups:
──── OVERVIEW ────
  [LayoutDashboard] Dashboard        → /
  [Activity]        Activity         → /alerts  (real-time alerts)

──── FINDINGS ────
  [ShieldAlert]     Findings         → /findings
  [GitBranch]       Attack Paths     → /attack-paths
  [Server]          Inventory        → /inventory

──── DOMAINS ────  (collapsible, shows per-domain dashboards)
  [Cloud]           CSPM             → /dashboard/cspm
  [Container]       KSPM             → /dashboard/kspm
  [Zap]             CWPP             → /dashboard/cwpp
  [Key]             CIEM             → /dashboard/ciem
  [Lock]            Secrets          → /dashboard/secrets
  [FileCode]        IaC              → /dashboard/iac
  [Globe]           SSPM             → /dashboard/sspm

──── SECURITY OPS ────
  [Terminal]        Pentest Runner   → /pentest
  [CheckSquare]     Compliance       → /compliance

──── CONFIGURATION ────
  [Puzzle]          Plugins          → /plugins
  [Plug]            Connectors       → /connectors
  [Settings]        Settings         → /settings
```

Active item: white text, blue left border, slightly lighter sidebar background.  
Inactive items: gray text (#d1d5db), no border, hover slightly lighter.

### File: `dashboard/src/layout/Topbar.tsx`

**Exact topbar structure (match Orca's top nav):**
```
LEFT:  [Unit selector: "Select Unit ▼"]

CENTER: [🔍 Search Assets, Alerts, Vulnerabilities...    ⌘K]
        Cmd+K opens a command palette (SearchPalette component)

RIGHT:  [Add Cloud ▼]  [Add Cluster]  [Add Registry]
        [Bookmarks icon]  [History icon]  [Notifications bell]
        [Help ? icon]  [User avatar]

Theme toggle: sun/moon icon, top right area
Date range selector: appears in topbar ONLY on dashboard pages
```

The "Add Cloud", "Add Cluster", "Add Registry" buttons open wizard modals.  
These are the most important CTA buttons — make them prominent.

---

## 6. Unified Dashboard — The Home Page

**Route:** `/`  
**File:** `dashboard/src/pages/UnifiedDashboard.tsx`  
**Reference:** Orca's main dashboard (image 4 in the screenshots)

This is the most important page. It must feel like a real CNAPP product.

### 6.1 Dashboard Selector

At the top of the Unified Dashboard, a horizontal tab/pill selector:

```
[Unified ✓]  [CSPM]  [KSPM]  [CWPP]  [CIEM]  [Secrets]  [+ Create Dashboard]
```

- "Unified" = the default view with all domains combined
- Domain tabs (CSPM/KSPM/etc.) switch to `/dashboard/cspm` etc.
- "+ Create Dashboard" opens the Widget Catalogue modal to create a custom dashboard

### 6.2 Dashboard Toolbar (below the tab selector)

```
LEFT:  [Cloud Posture Overview ▼]  [+ Add Filter]
RIGHT: [⋯ menu]  [↻ refresh]  [📅 Last 30 days: Mar 3 – Apr 2, 2026 ▼]
```

The date range picker opens a dropdown:
- Last 24 hours
- Last 7 days  
- Last 30 days (default)
- Last 90 days
- Custom range (date picker)

### 6.3 Widget Grid Layout

The dashboard is a **3-column CSS grid**. Each widget can span 1, 2, or 3 columns and 1 or 2 rows.

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 24px;
}
```

**Default unified dashboard layout (32 widgets total — implement all):**

Row 1 — Stats strip (4 columns, each 0.75 col):
```
[Risk Score]  [Total Findings]  [Critical]  [High]  [Resources Scanned]  [Last Scan]
```

Row 2:
```
[Cloud Findings — 2 cols]           [Severity Distribution Donut — 1 col]
```

Row 3:
```
[Findings Trend (30d area chart) — 2 cols]    [Top MITRE ATT&CK — 1 col]
```

Row 4:
```
[Findings by Cloud Provider table — 2 cols]   [Compliance Overview — 1 col]
```

Row 5:
```
[Top Alerts by Risk Score table — 2 cols]     [Accounts by Provider — 1 col]
```

Row 6:
```
[Alert Inventory (by category) — 2 cols]      [Attack Path Summary — 1 col]
```

Row 7:
```
[Asset Inventory by Category — 3 cols full width]
```

Row 8:
```
[Image Risk Assessment — 1 col]   [Namespace Severity — 1 col]   [Remediation Tracker — 1 col]
```

### 6.4 Every Widget — Complete Specification

#### Widget: RiskScoreGauge
- **Type:** Radial/arc gauge
- **Size:** 1 col × 1 row, or as a stat card
- **Shows:** Large number (0–100 center), arc colored by zone (red <50, amber 50-79, green 80+), label below ("Good" / "Fair" / "Poor"), delta from last week (↑3 this week)
- **API:** `GET /api/dashboard/risk-score?range=30d`
- **Response:** `{ score: 73, label: "Fair", delta: +2, breakdown: { cspm: 68, kspm: 81, cwpp: 72, ciem: 65 } }`
- **Empty state:** Score of 0 with message "No scan data — connect a cloud account"

#### Widget: TotalFindingsCard
- **Type:** StatCard
- **Shows:** Total count, Open: N badge, severity breakdown pills (12 CRIT / 47 HIGH / 183 MED / 512 LOW)
- **API:** `GET /api/dashboard/summary?range=30d`
- **Click:** Navigates to `/findings`

#### Widget: CriticalFindingsCard  
- **Type:** StatCard with red accent
- **Shows:** Critical count, "Immediate action" label, "Top priority" red badge
- **Click:** Navigates to `/findings?severity=CRITICAL`

#### Widget: HighFindingsCard
- **Type:** StatCard with orange accent
- **Shows:** High count, "Fix next" label, "Elevated" orange badge
- **Click:** Navigates to `/findings?severity=HIGH`

#### Widget: CloudFindingsTrendChart
- **Type:** Recharts AreaChart
- **Size:** 2 cols × 1 row
- **Title:** "Cloud Findings Trend — last 7 days"
- **X-axis:** dates, **Y-axis:** finding count
- **Series:** Total findings (blue fill), New findings (orange line)
- **API:** `GET /api/dashboard/trend?days=7&metric=findings`
- **Response:** `{ data: [{ date: "2026-03-26", total: 234, new: 12 }, ...] }`
- **Empty:** Flat line at 0 with message "No data — ingest CI results or run a scan"

#### Widget: FindingsByDomainBar
- **Type:** Recharts BarChart (horizontal)
- **Size:** 2 cols × 1 row
- **Title:** "Findings by domain"
- **Each bar:** domain name, count, colored by domain color
- **Bars:** CSPM / KSPM / CWPP / CIEM / Image Sec / IaC / Secrets / SSPM / Pentest
- **API:** `GET /api/dashboard/by-domain?range=30d`
- **Click bar:** Navigates to `/findings?domain={domain}`

#### Widget: SeverityDistributionDonut
- **Type:** Recharts PieChart (donut)
- **Size:** 1 col × 1 row
- **Title:** "Severity distribution"
- **Segments:** CRITICAL (red), HIGH (orange), MEDIUM (amber), LOW (green), INFO (blue)
- **Center label:** total count
- **Legend:** below the chart, horizontal
- **API:** `GET /api/dashboard/severity-breakdown?range=30d`
- **Click segment:** Navigates to `/findings?severity={sev}`

#### Widget: FindingsByCloudTable
- **Type:** Table widget (not a chart)
- **Size:** 2 cols × 1 row
- **Title:** "Findings by cloud provider"
- **Columns:** Provider (icon + name), Total Findings, C (critical count — red), H (high — orange), M (medium — amber), L (low — green)
- **Rows:** AWS / Azure / GCP / On-prem / K8s (only show configured providers)
- **Footer:** "0 Findings" shown when empty
- **API:** `GET /api/dashboard/by-cloud?range=30d`
- **Response:** `{ data: [{ provider: "azure", total: 180, critical: 12, high: 47, medium: 83, low: 38 }] }`
- **Click row:** Navigates to `/findings?cloud={provider}`

#### Widget: TopAlertsTable
- **Type:** Table widget
- **Size:** 2 cols × 1 row
- **Title:** "Top Alerts — by Risk Score"
- **Columns:** Risk Level (score badge), Status, Asset (icon + name + type), Account, Tickets
- **Risk score badge:** colored number (red ≥9, orange ≥7, yellow ≥5)
- **Status column:** Open / Acknowledged / Fixed badge
- **API:** `GET /api/dashboard/top-alerts?limit=10&range=30d`
- **"See All" link:** top right, navigates to `/findings?sort=severity_desc`

#### Widget: AlertInventoryWidget
- **Type:** Mixed — big number + category grid
- **Size:** 2 cols × 1 row
- **Title:** "Alert Inventory — by Category"
- **Left:** Large total count (e.g., "57.5K")
- **Right:** Grid of categories with counts:
  ```
  28.3K  Workload Misconfig.    12.6K  Vulnerabilities
   3,213  Best Practices         3,136  Network Misconfig.
   1,599  Data Protection        1,420  Logging & Monitoring
   1,417  IAM Misconfigurations  1,300  Lateral Movement
   1,104  Neglected Assets       +8    More categories
  ```
- **API:** `GET /api/dashboard/alert-inventory?range=30d`
- **Click category:** Navigates to findings filtered by that category tag

#### Widget: ComplianceOverviewWidget
- **Type:** List with progress bars
- **Size:** 1 col × 1 row
- **Title:** "Compliance Overview — Frameworks status"
- **Each row:** framework icon + name + "Passed tests ■ Failed tests ■" + "X% passed"
- **Rows:** CIS / NIST / PCI-DSS / SOC2 / ISO27001
- **Progress bar:** green (passed) + red (failed), side by side
- **API:** `GET /api/compliance/summary?range=30d`
- **"See All" link:** navigates to `/compliance`

#### Widget: TopMitreAttackWidget
- **Type:** Recharts BarChart (horizontal)
- **Size:** 1 col × 1 row
- **Title:** "Top 5 MITRE ATT&CK — by Alerts"
- **Bars:** technique name (e.g., "Best Practices", "Discovery", "Defense Evasion", "Collection", "Privilege Escalation") + count
- **API:** `GET /api/dashboard/mitre-top?limit=5&range=30d`
- **Note:** Derived from compliance_tags on findings matching "mitre-*"

#### Widget: AccountsWidget
- **Type:** Stats grid
- **Size:** 1 col × 1 row
- **Title:** "Accounts — by Provider"
- **Shows:** GCP count (with GCP icon), AWS count, Azure count
- **API:** `GET /api/connectors?type=cloud` (count by provider)

#### Widget: AssetInventoryWidget
- **Type:** Category grid with large numbers
- **Size:** 3 cols × 1 row (full width)
- **Title:** "Asset Inventory — by Category"
- **Categories with icons:**
  ```
  13.1K  Identity & Access    5,853  Network    3,370  Kubernetes
   1,896  Security & Monitor.  3,236  Compute    ...more
  ```
- **API:** `GET /api/inventory/summary?range=30d`
- **Click category:** Navigates to `/inventory?category={cat}`

#### Widget: ImageRiskAssessmentWidget
- **Type:** Bar chart + summary
- **Size:** 1 col × 1 row
- **Title:** "Image Risk Assessment"
- **Shows:** Total images count, bar showing images by severity (Critical / High / Medium)
- **API:** `GET /api/inventory/images/summary?range=30d`
- **Link to:** `/inventory?tab=images`

#### Widget: NamespaceSeverityWidget
- **Type:** Stacked bar chart (one bar per namespace)
- **Size:** 1 col × 1 row
- **Title:** "Namespace Severity Summary"
- **Only shows if K8s connector is configured**
- **API:** `GET /api/inventory/namespaces/severity?range=30d`
- **Selector:** cluster dropdown above the chart

#### Widget: RemediationTrackerWidget
- **Type:** Funnel / step chart
- **Size:** 1 col × 1 row
- **Title:** "Remediation Tracker"
- **Shows:** Open → Assigned → In Review → Fixed counts as a horizontal flow
- **SLA breach:** red highlight if findings older than SLA threshold
- **API:** `GET /api/findings/lifecycle-summary?range=30d`

#### Widget: AttackPathSummaryWidget
- **Type:** Stats + list
- **Size:** 1 col × 1 row
- **Title:** "Attack Paths"
- **Stats row:** High Impact: N / Medium: N / Low: N / Info: N
- **List:** top 3 attack paths with impact score badge
- **API:** `GET /api/attack-paths/summary?range=30d`
- **"See All" link:** navigates to `/attack-paths`

#### Widget: SecretsSummaryWidget
- **Type:** Stats + breakdown
- **Size:** 1 col × 1 row
- **Title:** "Secrets Detected"
- **Shows:** Total secrets count, breakdown by type (API keys / DB credentials / Cloud creds / Certs)
- **API:** `GET /api/findings?domain=secrets&group_by=check_id`

#### Widget: IaCMisconfigWidget
- **Type:** Bar chart
- **Size:** 1 col × 1 row
- **Title:** "IaC Misconfigurations"
- **Bars per IaC type:** Terraform / Helm / K8s YAML / Bicep / ARM
- **API:** `GET /api/findings?domain=iac&group_by=resource_type`

#### Widget: NewCriticalFindingsTrendChart
- **Type:** Recharts LineChart
- **Size:** 1 col × 1 row
- **Title:** "New Critical Findings Trend"
- **Single line:** new critical findings per day
- **API:** `GET /api/dashboard/trend?days=7&severity=CRITICAL&metric=new`

### 6.5 Widget Customization System

**"Add Widget" button** (bottom of dashboard or toolbar) opens:

```
Modal: "Add Widget"
┌─────────────────────────────────────────────────────┐
│  [Search by Widget Category/Name...]                │
│                                                     │
│  Category               Widgets                     │
│  ─────────────────      ─────────────────────────   │
│  CSPM            0/18 > ☐ Cloud Findings            │
│  KSPM            0/25 > ☐ Findings by Cloud Prov.  │
│  Runtime Sec.    0/21 > ☐ Cloud Findings Trend      │
│  Assets          0/12 > ☐ New Cloud Findings Trend  │
│  Tickets          0/1 > ☐ Top 10 Cloud Accounts     │
│                         ☐ Top 10 Cloud Findings     │
│                         ☐ Assets                    │
│                                                     │
│  [0/32 Selected]                 [Cancel]  [Done]   │
└─────────────────────────────────────────────────────┘
```

**Widget Registry** (`dashboard/src/widgets/registry.ts`):
```typescript
// Every widget that can be added to any dashboard
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  risk_score_gauge: {
    id: 'risk_score_gauge',
    name: 'Risk Score Gauge',
    description: 'Overall security posture score (0–100)',
    category: 'overview',
    defaultColSpan: 1,
    defaultRowSpan: 1,
    component: RiskScoreGaugeWidget,
    domains: ['all'],  // available on all dashboards
  },
  findings_by_cloud: {
    id: 'findings_by_cloud',
    name: 'Findings by Cloud Provider',
    category: 'cspm',
    defaultColSpan: 2,
    defaultRowSpan: 1,
    component: FindingsByCloudWidget,
    domains: ['all', 'cspm'],
  },
  // ... all 32 widgets
}
```

**Dashboard layouts are stored in Postgres:**
```sql
CREATE TABLE dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL DEFAULT 'default',
  dashboard_type VARCHAR(50) NOT NULL,  -- 'unified' | 'cspm' | 'kspm' | 'cwpp' | 'custom'
  dashboard_name VARCHAR(200),
  layout JSONB NOT NULL,  -- array of WidgetConfig
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API endpoint:**
```
GET  /api/dashboard/layout?type=unified
POST /api/dashboard/layout  { type, name, layout }
PUT  /api/dashboard/layout/:id  { layout }
```

---

## 7. Domain-Specific Dashboards

**Route:** `/dashboard/:domain`  
**File:** `dashboard/src/pages/DomainDashboard.tsx`

Each domain dashboard is a **filtered version of the unified dashboard** showing only relevant widgets. The domain is passed as a prop and filters both the widgets shown and all API calls.

### Domain Dashboard Configurations

```typescript
// dashboard/src/config/domainDashboards.ts
export const DOMAIN_DASHBOARD_DEFAULTS: Record<string, string[]> = {
  cspm: [
    'risk_score_gauge',
    'findings_by_cloud_table',
    'cloud_findings_trend',
    'new_cloud_findings_trend',
    'top_alerts_table',
    'compliance_overview',
    'asset_inventory',
    'accounts_widget',
    'top_mitre_attack',
  ],
  kspm: [
    'risk_score_gauge',
    'namespace_severity',
    'findings_by_domain_bar',
    'image_risk_assessment',
    'top_alerts_table',
    'compliance_overview',
    'attack_path_summary',
  ],
  cwpp: [
    'risk_score_gauge',
    'alert_inventory',
    'top_alerts_table',
    'remediation_tracker',
    'runtime_policies_widget',
    'top_mitre_attack',
    'namespace_severity',
  ],
  ciem: [
    'risk_score_gauge',
    'findings_by_cloud_table',
    'top_alerts_table',
    'identity_risk_widget',
    'accounts_widget',
  ],
  secrets: [
    'risk_score_gauge',
    'secrets_summary',
    'cloud_findings_trend',
    'top_alerts_table',
  ],
  iac: [
    'risk_score_gauge',
    'iac_misconfig_widget',
    'cloud_findings_trend',
    'top_alerts_table',
    'compliance_overview',
  ],
};
```

The domain dashboard also has the same "Add Widget" button allowing users to customize.

---

## 8. Attack Paths — Full Specification

**Route:** `/attack-paths`  
**File:** `dashboard/src/pages/AttackPaths.tsx`  
**Reference:** Orca screenshots 1–3

### 8.1 Attack Paths List Page (`/attack-paths`)

**Header section (match Orca image 1 exactly):**
```
Attack Paths                                               [X close button]

Attack Paths by Impact Score:
[🔴 172 High Impact]  [🟠 55 Medium]  [🟡 1,832 Low Impact]  [⬜ 0 Informational]

Target Asset Category:
[VM 283] [Container 2] [Function 281] [Bucket 1,372] [DB 50] [Role 51] [User 10] [Group 10] [PII 10] [Intelligence 7] [Secrets 67] [Broad... 343] [+1]

View Results By:
[Attack Paths (2,059) ✓]  [Alerts (535)]  [Assets (213)]

Query: [🔍 1 Assets Filter]                    [Manage Columns]  [Sort by ▼]  [Grouped by Impact Value ▼]
```

**Table columns (exact Orca match):**
- Asset (icon + name + "Attack Path" label)
- Impact Score (sortable, default sort desc)
- Risk Value (Critical/High/Medium/Low badge)
- Account (cloud icon + account name + ID)
- Is Exposed (Public/Internet Facing) (Yes/No)
- Exposure type
- Length (number of hops)
- Created At (relative time)
- Last Seen (relative time)
- Impact Score (repeated for comparison)
- Prob. (probability score)

**Grouping:** Default grouped by Impact Value (High / Medium / Low / Informational sections).  
Each group has a header row showing group name + item count.

**API:** `GET /api/attack-paths?sort=impact_score_desc&group_by=impact_value&page=1&limit=25`

### 8.2 Attack Path Detail Page (`/attack-paths/:id`)

**Reference:** Orca image 2 (the "Attack Flow" view)

**Header:**
```
Public facing Nginx - dev with Lateral Movement to remediation-demo-bucket

🔴 99  Your Impact Score  • Probability Score 99  • Risk Score 99
        [API Security Demo] → [acme-production (506464807365)]

                                    [Download as PDF]  [Actions ▼]  [Integrations ▼]
```

**Attack Flow diagram (horizontal linear flow):**
```
[Cloud account A header]              [Cloud account B header]              [Cloud account C header]

🌐 ──── [Nginx - dev]  ──── [alert cards below] ──── [anika (IAM role)] ──── [remediation-demo-bucket 👑]
         VM node                                       Identity node              S3 bucket (Crown Jewel)
         
         [7.5 Service Vulnerability    [6.5 Sensitive AWS keys     [AmazonS3ReadOnly
             orca-602008                   on system                   Access policy]
             MITRE initial access          orca-569555                 
             and 10 more]                  MITRE credential access]
             
[⚡ Top Alerts ▼]
```

**Node types and icons:**
- Globe/internet = entry point
- Server/VM = compute instance
- User/shield = IAM role/identity
- Bucket/storage = storage resource
- Crown Jewel = high-value target (purple hexagon with crown)
- Alert cards below nodes: score badge (red/orange) + finding name + MITRE tag

**Legend (top right of diagram):**
```
◇ Asset    ◆ Alert    ⊙ Crown Jewel
```

**Below the diagram — tabs:**
```
[Attack Story ✓]  [Attack Path Timeline]
```

**Attack Story tab:**
```
[Cloud icon] API Security Demo

1    An adversary can gain access to your internal network by compromising 
     [Nginx - dev] due to [Service Vulnerability]

     [Cloud icon] acme-production (506464807365)

2    The AWS Key [Sensitive AWS keys on system] found on [Nginx - dev] can be 
     used to authenticate as the user [anika]

3    The user [anika] has access to [remediation-demo-bucket] bucket
```

**When user clicks a node in the diagram:**  
Right panel slides in from right (sheet/drawer) with:
- Asset name + type
- Tabs: Overview | Additional Information
- Overview tab shows:
  - Alerts on Asset count
  - Account, Exposure, State, Scan Date
  - **Graph section:** mini D3 graph showing IAM relationships (like Orca image 3)
    - Nodes: IAM Roles, IAM Users, IAM User Groups, Any S3 Bucket, Any User, Any Principal, Any Role, AWS IAM Managed Policies
    - Edges: "Has attached" labels on edges
  - Overview section: Attack Path Inventories bar, ARN, AWS S3 ACL Grant, Creation Time, Region
  - Related Compliance, Total Files Count, Used Storage

### 8.3 Attack Flow Diagram Implementation (D3.js)

**File:** `dashboard/src/components/attack-paths/AttackFlowDiagram.tsx`

This is a **horizontal linear flow diagram**, NOT a force graph. It shows a chain of steps.

```typescript
// Data model
interface AttackFlowNode {
  id: string;
  type: 'entry' | 'compute' | 'identity' | 'storage' | 'network' | 'crown_jewel';
  name: string;
  accountId?: string;
  accountName?: string;
  findings: AttackFlowFinding[];  // alert cards shown below the node
  isCrownJewel: boolean;
}

interface AttackFlowFinding {
  id: string;
  score: number;
  title: string;
  checkId: string;
  mitrePhase: string;
  additionalCount?: number;  // "and 10 more"
}

interface AttackPath {
  id: string;
  impactScore: number;
  probabilityScore: number;
  riskScore: number;
  title: string;
  length: number;
  nodes: AttackFlowNode[];
  edges: Array<{ from: string; to: string }>;
  story: AttackStoryStep[];
}
```

**D3 rendering approach:**
- Use SVG for the main flow diagram
- Nodes are positioned horizontally at fixed X intervals (not force simulation)
- Account header bars span above nodes belonging to the same account
- Findings cards are rendered as foreignObject elements below each node
- Lines connect nodes horizontally with slight curves
- Crown Jewel node gets a purple hexagon shape and special border

### 8.4 Attack Path Mini Graph (in the node detail panel)

**File:** `dashboard/src/components/attack-paths/AssetGraph.tsx`

This IS a D3 force simulation. Smaller, shows IAM relationships around a specific asset.

```typescript
// Nodes: IAM Roles, IAM Users, IAM User Groups, Policies, the target asset
// Edges: "Has attached", "Can access", "Member of"
// Colors: IAM nodes in blue, policy nodes in purple, asset node highlighted
// Layout: force-directed with the target asset centered
// Zoom: yes, pan: yes
```

---

## 9. Findings Explorer — Full Specification

**Route:** `/findings`  
**File:** `dashboard/src/pages/Findings.tsx`

### 9.1 Filter Bar

```
[Severity: All ▼]  [Domain (cspm, kspm...) ▼]  [Tool (prowler, trivy...) ▼]  [Cloud (azure, aws...) ▼]  [Status: All ▼]

[🔍 Search title/resource/check...]          [Sort: Created ▼]  [Order: Desc ▼]  [Refresh]

Active filters shown as pills: [CRITICAL ×] [azure ×] [clear all]
```

### 9.2 Table

**Columns:**
- Checkbox (for bulk select)
- Severity (SeverityBadge component)
- Domain (DomainBadge component)
- Tool (tool name + version)
- Cloud (CloudBadge component)
- Resource (resource_name or resource_id truncated)
- Status (StatusBadge: open/assigned/accepted/fixed)
- Title (truncated, max 60 chars)
- Age (relative: "2h ago", "3d ago")
- Actions (⋯ dropdown)

**Row interaction:**
- Click row → opens side drawer with finding detail (not navigation, stays on page)
- Checkbox → enables bulk action toolbar

**Bulk action toolbar (appears when ≥1 checkbox selected):**
```
[3 selected]  [Assign to ▼]  [Mark as: Accepted Risk ▼]  [Mark Fixed]  [Export selected]  [Deselect all]
```

**Pagination:**
```
Page 1 / 24    [Prev]  [Next]    25/50/100 per page selector    Total: 612 findings
```

### 9.3 Finding Detail Drawer

Slides in from right when a row is clicked. Width: 600px.

```
[×]  Finding Detail
─────────────────────────────────────────────────────
Title: Storage account allows public blob access
[CRITICAL]  [cspm]  [prowler]  [azure]

─── Metadata ───────────────────────────────────────
Resource:      mystore.blob.core.windows.net
Resource Type: storage_account
Cloud:         Microsoft Azure
Account:       sub-abc123
Region:        eastus
Check ID:      check_azure_storage_public_blob
First Seen:    2026-03-15 (18 days ago)
Last Seen:     2026-04-01 (today)
Sources:       prowler, defender_for_cloud

─── Status & Assignment ────────────────────────────
Status:  [Open ▼]  →  can change to: Assigned / Accepted Risk / Fixed / False Positive
Assignee: [Select assignee... ▼]
Ticket:   [https://jira... input]  [Open ticket]

─── Description ────────────────────────────────────
Public blob access allows anyone to read the contents of this storage account
without authentication.

─── Remediation ─────────────────────────────────────
1. Navigate to the Azure Portal
2. Go to Storage Account → Configuration
3. Set "Allow Blob public access" to Disabled

─── Compliance ──────────────────────────────────────
[CIS Azure 1.4] [PCI-DSS 3.2] [NIST 800-53 AC-1] [SOC2 CC6]

─── Raw Output ──────────────────────────────────────
[JSON tab showing raw_finding field, collapsible]
```

---

## 10. Inventory — Full Specification

**Route:** `/inventory`  
**File:** `dashboard/src/pages/Inventory.tsx`

**Tabs:** Clouds | Clusters | Namespaces | Workloads | Images

### Tab: Clusters

**Reference:** AccuKnox clusters view

```
CLUSTERS    NAMESPACES    WORKLOADS

[+ FILTER]  [🔍 Search]                           [↻]  [Date range]  [Onboard Cluster ►]

□  Name    Alerts    Findings    Onboarded    Last Synced    Nodes    Workloads    Namespaces    Active Policies    Tags

(empty: "No data available!" with icon)
```

**"Onboard Cluster" button** opens wizard:
```
Step 1: Name + Cloud
  Cluster Name: [input]
  Cloud: [Azure AKS ▼]  or  [AWS EKS]  or  [GCP GKE]  or  [Generic K8s]

Step 2: Install agent
  Copy and run this command in your cluster:
  ┌─────────────────────────────────────────────────────────────┐
  │ kubectl apply -f \                                          │
  │   https://your-opencnapp-url/api/agent/install/{token}     │
  └─────────────────────────────────────────────────────────────┘
  [📋 Copy command]
  
  Alternatively, install with Helm:
  helm repo add opencnapp https://...
  helm install opencnapp-agent opencnapp/agent --set token={token}

Step 3: Verify
  [Checking connection...]
  → [✓ Connected — 12 nodes detected, 47 pods found]
```

### Tab: Images

```
Columns: Image name | Registry | Tag | Last scanned | Critical | High | Medium | Low | Total CVEs | Status

[Scan Now] button per row
```

### API endpoints needed for Inventory:
```
GET /api/inventory/clusters
GET /api/inventory/clusters/:id/namespaces
GET /api/inventory/namespaces/:id/workloads
GET /api/inventory/images
POST /api/inventory/clusters  (onboard cluster — generates install token)
GET /api/inventory/summary  (counts by category for the widget)
```

---

## 11. Compliance — Full Specification

**Route:** `/compliance`  
**File:** `dashboard/src/pages/Compliance.tsx`

### 11.1 Framework selector (top left):
```
[ALL ▼]  → Framework dropdown: CIS-Azure / CIS-AWS / CIS-K8s / NIST 800-53 / PCI-DSS / SOC2 / ISO27001 / HIPAA

[Cloud ▼]  (filter by which cloud account)
[Refresh]
```

### 11.2 Framework summary cards:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Framework findings                                                       │
│                                                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ CIS          │ │ NIST         │ │ PCI-DSS      │ │ SOC2         │       │
│  │ 234          │ │ 89           │ │ 156          │ │ 67           │       │
│  │ Mapped       │ │ Mapped       │ │ Mapped       │ │ Mapped       │       │
│  │ findings     │ │ findings     │ │ findings     │ │ findings     │       │
│  │ [====──] 68% │ │ [===───] 55% │ │ [=======]88% │ │ [====──] 72% │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Compliance Heatmap

Below the summary cards, when a specific framework is selected:

```
Framework: [CIS Azure 1.4 ▼]

Control Domain              Pass    Fail    Partial    Coverage
────────────────────────────────────────────────────────────────
Identity and Access         [████░░] 72%    [12 fail]
Network Security            [███░░░] 58%    [24 fail]
Storage                     [██████] 92%    [3 fail]
Logging and Monitoring      [████░░] 68%    [18 fail]
Virtual Machines            [█████░] 81%    [7 fail]
Key Management              [███░░░] 56%    [19 fail]
Database                    [████░░] 74%    [9 fail]

[Each row is clickable → shows findings for that control domain]
```

**Color coding:**
- Green (≥80% pass): `#16a34a`
- Amber (50–79%): `#d97706`
- Red (<50%): `#dc2626`
- Gray (no data): `#9ca3af`

### 11.4 Control Drilldown (click a row):

Side drawer shows all findings mapped to that control domain with the usual findings table.

### 11.5 Export:

```
[Export PDF Report]  → generates a compliance report with all framework results
API: POST /api/compliance/export { framework, cloud, format: 'pdf' }
```

### API endpoints:
```
GET /api/compliance/summary?framework=all&cloud=all&range=30d
GET /api/compliance/heatmap?framework=cis-azure&cloud=azure&range=30d
GET /api/compliance/findings?framework=cis-azure&control_domain=identity&page=1
POST /api/compliance/export
```

---

## 12. Plugin Manager — Full Specification

**Route:** `/plugins`  
**File:** `dashboard/src/pages/PluginManager.tsx`

### 12.1 Layout

**Toolbar:**
```
[Filter: All domains ▼]  [Filter: Status ▼]  [🔍 Search plugins...]    [Sync plugins]
```

**Card grid (3 columns):**

Each plugin card:
```
┌─────────────────────────────────────────┐
│ [CSPM]                        [● Active]│  ← domain badge + status dot
│                                          │
│ Prowler                                  │  ← tool name (large)
│ 400+ checks: Azure, AWS, GCP            │  ← description
│                                          │
│ Last run: 2h ago • 234 findings         │  ← last run + finding count
│ Schedule: Weekly (Mon 06:00)             │  ← schedule
│                                          │
│ [Run now ▶]  [Configure ⚙]  [●──] ON   │  ← actions + toggle
└─────────────────────────────────────────┘
```

**Status dots:**
- Green filled: Active (last run succeeded)
- Yellow filled: Running (scan in progress)
- Red filled: Error (last run failed)
- Gray filled: Idle (enabled but waiting for schedule)
- Gray outline: Disabled

**"Run now" button:** Triggers on-demand scan. Shows inline progress: "Running... [████░░░░░░] 42%"  
Use WebSocket to stream progress back.

**"Configure" button:** Opens configuration drawer:
```
Plugin: Prowler
Domain: CSPM
Docker image: toniblyx/prowler:latest

Schedule: [Weekly ▼]  Day: [Monday ▼]  Time: [06:00]
Cloud: [Azure ▼] (which connector to use)

Native ingest toggle: [Defender for Cloud ●──]  (if available)

CI webhook URL: https://your-opencnapp/api/ingest/prowler
[📋 Copy webhook URL]

[Save changes]  [Cancel]
```

**"CI-only" badge:** Shown on plugins where `ci_compatible: true` and configured as ingest-only.  
These cards show a different footer: "Webhook ingest active • Last ingest: 5m ago"

### 12.2 API endpoints:
```
GET  /api/plugins                           (list all with status)
POST /api/plugins/:id/enable
POST /api/plugins/:id/disable
POST /api/plugins/:id/trigger              (on-demand scan)
GET  /api/plugins/:id/status              (WebSocket or poll)
PUT  /api/plugins/:id/config              (update schedule, options)
GET  /api/plugins/:id/runs                (run history)
```

---

## 13. Connectors — Full Specification

**Route:** `/connectors`  
**File:** `dashboard/src/pages/Connectors.tsx`

### 13.1 Layout

```
Connectors
Connect cloud accounts, K8s clusters, and registries.

[+ Add Cloud ▼]  [+ Add Cluster]  [+ Add Registry]  [+ Add CI/CD Tool]

──── Cloud Accounts ────────────────────────────────

┌─────────────────────────────────────────────────────┐
│ [Azure icon] Microsoft Azure          [● Connected] │
│ Subscription: prod-subscription-abc123              │
│ Resources: 341    Last sync: 5m ago                 │
│                                                     │
│ [+] Defender for Cloud ingest: [●──] ON             │
│                                                     │
│ [Test connection]  [Edit]  [Delete]  [Sync now]     │
└─────────────────────────────────────────────────────┘

──── K8s Clusters ──────────────────────────────────

(empty: "No clusters — Add Cluster ►")

──── Container Registries ──────────────────────────

(empty: "No registries — Add Registry ►")

──── CI/CD Integrations ────────────────────────────

┌─────────────────────────────────────────────────────┐
│ [GitHub icon] GitHub Actions          [● Active]    │
│ Repos: 3    Last ingest: 2h ago                     │
│                                                     │
│ Webhook URL: https://opencnapp.local/api/ingest/    │
│              gitleaks  [📋]                          │
│                                                     │
│ Ingesting: Trivy ✓  Syft ✓  Gitleaks ✓             │
└─────────────────────────────────────────────────────┘
```

### 13.2 Add Cloud Wizard

```
Step 1: Choose provider
  [Azure]  [AWS]  [GCP]  [On-prem/VM]

Step 2: Enter credentials (dynamic per provider)

  AZURE:
  Display name: [My Production Azure]
  Subscription ID: [input]
  Tenant ID: [input]
  Auth method: [Service Principal ▼]  or  [Azure CLI (az login)]
    Service Principal:
      Client ID: [input]
      Client Secret: [password input]
  
  AWS:
  Display name: [My AWS Account]
  Auth method: [Access Keys ▼]  or  [IAM Role ARN]
    Access Keys:
      Access Key ID: [input]
      Secret Access Key: [password input]
      Region: [us-east-1]
  
  GCP:
  Display name: [My GCP Project]
  Project ID: [input]
  Service Account JSON: [file upload or paste]

Step 3: Test & optional native ingest
  [Testing...]
  → [✓ Connected — 341 resources found in 3 regions]
  
  Optional: Enable native security ingest
  [●──] Import findings from Defender for Cloud
  [●──] Import findings from Azure Sentinel
  
  [Save connector]  [Back]

Step 4: First scan
  [Run Prowler scan now (CSPM)]  [Schedule weekly]  [Skip]
```

### 13.3 API endpoints:
```
POST /api/connectors/test         (test without saving)
POST /api/connectors              (create connector)
GET  /api/connectors              (list all)
PUT  /api/connectors/:id          (update)
DELETE /api/connectors/:id        (delete)
POST /api/connectors/:id/sync     (trigger sync)
GET  /api/connectors/:id/resources (resource count)
```

---

## 14. Pentest Runner — Full Specification

**Route:** `/pentest`  
**File:** `dashboard/src/pages/PentestRunner.tsx`

### 14.1 Layout

```
Pentest Runner
Trigger authorized security scans against your infrastructure.

⚠ Active scanning tools may impact your systems. Always ensure you have authorization.

──── Available Tools ────────────────────────────────────────────────────────

┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│ [Terminal icon]     │ │ [Radar icon]        │ │ [Shield icon]       │
│ Nuclei              │ │ Nmap + Naabu        │ │ SSLyze              │
│ Web vulnerabilities │ │ Network port scan   │ │ TLS configuration   │
│ & CVE templates     │ │ & service detection │ │ & certificate check │
│                     │ │                     │ │                     │
│ Target: URL / IP    │ │ Target: IP / CIDR   │ │ Target: host:port   │
│ [Select ▶]          │ │ [Select ▶]          │ │ [Select ▶]          │
└────────────────────┘ └────────────────────┘ └────────────────────┘

┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│ [Bug icon]          │ │ [Network icon]      │ │ [Key icon]          │
│ kube-hunter         │ │ Nikto               │ │ CloudFox            │
│ K8s attack paths    │ │ Web server scan     │ │ Cloud attack surface│
│ (requires K8s)      │ │                     │ │ mapping             │
│                     │ │                     │ │                     │
│ Target: K8s API     │ │ Target: URL         │ │ Target: Cloud       │
│ [Select ▶]          │ │ [Select ▶]          │ │ [Select ▶]          │
└────────────────────┘ └────────────────────┘ └────────────────────┘
```

### 14.2 Scan Configuration Panel (appears when a tool is selected)

```
Configure Nuclei Scan

Target URL or IP: [https://app.example.com              ]
Templates: [cve ×] [misconfig ×] [exposure] + [add tag...]
Severity threshold: [Medium ▼] (only report findings at or above)
Rate limit: [150 requests/sec]

──── Authorization ────────────────────────────────────────────
⚠ Active scanning requires explicit authorization

☐ I confirm I am authorized to scan the target(s) listed above
   and take responsibility for any impact.

[Cancel]  [Start Scan ▶]  (button disabled until checkbox checked)
```

### 14.3 Active Scan View (after start)

```
Nuclei scan — app.example.com
Started: 12:34:21    Elapsed: 00:02:15

[████████████░░░░░░░░] 58%  Templates: 1,234 / 2,108

Log stream:
[12:34:22] Loading templates (cve, misconfig, exposure)...
[12:34:23] Starting scan against https://app.example.com
[12:34:35] [critical] CVE-2021-44228 Log4Shell detected on /api/search
[12:34:41] [high] Exposed admin panel at /admin
[12:36:10] [medium] Missing security headers

Findings so far: 3

[Stop scan]
```

### 14.4 Scan Results

After completion, results shown as a standard findings table (reuse FindingRow component).  
Findings are also saved to PostgreSQL with `domain=pentest`, `source=on_demand`.

### 14.5 Recent Scans Table

At bottom of page:

```
Tool         Target                  Started           Duration    Findings    Status
─────────────────────────────────────────────────────────────────────────────────────
Nuclei       app.example.com         2h ago            4m 12s      42          ✓ Done
Nmap         10.0.0.0/24             1d ago            8m 45s      3 ports     ✓ Done
SSLyze       api.example.com:443     7d ago            45s         1           ✓ Done
kube-hunter  aks-prod-cluster        3d ago            12m         2           ✓ Done

[Click row → view results]
```

---

## 15. Alerts — Full Specification

**Route:** `/alerts`  
**File:** `dashboard/src/pages/Alerts.tsx`

### 15.1 Layout

**Tabs:** [Live Feed]  [Alert Rules]  [Notification Channels]

### 15.2 Live Feed tab

**Filter bar:**
```
[Severity: All ▼]  [Cluster ▼]  [Namespace ▼]  [Tool ▼]  [Time range ▼]
[🔴 LIVE] indicator when WebSocket is connected
```

**Alert stream:**
Each alert row:
```
[🔴 CRITICAL]  12:34:21  Nginx - dev  |  kubernetes_default  |  shell spawned in container
               Falco: A shell was spawned in a container by user root in pod nginx-dev-abc123
               Cluster: aks-prod  Namespace: default  Pod: nginx-dev-abc123
               [▼ expand for details]
```

Colors: CRITICAL = red left border, HIGH = orange, MEDIUM = amber, LOW = green.  
New alerts slide in at the top with a subtle animation.

**WebSocket connection:**  
Connect to `ws://localhost:8000/ws/alerts` on page mount.  
Show "🔴 LIVE" indicator when connected.  
Show "⚠ Disconnected — reconnecting..." when connection drops.

### 15.3 Alert Rules tab

```
[+ New rule]

Rule: Notify Slack on CRITICAL findings
  Condition: severity = CRITICAL
  Source: any tool
  Action: Slack #security-alerts
  Status: [● Active]  [Edit]  [Delete]

Rule: Page on Duty for runtime alerts from Falco
  Condition: tool = falco AND severity >= HIGH
  Source: falco
  Action: PagerDuty
  Status: [● Active]  [Edit]  [Delete]
```

### 15.4 Notification Channels tab

```
[+ Add channel]

[Slack icon]  #security-alerts          [● Connected]  [Test]  [Edit]  [Delete]
Webhook: https://hooks.slack.com/...

[Teams icon]  Security Team channel     [● Connected]  [Test]  [Edit]  [Delete]
Webhook: https://...

[Mail icon]   security@company.com      [● Connected]  [Test]  [Edit]  [Delete]
```

---

## 16. Settings Page

**Route:** `/settings`  
**File:** `dashboard/src/pages/Settings.tsx`

**Tabs:** General | Users | API Keys | Notifications | Integrations

**General tab:**
- Organization name
- Default date range
- Default cloud filter
- Theme preference (Light / Dark / System)
- Timezone

**API Keys tab:**
- List API keys with name, created date, last used, permissions
- [Generate new key] button
- [Revoke] per key

**Integrations tab:**
- Jira integration (server URL + API token)
- ServiceNow integration
- PagerDuty integration

---

## 17. API Changes Required

### New FastAPI routes to add in `api/routes/dashboard.py`:

```python
# Risk score (0-100) calculated from finding severity distribution
GET /api/dashboard/risk-score?range=30d
→ { score: int, label: str, delta: int, breakdown: dict }

# Summary stats
GET /api/dashboard/summary?range=30d
→ { total: int, critical: int, high: int, medium: int, low: int, 
    open: int, clouds_detected: int, resources_scanned: int,
    last_scan_at: str, severity_breakdown: list }

# Findings trend (time series)
GET /api/dashboard/trend?days=7&severity=ALL&metric=findings
→ { data: [{ date: str, total: int, new: int }] }

# Findings grouped by domain
GET /api/dashboard/by-domain?range=30d
→ { data: [{ domain: str, count: int }] }

# Findings grouped by cloud provider
GET /api/dashboard/by-cloud?range=30d
→ { data: [{ provider: str, total: int, critical: int, high: int, medium: int, low: int }] }

# Top alerts
GET /api/dashboard/top-alerts?limit=10&range=30d
→ { data: [{ score: float, status: str, asset: str, asset_type: str, 
             account: str, provider: str, title: str }] }

# Alert inventory by category
GET /api/dashboard/alert-inventory?range=30d
→ { total: int, categories: [{ name: str, count: int }] }

# MITRE ATT&CK top techniques
GET /api/dashboard/mitre-top?limit=5&range=30d
→ { data: [{ technique: str, count: int }] }

# Dashboard widget layout
GET /api/dashboard/layout?type=unified&user=default
PUT /api/dashboard/layout  { type, layout: [...WidgetConfig] }

# Risk score calculation (pseudo-code):
# score = 100 - (critical * 10 + high * 3 + medium * 1 + low * 0.3) / max_possible * 100
# Clamp to 0-100
```

### New routes in `api/routes/inventory.py`:
```python
GET /api/inventory/clusters
GET /api/inventory/clusters/:id/namespaces
GET /api/inventory/namespaces
GET /api/inventory/images
GET /api/inventory/summary
POST /api/inventory/clusters  (onboard with token generation)
```

### New routes in `api/routes/attack_paths.py`:
```python
GET /api/attack-paths?page=1&limit=25&sort=impact_score_desc&group_by=impact_value
→ { total: int, groups: [{ label: str, count: int, items: [...AttackPath] }] }

GET /api/attack-paths/:id
→ { ...AttackPath with nodes, edges, story }

GET /api/attack-paths/summary
→ { high: int, medium: int, low: int, info: int, top3: [...] }
```

### New `dashboard_layouts` table:
```sql
-- Add to api/database/init.sql
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL DEFAULT 'default',
  dashboard_type VARCHAR(50) NOT NULL,
  dashboard_name VARCHAR(200),
  layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dashboard_type, dashboard_name)
);

-- Insert default unified layout
INSERT INTO dashboard_layouts (user_id, dashboard_type, dashboard_name, layout)
VALUES ('default', 'unified', 'Cloud Posture Overview', '[]')
ON CONFLICT DO NOTHING;
```

---

## 18. Risk Score Calculation

```python
# api/routes/dashboard.py
def calculate_risk_score(critical: int, high: int, medium: int, low: int) -> dict:
    """
    Weighted penalty system.
    Perfect score = 100. Findings reduce it.
    Critical findings are 10x more impactful than low.
    """
    if critical + high + medium + low == 0:
        return {"score": 100, "label": "Good", "delta": 0}
    
    penalty = (critical * 10) + (high * 3) + (medium * 1) + (low * 0.3)
    # Normalize: assume 100 criticals = score of 0
    max_penalty = 1000  # 100 criticals
    score = max(0, round(100 - (penalty / max_penalty * 100)))
    
    if score >= 80:
        label = "Good"
    elif score >= 50:
        label = "Fair"
    else:
        label = "Poor"
    
    return {"score": score, "label": label}
```

---

## 19. Empty States — Every Page

Never show blank space. Every data area that could be empty must have:

```typescript
// dashboard/src/components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}
```

**Specific empty states:**

| Page/Widget | Icon | Title | Description | CTA |
|---|---|---|---|---|
| Unified Dashboard (no data) | `Shield` | "No security data yet" | "Connect a cloud account or K8s cluster to start monitoring." | "Add Cloud" |
| Findings table (0 results) | `Search` | "No findings match your filters" | "Try adjusting filters or broadening your search." | "Clear filters" |
| Attack Paths (none) | `GitBranch` | "No attack paths found" | "Attack paths appear after running scans with connected clouds." | "Run scan" |
| Inventory Clusters (empty) | `Server` | "No clusters connected" | "Onboard a Kubernetes cluster to see workload inventory." | "Onboard Cluster" |
| Compliance (no data) | `CheckSquare` | "No compliance data" | "Run a CSPM scan to map findings to compliance frameworks." | "Run Prowler" |
| Alerts feed (no alerts) | `Bell` | "No alerts" | "No runtime alerts in the selected time range." | none |
| Plugin Manager (no runs) | `Play` | "No scan history" | "Enable plugins and run scans to see results here." | "Enable plugins" |

---

## 20. Implementation Order — Phase by Phase

### Phase 1 — Foundation (Week 1) — DO THIS FIRST
**Goal:** App loads, looks professional, navigation works.  
**Files to create/modify:**
1. Install all npm packages (shadcn/ui init + all add commands)
2. `dashboard/src/styles/tokens.css` — complete design token file
3. `dashboard/src/store/index.ts` — Zustand store
4. `dashboard/src/layout/AppShell.tsx`
5. `dashboard/src/layout/Sidebar.tsx` — exact nav from Section 5
6. `dashboard/src/layout/Topbar.tsx` — exact topbar from Section 5
7. `dashboard/src/components/ui/SeverityBadge.tsx`
8. `dashboard/src/components/ui/CloudBadge.tsx`
9. `dashboard/src/components/ui/DomainBadge.tsx`
10. `dashboard/src/components/ui/EmptyState.tsx`
11. `dashboard/src/components/ui/StatCard.tsx`
12. `dashboard/src/App.tsx` — all routes from Section 4
13. Light theme CSS as default, dark theme toggled by `[data-theme="dark"]` on `<html>`

**Validation:**  
- `docker compose up --build` → app loads at localhost:3000
- Sidebar shows all nav items with icons
- Topbar shows search + Add Cloud/Cluster/Registry buttons
- Theme toggle works

### Phase 2 — Connectors + Inventory (Week 1–2)
**Goal:** Users can add cloud accounts and clusters.  
**Files:**
1. `api/routes/connectors.py` — update with `/api/connectors/test`
2. `dashboard/src/pages/Connectors.tsx` — cards + wizards
3. `dashboard/src/components/connectors/AddCloudWizard.tsx`
4. `dashboard/src/components/connectors/AddClusterWizard.tsx`
5. `dashboard/src/components/connectors/AddRegistryModal.tsx`
6. `api/routes/inventory.py` — new routes
7. `dashboard/src/pages/Inventory.tsx` — tabs

**Validation:**
- Can add Azure connector with credentials
- Test connection shows resource count
- Inventory page loads (empty state shown)

### Phase 3 — Unified Dashboard + Widgets (Week 2–3)
**Goal:** Dashboard looks like a real CNAPP product with all widgets.  
**Files:**
1. `api/routes/dashboard.py` — all new aggregation endpoints from Section 17
2. `dashboard/src/widgets/registry.ts` — widget registry
3. `dashboard/src/pages/UnifiedDashboard.tsx`
4. All widget components (one file each):
   - `dashboard/src/widgets/RiskScoreGaugeWidget.tsx`
   - `dashboard/src/widgets/FindingsByCloudWidget.tsx`
   - `dashboard/src/widgets/FindingsTrendWidget.tsx`
   - `dashboard/src/widgets/SeverityDonutWidget.tsx`
   - `dashboard/src/widgets/TopAlertsWidget.tsx`
   - `dashboard/src/widgets/AlertInventoryWidget.tsx`
   - `dashboard/src/widgets/ComplianceOverviewWidget.tsx`
   - `dashboard/src/widgets/TopMitreAttackWidget.tsx`
   - `dashboard/src/widgets/AccountsWidget.tsx`
   - `dashboard/src/widgets/AssetInventoryWidget.tsx`
   - `dashboard/src/widgets/ImageRiskWidget.tsx`
   - `dashboard/src/widgets/NamespaceSeverityWidget.tsx`
   - `dashboard/src/widgets/RemediationTrackerWidget.tsx`
   - `dashboard/src/widgets/AttackPathSummaryWidget.tsx`
5. `dashboard/src/components/DashboardGrid.tsx` — CSS grid container
6. `dashboard/src/components/AddWidgetModal.tsx` — widget catalogue modal
7. `api/database/init.sql` — add `dashboard_layouts` table
8. `dashboard/src/pages/DomainDashboard.tsx`

**Validation:**
- Dashboard loads with all widgets
- Empty states show properly when no data
- Widgets show real data when findings exist in DB
- "Add Widget" modal opens, shows catalogue, adding widget updates grid
- Domain tabs switch dashboard

### Phase 4 — Findings + Compliance + Plugin Manager (Week 3–4)
**Files:**
1. `dashboard/src/pages/Findings.tsx` — full rewrite with TanStack Table
2. `dashboard/src/components/findings/FindingDrawer.tsx` — slide-in detail
3. `dashboard/src/pages/Compliance.tsx` — framework heatmap
4. `dashboard/src/components/compliance/ComplianceHeatmap.tsx` — D3 grid
5. `dashboard/src/pages/PluginManager.tsx` — card grid rewrite
6. `dashboard/src/components/plugins/PluginCard.tsx`
7. `dashboard/src/components/plugins/PluginConfigDrawer.tsx`
8. `api/routes/compliance.py` — heatmap endpoints
9. `api/routes/plugins.py` — run history, status

**Validation:**
- Findings table filters/sorts/paginates correctly
- Click row → drawer slides in with full detail
- Compliance heatmap renders (even with placeholder data)
- Plugin cards show proper status, "Run now" works

### Phase 5 — Attack Paths + Pentest + Alerts (Week 4–5)
**Files:**
1. `dashboard/src/pages/AttackPaths.tsx` — list page
2. `dashboard/src/pages/AttackPathDetail.tsx` — detail + flow diagram
3. `dashboard/src/components/attack-paths/AttackFlowDiagram.tsx` — D3 horizontal flow
4. `dashboard/src/components/attack-paths/AssetGraph.tsx` — D3 force mini-graph
5. `dashboard/src/components/attack-paths/NodeDetailPanel.tsx` — slide-in panel
6. `api/routes/attack_paths.py` — list + detail endpoints
7. `dashboard/src/pages/PentestRunner.tsx` — full rewrite
8. `dashboard/src/components/pentest/ScanConfigPanel.tsx`
9. `dashboard/src/components/pentest/ScanProgressView.tsx`
10. `dashboard/src/pages/Alerts.tsx` — live feed + rules
11. `dashboard/src/components/alerts/AlertRuleForm.tsx`
12. `dashboard/src/components/alerts/NotificationChannelCard.tsx`

**Validation:**
- Attack path list loads and groups by impact
- Click path → detail page shows horizontal flow diagram
- Click node → side panel shows asset info + mini graph
- Pentest runner shows tool cards, scan progress works
- Alerts feed shows live events via WebSocket

---

## 21. Seed Data for Development

**File:** `api/scripts/seed_data.py`

To test the dashboard without real cloud accounts, create realistic seed data:

```python
# Run: python api/scripts/seed_data.py
# Creates:
# - 2 cloud connectors (Azure + AWS)
# - 1 K8s cluster connector
# - 500 findings across all severity levels and domains
# - 50 attack paths with nodes and edges
# - 30 days of trend data
# - Compliance mappings for CIS, NIST, PCI-DSS
# - 100 Falco alert events
# - 10 pentest scan results

SAMPLE_FINDINGS = [
    {
        "tool": "prowler",
        "domain": "cspm",
        "severity": "CRITICAL",
        "cloud_provider": "azure",
        "resource_type": "storage_account",
        "resource_id": "/subscriptions/abc/storageAccounts/mystore",
        "resource_name": "mystore",
        "title": "Storage account allows public blob access",
        "description": "...",
        "remediation": "...",
        "compliance_tags": ["cis-azure-1.4", "pci-dss-3.2"],
        "status": "open",
        "scanned_at": "2026-04-01T10:00:00Z",
    },
    # ... 499 more
]
```

Run seed: `docker compose exec api python scripts/seed_data.py`

---

## 22. Docker Compose — No Changes Required

The existing `docker-compose.yml` is correct. Only ensure:
- `api` service exposes port 8000
- `ui` (dashboard) service exposes port 3000 (mapped from Vite's 5173)
- `db` (postgres) exposes port 5432
- `redis` exposes port 6379
- All services share the same network

Add health check to `api`:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## 23. Validation Checklist

Run these checks after completing each phase:

```bash
# Phase 1
docker compose up --build
curl http://localhost:8000/health                    # → {"status":"ok"}
# Browser: localhost:3000 → loads without console errors
# Browser: sidebar has all nav items with icons
# Browser: theme toggle switches light/dark

# Phase 2  
curl -X POST http://localhost:8000/api/connectors/test \
  -H "Content-Type: application/json" \
  -d '{"provider":"azure","subscription_id":"fake","tenant_id":"fake","client_id":"fake","client_secret":"fake"}'
# → should return auth error (not 500)

# Phase 3 (after seeding data)
python api/scripts/seed_data.py
curl http://localhost:8000/api/dashboard/summary?range=30d
# → {"total":500,"critical":50,"high":150,...}
# Browser: dashboard shows real numbers in all widgets

# Phase 4
curl "http://localhost:8000/api/findings?severity=CRITICAL&page=1&limit=25"
# → paginated findings list
# Browser: Findings table filters work

# Phase 5
curl http://localhost:8000/api/attack-paths?page=1
# → grouped attack paths list
```

---

## 24. Common Mistakes — Do Not Do These

1. **Do NOT show `null` or `undefined` in the UI.** Always use optional chaining + fallback values.
2. **Do NOT make API calls inside render functions.** All data fetching via TanStack Query hooks.
3. **Do NOT use `any` TypeScript type.** Define proper interfaces for all API responses.
4. **Do NOT hardcode colors.** Always use CSS custom properties from tokens.
5. **Do NOT build charts that don't have an empty state.** Every Recharts chart needs `if (!data || data.length === 0) return <EmptyState />`.
6. **Do NOT create a new HTTP client.** Use the existing `dashboard/src/api/client.ts`.
7. **Do NOT forget `ResponsiveContainer`** wrapping every Recharts chart.
8. **Do NOT skip loading states.** Every data-fetching component shows a skeleton while loading.
9. **Do NOT put business logic in components.** All API aggregation happens in `api/routes/`, not in the browser.
10. **Do NOT mix the D3 force simulation (attack graph) with Recharts.** They serve different purposes. D3 only for attack paths.

---

## 25. File Creation Summary

New files to create (do not modify existing ones unless necessary):

```
dashboard/src/
├── styles/tokens.css                         [Phase 1]
├── store/index.ts                            [Phase 1]
├── config/domainDashboards.ts               [Phase 3]
├── layout/
│   ├── AppShell.tsx                          [Phase 1]
│   ├── Sidebar.tsx                           [Phase 1]
│   └── Topbar.tsx                            [Phase 1]
├── components/
│   ├── ui/
│   │   ├── SeverityBadge.tsx                 [Phase 1]
│   │   ├── CloudBadge.tsx                    [Phase 1]
│   │   ├── DomainBadge.tsx                   [Phase 1]
│   │   ├── EmptyState.tsx                    [Phase 1]
│   │   ├── StatCard.tsx                      [Phase 1]
│   │   └── Skeleton.tsx                      [Phase 1]
│   ├── DashboardGrid.tsx                     [Phase 3]
│   ├── AddWidgetModal.tsx                    [Phase 3]
│   ├── connectors/
│   │   ├── AddCloudWizard.tsx                [Phase 2]
│   │   ├── AddClusterWizard.tsx              [Phase 2]
│   │   └── AddRegistryModal.tsx              [Phase 2]
│   ├── findings/
│   │   └── FindingDrawer.tsx                 [Phase 4]
│   ├── compliance/
│   │   └── ComplianceHeatmap.tsx             [Phase 4]
│   ├── plugins/
│   │   ├── PluginCard.tsx                    [Phase 4]
│   │   └── PluginConfigDrawer.tsx            [Phase 4]
│   ├── attack-paths/
│   │   ├── AttackFlowDiagram.tsx             [Phase 5]
│   │   ├── AssetGraph.tsx                    [Phase 5]
│   │   └── NodeDetailPanel.tsx               [Phase 5]
│   ├── pentest/
│   │   ├── ScanConfigPanel.tsx               [Phase 5]
│   │   └── ScanProgressView.tsx              [Phase 5]
│   └── alerts/
│       ├── AlertRuleForm.tsx                 [Phase 5]
│       └── NotificationChannelCard.tsx       [Phase 5]
├── widgets/
│   ├── registry.ts                           [Phase 3]
│   ├── RiskScoreGaugeWidget.tsx              [Phase 3]
│   ├── FindingsByCloudWidget.tsx             [Phase 3]
│   ├── FindingsTrendWidget.tsx               [Phase 3]
│   ├── SeverityDonutWidget.tsx               [Phase 3]
│   ├── TopAlertsWidget.tsx                   [Phase 3]
│   ├── AlertInventoryWidget.tsx              [Phase 3]
│   ├── ComplianceOverviewWidget.tsx          [Phase 3]
│   ├── TopMitreAttackWidget.tsx              [Phase 3]
│   ├── AccountsWidget.tsx                    [Phase 3]
│   ├── AssetInventoryWidget.tsx              [Phase 3]
│   ├── ImageRiskWidget.tsx                   [Phase 3]
│   ├── NamespaceSeverityWidget.tsx           [Phase 3]
│   ├── RemediationTrackerWidget.tsx          [Phase 3]
│   ├── AttackPathSummaryWidget.tsx           [Phase 3]
│   ├── SecretsSummaryWidget.tsx              [Phase 3]
│   ├── IaCMisconfigWidget.tsx                [Phase 3]
│   └── NewCriticalTrendWidget.tsx            [Phase 3]
└── pages/
    ├── UnifiedDashboard.tsx                  [Phase 3]
    ├── DomainDashboard.tsx                   [Phase 3]
    ├── Findings.tsx                          [Phase 4 — rewrite]
    ├── Inventory.tsx                         [Phase 2]
    ├── AttackPaths.tsx                       [Phase 5 — rewrite]
    ├── AttackPathDetail.tsx                  [Phase 5]
    ├── PentestRunner.tsx                     [Phase 5 — rewrite]
    ├── PluginManager.tsx                     [Phase 4 — rewrite]
    ├── Connectors.tsx                        [Phase 2 — rewrite]
    ├── Alerts.tsx                            [Phase 5 — rewrite]
    ├── Compliance.tsx                        [Phase 4 — rewrite]
    └── Settings.tsx                          [Phase 5]

api/
├── routes/
│   └── dashboard.py                         [Phase 3 — add new endpoints]
├── database/
│   └── migrations/
│       └── 001_dashboard_layouts.sql        [Phase 3]
└── scripts/
    └── seed_data.py                         [Phase 3]
```

---

*End of specification. Total estimated implementation: 5 weeks (1 developer) or 2–3 weeks (2 developers).*  
*Start with Phase 1. Do not skip phases. Each phase builds on the previous.*
