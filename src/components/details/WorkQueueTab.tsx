import { Empty, Table, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import { getLineActionLabel, getWorkQueueLines, isPolLine } from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getSummaryEditColumn,
  getSummaryShortfallDeltaColumn,
  DETACHMENT_TABLE_LAYOUT,
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
    getSummaryShortfallDeltaColumn<PlanLine>(),
    getSummaryEditColumn<PlanLine>(viewOnly, onEditLine, (line) =>
      isPolLine(line) ? 'Edit' : getLineActionLabel(line),
    ),
  ];

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        These shortfalls require your action. Choose a resolution path to prepare each item for
        approval in the Approval pack.
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
        />
      </div>
    </div>
  );
}
