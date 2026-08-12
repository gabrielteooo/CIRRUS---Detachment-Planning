import { Card, Col, Row, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export default function SystemConfigPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Configure system-wide reference data used across CIRRUS modules.
      </Typography.Paragraph>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            className="system-config-card"
            onClick={() => navigate('/system-configurations/l-series')}
          >
            <div className="system-config-card-icon">
              <FileTextOutlined />
            </div>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              L-series Management
            </Typography.Title>
            <Typography.Text type="secondary">
              Maintain platform L-series records for detachment planning.
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
