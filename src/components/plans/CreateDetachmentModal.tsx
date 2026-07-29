import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  PLATFORM_VARIANTS,
  F16_FLYING_HOUR_TIERS,
  CH47_AIRCRAFT_TIERS,
} from '../../data/mockPlans';
import { L_SERIES_VERSION_IDS } from '../../data/lSeriesTemplate';
import type { Platform } from '../../types/detachment';
import { useApp } from '../../context/AppContext';
import { useEffect } from 'react';

interface CreateDetachmentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateDetachmentModal({ open, onClose }: CreateDetachmentModalProps) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { createPlan } = useApp();

  const platform = Form.useWatch('platform', form) as Platform | undefined;

  useEffect(() => {
    if (open && platform) {
      form.setFieldValue('lSeriesVersion', L_SERIES_VERSION_IDS[platform]);
    }
  }, [open, platform, form]);

  const parameterOptions =
    platform === 'F-16'
      ? F16_FLYING_HOUR_TIERS.map((t) => ({ label: `${t} hrs`, value: t }))
      : platform === 'CH-47'
        ? CH47_AIRCRAFT_TIERS.map((t) => ({ label: `${t} aircraft`, value: t }))
        : [];

  const handlePlatformChange = (value: Platform) => {
    form.setFieldsValue({
      variants: [],
      lSeriesVersion: L_SERIES_VERSION_IDS[value],
      parameterTier: undefined,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const plan = createPlan({
        name: values.name,
        platform: values.platform,
        variants: values.variants,
        lSeriesVersion: values.lSeriesVersion,
        parameterTier: values.parameterTier,
        needByDate: values.needByDate.format('YYYY-MM-DD'),
        detachmentDate: values.detachmentDate.format('YYYY-MM-DD'),
        remarks: values.remarks,
      });
      message.success('Detachment plan created');
      form.resetFields();
      onClose();
      navigate(`/detachment-planning/${plan.id}`);
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
      width={640}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ platform: 'F-16', lSeriesVersion: L_SERIES_VERSION_IDS['F-16'] }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="Detachment name"
          rules={[{ required: true, message: 'Enter a name' }]}
        >
          <Input placeholder="e.g. Exercise Falcon 2026" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="platform"
              label="Platform"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'F-16', value: 'F-16' },
                  { label: 'CH-47', value: 'CH-47' },
                ]}
                onChange={handlePlatformChange}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lSeriesVersion" label="L-series version">
              <Input readOnly placeholder="Select platform first" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="variants"
              label="Variant"
              rules={[{ required: true, message: 'Select at least one variant' }]}
            >
              <Select
                mode="multiple"
                placeholder="Select variant(s)"
                options={(PLATFORM_VARIANTS[platform ?? 'F-16'] ?? []).map((v) => ({
                  label: v,
                  value: v,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="parameterTier"
              label={platform === 'CH-47' ? 'Aircraft count' : 'Flying hours'}
              rules={[{ required: true, message: 'Select mission parameter' }]}
            >
              <Select placeholder="Select tier" options={parameterOptions} disabled={!platform} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="needByDate"
              label="Need-by-date"
              rules={[{ required: true, message: 'Select need-by-date' }]}
            >
              <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
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
          </Col>
        </Row>

        <Form.Item name="remarks" label="Plan remarks (optional)">
          <Input.TextArea rows={2} placeholder="Context for approvers" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
