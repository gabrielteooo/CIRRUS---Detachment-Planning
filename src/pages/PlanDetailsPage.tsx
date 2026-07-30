import { Navigate, useParams } from 'react-router-dom';

/** Legacy route redirect — plan IDs now live under detachments. */
export default function PlanDetailsPage() {
  const { planId } = useParams<{ planId: string }>();

  if (!planId) {
    return <Navigate to="/detachment-planning" replace />;
  }

  // Map known plan IDs to their detachment for backward-compatible URLs
  const PLAN_TO_DETACHMENT: Record<string, string> = {
    'plan-001': 'det-001',
    'plan-002': 'det-002',
    'plan-003': 'det-003',
    'plan-004': 'det-004',
    'plan-005': 'det-005',
    'plan-006': 'det-006',
    'plan-007': 'det-007',
    'plan-008': 'det-008',
    'plan-009': 'det-009',
    'plan-010': 'det-010',
    'plan-011': 'det-011',
    'plan-012': 'det-012',
    'plan-joint-f16': 'det-joint',
    'plan-joint-ch47': 'det-joint',
  };

  const PLATFORM_BY_PLAN: Record<string, string> = {
    'plan-001': 'F-16',
    'plan-002': 'CH-47',
    'plan-003': 'F-16',
    'plan-004': 'F-16',
    'plan-005': 'CH-47',
    'plan-006': 'CH-47',
    'plan-007': 'F-16',
    'plan-008': 'F-16',
    'plan-009': 'CH-47',
    'plan-010': 'F-16',
    'plan-011': 'CH-47',
    'plan-012': 'F-16',
    'plan-joint-f16': 'F-16',
    'plan-joint-ch47': 'CH-47',
  };

  const detachmentId = PLAN_TO_DETACHMENT[planId];
  const platform = PLATFORM_BY_PLAN[planId];

  if (detachmentId) {
    const query = platform ? `?platform=${platform}` : '';
    return <Navigate to={`/detachment-planning/${detachmentId}${query}`} replace />;
  }

  return <Navigate to="/detachment-planning" replace />;
}
