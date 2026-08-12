import { L_SERIES_TEMPLATE } from './lSeriesTemplate';
import type { Platform } from '../types/detachment';
import type { LSeriesMissionType, LSeriesRecord } from '../types/lSeries';

function buildRecord(
  platform: Platform,
  missionType: LSeriesMissionType,
  name: string,
): LSeriesRecord {
  return {
    id: `lseries-${platform.toLowerCase().replace('-', '')}-${missionType.toLowerCase()}`,
    name,
    platform,
    missionType,
    version: 1,
    uploadedAt: '2026-01-15T10:00:00.000Z',
    uploadedBy: 'director-1',
    uploadedByName: 'Sarah Chen',
    template: structuredClone(L_SERIES_TEMPLATE[platform]),
  };
}

export const MOCK_L_SERIES_RECORDS: LSeriesRecord[] = [
  buildRecord('F-16', 'Long', 'L-F16-Long-2026'),
  buildRecord('CH-47', 'Long', 'L-CH47-Long-2026'),
  buildRecord('CH-47', 'Short', 'L-CH47-Short-2026'),
];

export function getDefaultLSeriesName(platform: Platform, missionType: LSeriesMissionType): string {
  const platformSlug = platform === 'F-16' ? 'F16' : 'CH47';
  return `L-${platformSlug}-${missionType}-2026`;
}
