# CIRRUS Detachment Planning — Product Knowledge Base

Use this document as agent context when building or extending the Detachment Planning module inside the **Fleet Management System (FMS)** app shell. It describes **what the product is**, **who it serves**, **how the process works**, and **what screens and data exist** — not how to implement UI components.

**Figma (app shell):** [FMS Airforce — CIRRUS](https://www.figma.com/design/9cXBV6SVaCrYAir1LSmsmW/FMS-Airforce---CIRRUS?node-id=4301-58432)

**L-series source template:** `public/templates/Template-L-series.xlsx` (from user Excel `Template - L-series.xlsx`)

---

## 1. Product context

| Item | Detail |
|------|--------|
| **Module** | CIRRUS → Detachment Planning |
| **Organisation** | Air Force |
| **Parent app** | Fleet Management System (FMS) |
| **Problem** | Planners must build a defensible spare-parts plan for a detachment exercise: L-series demand vs real inventory (main + alternates), shortfalls, deviations, and offline-approved resolutions — in one traceable place instead of Excel. |
| **Prototype stack** | React + TypeScript + Vite (mock data, no backend) |

---

## 2. Users and roles

| Role | Scope | Permissions |
|------|--------|-------------|
| **Detachment Planner** | Own plans only | Full create/edit on open plans |
| **Detachment Director** | All unit plans | Read-only on all plans |
| **Approver** | Offline only | Does not log in; planner records approvals in-app after face-to-face review |

**Prototype role switcher:** Toggle “View as: Planner” / “View as: Director” for demo.

**Default prototype users:**
- Planner: John Doe (`planner-1`, initials `JD`)
- Director: Sarah Chen (`director-1`, initials `SC`)

---

## 3. To-be process

```
Create Detachment
  → Insert parameters (platform, variant, L-series, flying hours / aircraft count, dates)
  → Generate detachment plan (L-series lines + inventory overlay)
  → Identify shortfall (available < required)
  → Indicate deviation (to-bring qty ≠ required qty)
  → Present to approving officer offline
  → Record approval in app
  → Proceed on resolution
```

**Digital scope:** Steps through recording approval happen in-app. Presenting and getting sign-off happen **offline** (meeting). There is **no automated approver workflow** in v1 — planner checks “offline approval recorded” after the meeting.

**Terminology:** Use **Deviation** (not “variation”).

---

## 4. Plan parameters

Set at create time; **editable later** while plan is open (Edit parameters — planned, not fully built in prototype).

| Field | F-16 | CH-47 |
|-------|------|-------|
| **Platform** | F-16 | CH-47 |
| **Variant** | Multi-select: C, D, D+ | Multi-select: D, F |
| **L-series version** | e.g. `L-F16-2026-TEMPLATE` | e.g. `L-CH47-2026-TEMPLATE` |
| **Mission parameter** | Flying hours (100 / 200 / 300 / 400) | Aircraft count (2 / 4 / 6 / 8) |
| **Need-by-date** | Date spares must be ready | Same |
| **Detachment date** | Exercise start | Same |
| **Plan remarks** | Optional context for approvers | Same |

**Create modal layout (product spec):**
- Row 1: Platform | L-series version
- Row 2: Variant (multi) | Flying hours (F-16, step 100) or Aircraft count (CH-47 select)
- Row 3: Need-by-date | Detachment date

Each detachment plan is **one-off** (not versioned v2/v3), but parameters may be amended while monitoring approval status.

---

## 5. L-series template

An **L-series** is the baseline list of spares required for a detachment, driven by platform + parameter tier.

**Source:** Excel template with sheets **F16** and **CH47**.

| Platform | Components | Qty tiers |
|----------|------------|-----------|
| F-16 | 17 lines (NSN, MPN, description) | 100 / 200 / 300 / 400 flying hrs |
| CH-47 | 18 lines | 2 / 4 / 6 / 8 aircraft |

**Logic:** On plan generate, `requiredQty` for each line = template `qtyByTier[parameter tier]`.

**Data files (reference implementation):**
- `src/data/lSeriesTemplate.ts` — full template
- `src/utils/generatePlanLines.ts` — builds `PlanLine[]` from plan platform + parameter tier; demo overlays on `plan-001`

**Version IDs:**
- `L-F16-2026-TEMPLATE`
- `L-CH47-2026-TEMPLATE`

---

## 6. Plan line model

Each line is one L-series component (NSN).

| Field | Description |
|-------|-------------|
| **Required qty** | From L-series template (fixed for tier) |
| **Available qty** | Sum of serviceable main + alternate inventory (click for breakdown) |
| **To-bring qty** | Editable; what planner will physically bring |
| **Status** | Met · Deviation · Shortfall (derived) |
| **Inventory** | Main/Alt rows: NSN, location, qty, status |
| **Deviation** | Reason, remarks, offline approval flag |
| **Shortfall actions** | Multi-select resolution paths + offline approval |

### Line status rules

```
if availableQty < requiredQty  → Shortfall
else if toBringQty ≠ requiredQty → Deviation
else                            → Met
```

**Shortfall qty** = `max(0, requiredQty - availableQty)`.

**Fill rate** = percentage of lines in **Met** status.

### Deviation

Triggered when **to-bring qty ≠ required qty** (bringing more or less than L-series default).

| Reason (enum) | When |
|---------------|------|
| Exercise needs | Operational adjustment |
| Accepting risk due to shortfall | Qty change tied to shortfall acceptance |

Requires remarks + **offline approval recorded** checkbox.

### Shortfall resolution (multi-select)

Planner may select **one or more**; all selected actions share one offline approval flag per line.

| Action | Required fields |
|--------|-----------------|
| **Accept shortfall** | Risk / remarks |
| **Wait** (expedite repair/order) | Component from EDD repair list, need-by-date |
| **Cannibalise** | Aircraft tail #, work centre comments, confirmed with work centre |

After offline meeting, planner ticks **Offline approval recorded (all selected actions)**.

---

## 7. Plan-level status and buckets

### Plan status

| Status | Meaning |
|--------|---------|
| **Draft** | In progress |
| **Partially Approved** | Some lines/resolutions approved |
| **Approved** | Fully approved |

### Open vs Past detachment (list tabs)

| Tab | Rule | UX |
|-----|------|-----|
| **Open Detachment** | Detachment date ≥ today | Full edit (planner) |
| **Past Detachment** | Detachment date < today | **Approved only**, **view-only** |

Past plans: grey card styling, “View only” label, no Create button, no status filter.

---

## 8. Information architecture

```
FMS App Shell
└── CIRRUS (sidebar submenu)
    ├── Detachment Planning     ← built (prototype)
    ├── Inventory Health      ← nav placeholder
    ├── Critical Spares       ← nav placeholder
    ├── Demand & Fulfilment   ← nav placeholder
    ├── Purchase Tracking     ← nav placeholder
    └── (L-series Management) ← specified, not built
```

### Routes

| Screen | Route | Planner | Director |
|--------|-------|---------|----------|
| Plan list | `/detachment-planning` | Own plans, edit | All plans, read-only |
| Plan details | `/detachment-planning/:planId` | Edit | Read-only |
| L-series Management | TBD | — | Edit (future) |

**Demo plan (richest data):** `/detachment-planning/plan-001` — Exercise Falcon 2026

---

## 9. Screen specifications

### 9.1 Detachment Plan List

**Purpose:** Find and open detachment plans; create new (planner).

**Header:** Breadcrumb Home → CIRRUS → Detachment Planning; title “Detachment Planning”; data sync timestamp.

**Toolbar:**
- Filters: View as (role), Platform, Status, Search
- Primary action: **Create Detachment** (planner + Open tab only)

**Content:**
- Tabs: **Open Detachment** | **Past Detachment**
- Card grid (4 columns desktop; responsive 3/2/1)
- Each card: name, platform·variant, fill rate, shortfall/deviation counts, detachment date, status tag
- Director sees creator name on cards

**Create Detachment modal:** See §4 Plan parameters.

---

### 9.2 Detachment Plan Details

**Purpose:** Work the plan — review shortfalls/deviations, edit lines, record approvals.

**Header:** Plan name in breadcrumb; metadata bar below.

**Plan header bar:**
- Platform · variant, L-series, parameter, need-by, detachment date, status tag
- Actions: Edit parameters, Detachment remarks, Export
- View-only: View remarks only; no edit parameters

**KPI strip:**
- Total lines · Shortfalls · Deviations · Cannibalisation lines · Fill rate %

**Shortfall summary (collapse):** Table of shortfall lines only — component, required, available, shortfall qty, actions taken, approval checkbox, Edit link.

**Deviation summary (collapse):** Deviation lines — required, to-bring, delta, reason, remarks, approval, Edit.

**L-series components table:**
- Columns: Component/NSN, Required qty, Available qty (link), To-bring qty, Status, Action (Edit)
- Search + status filter
- Row highlight for shortfall/deviation

**Drawers / modals:**

| Trigger | Surface | Content |
|---------|---------|---------|
| Available qty link | Drawer | Main + alt inventory breakdown by location/status |
| Edit line | Drawer | To-bring qty; deviation block; shortfall resolution block |
| Detachment remarks | Modal | Plan-level remarks for approvers |
| Back | Button | Return to list |

**View-only modes:**
- Director → banner “View only — detachment director”
- Past detachment → banner “View only — past detachment”; approved archived plan

---

### 9.3 L-series Management (not built)

**Audience:** Director only.

**Purpose:** Maintain L-series version lists (CRUD) per platform/variant.

---

## 10. Inventory and available qty

**Available qty** = serviceable **main + alternate** components across listed locations.

**Inventory item statuses:** In WH · Blocked · QI · QIT

**Alternate breakdown drawer** shows Type (Main/Alt), NSN/part, location, qty, status.

Inventory in prototype is **mock/snapshot** (not live ERP); header shows “Data last retrieved on [timestamp]”.

---

## 11. Approval model (v1)

- No in-app approver login or workflow engine.
- Planner presents plan offline to approving officer.
- Planner records outcome via checkboxes:
  - Per shortfall line: approve all selected shortfall actions
  - Per deviation line: deviation offline approval
- Plan status (Draft → Partially Approved → Approved) reflects overall progress (mock KPIs on list cards).

**Future:** Approver role could be added; v1 explicitly excludes automated routing.

---

## 12. Domain types (reference)

```typescript
type UserRole = 'planner' | 'director';
type Platform = 'F-16' | 'CH-47';
type PlanStatus = 'Draft' | 'Partially Approved' | 'Approved';
type LineStatus = 'Met' | 'Deviation' | 'Shortfall';
type ShortfallActionType = 'accept' | 'wait' | 'cannibalise';
type DeviationReason = 'Exercise needs' | 'Accepting risk due to shortfall';
```

See `src/types/detachment.ts` and `src/types/planLine.ts` for full interfaces.

---

## 13. Mock data and demo scenarios

| Plan ID | Name | Notes |
|---------|------|-------|
| `plan-001` | Exercise Falcon 2026 | F-16 200 hrs; shortfalls, deviations, cannibalisation — **primary demo** |
| `plan-002` | Operation Lift 2026 | CH-47 draft, high shortfall count |
| `plan-003` | Detachment Alpha — F-16 | Approved open-dated example |
| `plan-004`–`plan-012` | Various | Mix of past approved plans for Past tab grid |

**Planner-owned plans:** `createdBy: 'planner-1'` (John Doe).

**Director view:** Sees all plans; cards show creator.

---

## 14. Built vs not built (prototype)

| Feature | Status |
|---------|--------|
| Plan list (open/past tabs, cards, search/filters) | Built |
| Create Detachment modal | Built |
| Plan details (KPI, summaries, table, drawers) | Built |
| L-series from Excel template | Built |
| Multi-select variant on create | Built |
| Edit parameters | Stub (“coming soon”) |
| L-series Management page | Not built |
| Live inventory feed | Not built (mock snapshot) |
| Export | UI only |
| Backend / auth | Not built |

---

## 15. Business rules checklist

- [ ] Planner sees **only own** plans; Director sees **all unit** plans read-only.
- [ ] **Past** tab shows **Approved** plans only; **view-only** everywhere.
- [ ] **Create Detachment** hidden for Director and on Past tab.
- [ ] Required qty comes from **L-series template**, not free-form.
- [ ] **Deviation** = to-bring ≠ required; **Shortfall** = available < required (shortfall takes precedence).
- [ ] Shortfall resolutions are **multi-select**; cannibalise requires tail # and work centre confirmation.
- [ ] Approvals are **recorded offline** by planner, not submitted to an approver inbox.
- [ ] Use **Deviation** terminology consistently (never “variation”).

---

## 16. Agent instructions (product-only)

When implementing or changing this module:

1. Read this file first for domain rules and screen intent.
2. Preserve role-based visibility (planner vs director) and open vs past behaviour.
3. Keep L-series line generation tied to `lSeriesTemplate` + plan parameter tier.
4. Do not invent new resolution types or line statuses without updating this doc.
5. Rich demo path: **Exercise Falcon 2026** (`plan-001`).

Do **not** infer UI component libraries from this file — handle visual implementation separately.

---

## 17. Related files (reference repo)

| Purpose | Path |
|---------|------|
| Plan mock data | `src/data/mockPlans.ts` |
| L-series template | `src/data/lSeriesTemplate.ts` |
| Line generation | `src/utils/generatePlanLines.ts` |
| Plan line demo overlays | `src/data/mockPlanLines.ts` |
| Excel template (static) | `public/templates/Template-L-series.xlsx` |

---

*Last updated from CIRRUS prototype work, Jul 2026.*
