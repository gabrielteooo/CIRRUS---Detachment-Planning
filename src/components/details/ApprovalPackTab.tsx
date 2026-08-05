import { useMemo, useState } from 'react';
import { Button, Empty, Select, Table, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import type { PlanLine } from '../../types/planLine';
import {
  formatShortfallActions,
  getApprovalPackLines,
  getDeviationDelta,
  hasResolutionRecorded,
  lineNeedsApproval,
  getLineApprovalStatus,
} from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getSummaryEditColumn,
  getSummaryToBringColumn,
  DETACHMENT_TABLE_LAYOUT,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
  SUMMARY_SEVENTH_COLUMN_WIDTH,
  APPROVAL_PACK_SHORTFALL_SCROLL_X,
  APPROVAL_PACK_DEVIATION_SCROLL_X,
} from './nsnTableColumns';

type ApprovalPackFilter = 'pending' | 'approved';

interface ApprovalPackTabProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
  onViewNsn: (line: PlanLine) => void;
}

function hasApprovalPackItems(lines: PlanLine[]): boolean {
  return lines.some(
    (l) =>
      hasResolutionRecorded(l) &&
      lineNeedsApproval(l) &&
      getLineApprovalStatus(l) !== 'unresolved',
  );
}

export default function ApprovalPackTab({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onViewInventory,
  onViewNsn,
}: ApprovalPackTabProps) {
  const [filter, setFilter] = useState<ApprovalPackFilter>('pending');

  const { shortfalls, deviations } = useMemo(
    () => getApprovalPackLines(lines, filter),
    [lines, filter],
  );
  const total = shortfalls.length + deviations.length;

  if (!hasApprovalPackItems(lines)) {
    return (
      <Empty
        description="No items in the approval pack yet. Resolve work queue items first."
        style={{ padding: '48px 0' }}
      />
    );
  }

  const shortfallColumns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    {
      title: 'Shortfall',
      width: SUMMARY_SEVENTH_COLUMN_WIDTH,
      render: (_: unknown, record: PlanLine) =>
        Math.max(0, record.requiredQty - record.availableQty),
    },
    {
      title: 'Resolution',
      key: 'resolution',
      width: FLEX_TEXT_COLUMN_MIN_WIDTH,
      ellipsis: true,
      render: (_: unknown, record: PlanLine) => formatShortfallActions(record.shortfallActions),
    },
    getSummaryEditColumn<PlanLine>(viewOnly, onEditLine),
  ];

  const deviationColumns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getSummaryToBringColumn<PlanLine>(),
    {
      title: 'Delta',
      width: 80,
      render: (_: unknown, record: PlanLine) => {
        const delta = getDeviationDelta(record);
        return delta >= 0 ? `+${delta}` : delta;
      },
    },
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
    <div className="approval-pack-tab">
      <div className="approval-pack-tab-toolbar">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, flex: 1 }}>
          Deviations and shortfalls with resolution recorded — ready for offline approval
          presentation.
        </Typography.Paragraph>
        <Select
          value={filter}
          onChange={setFilter}
          style={{ width: 180 }}
          options={[
            { label: 'Pending approval', value: 'pending' },
            { label: 'Approved', value: 'approved' },
          ]}
        />
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
          Print
        </Button>
      </div>

      {total === 0 ? (
        <Empty
          description={
            filter === 'pending'
              ? 'No items pending approval.'
              : 'No approved items yet.'
          }
          style={{ padding: '32px 0' }}
        />
      ) : (
        <>
          {shortfalls.length > 0 && (
            <section className="approval-pack-tab-section">
              <Typography.Title level={5} style={{ marginBottom: 12 }}>
                Shortfalls ({shortfalls.length})
              </Typography.Title>
              <div className="detachment-table-container">
                <Table
                  dataSource={shortfalls}
                  columns={shortfallColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  tableLayout={DETACHMENT_TABLE_LAYOUT}
                  scroll={{ x: APPROVAL_PACK_SHORTFALL_SCROLL_X }}
                  rowClassName={() => 'row-shortfall'}
                />
              </div>
            </section>
          )}

          {deviations.length > 0 && (
            <section className="approval-pack-tab-section">
              <Typography.Title level={5} style={{ marginBottom: 12 }}>
                Deviations ({deviations.length})
              </Typography.Title>
              <div className="detachment-table-container">
                <Table
                  dataSource={deviations}
                  columns={deviationColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  tableLayout={DETACHMENT_TABLE_LAYOUT}
                  scroll={{ x: APPROVAL_PACK_DEVIATION_SCROLL_X }}
                  rowClassName={() => 'row-deviation'}
                />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
