import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Tag, Typography } from 'antd';
import type { LineStatus, PlanLine } from '../../types/planLine';
import {
  clearOfflineApproval,
  formatLineStatus,
  getDefaultToBringQty,
  getPolLineStatus,
  hasApprovalResolutionChange,
} from '../../types/planLine';

interface EditPolLineDrawerProps {
  line: PlanLine | null;
  open: boolean;
  onClose: () => void;
  onSave: (line: PlanLine) => void;
}

const STATUS_TAG_COLORS: Record<LineStatus, string> = {
  Available: 'success',
  Deviation: 'warning',
  Shortfall: 'error',
};

export default function EditPolLineDrawer({
  line,
  open,
  onClose,
  onSave,
}: EditPolLineDrawerProps) {
  const [form] = Form.useForm();
  const toBringQty = Form.useWatch('toBringQty', form);

  useEffect(() => {
    if (line && open) {
      form.setFieldsValue({
        toBringQty: line.toBringQty ?? getDefaultToBringQty(line.requiredQty),
        remarks: line.remarks ?? '',
        deviationReason: line.deviationReason ?? '',
      });
    }
  }, [line, open, form]);

  if (!line) return null;

  const previewStatus = getPolLineStatus({
    ...line,
    toBringQty: toBringQty ?? line.toBringQty,
  });
  const showDeviationReason = previewStatus === 'Deviation';

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const nextToBringQty = values.toBringQty ?? line.toBringQty;
      const nextStatus = getPolLineStatus({ ...line, toBringQty: nextToBringQty });

      let updated: PlanLine = {
        ...line,
        toBringQty: nextToBringQty,
        remarks: values.remarks?.trim() ?? '',
        deviationReason:
          nextStatus === 'Deviation' ? values.deviationReason?.trim() ?? '' : undefined,
        deviationRemarks: undefined,
      };

      if (line.offlineApproval && hasApprovalResolutionChange(line, updated)) {
        updated = clearOfflineApproval(updated);
      } else if (nextStatus !== 'Deviation') {
        updated = { ...updated, offlineApproval: undefined };
      }

      onSave(updated);
      onClose();
    } catch {
      // validation failed
    }
  };

  return (
    <Drawer
      title={`Edit POL — ${line.description}`}
      className="edit-line-drawer edit-pol-line-drawer"
      open={open}
      onClose={onClose}
      width={480}
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
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Set to-bring to match required for fulfilment. Less is a shortfall; more is a deviation.
      </Typography.Paragraph>

      <Tag color={STATUS_TAG_COLORS[previewStatus]} className="edit-line-status-tag">
        {formatLineStatus(previewStatus)}
      </Tag>

      <div className="edit-pol-line-summary">
        <Typography.Text type="secondary">NSN</Typography.Text>
        <Typography.Text>{line.nsn}</Typography.Text>
        <Typography.Text type="secondary">Required</Typography.Text>
        <Typography.Text>{line.requiredQty}</Typography.Text>
        {line.uom && (
          <>
            <Typography.Text type="secondary">UOM</Typography.Text>
            <Typography.Text>{line.uom}</Typography.Text>
          </>
        )}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="toBringQty"
          label="To-bring"
          rules={[
            { required: true, message: 'Enter to-bring qty' },
            { type: 'number', min: 0, message: 'Qty cannot be negative' },
          ]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        {showDeviationReason && (
          <Form.Item
            name="deviationReason"
            label="Deviation reason"
            rules={[{ required: true, message: 'Enter a reason for bringing extra qty' }]}
          >
            <Input.TextArea rows={3} placeholder="Why is to-bring above the required qty?" />
          </Form.Item>
        )}

        <Form.Item name="remarks" label="Remarks">
          <Input.TextArea rows={4} placeholder="Planning notes for this POL item" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
