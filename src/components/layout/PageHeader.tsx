import { Avatar, Breadcrumb, Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined, BellOutlined, HomeOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DATA_SYNC_TIMESTAMP } from '../../types/detachment';

function usePageMeta() {
  const location = useLocation();
  const { detachmentId, lSeriesId } = useParams();
  const { getDetachment, getLSeriesRecord } = useApp();

  if (location.pathname.startsWith('/system-configurations/l-series/upload/preview')) {
    return {
      breadcrumbTrail: ['System Configurations', 'L-series Management', 'Preview'],
      title: 'Preview',
      backTo: '/system-configurations/l-series',
      isPreviewPage: true,
    };
  }

  if (location.pathname.startsWith('/system-configurations/l-series/') && lSeriesId) {
    const record = getLSeriesRecord(lSeriesId);
    return {
      breadcrumbTrail: ['System Configurations', 'L-series Management', record?.name ?? 'Details'],
      title: record?.name ?? 'L-series details',
      backTo: '/system-configurations/l-series',
    };
  }

  if (location.pathname === '/system-configurations/l-series') {
    return {
      breadcrumbTrail: ['System Configurations', 'L-series Management'],
      title: 'L-series Management',
      backTo: '/system-configurations',
    };
  }

  if (location.pathname === '/system-configurations') {
    return {
      breadcrumbTrail: ['System Configurations'],
      title: 'System Configurations',
      backTo: null,
    };
  }

  const isDetails =
    location.pathname.includes('/detachment-planning/') && detachmentId;
  const detachment = isDetails && detachmentId ? getDetachment(detachmentId) : undefined;

  return {
    breadcrumbTrail: ['CIRRUS', isDetails && detachment ? detachment.name : 'Detachment Planning'],
    title: isDetails && detachment ? detachment.name : 'Detachment Planning',
    backTo: isDetails ? '/detachment-planning' : null,
  };
}

export default function PageHeader() {
  const navigate = useNavigate();
  const { currentUser, previewHeaderActions } = useApp();
  const pageMeta = usePageMeta();
  const { breadcrumbTrail, title, backTo, isPreviewPage } = pageMeta as typeof pageMeta & {
    isPreviewPage?: boolean;
  };

  const breadcrumbItems = [
    {
      title: (
        <Link to="/detachment-planning">
          <HomeOutlined /> Home
        </Link>
      ),
    },
    ...breadcrumbTrail.map((label, index) => {
      const isLast = index === breadcrumbTrail.length - 1;
      if (label === 'System Configurations') {
        return {
          title: isLast ? label : <Link to="/system-configurations">{label}</Link>,
        };
      }
      if (label === 'L-series Management') {
        return {
          title: isLast ? label : <Link to="/system-configurations/l-series">{label}</Link>,
        };
      }
      if (label === 'CIRRUS') {
        return {
          title: isLast ? label : <Link to="/detachment-planning">{label}</Link>,
        };
      }
      return { title: label };
    }),
  ];

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
          {backTo && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              aria-label="Back"
              onClick={() => navigate(backTo)}
              style={{ padding: 0, width: 32, height: 32 }}
            />
          )}
          <Typography.Title level={3} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isPreviewPage ? (
            <Space size={16}>{previewHeaderActions}</Space>
          ) : (
            <Typography.Text type="secondary" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              Data last retrieved on{' '}
              <Typography.Text strong>{DATA_SYNC_TIMESTAMP}</Typography.Text>
            </Typography.Text>
          )}
        </div>
      </div>
    </div>
  );
}
