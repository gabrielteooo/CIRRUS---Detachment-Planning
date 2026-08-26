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
import { useApp } from '../../context/AppContext';
import {
  getTailOptions,
  getVariantsForTails,
  inferTailNumbersFromPlan,
} from '../../data/aircraftRegistry';
import type { Detachment, PlatformPlan } from '../../types/detachment';
import {
  disableDateOutsideRange,
  formatDateRange,
  isDateRangeWithinParent,
} from '../../utils/planUtils';

interface EditParametersModalProps {
  open: boolean;
  onClose: () => void;
  plan: PlatformPlan;
  detachment: Detachment;
  onSave: (updates: Partial<PlatformPlan>) => void;
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

const positiveIntegerRules = (requiredMessage: string) => [
  { required: true, message: requiredMessage },
  {
    validator: (_: unknown, value: number | null | undefined) => {
      if (value == null) return Promise.resolve();
      if (value < 1) return Promise.reject(new Error('Enter a value of at least 1'));
      return Promise.resolve();
    },
  },
];

export default function EditParametersModal({
  open,
  onClose,
  plan,
  detachment,
  onSave,
}: EditParametersModalProps) {
  const [form] = Form.useForm();
  const { lSeriesRecords } = useApp();
  const platform = plan.platform;

  const lSeriesOptions = useMemo(() => {
    const platformRecords = lSeriesRecords.filter((record) => record.platform === platform);
    const options = platformRecords.map((record) => ({
      label: `${record.platform} · ${record.missionType} — ${record.name} (v${record.version})`,
      value: record.id,
    }));

    if (!options.some((option) => option.value === plan.lSeriesId)) {
      const versionLabel = plan.variantRows[0]?.lSeriesVersion ?? plan.lSeriesId;
      options.unshift({
        label: `${platform} · ${plan.detachmentType} — ${versionLabel}`,
        value: plan.lSeriesId,
      });
    }

    return options;
  }, [lSeriesRecords, platform, plan]);

  useEffect(() => {
    if (!open) return;

    const variants = plan.variantRows.map((row) => row.variant);
    const tailNumbers = inferTailNumbersFromPlan(platform, variants, plan.aircraftCount);

    form.setFieldsValue({
      lSeriesId: plan.lSeriesId,
      planDetachmentDates: [dayjs(plan.planDateStart), dayjs(plan.planDateEnd)],
      tailNumbers,
      variants,
      aircraftCount: plan.aircraftCount,
      flyingHours: plan.flyingHours ?? plan.variantRows[0]?.parameterTier,
    });
  }, [open, plan, platform, form]);

  const handleTailNumbersChange = (tailNumbers: string[]) => {
    form.setFieldsValue({
      variants: getVariantsForTails(platform, tailNumbers),
      aircraftCount: tailNumbers.length > 0 ? tailNumbers.length : undefined,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const record = lSeriesRecords.find((item) => item.id === values.lSeriesId);
      const lSeriesVersion =
        record?.name ?? plan.variantRows[0]?.lSeriesVersion ?? values.lSeriesId;

      const aircraftCount = values.aircraftCount as number;
      const flyingHours = values.flyingHours as number | undefined;
      const parameterTier = platform === 'F-16' ? (flyingHours as number) : aircraftCount;

      const variantRows = (values.variants as string[]).map((variant: string) => ({
        variant,
        parameterTier,
        lSeriesVersion,
      }));

      const [planStart, planEnd] = values.planDetachmentDates as [Dayjs, Dayjs];

      onSave({
        lSeriesId: values.lSeriesId,
        detachmentType: record?.missionType ?? plan.detachmentType,
        needByDate: planEnd.format('YYYY-MM-DD'),
        planDateStart: planStart.format('YYYY-MM-DD'),
        planDateEnd: planEnd.format('YYYY-MM-DD'),
        aircraftCount,
        flyingHours: platform === 'F-16' ? flyingHours : undefined,
        variantRows,
        lastUpdated: new Date().toISOString(),
      });
      message.success('Plan parameters updated');
      onClose();
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title="Edit parameters"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Save"
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Detachment">
              <Input readOnly value={detachment.name} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Detachment date">
              <Input
                readOnly
                value={formatDateRange(
                  detachment.detachmentDateStart,
                  detachment.detachmentDateEnd,
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="lSeriesId"
              label={
                <FieldLabel
                  label="L-series"
                  tooltip="Platform and mission type are determined by the selected L-series."
                />
              }
              rules={[{ required: true, message: 'Select an L-series' }]}
            >
              <Select placeholder="Select L-series" options={lSeriesOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="planDetachmentDates"
              label={
                <FieldLabel
                  label="Plan detachment date"
                  tooltip="Adjust your platform plan dates within the detachment window."
                />
              }
              rules={[
                { required: true, message: 'Select plan detachment dates' },
                {
                  validator: (_, value: [Dayjs, Dayjs] | undefined) => {
                    if (!value?.[0] || !value?.[1]) {
                      return Promise.resolve();
                    }
                    const withinParent = isDateRangeWithinParent(
                      { start: value[0], end: value[1] },
                      {
                        start: dayjs(detachment.detachmentDateStart),
                        end: dayjs(detachment.detachmentDateEnd),
                      },
                    );
                    if (!withinParent) {
                      return Promise.reject(
                        new Error('Plan dates must fall within the detachment date range'),
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
                disabledDate={(date) =>
                  disableDateOutsideRange(
                    date,
                    detachment.detachmentDateStart,
                    detachment.detachmentDateEnd,
                  )
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="tailNumbers"
              label="Tail"
              rules={[{ required: true, message: 'Select at least one tail number' }]}
            >
              <Select
                mode="multiple"
                placeholder="Select tail number(s)"
                options={getTailOptions(platform)}
                onChange={handleTailNumbersChange}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="variants"
              label="Variant"
              rules={[{ required: true, message: 'Select tail numbers to derive variants' }]}
            >
              <Select
                mode="multiple"
                placeholder="Auto-filled from tail numbers"
                open={false}
                disabled
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={platform === 'F-16' ? 12 : 24}>
            <Form.Item
              name="aircraftCount"
              label="No. of aircraft"
              rules={positiveIntegerRules('Enter number of aircraft')}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                precision={0}
                placeholder="Enter number of aircraft"
              />
            </Form.Item>
          </Col>
          {platform === 'F-16' && (
            <Col span={12}>
              <Form.Item
                name="flyingHours"
                label={
                  <FieldLabel
                    label="Total flying hours"
                    tooltip="Combined flying hours across all selected variants."
                  />
                }
                rules={positiveIntegerRules('Enter total flying hours')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  precision={0}
                  placeholder="Enter flying hours"
                  addonAfter="hrs"
                />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
