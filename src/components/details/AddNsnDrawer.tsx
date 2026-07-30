import { useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, Select, Typography } from 'antd';
import { searchNsnCatalog, type NsnCatalogEntry } from '../../data/nsnCatalog';

interface AddNsnDrawerProps {
  open: boolean;
  existingNsns: string[];
  onClose: () => void;
  onAdd: (entries: NsnCatalogEntry[], deviationReason: string) => void;
}

export default function AddNsnDrawer({ open, existingNsns, onClose, onAdd }: AddNsnDrawerProps) {
  const [form] = Form.useForm();
  const [selectedNsns, setSelectedNsns] = useState<string[]>([]);

  const catalogEntries = useMemo(
    () => searchNsnCatalog('', existingNsns),
    [existingNsns],
  );

  const options = useMemo(
    () =>
      catalogEntries.map((entry) => ({
        label: `${entry.nsn} — ${entry.description}`,
        value: entry.nsn,
      })),
    [catalogEntries],
  );

  const handleClose = () => {
    setSelectedNsns([]);
    form.resetFields();
    onClose();
  };

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      const entries = catalogEntries.filter((entry) => selectedNsns.includes(entry.nsn));
      if (entries.length === 0) return;
      onAdd(entries, values.deviationReason);
      handleClose();
    } catch {
      // validation failed
    }
  };

  return (
    <Drawer
      title="Add NSN"
      open={open}
      onClose={handleClose}
      width={480}
      destroyOnClose
      className="add-nsn-drawer"
      footer={
        <div className="edit-line-drawer-footer">
          <Button type="text" className="edit-line-drawer-cancel" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="primary" disabled={selectedNsns.length === 0} onClick={handleAdd}>
            Add {selectedNsns.length > 0 ? `(${selectedNsns.length})` : ''}
          </Button>
        </div>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Adding NSNs not in the L-series is treated as a deviation. Provide a reason — offline
        approval is required before proceeding.
      </Typography.Paragraph>

      <Form form={form} layout="vertical">
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Select NSNs
        </Typography.Text>
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          placeholder="Select one or more NSNs"
          value={selectedNsns}
          onChange={setSelectedNsns}
          options={options}
          style={{ width: '100%', marginBottom: 16 }}
          listHeight={280}
          notFoundContent="No matching NSNs"
        />

        <Form.Item
          name="deviationReason"
          label="Reason"
          rules={[{ required: true, message: 'Enter a reason for adding these NSNs' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe why these NSNs are needed for the exercise"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
