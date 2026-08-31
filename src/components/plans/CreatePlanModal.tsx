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
import { getTailOptions, getVariantsForTails } from '../../data/aircraftRegistry';
import {
  disableDateOutsideRange,
  formatDateRange,
  isDateRangeWithinParent,
} from '../../utils/planUtils';

interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  preselectedDetachmentId?: string;
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
        tailNumbers: undefined,
        variants: undefined,
        aircraftCount: undefined,
        flyingHours: undefined,
      });
    }
  }, [open, preselectedDetachmentId, form, isDirector, plannerPlatform, lSeriesRecords]);

  useEffect(() => {
    if (!selectedDetachment) {
      form.setFieldValue('planDetachmentDates', undefined);
      return;
    }

    form.setFieldValue('planDetachmentDates', [
      dayjs(selectedDetachment.detachmentDateStart),
      dayjs(selectedDetachment.detachmentDateEnd),
    ]);
  }, [detachmentId, selectedDetachment, form]);

  const existingPlatforms = detachmentId
    ? getPlansForDetachment(detachmentId).map((p) => p.platform)
    : [];

  const tailOptions = useMemo(
    () => getTailOptions(lockedPlatform),
    [lockedPlatform],
  );

  const handleLSeriesChange = (value: string) => {
    const record = lSeriesRecords.find((item) => item.id === value);
    if (!record) return;
    if (!isDirector && existingPlatforms.includes(record.platform)) {
      message.warning(`A ${record.platform} plan already exists for this detachment.`);
    }
    form.setFieldsValue({
      tailNumbers: undefined,
      variants: undefined,
      aircraftCount: undefined,
      flyingHours: undefined,
    });
  };

  const handleTailNumbersChange = (tailNumbers: string[]) => {
    if (!lockedPlatform) {
      form.setFieldsValue({ variants: undefined, aircraftCount: undefined });
      return;
    }
    form.setFieldsValue({
      variants: getVariantsForTails(lockedPlatform, tailNumbers),
      aircraftCount: tailNumbers.length > 0 ? tailNumbers.length : undefined,
    });
  };

  const positiveIntegerRules = (message: string) => [
    { required: true, message },
    {
      validator: (_: unknown, value: number | null | undefined) => {
        if (value == null) return Promise.resolve();
        if (value < 1) return Promise.reject(new Error('Enter a value of at least 1'));
        return Promise.resolve();
      },
    },
  ];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const record = lSeriesRecords.find((item) => item.id === values.lSeriesId);
      if (!record) {
        message.error('Select a valid L-series.');
        return;
      }

      const aircraftCount = values.aircraftCount as number;
      const flyingHours = values.flyingHours as number | undefined;
      const parameterTier =
        record.platform === 'F-16' ? (flyingHours as number) : aircraftCount;

      const variantRows = (values.variants as string[]).map((variant: string) => ({
        variant,
        parameterTier,
        lSeriesVersion: record.name,
      }));

      const [planStart, planEnd] = values.planDetachmentDates as [Dayjs, Dayjs];

      const plan = createPlan({
        detachmentId: values.detachmentId,
        lSeriesId: record.id,
        platform: record.platform,
        detachmentType: record.missionType,
        needByDate: planEnd.format('YYYY-MM-DD'),
        planDateStart: planStart.format('YYYY-MM-DD'),
        planDateEnd: planEnd.format('YYYY-MM-DD'),
        aircraftCount,
        flyingHours: record.platform === 'F-16' ? flyingHours : undefined,
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
              label="Detachment/ Exercise"
              rules={[{ required: true, message: 'Select a detachment/exercise' }]}
            >
              <Select
                placeholder="Select detachment/exercise"
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
              name="planDetachmentDates"
              label={
                <FieldLabel
                  label="Deployment Period"
                  tooltip="Adjust your platform plan dates within the detachment/exercise window."
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
                        new Error('Deployment period must fall within the detachment/exercise date range'),
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
          <Col span={lockedPlatform === 'F-16' ? 12 : 24}>
            <Form.Item
              name="tailNumbers"
              label="Tail"
              rules={[{ required: true, message: 'Select at least one tail number' }]}
            >
              <Select
                mode="multiple"
                placeholder="Select tail number(s)"
                options={tailOptions}
                disabled={!platform}
                onChange={handleTailNumbersChange}
              />
            </Form.Item>
          </Col>
          {lockedPlatform === 'F-16' && (
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
                  disabled={!platform}
                  addonAfter="hrs"
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Row gutter={16}>
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
          <Col span={12}>
            <Form.Item
              name="aircraftCount"
              label="No. of aircraft"
              rules={positiveIntegerRules('Enter number of aircraft')}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                precision={0}
                placeholder="Auto-filled from tail numbers"
                disabled
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
