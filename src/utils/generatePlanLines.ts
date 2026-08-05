import { buildInterchangeableDemoLine } from './interchangeableLines';
import { L_SERIES_TEMPLATE } from '../data/lSeriesTemplate';
import type { Platform, PlatformPlan } from '../types/detachment';
import type { InventoryItem, PlanLine } from '../types/planLine';

function hashSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

function mockAvailableQty(required: number, nsn: string, planId: string): number {
  if (required === 0) return 0;
  const seed = hashSeed(`${planId}-${nsn}`) % 100;
  if (seed < 12) return Math.max(0, required - 2);
  if (seed < 22) return Math.max(0, required - 1);
  if (seed < 30) return required + 1;
  return required;
}

function buildInventory(
  nsn: string,
  description: string,
  availableQty: number,
): InventoryItem[] {
  if (availableQty <= 0) {
    return [
      {
        type: 'Main',
        nsn,
        description,
        location: 'WH-A / Rack 1',
        qty: 0,
        status: 'QIT',
      },
    ];
  }

  const mainQty = Math.max(0, Math.floor(availableQty * 0.65));
  const altQty = availableQty - mainQty;

  const items: InventoryItem[] = [
    {
      type: 'Main',
      nsn,
      description,
      location: 'WH-A / Rack 1',
      qty: mainQty,
      status: 'In WH',
    },
  ];

  if (altQty > 0) {
    items.push({
      type: 'Alt',
      nsn: `${nsn}-ALT`,
      description: `${description} (alternate)`,
      location: 'WH-B / Rack 2',
      qty: altQty,
      status: hashSeed(nsn) % 5 === 0 ? 'Blocked' : 'In WH',
    });
  }

  return items;
}

export function getRequiredQty(platform: Platform, tier: number, nsn: string): number {
  const component = L_SERIES_TEMPLATE[platform].components.find((c) => c.nsn === nsn);
  if (!component) return 0;
  return component.qtyByTier[String(tier)] ?? 0;
}

function computeRequiredQtyByNsn(plan: PlatformPlan): Map<string, { qty: number; description: string }> {
  const template = L_SERIES_TEMPLATE[plan.platform];
  const nsnMap = new Map<string, { qty: number; description: string }>();

  for (const row of plan.variantRows) {
    for (const component of template.components) {
      const qty = component.qtyByTier[String(row.parameterTier)] ?? 0;
      const existing = nsnMap.get(component.nsn);
      if (existing) {
        existing.qty += qty;
      } else {
        nsnMap.set(component.nsn, { qty, description: component.description });
      }
    }
  }

  return nsnMap;
}

export function buildPlanLinesFromTemplate(plan: PlatformPlan): PlanLine[] {
  const nsnMap = computeRequiredQtyByNsn(plan);
  let index = 0;

  return [...nsnMap.entries()].map(([nsn, { qty: requiredQty, description }]) => {
    index += 1;
    const availableQty = mockAvailableQty(requiredQty, nsn, plan.id);
    const inventory = buildInventory(nsn, description, availableQty);

    return {
      id: `${plan.id}-line-${index}`,
      nsn,
      description,
      requiredQty,
      availableQty,
      toBringQty: requiredQty,
      inventory,
      shortfallActions: [],
    };
  });
}

/** Demo scenario overlays for Exercise Falcon 2026 (plan-001). */
export function applyDemoScenario(planId: string, lines: PlanLine[]): PlanLine[] {
  if (planId !== 'plan-001') return lines;

  const patch = (nsn: string, updates: Partial<PlanLine>) => {
    const idx = lines.findIndex((l) => l.nsn === nsn);
    if (idx >= 0) lines[idx] = { ...lines[idx], ...updates };
  };

  patch('1560-01-234', {
    availableQty: 0,
    toBringQty: 2,
    inventory: [
      { type: 'Main', nsn: '1560-01-234', description: 'Hydraulic Pump, Utility System', location: 'WH-A / Rack 3', qty: 1, status: 'In WH' },
      { type: 'Alt', nsn: '1560-01-234-ALT', description: 'Hydraulic Pump, Utility System (alternate)', location: 'WH-B / Rack 1', qty: 0, status: 'Blocked' },
    ],
    shortfallActions: [
      { type: 'wait', qty: 1, needByDate: '2026-03-01', repairComponentRef: 'PO1234567', approved: false },
      { type: 'cannibalise', qty: 1, tailNumber: 'AF-2041', workCentreComments: 'Confirmed with Hangar 3 MRO', confirmedWithWorkCentre: true, approved: false },
    ],
  });

  patch('1560-01-232', {
    availableQty: 0,
    toBringQty: 0,
    inventory: [
      { type: 'Main', nsn: '1560-01-232', description: 'Fuel Control Unit, Main Engine', location: 'WH-A / Rack 7', qty: 0, status: 'QI' },
    ],
    shortfallActions: [
      {
        type: 'accept',
        qty: 1,
        remarks: 'Accept operational risk — reduced sortie rate agreed',
        approved: false,
      },
    ],
  });

  patch('1560-01-230', {
    availableQty: 6,
    toBringQty: 5,
  });

  patch('1560-01-245', {
    availableQty: 30,
    toBringQty: (lines.find((l) => l.nsn === '1560-01-245')?.requiredQty ?? 20) + 5,
    deviationReason: 'Exercise needs',
    deviationRemarks: 'Additional fasteners for extended deployment',
    offlineApproval: {
      approverName: 'MAJ Chen Li Hua',
      approvedDate: '2026-02-10',
    },
  });

  patch('1560-01-241', {
    availableQty: 0,
    inventory: [
      { type: 'Main', nsn: '1560-01-241', description: 'AN/APG-68 Radar LRU (Transmitter)', location: 'WH-D / Secure', qty: 0, status: 'QIT' },
    ],
    shortfallActions: [],
  });

  patch('1560-01-246', {
    availableQty: 3,
    toBringQty: 5,
    shortfallActions: [
      { type: 'wait', qty: 2, needByDate: '2026-03-01', repairComponentRef: 'PO2345678', approved: true },
    ],
    offlineApproval: {
      approverName: 'LTC Tan Wei Ming',
      approvedDate: '2026-02-12',
    },
  });

  const igniterIdx = lines.findIndex((l) => l.nsn === '1560-01-233');
  if (igniterIdx >= 0) {
    lines[igniterIdx] = buildInterchangeableDemoLine(lines[igniterIdx]);
  }

  return lines;
}

export function getDefaultPlanLinesForPlan(plan: PlatformPlan): PlanLine[] {
  const lines = buildPlanLinesFromTemplate(plan);
  return applyDemoScenario(plan.id, lines);
}
