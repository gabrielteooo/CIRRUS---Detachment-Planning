import type { RepairEddOption } from '../types/planLine';
import type { DetachmentPlan } from '../types/detachment';
import { getDefaultPlanLinesForPlan } from '../utils/generatePlanLines';
import dayjs from 'dayjs';

export function getDefaultPlanLines(plan: DetachmentPlan): ReturnType<typeof getDefaultPlanLinesForPlan> {
  return getDefaultPlanLinesForPlan(plan);
}

/** Mock purchase orders with EDD on or before detachment need-by-date. */
export const COMPONENT_PO_OPTIONS: RepairEddOption[] = [
  {
    poNumber: 'PO1234567',
    nsn: '1560-01-234',
    description: 'Hydraulic Pump, Utility System',
    expectedDate: '2026-02-28',
  },
  {
    poNumber: 'PO2345678',
    nsn: '1560-01-246',
    description: 'Hydraulic Hose Assembly, High Pressure',
    expectedDate: '2026-02-25',
  },
  {
    poNumber: 'PO3456789',
    nsn: '1560-01-241',
    description: 'AN/APG-68 Radar LRU (Transmitter)',
    expectedDate: '2026-02-20',
  },
  {
    poNumber: 'PO4567890',
    nsn: '1560-01-232',
    description: 'Fuel Control Unit, Main Engine',
    expectedDate: '2026-02-27',
  },
  {
    poNumber: 'PO9999999',
    nsn: '1560-01-234',
    description: 'Hydraulic Pump, Utility System (late PO)',
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
