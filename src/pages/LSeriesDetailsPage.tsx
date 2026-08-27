import { useEffect, useState } from 'react';
import { App, Button, Descriptions, message } from 'antd';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import InlineEditableName from '../components/lseries/InlineEditableName';
import LSeriesComponentsTable from '../components/lseries/LSeriesComponentsTable';
import UploadLSeriesModal from '../components/lseries/UploadLSeriesModal';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/planUtils';
import { showLSeriesSubmittedToast } from '../utils/planLineToasts';

export default function LSeriesDetailsPage() {
  const { lSeriesId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();
  const { getLSeriesRecord, updateLSeriesName } = useApp();
  const [replaceOpen, setReplaceOpen] = useState(false);

  const record = lSeriesId ? getLSeriesRecord(lSeriesId) : undefined;

  useEffect(() => {
    const toast = (
      location.state as { lSeriesToast?: { name: string; isReplace: boolean } } | null
    )?.lSeriesToast;
    if (!toast) return;

    showLSeriesSubmittedToast(messageApi, toast.name, toast.isReplace);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, messageApi, navigate]);

  if (!record) {
    return <Navigate to="/system-configurations/l-series" replace />;
  }

  const handleNameSave = (name: string) => {
    updateLSeriesName(record.id, name);
    message.success('L-series name updated');
  };

  return (
    <div>
      <div className="lseries-details-header">
        <InlineEditableName value={record.name} onSave={handleNameSave} editable />
        <Button onClick={() => setReplaceOpen(true)}>Replace L-series</Button>
      </div>

      <Descriptions bordered size="small" column={3} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Platform">{record.platform}</Descriptions.Item>
        <Descriptions.Item label="Mission type">{record.missionType}</Descriptions.Item>
        <Descriptions.Item label="Version">v{record.version}</Descriptions.Item>
        <Descriptions.Item label="Uploaded date">
          {formatDateTime(record.uploadedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="Uploaded by" span={2}>
          {record.uploadedByName}
        </Descriptions.Item>
      </Descriptions>

      <LSeriesComponentsTable
        template={record.template}
        withCategoryTabs
        scrollY={520}
      />

      <UploadLSeriesModal
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        mode="replace"
        replaceRecord={record}
      />
    </div>
  );
}
