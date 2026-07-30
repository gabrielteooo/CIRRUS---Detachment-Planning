import { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Tabs, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useApp, useVisibleDetachments } from '../context/AppContext';
import { isPastDetachment } from '../utils/planUtils';
import { DetachmentCardGrid } from '../components/plans/DetachmentCard';
import CreateDetachmentModal from '../components/plans/CreateDetachmentModal';
import CreatePlanModal from '../components/plans/CreatePlanModal';
import type { PlanStatus, Platform } from '../types/detachment';
import { aggregateDetachmentStatus } from '../data/mockPlans';

const STATUS_OPTIONS: PlanStatus[] = ['Draft', 'Partially Approved', 'Approved'];

const DIRECTOR_PLATFORM_OPTIONS = [
  { label: 'All platforms', value: 'all' },
  { label: 'F-16', value: 'F-16' },
  { label: 'CH-47', value: 'CH-47' },
];

const PLANNER_PLATFORM_OPTIONS = [
  { label: 'F-16', value: 'F-16' },
  { label: 'CH-47', value: 'CH-47' },
];

export default function PlanListPage() {
  const { role, setRole, plans, plannerPlatform, setPlannerPlatform } = useApp();
  const visibleDetachments = useVisibleDetachments();
  const [tab, setTab] = useState<'open' | 'past'>('open');
  const [directorPlatformFilter, setDirectorPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [createDetachmentOpen, setCreateDetachmentOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);

  const isDirector = role === 'director';
  const platformFilter = isDirector ? directorPlatformFilter : plannerPlatform;

  const handlePlatformFilterChange = (value: string) => {
    if (isDirector) {
      setDirectorPlatformFilter(value);
    } else {
      setPlannerPlatform(value as Platform);
    }
  };

  const filteredDetachments = useMemo(() => {
    let result = visibleDetachments.filter((d) => {
      const isPast = isPastDetachment(d);
      const detachmentPlans = plans.filter((p) => p.detachmentId === d.id);

      if (tab === 'open') {
        if (isPast) return false;
      } else {
        if (!isPast) return false;
        if (isDirector) {
          return detachmentPlans.length > 0 && detachmentPlans.every((p) => p.status === 'Approved');
        }
        const pastPlan = detachmentPlans.find(
          (p) => p.platform === plannerPlatform && p.status === 'Approved',
        );
        return !!pastPlan;
      }

      if (isDirector) return true;

      return detachmentPlans.some((p) => p.platform === plannerPlatform);
    });

    if (platformFilter !== 'all') {
      result = result.filter((d) => {
        const detachmentPlans = plans.filter((p) => p.detachmentId === d.id);
        if (isDirector) {
          return detachmentPlans.some((p) => p.platform === platformFilter);
        }
        return detachmentPlans.some((p) => p.platform === platformFilter);
      });
    }

    if (tab === 'open' && statusFilter !== 'all') {
      result = result.filter((d) => {
        const detachmentPlans = plans.filter((p) => p.detachmentId === d.id);
        if (isDirector) {
          return aggregateDetachmentStatus(detachmentPlans) === statusFilter;
        }
        const platformPlan = detachmentPlans.find((p) => p.platform === plannerPlatform);
        return platformPlan?.status === statusFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => {
        const detachmentPlans = plans.filter((p) => p.detachmentId === d.id);
        const relevantPlans = isDirector
          ? detachmentPlans
          : detachmentPlans.filter((p) => p.platform === plannerPlatform);
        return (
          d.name.toLowerCase().includes(q) ||
          relevantPlans.some(
            (p) =>
              p.platform.toLowerCase().includes(q) ||
              p.variantRows.some((row) => row.variant.toLowerCase().includes(q)),
          )
        );
      });
    }

    return result;
  }, [
    visibleDetachments,
    plans,
    tab,
    platformFilter,
    statusFilter,
    search,
    isDirector,
    plannerPlatform,
  ]);

  const cardPlans = useMemo(() => {
    if (isDirector) return plans;
    return plans.filter((p) => p.platform === plannerPlatform);
  }, [plans, isDirector, plannerPlatform]);

  const showCreateDetachment = isDirector && tab === 'open';
  const showCreatePlan = !isDirector && tab === 'open';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space wrap>
          <Typography.Text type="secondary">View as:</Typography.Text>
          <Select
            value={role}
            onChange={setRole}
            style={{ width: 160 }}
            options={[
              { label: 'Planner', value: 'planner' },
              { label: 'Director', value: 'director' },
            ]}
          />
          <Select
            value={platformFilter}
            onChange={handlePlatformFilterChange}
            style={{ width: 120 }}
            options={isDirector ? DIRECTOR_PLATFORM_OPTIONS : PLANNER_PLATFORM_OPTIONS}
          />
          {tab === 'open' && (
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
              options={[
                { label: 'All statuses', value: 'all' },
                ...STATUS_OPTIONS.map((s) => ({ label: s, value: s })),
              ]}
            />
          )}
          <Input
            placeholder="Search detachments"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
        </Space>

        <Space>
          {showCreatePlan && (
            <Button icon={<PlusOutlined />} onClick={() => setCreatePlanOpen(true)}>
              Create Plan
            </Button>
          )}
          {showCreateDetachment && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateDetachmentOpen(true)}>
              Create Detachment
            </Button>
          )}
        </Space>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as 'open' | 'past')}
        items={[
          { key: 'open', label: 'Open Detachment' },
          { key: 'past', label: 'Past Detachment' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <DetachmentCardGrid
        detachments={filteredDetachments}
        plans={cardPlans}
        showCreator={isDirector}
      />

      <CreateDetachmentModal open={createDetachmentOpen} onClose={() => setCreateDetachmentOpen(false)} />
      <CreatePlanModal open={createPlanOpen} onClose={() => setCreatePlanOpen(false)} />
    </div>
  );
}
