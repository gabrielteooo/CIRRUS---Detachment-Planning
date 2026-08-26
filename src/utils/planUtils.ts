import dayjs, { type Dayjs } from 'dayjs';
import type { Detachment, PlatformPlan } from '../types/detachment';

/** Fixed reference date so open/past tabs match mock data during demo. */
export const PROTOTYPE_TODAY = '2026-03-01';

export function today(): dayjs.Dayjs {
  return dayjs(PROTOTYPE_TODAY).startOf('day');
}

export function isPastDetachment(
  detachment: Pick<Detachment, 'detachmentDateEnd'>,
): boolean {
  return dayjs(detachment.detachmentDateEnd).isBefore(today(), 'day');
}

export function isPastPlanViewOnly(
  detachment: Pick<Detachment, 'detachmentDateEnd'>,
): boolean {
  return isPastDetachment(detachment);
}

export function formatDate(date: string): string {
  return dayjs(date).format('D MMM YYYY');
}

export function formatDateRange(start: string, end: string): string {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

export function isDateRangeWithinParent(
  range: { start: Dayjs; end: Dayjs },
  parent: { start: Dayjs; end: Dayjs },
): boolean {
  return (
    !range.start.isBefore(parent.start, 'day') && !range.end.isAfter(parent.end, 'day')
  );
}

export function disableDateOutsideRange(
  date: Dayjs,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const start = dayjs(rangeStart).startOf('day');
  const end = dayjs(rangeEnd).startOf('day');
  return date.isBefore(start, 'day') || date.isAfter(end, 'day');
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
