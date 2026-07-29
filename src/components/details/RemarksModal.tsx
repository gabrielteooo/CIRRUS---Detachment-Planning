import { Modal, Input } from 'antd';
import { useEffect, useState } from 'react';

interface RemarksModalProps {
  open: boolean;
  onClose: () => void;
  remarks: string;
  viewOnly: boolean;
  onSave: (remarks: string) => void;
}

export default function RemarksModal({
  open,
  onClose,
  remarks,
  viewOnly,
  onSave,
}: RemarksModalProps) {
  const [value, setValue] = useState(remarks);

  useEffect(() => {
    if (open) setValue(remarks);
  }, [open, remarks]);

  return (
    <Modal
      title={viewOnly ? 'Detachment remarks' : 'Edit detachment remarks'}
      open={open}
      onCancel={onClose}
      onOk={() => {
        if (!viewOnly) onSave(value);
        onClose();
      }}
      okText={viewOnly ? 'Close' : 'Save'}
      cancelButtonProps={{ style: viewOnly ? { display: 'none' } : undefined }}
      okButtonProps={viewOnly ? { type: 'default' } : undefined}
    >
      <Input.TextArea
        rows={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        readOnly={viewOnly}
        placeholder="Context for approving officer..."
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
}
