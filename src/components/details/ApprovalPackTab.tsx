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
  App,
} from 'antd';
import type { Dayjs } from 'dayjs';
import type { OfflineApprovalRecord, PlanLine } from '../../types/planLine';
import {
  formatShortfallActions,
  formatDeviationResolution,
  getApprovalPackLines,
} from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredToBringInWarehouseColumns,
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
  onViewNsn: (line: PlanLine) => void;
  onApproveLines: (lineIds: string[], approval: OfflineApprovalRecord) => void;
  onSaved?: () => void;
}

const ACTION_COLUMN_WIDTH = 120;

export default function ApprovalPackTab({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onViewInventory,
  onViewNsn,
  onApproveLines,
  onSaved,
}: ApprovalPackTabProps) {
  const { message } = App.useApp();
  const [approverName, setApproverName] = useState('');
  const [approvedDate, setApprovedDate] = useState<Dayjs | null>(null);
  const [showSignoffValidation, setShowSignoffValidation] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());

  const { shortfalls, deviations } = useMemo(
    () => getApprovalPackLines(lines, 'pending'),
    [lines],
  );
  const total = shortfalls.length + deviations.length;

  const pendingLines = useMemo(() => {
    const byId = new Map<string, PlanLine>();
    for (const line of [...shortfalls, ...deviations]) {
      byId.set(line.id, line);
    }
    return [...byId.values()];
  }, [shortfalls, deviations]);

  const allSelected =
    pendingLines.length > 0 && pendingLines.every((line) => selectedLineIds.has(line.id));
  const someSelected =
    pendingLines.some((line) => selectedLineIds.has(line.id)) && !allSelected;

  const approverMissing = !approverName.trim();
  const dateMissing = !approvedDate;
  const signoffIncomplete = approverMissing || dateMissing;

  useEffect(() => {
    if (showSignoffValidation && !signoffIncomplete) {
      setShowSignoffValidation(false);
    }
  }, [showSignoffValidation, signoffIncomplete]);

  useEffect(() => {
    setSelectedLineIds((current) => {
      const pendingIds = new Set(pendingLines.map((line) => line.id));
      const next = new Set([...current].filter((id) => pendingIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [pendingLines]);

  const buildApprovalRecord = (): OfflineApprovalRecord | null => {
    if (signoffIncomplete) {
      setShowSignoffValidation(true);
      message.error('Enter approving officer and date of approval before saving');
      return null;
    }
    return {
      approverName: approverName.trim(),
      approvedDate: approvedDate!.format('YYYY-MM-DD'),
    };
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLineIds(new Set(pendingLines.map((line) => line.id)));
      return;
    }
    setSelectedLineIds(new Set());
  };

  const handleRowSelect = (lineId: string, checked: boolean) => {
    setSelectedLineIds((current) => {
      const next = new Set(current);
      if (checked) next.add(lineId);
      else next.delete(lineId);
      return next;
    });
  };

  const handleSave = () => {
    const lineIdsToApprove = [...selectedLineIds];
    if (lineIdsToApprove.length === 0) {
      message.error('Select at least one line to approve');
      return;
    }

    const approval = buildApprovalRecord();
    if (!approval) return;

    onApproveLines(lineIdsToApprove, approval);
    setSelectedLineIds(new Set());

    const count = lineIdsToApprove.length;
    message.success(`Saved approval for ${count} line${count === 1 ? '' : 's'}`);

    const remainingPending = pendingLines.filter((line) => !lineIdsToApprove.includes(line.id));
    if (remainingPending.length === 0) {
      onSaved?.();
    }
  };

  const actionColumn = {
    title: '',
    key: 'actions',
    width: ACTION_COLUMN_WIDTH,
    fixed: 'right' as const,
    render: (_: unknown, record: PlanLine) => (
      <Space size={4} wrap>
        {!viewOnly && (
          <Checkbox
            checked={selectedLineIds.has(record.id)}
            onChange={(event) => handleRowSelect(record.id, event.target.checked)}
          />
        )}
        {!viewOnly && (
          <Button type="link" size="small" onClick={() => onEditLine(record)}>
            Edit
          </Button>
        )}
      </Space>
    ),
  };

  const shortfallColumns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    ...getRequiredToBringInWarehouseColumns<PlanLine>(onViewInventory, { lines: shortfalls }),
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
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    ...getRequiredToBringInWarehouseColumns<PlanLine>(onViewInventory, { lines: deviations }),
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
        description="No items pending approval. Complete Action required items first, or view saved approvals in Approved."
        style={{ padding: '48px 0' }}
      />
    );
  }

  return (
    <div className="approval-pack-tab">
      <Typography.Paragraph type="secondary" className="approval-pack-tab-intro">
        Select the lines to approve, enter approving officer and date of approval, then approve.
        Unchecked lines remain in the approval pack.
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
                  ? 'Enter approving officer before saving'
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
              Date of approval
            </Typography.Text>
            <Form.Item
              className="approval-pack-signoff-form-item"
              validateStatus={showSignoffValidation && dateMissing ? 'error' : undefined}
              help={
                showSignoffValidation && dateMissing
                  ? 'Select date of approval before saving'
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
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(event) => handleSelectAll(event.target.checked)}
            >
              Select all
            </Checkbox>
            <Button type="primary" onClick={handleSave} disabled={selectedLineIds.size === 0}>
              Approve
            </Button>
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
            />
          </div>
        </section>
      )}
    </div>
  );
}
