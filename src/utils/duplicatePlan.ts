import type { PlanLine } from '../types/planLine';

export function clonePlanLinesForDuplicate(lines: PlanLine[], newPlanId: string): PlanLine[] {
  return lines.map((line, index) => {
    const cloned = structuredClone(line);
    return {
      ...cloned,
      id: `${newPlanId}-line-${index + 1}`,
      offlineApproval: undefined,
      deviationApproved: undefined,
      shortfallActions: cloned.shortfallActions.map((action) => ({
        ...action,
        approved: false,
      })),
    };
  });
}
