import {
  Drawer,
  Form,
  InputNumber,
  Select,
  Checkbox,
  Input,
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
import { formatLineStatus, getShortfallQty } from '../../types/planLine';
import { getComponentPoOptionsForNsn } from '../../data/mockPlanLines';
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
  if (toBringQty > line.requiredQty) return 'deviation';
  return null;
}

function resolveLineStatus(line: PlanLine, toBringQty: number): LineStatus {
  if (line.availableQty < line.requiredQty) return 'Shortfall';
  if (toBringQty > line.requiredQty) return 'Deviation';
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

  const currentToBring = toBringQty ?? line.toBringQty;
  const lineMode = resolveLineMode(line, currentToBring);
  const lineStatus = resolveLineStatus(line, currentToBring);
  const shortfallQty = getShortfallQty(line);
  const selectedActions = shortfallActionTypes ?? [];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const nextToBringQty = values.toBringQty ?? line.requiredQty;
      const mode = resolveLineMode(line, nextToBringQty);
      const actionTypes: ShortfallActionType[] = values.shortfallActionTypes ?? [];

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
                };
              }
              if (type === 'wait') {
                return {
                  type: 'wait',
                  qty: values.waitQty ?? 1,
                  repairComponentRef: values.waitRef,
                  needByDate: planNeedByDate,
                  approved,
                };
              }
              return {
                type: 'cannibalise',
                qty: values.cannQty ?? 1,
                tailNumber: values.cannTail ?? '',
                workCentreComments: values.cannComments ?? '',
                confirmedWithWorkCentre: true,
                approved,
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
        NSN: {line.nsn} · Required: {line.requiredQty} · Available: {line.availableQty}
      </Typography.Text>

      <Form form={form} layout="vertical">
        <div
          style={{
            background: '#f5f8f8',
            border: '2px solid #00636a',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 20,
          }}
        >
          <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 15 }}>
            To-bring qty
          </Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
            L-series required qty: {line.requiredQty}
          </Typography.Text>
          <Form.Item
            name="toBringQty"
            rules={[{ required: true, message: 'Enter to-bring quantity' }]}
            style={{ marginBottom: 0 }}
          >
            <InputNumber className="edit-line-to-bring" min={0} style={{ width: '100%', height: 48 }} />
          </Form.Item>
        </div>

        <div style={{ marginBottom: 20 }}>
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

            <Form.Item
              name="shortfallActionTypes"
              rules={[{ required: true, message: 'Select at least one resolution action' }]}
            >
              <Checkbox.Group className="shortfall-action-checkboxes">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Checkbox value="accept">Accept shortfall</Checkbox>
                  <Checkbox value="wait">Wait (expedite repair/new buys)</Checkbox>
                  <Checkbox value="cannibalise">Cannibalise</Checkbox>
                </Space>
              </Checkbox.Group>
            </Form.Item>

            <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
              {selectedActions.includes('accept') && (
                <ActionDetailCard title="Accept shortfall">
                  <Form.Item
                    name="acceptQty"
                    label="Shortfall qty"
                    rules={[{ required: true, message: 'Enter qty' }]}
                  >
                    <InputNumber min={1} max={shortfallQty || undefined} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="acceptRemarks" label="Risk / remarks">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </ActionDetailCard>
              )}

              {selectedActions.includes('wait') && (
                <ActionDetailCard title="Wait (expedite repair/new buys)">
                  <Form.Item
                    name="waitQty"
                    label="Shortfall qty"
                    rules={[{ required: true, message: 'Enter qty' }]}
                  >
                    <InputNumber min={1} max={shortfallQty || undefined} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="waitRef"
                    label="Component PO"
                    rules={[{ required: true, message: 'Select a PO' }]}
                  >
                    <Select
                      placeholder="Select PO"
                      options={getComponentPoOptionsForNsn(line.nsn, planNeedByDate).map((po) => ({
                        label: `${po.poNumber} - EDD: ${formatDate(po.expectedDate)}`,
                        value: po.poNumber,
                      }))}
                      notFoundContent="No POs with EDD on or before need-by-date"
                    />
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
                <ActionDetailCard title="Cannibalise">
                  <Form.Item
                    name="cannQty"
                    label="Shortfall qty"
                    rules={[{ required: true, message: 'Enter qty' }]}
                  >
                    <InputNumber min={1} max={shortfallQty || undefined} style={{ width: '100%' }} />
                  </Form.Item>
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
