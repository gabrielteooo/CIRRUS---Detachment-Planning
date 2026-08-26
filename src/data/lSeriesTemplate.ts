import type { Platform } from '../types/detachment';
import { getCatalogEntry } from './nsnCatalog';
import lSeriesData from './lSeriesData.json';

export type ComponentCategory = 'LRU' | 'Consumable' | 'POL';

export interface LSComponent {
  category: ComponentCategory;
  nsn: string;
  mpn: string;
  description: string;
  qtyByTier: Record<string, number>;
  trade?: string;
  system?: string;
  variants?: string;
  uom?: string;
}

export interface LSPlatformTemplate {
  paramLabel: string;
  tiers: number[];
  components: LSComponent[];
}

export const L_SERIES_TEMPLATE = lSeriesData as Record<Platform, LSPlatformTemplate>;

export function resolveParameterTier(platform: Platform, value: number): number {
  const tiers = L_SERIES_TEMPLATE[platform].tiers;
  const eligible = tiers.filter((tier) => tier <= value);
  if (eligible.length === 0) return tiers[0];
  return Math.max(...eligible);
}

export const L_SERIES_VERSION_IDS = {
  'F-16': 'L-F16-2026-TEMPLATE',
  'CH-47': 'L-CH47-2026-TEMPLATE',
} as const;

export const COMPONENT_CATEGORIES: ComponentCategory[] = ['LRU', 'Consumable', 'POL'];

export function getMpnForNsn(nsn: string): string {
  const catalogEntry = getCatalogEntry(nsn);
  if (catalogEntry) return catalogEntry.mpn;

  const interchangeableMpns: Record<string, string> = {
    '1560-01-2333-A': 'MPN-SG-A',
    '1560-01-2333-B': 'MPN-SG-B',
    '1560-01-2333-C': 'MPN-SG-C',
    '1560-01-2333-D': 'MPN-SG-D',
  };
  if (interchangeableMpns[nsn]) return interchangeableMpns[nsn];

  const base = nsn.replace(/-ALT$/, '');
  for (const template of Object.values(L_SERIES_TEMPLATE)) {
    const found = template.components.find((c) => c.nsn === base);
    if (found) return found.mpn;
  }
  return base;
}

export function getComponentByNsn(platform: Platform, nsn: string): LSComponent | undefined {
  return L_SERIES_TEMPLATE[platform].components.find((c) => c.nsn === nsn);
}

export function parseComponentVariants(variants?: string): string[] {
  return (variants ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function componentAppliesToVariant(component: LSComponent, variant: string): boolean {
  const allowed = parseComponentVariants(component.variants);
  if (allowed.length === 0) return true;
  return allowed.includes(variant);
}

/** POL qty is fixed per variant applicability — not tied to flying hours / aircraft count tiers. */
export function getPolRequiredQty(component: LSComponent): number {
  const qtyValues = Object.values(component.qtyByTier);
  return qtyValues.length > 0 ? qtyValues[0] : 0;
}
