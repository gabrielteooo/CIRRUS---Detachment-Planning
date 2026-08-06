import { Button, Input, Layout, Menu, Typography, theme } from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PageHeader from './PageHeader';

const { Sider, Content } = Layout;

const SIDER_WIDTH = 280;
const SIDER_COLLAPSED_WIDTH = 80;

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
      onTitleClick: () => {
        if (!collapsed) {
          setCirrusOpen((v) => !v);
        }
      },
    },
    {
      key: 'system-config',
      icon: <SettingOutlined />,
      label: 'System Configurations',
    },
  ];

  const footerMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: 'Log Out' },
    {
      key: 'collapse',
      icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
      label: collapsed ? 'Expand Menu' : 'Collapse Menu',
      onClick: () => setCollapsed((v) => !v),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
        collapsed={collapsed}
        trigger={null}
        className="app-shell-sider"
      >
        <div className={`app-shell-sider-top${collapsed ? ' app-shell-sider-top--collapsed' : ''}`}>
          <div className={`app-shell-logo${collapsed ? ' app-shell-logo--collapsed' : ''}`}>
            <img src="/fms-logo.svg" alt="Fleet Management System" className="app-shell-logo-mark" />
            {!collapsed && (
              <Typography.Text className="app-shell-logo-text">
                Fleet Management System
              </Typography.Text>
            )}
          </div>

          {collapsed ? (
            <div className="app-shell-search-collapsed">
              <Button
                type="default"
                icon={<SearchOutlined />}
                aria-label="Search"
                className="app-shell-search-icon-btn"
              />
            </div>
          ) : (
            <Input
              placeholder="Search"
              suffix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
              className="app-shell-search-input"
              styles={{
                input: { color: '#fff', background: 'transparent' },
              }}
            />
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={isDetachmentPlanning ? ['detachment-planning'] : []}
          openKeys={collapsed ? [] : cirrusOpen ? ['cirrus'] : []}
          onOpenChange={(keys) => {
            if (!collapsed) {
              setCirrusOpen(keys.includes('cirrus'));
            }
          }}
          items={sidebarMenuItems}
          className="app-shell-menu"
        />

        <div className="app-shell-sider-footer">
          <Menu
            theme="dark"
            mode="inline"
            inlineCollapsed={collapsed}
            selectable={false}
            items={footerMenuItems}
            className="app-shell-menu app-shell-menu--footer"
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
