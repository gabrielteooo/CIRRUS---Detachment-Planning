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
import dayjs, { type Dayjs } from 'dayjs';
import { formatAircraftTailNumber, isValidAircraftTailNumber } from '../../utils/tailNumber';
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

      const groupAvail = getGroupAvailableQty(line);
      const isShortfall = groupAvail < line.requiredQty;
      const defaultToBring = isShortfall
        ? computeToBringQty(line, line.shortfallActions)
        : line.toBringQty;

      form.setFieldsValue({
        toBringQty: defaultToBring,
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
        waitEdd: dayjs(
          waitAction?.type === 'wait' ? waitAction.needByDate : planNeedByDate,
          'YYYY-MM-DD',
        ),
        waitRemarks: waitAction?.type === 'wait' ? waitAction.remarks : '',
        cannQty: cannAction?.qty ?? defaultQty,
        cannTail:
          cannAction?.type === 'cannibalise'
            ? formatAircraftTailNumber(cannAction.tailNumber)
            : '',
        cannComments: cannAction?.type === 'cannibalise' ? cannAction.workCentreComments : '',
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

      const shortfallActions: ShortfallAction[] =
        resolveLineMode(line, values.toBringQty ?? line.toBringQty) === 'shortfall'
          ? actionTypes.map((type) => {
              const existing = line.shortfallActions.find((a) => a.type === type);

              if (type === 'accept') {
                return {
                  type: 'accept',
                  qty: values.acceptQty ?? 1,
                  remarks: values.acceptRemarks ?? '',
                  approved: existing?.approved ?? false,
                  targetNsn: shortfallTargetNsn,
                };
              }
              if (type === 'wait') {
                const waitEdd = values.waitEdd as Dayjs | undefined;
                return {
                  type: 'wait',
                  qty: values.waitQty ?? 1,
                  remarks: values.waitRemarks ?? '',
                  needByDate: waitEdd?.format('YYYY-MM-DD') ?? planNeedByDate,
                  approved: existing?.approved ?? false,
                  targetNsn: shortfallTargetNsn,
                };
              }
              return {
                type: 'cannibalise',
                qty: values.cannQty ?? 1,
                tailNumber: formatAircraftTailNumber(values.cannTail ?? ''),
                workCentreComments: values.cannComments ?? '',
                confirmedWithWorkCentre: true,
                approved: existing?.approved ?? false,
                targetNsn: shortfallTargetNsn,
              };
            })
          : [];

      const mode = resolveLineMode(line, values.toBringQty ?? line.toBringQty);

      const nextToBringQty =
        mode === 'shortfall'
          ? computeToBringQty(line, shortfallActions)
          : (values.toBringQty ?? line.requiredQty);

      if (mode !== 'shortfall' && nextToBringQty > groupAvailable) {
        message.error(`To-bring cannot exceed available qty (${groupAvailable})`);
        return;
      }

      if (
        mode === 'shortfall' &&
        actionTypes.includes('cannibalise') &&
        !isValidAircraftTailNumber(values.cannTail ?? '')
      ) {
        message.error('Cannibalise requires a 3–4 digit aircraft tail number');
        return;
      }

      if (mode === 'shortfall' && actionTypes.includes('wait') && !values.waitEdd) {
        message.error('Wait resolution requires an EDD');
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
                        <Checkbox value="wait">Wait</Checkbox>
                        <Typography.Text type="secondary" className="shortfall-action-description">
                          Expedite repair/new buys
                        </Typography.Text>
                      </div>
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
                          name="waitEdd"
                          label="EDD"
                          rules={[{ required: true, message: 'Select expected delivery date' }]}
                        >
                          <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
                        </Form.Item>
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
                          rules={[
                            { required: true, message: 'Enter tail #' },
                            {
                              pattern: /^\d{3,4}$/,
                              message: 'Enter a 3–4 digit tail number',
                            },
                          ]}
                        >
                          <Input placeholder="e.g. 987" maxLength={4} inputMode="numeric" />
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
