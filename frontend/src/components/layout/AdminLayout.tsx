import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Badge,
  Typography,
  theme,
} from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  TeamOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  ScheduleOutlined,
  DollarOutlined,
  RiseOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BulbOutlined,
  BulbFilled,
  FullscreenOutlined,
  FullscreenExitOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useTabStore } from '../../store/useTabStore';
import { useThemeStore } from '../../store/useThemeStore';
import { RoleName } from '../../types/api';
import { TagsView } from './TagsView';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MenuItemDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  roles?: RoleName[];
  children?: MenuItemDef[];
}

const MENU_DEFINITIONS: MenuItemDef[] = [
  {
    key: '/dashboard',
    label: 'Dashboard',
    icon: <DashboardOutlined />,
    roles: ['HEAD_OF_HR'],
  },
  {
    key: '/organization',
    label: 'Organization',
    icon: <ApartmentOutlined />,
    roles: ['HEAD_OF_HR', 'HR_ADMIN'],
  },
  {
    key: '/workforce',
    label: 'Workforce Planning',
    icon: <SolutionOutlined />,
    roles: ['HEAD_OF_HR', 'HR_RECRUITMENT', 'HR_ADMIN'],
  },
  {
    key: '/recruitment',
    label: 'Recruitment',
    icon: <TeamOutlined />,
    roles: ['HEAD_OF_HR', 'HR_RECRUITMENT'],
  },
  {
    key: '/employees',
    label: 'Employees',
    icon: <UserOutlined />,
    roles: ['HEAD_OF_HR', 'HR_ADMIN'],
  },
  {
    key: '/attendance',
    label: 'Attendance & Leaves',
    icon: <ScheduleOutlined />,
    roles: ['HEAD_OF_HR', 'HR_ATTENDANCE'],
  },
  {
    key: '/payroll',
    label: 'Payroll',
    icon: <DollarOutlined />,
    roles: ['HEAD_OF_HR', 'HR_PAYROLL'],
  },
  {
    key: '/performance',
    label: 'Performance & PIP',
    icon: <RiseOutlined />,
    roles: ['HEAD_OF_HR', 'HR_PERFORMANCE'],
  },
  {
    key: '/lnd',
    label: 'Learning & Dev',
    icon: <ReadOutlined />,
    roles: ['HEAD_OF_HR', 'HR_LND'],
  },
  {
    key: '/audit-logs',
    label: 'Audit Logs',
    icon: <SafetyCertificateOutlined />,
    roles: ['HEAD_OF_HR', 'HR_ADMIN'],
  },
];

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuthStore();
  const { addTab } = useTabStore();
  const { mode, toggleTheme } = useThemeStore();
  const { token } = theme.useToken();

  // Filter menu items by user roles
  const filteredMenuItems = React.useMemo(() => {
    if (!user) return [];
    const isHead = user.roles.includes('HEAD_OF_HR');
    return MENU_DEFINITIONS.filter((item) => {
      if (isHead) return true;
      if (!item.roles) return true;
      return item.roles.some((r) => user.roles.includes(r));
    });
  }, [user]);

  // Synchronize active route with TagsView tabs
  useEffect(() => {
    const currentItem = MENU_DEFINITIONS.find(
      (m) => m.key === location.pathname,
    );
    if (currentItem) {
      addTab({
        key: currentItem.key,
        label: currentItem.label,
        path: currentItem.key,
      });
    }
  }, [location.pathname, addTab]);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div>
          <Text strong>{user?.email}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user?.roles.join(', ')}
            </Text>
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 1. Left Collapsible Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        theme="dark"
        width={240}
        style={{
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#1677ff', marginRight: 8, fontSize: 22 }}>
            ⚡
          </span>
          {!collapsed && <span>HRMS Portal</span>}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={filteredMenuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
        />
      </Sider>

      {/* 2. Main Work Area */}
      <Layout>
        {/* Top Header */}
        <Header
          style={{
            padding: '0 20px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            <Text style={{ fontSize: 14, color: token.colorTextSecondary }}>
              HRMS Enterprise Edition
            </Text>
          </Space>

          <Space size="middle">
            {/* Dark/Light Theme Toggle */}
            <Button
              type="text"
              icon={
                mode === 'dark' ? (
                  <BulbFilled style={{ color: '#faad14' }} />
                ) : (
                  <BulbOutlined />
                )
              }
              onClick={toggleTheme}
            />

            {/* Fullscreen Toggle */}
            <Button
              type="text"
              icon={
                isFullscreen ? (
                  <FullscreenExitOutlined />
                ) : (
                  <FullscreenOutlined />
                )
              }
              onClick={toggleFullscreen}
            />

            {/* Notifications Bell */}
            <Badge count={0} size="small" offset={[2, 2]}>
              <Button type="text" icon={<BellOutlined />} />
            </Badge>

            {/* User Avatar & Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space
                style={{
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                <Avatar
                  style={{ backgroundColor: '#1677ff' }}
                  icon={<UserOutlined />}
                />
                <Text strong>{user?.email?.split('@')[0] || 'User'}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Multi-Tab Navigation Bar */}
        <TagsView />

        {/* Page View Outlet */}
        <Content
          style={{
            margin: '16px',
            padding: '24px',
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 280,
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
