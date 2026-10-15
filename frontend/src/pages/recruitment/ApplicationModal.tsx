import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Radio,
  Alert,
  Typography,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentApi } from '../../api/recruitment';
import { CreateApplicationInput } from '../../types/recruitment';
import { normalizeApiError } from '../../api/client';

const { Text } = Typography;

interface ApplicationModalProps {
  open: boolean;
  onClose: () => void;
  preselectedPostingId?: number | null;
  onSuccess?: () => void;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  open,
  onClose,
  preselectedPostingId,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [candidateMode, setCandidateMode] = useState<'existing' | 'new'>('existing');

  // Fetch published job postings
  const { data: postingData, isLoading: isLoadingPostings } = useQuery({
    queryKey: ['published-job-postings'],
    queryFn: () => recruitmentApi.listJobPostings({ status: 'PUBLISHED', limit: 100 }),
    enabled: open,
  });

  // Fetch existing candidates
  const { data: candData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['candidates-for-application-select'],
    queryFn: () => recruitmentApi.listCandidates({ limit: 100 }),
    enabled: open && candidateMode === 'existing',
  });

  const publishedPostings = postingData?.postings || [];
  const existingCandidates = candData?.candidates || [];

  const createMutation = useMutation({
    mutationFn: (values: CreateApplicationInput) =>
      recruitmentApi.createApplication(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-applications'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-postings'] });
      form.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      form.resetFields();
      setCandidateMode('existing');
      if (preselectedPostingId) {
        form.setFieldValue('jobPostingId', preselectedPostingId);
      }
    }
  }, [open, preselectedPostingId, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateApplicationInput = {
        jobPostingId: values.jobPostingId,
      };

      if (candidateMode === 'existing') {
        payload.candidateId = values.candidateId;
      } else {
        payload.firstName = values.firstName;
        payload.lastName = values.lastName;
        payload.email = values.email;
        payload.phone = values.phone;
        payload.resumeUrl = values.resumeUrl;
        payload.source = values.source;
      }

      createMutation.mutate(payload);
    } catch {
      // Handled by Form validation
    }
  };

  const errorDetails = createMutation.error
    ? normalizeApiError(createMutation.error)
    : null;

  return (
    <Modal
      title="Submit Candidate Application"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending}
      okText="Submit Application"
      destroyOnClose
      width={600}
    >
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <Text type="secondary">
          Associate a candidate profile with an active, published job vacancy. Applications start in the APPLIED status.
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

      {publishedPostings.length === 0 && !isLoadingPostings && (
        <Alert
          type="warning"
          showIcon
          message="No Published Job Postings"
          description="Applications can only be submitted to PUBLISHED job postings. Please publish a posting first."
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="jobPostingId"
          label="Target Job Posting"
          rules={[{ required: true, message: 'Please select an active job posting' }]}
        >
          <Select
            placeholder="Select published job posting..."
            loading={isLoadingPostings}
            disabled={publishedPostings.length === 0}
            showSearch
            optionFilterProp="label"
            options={publishedPostings.map((p) => ({
              value: p.id,
              label: `${p.title} (${p.location}) - ${p.employmentType}`,
            }))}
          />
        </Form.Item>

        <Form.Item label="Candidate Selection Mode">
          <Radio.Group
            value={candidateMode}
            onChange={(e) => setCandidateMode(e.target.value)}
          >
            <Radio.Button value="existing">Existing Candidate Profile</Radio.Button>
            <Radio.Button value="new">Create & Apply New Candidate</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {candidateMode === 'existing' ? (
          <Form.Item
            name="candidateId"
            label="Candidate Profile"
            rules={[{ required: true, message: 'Please select a candidate profile' }]}
          >
            <Select
              placeholder="Search candidate by name or email..."
              loading={isLoadingCandidates}
              showSearch
              optionFilterProp="label"
              options={existingCandidates.map((c) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName} (${c.email})`,
              }))}
            />
          </Form.Item>
        ) : (
          <div style={{ background: 'rgba(0,0,0,0.02)', padding: 16, borderRadius: 6 }}>
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
                { type: 'email', message: 'Valid email required' },
              ]}
            >
              <Input placeholder="e.g. jane.doe@example.com" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[
                {
                  pattern: /^[+0-9\s\-().]{7,25}$/,
                  message: 'Valid phone format required',
                },
              ]}
            >
              <Input placeholder="+1 555-019-2831" />
            </Form.Item>

            <Form.Item
              name="resumeUrl"
              label="Resume URL"
              rules={[{ type: 'url', message: 'Valid URL required' }]}
            >
              <Input placeholder="https://storage.example.com/resumes/jane_doe.pdf" />
            </Form.Item>

            <Form.Item name="source" label="Sourcing Channel">
              <Select
                placeholder="Select source channel..."
                allowClear
                options={[
                  { label: 'LinkedIn', value: 'LinkedIn' },
                  { label: 'Employee Referral', value: 'Referral' },
                  { label: 'Careers Site', value: 'Careers Site' },
                  { label: 'Direct Sourcing', value: 'Direct Sourcing' },
                  { label: 'Job Board', value: 'Job Board' },
                ]}
              />
            </Form.Item>
          </div>
        )}
      </Form>
    </Modal>
  );
};
