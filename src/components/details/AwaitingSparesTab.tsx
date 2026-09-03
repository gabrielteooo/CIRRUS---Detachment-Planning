import { useMemo, useState } from 'react';
import { Empty, Table, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  formatAwaitingSparesResolution,
  getAwaitingSparesLines,
} from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getToBringColumn,
  getIssuedColumn,
  getFulfillmentStatusColumns,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getMrpControllerColumn,
  getSummaryEditColumn,
  DETACHMENT_TABLE_LAYOUT,
  computeAwaitingSparesTableScrollX,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
} from './nsnTableColumns';
import CustomizeColumnsButton, {
  DEFAULT_WORK_QUEUE_COLUMN_VISIBILITY,
  WORK_QUEUE_COLUMN_OPTIONS,
  type WorkQueueColumnVisibility,
} from './CustomizeColumnsButton';

interface AwaitingSparesTabProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
  onEditIssued?: (line: PlanLine) => void;
  onViewNsn: (line: PlanLine) => void;
}

export default function AwaitingSparesTab({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onViewInventory,
  onEditIssued,
  onViewNsn,
}: AwaitingSparesTabProps) {
  const [columnVisibility, setColumnVisibility] = useState<WorkQueueColumnVisibility>(
    DEFAULT_WORK_QUEUE_COLUMN_VISIBILITY,
  );
  const awaitingSparesLines = getAwaitingSparesLines(lines);
  const showMrpController = columnVisibility.mrpController === true;

  const columns = useMemo(() => {
    const next = [...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn)];

    if (showMrpController) {
      next.push(getMrpControllerColumn<PlanLine>());
    }

    next.push(
      getPlatformVariantColumn<PlanLine>(platform, variant),
      getRequiredColumn<PlanLine>(awaitingSparesLines),
      getToBringColumn<PlanLine>(awaitingSparesLines),
      getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory), {
        lines: awaitingSparesLines,
      }),
      getIssuedColumn<PlanLine>(awaitingSparesLines, onEditIssued),
      ...getFulfillmentStatusColumns<PlanLine>(),
      {
        title: 'Resolution',
        key: 'resolution',
        width: FLEX_TEXT_COLUMN_MIN_WIDTH,
        ellipsis: true,
        render: (_: unknown, record: PlanLine) => formatAwaitingSparesResolution(record),
      },
      getSummaryEditColumn<PlanLine>(viewOnly, onEditLine, 'Edit'),
    );

    return next;
  }, [
    onViewNsn,
    showMrpController,
    platform,
    variant,
    onViewInventory,
    viewOnly,
    onEditLine,
    awaitingSparesLines,
  ]);

  const tableScrollX = useMemo(
    () => computeAwaitingSparesTableScrollX(columnVisibility),
    [columnVisibility],
  );

  if (awaitingSparesLines.length === 0) {
    return (
      <Empty
        description="No items awaiting supply — resolve shortfalls with an awaiting supply path to monitor them here."
        style={{ padding: '48px 0' }}
      />
    );
  }

  return (
    <div>
      <div className="lseries-table-toolbar">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, flex: 1 }}>
          These lines are fulfilled with an awaiting supply resolution and do not require approval.
          Monitor supply progress here — change the resolution if plans shift.
        </Typography.Paragraph>
        <CustomizeColumnsButton
          options={WORK_QUEUE_COLUMN_OPTIONS}
          visibility={columnVisibility}
          onToggle={(key, visible) =>
            setColumnVisibility((current) => ({ ...current, [key]: visible }))
          }
        />
      </div>
      <div className="detachment-table-container">
        <Table
          dataSource={awaitingSparesLines}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          tableLayout={DETACHMENT_TABLE_LAYOUT}
          scroll={{ x: tableScrollX }}
        />
      </div>
    </div>
  );
}
