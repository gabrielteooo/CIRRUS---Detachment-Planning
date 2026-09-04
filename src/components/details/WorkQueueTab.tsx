import { useMemo, useState } from 'react';
import { Empty, Table, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import { getLineActionLabel, getWorkQueueLines, isPolLine } from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getToBringColumn,
  getIssuedColumn,
  getStatusColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getMrpControllerColumn,
  getSummaryEditColumn,
  getSummaryShortfallDeltaColumn,
  DETACHMENT_TABLE_LAYOUT,
  computeWorkQueueTableScrollX,
} from './nsnTableColumns';
import CustomizeColumnsButton, {
  DEFAULT_WORK_QUEUE_COLUMN_VISIBILITY,
  WORK_QUEUE_COLUMN_OPTIONS,
  type WorkQueueColumnVisibility,
} from './CustomizeColumnsButton';

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
  const [columnVisibility, setColumnVisibility] = useState<WorkQueueColumnVisibility>(
    DEFAULT_WORK_QUEUE_COLUMN_VISIBILITY,
  );
  const queueLines = getWorkQueueLines(lines);
  const showMrpController = columnVisibility.mrpController === true;

  const columns = useMemo(() => {
    const next = [
      ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
    ];

    if (showMrpController) {
      next.push(getMrpControllerColumn<PlanLine>());
    }

    next.push(
      getPlatformVariantColumn<PlanLine>(platform, variant),
      getRequiredColumn<PlanLine>(queueLines),
      getToBringColumn<PlanLine>(queueLines),
      getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory), {
        lines: queueLines,
      }),
      getIssuedColumn<PlanLine>(queueLines),
      getStatusColumn<PlanLine>(),
      getSummaryShortfallDeltaColumn<PlanLine>(),
      getSummaryEditColumn<PlanLine>(viewOnly, onEditLine, (line) =>
        isPolLine(line) ? 'Edit' : getLineActionLabel(line),
      ),
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
    queueLines,
  ]);

  const tableScrollX = useMemo(
    () => computeWorkQueueTableScrollX(columnVisibility),
    [columnVisibility],
  );

  if (queueLines.length === 0) {
    return (
      <Empty
        description="No items require action — unresolved shortfalls need a resolution recorded."
        style={{ padding: '48px 0' }}
      />
    );
  }

  return (
    <div>
      <div className="lseries-table-toolbar">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, flex: 1 }}>
          Unresolved shortfalls — record a resolution. **Awaiting supply** moves to the Awaiting
          supply tab; **accept** and **cannibalise** move to the Approval pack.
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
          dataSource={queueLines}
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
