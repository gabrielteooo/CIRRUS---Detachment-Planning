export type UserRole = 'planner' | 'director';

export type Platform = 'F-16' | 'CH-47';

export type PlanStatus = 'Draft' | 'Partially Approved' | 'Approved';

export interface DetachmentPlan {
  id: string;
  name: string;
  platform: Platform;
  variant: string;
  lSeriesVersion: string;
  parameterLabel: string;
  parameterValue: string;
  needByDate: string;
  detachmentDate: string;
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
