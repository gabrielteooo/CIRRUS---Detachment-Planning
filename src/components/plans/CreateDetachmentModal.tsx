import { Modal, Form, Input, DatePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
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
      const [start, end] = values.detachmentDates as [Dayjs, Dayjs];
      const detachment = createDetachment({
        name: values.name,
        detachmentDateStart: start.format('YYYY-MM-DD'),
        detachmentDateEnd: end.format('YYYY-MM-DD'),
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
          name="detachmentDates"
          label="Detachment dates"
          rules={[
            { required: true, message: 'Select detachment date range' },
            {
              validator: (_, value: [Dayjs, Dayjs] | undefined) => {
                if (!value?.[0] || !value?.[1]) return Promise.resolve();
                if (value[1].isBefore(value[0], 'day')) {
                  return Promise.reject(new Error('End date must be on or after start date'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            format="D MMM YYYY"
            disabledDate={(date) => date.isBefore(dayjs(), 'day')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
