import { Badge, Collapse, Table, Button, Checkbox, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import { getLineStatus } from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getToBringColumn,
  DETACHMENT_TABLE_LAYOUT,
  DEVIATION_SUMMARY_SCROLL_X,
} from './nsnTableColumns';

interface DeviationSummaryProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onToggleApproval: (lineId: string, approved: boolean) => void;
  onViewInventory: (line: PlanLine) => void;
}

function DeviationHeader({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Typography.Text strong style={{ fontSize: 16, color: 'rgba(0,0,0,0.88)' }}>
        Deviation summary
      </Typography.Text>
      <Badge
        count={count}
        overflowCount={999}
        style={{ backgroundColor: '#d48806', fontWeight: 600 }}
      />
    </div>
  );
}

export default function DeviationSummary({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onToggleApproval,
  onViewInventory,
}: DeviationSummaryProps) {
  const deviationLines = lines.filter((l) => getLineStatus(l) === 'Deviation');

  if (deviationLines.length === 0) return null;

  const columns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    getToBringColumn<PlanLine>(),
    {
      title: 'Delta',
      width: 70,
      render: (_: unknown, record: PlanLine) => {
        const delta = record.toBringQty - record.requiredQty;
        return delta > 0 ? `+${delta}` : delta;
      },
    },
    { title: 'Reason', dataIndex: 'deviationReason', width: 220, render: (v: string) => v ?? '—' },
    {
      title: 'Offline approval',
      key: 'approval',
      width: 160,
      render: (_: unknown, record: PlanLine) => (
        <Checkbox
          checked={record.deviationApproved ?? false}
          disabled={viewOnly}
          onChange={(e) => onToggleApproval(record.id, e.target.checked)}
        />
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
      className="summary-collapse-deviation"
      defaultActiveKey={['deviation']}
      items={[
        {
          key: 'deviation',
          label: <DeviationHeader count={deviationLines.length} />,
          children: (
            <div className="detachment-table-container">
              <Table
                dataSource={deviationLines}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
                tableLayout={DETACHMENT_TABLE_LAYOUT}
                scroll={{ x: DEVIATION_SUMMARY_SCROLL_X }}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
