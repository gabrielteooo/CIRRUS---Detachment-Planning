import {
  Drawer,
  Form,
  type FormInstance,
  InputNumber,
  Checkbox,
  Input,
  Select,
  Typography,
  Button,
  Space,
  message,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { formatAircraftTailNumber } from '../../utils/tailNumber';
import { useEffect, useMemo, type ReactNode } from 'react';
import {
  formatAwaitingSupplyOrderLabel,
  formatCannibaliseTailLabel,
  getAwaitingSupplyOrderOptions,
  getCannibaliseTailOptions,
  type CannibaliseTailOption,
} from '../../data/nsnDrilldownMock';
import type {
  CannibaliseShortfallAction,
  PlanLine,
  ShortfallAction,
  ShortfallActionType,
  WaitShortfallAction,
} from '../../types/planLine';
import {
  canAcceptShortfall,
  canDeviateQty,
  getGroupAvailableQty,
  getPrimaryMemberNsn,
  getShortfallQty,
  hasDeviationCondition,
  hasShortfallCondition,
  isLineFulfilled,
  isInterchangeableLine,
} from '../../types/planLine';
import LineStatusTags from './LineStatusTags';
interface EditLineDrawerProps {
  line: PlanLine | null;
  open: boolean;
  onClose: () => void;
  onSave: (line: PlanLine) => void;
  planNeedByDate: string;
}

interface WaitEntryFormValue {
  qty: number;
  orderId?: string;
}

interface CannibaliseEntryFormValue {
  qty: number;
  tailNumber?: string;
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
    const orderOptions = getAwaitingSupplyOrderOptions(line);

    for (const [index, entry] of (values.waitEntries ?? []).entries()) {
      const selectedOrder = orderOptions.find((order) => order.id === entry.orderId);

      actions.push({
        type: 'wait',
        qty: entry.qty ?? 1,
        remarks: values.waitRemarks ?? '',
        needByDate: selectedOrder?.edd ?? planNeedByDate,
        approved: existingWait[index]?.approved ?? false,
        targetNsn: shortfallTargetNsn,
        supplyOrders: selectedOrder
          ? [
              {
                id: selectedOrder.id,
                poNumber: selectedOrder.poNumber,
                edd: selectedOrder.edd,
                serialNo: selectedOrder.serialNo,
                qty: selectedOrder.qty,
              },
            ]
          : undefined,
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
        tailNumber: formatAircraftTailNumber(entry.tailNumber ?? ''),
        workCentreComments: values.cannComments ?? '',
        confirmedWithWorkCentre: true,
        approved: existingCann[index]?.approved ?? false,
        targetNsn: shortfallTargetNsn,
      });
    }
  }

  return actions;
}

function previewLine(line: PlanLine, toBringQty: number): PlanLine {
  return { ...line, toBringQty };
}

function ActionDetailFields({ children }: { children: ReactNode }) {
  return <div className="shortfall-action-details">{children}</div>;
}

function CannibaliseEntryRow({
  field,
  form,
  tailOptions,
  shortfallQty,
  showRemove,
  onRemove,
}: {
  field: { name: number; key: React.Key };
  form: FormInstance;
  tailOptions: CannibaliseTailOption[];
  shortfallQty: number;
  showRemove: boolean;
  onRemove: () => void;
}) {
  const tailNumber = Form.useWatch(['cannibaliseEntries', field.name, 'tailNumber'], form);
  const selectedTail = tailOptions.find((option) => option.tailNo === tailNumber);
  const qtyMax = selectedTail
    ? Math.min(selectedTail.qpa, shortfallQty || selectedTail.qpa)
    : shortfallQty || undefined;

  return (
    <div className="shortfall-action-entry-row shortfall-action-entry-row--cannibalise">
      <Form.Item
        name={[field.name, 'qty']}
        dependencies={[['cannibaliseEntries', field.name, 'tailNumber']]}
        rules={[
          { required: true, message: 'Qty' },
          ({ getFieldValue }) => ({
            validator: (_, value) => {
              const selected = getFieldValue(['cannibaliseEntries', field.name, 'tailNumber']);
              const tailOption = tailOptions.find((option) => option.tailNo === selected);
              if (!tailOption || value == null) return Promise.resolve();
              if (value > tailOption.qpa) {
                return Promise.reject(new Error(`Max QPA: ${tailOption.qpa}`));
              }
              return Promise.resolve();
            },
          }),
        ]}
        className="shortfall-action-entry-qty"
      >
        <InputNumber
          min={1}
          max={qtyMax}
          placeholder="Qty"
          disabled={!selectedTail}
        />
      </Form.Item>
      <Form.Item
        name={[field.name, 'tailNumber']}
        rules={[{ required: true, message: 'Select tail' }]}
        className="shortfall-action-entry-tail"
      >
        <Select
          placeholder="Tail no. | ETR | QPA"
          optionFilterProp="label"
          options={tailOptions.map((option) => ({
            value: option.tailNo,
            label: formatCannibaliseTailLabel(option),
          }))}
          onChange={(newTailNo) => {
            const tailOption = tailOptions.find((option) => option.tailNo === newTailNo);
            const qty = form.getFieldValue(['cannibaliseEntries', field.name, 'qty']);
            if (tailOption && qty != null && qty > tailOption.qpa) {
              form.setFieldValue(['cannibaliseEntries', field.name, 'qty'], tailOption.qpa);
            }
          }}
        />
      </Form.Item>
      {showRemove && (
        <Button
          type="text"
          icon={<MinusCircleOutlined />}
          aria-label="Remove aircraft"
          onClick={onRemove}
        />
      )}
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

      form.setFieldsValue({
        toBringQty: line.toBringQty,
        deviationReason: line.deviationReason,
        deviationRemarks: line.deviationRemarks,
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
                orderId: action.supplyOrders?.[0]?.id,
              }))
            : [{ qty: defaultQty, orderId: undefined }],
        waitRemarks: waitActions[0]?.remarks ?? '',
        cannibaliseEntries:
          cannActions.length > 0
            ? cannActions.map((action) => ({
                qty: action.qty,
                tailNumber: formatAircraftTailNumber(action.tailNumber),
              }))
            : [{ qty: defaultQty, tailNumber: undefined }],
        cannComments: cannActions[0]?.workCentreComments ?? '',
      });
    }
  }, [line, open, form, planNeedByDate]);

  useEffect(() => {
    if (!line || !open) return;
    const currentToBring = toBringQty ?? line.toBringQty;
    const preview = previewLine(line, currentToBring);
    if (canAcceptShortfall(preview)) return;

    const types = form.getFieldValue('shortfallActionTypes') as ShortfallActionType[] | undefined;
    if (types?.includes('accept')) {
      form.setFieldValue(
        'shortfallActionTypes',
        types.filter((type) => type !== 'accept'),
      );
    }
  }, [line, open, toBringQty, form]);

  const supplyOrderOptions = useMemo(
    () => (line ? getAwaitingSupplyOrderOptions(line) : []),
    [line],
  );
  const cannibaliseTailOptions = useMemo(
    () => (line ? getCannibaliseTailOptions(line) : []),
    [line],
  );

  if (!line) return null;

  const isGroup = isInterchangeableLine(line);
  const groupAvailable = getGroupAvailableQty(line);
  const currentToBringResolved = toBringQty ?? line.toBringQty;
  const linePreview = previewLine(line, currentToBringResolved);
  const shortfallQty = getShortfallQty(linePreview);
  const selectedActions = shortfallActionTypes ?? [];
  const showShortfallPanel = hasShortfallCondition(linePreview);
  const showDeviationFields = hasDeviationCondition(linePreview);
  const acceptShortfallDisabled = showShortfallPanel && !canAcceptShortfall(linePreview);
  const deviationUp =
    line.isAddedNsn || (showDeviationFields && currentToBringResolved > line.requiredQty);
  const deviationDown =
    !line.isAddedNsn && showDeviationFields && currentToBringResolved < line.requiredQty;
  const showDeviationHint = isLineFulfilled(line) && canDeviateQty(line);
  const revertingToFulfilled =
    !isLineFulfilled(line) &&
    !line.isAddedNsn &&
    isLineFulfilled(previewLine(line, currentToBringResolved));
  const toBringMin = line.isAddedNsn
    ? line.requiredQty + 1
    : deviationUp
      ? line.requiredQty + 1
      : 0;

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const actionTypes: ShortfallActionType[] = values.shortfallActionTypes ?? [];
      const shortfallTargetNsn = values.shortfallTargetNsn as string | undefined;
      const nextToBringQty = values.toBringQty ?? line.toBringQty;
      const savedPreview = previewLine(line, nextToBringQty);
      const needsShortfall = hasShortfallCondition(savedPreview);
      const needsDeviation = hasDeviationCondition(savedPreview);

      if (needsShortfall) {
        if (
          actionTypes.includes('accept') &&
          !canAcceptShortfall(savedPreview)
        ) {
          message.error(
            'Accept shortfall is not available when to-bring exceeds both required and available stock',
          );
          return;
        }

        if (actionTypes.includes('wait') && (values.waitEntries?.length ?? 0) === 0) {
          message.error('Add at least one order for awaiting supply');
          return;
        }

        for (const entry of values.waitEntries ?? []) {
          if (!entry?.orderId) {
            message.error('Each awaiting supply row requires an order');
            return;
          }
        }

        if (actionTypes.includes('cannibalise') && (values.cannibaliseEntries?.length ?? 0) === 0) {
          message.error('Add at least one aircraft for cannibalise');
          return;
        }

        for (const entry of values.cannibaliseEntries ?? []) {
          if (!entry?.tailNumber) {
            message.error('Each cannibalise row requires an aircraft tail number');
            return;
          }
          const tailOption = cannibaliseTailOptions.find(
            (option) => option.tailNo === entry.tailNumber,
          );
          if (tailOption && (entry.qty ?? 0) > tailOption.qpa) {
            message.error(
              `Qty cannot exceed QPA (${tailOption.qpa}) installed on tail ${tailOption.tailNo}`,
            );
            return;
          }
        }
      }

      const shortfallActions: ShortfallAction[] = needsShortfall
        ? buildShortfallActionsFromForm(line, values, planNeedByDate)
        : [];

      const savedDeviationUp = line.isAddedNsn || nextToBringQty > line.requiredQty;
      const savedDeviationDown = !line.isAddedNsn && nextToBringQty < line.requiredQty;

      const updated: PlanLine = {
        ...line,
        toBringQty: nextToBringQty,
        shortfallTargetNsn: shortfallTargetNsn ?? line.shortfallTargetNsn,
        shortfallActions,
        deviationApproved: undefined,
      };

      if (needsDeviation) {
        if (savedDeviationUp && !values.deviationReason?.trim()) {
          message.error('Enter a deviation reason');
          return;
        }
        if (savedDeviationDown && !values.deviationRemarks?.trim()) {
          message.error('Enter remarks explaining the reduced to-bring qty');
          return;
        }
        updated.deviationReason =
          savedDeviationUp ? values.deviationReason?.trim() : undefined;
        updated.deviationRemarks =
          savedDeviationDown ? values.deviationRemarks?.trim() : undefined;
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

      <LineStatusTags line={linePreview} className="edit-line-status-tag" />

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
            <div
              className={`edit-line-qty-cell edit-line-qty-cell--input${
                currentToBringResolved > groupAvailable ? ' edit-line-qty-cell--warning' : ''
              }`}
            >
              <Typography.Text className="edit-line-qty-cell-label">To-bring</Typography.Text>
              <Form.Item
                name="toBringQty"
                rules={[{ required: true, message: 'Enter to-bring quantity' }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber min={toBringMin} className="edit-line-qty-cell-input" />
              </Form.Item>
            </div>
          </div>
        </div>

        {deviationUp && (
          <Form.Item
            name="deviationReason"
            label="Reason"
            rules={[{ required: true, message: 'Enter a deviation reason' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Describe why to-bring qty exceeds the L-series requirement"
            />
          </Form.Item>
        )}

        {deviationDown && (
          <Form.Item
            name="deviationRemarks"
            label="Remarks"
            rules={[{ required: true, message: 'Enter remarks for the reduced to-bring qty' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Explain why you are bringing less than the L-series requirement"
            />
          </Form.Item>
        )}

        {revertingToFulfilled && (
          <Typography.Text type="secondary">
            To-bring matches required and available stock — this line will be fulfilled when saved.
          </Typography.Text>
        )}

        {showShortfallPanel && (
          <div className="shortfall-resolution-panel">
            <Typography.Text strong className="shortfall-resolution-title">
              Choose a resolution path
            </Typography.Text>
            <Typography.Text type="secondary" className="shortfall-resolution-subtitle">
              To-bring exceeds available stock — resolve the gap of{' '}
              <Typography.Text strong>{shortfallQty}</Typography.Text>
              {showDeviationFields ? ' and record the deviation below.' : ' before proceeding.'}
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
                    }${acceptShortfallDisabled ? ' shortfall-action-block--disabled' : ''}`}
                  >
                    <div className="shortfall-action-row">
                      <div className="shortfall-action-row-main">
                        <Checkbox value="accept" disabled={acceptShortfallDisabled}>
                          Accept shortfall
                        </Checkbox>
                        <Typography.Text type="secondary" className="shortfall-action-description">
                          {acceptShortfallDisabled
                            ? 'Not available when to-bring exceeds the L-series requirement — reduce to-bring or choose another resolution'
                            : 'Proceed with the mission despite this shortfall'}
                        </Typography.Text>
                      </div>
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
                                <div
                                  key={field.key}
                                  className="shortfall-action-entry-row shortfall-action-entry-row--wait"
                                >
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
                                    name={[field.name, 'orderId']}
                                    rules={[{ required: true, message: 'Select order' }]}
                                    className="shortfall-action-entry-orders"
                                  >
                                    <Select
                                      placeholder="Qty | PO no. | EDD | Serial no"
                                      optionFilterProp="label"
                                      options={supplyOrderOptions.map((order) => ({
                                        value: order.id,
                                        label: formatAwaitingSupplyOrderLabel(order),
                                      }))}
                                    />
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
                                onClick={() => add({ qty: 1, orderId: undefined })}
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
                                <CannibaliseEntryRow
                                  key={field.key}
                                  field={field}
                                  form={form}
                                  tailOptions={cannibaliseTailOptions}
                                  shortfallQty={shortfallQty}
                                  showRemove={fields.length > 1}
                                  onRemove={() => remove(field.name)}
                                />
                              ))}
                              <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={() => add({ qty: 1, tailNumber: undefined })}
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

        {showDeviationHint && (
          <div className="deviation-available-panel">
            <Typography.Text strong className="deviation-available-panel-title">
              Record a deviation
            </Typography.Text>
            <Typography.Text type="secondary">
              Available stock ({groupAvailable}) covers to-bring. Adjust above or below required (
              {line.requiredQty}) to record a deviation — if to-bring exceeds available the line
              also becomes a shortfall.
            </Typography.Text>
          </div>
        )}

        {isLineFulfilled(linePreview) && !showDeviationHint && !showShortfallPanel && !showDeviationFields && (
          <Typography.Text type="secondary">
            This line is fulfilled — no further action required.
          </Typography.Text>
        )}
      </Form>
    </Drawer>
  );
}
