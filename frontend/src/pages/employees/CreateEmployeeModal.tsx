import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Alert,
  Divider,
  Typography,
  message,
  Space,
  Tag,
  Tooltip,
  Button,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../../api/employee';
import { recruitmentApi } from '../../api/recruitment';
import { departmentApi, positionApi } from '../../api/organization';
import { normalizeApiError } from '../../api/client';
import { EmploymentType } from '../../types/employee';

const { Text } = Typography;

interface CreateEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [generatingId, setGeneratingId] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAndSetEmployeeId = async (force: boolean = false) => {
    if (!force && form.getFieldValue('employeeId')) return;

    try {
      setGeneratingId(true);
      const generated = await employeeApi.generateId();
      form.setFieldsValue({ employeeId: generated });
    } catch {
      const fallback = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
      form.setFieldsValue({ employeeId: fallback });
    } finally {
      setGeneratingId(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAndSetEmployeeId();
    }
  }, [open]);

  // Fetch applications with status APPROVED
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['approved-applications-select'],
    queryFn: () => recruitmentApi.listApplications({ status: 'APPROVED' }),
    enabled: open,
  });

  // Fetch departments
  const { data: deptData, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentApi.list({ limit: 100 }),
    enabled: open,
  });

  // Fetch positions
  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['positions-select'],
    queryFn: () => positionApi.list({ limit: 100 }),
    enabled: open,
  });

  const approvedApplications = appsData?.applications || [];

  const handleApplicationChange = (appId: number) => {
    const selectedApp = approvedApplications.find((a) => a.id === appId);
    if (!selectedApp) return;

    const cand = selectedApp.candidate;
    const req = selectedApp.jobPosting?.requisition?.workforceRequest;

    form.setFieldsValue({
      firstName: cand?.firstName || '',
      lastName: cand?.lastName || '',
      email: cand?.email || '',
      phone: cand?.phone || '',
      departmentId: req?.departmentId,
      positionId: req?.positionId,
    });
  };

  const handleClose = () => {
    form.resetFields();
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setErrorMessage(null);

      await employeeApi.create({
        applicationId: values.applicationId,
        employeeId: values.employeeId?.trim() || undefined,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone?.trim() || undefined,
        gender: values.gender || undefined,
        dateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.toISOString()
          : undefined,
        departmentId: values.departmentId,
        positionId: values.positionId,
        employmentType: values.employmentType as EmploymentType,
        hireDate: values.hireDate ? values.hireDate.toISOString() : undefined,
        baseSalary: values.baseSalary ? Number(values.baseSalary) : undefined,
      });

      message.success('Draft employee created and placed into onboarding');
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const normalized = normalizeApiError(err);
      setErrorMessage(normalized.message || 'Failed to create employee profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Onboard New Employee"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Create Employee Profile"
      width={720}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Initiate employee profile from a Head of HR approved candidate application.
        </Text>
      </div>

      {approvedApplications.length === 0 && !appsLoading && (
        <Alert
          type="info"
          message="No Approved Candidate Applications"
          description="According to organization policy, draft employees can only be created from candidates whose applications have been approved by the Head of HR in the Recruitment module."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {errorMessage && (
        <Alert
          type="error"
          message="Creation Failed"
          description={errorMessage}
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      <Form form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="applicationId"
              label="Approved Candidate Application"
              rules={[{ required: true, message: 'Please select an approved application' }]}
            >
              <Select
                placeholder="Select approved candidate"
                loading={appsLoading}
                onChange={handleApplicationChange}
                options={approvedApplications.map((app) => ({
                  value: app.id,
                  label: `${app.candidate?.firstName} ${app.candidate?.lastName} - ${app.jobPosting?.title || 'Position'} (App #${app.id})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="employeeId"
              label={
                <Space size={6}>
                  <span>Employee ID (Unique Code)</span>
                  <Tag color="blue">Auto-Generated</Tag>
                </Space>
              }
              rules={[
                { required: true, message: 'Please enter or generate a unique employee ID' },
                { pattern: /^[A-Za-z0-9_-]+$/, message: 'Alphanumeric and hyphen/underscore only' },
              ]}
              extra="Auto-generated with unique number. You can customize or regenerate."
            >
              <Input
                placeholder="e.g. EMP-1001"
                suffix={
                  <Tooltip title="Regenerate unique ID">
                    <Button
                      type="link"
                      size="small"
                      icon={<ReloadOutlined spin={generatingId} />}
                      onClick={() => fetchAndSetEmployeeId(true)}
                      style={{ padding: 0, height: 'auto', fontSize: 12 }}
                    >
                      Regenerate
                    </Button>
                  </Tooltip>
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 16px' }}>Personal Information</Divider>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'Please enter first name' }]}
            >
              <Input placeholder="First Name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter last name' }]}
            >
              <Input placeholder="Last Name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Work Email Address"
              rules={[
                { required: true, message: 'Please enter work email' },
                {
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address',
                },
              ]}
            >
              <Input placeholder="e.g. employee@hr.local" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Contact Phone Number">
              <Input placeholder="e.g. +1 555-0199" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="dateOfBirth" label="Date of Birth">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="gender" label="Gender">
              <Select
                placeholder="Select gender"
                options={[
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'OTHER', label: 'Other / Non-Binary' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 16px' }}>Placement & Compensation</Divider>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="departmentId"
              label="Department"
              rules={[{ required: true, message: 'Please select department' }]}
            >
              <Select
                placeholder="Select department"
                loading={deptsLoading}
                options={(deptData?.departments || []).map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.code})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="positionId"
              label="Position Title"
              rules={[{ required: true, message: 'Please select position' }]}
            >
              <Select
                placeholder="Select position"
                loading={posLoading}
                options={(posData?.positions || []).map((p) => ({
                  value: p.id,
                  label: `${p.title} (${p.code})`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="employmentType"
              label="Employment Type"
              initialValue="FULL_TIME"
              rules={[{ required: true, message: 'Please select employment type' }]}
            >
              <Select
                options={[
                  { value: 'FULL_TIME', label: 'Full Time' },
                  { value: 'PART_TIME', label: 'Part Time' },
                  { value: 'CONTRACT', label: 'Contract' },
                  { value: 'INTERNSHIP', label: 'Internship' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="hireDate" label="Official Hire / Start Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="baseSalary" label="Initial Base Salary ($ USD)">
              <InputNumber<number>
                style={{ width: '100%' }}
                placeholder="e.g. 75000"
                min={0}
                formatter={(val) => `$ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
