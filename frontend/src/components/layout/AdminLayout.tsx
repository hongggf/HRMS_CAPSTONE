import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Breadcrumb,
  Tag,
  Drawer,
  Grid,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BulbOutlined,
  BulbFilled,
  FullscreenOutlined,
  FullscreenExitOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useTabStore } from '../../store/useTabStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useAppConfigStore } from '../../store/useAppConfigStore';
import { authApi } from '../../api/auth';
import { TagsView } from './TagsView';
import { NotificationCenter } from './NotificationCenter';
import { useRealtimeSync } from '../../socket/useRealtimeSync';
import {
  NAVIGATION_CONFIG,
  filterNavByRoles,
  findBreadcrumbTrail,
  findNavItem,
  NavigationItem,
} from '../../config/navigation';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

type MenuItem = Required<MenuProps>['items'][number];

// Convert NavigationItems to Ant Design Menu items
const buildMenuItems = (items: NavigationItem[]): MenuItem[] => {
  return items.map((item) => {
    if (item.children && item.children.length > 0) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: buildMenuItems(item.children),
      };
    }
    return {
      key: item.key,
      icon: item.icon,
      label: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{item.label}</span>
          {item.isDev && (
            <Tag
              color="orange"
              style={{
                fontSize: 10,
                lineHeight: '16px',
                padding: '0 4px',
                margin: 0,
                transform: 'scale(0.85)',
              }}
            >
              Dev
            </Tag>
          )}
        </div>
      ),
    };
  });
};

export const AdminLayout: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = screens.md === false;

  const { user, logout } = useAuthStore();
  const { addTab, refreshKey } = useTabStore();
  const { mode, toggleTheme } = useThemeStore();
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } =
    useAppConfigStore();
  const { token } = theme.useToken();

  // Maintain real-time WebSocket connection
  useRealtimeSync();

  // Filter hierarchical navigation by active verified roles
  const filteredNavItems = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    return filterNavByRoles(NAVIGATION_CONFIG, roles);
  }, [user]);

  // Synchronize active route with TagsView tabs and avoid duplicates
  useEffect(() => {
    const navItem = findNavItem(NAVIGATION_CONFIG, location.pathname);
    if (navItem) {
      addTab({
        key: navItem.key,
        label: navItem.label,
        path: navItem.key,
      });
    }
  }, [location.pathname, addTab]);

  // Breadcrumbs trail
  const breadcrumbItems = useMemo(() => {
    const trail = findBreadcrumbTrail(NAVIGATION_CONFIG, location.pathname);
    if (trail.length === 0) {
      return [{ title: <HomeOutlined /> }, { title: 'Dashboard' }];
    }
    return [
      {
        title: (
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            <HomeOutlined />
          </span>
        ),
      },
      ...trail.map((item, idx) => ({
        title:
          idx === trail.length - 1 || item.children ? (
            <span>{item.label}</span>
          ) : (
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(item.key)}
            >
              {item.label}
            </span>
          ),
      })),
    ];
  }, [location.pathname, navigate]);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Safe backend error handling during logout
      }
    }
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

  const menuItems = useMemo(
    () => buildMenuItems(filteredNavItems),
    [filteredNavItems],
  );

  // Compute selected and open menu keys for hierarchical sidebar
  const selectedKeys = [location.pathname];
  const openKeys = useMemo(() => {
    const trail = findBreadcrumbTrail(NAVIGATION_CONFIG, location.pathname);
    return trail.slice(0, -1).map((t) => t.key);
  }, [location.pathname]);

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong>{user?.email}</Text>
          <div style={{ marginTop: 4 }}>
            {Array.isArray(user?.roles) &&
              user.roles.map((r) => (
                <Tag color="blue" key={r} style={{ fontSize: 11 }}>
                  {r}
                </Tag>
              ))}
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

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#001529',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            sidebarCollapsed && !isMobile ? 'center' : 'flex-start',
          padding: sidebarCollapsed && !isMobile ? 0 : '0 20px',
          color: '#fff',
          fontWeight: 700,
          fontSize: 18,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/dashboard')}
      >
        <span style={{ color: '#1677ff', marginRight: 10, fontSize: 22 }}>
          ⚡
        </span>
        {(!sidebarCollapsed || isMobile) && (
          <span style={{ letterSpacing: '0.5px' }}>HRMS Enterprise</span>
        )}
      </div>

      {/* Hierarchical Menu */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          onClick={handleMenuClick}
          items={menuItems}
        />
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 1. Desktop Sider */}
      {!isMobile ? (
        <Sider
          collapsible
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          trigger={null}
          theme="dark"
          width={250}
          collapsedWidth={80}
          style={{
            boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
            zIndex: 10,
          }}
        >
          {sidebarContent}
        </Sider>
      ) : (
        /* Mobile Drawer */
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          styles={{ body: { padding: 0, backgroundColor: '#001529' } }}
          width={250}
        >
          {sidebarContent}
        </Drawer>
      )}

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
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          {/* Left: Collapse Button + Breadcrumbs */}
          <Space size="middle" style={{ overflow: 'hidden' }}>
            <Button
              type="text"
              icon={
                isMobile ? (
                  <MenuUnfoldOutlined />
                ) : sidebarCollapsed ? (
                  <MenuUnfoldOutlined />
                ) : (
                  <MenuFoldOutlined />
                )
              }
              onClick={() => {
                if (isMobile) {
                  setMobileDrawerOpen(true);
                } else {
                  toggleSidebar();
                }
              }}
              style={{ fontSize: 16 }}
              aria-label="Toggle Sidebar Navigation"
            />

            {!isMobile && (
              <Breadcrumb
                items={breadcrumbItems}
                style={{ fontSize: 13, userSelect: 'none' }}
              />
            )}
          </Space>

          {/* Right: Actions, Notifications, User Profile */}
          <Space size="middle">
            {/* Verified Role Tag (Header Display) */}
            {!isMobile &&
              Array.isArray(user?.roles) &&
              user.roles.length > 0 && (
                <Tag color="geekblue" style={{ fontSize: 12, margin: 0 }}>
                  {user.roles[0]}
                </Tag>
              )}

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
              title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} theme`}
              aria-label="Toggle Theme"
            />

            {/* Fullscreen Toggle */}
            {!isMobile && (
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
                title="Toggle Fullscreen"
                aria-label="Toggle Fullscreen"
              />
            )}

            {/* Notification Center */}
            <NotificationCenter />

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
                {!isMobile && (
                  <Text strong>{user?.email?.split('@')[0] || 'User'}</Text>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Multi-Tab Navigation Bar */}
        <TagsView />

        {/* Page Content Viewport */}
        <Content
          style={{
            margin: '16px',
            padding: '24px',
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 320,
            overflowY: 'auto',
          }}
        >
          {/* Keyed by refreshKey to support reloadCurrentTab */}
          <Outlet key={`${location.pathname}-${refreshKey}`} />
        </Content>
      </Layout>
    </Layout>
  );
};
