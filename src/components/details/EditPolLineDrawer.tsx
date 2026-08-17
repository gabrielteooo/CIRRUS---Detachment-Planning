import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';

interface EditPolLineDrawerProps {
  line: PlanLine | null;
  open: boolean;
  onClose: () => void;
  onSave: (line: PlanLine) => void;
}

export default function EditPolLineDrawer({
  line,
  open,
  onClose,
  onSave,
}: EditPolLineDrawerProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (line && open) {
      form.setFieldsValue({
        toBringQty: line.toBringQty,
        remarks: line.remarks ?? '',
      });
    }
  }, [line, open, form]);

  if (!line) return null;

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        ...line,
        toBringQty: values.toBringQty ?? line.toBringQty,
        remarks: values.remarks?.trim() ?? '',
      });
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
        Update the quantity to bring and any planning remarks for this POL line.
      </Typography.Paragraph>

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

        <Form.Item name="remarks" label="Remarks">
          <Input.TextArea rows={4} placeholder="Planning notes for this POL item" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
