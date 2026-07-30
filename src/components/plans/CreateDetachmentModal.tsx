import { Modal, Form, Input, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

interface CreateDetachmentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateDetachmentModal({ open, onClose }: CreateDetachmentModalProps) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { createDetachment } = useApp();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const detachment = createDetachment({
        name: values.name,
        detachmentDate: values.detachmentDate.format('YYYY-MM-DD'),
      });
      message.success('Detachment created');
      form.resetFields();
      onClose();
      navigate(`/detachment-planning/${detachment.id}`);
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title="Create Detachment"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Create"
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="Detachment Name"
          rules={[{ required: true, message: 'Enter a name' }]}
        >
          <Input placeholder="e.g. Exercise Falcon 2026" />
        </Form.Item>

        <Form.Item
          name="detachmentDate"
          label="Detachment date"
          rules={[{ required: true, message: 'Select detachment date' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="D MMM YYYY"
            disabledDate={(d) => d.isBefore(dayjs(), 'day')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
