import dayjs from 'dayjs';
import type { Detachment, PlatformPlan } from '../types/detachment';

/** Fixed reference date so open/past tabs match mock data during demo. */
export const PROTOTYPE_TODAY = '2026-03-01';

export function today(): dayjs.Dayjs {
  return dayjs(PROTOTYPE_TODAY).startOf('day');
}

export function isPastDetachment(detachment: Pick<Detachment, 'detachmentDate'>): boolean {
  return dayjs(detachment.detachmentDate).isBefore(today());
}

export function isPastPlanViewOnly(detachment: Pick<Detachment, 'detachmentDate'>): boolean {
  return isPastDetachment(detachment);
}

export function formatDate(date: string): string {
  return dayjs(date).format('D MMM YYYY');
}

export function formatDateTime(iso: string): string {
  return dayjs(iso).format('D MMM YYYY, HH:mm');
}

export function getPlansForDetachment(
  plans: PlatformPlan[],
  detachmentId: string,
): PlatformPlan[] {
  return plans.filter((p) => p.detachmentId === detachmentId);
}
