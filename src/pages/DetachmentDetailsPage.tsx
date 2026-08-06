import { useMemo, useState } from 'react';
import { Alert, Button, Empty, Tabs, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParams, useSearchParams } from 'react-router-dom';
import { useApp, useIsViewOnly } from '../context/AppContext';
import type { Platform } from '../types/detachment';
import PlanDetailsContent from '../components/details/PlanDetailsContent';
import CreatePlanModal from '../components/plans/CreatePlanModal';

export default function DetachmentDetailsPage() {
  const { detachmentId } = useParams<{ detachmentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, plannerPlatform, getDetachment, getPlansForDetachment } = useApp();
  const [createPlanOpen, setCreatePlanOpen] = useState(false);

  const detachment = detachmentId ? getDetachment(detachmentId) : undefined;
  const allPlans = detachmentId ? getPlansForDetachment(detachmentId) : [];
  const viewOnly = useIsViewOnly(detachment);
  const isDirector = role === 'director';

  const platformParam = searchParams.get('platform') as Platform | null;
  const activePlatform = useMemo(() => {
    if (!isDirector) return plannerPlatform;
    if (allPlans.length === 0) return undefined;
    if (platformParam && allPlans.some((p) => p.platform === platformParam)) {
      return platformParam;
    }
    return allPlans[0].platform;
  }, [allPlans, platformParam, isDirector, plannerPlatform]);

  const visiblePlans = useMemo(() => {
    if (isDirector) return allPlans;
    return allPlans.filter((p) => p.platform === plannerPlatform);
  }, [allPlans, isDirector, plannerPlatform]);

  const activePlan = isDirector
    ? allPlans.find((p) => p.platform === activePlatform)
    : visiblePlans[0];

  const viewOnlyBanner = useMemo(() => {
    if (role === 'director') return 'View only — detachment director';
    if (viewOnly && detachment) return 'View only — past detachment';
    return null;
  }, [role, viewOnly, detachment]);

  if (!detachment || !detachmentId) {
    return (
      <Typography.Text type="secondary">
        Detachment not found.
      </Typography.Text>
    );
  }

  const handleTabChange = (platform: string) => {
    setSearchParams({ platform });
  };

  const hasPlatformPlan = allPlans.some((p) => p.platform === plannerPlatform);
  const canCreatePlan = role === 'planner' && !viewOnly && !hasPlatformPlan;

  return (
    <div>
      {viewOnlyBanner && (
        <Alert message={viewOnlyBanner} type="info" showIcon style={{ marginBottom: 16 }} />
      )}

      {isDirector ? (
        allPlans.length === 0 ? (
          <Empty
            description="No platform plans have been created for this detachment."
            style={{ padding: '48px 0' }}
          />
        ) : (
          <>
            <Tabs
              activeKey={activePlatform}
              onChange={handleTabChange}
              items={allPlans.map((plan) => ({
                key: plan.platform,
                label: plan.platform,
              }))}
              style={{ marginBottom: 24 }}
            />

            {activePlan && (
              <PlanDetailsContent
                plan={activePlan}
                detachment={detachment}
                viewOnly={viewOnly}
              />
            )}
          </>
        )
      ) : activePlan ? (
        <PlanDetailsContent
          plan={activePlan}
          detachment={detachment}
          viewOnly={viewOnly}
        />
      ) : (
        <Empty
          description={`No ${plannerPlatform} plan yet. Create a plan to get started.`}
          style={{ padding: '48px 0' }}
        >
          {canCreatePlan && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatePlanOpen(true)}>
              Create Plan
            </Button>
          )}
        </Empty>
      )}

      <CreatePlanModal
        open={createPlanOpen}
        onClose={() => setCreatePlanOpen(false)}
        preselectedDetachmentId={detachmentId}
      />
    </div>
  );
}
