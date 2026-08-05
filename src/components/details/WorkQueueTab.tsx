import { Empty, Table, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import { getShortfallQty, getWorkQueueLines } from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getSummaryEditColumn,
  DETACHMENT_TABLE_LAYOUT,
  SUMMARY_SEVENTH_COLUMN_WIDTH,
  WORK_QUEUE_SCROLL_X,
} from './nsnTableColumns';

interface WorkQueueTabProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
  onViewNsn: (line: PlanLine) => void;
}

export default function WorkQueueTab({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onViewInventory,
  onViewNsn,
}: WorkQueueTabProps) {
  const queueLines = getWorkQueueLines(lines);

  if (queueLines.length === 0) {
    return (
      <Empty
        description="No shortfalls require action — all shortfalls have a resolution recorded."
        style={{ padding: '48px 0' }}
      />
    );
  }

  const columns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    {
      title: 'Shortfall',
      width: SUMMARY_SEVENTH_COLUMN_WIDTH,
      render: (_: unknown, record: PlanLine) => getShortfallQty(record),
    },
    getSummaryEditColumn<PlanLine>(viewOnly, onEditLine, 'Resolve'),
  ];

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Shortfalls without a resolution path recorded. Resolve each line before preparing the
        approval pack.
      </Typography.Paragraph>
      <div className="detachment-table-container">
        <Table
          dataSource={queueLines}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          tableLayout={DETACHMENT_TABLE_LAYOUT}
          scroll={{ x: WORK_QUEUE_SCROLL_X }}
          rowClassName={() => 'row-shortfall'}
        />
      </div>
    </div>
  );
}
