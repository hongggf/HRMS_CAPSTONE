import React, { useState } from 'react';
import {
  Popover,
  Badge,
  Button,
  List,
  Typography,
  Space,
  Empty,
  Skeleton,
  Tag,
  Alert,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../api/notification';
import { NotificationItem, NotificationType } from '../../types/api';

const { Text } = Typography;

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'WARNING':
      return <WarningOutlined style={{ color: '#faad14' }} />;
    case 'SUCCESS':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'ALERT':
      return <AlertOutlined style={{ color: '#ff4d4f' }} />;
    case 'INFO':
    default:
      return <InfoCircleOutlined style={{ color: '#1677ff' }} />;
  }
};

const formatNotificationTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
};

export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationApi.getUnreadCount,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Fetch full list only when popover is open
  const {
    data: notifications = [],
    isLoading: listLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.getNotifications,
    enabled: open,
    staleTime: 10000,
  });

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  // Mark all notifications as read
  const markAllMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const handleMarkAsRead = (id: number) => {
    if (!markReadMutation.isPending) {
      markReadMutation.mutate(id);
    }
  };

  const handleMarkAllAsRead = () => {
    if (!markAllMutation.isPending && unreadCount > 0) {
      markAllMutation.mutate();
    }
  };

  const content = (
    <div
      style={{
        width: 360,
        maxHeight: 440,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 10,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          marginBottom: 10,
        }}
      >
        <Space>
          <Text strong style={{ fontSize: 15 }}>
            Notifications
          </Text>
          {unreadCount > 0 && <Tag color="blue">{unreadCount} unread</Tag>}
        </Space>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleMarkAllAsRead}
            loading={markAllMutation.isPending}
            style={{ padding: 0 }}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Content */}
      <div style={{ overflowY: 'auto', maxHeight: 350, paddingRight: 4 }}>
        {isError && (
          <Alert
            type="error"
            message="Failed to load notifications"
            description={(error as Error)?.message || 'Network error'}
            style={{ marginBottom: 10 }}
            action={
              <Button size="small" type="primary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {listLoading ? (
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications right now"
            style={{ margin: '24px 0' }}
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={(item: NotificationItem) => (
              <List.Item
                style={{
                  padding: '10px 8px',
                  backgroundColor: item.isRead
                    ? 'transparent'
                    : 'rgba(22, 119, 255, 0.04)',
                  borderRadius: 6,
                  marginBottom: 6,
                  transition: 'background 0.2s',
                  cursor: item.isRead ? 'default' : 'pointer',
                }}
                onClick={() => {
                  if (!item.isRead) handleMarkAsRead(item.id);
                }}
                actions={
                  !item.isRead
                    ? [
                        <Button
                          key="read"
                          type="text"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(item.id);
                          }}
                          icon={<CheckOutlined />}
                          title="Mark as read"
                        />,
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  avatar={
                    <span style={{ fontSize: 18, marginRight: 4 }}>
                      {getNotificationIcon(item.type)}
                    </span>
                  }
                  title={
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text strong={!item.isRead} style={{ fontSize: 13 }}>
                        {item.title}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatNotificationTime(item.createdAt)}
                      </Text>
                    </div>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.message}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
    >
      <Badge
        count={unreadCount}
        size="small"
        offset={[-2, 2]}
        overflowCount={99}
      >
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 17 }} />}
          aria-label="Notification Center"
          loading={countLoading && unreadCount === 0}
        />
      </Badge>
    </Popover>
  );
};
