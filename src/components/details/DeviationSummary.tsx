import { Badge, Collapse, Table, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import { getLineStatus } from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getSummaryToBringColumn,
  getSummaryEditColumn,
  DETACHMENT_TABLE_LAYOUT,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
  DEVIATION_SUMMARY_SCROLL_X,
} from './nsnTableColumns';

interface DeviationSummaryProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
  onViewNsn: (line: PlanLine) => void;
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
  onViewInventory,
  onViewNsn,
}: DeviationSummaryProps) {
  const deviationLines = lines.filter((l) => getLineStatus(l) === 'Deviation');

  if (deviationLines.length === 0) return null;

  const columns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    getSummaryToBringColumn<PlanLine>(),
    {
      title: 'Reason',
      dataIndex: 'deviationReason',
      width: FLEX_TEXT_COLUMN_MIN_WIDTH,
      ellipsis: true,
      render: (v: string) => v ?? '—',
    },
    getSummaryEditColumn<PlanLine>(viewOnly, onEditLine),
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
