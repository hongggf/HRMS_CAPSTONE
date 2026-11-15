import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography, Space, Divider } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

export const EmployeeLoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, isAuthenticated, accessToken, isInitializing, user } = useAuthStore();

  React.useEffect(() => {
    if (isAuthenticated && accessToken && !isInitializing) {
      if (user?.roles?.includes('EMPLOYEE')) {
        navigate('/employee/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, accessToken, isInitializing, user, navigate]);

  const onFinish = async (values: { email: string; password: string }) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const email = values.email.trim().toLowerCase();
      const data = await authApi.login(email, values.password);
      login(data.user, data.accessToken, data.refreshToken);

      if (data.user.roles.includes('EMPLOYEE')) {
        navigate('/employee/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const normalized = normalizeApiError(err);
      setErrorMessage(normalized.message);

      if (normalized.details && normalized.details.length > 0) {
        form.setFields(
          normalized.details
            .filter((d): d is { field: string; message: string } => Boolean(d.field))
            .map((d) => ({
              name: d.field,
              errors: [d.message],
            }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        background: 'linear-gradient(135deg, #0b1e36 0%, #001529 100%)',
        padding: 16,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Space direction="vertical" align="center" size="small">
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#1677ff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                fontSize: 24,
                boxShadow: '0 4px 12px rgba(22, 119, 255, 0.4)',
              }}
            >
              <IdcardOutlined />
            </div>
            <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 600 }}>
              Employee Portal
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Self-Service Access & Identity
            </Text>
          </Space>
        </div>

        {errorMessage && (
          <Alert
            message="Sign-in Failed"
            description={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage(null)}
            style={{ marginBottom: 20 }}
          />
        )}

        <Form
          form={form}
          name="employee_login"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your work email' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="name@company.com"
              autoComplete="email"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 44,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)',
              }}
            >
              Sign In to Employee Portal
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/employee/activate" style={{ fontSize: 13, color: '#1677ff' }}>
              Have an invitation? Activate your account &rarr;
            </Link>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ fontSize: 12, color: '#8c8c8c' }}>
              Are you an HR administrator? Switch to HR Staff Login
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};
