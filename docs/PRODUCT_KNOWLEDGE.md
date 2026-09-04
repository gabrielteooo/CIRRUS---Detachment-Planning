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
| **Problem** | Planners must build a defensible spare-parts plan for a detachment exercise: L-series demand vs warehouse stock (shared base pool from ES), shortfalls, deviations, reservation, OC approval, and offline-approved resolutions — with fulfillment tracked when ES goods-issues stock to the plan. |
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

**Typical planner workflow after creating a detachment plan:**

1. Adjust the plan — edit to-bring on existing lines or **Add NSN** (always a deviation).
2. **Resolve shortfalls** — Action required tab; record wait / accept / cannibalise.
3. **OC approval** — informal; planners often filter LRU lines with warehouse qty **1 or 2**, present to OC, then call Supply Depot (SD) after approval.
4. **Call SD** — move spares from warehouse SLOC to detachment plan SLOC (goods issue in ES).
5. **Monitor** fulfilment and awaiting spares.
6. **Present to CO** — shortfalls (accept / cannibalise) and deviations for offline sign-off; record in Approval pack.

```
Create Detachment
  → Insert parameters (platform, variant, L-series, flying hours / aircraft count, dates)
  → Generate detachment plan (L-series lines + warehouse overlay from ES)
  → Adjust to-bring / add NSNs
  → Resolve shortfalls (Action required)
  → OC approval for low-stock LRU (informal; WH 1–2)
  → SD moves stock (warehouse SLOC → detachment SLOC)
  → Monitor fulfilment + awaiting spares
  → Present accept / cannibalise + deviations to CO (Approval pack)
  → Record approval snapshots in app
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

**Logic:** On plan generate, `requiredQty` for each line = template `qtyByTier[parameter tier]`. Some template lines may have **required qty = 0** — these are optional NSNs tagged **As required** (see §6.8).

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
| **Required qty** | From L-series template (fixed for tier); **0** for optional “As required” lines (see §6.8) |
| **To-bring qty** | Editable; defaults to required qty; planner may deviate (optional lines default to **0** until planner opts in) |
| **Warehouse qty** | Serviceable qty at base warehouse SLOC(s) — **shared across all planners** at the base (synced from ES) |
| **Issued qty** | Qty goods-issued from warehouse to **this plan line** (synced from ES) |
| **Reserved qty** | Qty reserved for this plan line from shared warehouse stock (synced from ES, if supported) |
| **Planning status** | Available · Deviation · Shortfall (derived in CIRRUS) |
| **Fulfillment status** | Partially fulfilled · Fulfilled (derived in CIRRUS from issued vs to-bring) |
| **Inventory breakdown** | Main/Alt rows by SLOC — see §6.1 |
| **Deviation** | Reason, remarks, offline approval |
| **Shortfall actions** | Multi-select resolution paths + offline approval |

### 6.1 Warehouse and SLOC

All spare locations are defined by **SLOC** (storage location):

| Field | Example |
|-------|---------|
| **SLOC code** | `SL01` |
| **SLOC description** | `WH01-R02-S` (warehouse · row · serviceability) |

**Warehouse qty** on a plan line is the **current shared pool** for that NSN at base — not qty allocated exclusively to one plan. When stock is issued to a detachment plan line in ES, the shared pool decreases and **issued qty** for that line increases.

Inventory drawer: show SLOC code, description, qty, and serviceability per row.

### 6.2 Quantities

| Quantity | Source | Notes |
|----------|--------|-------|
| **Required** | L-series template | Fixed for plan parameter tier; **0** = optional “As required” line |
| **To-bring** | Planner (CIRRUS) | Defaults to required; deviation allowed; **0** until planner opts in for optional lines |
| **Warehouse** | ES → CIRRUS | Shared base stock; read-only in CIRRUS |
| **Issued** | ES → CIRRUS | Per plan line; drives fulfillment |
| **Reserved** | ES → CIRRUS | Optional; qty earmarked for this line when WH > to-bring |

**Example (full commit):** Required = 2, To-bring = 2, Warehouse = 2, Issued = 0 → **Available**. After ES goods issue: Required = 2, To-bring = 2, Warehouse = 0, Issued = 2 → **Fulfilled**.

**Example (partial pool):** Required = 2, To-bring = 2, Warehouse = 5, Issued = 2 → **Fulfilled**; Warehouse may show 3 remaining for other planners.

### 6.3 Planning status (CIRRUS-owned)

**Available** means serviceable stock exists in the **warehouse SLOC pool** for that NSN (shared base stock). It does **not** mean the detachment has received the spares.

**Fulfilled** (fulfillment axis) means SD/ES has **goods-issued** stock to the detachment plan line (`issuedQty >= toBringQty`). When issued, **warehouse qty decreases** (e.g. required 2, warehouse 3, issued 0 → after SD move: warehouse 1, issued 2).

Derived from planner input + synced warehouse qty.

**Standard lines** (`requiredQty > 0`, not user-added):

```
if toBringQty > warehouseQty     → Shortfall
else if toBringQty ≠ requiredQty → Deviation
else                             → Available
```

**POL** uses the same shortfall rule as LRU/Consumable (`toBring > warehouse`), not `toBring < required`.

**Optional “As required” lines** (`requiredQty = 0`) — see §6.8: no **Deviation**; shortfall only when `toBringQty > 0` and `toBringQty > warehouseQty`.

**Fill rate** = **fulfillment** fill rate: % of eligible lines with **Fulfilled** status. Computed **per category** (LRU, Consumables, POL) and **overall** = average of the three category rates. Exclude as-required lines entirely.

### 6.4 Fulfillment status (ES-fed, CIRRUS-derived)

Issuance happens in **ES** (backend). When stock moves, ES updates and pipes to CIRRUS. CIRRUS does **not** perform goods issue in v1.

```
if issuedQty >= toBringQty  → Fulfilled
else if issuedQty > 0       → Partially fulfilled
else                        → (no fulfillment tag)
```

Fulfillment is based on **issued vs to-bring**, not on warehouse alone. Warehouse = 0 after issue is a consequence of shared pool depletion, not the definition of fulfillment.

Display **planning status** and **fulfillment status** as separate tags when both apply (e.g. Available · Fulfilled).

### 6.5 Reservation and OC approval

When warehouse exceeds to-bring, ES **reserves** stock (prototype may auto-issue for demo). Planners seek **informal OC approval** for LRU lines with warehouse qty **1 or 2** (or when warehouse equals to-bring — full pool commit). No separate resolution step before OC — present and record after meeting. After OC approval, planner calls **SD** to move spares.

### 6.5.1 Action required (work queue)

Unresolved **shortfalls** in the planner workflow — LRU and Consumable lines where `toBring > warehouse` and no resolution recorded. Includes L-series-aligned and upward-deviation shortfalls. Excludes POL, downward-deviation gaps, add-NSN, and uncommitted as-required lines.

### 6.5.2 Plan approval status

| Status | Rule |
|--------|------|
| **Approved** | No lines in Action required **and** no lines pending in Approval pack |
| **Partially Approved** | Some approvals recorded or items still in Approval pack |
| **Draft** | Work in progress |

**Past detachment** = detachment **end date** has passed (not “Approved” status).

### 6.6 Deviation

Triggered when **to-bring qty ≠ required qty** on **standard lines** (`requiredQty > 0`). Does **not** apply to optional “As required” lines (§6.8).

Requires **remarks** (upward and downward) + **offline approval** for standard deviations.

**Add NSN** — reason captured at add time; always **Deviation** (not as-required).

**Accept shortfall** — line remains **Shortfall** in planning status even after CO approval.

**Interchangeable groups** — one plan line per group with **combined warehouse qty**; no per-member NSN top-up selection.

### 6.7 Shortfall resolution (multi-select)

Planner may select **one or more**; all selected actions share one offline approval flag per line.

| Action | Required fields |
|--------|-----------------|
| **Accept shortfall** | Risk / remarks |
| **Wait** (expedite repair/order) | Component from EDD repair list, need-by-date — moves to **Awaiting supply** (no Approval pack) |
| **Cannibalise** | Aircraft tail #, work centre comments, confirmed with work centre |

**Accept** and **Cannibalise** resolutions move to the **Approval pack** for offline CO sign-off before fulfillment. **Wait-only** resolutions skip Approval pack and appear in **Awaiting supply** immediately. Goods issue for accept/cannibalise shortfalls remains blocked until approval is recorded.

**Awaiting supply** — line remains **Shortfall** in planning status while stock is still insufficient; the wait resolution is recorded and the line is monitored until supply arrives.

### 6.8 Optional L-series lines (“As required”)

Some NSNs appear in the L-series with **required qty = 0**. These are **optional** spares — not mandated by the L-series tier. Required column shows **0**.

| Aspect | Rule |
|--------|------|
| **Required** | Always **0** (from template) |
| **Required column** | Shows **0** (same as other lines — numeric qty, not a tag) |
| **To-bring default** | **0** until the planner chooses to include the NSN |
| **Planner choice** | May set to-bring > 0 when they decide to bring optional stock |
| **Deviation** | **Does not apply** — there is no fixed L-series qty to deviate from |
| **Shortfall** | Applies only when `toBringQty > 0` and `toBringQty > warehouseQty` |
| **Planning status** | **Available** while `toBringQty = 0`; otherwise follow §6.3 shortfall rules |
| **Fulfillment** | Subject to **what ES issues** — when `toBringQty > 0`, use standard issued vs to-bring rules (§6.4); when `toBringQty = 0` and `issuedQty = 0`, no fulfillment tag |
| **Reservation / OC approval** | Apply only when planner has committed `toBringQty > 0` (same rules as §6.5) |
| **Fill rate** | Never included — optional lines do not affect fill rate regardless of to-bring |

**Example:** Required = 0, To-bring = 0, Warehouse = 3, Issued = 0 → **Available**, no fulfillment tag. Planner sets To-bring = 1 → if issued = 1 via ES → **Fulfilled** for that optional line.

**UI:** Required column shows **0**. Optional status is implied by the L-series template — not the same as **Add NSN** (user-added lines are always **Deviation**).

**Add NSN vs As required:** User-added NSNs (`isAddedNsn`) are exercise-specific additions with a deviation reason — always **Deviation**, never treated as optional L-series lines. Template lines with `requiredQty = 0` are optional **As required** spares: no deviation when the planner sets to-bring; shortfall / OC rules apply only when committed (`toBringQty > 0`).

---

## 7. CIRRUS vs ES — system boundaries

| Concern | System of record | CIRRUS behaviour |
|---------|------------------|------------------|
| Required qty | L-series / plan | Read |
| To-bring qty | CIRRUS (planner) | Read / write |
| Deviation / shortfall resolution | CIRRUS (planner) | Read / write |
| OC approval (offline) | CIRRUS (planner attestation) | Read / write |
| Warehouse qty (shared pool) | ES | Read-only, synced |
| Reservation | ES | Read-only display; action in ES if supported |
| Goods issue / issuance | ES | Read-only, synced |
| Issued qty (per plan line) | ES | Read-only, synced |
| Planning status | CIRRUS (derived) | Display |
| Fulfillment status | CIRRUS (derived from ES issued qty) | Display |

### Data flow

```
Planner (CIRRUS)  →  plan lines, to-bring, resolutions, approvals
ES (backend)      →  reserve, goods issue, stock movements
ES                →  CIRRUS  (warehouseQty, issuedQty, reservedQty, SLOC breakdown)
CIRRUS            →  Available / Shortfall / Deviation + Partially fulfilled / Fulfilled
```

### Sync and UX

- Show **data last synced** timestamp on plan / inventory surfaces (same pattern as inventory snapshot).
- Warehouse and issued columns are **read-only**; tooltips should state data comes from ES.
- No primary **Issue** action in CIRRUS v1 — planners execute issuance in ES; CIRRUS reflects updates on sync.
- Handle **reversals**: if ES reverses a goods issue, downgrade fulfillment (Fulfilled → Partially fulfilled → none) and restore warehouse qty on next sync.
- **Multi-planner**: shared warehouse can change between syncs; a line may move from Available to Shortfall if another plan consumes stock.

### Integration assumptions (confirm with ES team)

1. **issuedQty** is keyed to **detachment plan line** (or plan + NSN), not NSN-only movements CIRRUS must infer.
2. **warehouseQty** reflects serviceable stock at base SLOC(s) for the NSN (main + alternates per product rules).
3. Sync latency (real-time vs batch) is documented for planner expectations.
4. Reservation model: whether ES exposes **reservedQty** per plan line or CIRRUS only shows a “needs reservation” hint when `warehouseQty > toBringQty` and `reservedQty < toBringQty`.

---

## 8. Plan-level status and buckets

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

## 9. Information architecture

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

## 10. Screen specifications

### 10.1 Detachment Plan List

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

### 10.2 Detachment Plan Details

**Purpose:** Work the plan — review shortfalls/deviations, edit lines, record approvals.

**Header:** Plan name in breadcrumb; metadata bar below.

**Plan header bar:**
- Platform · variant, L-series, parameter, need-by, detachment date, status tag
- Actions: Edit parameters, Detachment remarks, Export
- View-only: View remarks only; no edit parameters

**KPI strip:**
- Total lines · Shortfalls · Deviations · Cannibalisation lines · Fill rate %
- **Low volume spares** — count of NSNs with warehouse ≤ 2 or warehouse = to-bring (not shortfall, not fulfilled); **View more** opens NSN list sorted by warehouse ascending (NSN, description, required, to-bring, warehouse, issued, status)
- **Cannibalised LRU** · **Awaiting Supply** · **Accept Shortfall** — insight cards with drill-down modals

**Shortfall summary (collapse):** Table of shortfall lines only — component, required, warehouse, shortfall qty, actions taken, approval checkbox, Edit link.

**Deviation summary (collapse):** Deviation lines — required, to-bring, delta, reason, remarks, approval, Edit.

**L-series components table:**
- Columns: Component/NSN, Required qty, Warehouse qty (link), To-bring qty, Status (planning + fulfillment), Action (Edit)
- Search + status filter (Available, Deviation, Shortfall, Partially fulfilled, Fulfilled)
- Row highlight for shortfall/deviation

**Drawers / modals:**

| Trigger | Surface | Content |
|---------|---------|---------|
| Warehouse qty link | Drawer | Main + alt inventory breakdown by SLOC |
| Edit line | Drawer | To-bring qty; deviation block; shortfall resolution block |
| Detachment remarks | Modal | Plan-level remarks for approvers |
| Back | Button | Return to list |

**View-only modes:**
- Director → banner “View only — detachment director”
- Past detachment → banner “View only — past detachment”; approved archived plan

---

### 10.3 L-series Management (not built)

**Audience:** Director only.

**Purpose:** Maintain L-series version lists (CRUD) per platform/variant.

---

## 11. Inventory and warehouse qty

**Warehouse qty** = serviceable **main + alternate** components at base warehouse SLOC(s). This is a **shared pool** across planners; synced from ES (mock snapshot in prototype).

**Inventory item statuses:** In WH · Blocked · QI · QIT

**SLOC breakdown drawer** shows Type (Main/Alt), NSN/part, SLOC code, SLOC description, qty, status.

Inventory in prototype is **mock/snapshot** (not live ES); header shows “Data last retrieved on [timestamp]”. See §7 for ES sync behaviour.

---

## 12. Approval model (v1)

- No in-app approver login or workflow engine.
- Planner presents plan offline to approving officer (OC).
- Planner records outcome in CIRRUS:
  - Per shortfall line: approve all selected shortfall actions
  - Per deviation line: deviation offline approval
  - Per line where **warehouse ≤ 2** or **warehouse = to-bring**: OC approval for low-stock / full-commit
- Plan status (Draft → Partially Approved → Approved) reflects overall progress (mock KPIs on list cards).

**Future:** Approver role could be added; v1 explicitly excludes automated routing.

---

## 13. Domain types (reference)

```typescript
type UserRole = 'planner' | 'director';
type Platform = 'F-16' | 'CH-47';
type PlanStatus = 'Draft' | 'Partially Approved' | 'Approved';
type PlanningStatus = 'Available' | 'Deviation' | 'Shortfall';
type FulfillmentStatus = 'Partially fulfilled' | 'Fulfilled'; // absent when issuedQty = 0
type ShortfallActionType = 'accept' | 'wait' | 'cannibalise';
type DeviationReason = 'Exercise needs' | 'Accepting risk due to shortfall';

/** Optional L-series line: requiredQty === 0, not user-added */
function isAsRequiredLine(line: { requiredQty: number; isAddedNsn?: boolean }): boolean {
  return line.requiredQty === 0 && !line.isAddedNsn;
}

/** ES-synced fields (read-only in CIRRUS) */
interface LineInventorySync {
  warehouseQty: number;
  issuedQty: number;
  reservedQty?: number;
  lastSyncedAt: string;
}
```

**Note:** Prototype code may still use legacy `LineStatus = 'Met' | …` and `availableQty` until aligned with this spec.

See `src/types/detachment.ts` and `src/types/planLine.ts` for full interfaces.

---

## 14. Mock data and demo scenarios

| Plan ID | Name | Notes |
|---------|------|-------|
| `plan-001` | Exercise Falcon 2026 | F-16 200 hrs; **validation scenario** — 4 shortfalls (3 LRU + 1 consumable), all other consumables/POL fulfilled, 2 LRU as-required, 5 low-volume LRU, 2 auto-issued surplus LRU |
| `plan-002` | Operation Lift 2026 | CH-47 draft, high shortfall count |
| `plan-003` | Detachment Alpha — F-16 | Approved open-dated example |
| `plan-004`–`plan-012` | Various | Mix of past approved plans for Past tab grid |

**Planner-owned plans:** `createdBy: 'planner-1'` (John Doe).

**Director view:** Sees all plans; cards show creator.

---

## 15. Built vs not built (prototype)

| Feature | Status |
|---------|--------|
| Plan list (open/past tabs, cards, search/filters) | Built |
| Create Detachment modal | Built |
| Plan details (KPI, summaries, table, drawers) | Built |
| L-series from Excel template | Built |
| Multi-select variant on create | Built |
| Edit parameters | Stub (“coming soon”) |
| L-series Management page | Not built |
| Live ES inventory / issuance feed | Mock snapshot + manual issued drawer |
| Issued qty / fulfillment status | Built (mock; warehouse decreases on issue) |
| Approval snapshots (re-approval history) | Built |
| Reservation (ES) display in CIRRUS | Not built |
| Export | UI only |
| Backend / auth | Not built |

---

## 16. Business rules checklist

- [ ] Planner sees **only own** plans; Director sees **all unit** plans read-only.
- [ ] **Past** tab = detachments whose **end date** has passed (view-only).
- [ ] **Plan Approved** = empty Action required + empty Approval pack pending.
- [ ] **Fill rate** = fulfillment % per category; overall = average of LRU, Consumables, POL.
- [ ] **Available** = warehouse stock exists; **Fulfilled** = issued to detachment (WH decreases).
- [ ] **POL shortfall** = same warehouse-gap rule as LRU/Consumable.
- [ ] **Upward deviation shortfall** appears in Action required.
- [ ] **Deviation remarks** for both upward and downward qty changes (Add NSN uses reason at add).
- [ ] **Accept shortfall** stays Shortfall after approval.
- [ ] **Interchangeable** = combined group qty (no member NSN picker).
- [ ] **Warehouse drawer** shows no rows when stock is zero.
- [ ] **Edit parameters** regenerates plan lines (stub).
- [ ] **Create Detachment** hidden for Director and on Past tab.
- [ ] **Required** = L-series qty; **To-bring** defaults to required, editable.
- [ ] **As required** lines have `requiredQty = 0`, show **0** in Required column; optional until planner sets to-bring > 0; never **Deviation**.
- [ ] **Add NSN** lines are always **Deviation** (`isAddedNsn`), distinct from as-required template lines.
- [ ] **As required** lines: no Deviation; Shortfall / reservation / OC approval only when to-bring > 0.
- [ ] **Warehouse** = shared ES pool (SLOC-based); read-only in CIRRUS.
- [ ] **Issuance** in ES only; **Fulfilled** when `issuedQty >= toBringQty`.
- [ ] Default planning status = **Available** (not Met/Fulfilled).
- [ ] **Shortfall** when `toBringQty > warehouseQty`; **Deviation** when `toBringQty ≠ requiredQty`.
- [ ] **Reserve** when `warehouseQty > toBringQty` (ES).
- [ ] **OC approval** when `warehouseQty ≤ 2` OR `warehouseQty = toBringQty`.
- [ ] Shortfall resolutions are **multi-select**; cannibalise requires tail # and work centre confirmation.
- [ ] Approvals are **recorded offline** by planner, not submitted to an approver inbox.
- [ ] Do not use **Fulfilled** for planning-complete-only; reserve for fulfillment axis.
- [ ] Use **Deviation** terminology consistently (never “variation”).

---

## 17. Agent instructions (product-only)

When implementing or changing this module:

1. Read this file first for domain rules and screen intent.
2. Preserve role-based visibility (planner vs director) and open vs past behaviour.
3. Keep L-series line generation tied to `lSeriesTemplate` + plan parameter tier.
4. Do not invent new resolution types or line statuses without updating this doc (see §6–§7).
5. Rich demo path: **Exercise Falcon 2026** (`plan-001`).

Do **not** infer UI component libraries from this file — handle visual implementation separately.

---

## 18. Related files (reference repo)

| Purpose | Path |
|---------|------|
| Plan mock data | `src/data/mockPlans.ts` |
| L-series template | `src/data/lSeriesTemplate.ts` |
| Line generation | `src/utils/generatePlanLines.ts` |
| Plan line demo overlays | `src/data/mockPlanLines.ts` |
| Excel template (static) | `public/templates/Template-L-series.xlsx` |

---

*Last updated from CIRRUS product rules work, Sep 2026.*
