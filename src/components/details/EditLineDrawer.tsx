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
  DatePicker,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { formatAircraftTailNumber, isValidAircraftTailNumber } from '../../utils/tailNumber';
import { useEffect, type ReactNode } from 'react';
import type {
  CannibaliseShortfallAction,
  LineStatus,
  PlanLine,
  ShortfallAction,
  ShortfallActionType,
  WaitShortfallAction,
} from '../../types/planLine';
import {
  formatLineStatus,
  computeToBringQty,
  canDeviateQty,
  getGroupAvailableQty,
  getPrimaryMemberNsn,
  getShortfallQty,
  isInterchangeableLine,
} from '../../types/planLine';
interface EditLineDrawerProps {
  line: PlanLine | null;
  open: boolean;
  onClose: () => void;
  onSave: (line: PlanLine) => void;
  planNeedByDate: string;
}

type LineMode = 'shortfall' | 'deviation';

interface WaitEntryFormValue {
  qty: number;
  edd: Dayjs;
}

interface CannibaliseEntryFormValue {
  qty: number;
  tail: string;
}

function buildShortfallActionsFromForm(
  line: PlanLine,
  values: {
    shortfallActionTypes?: ShortfallActionType[];
    shortfallTargetNsn?: string;
    acceptQty?: number;
    acceptRemarks?: string;
    waitEntries?: WaitEntryFormValue[];
    waitRemarks?: string;
    cannibaliseEntries?: CannibaliseEntryFormValue[];
    cannComments?: string;
  },
  planNeedByDate: string,
): ShortfallAction[] {
  const actionTypes = values.shortfallActionTypes ?? [];
  const shortfallTargetNsn = values.shortfallTargetNsn;
  const actions: ShortfallAction[] = [];

  if (actionTypes.includes('accept')) {
    const existing = line.shortfallActions.find((a) => a.type === 'accept');
    actions.push({
      type: 'accept',
      qty: values.acceptQty ?? 1,
      remarks: values.acceptRemarks ?? '',
      approved: existing?.approved ?? false,
      targetNsn: shortfallTargetNsn,
    });
  }

  if (actionTypes.includes('wait')) {
    const existingWait = line.shortfallActions.filter(
      (a): a is WaitShortfallAction => a.type === 'wait',
    );
    for (const [index, entry] of (values.waitEntries ?? []).entries()) {
      actions.push({
        type: 'wait',
        qty: entry.qty ?? 1,
        remarks: values.waitRemarks ?? '',
        needByDate: entry.edd?.format('YYYY-MM-DD') ?? planNeedByDate,
        approved: existingWait[index]?.approved ?? false,
        targetNsn: shortfallTargetNsn,
      });
    }
  }

  if (actionTypes.includes('cannibalise')) {
    const existingCann = line.shortfallActions.filter(
      (a): a is CannibaliseShortfallAction => a.type === 'cannibalise',
    );
    for (const [index, entry] of (values.cannibaliseEntries ?? []).entries()) {
      actions.push({
        type: 'cannibalise',
        qty: entry.qty ?? 1,
        tailNumber: formatAircraftTailNumber(entry.tail ?? ''),
        workCentreComments: values.cannComments ?? '',
        confirmedWithWorkCentre: true,
        approved: existingCann[index]?.approved ?? false,
        targetNsn: shortfallTargetNsn,
      });
    }
  }

  return actions;
}

const STATUS_TAG_COLORS: Record<LineStatus, string> = {
  Met: 'success',
  Deviation: 'warning',
  Shortfall: 'error',
};

function resolveLineMode(line: PlanLine, toBringQty: number): LineMode | null {
  if (getGroupAvailableQty(line) < line.requiredQty) return 'shortfall';
  if (line.isAddedNsn || toBringQty > line.requiredQty) return 'deviation';
  return null;
}

function resolveLineStatus(line: PlanLine, toBringQty: number): LineStatus {
  if (getGroupAvailableQty(line) < line.requiredQty) return 'Shortfall';
  if (line.isAddedNsn || toBringQty > line.requiredQty) return 'Deviation';
  return 'Met';
}

function ActionDetailFields({ children }: { children: ReactNode }) {
  return <div className="shortfall-action-details">{children}</div>;
}

function ShortfallActionQtyField({
  actionType,
  fieldName,
  selectedActions,
  shortfallQty,
}: {
  actionType: ShortfallActionType;
  fieldName: 'acceptQty';
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
  const waitEntries = Form.useWatch('waitEntries', form) as WaitEntryFormValue[] | undefined;
  const cannibaliseEntries = Form.useWatch('cannibaliseEntries', form) as
    | CannibaliseEntryFormValue[]
    | undefined;
  const shortfallActionTypes = Form.useWatch('shortfallActionTypes', form) as
    | ShortfallActionType[]
    | undefined;

  useEffect(() => {
    if (line && open) {
      const acceptAction = line.shortfallActions.find((a) => a.type === 'accept');
      const waitActions = line.shortfallActions.filter(
        (a): a is WaitShortfallAction => a.type === 'wait',
      );
      const cannActions = line.shortfallActions.filter(
        (a): a is CannibaliseShortfallAction => a.type === 'cannibalise',
      );
      const defaultQty = getShortfallQty(line) || 1;

      const groupAvail = getGroupAvailableQty(line);
      const isShortfall = groupAvail < line.requiredQty;
      const defaultToBring = isShortfall
        ? computeToBringQty(line, line.shortfallActions)
        : line.toBringQty;

      form.setFieldsValue({
        toBringQty: defaultToBring,
        deviationReason: line.deviationReason,
        shortfallTargetNsn:
          waitActions[0]?.targetNsn ??
          acceptAction?.targetNsn ??
          cannActions[0]?.targetNsn ??
          line.shortfallTargetNsn ??
          getPrimaryMemberNsn(line),
        shortfallActionTypes: [...new Set(line.shortfallActions.map((a) => a.type))],
        acceptQty: acceptAction?.qty ?? defaultQty,
        acceptRemarks: acceptAction?.type === 'accept' ? acceptAction.remarks : '',
        waitEntries:
          waitActions.length > 0
            ? waitActions.map((action) => ({
                qty: action.qty,
                edd: dayjs(action.needByDate, 'YYYY-MM-DD'),
              }))
            : [{ qty: defaultQty, edd: dayjs(planNeedByDate, 'YYYY-MM-DD') }],
        waitRemarks: waitActions[0]?.remarks ?? '',
        cannibaliseEntries:
          cannActions.length > 0
            ? cannActions.map((action) => ({
                qty: action.qty,
                tail: formatAircraftTailNumber(action.tailNumber),
              }))
            : [{ qty: defaultQty, tail: '' }],
        cannComments: cannActions[0]?.workCentreComments ?? '',
      });
    }
  }, [line, open, form, planNeedByDate]);

  const currentToBring = toBringQty ?? line?.toBringQty ?? 0;
  const lineMode = line ? resolveLineMode(line, currentToBring) : null;

  useEffect(() => {
    if (!line || !open || lineMode !== 'shortfall') return;

    const actionTypes = shortfallActionTypes ?? [];
    const derivedToBring = computeToBringQty(
      line,
      buildShortfallActionsFromForm(
        line,
        {
          shortfallActionTypes: actionTypes,
          acceptQty,
          waitEntries,
          cannibaliseEntries,
        },
        planNeedByDate,
      ),
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
    waitEntries,
    cannibaliseEntries,
    toBringQty,
    form,
    planNeedByDate,
  ]);

  if (!line) return null;

  const isGroup = isInterchangeableLine(line);
  const groupAvailable = getGroupAvailableQty(line);
  const currentToBringResolved = toBringQty ?? line.toBringQty;
  const lineStatus = resolveLineStatus(line, currentToBringResolved);
  const shortfallQty = getShortfallQty(line);
  const selectedActions = shortfallActionTypes ?? [];
  const toBringReadOnly = lineMode === 'shortfall';
  const showDeviationHint = lineMode === null && canDeviateQty(line);
  const revertingDeviation =
    lineMode === null &&
    !line.isAddedNsn &&
    line.toBringQty > line.requiredQty &&
    currentToBringResolved === line.requiredQty;
  const toBringMin =
    lineMode === 'shortfall'
      ? 0
      : line.isAddedNsn
        ? line.requiredQty + 1
        : lineMode === 'deviation' || line.toBringQty > line.requiredQty
          ? line.requiredQty
          : 0;

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const actionTypes: ShortfallActionType[] = values.shortfallActionTypes ?? [];
      const shortfallTargetNsn = values.shortfallTargetNsn as string | undefined;
      const mode = resolveLineMode(line, values.toBringQty ?? line.toBringQty);

      if (mode === 'shortfall') {
        if (actionTypes.includes('wait') && (values.waitEntries?.length ?? 0) === 0) {
          message.error('Add at least one order for awaiting supply');
          return;
        }

        if (actionTypes.includes('cannibalise') && (values.cannibaliseEntries?.length ?? 0) === 0) {
          message.error('Add at least one aircraft for cannibalise');
          return;
        }

        for (const entry of values.waitEntries ?? []) {
          if (!entry?.edd) {
            message.error('Each awaiting supply entry requires an EDD');
            return;
          }
        }

        for (const entry of values.cannibaliseEntries ?? []) {
          if (!isValidAircraftTailNumber(entry?.tail ?? '')) {
            message.error('Each cannibalise entry requires a 3–4 digit aircraft tail number');
            return;
          }
        }
      }

      const shortfallActions: ShortfallAction[] =
        mode === 'shortfall' ? buildShortfallActionsFromForm(line, values, planNeedByDate) : [];

      const nextToBringQty =
        mode === 'shortfall'
          ? computeToBringQty(line, shortfallActions)
          : (values.toBringQty ?? line.requiredQty);

      if (mode !== 'shortfall' && nextToBringQty > groupAvailable) {
        message.error(`To-bring cannot exceed available qty (${groupAvailable})`);
        return;
      }

      const updated: PlanLine = {
        ...line,
        toBringQty: nextToBringQty,
        shortfallTargetNsn: shortfallTargetNsn ?? line.shortfallTargetNsn,
        shortfallActions,
        deviationApproved: undefined,
      };

      if (mode === 'deviation') {
        updated.deviationReason = values.deviationReason;
        updated.deviationRemarks = undefined;
      } else {
        updated.deviationReason = undefined;
        updated.deviationRemarks = undefined;
        updated.offlineApproval = undefined;
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

      <Tag
        color={STATUS_TAG_COLORS[lineStatus]}
        className="edit-line-status-tag"
      >
        {formatLineStatus(lineStatus)}
      </Tag>

      <Form form={form} layout="vertical">
        <div className="edit-line-qty-row-section">
          <Typography.Text type="secondary" className="edit-line-qty-row-label">
            Qty update
          </Typography.Text>
          <div className="edit-line-qty-row">
            <div className="edit-line-qty-cell">
              <Typography.Text className="edit-line-qty-cell-label">Required</Typography.Text>
              <Typography.Text className="edit-line-qty-cell-value">{line.requiredQty}</Typography.Text>
            </div>
            <div
              className={`edit-line-qty-cell${
                groupAvailable < line.requiredQty ? ' edit-line-qty-cell--warning' : ''
              }`}
            >
              <Typography.Text className="edit-line-qty-cell-label">Available</Typography.Text>
              <Typography.Text className="edit-line-qty-cell-value">{groupAvailable}</Typography.Text>
            </div>
            <div className="edit-line-qty-cell edit-line-qty-cell--input">
              <Typography.Text className="edit-line-qty-cell-label">To-bring</Typography.Text>
              <Form.Item
                name="toBringQty"
                rules={[
                  { required: true, message: 'Enter to-bring quantity' },
                  ...(lineMode !== 'shortfall'
                    ? [
                        {
                          validator: (_: unknown, value: number | null) => {
                            if (value == null || value <= groupAvailable) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error(
                                `To-bring cannot exceed available qty (${groupAvailable})`,
                              ),
                            );
                          },
                        },
                      ]
                    : []),
                ]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  min={toBringMin}
                  max={lineMode !== 'shortfall' ? groupAvailable : undefined}
                  readOnly={toBringReadOnly}
                  disabled={toBringReadOnly}
                  className="edit-line-qty-cell-input"
                />
              </Form.Item>
            </div>
          </div>
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

        {revertingDeviation && (
          <Typography.Text type="secondary">
            To-bring matches the required qty — this line will be marked as fulfilled when saved.
          </Typography.Text>
        )}

        {lineMode === 'shortfall' && (
          <div className="shortfall-resolution-panel">
            <Typography.Text strong className="shortfall-resolution-title">
              Choose a resolution path
            </Typography.Text>
            <Typography.Text type="secondary" className="shortfall-resolution-subtitle">
              Select one or more paths when ready, or save unresolved if undecided. Total shortfall:{' '}
              <Typography.Text strong>{shortfallQty}</Typography.Text>
            </Typography.Text>

            {isGroup && (
              <Form.Item
                name="shortfallTargetNsn"
                label="Top up which NSN?"
                dependencies={['shortfallActionTypes']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator: (_, value) => {
                      const types = getFieldValue('shortfallActionTypes') ?? [];
                      if (types.length === 0 || value) return Promise.resolve();
                      return Promise.reject(new Error('Select NSN to top up'));
                    },
                  }),
                ]}
              >
                <Select
                  options={line.interchangeableMembers!.map((member) => ({
                    value: member.nsn,
                    label: `${member.nsn} — ${member.availableQty} avail`,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item name="shortfallActionTypes">
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
                      <div className="shortfall-action-row-main">
                        <Checkbox value="wait">Awaiting supply</Checkbox>
                        <Typography.Text type="secondary" className="shortfall-action-description">
                          Expedite repair or new buys from one or more orders
                        </Typography.Text>
                      </div>
                    </div>
                    {selectedActions.includes('wait') && (
                      <ActionDetailFields>
                        <Form.List name="waitEntries">
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map((field) => (
                                <div key={field.key} className="shortfall-action-entry-row">
                                  <Form.Item
                                    name={[field.name, 'qty']}
                                    rules={[{ required: true, message: 'Qty' }]}
                                    className="shortfall-action-entry-qty"
                                  >
                                    <InputNumber
                                      min={1}
                                      max={shortfallQty || undefined}
                                      placeholder="Qty"
                                    />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'edd']}
                                    rules={[{ required: true, message: 'EDD' }]}
                                    className="shortfall-action-entry-edd"
                                  >
                                    <DatePicker format="D MMM YYYY" placeholder="EDD" />
                                  </Form.Item>
                                  {fields.length > 1 && (
                                    <Button
                                      type="text"
                                      icon={<MinusCircleOutlined />}
                                      aria-label="Remove order"
                                      onClick={() => remove(field.name)}
                                    />
                                  )}
                                </div>
                              ))}
                              <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={() =>
                                  add({
                                    qty: 1,
                                    edd: dayjs(planNeedByDate, 'YYYY-MM-DD'),
                                  })
                                }
                                block
                                className="shortfall-action-add-entry"
                              >
                                Add order
                              </Button>
                            </>
                          )}
                        </Form.List>
                        <Form.Item name="waitRemarks" label="Remarks">
                          <Input.TextArea rows={2} placeholder="Optional remarks" />
                        </Form.Item>
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
                      <div className="shortfall-action-row-main">
                        <Checkbox value="cannibalise">Cannibalise</Checkbox>
                        <Typography.Text type="secondary" className="shortfall-action-description">
                          Take from one or more aircraft for critical spares
                        </Typography.Text>
                      </div>
                    </div>
                    {selectedActions.includes('cannibalise') && (
                      <ActionDetailFields>
                        <Form.List name="cannibaliseEntries">
                          {(fields, { add, remove }) => (
                            <>
                              {fields.map((field) => (
                                <div key={field.key} className="shortfall-action-entry-row">
                                  <Form.Item
                                    name={[field.name, 'qty']}
                                    rules={[{ required: true, message: 'Qty' }]}
                                    className="shortfall-action-entry-qty"
                                  >
                                    <InputNumber
                                      min={1}
                                      max={shortfallQty || undefined}
                                      placeholder="Qty"
                                    />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, 'tail']}
                                    rules={[
                                      { required: true, message: 'Tail #' },
                                      {
                                        pattern: /^\d{3,4}$/,
                                        message: '3–4 digits',
                                      },
                                    ]}
                                    className="shortfall-action-entry-tail"
                                  >
                                    <Input
                                      placeholder="Tail #"
                                      maxLength={4}
                                      inputMode="numeric"
                                    />
                                  </Form.Item>
                                  {fields.length > 1 && (
                                    <Button
                                      type="text"
                                      icon={<MinusCircleOutlined />}
                                      aria-label="Remove aircraft"
                                      onClick={() => remove(field.name)}
                                    />
                                  )}
                                </div>
                              ))}
                              <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={() => add({ qty: 1, tail: '' })}
                                block
                                className="shortfall-action-add-entry"
                              >
                                Add aircraft
                              </Button>
                            </>
                          )}
                        </Form.List>
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

        {lineMode === null && showDeviationHint && (
          <div className="deviation-available-panel">
            <Typography.Text strong className="deviation-available-panel-title">
              Record a deviation
            </Typography.Text>
            <Typography.Text type="secondary">
              Available stock ({groupAvailable}) exceeds the L-series requirement ({line.requiredQty}
              ). Increase to-bring above {line.requiredQty} and provide a reason — the line will
              appear in the approval pack for offline sign-off.
            </Typography.Text>
          </div>
        )}

        {lineMode === null && !showDeviationHint && (
          <Typography.Text type="secondary">
            This line is fulfilled — no further action required.
          </Typography.Text>
        )}
      </Form>
    </Drawer>
  );
}
