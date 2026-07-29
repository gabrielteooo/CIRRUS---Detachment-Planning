import dayjs from 'dayjs';
import type { DetachmentPlan } from '../types/detachment';

/** Fixed reference date so open/past tabs match mock data during demo. */
export const PROTOTYPE_TODAY = '2026-03-01';

export function today(): dayjs.Dayjs {
  return dayjs(PROTOTYPE_TODAY).startOf('day');
}

export function isPastDetachment(plan: DetachmentPlan): boolean {
  return dayjs(plan.detachmentDate).isBefore(today());
}

export function formatDate(date: string): string {
  return dayjs(date).format('D MMM YYYY');
}

export function formatDateTime(iso: string): string {
  return dayjs(iso).format('D MMM YYYY, HH:mm');
}
