export type LineStatus = 'Available' | 'Deviation' | 'Shortfall';

export type FulfillmentStatus = 'Partially fulfilled' | 'Fulfilled';

export type ShortfallActionType = 'accept' | 'wait' | 'cannibalise';

export type DeviationReason = string;

export type ComponentCategory = 'LRU' | 'Consumable' | 'POL';

export interface OfflineApprovalRecord {
  approverName: string;
  approvedDate: string;
  meeting?: string;
}

/** Frozen plan-line fields captured when an offline approval is saved. */
export interface ApprovalSnapshotState {
  requiredQty: number;
  availableQty: number;
  toBringQty: number;
  issuedQty?: number;
  shortfallActions: ShortfallAction[];
  deviationReason?: string;
  deviationRemarks?: string;
  remarks?: string;
}

export interface ApprovalSnapshot {
  id: string;
  approval: OfflineApprovalRecord;
  lineState: ApprovalSnapshotState;
}

export type InventoryStatus = 'In WH' | 'Blocked' | 'QI' | 'QIT';

export interface InventoryItem {
  type: 'Main' | 'Alt';
  nsn: string;
  description: string;
  location: string;
  qty: number;
  status: InventoryStatus;
}

export interface AcceptShortfallAction {
  type: 'accept';
  qty: number;
  remarks: string;
  approved: boolean;
  targetNsn?: string;
}

export interface WaitShortfallAction {
  type: 'wait';
  qty: number;
  remarks: string;
  needByDate: string;
  approved: boolean;
  targetNsn?: string;
  /** Repair / new-buy orders selected for expediting. */
  supplyOrders?: WaitSupplyOrderSelection[];
}

export interface WaitSupplyOrderSelection {
  id: string;
  poNumber: string;
  edd: string;
  serialNo?: string;
  qty: number;
}

export interface CannibaliseShortfallAction {
  type: 'cannibalise';
  qty: number;
  tailNumber: string;
  workCentreComments: string;
  confirmedWithWorkCentre: boolean;
  approved: boolean;
  /** Interchangeable group: which member NSN is being topped up. */
  targetNsn?: string;
}

export type ShortfallAction =
  | AcceptShortfallAction
  | WaitShortfallAction
  | CannibaliseShortfallAction;

export interface InterchangeableMember {
  nsn: string;
  mpn: string;
  description: string;
  availableQty: number;
  inventory: InventoryItem[];
  isPrimary?: boolean;
}

export interface ToBringAllocation {
  nsn: string;
  qty: number;
}

export interface PlanLine {
  id: string;
  nsn: string;
  description: string;
  requiredQty: number;
  availableQty: number;
  toBringQty: number;
  /** Qty goods-issued from warehouse to this plan line (synced from ES). */
  issuedQty?: number;
  inventory: InventoryItem[];
  shortfallActions: ShortfallAction[];
  deviationReason?: DeviationReason;
  deviationRemarks?: string;
  /** @deprecated Use offlineApproval */
  deviationApproved?: boolean;
  offlineApproval?: OfflineApprovalRecord;
  /** Historical approval records — each save appends an immutable snapshot. */
  approvalSnapshots?: ApprovalSnapshot[];
  /** Live plan line id when this object is a reconstructed approval snapshot row. */
  approvalSourceLineId?: string;
  /** User-added NSN for exercise needs; not from L-series template. */
  isAddedNsn?: boolean;
  componentCategory?: ComponentCategory;
  uom?: string;
  mpn?: string;
  trade?: string;
  system?: string;
  /** SAP MRP controller (F-16 field RXX). */
  mrpController?: string;
  /** Component notes from L-series template (shown on LRU / Consumable / POL tabs). */
  remarks?: string;
  /** @deprecated POL fulfilment is derived from to-bring vs required qty. */
  polFulfilled?: boolean;
  interchangeableMembers?: InterchangeableMember[];
  toBringAllocation?: ToBringAllocation[];
  /** Default member NSN to top up when resolving group shortfall. */
  shortfallTargetNsn?: string;
}

export interface RepairEddOption {
  poNumber: string;
  nsn: string;
  description: string;
  expectedDate: string;
}

export function formatLineStatus(status: LineStatus): string {
  return status;
}

export function formatFulfillmentStatus(status: FulfillmentStatus): string {
  return status;
}

/** Optional L-series line (required = 0). Excludes user-added NSNs — those are deviations. */
export function isAsRequiredLine(
  line: Pick<PlanLine, 'requiredQty' | 'isAddedNsn'>,
): boolean {
  if (line.isAddedNsn) return false;
  return line.requiredQty === 0;
}

export function getIssuedQty(line: PlanLine): number {
  return line.issuedQty ?? 0;
}

/** Warehouse ≤ 2 or warehouse = to-bring — OC approval before manual issue. */
export function needsOcApprovalForIssue(line: PlanLine): boolean {
  const toBring = line.toBringQty;
  if (toBring <= 0) return false;
  if (hasShortfallCondition(line)) return false;
  const warehouse = getGroupAvailableQty(line);
  return warehouse <= 2 || warehouse === toBring;
}

/** Warehouse > to-bring — reserved and auto-issued offline (prototype). */
export function isAutoIssuedLine(line: PlanLine): boolean {
  const toBring = line.toBringQty;
  if (toBring <= 0) return false;
  if (hasShortfallCondition(line)) return false;
  const warehouse = getGroupAvailableQty(line);
  return warehouse > toBring;
}

/** Issued qty for display — auto-issued lines always show to-bring. */
export function getDisplayIssuedQty(line: PlanLine): number {
  if (isAutoIssuedLine(line)) return line.toBringQty;
  return getIssuedQty(line);
}

export function syncLineIssuance(line: PlanLine): PlanLine {
  if (isAutoIssuedLine(line)) {
    return { ...line, issuedQty: line.toBringQty };
  }
  return line;
}

export function syncPlanLinesIssuance(lines: PlanLine[]): PlanLine[] {
  return lines.map(syncLineIssuance);
}

/** ES-fed fulfillment derived from issued vs to-bring. */
export function getFulfillmentStatus(line: PlanLine): FulfillmentStatus | null {
  const issued = getDisplayIssuedQty(line);
  const { toBringQty } = line;
  if (toBringQty <= 0 && issued <= 0) return null;
  if (toBringQty > 0 && issued >= toBringQty) return 'Fulfilled';
  if (issued > 0) return 'Partially fulfilled';
  return null;
}

export type FulfillmentFilter = 'all' | 'none' | FulfillmentStatus;

export function lineMatchesFulfillmentFilter(
  line: PlanLine,
  filter: FulfillmentFilter,
): boolean {
  if (filter === 'all') return true;
  const status = getFulfillmentStatus(line);
  if (filter === 'none') return status === null;
  return status === filter;
}

export function isPolLine(line: PlanLine): boolean {
  return line.componentCategory === 'POL';
}

/** LRU and Consumable lines that participate in shortfall / deviation workflow. */
export function getOperationalLines(lines: PlanLine[]): PlanLine[] {
  return lines.filter((line) => !isPolLine(line));
}

export function getPolLineStatus(line: PlanLine): LineStatus {
  if (line.toBringQty < line.requiredQty) return 'Shortfall';
  if (line.toBringQty > line.requiredQty) return 'Deviation';
  return 'Available';
}

export function getDefaultToBringQty(requiredQty: number): number {
  return requiredQty;
}

export function getGroupAvailableQty(line: PlanLine): number {
  if (isInterchangeableLine(line)) {
    return line.interchangeableMembers!.reduce((sum, member) => sum + member.availableQty, 0);
  }
  return line.availableQty;
}

/** To-bring exceeds available stock. */
export function hasShortfallCondition(line: PlanLine): boolean {
  if (isPolLine(line)) return line.toBringQty < line.requiredQty;
  if (isAsRequiredLine(line) && line.toBringQty <= 0) return false;
  return line.toBringQty > getGroupAvailableQty(line);
}

export function hasAwaitingSparesResolution(line: PlanLine): boolean {
  return line.shortfallActions.some((action) => action.type === 'wait');
}

/** Shortfall resolved only via awaiting supply — fulfilled without approval. */
export function isAwaitingSparesOnlyShortfallResolution(line: PlanLine): boolean {
  if (!hasShortfallCondition(line)) return false;
  if (line.shortfallActions.length === 0) return false;
  return line.shortfallActions.every((action) => action.type === 'wait');
}

export function getAwaitingSparesLines(lines: PlanLine[]): PlanLine[] {
  return getOperationalLines(lines).filter(
    (line) => hasShortfallCondition(line) && hasAwaitingSparesResolution(line),
  );
}

export function countAwaitingSparesLines(lines: PlanLine[]): number {
  return getAwaitingSparesLines(lines).length;
}

/**
 * Accept shortfall is only valid when stock is insufficient but to-bring still matches
 * the L-series requirement. Upward deviation (to-bring above required) that creates
 * a shortfall must be resolved via wait or cannibalise.
 */
export function canAcceptShortfall(line: PlanLine): boolean {
  if (isPolLine(line)) return false;
  if (!hasShortfallCondition(line)) return false;
  return line.toBringQty <= line.requiredQty;
}

/** To-bring differs from the L-series requirement (or line was added to the plan). */
export function hasDeviationCondition(line: PlanLine): boolean {
  if (isAsRequiredLine(line)) return false;
  if (isPolLine(line)) return line.toBringQty > line.requiredQty;
  return line.isAddedNsn || line.toBringQty !== line.requiredQty;
}

/**
 * Planning-side “resolved” state for edit UX (shortfall / deviation workflow).
 * Fill-rate KPIs use {@link countsAsFillRateFulfilled} (ES issuance) instead.
 */
export function isLineFulfilled(line: PlanLine): boolean {
  if (isAsRequiredLine(line) && line.toBringQty <= 0) return false;
  if (isPolLine(line)) return getPolLineStatus(line) === 'Available';

  if (hasDeviationCondition(line) && !hasDeviationResolutionRecorded(line)) {
    return false;
  }

  if (!hasShortfallCondition(line)) {
    return !hasDeviationCondition(line);
  }

  return isAwaitingSparesOnlyShortfallResolution(line);
}

/** Lines that count toward fill-rate KPIs. As-required spares are always excluded. */
export function countsTowardPlanningFillRate(line: PlanLine): boolean {
  if (isAsRequiredLine(line)) return false;
  return true;
}

/** ES fulfillment — issued qty meets or exceeds to-bring. */
export function countsAsFillRateFulfilled(line: PlanLine): boolean {
  return getFulfillmentStatus(line) === 'Fulfilled';
}

/** Active statuses for a line (shortfall and deviation can coexist). */
export function getLineStatuses(line: PlanLine): LineStatus[] {
  if (isPolLine(line)) {
    const status = getPolLineStatus(line);
    return status === 'Available' ? ['Available'] : [status];
  }
  const statuses: LineStatus[] = [];
  if (
    hasShortfallCondition(line) &&
    !isAwaitingSparesOnlyShortfallResolution(line)
  ) {
    statuses.push('Shortfall');
  }
  if (hasDeviationCondition(line)) statuses.push('Deviation');
  if (statuses.length === 0) statuses.push('Available');
  return statuses;
}

/** Primary status for sorting and single-tag fallbacks (Shortfall > Deviation > Available). */
export function getLineStatus(line: PlanLine): LineStatus {
  const statuses = getLineStatuses(line);
  if (statuses.includes('Shortfall')) return 'Shortfall';
  if (statuses.includes('Deviation')) return 'Deviation';
  return 'Available';
}

export function getShortfallQty(line: PlanLine): number {
  if (isPolLine(line)) {
    return Math.max(0, line.requiredQty - line.toBringQty);
  }
  const available = getGroupAvailableQty(line);
  if (line.toBringQty > available) {
    return line.toBringQty - available;
  }
  return 0;
}

/** Surplus vs required when fulfilled; negative gap (e.g. -1) when to-bring exceeds available. */
export function getShortfallDelta(line: PlanLine): number {
  if (isPolLine(line)) return line.toBringQty - line.requiredQty;
  if (hasShortfallCondition(line)) {
    return getGroupAvailableQty(line) - line.toBringQty;
  }
  return getGroupAvailableQty(line) - line.requiredQty;
}

/** @deprecated Use hasShortfallCondition */
export function isStockShortfall(line: PlanLine): boolean {
  return hasShortfallCondition(line);
}

/** @deprecated Use hasShortfallCondition */
export function isOverCommitShortfall(line: PlanLine): boolean {
  return hasShortfallCondition(line);
}

/** True when the user may adjust to-bring on a fulfilled operational line. */
export function canDeviateQty(line: PlanLine): boolean {
  return !line.isAddedNsn && !isPolLine(line) && isLineFulfilled(line);
}

/** Plan fill rate = average of LRU, Consumable, and POL category fill rates. */
export function computeFillRate(lines: PlanLine[]): number {
  const { LRU, Consumable, POL } = computeCategoryFillRates(lines);
  return Math.round((LRU + Consumable + POL) / 3);
}

export function getLinesForCategory(
  lines: PlanLine[],
  category: ComponentCategory,
): PlanLine[] {
  if (category === 'LRU') {
    return lines.filter((line) => line.isAddedNsn || line.componentCategory === 'LRU');
  }
  return lines.filter((line) => line.componentCategory === category);
}

export function computeCategoryFillRate(
  lines: PlanLine[],
  category: ComponentCategory,
): number {
  return getCategoryFulfillmentSummary(lines, category).percent;
}

export interface CategoryFillRates {
  LRU: number;
  Consumable: number;
  POL: number;
}

export function computeCategoryFillRates(lines: PlanLine[]): CategoryFillRates {
  return {
    LRU: computeCategoryFillRate(lines, 'LRU'),
    Consumable: computeCategoryFillRate(lines, 'Consumable'),
    POL: computeCategoryFillRate(lines, 'POL'),
  };
}

export interface CategoryFulfillmentSummary {
  fulfilled: number;
  total: number;
  percent: number;
}

export function getCategoryFulfillmentSummary(
  lines: PlanLine[],
  category: ComponentCategory,
): CategoryFulfillmentSummary {
  const categoryLines = getLinesForCategory(lines, category);
  const eligible = categoryLines.filter(countsTowardPlanningFillRate);
  const total = eligible.length;

  if (total === 0) {
    return { fulfilled: 0, total: 0, percent: 0 };
  }

  const fulfilled = eligible.filter((line) => countsAsFillRateFulfilled(line)).length;

  return {
    fulfilled,
    total,
    percent: Math.round((fulfilled / total) * 100),
  };
}

const CATEGORY_COLLAPSE_LABELS: Record<ComponentCategory, string> = {
  LRU: 'LRU',
  Consumable: 'Consumables',
  POL: 'POL',
};

export function formatCategoryCollapseLabel(
  lines: PlanLine[],
  category: ComponentCategory,
): string {
  const { fulfilled, total, percent } = getCategoryFulfillmentSummary(lines, category);
  const label = CATEGORY_COLLAPSE_LABELS[category];
  return `${label} - ${fulfilled}/${total} (${percent}%)`;
}

export interface CannibalisedEntry {
  lineId: string;
  nsn: string;
  description: string;
  tailNumber: string;
  qty: number;
}

/** Shortfall resolutions that include cannibalise (one entry per cannibalise action). */
export function getCannibalisedEntries(lines: PlanLine[]): CannibalisedEntry[] {
  const entries: CannibalisedEntry[] = [];

  for (const line of lines) {
    for (const action of line.shortfallActions) {
      if (action.type !== 'cannibalise') continue;
      entries.push({
        lineId: line.id,
        nsn: line.nsn,
        description: line.description,
        tailNumber: action.tailNumber.trim() || '—',
        qty: action.qty,
      });
    }
  }

  return entries;
}

export interface WaitEntry {
  lineId: string;
  nsn: string;
  description: string;
  needByDate: string;
  qty: number;
}

/** Shortfall resolutions that include wait (one entry per wait action). */
export function getWaitEntries(lines: PlanLine[]): WaitEntry[] {
  const entries: WaitEntry[] = [];

  for (const line of lines) {
    for (const action of line.shortfallActions) {
      if (action.type !== 'wait') continue;
      entries.push({
        lineId: line.id,
        nsn: line.nsn,
        description: line.description,
        needByDate: action.needByDate,
        qty: action.qty,
      });
    }
  }

  return entries;
}

export interface AcceptShortfallEntry {
  lineId: string;
  nsn: string;
  description: string;
  qty: number;
  remarks: string;
}

/** Shortfall resolutions that include accept (one entry per accept action). */
export function getAcceptShortfallEntries(lines: PlanLine[]): AcceptShortfallEntry[] {
  const entries: AcceptShortfallEntry[] = [];

  for (const line of lines) {
    for (const action of line.shortfallActions) {
      if (action.type !== 'accept') continue;
      entries.push({
        lineId: line.id,
        nsn: line.nsn,
        description: line.description,
        qty: action.qty,
        remarks: action.remarks.trim() || '—',
      });
    }
  }

  return entries;
}

export function countShortfalls(lines: PlanLine[]): number {
  return getOperationalLines(lines).filter((l) => hasShortfallCondition(l)).length;
}

export function countDeviations(lines: PlanLine[]): number {
  return getOperationalLines(lines).filter((l) => hasDeviationCondition(l)).length;
}

export function countCannibalisation(lines: PlanLine[]): number {
  return lines.filter((l) =>
    l.shortfallActions.some((a) => a.type === 'cannibalise'),
  ).length;
}

export function hasNonAcceptShortfallResolution(line: PlanLine): boolean {
  return line.shortfallActions.some(
    (action) => action.type === 'wait' || action.type === 'cannibalise',
  );
}

export function computeShortfallResolvedProgress(
  lines: PlanLine[],
): { resolved: number; total: number } {
  const shortfallLines = getOperationalLines(lines).filter((l) => hasShortfallCondition(l));
  const resolved = shortfallLines.filter((l) => l.shortfallActions.length > 0).length;
  return { resolved, total: shortfallLines.length };
}

/** Distinct aircraft tail numbers used in cannibalise resolution actions. */
export function countAircraftCannibalised(lines: PlanLine[]): number {
  const tails = new Set<string>();
  for (const line of lines) {
    for (const action of line.shortfallActions) {
      if (action.type === 'cannibalise') {
        const tail = action.tailNumber.trim();
        if (tail) tails.add(tail);
      }
    }
  }
  return tails.size;
}

export function computePlanStatus(lines: PlanLine[]): 'Draft' | 'Partially Approved' | 'Approved' {
  const needsApproval = lines.filter(lineNeedsApproval);

  if (needsApproval.length === 0) return 'Draft';

  const { approved, total } = computeApprovalProgress(lines);

  if (approved === total) return 'Approved';
  if (approved > 0) return 'Partially Approved';
  return 'Draft';
}

export function sumShortfallActionQty(actions: ShortfallAction[]): number {
  return actions.reduce((sum, action) => {
    if (action.type === 'accept') return sum;
    return sum + action.qty;
  }, 0);
}

/**
 * To-bring matches required when stock is sufficient.
 * In shortfall, to-bring = available + wait/cannibalise resolution qty.
 */
export function computeToBringQty(
  line: Pick<PlanLine, 'toBringQty'>,
  _actions: ShortfallAction[] = [],
): number {
  return line.toBringQty;
}

/** @deprecated Use computeToBringQty */
export function computeToBringFromShortfallActions(actions: ShortfallAction[]): number {
  return sumShortfallActionQty(actions);
}

export function formatAwaitingSparesResolution(line: PlanLine): string {
  return formatShortfallActions(line.shortfallActions.filter((action) => action.type === 'wait'));
}

export function formatShortfallActions(actions: ShortfallAction[]): string {
  const labels: Record<ShortfallActionType, string> = {
    accept: 'Accept shortfall',
    wait: 'Awaiting supply',
    cannibalise: 'Cannibalise',
  };
  return (
    actions
      .map((a) => {
        const suffix = a.targetNsn ? ` — ${a.targetNsn}` : '';
        if (a.type === 'wait') {
          const orders = a.supplyOrders?.map((o) => o.poNumber).join(', ');
          const orderSuffix = orders ? `, PO ${orders}` : '';
          return `${labels[a.type]} (${a.qty}, EDD ${a.needByDate}${orderSuffix})${suffix}`;
        }
        if (a.type === 'cannibalise') {
          return `${labels[a.type]} (${a.qty}, tail ${a.tailNumber})${suffix}`;
        }
        return `${labels[a.type]} (${a.qty})${suffix}`;
      })
      .join('; ') || '—'
  );
}

export function isShortfallUnresolved(line: PlanLine): boolean {
  if (isPolLine(line)) return getPolLineStatus(line) === 'Shortfall';
  return hasShortfallCondition(line) && line.shortfallActions.length === 0;
}

export function hasDeviationResolutionRecorded(line: PlanLine): boolean {
  if (!hasDeviationCondition(line)) return true;
  if (line.isAddedNsn) return !!(line.deviationReason?.trim());
  if (line.toBringQty > line.requiredQty) return !!(line.deviationReason?.trim());
  if (line.toBringQty < line.requiredQty) return !!(line.deviationRemarks?.trim());
  return false;
}

export function isDeviationUnresolved(line: PlanLine): boolean {
  if (!hasDeviationCondition(line)) return false;
  if (isPolLine(line)) {
    return getPolLineStatus(line) === 'Deviation' && !line.deviationReason?.trim();
  }
  return !hasDeviationResolutionRecorded(line);
}

/**
 * Action required = unresolved stock shortfall on L-series-aligned lines only.
 * Deviations (to-bring ≠ required) are resolved via Edit/Deviate on All components,
 * not the work queue — even when the deviation creates a warehouse gap.
 */
export function isActionRequired(line: PlanLine): boolean {
  if (!isShortfallUnresolved(line)) return false;
  if (isPolLine(line)) return true;
  if (isAsRequiredLine(line)) return line.toBringQty > 0;
  return line.toBringQty === line.requiredQty && !line.isAddedNsn;
}

export function isInterchangeableLine(line: PlanLine): boolean {
  return (line.interchangeableMembers?.length ?? 0) > 0;
}

export function getPrimaryMemberNsn(line: PlanLine): string | undefined {
  return (
    line.interchangeableMembers?.find((member) => member.isPrimary)?.nsn ??
    line.interchangeableMembers?.[0]?.nsn
  );
}

export function sumToBringAllocation(allocation: ToBringAllocation[] | undefined): number {
  return allocation?.reduce((sum, item) => sum + item.qty, 0) ?? 0;
}

export function formatToBringAllocation(line: PlanLine): string {
  if (!line.toBringAllocation?.length) return '—';
  const labels = line.toBringAllocation
    .filter((item) => item.qty > 0)
    .map((item) => {
      const member = line.interchangeableMembers?.find((m) => m.nsn === item.nsn);
      const label = member?.nsn.split('-').pop() ?? item.nsn;
      return `${label}×${item.qty}`;
    });
  return labels.length > 0 ? labels.join(', ') : '—';
}

export function allShortfallActionsApproved(actions: ShortfallAction[]): boolean {
  return actions.length > 0 && actions.every((a) => a.approved);
}

export function hasShortfallResolutionRecorded(line: PlanLine): boolean {
  return !hasShortfallCondition(line) || line.shortfallActions.length > 0;
}

export function hasResolutionRecorded(line: PlanLine): boolean {
  if (isPolLine(line)) {
    const status = getPolLineStatus(line);
    if (status === 'Deviation') return !!(line.deviationReason?.trim());
    return status === 'Available';
  }
  return hasShortfallResolutionRecorded(line) && hasDeviationResolutionRecorded(line);
}

export function getLineActionLabel(line: PlanLine): 'Resolve' | 'Edit' | 'Deviate' {
  if (isPolLine(line)) {
    if (getPolLineStatus(line) === 'Deviation' && !line.deviationReason?.trim()) {
      return 'Deviate';
    }
    return 'Edit';
  }
  if (isShortfallUnresolved(line)) return 'Resolve';
  if (isDeviationUnresolved(line)) return 'Deviate';
  return 'Edit';
}

export function lineNeedsShortfallApproval(line: PlanLine): boolean {
  if (!hasShortfallCondition(line)) return false;
  return line.shortfallActions.some(
    (action) => action.type === 'accept' || action.type === 'cannibalise',
  );
}

export function lineNeedsDeviationApproval(line: PlanLine): boolean {
  return hasDeviationCondition(line) && hasDeviationResolutionRecorded(line);
}

export function lineNeedsOcApproval(line: PlanLine): boolean {
  return needsOcApprovalForIssue(line) && line.toBringQty > 0;
}

export function lineNeedsApproval(line: PlanLine): boolean {
  if (isPolLine(line)) {
    return getPolLineStatus(line) === 'Deviation';
  }
  return (
    lineNeedsShortfallApproval(line) ||
    lineNeedsDeviationApproval(line) ||
    lineNeedsOcApproval(line)
  );
}

/** Line has resolution recorded and belongs in the approval pack (not work queue). */
export function isInApprovalPack(line: PlanLine): boolean {
  return lineNeedsApproval(line) && hasResolutionRecorded(line);
}

export function wasNewlyMovedToApprovalPack(before: PlanLine, after: PlanLine): boolean {
  return !isInApprovalPack(before) && isInApprovalPack(after);
}

export function isLineApprovalComplete(line: PlanLine): boolean {
  if (!lineNeedsApproval(line)) return false;

  const approval = line.offlineApproval;
  if (approval?.approverName?.trim() && approval.approvedDate) {
    return true;
  }

  // Legacy demo data: deviationApproved flag for deviations without offlineApproval record
  if (hasDeviationCondition(line)) return line.deviationApproved === true;
  return false;
}

export function computeApprovalProgress(lines: PlanLine[]): { approved: number; total: number } {
  const needingApproval = lines.filter(lineNeedsApproval);
  const approved = needingApproval.filter(isLineApprovalComplete).length;
  return { approved, total: needingApproval.length };
}

export type LineApprovalStatus = 'unresolved' | 'unapproved' | 'approved';

export function getLineApprovalStatus(line: PlanLine): LineApprovalStatus {
  if (isActionRequired(line)) return 'unresolved';
  if (!lineNeedsApproval(line)) return 'approved';
  if (isLineApprovalComplete(line)) return 'approved';
  return 'unapproved';
}

export function formatLineApprovalStatus(status: LineApprovalStatus): string {
  const labels: Record<LineApprovalStatus, string> = {
    unresolved: 'Action required',
    unapproved: 'Pending Approval',
    approved: 'Approved',
  };
  return labels[status];
}

export function sortShortfallLinesByApproval(lines: PlanLine[]): PlanLine[] {
  const rank = (line: PlanLine): number => {
    const approval = getLineApprovalStatus(line);
    if (approval === 'unresolved') return 0;
    if (approval === 'unapproved') return 1;
    return 2;
  };
  return [...lines].sort((a, b) => rank(a) - rank(b));
}

/** Lines with unresolved L-series-aligned stock shortfalls (work queue). */
export function getWorkQueueLines(lines: PlanLine[]): PlanLine[] {
  return lines.filter(isActionRequired);
}

/** Shortfalls and deviations with resolution recorded (pending or approved). */
export function getApprovalPackLines(
  lines: PlanLine[],
  filter: 'pending' | 'approved' | 'all' = 'pending',
): {
  shortfalls: PlanLine[];
  deviations: PlanLine[];
} {
  const withResolution = lines.filter(
    (l) =>
      hasResolutionRecorded(l) &&
      lineNeedsApproval(l) &&
      getLineApprovalStatus(l) !== 'unresolved',
  );

  const filtered =
    filter === 'all'
      ? withResolution
      : filter === 'pending'
        ? withResolution.filter((l) => getLineApprovalStatus(l) === 'unapproved')
        : [];

  if (filter === 'approved') {
    return getApprovedPackLines(lines);
  }

  const sortUnapprovedFirst = (items: PlanLine[]) =>
    [...items].sort((a, b) => {
      const aApproved = isLineApprovalComplete(a) ? 1 : 0;
      const bApproved = isLineApprovalComplete(b) ? 1 : 0;
      return aApproved - bApproved;
    });

  return {
    shortfalls: sortUnapprovedFirst(
      filtered.filter((l) => lineNeedsShortfallApproval(l)),
    ),
    deviations: sortUnapprovedFirst(
      filtered.filter(
        (l) => hasDeviationCondition(l) && hasDeviationResolutionRecorded(l),
      ),
    ),
  };
}

export function applyOfflineApproval(
  line: PlanLine,
  approval: OfflineApprovalRecord,
): PlanLine {
  const snapshot = buildApprovalSnapshot(line, approval);
  return {
    ...line,
    offlineApproval: approval,
    deviationApproved:
      hasDeviationCondition(line) || getLineStatus(line) === 'Deviation'
        ? true
        : line.deviationApproved,
    shortfallActions: line.shortfallActions.map((action) => ({ ...action, approved: true })),
    approvalSnapshots: [...(line.approvalSnapshots ?? []), snapshot],
  };
}

export function applyOfflineApprovalToLines(
  lines: PlanLine[],
  lineIds: string[],
  approval: OfflineApprovalRecord,
): PlanLine[] {
  const idSet = new Set(lineIds);
  return lines.map((line) =>
    idSet.has(line.id) ? applyOfflineApproval(line, approval) : line,
  );
}

export function clearOfflineApproval(line: PlanLine): PlanLine {
  return {
    ...line,
    offlineApproval: undefined,
    deviationApproved: undefined,
    shortfallActions: line.shortfallActions.map((action) => ({ ...action, approved: false })),
  };
}

export function captureApprovalSnapshotState(line: PlanLine): ApprovalSnapshotState {
  return {
    requiredQty: line.requiredQty,
    availableQty: line.availableQty,
    toBringQty: line.toBringQty,
    issuedQty: line.issuedQty,
    shortfallActions: line.shortfallActions.map((action) => ({ ...action })),
    deviationReason: line.deviationReason,
    deviationRemarks: line.deviationRemarks,
    remarks: line.remarks,
  };
}

export function buildApprovalSnapshot(
  line: PlanLine,
  approval: OfflineApprovalRecord,
  snapshotId?: string,
): ApprovalSnapshot {
  return {
    id: snapshotId ?? `${line.id}-snap-${approval.approvedDate}-${Date.now()}`,
    approval,
    lineState: captureApprovalSnapshotState(line),
  };
}

export function getLineApprovalSnapshots(line: PlanLine): ApprovalSnapshot[] {
  return line.approvalSnapshots ?? [];
}

export function planLineFromApprovalSnapshot(
  line: PlanLine,
  snapshot: ApprovalSnapshot,
): PlanLine {
  const { lineState, approval } = snapshot;
  return {
    ...line,
    id: snapshot.id,
    approvalSourceLineId: line.id,
    requiredQty: lineState.requiredQty,
    availableQty: lineState.availableQty,
    toBringQty: lineState.toBringQty,
    issuedQty: lineState.issuedQty,
    shortfallActions: lineState.shortfallActions.map((action) => ({ ...action })),
    deviationReason: lineState.deviationReason,
    deviationRemarks: lineState.deviationRemarks,
    remarks: lineState.remarks ?? line.remarks,
    offlineApproval: approval,
    deviationApproved: undefined,
    approvalSnapshots: undefined,
  };
}

/** All immutable approval snapshot rows for the Approved tab (newest first). */
export function getApprovedSnapshotLines(lines: PlanLine[]): PlanLine[] {
  const rows: PlanLine[] = [];

  for (const line of lines) {
    for (const snapshot of getLineApprovalSnapshots(line)) {
      rows.push(planLineFromApprovalSnapshot(line, snapshot));
    }
  }

  // Legacy: approved before snapshot support — show current line once until re-approved.
  for (const line of lines) {
    if (isLineApprovalComplete(line) && getLineApprovalSnapshots(line).length === 0) {
      rows.push(line);
    }
  }

  return rows.sort((a, b) => {
    const aDate = a.offlineApproval?.approvedDate ?? '';
    const bDate = b.offlineApproval?.approvedDate ?? '';
    return bDate.localeCompare(aDate);
  });
}

export function getApprovedPackLines(lines: PlanLine[]): {
  shortfalls: PlanLine[];
  deviations: PlanLine[];
} {
  const snapshotLines = getApprovedSnapshotLines(lines);
  return {
    shortfalls: snapshotLines.filter((line) => lineNeedsShortfallApproval(line)),
    deviations: snapshotLines.filter(
      (line) => hasDeviationCondition(line) && hasDeviationResolutionRecorded(line),
    ),
  };
}

export function hasApprovalResolutionChange(before: PlanLine, after: PlanLine): boolean {
  if (before.toBringQty !== after.toBringQty) return true;
  if (before.deviationReason !== after.deviationReason) return true;
  if (before.deviationRemarks !== after.deviationRemarks) return true;
  if (JSON.stringify(before.shortfallActions) !== JSON.stringify(after.shortfallActions)) {
    return true;
  }
  return false;
}

export function ensureLegacyApprovalSnapshots(lines: PlanLine[]): PlanLine[] {
  return lines.map((line) => {
    if (!line.offlineApproval || line.approvalSnapshots?.length) return line;
    return {
      ...line,
      approvalSnapshots: [buildApprovalSnapshot(line, line.offlineApproval)],
    };
  });
}

export function countApprovalPackLines(lines: PlanLine[]): number {
  const { shortfalls, deviations } = getApprovalPackLines(lines, 'pending');
  return shortfalls.length + deviations.length;
}

export function countApprovedPackLines(lines: PlanLine[]): number {
  const { shortfalls, deviations } = getApprovedPackLines(lines);
  return shortfalls.length + deviations.length;
}

export function countWorkQueueLines(lines: PlanLine[]): number {
  return getWorkQueueLines(lines).length;
}

export function formatDeviationResolution(line: PlanLine): string {
  if (line.isAddedNsn || line.toBringQty > line.requiredQty) {
    return line.deviationReason?.trim() || '—';
  }
  if (line.toBringQty < line.requiredQty) {
    return line.deviationRemarks?.trim() || '—';
  }
  return '—';
}

export function getDeviationDelta(line: PlanLine): number {
  if (line.isAddedNsn) return line.toBringQty;
  return line.toBringQty - line.requiredQty;
}
