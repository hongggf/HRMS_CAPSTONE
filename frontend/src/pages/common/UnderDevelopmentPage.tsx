import React from 'react';
import { Result, Button, Tag, Space, Card, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ToolOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { findNavItem, NAVIGATION_CONFIG } from '../../config/navigation';

const { Text, Paragraph } = Typography;

export const UnderDevelopmentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItem = findNavItem(NAVIGATION_CONFIG, location.pathname);
  const title = navItem?.label || 'Module Under Construction';
  const phase = navItem?.phase || 'Upcoming Phase';
  const description =
    navItem?.description ||
    'This administrative feature is currently in active development as part of the scheduled roadmap.';

  return (
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <Card
        bordered
        style={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          borderRadius: 8,
          textAlign: 'center',
        }}
      >
        <Result
          icon={<ToolOutlined style={{ color: '#faad14', fontSize: 64 }} />}
          title={
            <Space direction="vertical" size="small">
              <span style={{ fontSize: 22, fontWeight: 600 }}>{title}</span>
              <Space>
                <Tag
                  color="orange"
                  style={{ fontSize: 13, padding: '2px 8px' }}
                >
                  Under Active Development
                </Tag>
                <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
                  {phase}
                </Tag>
              </Space>
            </Space>
          }
          subTitle={
            <div style={{ marginTop: 16 }}>
              <Paragraph
                type="secondary"
                style={{ fontSize: 15, maxWidth: 500, margin: '0 auto 16px' }}
              >
                {description}
              </Paragraph>
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                <Text style={{ fontSize: 13 }}>
                  Role authorization verified. Navigation shell and security
                  guards active.
                </Text>
              </div>
            </div>
          }
          extra={[
            <Button
              type="primary"
              key="dashboard"
              icon={<DashboardOutlined />}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>,
          ]}
        />
      </Card>
    </div>
  );
};
