import { Descriptions, message } from 'antd';
import { Navigate, useParams } from 'react-router-dom';
import InlineEditableName from '../components/lseries/InlineEditableName';
import LSeriesComponentsTable from '../components/lseries/LSeriesComponentsTable';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/planUtils';

export default function LSeriesDetailsPage() {
  const { lSeriesId } = useParams();
  const { getLSeriesRecord, updateLSeriesName } = useApp();

  const record = lSeriesId ? getLSeriesRecord(lSeriesId) : undefined;

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
    </div>
  );
}
