import { Layout, Menu, Input, Typography, theme } from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PageHeader from './PageHeader';

const { Sider, Content } = Layout;

const CIRRUS_ITEMS = [
  { key: 'inventory-health', label: 'Inventory Health' },
  { key: 'critical-spares', label: 'Critical Spares' },
  { key: 'demand-fulfilment', label: 'Demand & Fulfilment' },
  { key: 'purchase-tracking', label: 'Purchase Tracking' },
  { key: 'detachment-planning', label: 'Detachment Planning' },
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [cirrusOpen, setCirrusOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const isDetachmentPlanning = location.pathname.startsWith('/detachment-planning');

  const cirrusChildren = CIRRUS_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    onClick: () => {
      if (item.key === 'detachment-planning') {
        navigate('/detachment-planning');
      }
    },
  }));

  const sidebarMenuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Home',
    },
    {
      key: 'cirrus',
      icon: <AppstoreOutlined />,
      label: 'CIRRUS',
      children: cirrusChildren,
      onTitleClick: () => setCirrusOpen((v) => !v),
    },
    {
      key: 'system-config',
      icon: <SettingOutlined />,
      label: 'System Configurations',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={280}
        collapsedWidth={0}
        collapsed={collapsed}
        trigger={null}
        style={{
          background: '#191b1e',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, height: 48 }}>
            <div
              style={{
                width: 35,
                height: 40,
                background: 'linear-gradient(135deg, #00636a 0%, #00838a 100%)',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>F</Typography.Text>
            </div>
            {!collapsed && (
              <Typography.Text
                style={{ color: '#fff', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}
              >
                Fleet Management System
              </Typography.Text>
            )}
          </div>
          {!collapsed && (
            <Input
              placeholder="Search"
              suffix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
              style={{
                background: '#21242a',
                borderColor: 'rgba(255,255,255,0.45)',
                marginBottom: 16,
              }}
              styles={{
                input: { color: '#fff', background: 'transparent' },
              }}
            />
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={isDetachmentPlanning ? ['detachment-planning'] : []}
          defaultOpenKeys={cirrusOpen ? ['cirrus'] : []}
          items={sidebarMenuItems}
          style={{ background: '#191b1e', border: 'none', flex: 1 }}
          inlineIndent={20}
        />

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: '12px 0' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectable={false}
            items={[
              { key: 'logout', icon: <LogoutOutlined />, label: 'Log Out' },
              {
                key: 'collapse',
                icon: <MenuFoldOutlined />,
                label: 'Collapse Menu',
                onClick: () => setCollapsed((v) => !v),
              },
            ]}
            style={{ background: 'transparent', border: 'none' }}
          />
        </div>
      </Sider>

      <Layout style={{ background: token.colorBgLayout }}>
        <Content style={{ minHeight: '100vh' }}>
          <PageHeader />
          <div style={{ padding: '0 40px 40px' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
