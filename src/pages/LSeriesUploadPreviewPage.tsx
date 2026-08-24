import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Row, Col, Typography, message } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import DiscardLSeriesModal from '../components/lseries/DiscardLSeriesModal';
import LSeriesComponentsTable from '../components/lseries/LSeriesComponentsTable';
import { useApp } from '../context/AppContext';

export default function LSeriesUploadPreviewPage() {
  const navigate = useNavigate();
  const { uploadPreview, clearUploadPreview, submitLSeriesUpload, setPreviewHeaderActions } = useApp();
  const [name, setName] = useState(uploadPreview?.name ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (uploadPreview) {
      setName(uploadPreview.name);
    }
  }, [uploadPreview]);

  const handleDiscardConfirm = () => {
    setDiscardOpen(false);
    clearUploadPreview();
    navigate('/system-configurations/l-series');
  };

  const handleSubmit = useCallback(() => {
    if (!uploadPreview) return;
    const trimmed = name.trim();
    if (!trimmed) {
      message.error('Enter an L-series name.');
      return;
    }

    setSubmitting(true);
    const record = submitLSeriesUpload({
      ...uploadPreview,
      name: trimmed,
    });
    clearUploadPreview();
    navigate('/system-configurations/l-series', {
      state: {
        lSeriesToast: {
          name: record.name,
          isReplace: Boolean(uploadPreview.replacingRecordId),
        },
      },
    });
  }, [uploadPreview, name, submitLSeriesUpload, clearUploadPreview, navigate]);

  useEffect(() => {
    setPreviewHeaderActions(
      <>
        <Button type="text" className="lseries-preview-discard-btn" onClick={() => setDiscardOpen(true)}>
          Discard
        </Button>
        <Button type="primary" loading={submitting} onClick={handleSubmit}>
          Submit
        </Button>
      </>,
    );
    return () => setPreviewHeaderActions(null);
  }, [setPreviewHeaderActions, submitting, handleSubmit]);

  if (!uploadPreview) {
    return <Navigate to="/system-configurations/l-series" replace />;
  }

  return (
    <div className="lseries-preview-page">
      <div className="lseries-preview-meta">
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">Name</Typography.Text>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={{ marginTop: 4 }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">Platform</Typography.Text>
            <Input readOnly value={uploadPreview.platform} style={{ marginTop: 4 }} />
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">Detachment type</Typography.Text>
            <Input readOnly value={uploadPreview.missionType} style={{ marginTop: 4 }} />
          </Col>
        </Row>
      </div>

      <LSeriesComponentsTable template={uploadPreview.template} withCategoryTabs scrollY={520} />

      <DiscardLSeriesModal
        open={discardOpen}
        onContinue={() => setDiscardOpen(false)}
        onDiscard={handleDiscardConfirm}
      />
    </div>
  );
}
