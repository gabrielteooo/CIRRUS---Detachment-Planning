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
  /** Component notes from L-series template (shown on LRU / Consumable / POL tabs). */
  remarks?: string;
  /** POL tab: planner marks line fulfilled when POL is ready. */
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

export function getLineStatus(line: PlanLine): LineStatus {
  if (isPolLine(line)) return 'Met';
  if (getGroupAvailableQty(line) < line.requiredQty) return 'Shortfall';
  if (line.isAddedNsn || line.toBringQty > line.requiredQty) return 'Deviation';
  return 'Met';
}

export function getShortfallQty(line: PlanLine): number {
  return Math.max(0, line.requiredQty - getGroupAvailableQty(line));
}

/** Available minus required; negative when stock is short. */
export function getShortfallDelta(line: PlanLine): number {
  return getGroupAvailableQty(line) - line.requiredQty;
}

/** True when stock exceeds L-series requirement and user may bring extra qty (deviation). */
export function canDeviateQty(line: PlanLine): boolean {
  return (
    !line.isAddedNsn &&
    getLineStatus(line) !== 'Shortfall' &&
    getGroupAvailableQty(line) > line.requiredQty
  );
}

export function computeFillRate(lines: PlanLine[]): number {
  if (lines.length === 0) return 0;
  const fulfilled = lines.filter((line) => {
    if (isPolLine(line)) return isPolFulfilled(line);
    return getLineStatus(line) === 'Met';
  }).length;
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
  return line.polFulfilled === true;
}

export function computeCategoryFillRate(
  lines: PlanLine[],
  category: ComponentCategory,
): number {
  const categoryLines = getLinesForCategory(lines, category);
  if (categoryLines.length === 0) return 0;

  if (category === 'POL') {
    const fulfilled = categoryLines.filter(isPolFulfilled).length;
    return Math.round((fulfilled / categoryLines.length) * 100);
  }

  const fulfilled = categoryLines.filter((line) => getLineStatus(line) === 'Met').length;
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

  const fulfilled =
    category === 'POL'
      ? categoryLines.filter(isPolFulfilled).length
      : categoryLines.filter((line) => getLineStatus(line) === 'Met').length;

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

export function countShortfalls(lines: PlanLine[]): number {
  return getOperationalLines(lines).filter((l) => getLineStatus(l) === 'Shortfall').length;
}

export function countDeviations(lines: PlanLine[]): number {
  return getOperationalLines(lines).filter((l) => getLineStatus(l) === 'Deviation').length;
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
  const shortfallLines = lines.filter((l) => getLineStatus(l) === 'Shortfall');
  const resolved = shortfallLines.filter(hasResolutionRecorded).length;
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
  line: Pick<PlanLine, 'requiredQty' | 'availableQty' | 'interchangeableMembers'>,
  actions: ShortfallAction[] = [],
): number {
  const available = getGroupAvailableQty(line as PlanLine);
  if (available >= line.requiredQty) {
    return line.requiredQty;
  }
  return available + sumShortfallActionQty(actions);
}

/** @deprecated Use computeToBringQty */
export function computeToBringFromShortfallActions(actions: ShortfallAction[]): number {
  return sumShortfallActionQty(actions);
}

export function formatShortfallActions(actions: ShortfallAction[]): string {
  const labels: Record<ShortfallActionType, string> = {
    accept: 'Accept shortfall',
    wait: 'Wait',
    cannibalise: 'Cannibalise',
  };
  return (
    actions
      .map((a) => {
        const suffix = a.targetNsn ? ` — ${a.targetNsn}` : '';
        return `${labels[a.type]} (${a.qty})${suffix}`;
      })
      .join(', ') || '—'
  );
}

export function isShortfallUnresolved(line: PlanLine): boolean {
  return getLineStatus(line) === 'Shortfall' && line.shortfallActions.length === 0;
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

export function getGroupAvailableQty(line: PlanLine): number {
  if (isInterchangeableLine(line)) {
    return line.interchangeableMembers!.reduce((sum, member) => sum + member.availableQty, 0);
  }
  return line.availableQty;
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

export function hasResolutionRecorded(line: PlanLine): boolean {
  const status = getLineStatus(line);
  if (status === 'Shortfall') return line.shortfallActions.length > 0;
  if (status === 'Deviation') return !!(line.isAddedNsn || line.deviationReason?.trim());
  return false;
}

export function getLineActionLabel(line: PlanLine): 'Resolve' | 'Edit' | 'Deviate' {
  const status = getLineStatus(line);
  if (status === 'Shortfall') {
    return hasResolutionRecorded(line) ? 'Edit' : 'Resolve';
  }
  return 'Deviate';
}

export function lineNeedsApproval(line: PlanLine): boolean {
  if (isPolLine(line)) return false;
  const status = getLineStatus(line);
  if (status === 'Shortfall') return line.shortfallActions.length > 0;
  if (status === 'Deviation') {
    if (line.isAddedNsn) return true;
    return line.toBringQty > line.requiredQty;
  }
  return false;
}

/** Line has resolution recorded and belongs in the approval pack (not work queue). */
export function isInApprovalPack(line: PlanLine): boolean {
  return (
    lineNeedsApproval(line) &&
    hasResolutionRecorded(line) &&
    !isShortfallUnresolved(line)
  );
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
  if (getLineStatus(line) === 'Deviation') return line.deviationApproved === true;
  return false;
}

export function computeApprovalProgress(lines: PlanLine[]): { approved: number; total: number } {
  const needingApproval = lines.filter(lineNeedsApproval);
  const approved = needingApproval.filter(isLineApprovalComplete).length;
  return { approved, total: needingApproval.length };
}

export type LineApprovalStatus = 'unresolved' | 'unapproved' | 'approved';

export function getLineApprovalStatus(line: PlanLine): LineApprovalStatus {
  const status = getLineStatus(line);

  if (status === 'Shortfall') {
    if (isShortfallUnresolved(line)) return 'unresolved';
    if (isLineApprovalComplete(line)) return 'approved';
    return 'unapproved';
  }

  if (status === 'Deviation') {
    if (!hasResolutionRecorded(line)) return 'unresolved';
    if (isLineApprovalComplete(line)) return 'approved';
    return 'unapproved';
  }

  return 'approved';
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

/** Shortfalls without resolution — work queue only; deviations and POL are excluded. */
export function getWorkQueueLines(lines: PlanLine[]): PlanLine[] {
  return getOperationalLines(lines).filter(isShortfallUnresolved);
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
      filtered.filter((l) => getLineStatus(l) === 'Shortfall'),
    ),
    deviations: sortUnapprovedFirst(
      filtered.filter((l) => getLineStatus(l) === 'Deviation'),
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
    deviationApproved: getLineStatus(line) === 'Deviation' ? true : line.deviationApproved,
    shortfallActions: line.shortfallActions.map((action) => ({ ...action, approved: true })),
  };
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
  const { shortfalls, deviations } = getApprovalPackLines(lines, 'all');
  return shortfalls.length + deviations.length;
}

export function countApprovedPackLines(lines: PlanLine[]): number {
  return getApprovalPackLines(lines, 'approved').shortfalls.length +
    getApprovalPackLines(lines, 'approved').deviations.length;
}

export function countWorkQueueLines(lines: PlanLine[]): number {
  return getWorkQueueLines(lines).length;
}

export function getDeviationDelta(line: PlanLine): number {
  if (line.isAddedNsn) return line.toBringQty;
  return line.toBringQty - line.requiredQty;
}
