import { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Tabs, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useApp, useVisiblePlans } from '../context/AppContext';
import { isPastDetachment } from '../utils/planUtils';
import { PlanCardGrid } from '../components/plans/PlanCard';
import CreateDetachmentModal from '../components/plans/CreateDetachmentModal';
import type { PlanStatus } from '../types/detachment';

const STATUS_OPTIONS: PlanStatus[] = ['Draft', 'Partially Approved', 'Approved'];

export default function PlanListPage() {
  const { role, setRole } = useApp();
  const visiblePlans = useVisiblePlans();
  const [tab, setTab] = useState<'open' | 'past'>('open');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const filteredPlans = useMemo(() => {
    let result = visiblePlans.filter((p) => {
      const isPast = isPastDetachment(p);
      if (tab === 'open') return !isPast;
      return isPast && p.status === 'Approved';
    });

    if (platformFilter !== 'all') {
      result = result.filter((p) => p.platform === platformFilter);
    }

    if (tab === 'open' && statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.platform.toLowerCase().includes(q) ||
          p.variant.toLowerCase().includes(q),
      );
    }

    return result;
  }, [visiblePlans, tab, platformFilter, statusFilter, search]);

  const showCreate = role === 'planner' && tab === 'open';

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
            onChange={setPlatformFilter}
            style={{ width: 120 }}
            options={[
              { label: 'All platforms', value: 'all' },
              { label: 'F-16', value: 'F-16' },
              { label: 'CH-47', value: 'CH-47' },
            ]}
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
            placeholder="Search plans"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
        </Space>

        {showCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Create Detachment
          </Button>
        )}
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

      <PlanCardGrid plans={filteredPlans} showCreator={role === 'director'} />

      <CreateDetachmentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
