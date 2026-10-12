import React from 'react';
import { Result, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export const Forbidden403: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleReturn = () => {
    if (Array.isArray(user?.roles) && user.roles.includes('HEAD_OF_HR')) {
      navigate('/dashboard');
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
      }}
    >
      <Result
        status="403"
        title="403 Forbidden"
        subTitle="Sorry, you are not authorized to access this module."
        extra={
          <Space>
            <Button type="primary" onClick={handleReturn}>
              Return to Previous View
            </Button>
            <Button onClick={() => logout()}>Sign Out</Button>
          </Space>
        }
      />
    </div>
  );
};
