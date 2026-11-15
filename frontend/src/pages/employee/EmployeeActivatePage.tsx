import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Alert,
  Typography,
  Space,
  Spin,
  Result,
  Descriptions,
  Divider,
} from 'antd';
import {
  LockOutlined,
  CheckCircleOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text, Paragraph } = Typography;

interface VerifiedData {
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department?: string;
  position?: string;
  expiresAt: string;
}

export const EmployeeActivatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const [token, setToken] = useState<string>(tokenParam);
  const [manualToken, setManualToken] = useState<string>('');

  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifiedData, setVerifiedData] = useState<VerifiedData | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activatedSuccess, setActivatedSuccess] = useState<boolean>(false);

  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  const handleVerify = async (tok: string) => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const data = await authApi.verifyInvitation(tok);
      setVerifiedData(data);
    } catch (err: unknown) {
      const normalized = normalizeApiError(err);
      setVerifyError(normalized.message || 'Invitation token is invalid or has expired.');
      setVerifiedData(null);
    } finally {
      setVerifying(false);
    }
  };

  const onFinish = async (values: { password: string }) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const authData = await authApi.acceptInvitation(token, values.password);
      setActivatedSuccess(true);
      login(authData.user, authData.accessToken, authData.refreshToken);
      setTimeout(() => {
        navigate('/employee/dashboard', { replace: true });
      }, 2000);
    } catch (err: unknown) {
      const normalized = normalizeApiError(err);
      setSubmitError(normalized.message || 'Failed to activate account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (activatedSuccess) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0b1e36 0%, #001529 100%)',
          padding: 16,
        }}
      >
        <Card style={{ maxWidth: 480, width: '100%', borderRadius: 12, textAlign: 'center' }}>
          <Result
            status="success"
            title="Account Successfully Activated!"
            subTitle="Your password has been securely set. Redirecting you to your Employee Portal dashboard..."
            extra={[
              <Button
                type="primary"
                key="dashboard"
                onClick={() => navigate('/employee/dashboard', { replace: true })}
              >
                Go to Dashboard Now
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b1e36 0%, #001529 100%)',
        padding: 16,
      }}
    >
      <Card
        style={{
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Space direction="vertical" align="center" size="small">
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#52c41a',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                fontSize: 24,
                boxShadow: '0 4px 12px rgba(82, 196, 26, 0.4)',
              }}
            >
              <KeyOutlined />
            </div>
            <Title level={3} style={{ margin: '8px 0 0 0', fontWeight: 600 }}>
              Activate Employee Account
            </Title>
            <Text type="secondary">
              Set up your secure password to complete account activation
            </Text>
          </Space>
        </div>

        {verifying && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16, color: '#8c8c8c' }}>
              Validating invitation token securely...
            </Paragraph>
          </div>
        )}

        {!token && !verifying && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Alert
              message="Invitation Token Required"
              description="Please click the activation link from your invitation email, or paste your token below."
              type="info"
              showIcon
              style={{ marginBottom: 20, textAlign: 'left' }}
            />
            <Input
              placeholder="Paste invitation token here..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value.trim())}
              style={{ marginBottom: 12 }}
            />
            <Button
              type="primary"
              block
              disabled={!manualToken}
              onClick={() => {
                setToken(manualToken);
              }}
            >
              Verify Token
            </Button>
            <Divider style={{ margin: '16px 0' }} />
            <Link to="/employee/login" style={{ fontSize: 13, color: '#1677ff' }}>
              Already activated? Go to Employee Login &rarr;
            </Link>
          </div>
        )}

        {verifyError && !verifying && (
          <div>
            <Alert
              message="Invalid or Expired Invitation"
              description={verifyError}
              type="error"
              showIcon
              style={{ marginBottom: 20 }}
            />
            <Paragraph style={{ fontSize: 13, color: '#595959' }}>
              Activation tokens are single-use and time-limited to 24 hours. If your link expired,
              please contact your HR Administrator to re-send an invitation.
            </Paragraph>
            <Button block onClick={() => { setToken(''); setVerifyError(null); }}>
              Try Another Token
            </Button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/employee/login" style={{ fontSize: 13, color: '#1677ff' }}>
                Back to Employee Login
              </Link>
            </div>
          </div>
        )}

        {verifiedData && !verifying && (
          <div>
            <Alert
              message={`Welcome, ${verifiedData.firstName} ${verifiedData.lastName}!`}
              description="Your Employee Self-Service profile has been verified. Please create your personal password below."
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: 20 }}
            />

            <Descriptions
              size="small"
              bordered
              column={1}
              style={{ marginBottom: 24, background: '#fafafa', borderRadius: 6 }}
            >
              <Descriptions.Item label="Employee ID">
                <Text strong code>{verifiedData.employeeId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Work Email">
                <Text>{verifiedData.email}</Text>
              </Descriptions.Item>
              {verifiedData.department && (
                <Descriptions.Item label="Department">
                  {verifiedData.department}
                </Descriptions.Item>
              )}
              {verifiedData.position && (
                <Descriptions.Item label="Position">
                  {verifiedData.position}
                </Descriptions.Item>
              )}
            </Descriptions>

            {submitError && (
              <Alert
                message="Activation Failed"
                description={submitError}
                type="error"
                showIcon
                closable
                onClose={() => setSubmitError(null)}
                style={{ marginBottom: 16 }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                name="password"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter a password' },
                  {
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                    message:
                      'Must be at least 8 characters, containing uppercase, lowercase, number, and special character.',
                  },
                ]}
                hasFeedback
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Min 8 chars with uppercase, number & symbol"
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={['password']}
                hasFeedback
                rules={[
                  { required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('The two passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 24, marginBottom: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={submitting}
                  style={{
                    height: 44,
                    fontWeight: 600,
                    background: '#52c41a',
                    borderColor: '#52c41a',
                  }}
                >
                  Activate Account & Sign In
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Card>
    </div>
  );
};
