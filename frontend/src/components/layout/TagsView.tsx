import React from 'react';
import { Tabs, Dropdown, MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabStore } from '../../store/useTabStore';
import { CloseOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';

export const TagsView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tabs, removeTab, closeOthers, closeAll, setActiveKey } =
    useTabStore();

  const handleTabChange = (key: string) => {
    setActiveKey(key);
    navigate(key);
  };

  const handleEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      const nextKey = removeTab(targetKey);
      if (nextKey) {
        navigate(nextKey);
      }
    }
  };

  const getContextMenuItems = (tabKey: string): MenuProps['items'] => [
    {
      key: 'reload',
      icon: <ReloadOutlined />,
      label: 'Reload Page',
      onClick: () => {
        navigate(tabKey);
      },
    },
    {
      key: 'close-others',
      icon: <CloseOutlined />,
      label: 'Close Others',
      onClick: () => {
        closeOthers(tabKey);
        navigate(tabKey);
      },
    },
    {
      key: 'close-all',
      icon: <StopOutlined />,
      label: 'Close All',
      onClick: () => {
        const next = closeAll();
        navigate(next);
      },
    },
  ];

  return (
    <div
      style={{
        padding: '6px 16px 0',
        background: 'var(--ant-color-bg-container)',
        borderBottom: '1px solid var(--ant-color-border-secondary)',
      }}
    >
      <Tabs
        type="editable-card"
        hideAdd
        size="small"
        activeKey={location.pathname}
        onChange={handleTabChange}
        onEdit={handleEdit}
        tabBarStyle={{ margin: 0 }}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <Dropdown
              menu={{ items: getContextMenuItems(tab.key) }}
              trigger={['contextMenu']}
            >
              <span>{tab.label}</span>
            </Dropdown>
          ),
          closable: tab.closable,
        }))}
      />
    </div>
  );
};
