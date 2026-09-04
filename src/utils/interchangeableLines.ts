import type { PlanLine } from '../types/planLine';

/** Demo: interchangeable group as one combined warehouse qty (no per-member NSN selection). */
export function buildInterchangeableDemoLine(base: PlanLine): PlanLine {
  const requiredQty = 2;
  const availableQty = 1;

  return {
    ...base,
    description: 'Starter Generator (interchangeable group)',
    requiredQty,
    availableQty,
    toBringQty: 2,
    inventory: [
      {
        type: 'Main',
        nsn: base.nsn,
        description: 'Starter Generator — combined pool',
        location: 'WH-A / Rack 12',
        qty: 1,
        status: 'In WH',
      },
    ],
    shortfallActions: [
      {
        type: 'wait',
        qty: 1,
        remarks: 'Expedite starter generator repair',
        needByDate: '2026-03-01',
        approved: false,
      },
    ],
  };
}
