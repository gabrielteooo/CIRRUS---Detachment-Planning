import type { Platform } from './detachment';
import type { ComponentCategory, LSComponent, LSPlatformTemplate } from '../data/lSeriesTemplate';

export type LSeriesMissionType = 'Short' | 'Long';

export const L_SERIES_MISSION_TYPES: LSeriesMissionType[] = ['Short', 'Long'];

export interface LSeriesRecord {
  id: string;
  name: string;
  platform: Platform;
  missionType: LSeriesMissionType;
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName: string;
  template: LSPlatformTemplate;
}

export interface LSeriesUploadPreview {
  platform: Platform;
  missionType: LSeriesMissionType;
  name: string;
  template: LSPlatformTemplate;
  replacingRecordId?: string;
  nextVersion: number;
}

export type { ComponentCategory, LSComponent, LSPlatformTemplate };
