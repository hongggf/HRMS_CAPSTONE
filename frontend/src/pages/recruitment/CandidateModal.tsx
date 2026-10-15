import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Alert, Typography } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentApi } from '../../api/recruitment';
import { CreateCandidateInput } from '../../types/recruitment';
import { normalizeApiError } from '../../api/client';

const { Text } = Typography;

interface CandidateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: CreateCandidateInput) =>
      recruitmentApi.createCandidate(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-candidates'] });
      form.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate(values);
    } catch {
      // Form validation errors handled by Ant Design Form
    }
  };

  const errorDetails = createMutation.error
    ? normalizeApiError(createMutation.error)
    : null;

  return (
    <Modal
      title="Create Candidate Profile"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending}
      okText="Create Profile"
      destroyOnClose
      width={560}
    >
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <Text type="secondary">
          Enter candidate information into the talent database. Sensitive contact details are protected under RBAC policy.
        </Text>
      </div>

      {errorDetails && (
        <Alert
          type="error"
          showIcon
          message={errorDetails.message}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: 'First name is required' }]}
          >
            <Input placeholder="e.g. Jane" />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: 'Last name is required' }]}
          >
            <Input placeholder="e.g. Doe" />
          </Form.Item>
        </div>

        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Email address is required' },
            { type: 'email', message: 'Please enter a valid email format' },
          ]}
        >
          <Input placeholder="e.g. jane.doe@example.com" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone Number (Optional)"
          rules={[
            {
              pattern: /^[+0-9\s\-().]{7,25}$/,
              message: 'Please enter a valid phone number',
            },
          ]}
        >
          <Input placeholder="e.g. +1 555-019-2831" />
        </Form.Item>

        <Form.Item
          name="resumeUrl"
          label="Resume Link (URL, Optional)"
          rules={[{ type: 'url', message: 'Please enter a valid URL (e.g. https://...)' }]}
        >
          <Input placeholder="https://storage.example.com/resumes/jane_doe.pdf" />
        </Form.Item>

        <Form.Item name="source" label="Recruitment Sourcing Channel">
          <Select
            placeholder="Select source channel..."
            allowClear
            options={[
              { label: 'LinkedIn', value: 'LinkedIn' },
              { label: 'Referral', value: 'Employee Referral' },
              { label: 'Company Careers Site', value: 'Careers Site' },
              { label: 'Direct Sourcing', value: 'Direct Sourcing' },
              { label: 'Job Board (Indeed / Glassdoor)', value: 'Job Board' },
              { label: 'Campus / Career Fair', value: 'Campus' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
