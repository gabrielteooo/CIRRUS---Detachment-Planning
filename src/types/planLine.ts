export type LineStatus = 'Met' | 'Deviation' | 'Shortfall';

export type ShortfallActionType = 'accept' | 'wait' | 'cannibalise';

export type DeviationReason = string;

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
  repairComponentRef: string;
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
  deviationApproved?: boolean;
  /** User-added NSN for exercise needs; not from L-series template. */
  isAddedNsn?: boolean;
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

export function getLineStatus(line: PlanLine): LineStatus {
  if (line.availableQty < line.requiredQty) return 'Shortfall';
  if (line.isAddedNsn || line.toBringQty > line.requiredQty) return 'Deviation';
  return 'Met';
}

export function getShortfallQty(line: PlanLine): number {
  return Math.max(0, line.requiredQty - line.availableQty);
}

export function computeFillRate(lines: PlanLine[]): number {
  if (lines.length === 0) return 0;
  const metCount = lines.filter((l) => getLineStatus(l) === 'Met').length;
  return Math.round((metCount / lines.length) * 100);
}

export function countShortfalls(lines: PlanLine[]): number {
  return lines.filter((l) => getLineStatus(l) === 'Shortfall').length;
}

export function countDeviations(lines: PlanLine[]): number {
  return lines.filter((l) => getLineStatus(l) === 'Deviation').length;
}

export function countCannibalisation(lines: PlanLine[]): number {
  return lines.filter((l) =>
    l.shortfallActions.some((a) => a.type === 'cannibalise'),
  ).length;
}

export function computePlanStatus(lines: PlanLine[]): 'Draft' | 'Partially Approved' | 'Approved' {
  const needsApproval = lines.filter(lineNeedsApproval);

  if (needsApproval.length === 0) return 'Draft';

  const { approved, total } = computeApprovalProgress(lines);

  if (approved === total) return 'Approved';
  if (approved > 0) return 'Partially Approved';
  return 'Draft';
}

export function formatShortfallActions(actions: ShortfallAction[]): string {
  const labels: Record<ShortfallActionType, string> = {
    accept: 'Accept shortfall',
    wait: 'Wait (expedite repair/new buys)',
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

export function lineNeedsApproval(line: PlanLine): boolean {
  const status = getLineStatus(line);
  if (status === 'Shortfall') return line.shortfallActions.length > 0;
  if (status === 'Deviation') {
    if (line.isAddedNsn) return true;
    return line.toBringQty > line.requiredQty;
  }
  return false;
}

export function isLineApprovalComplete(line: PlanLine): boolean {
  const status = getLineStatus(line);
  if (status === 'Shortfall') return allShortfallActionsApproved(line.shortfallActions);
  if (status === 'Deviation') return line.deviationApproved === true;
  return false;
}

export function computeApprovalProgress(lines: PlanLine[]): { approved: number; total: number } {
  const needingApproval = lines.filter(lineNeedsApproval);
  const approved = needingApproval.filter(isLineApprovalComplete).length;
  return { approved, total: needingApproval.length };
}
