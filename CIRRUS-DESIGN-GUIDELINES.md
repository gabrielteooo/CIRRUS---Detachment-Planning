# CIRRUS — Design & App Shell Guidelines

Reference document for building **new CIRRUS modules** that visually and structurally match the **Detachment Planning** prototype in this repo.

Use this when wiring Figma designs into a clickable React prototype so another agent (or repo) can reuse the same FMS shell, tokens, and component patterns.

---

## 1. Tech stack (match exactly)

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| UI library | **Ant Design 5** (`antd` ^5.24) |
| Icons | `@ant-design/icons` ^5.6 |
| Routing | `react-router-dom` ^7 |
| Dates | `dayjs` — format as `D MMM YYYY` (e.g. `5 Jan 2026`) |
| Font | **Inter** (400, 500, 600) via Google Fonts |

Do **not** introduce Tailwind, MUI, or another component library unless the whole app is migrating.

---

## 2. Brand colour system

### Primary (teal — FMS / CIRRUS brand)

| Token | Hex | Usage |
|-------|-----|--------|
| Primary | `#00636A` | Primary buttons, links, tab ink bar, selected menu item, avatar |
| Primary hover | `#004F55` | Button/link hover |
| Primary active | `#003B40` | Button/link active |
| Select selected bg | `#C7EBEA` | Dropdown option selected state |

### Neutrals

| Token | Hex | Usage |
|-------|-----|--------|
| Page background | Ant `colorBgLayout` (default ~`#F5F5F5`) | Main content area |
| Surface / card | `#FFFFFF` | Cards, tab panels, header |
| Border light | `#F0F0F0` | Table containers, section borders |
| Border default | `#E8E8E8` / `#E2E2E2` | KPI cards, header divider |
| Border control | `#D9D9D9` | Inputs, tags |
| Text primary | `rgba(0,0,0,0.88)` | Headings, body |
| Text secondary | `rgba(0,0,0,0.65)` | Labels, breadcrumbs meta |
| Text tertiary | `rgba(0,0,0,0.45)` | Icons, disabled, muted |

### Semantic colours

| Meaning | Background | Border | Text / accent |
|---------|------------|--------|----------------|
| **Shortfall / error** | `#FFF2F0` / `#FFF1F0` | `#FFCCC7` | `#CF1322` |
| **Deviation / warning** | `#FFFBE6` / `#FFF7E6` | `#FFE58F` / `#FFD591` | `#D48806` |
| **Success / approved** | Ant `success` tag | — | — |
| **Info panel (sign-off)** | `#F5F8F8` | `#D9E8E9` | — |

### Fill rate colour (KPI)

- ≥ 90% → green (`#52c41a` area)
- 70–89% → amber
- &lt; 70% → red

---

## 3. Typography

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Page title | `Typography.Title level={3}` | 600 | In page header, `margin: 0` |
| Section title | `level={4}` or `level={5}` | 600 | Inside cards/sections |
| Table header | 14px | 500 (Medium) | Ant table default |
| Body / table cell | 16px | 400 | Line height 24px |
| KPI value | 32px | 700 | `.kpi-card-value`, `.kpi-statistic` |
| KPI label | 14px | 600 | `.kpi-card-title` |
| Uppercase labels | 12px | 500–600 | Letter-spacing 0.03–0.04em |
| Link button | 13px | 500 | “View more” on insight cards |

Date format everywhere: **`D MMM YYYY`** via `dayjs` (not `MM/DD/YYYY`).

---

## 4. App shell

Every CIRRUS module page renders inside a shared **`AppShell`** layout.

### 4.1 Layout structure

```
┌─────────────────────────────────────────────────────────────┐
│ Sider (280px)          │ PageHeader (white bar, full width) │
│ ─────────────────      ├──────────────────────────────────│
│ Logo + search          │ Breadcrumb    🔔 ? 👤 Avatar       │
│ Nav menu               │ ← Back   Page Title    Data sync  │
│                        ├──────────────────────────────────│
│ (footer: logout,       │ Content (padding: 0 40px 40px)   │
│  collapse)             │   <Outlet /> — your module       │
└────────────────────────┴──────────────────────────────────┘
```

### 4.2 Sidebar (dark)

| Property | Value |
|----------|--------|
| Width expanded | **280px** |
| Width collapsed | **80px** |
| Background | `#191B1E` |
| Selected item bg | `#00636A` |
| Submenu bg | `#000000` |
| Logo | `/fms-logo.svg` (35×40) + “Fleet Management System” (16px, white) |
| Search input bg | `#21242A`, border `rgba(255,255,255,0.45)` |
| Menu item height | **48px** |
| Footer | Top border `rgba(255,255,255,0.12)`, Log Out + Collapse Menu |

### 4.3 Sidebar navigation (CIRRUS group)

Under **CIRRUS** submenu (all modules should register here):

- Inventory Health
- Critical Spares
- Demand & Fulfilment
- Purchase Tracking
- **Detachment Planning** ← this repo
- *(your new module)*

Top-level items:

- **Home** → default landing
- **CIRRUS** → expandable submenu
- **System Configurations** → shared config area

### 4.4 Page header (white bar)

| Property | Value |
|----------|--------|
| Background | `#FFFFFF` |
| Border bottom | `1px solid #E2E2E2` |
| Shadow | `0 1px 2px rgba(0,0,0,0.04)` |
| Padding | `24px 40px` |
| Margin below | `24px` |

**Row 1:** Breadcrumb (starts with Home icon link) · right: Bell, Help, Avatar (32px, bg `#00636A`, user initials)

**Row 2:** Optional back button (32×32 text button, `ArrowLeftOutlined`) + **page title** · right: “Data last retrieved on **{timestamp}**” (secondary text)

Breadcrumb pattern: `Home > CIRRUS > {Module} > {Detail}` or `Home > System Configurations > …`

### 4.5 Content area

- Background: layout token (`colorBgLayout`)
- Horizontal padding: **40px** (matches header)
- Bottom padding: **40px**

---

## 5. Ant Design theme config

Copy this `ConfigProvider` theme when bootstrapping a sibling repo:

```tsx
const PRIMARY = '#00636A';

const theme = {
  token: {
    colorPrimary: PRIMARY,
    colorLink: PRIMARY,
    colorLinkHover: '#004f55',
    colorLinkActive: '#003b40',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  components: {
    Button: {
      colorPrimary: PRIMARY,
      colorPrimaryHover: '#004f55',
      colorPrimaryActive: '#003b40',
    },
    Select: {
      optionSelectedBg: '#C7EBEA',
    },
    Tabs: {
      inkBarColor: PRIMARY,
      itemSelectedColor: PRIMARY,
      itemHoverColor: PRIMARY,
    },
    Checkbox: { colorPrimary: PRIMARY, colorPrimaryHover: '#004f55' },
    Radio: { colorPrimary: PRIMARY },
  },
};
```

Wrap app in:

```tsx
<ConfigProvider theme={theme}>
  <AntApp message={{ top: 24, maxCount: 3 }}>
    {/* routes */}
  </AntApp>
</ConfigProvider>
```

Import global CSS once in `main.tsx`:

```tsx
import './styles/global.css';
```

---

## 6. Page patterns

### 6.1 List / hub page

- Optional intro: `Typography.Paragraph type="secondary"` with `marginBottom: 24`
- Filters: `Space` with `Input` (search icon prefix), `Select` filters, primary `Button` with `PlusOutlined` for create actions
- Content: **card grid** (`Row`/`Col` gutter 16–24) or **Tabs** (e.g. Open / Past)
- Cards: Ant `Card hoverable`, title 16px strong, status `Tag` top-right

### 6.2 Detail page

Vertical stack with **`gap: 8px`** (`.plan-details-content`):

1. **KPI strip** (optional) — `Row gutter={16}`, 4 equal columns
2. **Summary collapses** (shortfall / deviation) — coloured headers
3. **Main tabs** — white panel with border (see §7.4)

### 6.3 System configuration hub

- Grid of hoverable cards with icon tile, `Title level={4}`, secondary description
- Card class: `.system-config-card`

---

## 7. Component recipes

### 7.1 KPI cards

```tsx
<Card className="kpi-card" style={{ height: '100%' }}>
  <Statistic title="Fill rate" value={92} suffix="%" className="kpi-statistic" />
</Card>
```

Insight variant (count + link):

```tsx
<Card className="kpi-card kpi-insight-card">
  <Typography.Text strong className="kpi-card-title">Cannibalised LRU</Typography.Text>
  <Typography.Text className="kpi-card-value">{count}</Typography.Text>
  <Button type="link" className="kpi-insight-link">View more</Button>
</Card>
```

Card chrome: `border: 1px solid #E8E8E8`, `border-radius: 10px`, body padding `16px 18px`.

### 7.2 Data tables

**Always wrap tables:**

```tsx
<div className="detachment-table-container">
  <Table
    size="small"
    pagination={false}
    tableLayout="fixed"
    scroll={{ x: computedMinWidth }}
    /* columns, dataSource */
  />
</div>
```

Container: `border: 1px solid #F0F0F0`, `border-radius: 4px`, horizontal scroll.

**Standard column widths** (align across tables in a module):

| Column | Width (px) |
|--------|------------|
| NSN | 120 |
| MPN | 120 |
| Description | 260 |
| Qty | 88 |
| UOM | 70 |
| Status | 110 |
| Action | 160 |

**NSN links:** `Button type="link"` with classes `nsn-link` — underlined, font-weight 600, colour primary.

**Shortfall delta cell:** class `shortfall-delta-cell` — red tint bg, bold red text.

**Deviation delta cell:** class `deviation-delta-cell` — yellow tint bg, bold amber text.

**Toolbar above table:** flex row, gap 12px — search/filter left, actions right. Optional 32×32 icon button for column customise (`.customize-columns-button`).

### 7.3 Tabs (main content)

```tsx
<div className="plan-details-tabs">
  <Tabs items={[...]} />
</div>
```

Panel: white bg, `border: 1px solid #F0F0F0`, `border-radius: 8px`, padding `16px 20px 20px`. Tab nav `margin-bottom: 16px`.

For nested category tabs (e.g. LRU / POL): `.lseries-category-tabs` with tighter nav margin.

### 7.4 Modals

| Type | Typical width | Notes |
|------|---------------|-------|
| Confirm / simple | 520px | Standard Ant default |
| KPI insight (table) | 720–800px | class `kpi-insight-modal`, table in bordered 8px radius wrapper |
| NSN drilldown | **1120px** | class `nsn-drilldown-modal`, tabs inside, `footer={null}` |
| Remarks | ~520px | Text area form |

Modal table container (drilldown): `.nsn-drilldown-table-container` — border `#F0F0F0`, radius **8px**.

**Copyable cell** (PR/PO/Airway Bill):

```tsx
<span className="nsn-drilldown-copy-cell">
  <span>{value}</span>
  <Button type="text" size="small" className="nsn-drilldown-copy-btn" icon={<CopyOutlined />} />
</span>
```

### 7.5 Drawers (edit flows)

- Width: typically **480–720px** depending on form complexity
- Title: entity identifier (NSN) as secondary line above
- Footer: Cancel (default) + Save (primary) — Add NSN drawer uses grey footer bar (`.add-nsn-drawer .ant-drawer-footer`: bg `#FAFAFA`)

**Edit line drawer patterns:**

- Status tag at top: `.edit-line-status-tag` (16px, bold, padded)
- Qty comparison row: 3-column grid `.edit-line-qty-row` with cells `.edit-line-qty-cell`; warning state `.edit-line-qty-cell--warning`
- Section labels: uppercase 12px `.edit-line-qty-row-label`

### 7.6 Status tags

| Context | Style |
|---------|--------|
| Plan status | Ant `Tag color="default" \| "processing" \| "success"` |
| New buy (drilldown) | `.new-buy-status-tag` — bg `#FFFBE6`, border `#FFE58F` |
| Repair (drilldown) | `.repair-status-tag` — bg `#FFF7E6`, border `#FFD591` |
| Approval pack | `.approval-status-tag` — neutral grey |
| Platform / variant | Default Ant tags in `Space`, no custom colour |

### 7.7 Summary collapses (shortfall / deviation)

- Shortfall: `.summary-collapse-shortfall` — header bg `#FFF2F0`, left bar 4px `#CF1322`
- Deviation: `.summary-collapse-deviation` — header bg `#FFFBE6`, left bar 4px `#D48806`
- Header padding: `14px 16px`, radius 8px

### 7.8 Toasts / messages

Success toasts use **dark style** (not default Ant green-on-white):

```tsx
message.success({ content: '...', className: 'fms-dark-message' });
```

Dark toast: bg `#191B1E`, white text, radius 8px, success icon green. Defer show with `setTimeout(0)` when closing a drawer/modal first.

### 7.9 Buttons

| Type | Usage |
|------|--------|
| Primary | Main CTAs — Create, Save, Submit |
| Default | Cancel, secondary actions |
| Link | In-table actions, “View more”, NSN links |
| Text | Back arrow, icon-only copy |
| Danger | Delete/remove (sparingly) |

Primary colour overrides in CSS ensure `#00636A` even if theme token drifts.

---

## 8. Spacing & radius cheat sheet

| Element | Radius | Padding / gap |
|---------|--------|----------------|
| KPI card | 10px | 16–18px |
| Section / tab panel | 8px | 16–20px |
| Table container | 4px (detachment) / 8px (drilldown/modal) | — |
| Category selector cards | 8px | 12–14px |
| Sign-off bar | 8px | 16–18px |
| Page sections vertical gap | — | 16–24px |
| KPI row gutter | — | 16px |
| Card grid gutter | — | 16–24px |

---

## 9. Routing conventions

- All module routes nest under `<Route element={<AppShell />}>`
- Use **path segments**, not query strings, for primary navigation
- Hash router optional for offline HTML export (`VITE_HASH_ROUTER=true`)
- Default redirect `/` → primary module list

Example (this repo):

```
/detachment-planning
/detachment-planning/:detachmentId
/system-configurations
/system-configurations/l-series
/system-configurations/l-series/:lSeriesId
```

New module example:

```
/inventory-health
/inventory-health/:itemId
```

---

## 10. CSS class reference (copy into global.css)

Minimum set for visual parity:

| Class | Purpose |
|-------|---------|
| `.app-shell-sider` | Dark sidebar shell |
| `.app-shell-menu` | Nav menu styling |
| `.kpi-card`, `.kpi-insight-card` | KPI strip |
| `.plan-details-tabs` | Main tabbed panel |
| `.detachment-table-container` | Standard data table wrapper |
| `.nsn-link`, `.available-qty-link` | Underlined link cells |
| `.shortfall-delta-cell`, `.deviation-delta-cell` | Semantic table cells |
| `.summary-collapse-shortfall`, `.summary-collapse-deviation` | Alert collapses |
| `.nsn-drilldown-modal`, `.nsn-drilldown-table-container` | Drilldown modals |
| `.fms-dark-message` | Dark success toasts |
| `.edit-line-*` | Edit drawer layout |
| `.add-nsn-drawer` | Drawer footer bar |

Full definitions live in **`src/styles/global.css`** in this repo — prefer copying relevant blocks over re-deriving from Figma.

---

## 11. Figma → code checklist (for agents)

When implementing a Figma screen in a new module:

1. **Use AppShell + PageHeader** — do not rebuild sidebar/header from scratch.
2. **Apply Ant Design theme** from §5 — primary teal, Inter font.
3. **Match table wrapper** — `.detachment-table-container`, `size="small"`, `tableLayout="fixed"`.
4. **Match spacing** — content padding 40px; section gaps 16–24px.
5. **Use semantic colours** for shortfall/deviation/warning — do not invent new reds/ambers.
6. **Tags** — use Ant Tag + existing CSS classes, not raw coloured divs.
7. **Dates** — `D MMM YYYY`.
8. **Links** — primary teal, underline for data links (NSN, quantities).
9. **Modals** — `footer={null}` for read-only drilldowns; table inside bordered container.
10. **Do not use Tailwind** from Figma MCP output verbatim — translate to Ant Design + global.css.

---

## 12. Reference files in this repo

| Area | Path |
|------|------|
| App shell | `src/components/layout/AppShell.tsx` |
| Page header | `src/components/layout/PageHeader.tsx` |
| Theme + routes | `src/App.tsx` |
| Global styles | `src/styles/global.css` |
| Table columns | `src/components/details/nsnTableColumns.tsx` |
| KPI strip | `src/components/details/KpiStrip.tsx` |
| NSN drilldown modal | `src/components/details/NsnDrilldownModal.tsx` |
| Edit drawer | `src/components/details/EditLineDrawer.tsx` |
| List page pattern | `src/pages/PlanListPage.tsx` |
| Config hub pattern | `src/pages/SystemConfigPage.tsx` |

---

## 13. Integrating a sibling module

If the new module lives in a **separate repo** but should feel like one app:

1. Copy §5 theme + `global.css` (at least shell, KPI, table, tag, toast blocks).
2. Copy `AppShell.tsx` and `PageHeader.tsx`; add your module to `CIRRUS_ITEMS` and routes.
3. Reuse the same logo asset (`public/fms-logo.svg`).
4. Keep **page header breadcrumb** consistent: `Home > CIRRUS > {Your Module}`.
5. For a unified prototype later, merge routes under one `App.tsx` or use a monorepo shared `packages/ui-shell`.

---

*Generated from the CIRRUS Detachment Planning module (FMS Air Force). Update this file when shell or token decisions change.*
