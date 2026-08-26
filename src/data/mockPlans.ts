import type { PlatformPlan } from '../types/detachment';
import type { PlanLine } from '../types/planLine';
import {
  computeFillRate,
  computePlanStatus,
  countDeviations,
  countShortfalls,
} from '../types/planLine';
import dayjs from 'dayjs';
import { MOCK_DETACHMENTS } from './mockDetachments';
import { L_SERIES_TEMPLATE, L_SERIES_VERSION_IDS } from './lSeriesTemplate';

export type GetPlanLines = (planId: string) => PlanLine[];

type PlanSeed = Omit<PlatformPlan, 'planDateStart' | 'planDateEnd' | 'aircraftCount' | 'flyingHours'>;

const MOCK_PLANS_RAW: PlanSeed[] = [
  {
    id: 'plan-001',
    detachmentId: 'det-001',
    platform: 'F-16',
    detachmentType: 'Long',
    lSeriesId: 'lseries-f16-long',
    needByDate: '2026-03-01',
    variantRows: [
      {
        variant: 'D',
        lSeriesVersion: 'L-F16-Long-2026',
        parameterTier: 200,
      },
    ],
    status: 'Partially Approved',
    fillRatePercent: 94,
    shortfallCount: 8,
    deviationCount: 5,
    cannibalisationCount: 2,
    createdBy: 'planner-1',
    createdByName: 'John Doe',
    lastUpdated: '2026-07-28T09:30:00',
  },
  {
    id: 'plan-002',
    detachmentId: 'det-002',
    platform: 'CH-47',
    detachmentType: 'Short',
    lSeriesId: 'lseries-ch47-short',
    needByDate: '2026-04-10',
    variantRows: [
      {
        variant: 'F',
        lSeriesVersion: 'L-CH47-Short-2026',
        parameterTier: 4,
      },
    ],
    status: 'Draft',
    fillRatePercent: 72,
    shortfallCount: 12,
    deviationCount: 0,
    cannibalisationCount: 0,
    createdBy: 'planner-2',
    createdByName: 'Jane Smith',
    lastUpdated: '2026-07-27T14:15:00',
  },
  {
    id: 'plan-003',
    detachmentId: 'det-003',
    platform: 'F-16',
    detachmentType: 'Short',
    lSeriesId: 'lseries-f16-short',
    needByDate: '2026-05-01',
    variantRows: [
      {
        variant: 'DU',
        lSeriesVersion: 'L-F16-Short-2026',
        parameterTier: 100,
      },
    ],
    status: 'Approved',
    fillRatePercent: 100,
    shortfallCount: 0,
    deviationCount: 2,
    cannibalisationCount: 1,
    createdBy: 'planner-1',
    createdByName: 'John Doe',
    lastUpdated: '2026-07-25T11:00:00',
  },
  {
    id: 'plan-joint-f16',
    detachmentId: 'det-joint',
    platform: 'F-16',
    detachmentType: 'Long Route Nav',
    lSeriesId: 'lseries-f16-long',
    needByDate: '2026-06-01',
    variantRows: [
      {
        variant: 'D',
        lSeriesVersion: 'L-F16-Long-2026',
        parameterTier: 200,
      },
      {
        variant: 'DU',
        lSeriesVersion: 'L-F16-Long-2026',
        parameterTier: 200,
      },
    ],
    status: 'Partially Approved',
    fillRatePercent: 89,
    shortfallCount: 5,
    deviationCount: 2,
    cannibalisationCount: 1,
    createdBy: 'planner-1',
    createdByName: 'John Doe',
    lastUpdated: '2026-07-26T12:00:00',
  },
  {
    id: 'plan-joint-ch47',
    detachmentId: 'det-joint',
    platform: 'CH-47',
    detachmentType: 'Near Sail',
    lSeriesId: 'lseries-ch47-long',
    needByDate: '2026-06-01',
    variantRows: [
      {
        variant: 'SD',
        lSeriesVersion: 'L-CH47-Long-2026',
        parameterTier: 2,
      },
      {
        variant: 'F',
        lSeriesVersion: 'L-CH47-Long-2026',
        parameterTier: 2,
      },
    ],
    status: 'Draft',
    fillRatePercent: 78,
    shortfallCount: 6,
    deviationCount: 0,
    cannibalisationCount: 0,
    createdBy: 'planner-2',
    createdByName: 'Jane Smith',
    lastUpdated: '2026-07-26T12:00:00',
  },
  {
    id: 'plan-004',
    detachmentId: 'det-004',
    platform: 'F-16',
    detachmentType: 'Long',
    lSeriesId: 'lseries-f16-long',
    needByDate: '2025-08-01',
    variantRows: [
      {
        variant: 'C',
        lSeriesVersion: 'L-F16-Long-2026',
        parameterTier: 300,
      },
    ],
    status: 'Approved',
    fillRatePercent: 100,
    shortfallCount: 0,
    deviationCount: 0,
    cannibalisationCount: 3,
    createdBy: 'planner-1',
    createdByName: 'John Doe',
    lastUpdated: '2025-09-01T08:00:00',
  },
  {
    id: 'plan-005',
    detachmentId: 'det-005',
    platform: 'CH-47',
    detachmentType: 'Short',
    lSeriesId: 'lseries-ch47-short',
    needByDate: '2025-11-01',
    variantRows: [
      {
        variant: 'F',
        lSeriesVersion: 'L-CH47-Short-2026',
        parameterTier: 2,
      },
    ],
    status: 'Approved',
    fillRatePercent: 96,
    shortfallCount: 0,
    deviationCount: 1,
    cannibalisationCount: 0,
    createdBy: 'planner-2',
    createdByName: 'Jane Smith',
    lastUpdated: '2025-11-20T16:45:00',
  },
  {
    id: 'plan-006',
    detachmentId: 'det-006',
    platform: 'CH-47',
    detachmentType: 'Far Sail',
    lSeriesId: 'lseries-ch47-long',
    needByDate: '2026-06-01',
    variantRows: [
      {
        variant: 'SD',
        lSeriesVersion: 'L-CH47-Long-2026',
        parameterTier: 2,
      },
    ],
    status: 'Draft',
    fillRatePercent: 88,
    shortfallCount: 3,
    deviationCount: 1,
    cannibalisationCount: 0,
    createdBy: 'planner-2',
    createdByName: 'Jane Smith',
    lastUpdated: '2026-07-26T10:00:00',
  },
  {
    id: 'plan-007',
    detachmentId: 'det-007',
    platform: 'F-16',
    detachmentType: 'Long',
    lSeriesId: 'lseries-f16-long',
    needByDate: '2025-06-01',
    variantRows: [
      {
        variant: 'D',
        lSeriesVersion: 'L-F16-Long-2026',
        parameterTier: 200,
      },
    ],
    status: 'Approved',
    fillRatePercent: 98,
    shortfallCount: 0,
    deviationCount: 3,
    cannibalisationCount: 1,
    createdBy: 'planner-1',
    createdByName: 'John Doe',
    lastUpdated: '2025-06-22T10:00:00',
  },
  {
    id: 'plan-008',
    detachmentId: 'det-008',
    platform: 'F-16',
    detachmentType: 'Long Route Nav',
    lSeriesId: 'lseries-f16-long',
    needByDate: '2025-04-01',
    variantRows: [
      {
        variant: 'DU',
        lSeriesVersion: 'L-F16-Long-2026',
        parameterTier: 400,
      },
    ],
    status: 'Approved',
    fillRatePercent: 100,
    shortfallCount: 0,
    deviationCount: 1,
    cannibalisationCount: 2,
    createdBy: 'planner-1',
    createdByName: 'John Doe',
    lastUpdated: '2025-04-20T14:00:00',
  },
  {
    id: 'plan-009',
    detachmentId: 'det-009',
    platform: 'CH-47',
    detachmentType: 'Near Sail',
    lSeriesId: 'lseries-ch47-long',
    needByDate: '2025-09-01',
    variantRows: [
      {
        variant: 'SD',
        lSeriesVersion: 'L-CH47-Long-2026',
        parameterTier: 3,
      },
    ],
    status: 'Approved',
    fillRatePercent: 95,
    shortfallCount: 0,
    deviationCount: 2,
    cannibalisationCount: 0,
    createdBy: 'planner-2',
    createdByName: 'Jane Smith',
    lastUpdated: '2025-09-17T09:00:00',
  },
  {
    id: 'plan-010',
    detachmentId: 'det-010',
    platform: 'F-16',
    detachmentType: 'Short',
    lSeriesId: 'lseries-f16-short',
    needByDate: '2025-02-01',
    variantRows: [
      {
        variant: 'C',
        lSeriesVersion: 'L-F16-Short-2026',
        parameterTier: 100,
      },
    ],
    status: 'Approved',
    fillRatePercent: 100,
    shortfallCount: 0,
    deviationCount: 0,
    cannibalisationCount: 0,
    createdBy: 'planner-1',
    createdByName: 'John Doe',
    lastUpdated: '2025-02-16T11:30:00',
  },
  {
    id: 'plan-011',
    detachmentId: 'det-011',
    platform: 'CH-47',
    detachmentType: 'Far Sail',
    lSeriesId: 'lseries-ch47-long',
    needByDate: '2025-07-01',
    variantRows: [
      {
        variant: 'F',
        lSeriesVersion: 'L-CH47-Long-2026',
        parameterTier: 5,
      },
    ],
    status: 'Approved',
    fillRatePercent: 92,
    shortfallCount: 0,
    deviationCount: 4,
    cannibalisationCount: 1,
    createdBy: 'planner-2',
    createdByName: 'Jane Smith',
    lastUpdated: '2025-07-24T16:00:00',
  },
  {
    id: 'plan-012',
    detachmentId: 'det-012',
    platform: 'F-16',
    detachmentType: 'Long',
    lSeriesId: 'lseries-f16-long',
    needByDate: '2024-10-01',
    variantRows: [
      {
        variant: 'D',
        lSeriesVersion: 'L-F16-Long-2026',
        parameterTier: 300,
      },
    ],
    status: 'Approved',
    fillRatePercent: 97,
    shortfallCount: 0,
    deviationCount: 2,
    cannibalisationCount: 1,
    createdBy: 'planner-1',
    createdByName: 'John Doe',
    lastUpdated: '2024-10-28T08:00:00',
  },
];

function withPlanDates(plan: PlanSeed): PlatformPlan {
  const det = MOCK_DETACHMENTS.find((d) => d.id === plan.detachmentId);
  if (!det) {
    return {
      ...plan,
      planDateStart: plan.needByDate,
      planDateEnd: plan.needByDate,
      aircraftCount:
        plan.platform === 'CH-47'
          ? (plan.variantRows[0]?.parameterTier ?? 1)
          : Math.max(1, plan.variantRows.length),
      flyingHours: plan.platform === 'F-16' ? plan.variantRows[0]?.parameterTier : undefined,
    };
  }

  const planEnd = dayjs(plan.needByDate).isAfter(dayjs(det.detachmentDateEnd))
    ? det.detachmentDateEnd
    : plan.needByDate;
  const tentativeStart = dayjs(planEnd).subtract(7, 'day');
  const planStart = tentativeStart.isBefore(dayjs(det.detachmentDateStart))
    ? det.detachmentDateStart
    : tentativeStart.format('YYYY-MM-DD');

  return {
    ...plan,
    planDateStart: planStart,
    planDateEnd: planEnd,
    aircraftCount:
      plan.platform === 'CH-47'
        ? (plan.variantRows[0]?.parameterTier ?? 1)
        : Math.max(1, plan.variantRows.length),
    flyingHours: plan.platform === 'F-16' ? plan.variantRows[0]?.parameterTier : undefined,
  };
}

export const MOCK_PLANS: PlatformPlan[] = MOCK_PLANS_RAW.map(withPlanDates);

export const PLATFORM_VARIANTS: Record<string, string[]> = {
  'F-16': ['C', 'D', 'CU', 'DU'],
  'CH-47': ['SD', 'F'],
};

export const L_SERIES_OPTIONS: Record<string, Record<string, string[]>> = {
  'F-16': Object.fromEntries(
    PLATFORM_VARIANTS['F-16'].map((v) => [v, [L_SERIES_VERSION_IDS['F-16']]]),
  ),
  'CH-47': Object.fromEntries(
    PLATFORM_VARIANTS['CH-47'].map((v) => [v, [L_SERIES_VERSION_IDS['CH-47']]]),
  ),
};

export const F16_FLYING_HOUR_TIERS = L_SERIES_TEMPLATE['F-16'].tiers;
export const CH47_AIRCRAFT_TIERS = L_SERIES_TEMPLATE['CH-47'].tiers;

export function formatPlatformVariant(platform: string, variant: string | string[]) {
  const label = Array.isArray(variant) ? variant.join(', ') : variant;
  return `${platform} · ${label}`;
}

export function getLSeriesOptionsForVariants(
  platform: string,
  variants: string[],
): { label: string; value: string }[] {
  const seen = new Set<string>();
  const options: { label: string; value: string }[] = [];
  for (const variant of variants) {
    for (const version of L_SERIES_OPTIONS[platform]?.[variant] ?? []) {
      if (!seen.has(version)) {
        seen.add(version);
        options.push({ label: version, value: version });
      }
    }
  }
  return options;
}

export function fillRateColor(percent: number): string {
  if (percent >= 95) return '#00636a';
  if (percent >= 80) return '#d48806';
  return '#cf1322';
}

export function aggregateDetachmentStatus(
  plans: PlatformPlan[],
  getPlanLines?: GetPlanLines,
): PlatformPlan['status'] {
  if (plans.length === 0) return 'Draft';
  const statuses = getPlanLines
    ? plans.map((p) => computePlanStatus(getPlanLines(p.id)))
    : plans.map((p) => p.status);
  if (statuses.every((s) => s === 'Approved')) return 'Approved';
  if (statuses.some((s) => s === 'Partially Approved')) return 'Partially Approved';
  return 'Draft';
}

export function aggregateFillRate(plans: PlatformPlan[], getPlanLines: GetPlanLines): number {
  if (plans.length === 0) return 0;
  return Math.round(
    plans.reduce((sum, p) => sum + computeFillRate(getPlanLines(p.id)), 0) / plans.length,
  );
}

export function aggregateShortfalls(plans: PlatformPlan[], getPlanLines: GetPlanLines): number {
  return plans.reduce((sum, p) => sum + countShortfalls(getPlanLines(p.id)), 0);
}

export function aggregateDeviations(plans: PlatformPlan[], getPlanLines: GetPlanLines): number {
  return plans.reduce((sum, p) => sum + countDeviations(getPlanLines(p.id)), 0);
}
