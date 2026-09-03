import { useEffect } from 'react';
import { Alert, Button, Drawer, Form, InputNumber, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  getDisplayIssuedQty,
  getGroupAvailableQty,
  isAutoIssuedLine,
  needsOcApprovalForIssue,
} from '../../types/planLine';

interface IssuedQtyDrawerProps {
  line: PlanLine | null;
  open: boolean;
  viewOnly: boolean;
  onClose: () => void;
  onSave: (line: PlanLine, issuedQty: number) => void;
}

export default function IssuedQtyDrawer({
  line,
  open,
  viewOnly,
  onClose,
  onSave,
}: IssuedQtyDrawerProps) {
  const [form] = Form.useForm<{ issuedQty: number }>();

  useEffect(() => {
    if (line && open) {
      form.setFieldsValue({ issuedQty: getDisplayIssuedQty(line) });
    }
  }, [line, open, form]);

  if (!line) return null;

  const autoIssued = isAutoIssuedLine(line);
  const ocApproval = needsOcApprovalForIssue(line);
  const warehouse = getGroupAvailableQty(line);
  const readOnly = viewOnly || autoIssued;

  const handleSave = async () => {
    if (readOnly) {
      onClose();
      return;
    }
    try {
      const values = await form.validateFields();
      onSave(line, values.issuedQty);
      onClose();
    } catch {
      // validation failed
    }
  };

  return (
    <Drawer
      title={`Issue spares — ${line.description}`}
      open={open}
      onClose={onClose}
      width={440}
      destroyOnClose
      footer={
        <div className="edit-line-drawer-footer">
          <Button type="text" className="edit-line-drawer-cancel" onClick={onClose}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button type="primary" onClick={handleSave}>
              Save
            </Button>
          )}
        </div>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Simulate goods issue from warehouse to this plan line (prototype — ES not connected).
      </Typography.Paragraph>

      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
        NSN: {line.nsn}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        To-bring: {line.toBringQty} · Warehouse: {warehouse}
      </Typography.Text>

      {autoIssued && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Auto-issued"
          description="Warehouse exceeds to-bring — stock is reserved and issued automatically (fulfilled)."
        />
      )}

      {ocApproval && !autoIssued && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="OC approval required before issue"
          description={
            warehouse <= 2
              ? 'Low warehouse stock (≤ 2) — seek OC approval offline, then record issued qty here.'
              : 'Warehouse equals to-bring — full pool commit. Seek OC approval offline, then record issued qty here.'
          }
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="issuedQty"
          label="Issued qty"
          rules={[
            { required: true, message: 'Enter issued qty' },
            {
              type: 'number',
              min: 0,
              max: line.toBringQty,
              message: `Issued cannot exceed to-bring (${line.toBringQty})`,
            },
          ]}
        >
          <InputNumber min={0} max={line.toBringQty} style={{ width: '100%' }} disabled={readOnly} />
        </Form.Item>
      </Form>
    </Drawer>
  );

}
