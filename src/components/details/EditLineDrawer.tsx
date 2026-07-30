import {
  Drawer,
  Form,
  InputNumber,
  Checkbox,
  Input,
  Select,
  Tag,
  Typography,
  Button,
  Space,
  message,
} from 'antd';
import { useEffect, type ReactNode } from 'react';
import type {
  LineStatus,
  PlanLine,
  ShortfallAction,
  ShortfallActionType,
} from '../../types/planLine';
import {
  formatLineStatus,
  getGroupAvailableQty,
  getPrimaryMemberNsn,
  getShortfallQty,
  isInterchangeableLine,
} from '../../types/planLine';
import { formatDate } from '../../utils/planUtils';

interface EditLineDrawerProps {
  line: PlanLine | null;
  open: boolean;
  onClose: () => void;
  onSave: (line: PlanLine) => void;
  planNeedByDate: string;
}

type LineMode = 'shortfall' | 'deviation';

const STATUS_TAG_COLORS: Record<LineStatus, string> = {
  Met: 'success',
  Deviation: 'warning',
  Shortfall: 'error',
};

function resolveLineMode(line: PlanLine, toBringQty: number): LineMode | null {
  if (line.availableQty < line.requiredQty) return 'shortfall';
  if (line.isAddedNsn || toBringQty > line.requiredQty) return 'deviation';
  return null;
}

function resolveLineStatus(line: PlanLine, toBringQty: number): LineStatus {
  if (line.availableQty < line.requiredQty) return 'Shortfall';
  if (line.isAddedNsn || toBringQty > line.requiredQty) return 'Deviation';
  return 'Met';
}

function ActionDetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="shortfall-action-card shortfall-action-card--selected">
      <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
        {title}
      </Typography.Text>
      {children}
    </div>
  );
}

function QtyReferenceStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'warning' | 'success';
}) {
  return (
    <div className={`edit-line-qty-stat edit-line-qty-stat--${tone}`}>
      <Typography.Text className="edit-line-qty-stat-label">{label}</Typography.Text>
      <Typography.Text className="edit-line-qty-stat-value">{value}</Typography.Text>
    </div>
  );
}

function ShortfallActionQtyField({
  actionType,
  fieldName,
  selectedActions,
  shortfallQty,
}: {
  actionType: ShortfallActionType;
  fieldName: 'acceptQty' | 'waitQty' | 'cannQty';
  selectedActions: ShortfallActionType[];
  shortfallQty: number;
}) {
  const isSelected = selectedActions.includes(actionType);

  return (
    <div className="shortfall-action-row-qty">
      <Typography.Text type="secondary">Qty:</Typography.Text>
      <Form.Item
        name={fieldName}
        noStyle
        rules={[
          {
            validator: (_, value) => {
              if (!isSelected) return Promise.resolve();
              if (value != null && value >= 1) return Promise.resolve();
              return Promise.reject(new Error('Enter qty'));
            },
          },
        ]}
        style={{ marginBottom: 0 }}
      >
        <InputNumber
          min={1}
          max={shortfallQty || undefined}
          disabled={!isSelected}
          style={{ width: 72 }}
        />
      </Form.Item>
    </div>
  );
}

export default function EditLineDrawer({
  line,
  open,
  onClose,
  onSave,
  planNeedByDate,
}: EditLineDrawerProps) {
  const [form] = Form.useForm();
  const toBringQty = Form.useWatch('toBringQty', form);
  const shortfallActionTypes = Form.useWatch('shortfallActionTypes', form) as
    | ShortfallActionType[]
    | undefined;

  useEffect(() => {
    if (line && open) {
      const acceptAction = line.shortfallActions.find((a) => a.type === 'accept');
      const waitAction = line.shortfallActions.find((a) => a.type === 'wait');
      const cannAction = line.shortfallActions.find((a) => a.type === 'cannibalise');
      const defaultQty = getShortfallQty(line) || 1;

      form.setFieldsValue({
        toBringQty: line.toBringQty,
        deviationReason: line.deviationReason,
        shortfallTargetNsn:
          waitAction?.targetNsn ??
          acceptAction?.targetNsn ??
          cannAction?.targetNsn ??
          line.shortfallTargetNsn ??
          getPrimaryMemberNsn(line),
        shortfallActionTypes: line.shortfallActions.map((a) => a.type),
        acceptQty: acceptAction?.qty ?? defaultQty,
        acceptRemarks: acceptAction?.type === 'accept' ? acceptAction.remarks : '',
        waitQty: waitAction?.qty ?? defaultQty,
        waitRef: waitAction?.type === 'wait' ? waitAction.repairComponentRef : undefined,
        cannQty: cannAction?.qty ?? defaultQty,
        cannTail: cannAction?.type === 'cannibalise' ? cannAction.tailNumber : '',
        cannComments: cannAction?.type === 'cannibalise' ? cannAction.workCentreComments : '',
      });
    }
  }, [line, open, form]);

  if (!line) return null;

  const isGroup = isInterchangeableLine(line);
  const groupAvailable = getGroupAvailableQty(line);

  const currentToBring = toBringQty ?? line.toBringQty;
  const lineMode = resolveLineMode(line, currentToBring);
  const lineStatus = resolveLineStatus(line, currentToBring);
  const shortfallQty = getShortfallQty(line);
  const selectedActions = shortfallActionTypes ?? [];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const nextToBringQty = values.toBringQty ?? line.requiredQty;

      if (nextToBringQty > groupAvailable) {
        message.error(`To-bring cannot exceed available qty (${groupAvailable})`);
        return;
      }

      const mode = resolveLineMode(line, nextToBringQty);
      const actionTypes: ShortfallActionType[] = values.shortfallActionTypes ?? [];
      const shortfallTargetNsn = values.shortfallTargetNsn as string | undefined;

      if (mode === 'shortfall' && actionTypes.length === 0) {
        message.error('Select at least one resolution action');
        return;
      }

      const shortfallActions: ShortfallAction[] =
        mode === 'shortfall'
          ? actionTypes.map((type) => {
              const existing = line.shortfallActions.find((a) => a.type === type);
              const approved = existing?.approved ?? false;

              if (type === 'accept') {
                return {
                  type: 'accept',
                  qty: values.acceptQty ?? 1,
                  remarks: values.acceptRemarks ?? '',
                  approved,
                  targetNsn: shortfallTargetNsn,
                };
              }
              if (type === 'wait') {
                return {
                  type: 'wait',
                  qty: values.waitQty ?? 1,
                  repairComponentRef: values.waitRef,
                  needByDate: planNeedByDate,
                  approved,
                  targetNsn: shortfallTargetNsn,
                };
              }
              return {
                type: 'cannibalise',
                qty: values.cannQty ?? 1,
                tailNumber: values.cannTail ?? '',
                workCentreComments: values.cannComments ?? '',
                confirmedWithWorkCentre: true,
                approved,
                targetNsn: shortfallTargetNsn,
              };
            })
          : [];

      if (mode === 'shortfall' && actionTypes.includes('cannibalise') && !values.cannTail) {
        message.error('Cannibalise requires aircraft tail #');
        return;
      }

      const updated: PlanLine = {
        ...line,
        toBringQty: nextToBringQty,
        shortfallTargetNsn: shortfallTargetNsn ?? line.shortfallTargetNsn,
        shortfallActions,
      };

      if (mode === 'deviation') {
        updated.deviationReason = values.deviationReason;
        updated.deviationRemarks = undefined;
        updated.deviationApproved = line.deviationApproved ?? false;
      } else {
        updated.deviationReason = undefined;
        updated.deviationRemarks = undefined;
        updated.deviationApproved = undefined;
      }

      onSave(updated);
      onClose();
    } catch {
      // validation failed
    }
  };

  return (
    <Drawer
      title={`Edit line — ${line.description}`}
      className="edit-line-drawer"
      open={open}
      onClose={onClose}
      width={560}
      destroyOnClose
      footer={
        <div className="edit-line-drawer-footer">
          <Button type="text" className="edit-line-drawer-cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      }
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        NSN: {line.nsn}
      </Typography.Text>

      <Form form={form} layout="vertical">
        <div className="edit-line-qty-panel">
          <Typography.Text strong className="edit-line-qty-panel-title">
            To-bring qty
          </Typography.Text>
          <Typography.Text type="secondary" className="edit-line-qty-panel-subtitle">
            Use required and available below as reference when setting to-bring.
          </Typography.Text>

          <div className="edit-line-qty-reference">
            <QtyReferenceStat label="Required" value={line.requiredQty} />
            <QtyReferenceStat
              label="Available"
              value={groupAvailable}
              tone={groupAvailable < line.requiredQty ? 'warning' : 'success'}
            />
          </div>

          <Form.Item
            name="toBringQty"
            label="To-bring"
            rules={[
              { required: true, message: 'Enter to-bring quantity' },
              {
                validator: (_, value) => {
                  if (value == null || value <= groupAvailable) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(`To-bring cannot exceed available qty (${groupAvailable})`),
                  );
                },
              },
            ]}
            className="edit-line-to-bring-field"
          >
            <InputNumber
              className="edit-line-to-bring"
              min={0}
              max={groupAvailable}
              style={{ width: '100%', height: 48 }}
            />
          </Form.Item>
        </div>

        <div className="edit-line-type-section">
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Line type
          </Typography.Text>
          <Tag color={STATUS_TAG_COLORS[lineStatus]} style={{ fontSize: 13, padding: '2px 10px' }}>
            {formatLineStatus(lineStatus)}
          </Tag>
        </div>

        {lineMode === 'deviation' && (
          <Form.Item
            name="deviationReason"
            label="Reason"
            rules={[{ required: true, message: 'Enter a deviation reason' }]}
          >
            <Input.TextArea rows={3} placeholder="Describe why to-bring qty exceeds required qty" />
          </Form.Item>
        )}

        {lineMode === 'shortfall' && (
          <div className="shortfall-resolution-panel">
            <Typography.Text strong style={{ fontSize: 15, display: 'block' }}>
              Resolution actions required
            </Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', margin: '4px 0 16px' }}>
              Select one or more actions below and specify the shortfall qty for each. Total
              shortfall: <Typography.Text strong>{shortfallQty}</Typography.Text>
            </Typography.Text>

            {isGroup && (
              <Form.Item
                name="shortfallTargetNsn"
                label="Top up which NSN?"
                rules={[{ required: true, message: 'Select NSN to top up' }]}
              >
                <Select
                  options={line.interchangeableMembers!.map((member) => ({
                    value: member.nsn,
                    label: `${member.nsn} — ${member.availableQty} avail`,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item
              name="shortfallActionTypes"
              rules={[{ required: true, message: 'Select at least one resolution action' }]}
            >
              <Checkbox.Group className="shortfall-action-checkboxes">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <div
                    className={`shortfall-action-row${
                      selectedActions.includes('accept') ? ' shortfall-action-row--selected' : ''
                    }`}
                  >
                    <Checkbox value="accept">Accept shortfall</Checkbox>
                    <ShortfallActionQtyField
                      actionType="accept"
                      fieldName="acceptQty"
                      selectedActions={selectedActions}
                      shortfallQty={shortfallQty}
                    />
                  </div>
                  <div
                    className={`shortfall-action-row${
                      selectedActions.includes('wait') ? ' shortfall-action-row--selected' : ''
                    }`}
                  >
                    <Checkbox value="wait">Wait (expedite repair/new buys)</Checkbox>
                    <ShortfallActionQtyField
                      actionType="wait"
                      fieldName="waitQty"
                      selectedActions={selectedActions}
                      shortfallQty={shortfallQty}
                    />
                  </div>
                  <div
                    className={`shortfall-action-row${
                      selectedActions.includes('cannibalise') ? ' shortfall-action-row--selected' : ''
                    }`}
                  >
                    <Checkbox value="cannibalise">Cannibalise</Checkbox>
                    <ShortfallActionQtyField
                      actionType="cannibalise"
                      fieldName="cannQty"
                      selectedActions={selectedActions}
                      shortfallQty={shortfallQty}
                    />
                  </div>
                </Space>
              </Checkbox.Group>
            </Form.Item>

            <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
              {selectedActions.includes('accept') && (
                <ActionDetailCard title="Accept shortfall — details">
                  <Form.Item name="acceptRemarks" label="Risk / remarks">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </ActionDetailCard>
              )}

              {selectedActions.includes('wait') && (
                <ActionDetailCard title="Wait — details">
                  <Form.Item
                    name="waitRef"
                    label="Component PO no."
                    rules={[{ required: true, message: 'Enter PO no.' }]}
                  >
                    <Input placeholder="Enter PO no." />
                  </Form.Item>
                  <div>
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                      Need-by-date
                    </Typography.Text>
                    <Typography.Text strong>{formatDate(planNeedByDate)}</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                      From detachment plan
                    </Typography.Text>
                  </div>
                </ActionDetailCard>
              )}

              {selectedActions.includes('cannibalise') && (
                <ActionDetailCard title="Cannibalise — details">
                  <Form.Item
                    name="cannTail"
                    label="Aircraft tail #"
                    rules={[{ required: true, message: 'Enter tail #' }]}
                  >
                    <Input placeholder="e.g. AF-2041" />
                  </Form.Item>
                  <Form.Item name="cannComments" label="Remarks">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </ActionDetailCard>
              )}
            </Space>
          </div>
        )}

        {lineMode === null && (
          <Typography.Text type="secondary">
            No deviation or shortfall actions required for this line.
          </Typography.Text>
        )}
      </Form>
    </Drawer>
  );
}
