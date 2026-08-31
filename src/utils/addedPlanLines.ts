import type { NsnCatalogEntry } from '../data/nsnCatalog';
import type { Platform } from '../types/detachment';
import type { InventoryItem, PlanLine } from '../types/planLine';
import { mockMrpController } from './mrpController';

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
      status: 'In WH',
    });
  }

  return items;
}

export function createAddedPlanLine(
  planId: string,
  entry: NsnCatalogEntry,
  index: number,
  deviationReason: string,
  platform?: Platform,
): PlanLine {
  const requiredQty = 0;
  const availableQty = entry.availableQty;
  const toBringQty = availableQty > 0 ? 1 : 0;

  return {
    id: `${planId}-added-${Date.now()}-${index}`,
    nsn: entry.nsn,
    description: entry.description,
    requiredQty,
    availableQty,
    toBringQty,
    inventory: buildInventory(entry.nsn, entry.description, availableQty),
    shortfallActions: [],
    isAddedNsn: true,
    deviationReason,
    mrpController: platform ? mockMrpController(platform, entry.nsn) : undefined,
  };
}

export function createAddedPlanLines(
  planId: string,
  entries: NsnCatalogEntry[],
  deviationReason: string,
  platform?: Platform,
): PlanLine[] {
  const timestamp = Date.now();
  return entries.map((entry, index) => ({
    ...createAddedPlanLine(planId, entry, index, deviationReason, platform),
    id: `${planId}-added-${timestamp}-${index}`,
  }));
}
