import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { PlanLine, ComponentCategory } from '../../types/planLine';
import {
  formatLineStatus,
  getCategoryFulfillmentSummary,
  getLineActionLabel,
  getLineStatus,
} from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import { COMPONENT_CATEGORIES } from '../../data/lSeriesTemplate';
import {
  getOperationalComponentColumns,
  getPolReferenceColumns,
  computeOperationalTableScrollX,
  computePolTableScrollX,
  ACTION_COLUMN_WIDTH,
  STATUS_COLUMN_WIDTH,
  DETACHMENT_TABLE_LAYOUT,
} from './nsnTableColumns';
import CustomizeColumnsButton, {
  DEFAULT_COMPONENT_COLUMN_VISIBILITY,
  type ComponentColumnVisibility,
} from './CustomizeColumnsButton';

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

const CATEGORY_CARD_LABELS: Record<ComponentCategory, string> = {
  LRU: 'LRU',
  Consumable: 'Consumables',
  POL: 'POL',
};

function sortLinesForDisplay(lines: PlanLine[]): PlanLine[] {
  const added = lines.filter((line) => line.isAddedNsn);
  const template = lines.filter((line) => !line.isAddedNsn);
  return [...added, ...template];
}

function lineMatchesCategory(line: PlanLine, category: ComponentCategory): boolean {
  if (line.isAddedNsn) return category === 'LRU';
  return line.componentCategory === category;
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
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('LRU');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [columnVisibility, setColumnVisibility] = useState<ComponentColumnVisibility>(
    DEFAULT_COMPONENT_COLUMN_VISIBILITY,
  );
  const addedCount = lines.filter((line) => line.isAddedNsn).length;
  const isPolTab = activeCategory === 'POL';

  useEffect(() => {
    setPage(1);
  }, [addedCount, activeCategory, search, statusFilter]);

  const sortedLines = useMemo(() => sortLinesForDisplay(lines), [lines]);

  const searchFilteredLines = useMemo(() => {
    if (!search.trim()) return sortedLines;
    const q = search.toLowerCase();
    return sortedLines.filter(
      (line) =>
        line.nsn.toLowerCase().includes(q) ||
        line.description.toLowerCase().includes(q),
    );
  }, [sortedLines, search]);

  const filtered = useMemo(() => {
    let result = searchFilteredLines.filter((line) => lineMatchesCategory(line, activeCategory));
    if (statusFilter !== 'all') {
      result = result.filter((line) => getLineStatus(line) === statusFilter);
    }
    return result;
  }, [searchFilteredLines, activeCategory, statusFilter]);

  const statusAndActionColumns = [
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

  const activeColumnVisibility = columnVisibility[activeCategory];

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnVisibility((current) => ({
      ...current,
      [activeCategory]: {
        ...current[activeCategory],
        [key]: visible,
      },
    }));
  };

  const operationalColumns = !isPolTab
    ? getOperationalComponentColumns(
        activeCategory as Extract<ComponentCategory, 'LRU' | 'Consumable'>,
        platform,
        variant,
        onViewNsn,
        onViewInventory,
        activeColumnVisibility,
      )
    : [];

  const columns = isPolTab
    ? [...getPolReferenceColumns<PlanLine>(platform, variant, activeColumnVisibility), ...statusAndActionColumns]
    : [...operationalColumns, ...statusAndActionColumns];

  const tableScrollX = isPolTab
    ? computePolTableScrollX(activeColumnVisibility, {
        includeStatus: true,
        includeAction: !viewOnly,
      })
    : computeOperationalTableScrollX(
        activeCategory as Extract<ComponentCategory, 'LRU' | 'Consumable'>,
        activeColumnVisibility,
      );

  const pageSize = isPolTab ? Math.max(5, filtered.length) : 10;

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

      <div className="lseries-category-cards" role="tablist" aria-label="Component categories">
        {COMPONENT_CATEGORIES.map((category) => {
          const summary = getCategoryFulfillmentSummary(sortedLines, category);
          const selected = activeCategory === category;

          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`lseries-category-card${selected ? ' lseries-category-card--selected' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              <Typography.Text className="lseries-category-card-title">
                {CATEGORY_CARD_LABELS[category]}
              </Typography.Text>
              <Typography.Text className="lseries-category-card-rate">
                {summary.percent}%
              </Typography.Text>
            </button>
          );
        })}
      </div>

      <div className="lseries-table-toolbar">
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
        <CustomizeColumnsButton
          category={activeCategory}
          visibility={activeColumnVisibility}
          onToggle={handleColumnToggle}
        />
      </div>

      <Card size="small" className="lseries-category-table-card" bordered={false}>
        <div className="detachment-table-container">
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              onChange: setPage,
            }}
            size="middle"
            tableLayout={DETACHMENT_TABLE_LAYOUT}
            scroll={{ x: tableScrollX }}
          />
        </div>
      </Card>
    </div>
  );
}
