import { useEffect, useMemo } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { PLATFORM_VARIANTS, F16_FLYING_HOUR_TIERS, CH47_AIRCRAFT_TIERS } from '../../data/mockPlans';
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
  const { detachments, createPlan, getPlansForDetachment, role, plannerPlatform, lSeriesRecords } =
    useApp();

  const detachmentId = Form.useWatch('detachmentId', form) as string | undefined;
  const lSeriesId = Form.useWatch('lSeriesId', form) as string | undefined;
  const selectedDetachment = detachments.find((d) => d.id === detachmentId);
  const selectedLSeries = lSeriesRecords.find((record) => record.id === lSeriesId);
  const platform = selectedLSeries?.platform;

  const isDirector = role === 'director';
  const lockedPlatform = isDirector ? platform : plannerPlatform;

  const lSeriesOptions = useMemo(() => {
    let records = lSeriesRecords;
    if (!isDirector) {
      records = records.filter((record) => record.platform === plannerPlatform);
    }
    return records.map((record) => ({
      label: `${record.platform} · ${record.missionType} — ${record.name} (v${record.version})`,
      value: record.id,
      disabled: detachmentId
        ? getPlansForDetachment(detachmentId).some((plan) => plan.lSeriesId === record.id)
        : false,
    }));
  }, [lSeriesRecords, isDirector, plannerPlatform, detachmentId, getPlansForDetachment]);

  useEffect(() => {
    if (open && preselectedDetachmentId) {
      form.setFieldValue('detachmentId', preselectedDetachmentId);
    }
    if (open && !isDirector) {
      const defaultRecord = lSeriesRecords.find(
        (record) => record.platform === plannerPlatform && record.missionType === 'Long',
      );
      form.setFieldsValue({
        lSeriesId: defaultRecord?.id,
        variants: undefined,
        parameterTier: undefined,
      });
    }
  }, [open, preselectedDetachmentId, form, isDirector, plannerPlatform, lSeriesRecords]);

  const existingPlatforms = detachmentId
    ? getPlansForDetachment(detachmentId).map((p) => p.platform)
    : [];

  const parameterOptions =
    platform === 'F-16'
      ? F16_FLYING_HOUR_TIERS.map((t) => ({ label: `${t} hrs`, value: t }))
      : platform === 'CH-47'
        ? CH47_AIRCRAFT_TIERS.map((t) => ({ label: `${t} aircraft`, value: t }))
        : [];

  const handleLSeriesChange = (value: string) => {
    const record = lSeriesRecords.find((item) => item.id === value);
    if (!record) return;
    if (!isDirector && existingPlatforms.includes(record.platform)) {
      message.warning(`A ${record.platform} plan already exists for this detachment.`);
    }
    form.setFieldsValue({ variants: undefined, parameterTier: undefined });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const record = lSeriesRecords.find((item) => item.id === values.lSeriesId);
      if (!record) {
        message.error('Select a valid L-series.');
        return;
      }

      const variantRows = (values.variants as string[]).map((variant: string) => ({
        variant,
        parameterTier: values.parameterTier as number,
        lSeriesVersion: record.name,
      }));

      const plan = createPlan({
        detachmentId: values.detachmentId,
        lSeriesId: record.id,
        platform: record.platform,
        detachmentType: record.missionType,
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
              name="lSeriesId"
              label="L-series"
              rules={[{ required: true, message: 'Select an L-series' }]}
              extra="Platform and mission type are determined by the selected L-series."
            >
              <Select
                placeholder="Select L-series (platform · mission type)"
                options={lSeriesOptions.map((option) => ({
                  ...option,
                  disabled:
                    option.disabled ||
                    (!isDirector &&
                      lSeriesRecords.find((record) => record.id === option.value)?.platform !==
                        plannerPlatform) ||
                    (!!detachmentId &&
                      !!lSeriesRecords.find((record) => record.id === option.value) &&
                      existingPlatforms.includes(
                        lSeriesRecords.find((record) => record.id === option.value)!.platform,
                      )),
                }))}
                onChange={handleLSeriesChange}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="needByDate"
              label="Need-by-date"
              rules={[{ required: true, message: 'Select need-by-date' }]}
            >
              <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
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
                options={(PLATFORM_VARIANTS[lockedPlatform ?? 'F-16'] ?? []).map((v) => ({
                  label: v,
                  value: v,
                }))}
                disabled={!platform}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="parameterTier"
              label={lockedPlatform === 'CH-47' ? 'Total aircraft count' : 'Total flying hours'}
              rules={[{ required: true, message: 'Required' }]}
              extra={
                lockedPlatform === 'CH-47'
                  ? 'Combined count across all selected variants.'
                  : 'Combined flying hours across all selected variants.'
              }
            >
              <Select
                placeholder={lockedPlatform === 'CH-47' ? 'Select aircraft count' : 'Select flying hours'}
                options={parameterOptions}
                disabled={!platform}
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
