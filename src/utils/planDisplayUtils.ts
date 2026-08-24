import type { Platform, PlatformPlan } from '../types/detachment';

export function formatVariantLabels(plan: PlatformPlan): string {
  return plan.variantRows.map((row) => row.variant).join(', ');
}

export function formatPlatformVariant(platform: Platform, plan: PlatformPlan): string {
  return `${platform} · ${formatVariantLabels(plan)}`;
}

export function formatVariantRowParameters(plan: PlatformPlan): string {
  const tier = plan.variantRows[0]?.parameterTier;
  if (tier == null) return '—';
  return plan.platform === 'F-16' ? `${tier} hrs total` : `${tier} aircraft total`;
}

export function formatLSeriesVersions(plan: PlatformPlan): string {
  const versions = [...new Set(plan.variantRows.map((row) => row.lSeriesVersion))];
  return versions.join(', ');
}

export function getPrimaryVariant(plan: PlatformPlan): string {
  return plan.variantRows[0]?.variant ?? '';
}
