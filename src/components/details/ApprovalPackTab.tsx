import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import type { OfflineApprovalRecord, PlanLine } from '../../types/planLine';
import {
  formatShortfallActions,
  formatDeviationResolution,
  getApprovalPackLines,
  isLineApprovalComplete,
} from '../../types/planLine';
import type { Platform } from '../../types/detachment';
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

interface ApprovalPackTabProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
  onApproveLine: (lineId: string, approval: OfflineApprovalRecord | null) => void;
}

const ACTION_COLUMN_WIDTH = 160;

export default function ApprovalPackTab({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onViewInventory,
  onApproveLine,
}: ApprovalPackTabProps) {
  const [approverName, setApproverName] = useState('');
  const [approvedDate, setApprovedDate] = useState<Dayjs | null>(null);
  const [showSignoffValidation, setShowSignoffValidation] = useState(false);

  const { shortfalls, deviations } = useMemo(
    () => getApprovalPackLines(lines, 'all'),
    [lines],
  );
  const total = shortfalls.length + deviations.length;

  const allPackLines = useMemo(() => {
    const byId = new Map<string, PlanLine>();
    for (const line of [...shortfalls, ...deviations]) {
      byId.set(line.id, line);
    }
    return [...byId.values()];
  }, [shortfalls, deviations]);

  const approvedCount = allPackLines.filter(isLineApprovalComplete).length;
  const allApproved = allPackLines.length > 0 && approvedCount === allPackLines.length;
  const someApproved = approvedCount > 0 && !allApproved;

  const approverMissing = !approverName.trim();
  const dateMissing = !approvedDate;
  const signoffIncomplete = approverMissing || dateMissing;

  useEffect(() => {
    if (showSignoffValidation && !signoffIncomplete) {
      setShowSignoffValidation(false);
    }
  }, [showSignoffValidation, signoffIncomplete]);

  const buildApprovalRecord = (): OfflineApprovalRecord | null => {
    if (signoffIncomplete) {
      setShowSignoffValidation(true);
      message.error('Enter approving officer and date before approving');
      return null;
    }
    return {
      approverName: approverName.trim(),
      approvedDate: approvedDate!.format('YYYY-MM-DD'),
    };
  };

  const handleSelectAllApprove = (checked: boolean) => {
    if (checked) {
      const approval = buildApprovalRecord();
      if (!approval) return;
      let newlyApproved = 0;
      for (const line of allPackLines) {
        if (!isLineApprovalComplete(line)) {
          onApproveLine(line.id, approval);
          newlyApproved += 1;
        }
      }
      message.success(
        newlyApproved > 0
          ? `Approved ${newlyApproved} line${newlyApproved === 1 ? '' : 's'}`
          : 'All lines already approved',
      );
      return;
    }

    for (const line of allPackLines) {
      if (isLineApprovalComplete(line)) {
        onApproveLine(line.id, null);
      }
    }
    message.success('Approvals removed');
  };

  const handleApproveToggle = (line: PlanLine, checked: boolean) => {
    if (checked) {
      const approval = buildApprovalRecord();
      if (!approval) return;
      onApproveLine(line.id, approval);
      message.success('Line approved');
      return;
    }
    onApproveLine(line.id, null);
    message.success('Approval removed');
  };

  const actionColumn = {
    title: '',
    key: 'actions',
    width: ACTION_COLUMN_WIDTH,
    fixed: 'right' as const,
    render: (_: unknown, record: PlanLine) => {
      const approved = isLineApprovalComplete(record);
      return (
        <Space size={4} wrap>
          {!viewOnly && (
            <Checkbox
              checked={approved}
              onChange={(e) => handleApproveToggle(record, e.target.checked)}
            >
              Approve
            </Checkbox>
          )}
          {!viewOnly && (
            <Button type="link" size="small" onClick={() => onEditLine(record)}>
              Edit
            </Button>
          )}
        </Space>
      );
    },
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
    actionColumn,
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
    actionColumn,
  ];

  if (total === 0) {
    return (
      <Empty
        description="No items in the approval pack yet. Complete Action required items first."
        style={{ padding: '48px 0' }}
      />
    );
  }

  return (
    <div className="approval-pack-tab">
      <Typography.Paragraph type="secondary" className="approval-pack-tab-intro">
        Additional requirements and shortfalls with resolution recorded — ready for offline approval
        presentation.
      </Typography.Paragraph>

      <div
        className={`approval-pack-signoff-bar${
          showSignoffValidation && signoffIncomplete ? ' approval-pack-signoff-bar--error' : ''
        }`}
      >
        <div className="approval-pack-signoff-fields">
          <div className="approval-pack-signoff-field approval-pack-signoff-field--officer">
            <Typography.Text type="secondary" className="approval-pack-signoff-label">
              Approving Officer
            </Typography.Text>
            <Form.Item
              className="approval-pack-signoff-form-item"
              validateStatus={
                showSignoffValidation && approverMissing ? 'error' : undefined
              }
              help={
                showSignoffValidation && approverMissing
                  ? 'Enter approving officer before approving lines'
                  : undefined
              }
            >
              <Input
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="e.g. LTC Tan Wei Ming"
                disabled={viewOnly}
              />
            </Form.Item>
          </div>
          <div className="approval-pack-signoff-field approval-pack-signoff-field--date">
            <Typography.Text type="secondary" className="approval-pack-signoff-label">
              Date
            </Typography.Text>
            <Form.Item
              className="approval-pack-signoff-form-item"
              validateStatus={showSignoffValidation && dateMissing ? 'error' : undefined}
              help={
                showSignoffValidation && dateMissing
                  ? 'Select approval date before approving lines'
                  : undefined
              }
            >
              <DatePicker
                value={approvedDate}
                onChange={setApprovedDate}
                format="DD MMM YYYY"
                disabled={viewOnly}
              />
            </Form.Item>
          </div>
        </div>
        {!viewOnly && (
          <div className="approval-pack-signoff-actions">
            <Checkbox
              checked={allApproved}
              indeterminate={someApproved}
              onChange={(event) => handleSelectAllApprove(event.target.checked)}
            >
              Select all to approve
            </Checkbox>
          </div>
        )}
      </div>

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
              scroll={{ x: APPROVAL_PACK_SHORTFALL_SCROLL_X + ACTION_COLUMN_WIDTH }}
          rowClassName={(record) =>
            isLineApprovalComplete(record) ? 'row-approved' : ''
          }
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
              scroll={{ x: APPROVAL_PACK_DEVIATION_SCROLL_X + ACTION_COLUMN_WIDTH }}
              rowClassName={(record) =>
                isLineApprovalComplete(record) ? 'row-approved' : ''
              }
            />
          </div>
        </section>
      )}
    </div>
  );
}
