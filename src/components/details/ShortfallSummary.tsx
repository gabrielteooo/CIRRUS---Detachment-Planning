import { Badge, Collapse, Table, Button, Checkbox, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  allShortfallActionsApproved,
  formatShortfallActions,
  getLineStatus,
  getShortfallQty,
} from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  DETACHMENT_TABLE_LAYOUT,
  DETACHMENT_TABLE_SCROLL_X,
} from './nsnTableColumns';

interface ShortfallSummaryProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onToggleApproval: (lineId: string, approved: boolean) => void;
  onViewInventory: (line: PlanLine) => void;
}

function ShortfallHeader({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Typography.Text strong style={{ fontSize: 16, color: 'rgba(0,0,0,0.88)' }}>
        Shortfall summary
      </Typography.Text>
      <Badge
        count={count}
        overflowCount={999}
        style={{ backgroundColor: '#cf1322', fontWeight: 600 }}
      />
    </div>
  );
}

export default function ShortfallSummary({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onToggleApproval,
  onViewInventory,
}: ShortfallSummaryProps) {
  const shortfallLines = lines.filter((l) => getLineStatus(l) === 'Shortfall');

  if (shortfallLines.length === 0) return null;

  const columns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    {
      title: 'Shortfall',
      width: 100,
      render: (_: unknown, record: PlanLine) => getShortfallQty(record),
    },
    {
      title: 'Actions taken',
      key: 'actions',
      render: (_: unknown, record: PlanLine) => formatShortfallActions(record.shortfallActions),
    },
    {
      title: 'Offline approval',
      key: 'approval',
      width: 160,
      render: (_: unknown, record: PlanLine) =>
        record.shortfallActions.length > 0 ? (
          <Checkbox
            checked={allShortfallActionsApproved(record.shortfallActions)}
            disabled={viewOnly}
            onChange={(e) => onToggleApproval(record.id, e.target.checked)}
          />
        ) : (
          '—'
        ),
    },
    {
      title: '',
      key: 'edit',
      width: 70,
      render: (_: unknown, record: PlanLine) =>
        !viewOnly ? (
          <Button type="link" size="small" onClick={() => onEditLine(record)}>
            Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <Collapse
      className="summary-collapse-shortfall"
      defaultActiveKey={['shortfall']}
      items={[
        {
          key: 'shortfall',
          label: <ShortfallHeader count={shortfallLines.length} />,
          children: (
            <div className="detachment-table-container">
              <Table
                dataSource={shortfallLines}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
                tableLayout={DETACHMENT_TABLE_LAYOUT}
                scroll={{ x: DETACHMENT_TABLE_SCROLL_X }}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
