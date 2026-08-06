import { Avatar, Breadcrumb, Button, Typography } from 'antd';
import { ArrowLeftOutlined, BellOutlined, HomeOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DATA_SYNC_TIMESTAMP } from '../../types/detachment';

export default function PageHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { detachmentId } = useParams();
  const { getDetachment, currentUser } = useApp();

  const isDetails =
    location.pathname.includes('/detachment-planning/') && detachmentId;
  const detachment = isDetails && detachmentId ? getDetachment(detachmentId) : undefined;

  const breadcrumbItems = [
    {
      title: (
        <Link to="/detachment-planning">
          <HomeOutlined /> Home
        </Link>
      ),
    },
    { title: <Link to="/detachment-planning">CIRRUS</Link> },
    {
      title: isDetails && detachment ? detachment.name : 'Detachment Planning',
    },
  ];

  const pageTitle = isDetails && detachment ? detachment.name : 'Detachment Planning';

  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid #e2e2e2',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        padding: '24px 40px',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <BellOutlined style={{ fontSize: 18, color: 'rgba(0,0,0,0.65)' }} />
          <QuestionCircleOutlined style={{ fontSize: 18, color: 'rgba(0,0,0,0.65)' }} />
          <Avatar size={32} style={{ background: '#00636a' }}>
            {currentUser.initials}
          </Avatar>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isDetails && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              aria-label="Back to detachment list"
              onClick={() => navigate('/detachment-planning')}
              style={{ padding: 0, width: 32, height: 32 }}
            />
          )}
          <Typography.Title level={3} style={{ margin: 0 }}>
            {pageTitle}
          </Typography.Title>
        </div>
        <Typography.Text type="secondary" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          Data last retrieved on{' '}
          <Typography.Text strong>{DATA_SYNC_TIMESTAMP}</Typography.Text>
        </Typography.Text>
      </div>
    </div>
  );
}
