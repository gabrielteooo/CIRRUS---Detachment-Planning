import type { RepairEddOption } from '../types/planLine';
import type { PlatformPlan } from '../types/detachment';
import { getDefaultPlanLinesForPlan } from '../utils/generatePlanLines';
import dayjs from 'dayjs';

export function getDefaultPlanLines(plan: PlatformPlan): ReturnType<typeof getDefaultPlanLinesForPlan> {
  return getDefaultPlanLinesForPlan(plan);
}

/** Mock purchase orders with EDD on or before detachment need-by-date. */
export const COMPONENT_PO_OPTIONS: RepairEddOption[] = [
  {
    poNumber: 'PO1234567',
    nsn: '1560-01-2421',
    description: 'Hydraulic Pump',
    expectedDate: '2026-02-28',
  },
  {
    poNumber: 'PO2345678',
    nsn: '7045-18-2639',
    description: 'Hydraulic Filter Element',
    expectedDate: '2026-02-25',
  },
  {
    poNumber: 'PO3456789',
    nsn: '1560-01-2355',
    description: 'Radar Line-Replaceable Unit',
    expectedDate: '2026-02-20',
  },
  {
    poNumber: 'PO4567890',
    nsn: '1560-01-2311',
    description: 'Engine Fuel Pump',
    expectedDate: '2026-02-27',
  },
  {
    poNumber: 'PO9999999',
    nsn: '1560-01-2421',
    description: 'Hydraulic Pump (late PO)',
    expectedDate: '2026-03-15',
  },
];

export function getComponentPoOptionsForNsn(
  nsn: string,
  needByDate: string,
): RepairEddOption[] {
  const nbd = dayjs(needByDate).startOf('day');
  return COMPONENT_PO_OPTIONS.filter(
    (po) => po.nsn === nsn && dayjs(po.expectedDate).startOf('day').isBefore(nbd),
  );
}

/** @deprecated Use COMPONENT_PO_OPTIONS */
export const REPAIR_EDD_OPTIONS = COMPONENT_PO_OPTIONS;
