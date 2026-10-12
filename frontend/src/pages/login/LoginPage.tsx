import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography, Space } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

interface LocationState {
  from?: {
    pathname: string;
  };
}

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, accessToken, isInitializing } =
    useAuthStore();

  const state = location.state as LocationState | null;
  const from = state?.from?.pathname || '/dashboard';

  // Prevent redirect loops and redirect only if genuinely authenticated with active accessToken
  React.useEffect(() => {
    if (isAuthenticated && accessToken && !isInitializing) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, accessToken, isInitializing, navigate]);

  const onFinish = async (values: { email: string; password: string }) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await authApi.login(values.email.trim(), values.password);
      login(data.user, data.accessToken, data.refreshToken);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const normalized = normalizeApiError(err);
      setErrorMessage(normalized.message);

      // If backend returned specific field errors, map them to form fields
      if (normalized.details && normalized.details.length > 0) {
        form.setFields(
          normalized.details
            .filter((d): d is { field: string; message: string } =>
              Boolean(d.field),
            )
            .map((d) => ({
              name: d.field,
              errors: [d.message],
            })),
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
        background: 'linear-gradient(135deg, #1f1f1f 0%, #141414 100%)',
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
          <Space orientation="vertical" align="center" size="small">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#1677ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
              }}
            >
              <SafetyCertificateOutlined />
            </div>
            <Title level={3} style={{ margin: 0 }}>
              HRMS Portal
            </Title>
            <Text type="secondary">
              Sign in to your Human Resources account
            </Text>
          </Space>
        </div>

        {errorMessage && (
          <Alert
            type="error"
            message={errorMessage}
            showIcon
            style={{ marginBottom: 20 }}
            closable
            role="alert"
            aria-live="polite"
            onClose={() => setErrorMessage(null)}
          />
        )}

        <Form
          form={form}
          name="loginForm"
          layout="vertical"
          initialValues={{ email: 'head@hr.local', password: 'password123' }}
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter your email address' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              id="email"
              prefix={<UserOutlined style={{ color: '#8c8c8c' }} />}
              placeholder="e.g. head@hr.local"
              size="large"
              autoComplete="email"
              aria-label="Email Address"
              aria-required="true"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password
              id="password"
              prefix={<LockOutlined style={{ color: '#8c8c8c' }} />}
              placeholder="••••••••"
              size="large"
              autoComplete="current-password"
              aria-label="Password"
              aria-required="true"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              disabled={loading}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Demo: <code>head@hr.local</code> / <code>password123</code>{' '}
            (HEAD_OF_HR)
          </Text>
        </div>
      </Card>
    </div>
  );
};
