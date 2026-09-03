import { buildInterchangeableDemoLine } from './interchangeableLines';
import { mockMrpController } from './mrpController';
import type { Platform, PlatformPlan } from '../types/detachment';
import type { LSeriesRecord } from '../types/lSeries';
import type { InventoryItem, PlanLine } from '../types/planLine';
import {
  ensureLegacyApprovalSnapshots,
  getDefaultToBringQty,
  getGroupAvailableQty,
  getLineStatus,
  isPolLine,
  syncPlanLinesIssuance,
} from '../types/planLine';
import {
  L_SERIES_TEMPLATE,
  componentAppliesToVariant,
  getPolRequiredQty,
  resolveParameterTier,
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
  if (required === 0) return hashSeed(`${planId}-${nsn}-wh`) % 8;
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
  category?: ComponentCategory,
): InventoryItem[] {
  if (category === 'Consumable' || category === 'POL') {
    return buildBatchStyleInventory(nsn, description, availableQty);
  }

  return buildLruStyleInventory(nsn, description, availableQty);
}

function buildLruStyleInventory(
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

/** Consumables / POL — batch qty per SLOC (typically ≥ 10). */
function buildBatchStyleInventory(
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

  if (availableQty < 20) {
    return [
      {
        type: 'Main',
        nsn,
        description,
        location: 'WH-A / Rack 1',
        qty: availableQty,
        status: 'In WH',
      },
    ];
  }

  const firstBatch = Math.max(10, Math.floor(availableQty * 0.6));
  const secondBatch = availableQty - firstBatch;

  const items: InventoryItem[] = [
    {
      type: 'Main',
      nsn,
      description,
      location: 'WH-A / Rack 1',
      qty: firstBatch,
      status: 'In WH',
    },
  ];

  if (secondBatch >= 10) {
    items.push({
      type: 'Alt',
      nsn: `${nsn}-ALT`,
      description: `${description} (batch)`,
      location: 'WH-B / Rack 2',
      qty: secondBatch,
      status: 'In WH',
    });
  } else {
    items[0] = { ...items[0], qty: availableQty };
  }

  return items;
}

/** Ensure at least `minCount` operational lines are fulfilled with surplus available stock. */
function ensureFulfilledExcessInventory(lines: PlanLine[], minCount = 2): PlanLine[] {
  const result = lines.map((line) => ({ ...line }));

  const countExcessAvailable = () =>
    result.filter(
      (line) =>
        !isPolLine(line) &&
        !line.isAddedNsn &&
        line.requiredQty > 0 &&
        getLineStatus(line) === 'Available' &&
        getGroupAvailableQty(line) > line.requiredQty,
    ).length;

  if (countExcessAvailable() >= minCount) return result;

  for (let i = 0; i < result.length && countExcessAvailable() < minCount; i += 1) {
    const line = result[i];
    if (isPolLine(line) || line.isAddedNsn || line.requiredQty === 0) continue;
    if (getLineStatus(line) !== 'Available') continue;
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

  const rawParameterTier = plan.variantRows[0]?.parameterTier ?? 0;
  const parameterTier = resolveParameterTier(plan.platform, rawParameterTier);

  for (const component of template.components) {
    if (component.category === 'POL') continue;
    const qty = component.qtyByTier[String(parameterTier)] ?? 0;
    addComponent(component, qty);
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
    const inventory = buildInventory(nsn, description, availableQty, category);

    return {
      id: `${plan.id}-line-${index}`,
      nsn,
      description,
      requiredQty,
      availableQty,
      toBringQty: getDefaultToBringQty(requiredQty),
      issuedQty: 0,
      inventory,
      shortfallActions: [],
      componentCategory: category,
      uom,
      mpn,
      trade,
      system,
      remarks: '',
      mrpController: mockMrpController(plan.platform, nsn),
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
    toBringQty: getDefaultToBringQty(requiredQty),
    issuedQty: 0,
    inventory: buildInventory(component.nsn, component.description, requiredQty, 'POL'),
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


function buildAsRequiredDemoLine(
  planId: string,
  index: number,
  entry: {
    nsn: string;
    mpn: string;
    description: string;
    category: ComponentCategory;
    availableQty: number;
    toBringQty: number;
    issuedQty: number;
    remarks?: string;
  },
): PlanLine {
  const { nsn, description, availableQty, toBringQty, issuedQty, category, mpn, remarks } = entry;
  return {
    id: `${planId}-asreq-${index}`,
    nsn,
    description,
    requiredQty: 0,
    availableQty,
    toBringQty,
    issuedQty,
    inventory: buildInventory(nsn, description, availableQty, category),
    shortfallActions: [],
    componentCategory: category,
    mpn,
    remarks: remarks ?? '',
    mrpController: mockMrpController('F-16', nsn),
  };
}

/** Optional L-series lines (required = 0, tagged AR) for demo. */
function applyFalconAsRequiredDemo(planId: string, lines: PlanLine[]): PlanLine[] {
  const asRequiredLines = [
    buildAsRequiredDemoLine(planId, 1, {
      nsn: '1560-01-303',
      mpn: 'MPN-SAFE-08',
      description: 'Arming Safety Pin Kit, Flight Line',
      category: 'Consumable',
      availableQty: 12,
      toBringQty: 0,
      issuedQty: 0,
      remarks: 'Optional — bring if exercise arm/de-arm cycle requires',
    }),
    buildAsRequiredDemoLine(planId, 2, {
      nsn: '1560-01-304',
      mpn: 'MPN-LUBE-22',
      description: 'Hydraulic Fluid Servicing Kit',
      category: 'Consumable',
      availableQty: 6,
      toBringQty: 2,
      issuedQty: 0,
      remarks: 'Auto-issued — warehouse exceeds to-bring',
    }),
    buildAsRequiredDemoLine(planId, 3, {
      nsn: '1560-01-306',
      mpn: 'MPN-FUEL-09',
      description: 'Single-Point Refueling Adapter',
      category: 'LRU',
      availableQty: 2,
      toBringQty: 2,
      issuedQty: 1,
      remarks: 'OC approval — partial manual issue',
    }),
  ];

  return [...lines, ...asRequiredLines];
}

/** Demo scenario overlays for Exercise Falcon 2026 (plan-001). */
export function applyDemoScenario(planId: string, lines: PlanLine[]): PlanLine[] {
  if (planId !== 'plan-001') return lines;

  lines = applyFalconPolDemo(planId, lines);
  lines = applyFalconAsRequiredDemo(planId, lines);

  const patch = (nsn: string, updates: Partial<PlanLine>) => {
    const idx = lines.findIndex((l) => l.nsn === nsn);
    if (idx >= 0) lines[idx] = { ...lines[idx], ...updates };
  };

  patch('1560-01-2421', {
    availableQty: 0,
    toBringQty: 3,
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
    toBringQty: 1,
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
    toBringQty: 20,
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
    remarks: 'Include in deployment POL kit',
  });

  patch('1597-36-2840', {
    remarks: 'Include MSDS folder',
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
  return ensureLegacyApprovalSnapshots(
    syncPlanLinesIssuance(ensureFulfilledExcessInventory(withDemo)),
  );
}
