export type LineStatus = 'Met' | 'Deviation' | 'Shortfall';

export type ShortfallActionType = 'accept' | 'wait' | 'cannibalise';

export type DeviationReason = string;

export type ComponentCategory = 'LRU' | 'Consumable' | 'POL';

export interface OfflineApprovalRecord {
  approverName: string;
  approvedDate: string;
  meeting?: string;
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
  inventory: InventoryItem[];
  shortfallActions: ShortfallAction[];
  deviationReason?: DeviationReason;
  deviationRemarks?: string;
  /** @deprecated Use offlineApproval */
  deviationApproved?: boolean;
  offlineApproval?: OfflineApprovalRecord;
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
  if (status === 'Met') return 'Fulfilled';
  return status;
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
  return 'Met';
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
  return line.toBringQty > getGroupAvailableQty(line);
}

export function hasAwaitingSparesResolution(line: PlanLine): boolean {
  return line.shortfallActions.some((action) => action.type === 'wait');
}

/** Shortfall resolved only via awaiting spares — fulfilled without approval. */
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
  if (isPolLine(line)) return line.toBringQty > line.requiredQty;
  return line.isAddedNsn || line.toBringQty !== line.requiredQty;
}

/** No shortfall or deviation conditions — available covers to-bring and to-bring matches required. */
export function isLineFulfilled(line: PlanLine): boolean {
  if (isPolLine(line)) return getPolLineStatus(line) === 'Met';

  if (hasDeviationCondition(line) && !hasDeviationResolutionRecorded(line)) {
    return false;
  }

  if (!hasShortfallCondition(line)) {
    return !hasDeviationCondition(line);
  }

  return isAwaitingSparesOnlyShortfallResolution(line);
}

/** Active statuses for a line (shortfall and deviation can coexist). */
export function getLineStatuses(line: PlanLine): LineStatus[] {
  if (isPolLine(line)) {
    const status = getPolLineStatus(line);
    return status === 'Met' ? ['Met'] : [status];
  }
  const statuses: LineStatus[] = [];
  if (
    hasShortfallCondition(line) &&
    !isAwaitingSparesOnlyShortfallResolution(line)
  ) {
    statuses.push('Shortfall');
  }
  if (hasDeviationCondition(line)) statuses.push('Deviation');
  if (statuses.length === 0) statuses.push('Met');
  return statuses;
}

/** Primary status for sorting and single-tag fallbacks (Shortfall > Deviation > Met). */
export function getLineStatus(line: PlanLine): LineStatus {
  const statuses = getLineStatuses(line);
  if (statuses.includes('Shortfall')) return 'Shortfall';
  if (statuses.includes('Deviation')) return 'Deviation';
  return 'Met';
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

export function computeFillRate(lines: PlanLine[]): number {
  if (lines.length === 0) return 0;
  const fulfilled = lines.filter((line) => isLineFulfilled(line)).length;
  return Math.round((fulfilled / lines.length) * 100);
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

export function isPolFulfilled(line: PlanLine): boolean {
  return isPolLine(line) && getPolLineStatus(line) === 'Met';
}

export function computeCategoryFillRate(
  lines: PlanLine[],
  category: ComponentCategory,
): number {
  const categoryLines = getLinesForCategory(lines, category);
  if (categoryLines.length === 0) return 0;

  const fulfilled = categoryLines.filter((line) => isLineFulfilled(line)).length;
  return Math.round((fulfilled / categoryLines.length) * 100);
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
  const total = categoryLines.length;

  if (total === 0) {
    return { fulfilled: 0, total: 0, percent: 0 };
  }

  const fulfilled = categoryLines.filter((line) => isLineFulfilled(line)).length;

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
  if (isPolLine(line)) {
    return getPolLineStatus(line) === 'Deviation' && !line.deviationReason?.trim();
  }
  return hasDeviationCondition(line) && !hasDeviationResolutionRecorded(line);
}

export function isActionRequired(line: PlanLine): boolean {
  return isShortfallUnresolved(line) || isDeviationUnresolved(line);
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
    return status === 'Met';
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

export function lineNeedsApproval(line: PlanLine): boolean {
  if (isPolLine(line)) {
    return getPolLineStatus(line) === 'Deviation';
  }
  return lineNeedsShortfallApproval(line) || lineNeedsDeviationApproval(line);
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

/** Lines needing shortfall or deviation action before approval pack. */
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
        : withResolution.filter((l) => getLineApprovalStatus(l) === 'approved');

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
  return {
    ...line,
    offlineApproval: approval,
    deviationApproved:
      hasDeviationCondition(line) || getLineStatus(line) === 'Deviation'
        ? true
        : line.deviationApproved,
    shortfallActions: line.shortfallActions.map((action) => ({ ...action, approved: true })),
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

export function countApprovalPackLines(lines: PlanLine[]): number {
  const { shortfalls, deviations } = getApprovalPackLines(lines, 'pending');
  return shortfalls.length + deviations.length;
}

export function countApprovedPackLines(lines: PlanLine[]): number {
  return getApprovalPackLines(lines, 'approved').shortfalls.length +
    getApprovalPackLines(lines, 'approved').deviations.length;
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
