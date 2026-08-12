import { useEffect, useState } from 'react';
import { Form, Input, Modal, Select, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useNavigate } from 'react-router-dom';
import type { Platform } from '../../types/detachment';
import { L_SERIES_MISSION_TYPES, type LSeriesMissionType, type LSeriesRecord } from '../../types/lSeries';
import { getDefaultLSeriesName } from '../../data/mockLSeriesRecords';
import { L_SERIES_TEMPLATE } from '../../data/lSeriesTemplate';
import { useApp } from '../../context/AppContext';

export type UploadLSeriesMode = 'new' | 'replace';

export interface UploadLSeriesModalProps {
  open: boolean;
  onClose: () => void;
  mode: UploadLSeriesMode;
  initialPlatform?: Platform;
  replaceRecord?: LSeriesRecord;
}

function buildMockUploadFile(platform: Platform, detachmentType: LSeriesMissionType): UploadFile {
  const name = getDefaultLSeriesName(platform, detachmentType);
  return {
    uid: `mock-${platform}-${detachmentType}`,
    name: `${name}.xlsx`,
    status: 'done',
  };
}

export default function UploadLSeriesModal({
  open,
  onClose,
  mode,
  initialPlatform,
  replaceRecord,
}: UploadLSeriesModalProps) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { lSeriesRecords, setUploadPreview } = useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const platform = (Form.useWatch('platform', form) as Platform | undefined) ?? initialPlatform;
  const detachmentType = Form.useWatch('detachmentType', form) as LSeriesMissionType | undefined;
  const isReplace = mode === 'replace';

  useEffect(() => {
    if (!open) return;

    if (isReplace && replaceRecord) {
      form.setFieldsValue({
        platform: replaceRecord.platform,
        detachmentType: replaceRecord.missionType,
        name: replaceRecord.name,
      });
      setFileList([buildMockUploadFile(replaceRecord.platform, replaceRecord.missionType)]);
      return;
    }

    const resolvedPlatform = initialPlatform ?? 'F-16';
    const resolvedType: LSeriesMissionType = 'Short';
    form.setFieldsValue({
      platform: resolvedPlatform,
      detachmentType: resolvedType,
      name: getDefaultLSeriesName(resolvedPlatform, resolvedType),
    });
    setFileList([buildMockUploadFile(resolvedPlatform, resolvedType)]);
  }, [open, isReplace, replaceRecord, initialPlatform, form]);

  const availableDetachmentTypes = L_SERIES_MISSION_TYPES.filter((type) => {
    if (isReplace) return true;
    if (!platform) return true;
    return !lSeriesRecords.some(
      (record) => record.platform === platform && record.missionType === type,
    );
  });

  const handlePlatformDetachmentChange = () => {
    if (isReplace || !platform || !detachmentType) return;
    form.setFieldValue('name', getDefaultLSeriesName(platform, detachmentType));
    setFileList([buildMockUploadFile(platform, detachmentType)]);
  };

  const reset = () => {
    form.resetFields();
    setFileList([]);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const preview = {
        platform: values.platform,
        missionType: values.detachmentType,
        name: values.name.trim(),
        template: structuredClone(L_SERIES_TEMPLATE[values.platform as Platform]),
        replacingRecordId: isReplace ? replaceRecord?.id : undefined,
        nextVersion: isReplace && replaceRecord ? replaceRecord.version + 1 : 1,
      };

      setUploadPreview(preview);
      handleClose();
      navigate('/system-configurations/l-series/upload/preview');
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isReplace ? 'Replace L-series' : 'Upload new L-series'}
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText="Preview"
      confirmLoading={submitting}
      width={560}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        onValuesChange={(changed) => {
          if ('platform' in changed || 'detachmentType' in changed) {
            handlePlatformDetachmentChange();
          }
        }}
      >
        <Form.Item
          name="platform"
          label="Platform"
          rules={[{ required: true, message: 'Select platform' }]}
        >
          <Select
            placeholder="Select platform"
            disabled={isReplace || !!initialPlatform}
            options={[
              { label: 'F-16', value: 'F-16' },
              { label: 'CH-47', value: 'CH-47' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="detachmentType"
          label="Detachment type"
          rules={[{ required: true, message: 'Select detachment type' }]}
        >
          <Select
            placeholder="Select detachment type"
            disabled={isReplace}
            options={availableDetachmentTypes.map((type) => ({ label: type, value: type }))}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Enter L-series name' }]}
        >
          <Input placeholder="e.g. L-F16-Short-2026" />
        </Form.Item>

        <Form.Item label="L-series file" required>
          <Upload.Dragger
            accept=".xlsx,.xls"
            maxCount={1}
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: nextList }) => setFileList(nextList.slice(-1))}
            onRemove={() => setFileList([])}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag Excel file to upload</p>
            <p className="ant-upload-hint">Mock upload — file is pre-filled for demo testing.</p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
