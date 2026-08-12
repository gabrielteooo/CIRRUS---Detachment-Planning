import { Card, Typography } from 'antd';
import type { LSeriesRecord } from '../../types/lSeries';

interface LSeriesCardProps {
  record: LSeriesRecord;
  onClick: () => void;
}

export default function LSeriesCard({ record, onClick }: LSeriesCardProps) {
  return (
    <Card
      hoverable
      className="lseries-mgmt-card"
      onClick={onClick}
      styles={{ body: { padding: 20 } }}
    >
      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        {record.name}
      </Typography.Title>
      <div className="lseries-mgmt-card-meta">
        <div>
          <Typography.Text type="secondary">Platform</Typography.Text>
          <Typography.Text strong style={{ display: 'block' }}>
            {record.platform}
          </Typography.Text>
        </div>
        <div>
          <Typography.Text type="secondary">Mission type</Typography.Text>
          <Typography.Text strong style={{ display: 'block' }}>
            {record.missionType}
          </Typography.Text>
        </div>
        <div>
          <Typography.Text type="secondary">Version</Typography.Text>
          <Typography.Text strong style={{ display: 'block' }}>
            {record.version}.0
          </Typography.Text>
        </div>
      </div>
    </Card>
  );
}
