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
  computeToBringQty,
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

function ActionDetailFields({ children }: { children: ReactNode }) {
  return <div className="shortfall-action-details">{children}</div>;
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
  const acceptQty = Form.useWatch('acceptQty', form);
  const waitQty = Form.useWatch('waitQty', form);
  const cannQty = Form.useWatch('cannQty', form);
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
        toBringQty:
          line.availableQty < line.requiredQty ||
          getGroupAvailableQty(line) < line.requiredQty
            ? computeToBringQty(line, line.shortfallActions)
            : line.toBringQty,
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

  const currentToBring = toBringQty ?? line?.toBringQty ?? 0;
  const lineMode = line ? resolveLineMode(line, currentToBring) : null;

  useEffect(() => {
    if (!line || !open || lineMode !== 'shortfall') return;

    const actionTypes = shortfallActionTypes ?? [];
    const derivedToBring = computeToBringQty(
      line,
      actionTypes.map((type) => {
        if (type === 'accept') return { type, qty: acceptQty ?? 0 } as ShortfallAction;
        if (type === 'wait') return { type, qty: waitQty ?? 0 } as ShortfallAction;
        return { type: 'cannibalise', qty: cannQty ?? 0 } as ShortfallAction;
      }),
    );

    if (derivedToBring !== toBringQty) {
      form.setFieldValue('toBringQty', derivedToBring);
    }
  }, [
    line,
    open,
    lineMode,
    shortfallActionTypes,
    acceptQty,
    waitQty,
    cannQty,
    toBringQty,
    form,
  ]);

  if (!line) return null;

  const isGroup = isInterchangeableLine(line);
  const groupAvailable = getGroupAvailableQty(line);

  const currentToBringResolved = toBringQty ?? line.toBringQty;
  const lineStatus = resolveLineStatus(line, currentToBringResolved);
  const shortfallQty = getShortfallQty(line);
  const selectedActions = shortfallActionTypes ?? [];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const actionTypes: ShortfallActionType[] = values.shortfallActionTypes ?? [];
      const shortfallTargetNsn = values.shortfallTargetNsn as string | undefined;

      const shortfallActions: ShortfallAction[] =
        resolveLineMode(line, values.toBringQty ?? line.toBringQty) === 'shortfall'
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

      const mode = resolveLineMode(line, values.toBringQty ?? line.toBringQty);

      if (mode === 'shortfall' && actionTypes.length === 0) {
        message.error('Select at least one resolution action');
        return;
      }

      const nextToBringQty =
        mode === 'shortfall'
          ? computeToBringQty(line, shortfallActions)
          : (values.toBringQty ?? line.requiredQty);

      if (mode !== 'shortfall' && nextToBringQty > groupAvailable) {
        message.error(`To-bring cannot exceed available qty (${groupAvailable})`);
        return;
      }

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
            {lineMode === 'shortfall'
              ? 'Matches required qty when stock is sufficient; otherwise available plus wait/cannibalise resolution qty.'
              : 'Use required and available below as reference when setting to-bring.'}
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
              ...(lineMode === 'shortfall'
                ? []
                : [
                    {
                      validator: (_: unknown, value: number | null) => {
                        if (value == null || value <= groupAvailable) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(`To-bring cannot exceed available qty (${groupAvailable})`),
                        );
                      },
                    },
                  ]),
            ]}
            className="edit-line-to-bring-field"
          >
            <InputNumber
              className="edit-line-to-bring"
              min={0}
              max={lineMode === 'shortfall' ? undefined : groupAvailable}
              readOnly={lineMode === 'shortfall'}
              disabled={lineMode === 'shortfall'}
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
                    className={`shortfall-action-block${
                      selectedActions.includes('accept') ? ' shortfall-action-block--selected' : ''
                    }`}
                  >
                    <div className="shortfall-action-row">
                      <Checkbox value="accept">Accept shortfall</Checkbox>
                      <ShortfallActionQtyField
                        actionType="accept"
                        fieldName="acceptQty"
                        selectedActions={selectedActions}
                        shortfallQty={shortfallQty}
                      />
                    </div>
                    {selectedActions.includes('accept') && (
                      <ActionDetailFields>
                        <Form.Item name="acceptRemarks" label="Risk / remarks">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </ActionDetailFields>
                    )}
                  </div>

                  <div
                    className={`shortfall-action-block${
                      selectedActions.includes('wait') ? ' shortfall-action-block--selected' : ''
                    }`}
                  >
                    <div className="shortfall-action-row">
                      <Checkbox value="wait">Wait (expedite repair/new buys)</Checkbox>
                      <ShortfallActionQtyField
                        actionType="wait"
                        fieldName="waitQty"
                        selectedActions={selectedActions}
                        shortfallQty={shortfallQty}
                      />
                    </div>
                    {selectedActions.includes('wait') && (
                      <ActionDetailFields>
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
                          <Typography.Text
                            type="secondary"
                            style={{ display: 'block', fontSize: 12, marginTop: 4 }}
                          >
                            From detachment plan
                          </Typography.Text>
                        </div>
                      </ActionDetailFields>
                    )}
                  </div>

                  <div
                    className={`shortfall-action-block${
                      selectedActions.includes('cannibalise')
                        ? ' shortfall-action-block--selected'
                        : ''
                    }`}
                  >
                    <div className="shortfall-action-row">
                      <Checkbox value="cannibalise">Cannibalise</Checkbox>
                      <ShortfallActionQtyField
                        actionType="cannibalise"
                        fieldName="cannQty"
                        selectedActions={selectedActions}
                        shortfallQty={shortfallQty}
                      />
                    </div>
                    {selectedActions.includes('cannibalise') && (
                      <ActionDetailFields>
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
                      </ActionDetailFields>
                    )}
                  </div>
                </Space>
              </Checkbox.Group>
            </Form.Item>
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
