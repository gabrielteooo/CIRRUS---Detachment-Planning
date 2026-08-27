import { useMemo } from 'react';
import { Button, Empty, Table, Typography } from 'antd';
import {
  formatShortfallActions,
  formatDeviationResolution,
  getApprovalPackLines,
} from '../../types/planLine';
import type { PlanLine } from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import { formatDate } from '../../utils/planUtils';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getToBringColumn,
  getSummaryShortfallDeltaColumn,
  getSummaryDeviationDeltaColumn,
  DETACHMENT_TABLE_LAYOUT,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
  APPROVAL_PACK_SHORTFALL_SCROLL_X,
  APPROVAL_PACK_DEVIATION_SCROLL_X,
} from './nsnTableColumns';

interface ApprovedTabProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
}

const APPROVAL_META_COLUMN_WIDTH = 140;
const EDIT_COLUMN_WIDTH = 72;

function getApprovedByColumn() {
  return {
    title: 'Approved by',
    key: 'approvedBy',
    width: APPROVAL_META_COLUMN_WIDTH,
    ellipsis: true,
    render: (_: unknown, record: PlanLine) =>
      record.offlineApproval?.approverName?.trim() || '—',
  };
}

function getApprovedDateColumn() {
  return {
    title: 'Date of approval',
    key: 'approvedDate',
    width: APPROVAL_META_COLUMN_WIDTH,
    render: (_: unknown, record: PlanLine) => {
      const date = record.offlineApproval?.approvedDate;
      return date ? formatDate(date) : '—';
    },
  };
}

export default function ApprovedTab({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onViewInventory,
}: ApprovedTabProps) {
  const { shortfalls, deviations } = useMemo(
    () => getApprovalPackLines(lines, 'approved'),
    [lines],
  );
  const total = shortfalls.length + deviations.length;

  const editColumn = {
    title: '',
    key: 'edit',
    width: EDIT_COLUMN_WIDTH,
    fixed: 'right' as const,
    render: (_: unknown, record: PlanLine) =>
      !viewOnly ? (
        <Button type="link" size="small" onClick={() => onEditLine(record)}>
          Edit
        </Button>
      ) : null,
  };

  const shortfallColumns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    getToBringColumn<PlanLine>(),
    getSummaryShortfallDeltaColumn<PlanLine>(),
    {
      title: 'Resolution',
      key: 'resolution',
      width: FLEX_TEXT_COLUMN_MIN_WIDTH,
      ellipsis: true,
      render: (_: unknown, record: PlanLine) => formatShortfallActions(record.shortfallActions),
    },
    getApprovedByColumn(),
    getApprovedDateColumn(),
    editColumn,
  ];

  const deviationColumns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    getToBringColumn<PlanLine>(),
    getSummaryDeviationDeltaColumn<PlanLine>(80),
    {
      title: 'Reason / Remarks',
      key: 'deviationResolution',
      width: FLEX_TEXT_COLUMN_MIN_WIDTH,
      ellipsis: true,
      render: (_: unknown, record: PlanLine) => formatDeviationResolution(record),
    },
    getApprovedByColumn(),
    getApprovedDateColumn(),
    editColumn,
  ];

  if (total === 0) {
    return (
      <Empty
        description="No approved items yet. Save selections from the approval pack to record approvals here."
        style={{ padding: '48px 0' }}
      />
    );
  }

  const approvalMetaWidth = APPROVAL_META_COLUMN_WIDTH * 2 + EDIT_COLUMN_WIDTH;

  return (
    <div className="approval-pack-tab approved-tab">
      <Typography.Paragraph type="secondary" className="approval-pack-tab-intro">
        Shortfalls and additional requirements that have been approved offline, with approving
        officer and date recorded.
      </Typography.Paragraph>

      {shortfalls.length > 0 && (
        <section className="approval-pack-tab-section">
          <Typography.Title level={5} className="approval-pack-section-title">
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
              scroll={{ x: APPROVAL_PACK_SHORTFALL_SCROLL_X + approvalMetaWidth }}
            />
          </div>
        </section>
      )}

      {deviations.length > 0 && (
        <section className="approval-pack-tab-section">
          <Typography.Title level={5} className="approval-pack-section-title">
            Additional requirements ({deviations.length})
          </Typography.Title>
          <div className="detachment-table-container">
            <Table
              dataSource={deviations}
              columns={deviationColumns}
              rowKey="id"
              pagination={false}
              size="small"
              tableLayout={DETACHMENT_TABLE_LAYOUT}
              scroll={{ x: APPROVAL_PACK_DEVIATION_SCROLL_X + approvalMetaWidth }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
