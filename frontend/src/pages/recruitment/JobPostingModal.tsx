import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Alert,
  Typography,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { recruitmentApi } from '../../api/recruitment';
import { JobPosting, CreateJobPostingInput, UpdateJobPostingInput } from '../../types/recruitment';
import { normalizeApiError } from '../../api/client';

const { TextArea } = Input;
const { Text } = Typography;

interface JobPostingModalProps {
  open: boolean;
  onClose: () => void;
  postingToEdit?: JobPosting | null;
  onSuccess?: () => void;
}

export const JobPostingModal: React.FC<JobPostingModalProps> = ({
  open,
  onClose,
  postingToEdit,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEdit = !!postingToEdit;

  // In create mode: fetch approved requisitions without a job posting
  const { data: reqData, isLoading: isLoadingReqs } = useQuery({
    queryKey: ['approved-requisitions-for-posting'],
    queryFn: () => recruitmentApi.listRequisitions({ status: 'APPROVED', limit: 100 }),
    enabled: open && !isEdit,
  });

  const availableRequisitions =
    reqData?.requisitions.filter((r) => !r.jobPosting) || [];

  const createMutation = useMutation({
    mutationFn: (values: CreateJobPostingInput) =>
      recruitmentApi.createJobPosting(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-postings'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-requisitions'] });
      form.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJobPostingInput }) =>
      recruitmentApi.updateJobPosting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-postings'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-requisitions'] });
      form.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      if (postingToEdit) {
        form.setFieldsValue({
          title: postingToEdit.title,
          employmentType: postingToEdit.employmentType,
          location: postingToEdit.location,
          openingDate: dayjs(postingToEdit.openingDate),
          closingDate: postingToEdit.closingDate ? dayjs(postingToEdit.closingDate) : null,
          description: postingToEdit.description,
          requirements: postingToEdit.requirements,
          status: postingToEdit.status,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          employmentType: 'FULL_TIME',
          openingDate: dayjs(),
        });
      }
    }
  }, [open, postingToEdit, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        openingDate: values.openingDate ? values.openingDate.toISOString() : undefined,
        closingDate: values.closingDate ? values.closingDate.toISOString() : null,
      };

      if (isEdit && postingToEdit) {
        updateMutation.mutate({ id: postingToEdit.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch {
      // Handled by AntD form validation rules
    }
  };

  const activeMutation = isEdit ? updateMutation : createMutation;
  const errorDetails = activeMutation.error
    ? normalizeApiError(activeMutation.error)
    : null;

  return (
    <Modal
      title={isEdit ? `Edit Job Posting: ${postingToEdit.title}` : 'Create New Job Posting'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={activeMutation.isPending}
      okText={isEdit ? 'Save Changes' : 'Create Job Posting'}
      destroyOnClose
      width={680}
    >
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <Text type="secondary">
          {isEdit
            ? 'Update the parameters, vacancy details, or status for this job posting.'
            : 'Configure public-facing job posting details linked to an approved job requisition.'}
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

      {!isEdit && availableRequisitions.length === 0 && !isLoadingReqs && (
        <Alert
          type="warning"
          showIcon
          message="No Approved Requisitions Available"
          description="Job postings must be linked to an APPROVED job requisition. Please create and approve a requisition first."
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        {!isEdit && (
          <Form.Item
            name="requisitionId"
            label="Approved Job Requisition"
            rules={[{ required: true, message: 'Please select an approved requisition' }]}
          >
            <Select
              placeholder="Select approved job requisition..."
              loading={isLoadingReqs}
              disabled={availableRequisitions.length === 0}
              showSearch
              optionFilterProp="label"
              options={availableRequisitions.map((r) => ({
                value: r.id,
                label: `Req #${r.id} - ${r.workforceRequest?.position?.title || 'Position'} (${r.workforceRequest?.department?.name || 'Dept'}) - Headcount: ${r.workforceRequest?.headcount || 1}`,
              }))}
            />
          </Form.Item>
        )}

        <Form.Item
          name="title"
          label="Job Title"
          rules={[
            { required: true, message: 'Job title is required' },
            { max: 100, message: 'Title must not exceed 100 characters' },
          ]}
        >
          <Input placeholder="e.g. Senior Backend Engineer" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="employmentType"
            label="Employment Type"
            rules={[{ required: true, message: 'Employment type is required' }]}
          >
            <Select
              options={[
                { label: 'Full Time', value: 'FULL_TIME' },
                { label: 'Part Time', value: 'PART_TIME' },
                { label: 'Contract', value: 'CONTRACT' },
                { label: 'Internship', value: 'INTERNSHIP' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="location"
            label="Work Location"
            rules={[{ required: true, message: 'Location is required' }]}
          >
            <Input placeholder="e.g. Remote / New York HQ" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="openingDate"
            label="Opening Date"
            rules={[{ required: true, message: 'Opening date is required' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="closingDate"
            label="Closing Date (Optional)"
            dependencies={['openingDate']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const openDate = getFieldValue('openingDate');
                  if (!value || !openDate) return Promise.resolve();
                  if (value.isBefore(openDate, 'day')) {
                    return Promise.reject(new Error('Closing date cannot precede opening date'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} allowClear />
          </Form.Item>
        </div>

        {isEdit && (
          <Form.Item
            name="status"
            label="Posting Status"
            rules={[{ required: true, message: 'Status is required' }]}
          >
            <Select
              options={[
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Published (Active Applications Accepted)', value: 'PUBLISHED' },
                { label: 'Closed', value: 'CLOSED' },
              ]}
            />
          </Form.Item>
        )}

        <Form.Item
          name="description"
          label="Job Description"
          rules={[{ required: true, message: 'Description is required' }]}
        >
          <TextArea rows={4} placeholder="Summary of the role, responsibilities, and team structure..." />
        </Form.Item>

        <Form.Item
          name="requirements"
          label="Candidate Qualifications & Requirements"
          rules={[{ required: true, message: 'Requirements are required' }]}
        >
          <TextArea rows={4} placeholder="Required skills, years of experience, certifications..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
