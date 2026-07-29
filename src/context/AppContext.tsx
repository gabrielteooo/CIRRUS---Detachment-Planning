import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { MOCK_PLANS } from '../data/mockPlans';
import { getDefaultPlanLines } from '../data/mockPlanLines';
import type { DetachmentPlan, Platform, User, UserRole } from '../types/detachment';
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
import { L_SERIES_VERSION_IDS } from '../data/lSeriesTemplate';
import { L_SERIES_TEMPLATE } from '../data/lSeriesTemplate';
import { isPastDetachment } from '../utils/planUtils';

interface AppContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: User;
  plans: DetachmentPlan[];
  getPlanLines: (planId: string) => PlanLine[];
  updatePlanLines: (planId: string, lines: PlanLine[]) => void;
  updatePlan: (planId: string, updates: Partial<DetachmentPlan>) => void;
  createPlan: (input: CreatePlanInput) => DetachmentPlan;
}

export interface CreatePlanInput {
  name: string;
  platform: Platform;
  variants: string[];
  lSeriesVersion: string;
  parameterTier: number;
  needByDate: string;
  detachmentDate: string;
  remarks?: string;
}

const AppContext = createContext<AppContextValue | null>(null);

function buildParameterValue(platform: Platform, tier: number): { label: string; value: string } {
  const template = L_SERIES_TEMPLATE[platform];
  if (platform === 'F-16') {
    return { label: template.paramLabel, value: `${tier} hrs` };
  }
  return { label: template.paramLabel, value: `${tier} aircraft` };
}

function syncPlanMetrics(plan: DetachmentPlan, lines: PlanLine[]): DetachmentPlan {
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('planner');
  const [plans, setPlans] = useState<DetachmentPlan[]>(MOCK_PLANS);
  const [planLinesMap, setPlanLinesMap] = useState<Record<string, PlanLine[]>>(() => {
    const initial: Record<string, PlanLine[]> = {};
    for (const plan of MOCK_PLANS) {
      initial[plan.id] = getDefaultPlanLines(plan);
    }
    return initial;
  });

  const currentUser = role === 'planner' ? PLANNER_USER : DIRECTOR_USER;

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

  const updatePlan = useCallback((planId: string, updates: Partial<DetachmentPlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...updates } : p)));
  }, []);

  const createPlan = useCallback((input: CreatePlanInput): DetachmentPlan => {
    const id = `plan-${Date.now()}`;
    const { label, value } = buildParameterValue(input.platform, input.parameterTier);
    const newPlan: DetachmentPlan = {
      id,
      name: input.name,
      platform: input.platform,
      variant: input.variants.join(', '),
      lSeriesVersion: input.lSeriesVersion || L_SERIES_VERSION_IDS[input.platform],
      parameterLabel: label,
      parameterValue: value,
      needByDate: input.needByDate,
      detachmentDate: input.detachmentDate,
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
      plans,
      getPlanLines,
      updatePlanLines,
      updatePlan,
      createPlan,
    }),
    [role, currentUser, plans, getPlanLines, updatePlanLines, updatePlan, createPlan],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useVisiblePlans(): DetachmentPlan[] {
  const { plans, role } = useApp();
  if (role === 'director') return plans;
  return plans.filter((p) => p.createdBy === PLANNER_USER.id);
}

export function useIsViewOnly(plan: DetachmentPlan | undefined): boolean {
  const { role } = useApp();
  if (!plan) return true;
  if (role === 'director') return true;
  return isPastPlanViewOnly(plan);
}

export function isPastPlanViewOnly(plan: DetachmentPlan): boolean {
  return isPastDetachment(plan);
}
