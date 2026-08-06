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
import { getDefaultPlanLines } from '../data/mockPlanLines';
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
}

export interface CreateDetachmentInput {
  name: string;
  detachmentDate: string;
}

export interface CreatePlanInput {
  detachmentId: string;
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

function buildInitialAppState() {
  const planLinesMap: Record<string, PlanLine[]> = {};
  for (const plan of MOCK_PLANS) {
    planLinesMap[plan.id] = getDefaultPlanLines(plan);
  }
  const plans = MOCK_PLANS.map((plan) => syncPlanMetrics(plan, planLinesMap[plan.id]));
  return { plans, planLinesMap };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(buildInitialAppState);
  const [role, setRole] = useState<UserRole>('planner');
  const [plannerPlatform, setPlannerPlatform] = useState<Platform>('F-16');
  const [detachments, setDetachments] = useState<Detachment[]>(MOCK_DETACHMENTS);
  const [plans, setPlans] = useState<PlatformPlan[]>(initialState.plans);
  const [planLinesMap, setPlanLinesMap] = useState<Record<string, PlanLine[]>>(initialState.planLinesMap);

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

  const createPlan = useCallback((input: CreatePlanInput): PlatformPlan => {
    const id = `plan-${Date.now()}`;
    const newPlan: PlatformPlan = {
      id,
      detachmentId: input.detachmentId,
      platform: input.platform,
      detachmentType: input.detachmentType,
      needByDate: input.needByDate,
      variantRows: input.variantRows,
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
    const lines = getDefaultPlanLinesForPlan(newPlan);
    const synced = syncPlanMetrics(newPlan, lines);
    setPlans((prev) => [synced, ...prev]);
    setPlanLinesMap((prev) => ({ ...prev, [id]: lines }));
    return synced;
  }, []);

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
