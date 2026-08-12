import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { MOCK_DETACHMENTS } from '../data/mockDetachments';
import { MOCK_PLANS } from '../data/mockPlans';
import { MOCK_L_SERIES_RECORDS } from '../data/mockLSeriesRecords';
import type { LSeriesMissionType, LSeriesRecord, LSeriesUploadPreview } from '../types/lSeries';
import type {
  Detachment,
  Platform,
  PlatformPlan,
  PlanVariantRow,
  User,
  UserRole,
  DetachmentType,
} from '../types/detachment';
import { DIRECTOR_USER, PLANNER_USER } from '../types/detachment';
import type { PlanLine } from '../types/planLine';
import {
  computeFillRate,
  computePlanStatus,
  countCannibalisation,
  countDeviations,
  countShortfalls,
} from '../types/planLine';
import { getDefaultPlanLinesForPlan } from '../utils/generatePlanLines';
import { isPastDetachment } from '../utils/planUtils';
import { getPlansForDetachment } from '../utils/planUtils';

interface AppContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: User;
  plannerPlatform: Platform;
  setPlannerPlatform: (platform: Platform) => void;
  detachments: Detachment[];
  plans: PlatformPlan[];
  getDetachment: (id: string) => Detachment | undefined;
  getPlansForDetachment: (detachmentId: string) => PlatformPlan[];
  getPlanLines: (planId: string) => PlanLine[];
  updatePlanLines: (planId: string, lines: PlanLine[]) => void;
  updatePlan: (planId: string, updates: Partial<PlatformPlan>) => void;
  createDetachment: (input: CreateDetachmentInput) => Detachment;
  createPlan: (input: CreatePlanInput) => PlatformPlan;
  lSeriesRecords: LSeriesRecord[];
  getLSeriesRecord: (id: string) => LSeriesRecord | undefined;
  getLSeriesByPlatformMission: (
    platform: Platform,
    missionType: LSeriesMissionType,
  ) => LSeriesRecord | undefined;
  updateLSeriesName: (id: string, name: string) => void;
  submitLSeriesUpload: (preview: LSeriesUploadPreview) => LSeriesRecord;
  uploadPreview: LSeriesUploadPreview | null;
  setUploadPreview: (preview: LSeriesUploadPreview | null) => void;
  clearUploadPreview: () => void;
  previewHeaderActions: ReactNode | null;
  setPreviewHeaderActions: (actions: ReactNode | null) => void;
}

export interface CreateDetachmentInput {
  name: string;
  detachmentDate: string;
}

export interface CreatePlanInput {
  detachmentId: string;
  lSeriesId: string;
  platform: Platform;
  detachmentType: DetachmentType;
  needByDate: string;
  variantRows: PlanVariantRow[];
  remarks?: string;
}

const AppContext = createContext<AppContextValue | null>(null);

function syncPlanMetrics(plan: PlatformPlan, lines: PlanLine[]): PlatformPlan {
  return {
    ...plan,
    fillRatePercent: computeFillRate(lines),
    shortfallCount: countShortfalls(lines),
    deviationCount: countDeviations(lines),
    cannibalisationCount: countCannibalisation(lines),
    status: computePlanStatus(lines),
    lastUpdated: new Date().toISOString(),
  };
}

function buildInitialAppState(lSeriesRecords: LSeriesRecord[]) {
  const planLinesMap: Record<string, PlanLine[]> = {};
  for (const plan of MOCK_PLANS) {
    planLinesMap[plan.id] = getDefaultPlanLinesForPlan(plan, lSeriesRecords);
  }
  const plans = MOCK_PLANS.map((plan) => syncPlanMetrics(plan, planLinesMap[plan.id]));
  return { plans, planLinesMap };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lSeriesRecords, setLSeriesRecords] = useState<LSeriesRecord[]>(() =>
    structuredClone(MOCK_L_SERIES_RECORDS),
  );
  const [initialState] = useState(() => buildInitialAppState(structuredClone(MOCK_L_SERIES_RECORDS)));
  const [role, setRole] = useState<UserRole>('planner');
  const [plannerPlatform, setPlannerPlatform] = useState<Platform>('F-16');
  const [detachments, setDetachments] = useState<Detachment[]>(MOCK_DETACHMENTS);
  const [plans, setPlans] = useState<PlatformPlan[]>(initialState.plans);
  const [planLinesMap, setPlanLinesMap] = useState<Record<string, PlanLine[]>>(initialState.planLinesMap);
  const [uploadPreview, setUploadPreview] = useState<LSeriesUploadPreview | null>(null);
  const [previewHeaderActions, setPreviewHeaderActions] = useState<ReactNode | null>(null);

  const currentUser = role === 'planner' ? PLANNER_USER : DIRECTOR_USER;

  const getDetachment = useCallback(
    (id: string) => detachments.find((d) => d.id === id),
    [detachments],
  );

  const getPlansForDetachmentFn = useCallback(
    (detachmentId: string) => getPlansForDetachment(plans, detachmentId),
    [plans],
  );

  const getPlanLines = useCallback(
    (planId: string) => planLinesMap[planId] ?? [],
    [planLinesMap],
  );

  const updatePlanLines = useCallback((planId: string, lines: PlanLine[]) => {
    setPlanLinesMap((prev) => ({ ...prev, [planId]: lines }));
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? syncPlanMetrics(p, lines) : p)),
    );
  }, []);

  const updatePlan = useCallback((planId: string, updates: Partial<PlatformPlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...updates } : p)));
  }, []);

  const createDetachment = useCallback((input: CreateDetachmentInput): Detachment => {
    const id = `det-${Date.now()}`;
    const newDetachment: Detachment = {
      id,
      name: input.name,
      detachmentDate: input.detachmentDate,
      createdBy: DIRECTOR_USER.id,
      createdByName: DIRECTOR_USER.name,
      lastUpdated: new Date().toISOString(),
    };
    setDetachments((prev) => [newDetachment, ...prev]);
    return newDetachment;
  }, []);

  const getLSeriesRecord = useCallback(
    (id: string) => lSeriesRecords.find((record) => record.id === id),
    [lSeriesRecords],
  );

  const getLSeriesByPlatformMission = useCallback(
    (platform: Platform, missionType: LSeriesMissionType) =>
      lSeriesRecords.find(
        (record) => record.platform === platform && record.missionType === missionType,
      ),
    [lSeriesRecords],
  );

  const updateLSeriesName = useCallback((id: string, name: string) => {
    setLSeriesRecords((prev) =>
      prev.map((record) => (record.id === id ? { ...record, name } : record)),
    );
    setPlans((prev) =>
      prev.map((plan) =>
        plan.lSeriesId === id
          ? {
              ...plan,
              variantRows: plan.variantRows.map((row) => ({ ...row, lSeriesVersion: name })),
            }
          : plan,
      ),
    );
  }, []);

  const submitLSeriesUpload = useCallback(
    (preview: LSeriesUploadPreview): LSeriesRecord => {
      const now = new Date().toISOString();
      const uploadedBy = role === 'director' ? DIRECTOR_USER : PLANNER_USER;
      const existing = preview.replacingRecordId
        ? lSeriesRecords.find((record) => record.id === preview.replacingRecordId)
        : undefined;

      const stableId = `lseries-${preview.platform.toLowerCase().replace('-', '')}-${preview.missionType.toLowerCase()}`;
      const record: LSeriesRecord = {
        id: existing?.id ?? stableId,
        name: preview.name,
        platform: preview.platform,
        missionType: preview.missionType,
        version: preview.nextVersion,
        uploadedAt: now,
        uploadedBy: uploadedBy.id,
        uploadedByName: uploadedBy.name,
        template: preview.template,
      };

      setLSeriesRecords((prev) => {
        if (existing) {
          return prev.map((item) => (item.id === existing.id ? record : item));
        }
        return [...prev, record];
      });

      return record;
    },
    [lSeriesRecords, role],
  );

  const clearUploadPreview = useCallback(() => setUploadPreview(null), []);

  const createPlan = useCallback(
    (input: CreatePlanInput): PlatformPlan => {
      const id = `plan-${Date.now()}`;
      const lSeries = lSeriesRecords.find((record) => record.id === input.lSeriesId);
      const lSeriesVersion = lSeries?.name ?? input.variantRows[0]?.lSeriesVersion ?? '';
      const variantRows = input.variantRows.map((row) => ({ ...row, lSeriesVersion }));

      const newPlan: PlatformPlan = {
        id,
        detachmentId: input.detachmentId,
        platform: input.platform,
        detachmentType: input.detachmentType,
        lSeriesId: input.lSeriesId,
        needByDate: input.needByDate,
        variantRows,
        status: 'Draft',
        fillRatePercent: 0,
        shortfallCount: 0,
        deviationCount: 0,
        cannibalisationCount: 0,
        createdBy: PLANNER_USER.id,
        createdByName: PLANNER_USER.name,
        lastUpdated: new Date().toISOString(),
        remarks: input.remarks,
      };
      const lines = getDefaultPlanLinesForPlan(newPlan, lSeriesRecords);
      const synced = syncPlanMetrics(newPlan, lines);
      setPlans((prev) => [synced, ...prev]);
      setPlanLinesMap((prev) => ({ ...prev, [id]: lines }));
      return synced;
    },
    [lSeriesRecords],
  );

  const value = useMemo(
    () => ({
      role,
      setRole,
      currentUser,
      plannerPlatform,
      setPlannerPlatform,
      detachments,
      plans,
      getDetachment,
      getPlansForDetachment: getPlansForDetachmentFn,
      getPlanLines,
      updatePlanLines,
      updatePlan,
      createDetachment,
      createPlan,
      lSeriesRecords,
      getLSeriesRecord,
      getLSeriesByPlatformMission,
      updateLSeriesName,
      submitLSeriesUpload,
      uploadPreview,
      setUploadPreview,
      clearUploadPreview,
      previewHeaderActions,
      setPreviewHeaderActions,
    }),
    [
      role,
      currentUser,
      plannerPlatform,
      detachments,
      plans,
      getDetachment,
      getPlansForDetachmentFn,
      getPlanLines,
      updatePlanLines,
      updatePlan,
      createDetachment,
      createPlan,
      lSeriesRecords,
      getLSeriesRecord,
      getLSeriesByPlatformMission,
      updateLSeriesName,
      submitLSeriesUpload,
      uploadPreview,
      clearUploadPreview,
      previewHeaderActions,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useVisibleDetachments(): Detachment[] {
  const { detachments } = useApp();
  return detachments;
}

export function useIsViewOnly(detachment: Detachment | undefined): boolean {
  const { role } = useApp();
  if (!detachment) return true;
  if (role === 'director') return true;
  return isPastPlanViewOnly(detachment);
}

export function isPastPlanViewOnly(detachment: Detachment): boolean {
  return isPastDetachment(detachment);
}

export function useVisiblePlans(): PlatformPlan[] {
  const { plans, role } = useApp();
  if (role === 'director') return plans;
  return plans.filter((p) => p.createdBy === PLANNER_USER.id);
}
