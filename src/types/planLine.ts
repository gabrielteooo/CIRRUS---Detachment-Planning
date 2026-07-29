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
}

export interface WaitShortfallAction {
  type: 'wait';
  qty: number;
  repairComponentRef: string;
  needByDate: string;
  approved: boolean;
}

export interface CannibaliseShortfallAction {
  type: 'cannibalise';
  qty: number;
  tailNumber: string;
  workCentreComments: string;
  confirmedWithWorkCentre: boolean;
  approved: boolean;
}

export type ShortfallAction =
  | AcceptShortfallAction
  | WaitShortfallAction
  | CannibaliseShortfallAction;

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
  if (line.toBringQty > line.requiredQty) return 'Deviation';
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
  return actions.map((a) => `${labels[a.type]} (${a.qty})`).join(', ') || '—';
}

export function allShortfallActionsApproved(actions: ShortfallAction[]): boolean {
  return actions.length > 0 && actions.every((a) => a.approved);
}

export function lineNeedsApproval(line: PlanLine): boolean {
  const status = getLineStatus(line);
  if (status === 'Shortfall') return line.shortfallActions.length > 0;
  if (status === 'Deviation') return line.toBringQty > line.requiredQty;
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
