import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { PlanLine } from '../../types/planLine';
import { formatLineStatus, getLineActionLabel, getLineStatus } from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getToBringColumn,
  ACTION_COLUMN_WIDTH,
  STATUS_COLUMN_WIDTH,
  DETACHMENT_TABLE_LAYOUT,
  DETACHMENT_TABLE_SCROLL_X,
} from './nsnTableColumns';

interface LSeriesTableProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
  onViewNsn: (line: PlanLine) => void;
  onAddNsn?: () => void;
  onDeleteLine?: (line: PlanLine) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Met: 'success',
  Deviation: 'warning',
  Shortfall: 'error',
};

function sortLinesForDisplay(lines: PlanLine[]): PlanLine[] {
  const added = lines.filter((line) => line.isAddedNsn);
  const template = lines.filter((line) => !line.isAddedNsn);
  return [...added, ...template];
}

export default function LSeriesTable({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onViewInventory,
  onViewNsn,
  onAddNsn,
  onDeleteLine,
}: LSeriesTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const addedCount = lines.filter((line) => line.isAddedNsn).length;

  useEffect(() => {
    setPage(1);
  }, [addedCount]);

  const sortedLines = useMemo(() => sortLinesForDisplay(lines), [lines]);

  const filtered = useMemo(() => {
    let result = sortedLines;
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
  }, [sortedLines, search, statusFilter]);

  const columns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    getToBringColumn<PlanLine>(),
    {
      title: 'Status',
      key: 'status',
      width: STATUS_COLUMN_WIDTH,
      render: (_: unknown, record: PlanLine) => {
        const status = getLineStatus(record);
        return <Tag color={STATUS_COLORS[status]}>{formatLineStatus(status)}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: ACTION_COLUMN_WIDTH,
      fixed: 'right' as const,
      render: (_: unknown, record: PlanLine) => {
        if (viewOnly) return null;

        const actionLabel = getLineActionLabel(record);

        return (
          <Space size={4} wrap>
            <Button type="link" size="small" onClick={() => onEditLine(record)}>
              {actionLabel}
            </Button>
            {record.isAddedNsn && onDeleteLine && (
              <Popconfirm
                title="Remove this NSN from the plan?"
                okText="Delete"
                cancelText="Cancel"
                onConfirm={() => onDeleteLine(record)}
              >
                <Button type="link" size="small" danger>
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="lseries-section">
      <div className="lseries-section-header">
        <Typography.Title
          level={5}
          className="lseries-section-title"
          style={{ marginTop: 0, marginBottom: 0, color: '#000000', fontWeight: 600 }}
        >
          Detachment Components
        </Typography.Title>
        {!viewOnly && onAddNsn && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddNsn}>
            Add NSN
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 12 }}>
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
          pagination={{
            current: page,
            pageSize: 10,
            showSizeChanger: false,
            onChange: setPage,
          }}
          size="middle"
          tableLayout={DETACHMENT_TABLE_LAYOUT}
          scroll={{ x: DETACHMENT_TABLE_SCROLL_X }}
        />
      </div>
    </div>
  );
}
