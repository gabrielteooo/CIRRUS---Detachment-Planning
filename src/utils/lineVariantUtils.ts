import { getComponentByNsn, parseComponentVariants } from '../data/lSeriesTemplate';
import type { Platform } from '../types/detachment';
import type { PlanLine } from '../types/planLine';

export function parsePlanVariantLabels(variant: string): string[] {
  return variant
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getLineApplicableVariants(
  line: PlanLine,
  platform: Platform,
  planVariants: string[],
): string[] {
  if (planVariants.length === 0) return [];

  const lookupNsn = line.nsn.replace(/-ALT$/, '');
  const component = getComponentByNsn(platform, lookupNsn);
  if (!component) return [...planVariants];

  const allowed = parseComponentVariants(component.variants);
  if (allowed.length === 0) return [...planVariants];

  return planVariants.filter((variant) => allowed.includes(variant));
}
