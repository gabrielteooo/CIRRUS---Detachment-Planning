export type UserRole = 'planner' | 'director';

export type Platform = 'F-16' | 'CH-47';

export type PlanStatus = 'Draft' | 'Partially Approved' | 'Approved';

export type DetachmentType =
  | 'Short'
  | 'Long'
  | 'Long Route Nav'
  | 'Far Sail'
  | 'Near Sail';

export const DETACHMENT_TYPE_OPTIONS: DetachmentType[] = [
  'Short',
  'Long',
  'Long Route Nav',
  'Far Sail',
  'Near Sail',
];

/** Director-created exercise container — name and date range. */
export interface Detachment {
  id: string;
  name: string;
  detachmentDateStart: string;
  detachmentDateEnd: string;
  createdBy: string;
  createdByName: string;
  lastUpdated: string;
}

/** Per-variant configuration within a platform plan. */
export interface PlanVariantRow {
  variant: string;
  lSeriesVersion: string;
  parameterTier: number;
}

/** Planner-created platform plan linked to a detachment. */
export interface PlatformPlan {
  id: string;
  detachmentId: string;
  platform: Platform;
  detachmentType: DetachmentType;
  lSeriesId: string;
  needByDate: string;
  /** Planner-defined date range within the parent detachment window. */
  planDateStart: string;
  planDateEnd: string;
  aircraftCount: number;
  /** F-16 only — combined flying hours across selected aircraft. */
  flyingHours?: number;
  variantRows: PlanVariantRow[];
  status: PlanStatus;
  fillRatePercent: number;
  shortfallCount: number;
  deviationCount: number;
  cannibalisationCount: number;
  createdBy: string;
  createdByName: string;
  lastUpdated: string;
  remarks?: string;
}

/** @deprecated Use PlatformPlan */
export type DetachmentPlan = PlatformPlan & {
  name?: string;
  variant?: string;
  lSeriesVersion?: string;
  parameterLabel?: string;
  parameterValue?: string;
  detachmentDate?: string;
  detachmentType?: DetachmentType;
};

export interface User {
  id: string;
  name: string;
  initials: string;
  role: UserRole;
}

export const PLANNER_USER: User = {
  id: 'planner-1',
  name: 'John Doe',
  initials: 'JD',
  role: 'planner',
};

export const DIRECTOR_USER: User = {
  id: 'director-1',
  name: 'Sarah Chen',
  initials: 'SC',
  role: 'director',
};

export const DATA_SYNC_TIMESTAMP = '31 Jan 2026, 09:15 SGT';
