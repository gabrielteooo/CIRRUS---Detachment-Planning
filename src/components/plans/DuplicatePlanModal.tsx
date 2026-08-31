import { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Tooltip,
  message,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { inferTailNumbersFromPlan } from '../../data/aircraftRegistry';
import type { Detachment, PlatformPlan } from '../../types/detachment';
import {
  formatLSeriesVersions,
  formatPlatformVariant,
  formatPlanOperationalParameters,
} from '../../utils/planDisplayUtils';
import {
  disableDateOutsideRange,
  formatDateRange,
  isDateRangeWithinParent,
} from '../../utils/planUtils';

interface DuplicatePlanModalProps {
  open: boolean;
  onClose: () => void;
  plan: PlatformPlan;
  detachment: Detachment;
}

function FieldLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className="create-plan-field-label">
      {label}
      <Tooltip title={tooltip}>
        <InfoCircleOutlined className="create-plan-field-label-icon" aria-label="More information" />
      </Tooltip>
    </span>
  );
}

export default function DuplicatePlanModal({
  open,
  onClose,
  plan,
  detachment,
}: DuplicatePlanModalProps) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { detachments, duplicatePlan, getPlansForDetachment, lSeriesRecords, role } = useApp();

  const detachmentId = Form.useWatch('detachmentId', form) as string | undefined;
  const selectedDetachment = detachments.find((item) => item.id === detachmentId);

  const lSeriesLabel = useMemo(() => {
    const record = lSeriesRecords.find((item) => item.id === plan.lSeriesId);
    if (record) {
      return `${record.platform} · ${record.missionType} — ${record.name} (v${record.version})`;
    }
    return formatLSeriesVersions(plan);
  }, [lSeriesRecords, plan]);

  const tailNumbers = useMemo(() => {
    const variants = plan.variantRows.map((row) => row.variant);
    return inferTailNumbersFromPlan(plan.platform, variants, plan.aircraftCount);
  }, [plan]);

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      detachmentId: detachment.id,
      planDetachmentDates: [dayjs(plan.planDateStart), dayjs(plan.planDateEnd)],
      remarks: plan.remarks,
    });
  }, [open, detachment.id, plan, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [planStart, planEnd] = values.planDetachmentDates as [Dayjs, Dayjs];

      const result = duplicatePlan(plan.id, {
        detachmentId: values.detachmentId,
        planDateStart: planStart.format('YYYY-MM-DD'),
        planDateEnd: planEnd.format('YYYY-MM-DD'),
        needByDate: planEnd.format('YYYY-MM-DD'),
        remarks: values.remarks?.trim() || undefined,
      });

      if (!result.ok) {
        message.error(result.message);
        return;
      }

      message.success('Detachment plan duplicated');
      form.resetFields();
      onClose();

      const query = role === 'director' ? `?platform=${result.plan.platform}` : '';
      navigate(`/detachment-planning/${result.plan.detachmentId}${query}`);
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title="Duplicate Detachment Plan"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Duplicate"
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Source plan">
              <Input
                readOnly
                value={`${formatPlatformVariant(plan.platform, plan)} · ${formatPlanOperationalParameters(plan)}`}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="detachmentId"
              label="Detachment/ Exercise"
              rules={[{ required: true, message: 'Select a detachment/exercise' }]}
            >
              <Select
                placeholder="Select detachment/exercise"
                options={detachments.map((item) => {
                  const hasConflict = getPlansForDetachment(item.id).some(
                    (existing) => existing.platform === plan.platform,
                  );
                  return {
                    label: hasConflict
                      ? `${item.name} (${plan.platform} plan exists)`
                      : item.name,
                    value: item.id,
                    disabled: hasConflict,
                  };
                })}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Detachment date">
              <Input
                readOnly
                placeholder="Select detachment/exercise first"
                value={
                  selectedDetachment
                    ? formatDateRange(
                        selectedDetachment.detachmentDateStart,
                        selectedDetachment.detachmentDateEnd,
                      )
                    : ''
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="L-series">
              <Input readOnly value={lSeriesLabel} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="planDetachmentDates"
              label={
                <FieldLabel
                  label="Deployment Period"
                  tooltip="Set deployment dates within the detachment/exercise window."
                />
              }
              rules={[
                { required: true, message: 'Select deployment period' },
                {
                  validator: (_, value: [Dayjs, Dayjs] | undefined) => {
                    if (!value?.[0] || !value?.[1] || !selectedDetachment) {
                      return Promise.resolve();
                    }
                    const withinParent = isDateRangeWithinParent(
                      { start: value[0], end: value[1] },
                      {
                        start: dayjs(selectedDetachment.detachmentDateStart),
                        end: dayjs(selectedDetachment.detachmentDateEnd),
                      },
                    );
                    if (!withinParent) {
                      return Promise.reject(
                        new Error(
                          'Deployment period must fall within the detachment/exercise date range',
                        ),
                      );
                    }
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
                disabled={!selectedDetachment}
                disabledDate={(date) =>
                  selectedDetachment
                    ? disableDateOutsideRange(
                        date,
                        selectedDetachment.detachmentDateStart,
                        selectedDetachment.detachmentDateEnd,
                      )
                    : false
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={plan.platform === 'F-16' ? 12 : 24}>
            <Form.Item label="Tail">
              <Select mode="multiple" open={false} disabled value={tailNumbers} />
            </Form.Item>
          </Col>
          {plan.platform === 'F-16' && (
            <Col span={12}>
              <Form.Item label="Total flying hours">
                <InputNumber
                  style={{ width: '100%' }}
                  readOnly
                  disabled
                  value={plan.flyingHours ?? plan.variantRows[0]?.parameterTier}
                  addonAfter="hrs"
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Variant">
              <Select
                mode="multiple"
                open={false}
                disabled
                value={plan.variantRows.map((row) => row.variant)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="No. of aircraft">
              <InputNumber style={{ width: '100%' }} readOnly disabled value={plan.aircraftCount} />
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
