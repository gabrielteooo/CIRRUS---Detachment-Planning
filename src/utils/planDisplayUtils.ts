import type { Platform, PlatformPlan } from '../types/detachment';

export function formatVariantLabels(plan: PlatformPlan): string {
  return plan.variantRows.map((row) => row.variant).join(', ');
}

export function formatPlatformVariant(platform: Platform, plan: PlatformPlan): string {
  return `${platform} · ${formatVariantLabels(plan)}`;
}

export function formatVariantRowParameters(plan: PlatformPlan): string {
  return plan.variantRows
    .map((row) => {
      const value =
        plan.platform === 'F-16'
          ? `${row.parameterTier} hrs`
          : `${row.parameterTier} aircraft`;
      return `${row.variant}: ${value}`;
    })
    .join(' · ');
}

export function formatLSeriesVersions(plan: PlatformPlan): string {
  const versions = [...new Set(plan.variantRows.map((row) => row.lSeriesVersion))];
  return versions.join(', ');
}

export function getPrimaryVariant(plan: PlatformPlan): string {
  return plan.variantRows[0]?.variant ?? '';
}
