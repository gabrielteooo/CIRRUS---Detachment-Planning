import type { Platform, PlatformPlan } from '../types/detachment';

export function formatVariantLabels(plan: PlatformPlan): string {
  return plan.variantRows.map((row) => row.variant).join(', ');
}

export function formatPlatformVariant(platform: Platform, plan: PlatformPlan): string {
  return `${platform} · ${formatVariantLabels(plan)}`;
}

export function formatVariantRowParameters(plan: PlatformPlan): string {
  if (plan.platform === 'F-16') {
    const hours = plan.flyingHours ?? plan.variantRows[0]?.parameterTier;
    if (hours == null) return '—';
    return `${plan.aircraftCount} aircraft · ${hours} hrs total`;
  }
  const count = plan.aircraftCount ?? plan.variantRows[0]?.parameterTier;
  if (count == null) return '—';
  return `${count} aircraft total`;
}

/** F-16: flying hours; CH-47: number of aircraft — for plan summary header. */
export function formatPlanOperationalParameters(plan: PlatformPlan): string {
  if (plan.platform === 'F-16') {
    const hours = plan.flyingHours ?? plan.variantRows[0]?.parameterTier;
    if (hours == null) return '—';
    return `${hours} hrs`;
  }
  const count = plan.aircraftCount ?? plan.variantRows[0]?.parameterTier;
  if (count == null) return '—';
  return `${count} aircraft`;
}

export function formatLSeriesVersions(plan: PlatformPlan): string {
  const versions = [...new Set(plan.variantRows.map((row) => row.lSeriesVersion))];
  return versions.join(', ');
}

export function getPrimaryVariant(plan: PlatformPlan): string {
  return plan.variantRows[0]?.variant ?? '';
}
