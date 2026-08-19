import { buildInterchangeableDemoLine } from './interchangeableLines';
import { createAddedPlanLine } from './addedPlanLines';
import { NSN_CATALOG } from '../data/nsnCatalog';
import type { Platform, PlatformPlan } from '../types/detachment';
import type { LSeriesRecord } from '../types/lSeries';
import type { InventoryItem, PlanLine } from '../types/planLine';
import {
  getGroupAvailableQty,
  getLineStatus,
  isPolLine,
} from '../types/planLine';
import {
  L_SERIES_TEMPLATE,
  componentAppliesToVariant,
  getPolRequiredQty,
  type ComponentCategory,
  type LSComponent,
  type LSPlatformTemplate,
} from '../data/lSeriesTemplate';

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

/** Ensure at least `minCount` operational lines are fulfilled with surplus available stock. */
function ensureFulfilledExcessInventory(lines: PlanLine[], minCount = 2): PlanLine[] {
  const result = lines.map((line) => ({ ...line }));

  const countExcessMet = () =>
    result.filter(
      (line) =>
        !isPolLine(line) &&
        !line.isAddedNsn &&
        getLineStatus(line) === 'Met' &&
        getGroupAvailableQty(line) > line.requiredQty,
    ).length;

  if (countExcessMet() >= minCount) return result;

  for (let i = 0; i < result.length && countExcessMet() < minCount; i += 1) {
    const line = result[i];
    if (isPolLine(line) || line.isAddedNsn) continue;
    if (getLineStatus(line) !== 'Met') continue;
    if (getGroupAvailableQty(line) > line.requiredQty) continue;

    const availableQty = line.requiredQty + 2;
    result[i] = {
      ...line,
      availableQty,
      toBringQty: line.requiredQty,
      inventory: buildInventory(line.nsn, line.description, availableQty),
    };
  }

  return result;
}

export function getRequiredQty(
  platform: Platform,
  tier: number,
  nsn: string,
  template: LSPlatformTemplate = L_SERIES_TEMPLATE[platform],
): number {
  const component = template.components.find((c) => c.nsn === nsn);
  if (!component) return 0;
  return component.qtyByTier[String(tier)] ?? 0;
}

function resolvePlanTemplate(plan: PlatformPlan, lSeriesRecords: LSeriesRecord[]): LSPlatformTemplate {
  const record = lSeriesRecords.find((item) => item.id === plan.lSeriesId);
  if (record) return record.template;
  return L_SERIES_TEMPLATE[plan.platform];
}

function computeRequiredQtyByNsn(
  plan: PlatformPlan,
  template: LSPlatformTemplate,
): Map<
  string,
  {
    qty: number;
    description: string;
    category: ComponentCategory;
    uom?: string;
    mpn?: string;
    trade?: string;
    system?: string;
  }
> {
  const nsnMap = new Map<
    string,
    {
      qty: number;
      description: string;
      category: ComponentCategory;
      uom?: string;
      mpn?: string;
      trade?: string;
      system?: string;
    }
  >();

  const addComponent = (
    component: (typeof template.components)[number],
    qty: number,
  ) => {
    if (qty <= 0) return;
    const existing = nsnMap.get(component.nsn);
    if (existing) {
      existing.qty += qty;
      return;
    }
    nsnMap.set(component.nsn, {
      qty,
      description: component.description,
      category: component.category,
      uom: component.uom,
      mpn: component.mpn,
      trade: component.trade,
      system: component.system,
    });
  };

  for (const row of plan.variantRows) {
    for (const component of template.components) {
      if (component.category === 'POL') continue;
      const qty = component.qtyByTier[String(row.parameterTier)] ?? 0;
      addComponent(component, qty);
    }
  }

  const planVariants = new Set(plan.variantRows.map((row) => row.variant));
  for (const component of template.components) {
    if (component.category !== 'POL') continue;
    const appliesToPlan = [...planVariants].some((variant) =>
      componentAppliesToVariant(component, variant),
    );
    if (!appliesToPlan) continue;
    addComponent(component, getPolRequiredQty(component));
  }

  return nsnMap;
}

export function buildPlanLinesFromTemplate(
  plan: PlatformPlan,
  lSeriesRecords: LSeriesRecord[] = [],
): PlanLine[] {
  const template = resolvePlanTemplate(plan, lSeriesRecords);
  const nsnMap = computeRequiredQtyByNsn(plan, template);
  let index = 0;

  return [...nsnMap.entries()].map(([nsn, { qty: requiredQty, description, category, uom, mpn, trade, system }]) => {
    index += 1;
    const isPol = category === 'POL';
    const availableQty = isPol
      ? requiredQty
      : mockAvailableQty(requiredQty, nsn, plan.id);
    const inventory = buildInventory(nsn, description, availableQty);

    return {
      id: `${plan.id}-line-${index}`,
      nsn,
      description,
      requiredQty,
      availableQty,
      toBringQty: isPol ? 0 : requiredQty,
      inventory,
      shortfallActions: [],
      componentCategory: category,
      uom,
      mpn,
      trade,
      system,
      remarks: '',
    };
  });
}

/** POL lines shown on Exercise Falcon 2026 (plan-001) for demo clarity. */
const FALCON_DEMO_POL_NSNS = [
  '5831-04-7296', // Aviation Turbine Fuel
  '8316-27-4905', // Wide-Temperature Aircraft Grease
  '3950-74-8216', // Instrument Lubricating Oil
  '1597-36-2840', // Corrosion-Preventive Compound
];

function buildPolPlanLine(lineId: string, component: LSComponent): PlanLine {
  const requiredQty = getPolRequiredQty(component);
  return {
    id: lineId,
    nsn: component.nsn,
    description: component.description,
    requiredQty,
    availableQty: requiredQty,
    toBringQty: 0,
    inventory: buildInventory(component.nsn, component.description, requiredQty),
    shortfallActions: [],
    componentCategory: 'POL',
    uom: component.uom,
    mpn: component.mpn,
    remarks: '',
  };
}

/** Template POL rows share NSNs with consumables — inject four explicit POL lines for demo. */
function applyFalconPolDemo(planId: string, lines: PlanLine[]): PlanLine[] {
  const template = L_SERIES_TEMPLATE['F-16'];
  const withoutPolConflicts = lines.filter(
    (line) =>
      line.componentCategory !== 'POL' && !FALCON_DEMO_POL_NSNS.includes(line.nsn),
  );

  const polLines = FALCON_DEMO_POL_NSNS.flatMap((nsn, index) => {
    const component = template.components.find((c) => c.nsn === nsn && c.category === 'POL');
    if (!component) return [];

    const existing = lines.find((line) => line.nsn === nsn);
    return [buildPolPlanLine(existing?.id ?? `${planId}-pol-${index + 1}`, component)];
  });

  return [...withoutPolConflicts, ...polLines];
}

/** Two default deviations for Exercise Falcon 2026 demo — one added NSN, one excess to-bring. */
function applyFalconDeviationDemo(planId: string, lines: PlanLine[]): PlanLine[] {
  const catalogEntry = NSN_CATALOG.find((entry) => entry.nsn === '1560-01-305');
  if (!catalogEntry) return lines;

  const addedDeviation: PlanLine = {
    ...createAddedPlanLine(
      planId,
      catalogEntry,
      0,
      'Deployable secure radio requested per exercise comms plan',
    ),
    id: `${planId}-demo-deviation-added-1`,
  };

  return [addedDeviation, ...lines];
}

/** Demo scenario overlays for Exercise Falcon 2026 (plan-001). */
export function applyDemoScenario(planId: string, lines: PlanLine[]): PlanLine[] {
  if (planId !== 'plan-001') return lines;

  lines = applyFalconPolDemo(planId, lines);
  lines = applyFalconDeviationDemo(planId, lines);

  const patch = (nsn: string, updates: Partial<PlanLine>) => {
    const idx = lines.findIndex((l) => l.nsn === nsn);
    if (idx >= 0) lines[idx] = { ...lines[idx], ...updates };
  };

  patch('1560-01-2421', {
    availableQty: 0,
    toBringQty: 2,
    inventory: [
      { type: 'Main', nsn: '1560-01-2421', description: 'Hydraulic Pump', location: 'WH-A / Rack 3', qty: 1, status: 'In WH' },
      { type: 'Alt', nsn: '1560-01-2421-ALT', description: 'Hydraulic Pump (alternate)', location: 'WH-B / Rack 1', qty: 0, status: 'Blocked' },
    ],
    shortfallActions: [
      { type: 'wait', qty: 1, needByDate: '2026-03-01', remarks: 'Expedite repair — PO1234567 expected end Feb', approved: false },
      { type: 'cannibalise', qty: 1, tailNumber: '987', workCentreComments: 'Confirmed with Hangar 3 MRO', confirmedWithWorkCentre: true, approved: false },
      { type: 'cannibalise', qty: 1, tailNumber: '654', workCentreComments: 'Secondary source aircraft', confirmedWithWorkCentre: true, approved: false },
    ],
  });

  patch('1560-01-2311', {
    availableQty: 0,
    toBringQty: 0,
    inventory: [
      { type: 'Main', nsn: '1560-01-2311', description: 'Engine Fuel Pump', location: 'WH-A / Rack 7', qty: 0, status: 'QI' },
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

  patch('1560-01-2355', {
    availableQty: 0,
    inventory: [
      { type: 'Main', nsn: '1560-01-2355', description: 'Radar Line-Replaceable Unit', location: 'WH-D / Secure', qty: 0, status: 'QIT' },
    ],
    shortfallActions: [],
  });

  patch('1597-36-2822', {
    availableQty: 3,
    toBringQty: 5,
    shortfallActions: [
      { type: 'wait', qty: 2, needByDate: '2026-03-01', remarks: 'Awaiting filter element delivery from supplier', approved: true },
    ],
    offlineApproval: {
      approverName: 'LTC Tan Wei Ming',
      approvedDate: '2026-02-12',
      meeting: 'Detachment readiness board',
    },
  });

  patch('5831-04-7296', {
    toBringQty: lines.find((l) => l.nsn === '5831-04-7296')?.requiredQty ?? 0,
    remarks: 'Fuel uplift confirmed with host nation',
  });

  patch('8316-27-4905', {
    toBringQty: lines.find((l) => l.nsn === '8316-27-4905')?.requiredQty ?? 0,
    remarks: 'Grease kits staged at deployment pack line',
  });

  patch('3950-74-8216', {
    toBringQty: 0,
    remarks: 'Include in deployment POL kit',
  });

  patch('1597-36-2840', {
    toBringQty: 0,
    remarks: 'Include MSDS folder',
  });

  patch('1560-01-2322', {
    availableQty: 3,
    toBringQty: 1,
    inventory: buildInventory('1560-01-2322', 'Engine Oil Pump', 3),
  });

  patch('1560-01-2344', {
    availableQty: 2,
    toBringQty: 2,
    deviationReason: 'Carry one spare generator beyond L-series allowance for exercise redundancy',
    inventory: buildInventory('1560-01-2344', 'Main Generator', 2),
  });

  const starterGenIdx = lines.findIndex((l) => l.nsn === '1560-01-2333');
  if (starterGenIdx >= 0) {
    lines[starterGenIdx] = buildInterchangeableDemoLine(lines[starterGenIdx]);
  }

  return lines;
}

export function getDefaultPlanLinesForPlan(
  plan: PlatformPlan,
  lSeriesRecords: LSeriesRecord[] = [],
): PlanLine[] {
  const lines = buildPlanLinesFromTemplate(plan, lSeriesRecords);
  const withDemo = applyDemoScenario(plan.id, lines);
  return ensureFulfilledExcessInventory(withDemo);
}
