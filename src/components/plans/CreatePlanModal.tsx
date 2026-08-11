import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Button,
  message,
  Typography,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  PLATFORM_VARIANTS,
  F16_FLYING_HOUR_TIERS,
  CH47_AIRCRAFT_TIERS,
} from '../../data/mockPlans';
import { L_SERIES_VERSION_IDS } from '../../data/lSeriesTemplate';
import type { Platform } from '../../types/detachment';
import { DETACHMENT_TYPE_OPTIONS } from '../../types/detachment';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/planUtils';

interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  preselectedDetachmentId?: string;
}

export default function CreatePlanModal({
  open,
  onClose,
  preselectedDetachmentId,
}: CreatePlanModalProps) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { detachments, createPlan, getPlansForDetachment, role, plannerPlatform } = useApp();

  const detachmentId = Form.useWatch('detachmentId', form) as string | undefined;
  const platform = Form.useWatch('platform', form) as Platform | undefined;
  const selectedDetachment = detachments.find((d) => d.id === detachmentId);

  const isDirector = role === 'director';
  const lockedPlatform = isDirector ? platform : plannerPlatform;

  useEffect(() => {
    if (open && preselectedDetachmentId) {
      form.setFieldValue('detachmentId', preselectedDetachmentId);
    }
    if (open && !isDirector) {
      form.setFieldsValue({
        platform: plannerPlatform,
        variantRows: [
          {
            variant: undefined,
            lSeriesVersion: L_SERIES_VERSION_IDS[plannerPlatform],
            parameterTier: undefined,
          },
        ],
      });
    }
  }, [open, preselectedDetachmentId, form, isDirector, plannerPlatform]);

  const existingPlatforms = detachmentId
    ? getPlansForDetachment(detachmentId).map((p) => p.platform)
    : [];

  const parameterOptions =
    platform === 'F-16'
      ? F16_FLYING_HOUR_TIERS.map((t) => ({ label: `${t} hrs`, value: t }))
      : platform === 'CH-47'
        ? CH47_AIRCRAFT_TIERS.map((t) => ({ label: `${t} aircraft`, value: t }))
        : [];

  const handleDetachmentChange = () => {
    // Detachment date is shown read-only from selected detachment
  };

  const handlePlatformChange = (value: Platform) => {
    form.setFieldValue('variantRows', [
      {
        variant: undefined,
        lSeriesVersion: L_SERIES_VERSION_IDS[value],
        parameterTier: undefined,
      },
    ]);
  };

  const handleVariantChange = (variant: string, index: number) => {
    const rows = form.getFieldValue('variantRows') ?? [];
    rows[index] = {
      ...rows[index],
      variant,
      lSeriesVersion: L_SERIES_VERSION_IDS[platform ?? 'F-16'],
    };
    form.setFieldValue('variantRows', rows);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const variantRows = form.getFieldValue('variantRows') ?? values.variantRows;
      const plan = createPlan({
        detachmentId: values.detachmentId,
        platform: values.platform,
        detachmentType: values.detachmentType,
        needByDate: values.needByDate.format('YYYY-MM-DD'),
        variantRows,
        remarks: values.remarks,
      });
      message.success('Detachment plan created');
      form.resetFields();
      onClose();
      navigate(
        isDirector
          ? `/detachment-planning/${values.detachmentId}?platform=${plan.platform}`
          : `/detachment-planning/${values.detachmentId}`,
      );
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title="Create Detachment Plan"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Create"
      width={720}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          detachmentId: preselectedDetachmentId,
          platform: plannerPlatform,
          variantRows: [
            {
              variant: undefined,
              lSeriesVersion: L_SERIES_VERSION_IDS[plannerPlatform],
              parameterTier: undefined,
            },
          ],
        }}
        style={{ marginTop: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="detachmentId"
              label="Detachment"
              rules={[{ required: true, message: 'Select a detachment' }]}
            >
              <Select
                placeholder="Select detachment"
                options={detachments.map((d) => ({
                  label: d.name,
                  value: d.id,
                }))}
                onChange={handleDetachmentChange}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Detachment date">
              <Input
                readOnly
                placeholder="Select detachment first"
                value={selectedDetachment ? formatDate(selectedDetachment.detachmentDate) : ''}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="platform"
              label="Platform"
              rules={[{ required: true }]}
            >
              <Select
                disabled={!isDirector}
                options={[
                  { label: 'F-16', value: 'F-16', disabled: existingPlatforms.includes('F-16') },
                  { label: 'CH-47', value: 'CH-47', disabled: existingPlatforms.includes('CH-47') },
                ]}
                onChange={handlePlatformChange}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="detachmentType"
              label="Detachment Type"
              rules={[{ required: true, message: 'Select detachment type' }]}
            >
              <Select
                placeholder="Select type"
                options={DETACHMENT_TYPE_OPTIONS.map((type) => ({
                  label: type,
                  value: type,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="needByDate"
          label="Need-by-date"
          rules={[{ required: true, message: 'Select need-by-date' }]}
        >
          <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
        </Form.Item>

        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Variants
        </Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          Each variant has its own L-series and flying hours. Add a row for each variant in this plan.
        </Typography.Text>

        <Form.List name="variantRows">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Row gutter={12} key={key} align="middle" style={{ marginBottom: 8 }}>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'variant']}
                      rules={[{ required: true, message: 'Select variant' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        placeholder="Variant"
                        options={(PLATFORM_VARIANTS[lockedPlatform ?? 'F-16'] ?? []).map((v) => ({
                          label: v,
                          value: v,
                        }))}
                        onChange={(v) => handleVariantChange(v, name)}
                        disabled={!platform}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      {...restField}
                      name={[name, 'lSeriesVersion']}
                      style={{ marginBottom: 0 }}
                    >
                      <Input disabled placeholder="L-series version" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      {...restField}
                      name={[name, 'parameterTier']}
                      rules={[{ required: true, message: 'Required' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        placeholder={lockedPlatform === 'CH-47' ? 'Aircraft count' : 'Flying hours'}
                        options={parameterOptions}
                        disabled={!platform}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                        aria-label="Remove variant row"
                      />
                    )}
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                onClick={() =>
                  add({
                    variant: undefined,
                    lSeriesVersion: L_SERIES_VERSION_IDS[platform ?? 'F-16'],
                    parameterTier: undefined,
                  })
                }
                icon={<PlusOutlined />}
                style={{ width: '100%', marginBottom: 16 }}
                disabled={!platform}
              >
                Add variant
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="remarks" label="Plan remarks (optional)">
          <Input.TextArea rows={2} placeholder="Context for approvers" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
