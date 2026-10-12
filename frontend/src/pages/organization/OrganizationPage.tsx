import React, { useState } from 'react';
import { Tabs, Typography, Tag, Space } from 'antd';
import { ApartmentOutlined, SolutionOutlined } from '@ant-design/icons';
import { DepartmentTab } from './DepartmentTab';
import { PositionTab } from './PositionTab';

const { Title, Text } = Typography;

export const OrganizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('departments');

  const tabItems = [
    {
      key: 'departments',
      label: (
        <Space>
          <ApartmentOutlined />
          <span>Departments</span>
        </Space>
      ),
      children: <DepartmentTab />,
    },
    {
      key: 'positions',
      label: (
        <Space>
          <SolutionOutlined />
          <span>Positions</span>
        </Space>
      ),
      children: <PositionTab />,
    },
  ];

  return (
    <div>
      {/* Header section */}
      <div style={{ marginBottom: 20 }}>
        <Space align="center" wrap>
          <Title level={4} style={{ margin: 0 }}>
            Organization & Workforce Structure
          </Title>
          <Tag color="blue">Phase 3</Tag>
        </Space>
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage departmental units, corporate hierarchy, and standard
            position roles
          </Text>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};
