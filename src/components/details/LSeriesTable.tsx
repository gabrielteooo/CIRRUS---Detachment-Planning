import { useMemo, useState } from 'react';
import { Button, Input, Select, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { PlanLine } from '../../types/planLine';
import { formatLineStatus, getLineStatus } from '../../types/planLine';
import {
  getNsnMpnDescriptionColumns,
  getRequiredColumn,
  getAvailableColumn,
  getToBringColumn,
  DETACHMENT_TABLE_LAYOUT,
  DETACHMENT_TABLE_SCROLL_X,
} from './nsnTableColumns';

interface LSeriesTableProps {
  lines: PlanLine[];
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Met: 'success',
  Deviation: 'warning',
  Shortfall: 'error',
};

export default function LSeriesTable({
  lines,
  viewOnly,
  onEditLine,
  onViewInventory,
}: LSeriesTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let result = lines;
    if (statusFilter !== 'all') {
      result = result.filter((l) => getLineStatus(l) === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.nsn.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [lines, search, statusFilter]);

  const columns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>((v, record) => (
      <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onViewInventory(record)}>
        {v}
      </Button>
    )),
    getToBringColumn<PlanLine>(),
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_: unknown, record: PlanLine) => {
        const status = getLineStatus(record);
        return <Tag color={STATUS_COLORS[status]}>{formatLineStatus(status)}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: unknown, record: PlanLine) =>
        !viewOnly ? (
          <Button type="link" size="small" onClick={() => onEditLine(record)}>
            Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="lseries-section">
      <Typography.Title
        level={5}
        className="lseries-section-title"
        style={{ marginTop: 0, marginBottom: 12, color: '#000000', fontWeight: 600 }}
      >
        Detachment Components
      </Typography.Title>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Input
          placeholder="Search components"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 140 }}
          options={[
            { label: 'All statuses', value: 'all' },
            { label: 'Fulfilled', value: 'Met' },
            { label: 'Deviation', value: 'Deviation' },
            { label: 'Shortfall', value: 'Shortfall' },
          ]}
        />
      </div>
      <div className="detachment-table-container">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
          tableLayout={DETACHMENT_TABLE_LAYOUT}
          scroll={{ x: DETACHMENT_TABLE_SCROLL_X }}
          rowClassName={(record) => {
            const status = getLineStatus(record);
            if (status === 'Shortfall') return 'row-shortfall';
            if (status === 'Deviation') return 'row-deviation';
            return '';
          }}
        />
      </div>
    </div>
  );
}
