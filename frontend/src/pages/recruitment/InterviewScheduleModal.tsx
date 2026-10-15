import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Alert,
  Typography,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { recruitmentApi } from '../../api/recruitment';
import { CreateInterviewInput, Application } from '../../types/recruitment';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Text } = Typography;

interface InterviewScheduleModalProps {
  open: boolean;
  onClose: () => void;
  preselectedApplication?: Application | null;
  onSuccess?: () => void;
}

export const InterviewScheduleModal: React.FC<InterviewScheduleModalProps> = ({
  open,
  onClose,
  preselectedApplication,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Fetch applications eligible for interview (SHORTLISTED or INTERVIEW status)
  const { data: appData, isLoading: isLoadingApps } = useQuery({
    queryKey: ['interview-eligible-applications'],
    queryFn: async () => {
      const [shortlisted, inInterview] = await Promise.all([
        recruitmentApi.listApplications({ status: 'SHORTLISTED', limit: 50 }),
        recruitmentApi.listApplications({ status: 'INTERVIEW', limit: 50 }),
      ]);
      return [...shortlisted.applications, ...inInterview.applications];
    },
    enabled: open && !preselectedApplication,
  });

  const availableApplications = preselectedApplication
    ? [preselectedApplication]
    : appData || [];

  const scheduleMutation = useMutation({
    mutationFn: (values: CreateInterviewInput) =>
      recruitmentApi.createInterview(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-applications'] });
      form.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        applicationId: preselectedApplication?.id,
        interviewerId: user?.id,
        type: 'TECHNICAL',
        scheduledAt: dayjs().add(1, 'day').hour(10).minute(0).second(0),
      });
    }
  }, [open, preselectedApplication, user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateInterviewInput = {
        applicationId: values.applicationId,
        interviewerId: values.interviewerId,
        scheduledAt: values.scheduledAt.toISOString(),
        type: values.type,
        location: values.location,
      };
      scheduleMutation.mutate(payload);
    } catch {
      // Handled by Form
    }
  };

  const errorDetails = scheduleMutation.error
    ? normalizeApiError(scheduleMutation.error)
    : null;

  return (
    <Modal
      title="Schedule Interview Session"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={scheduleMutation.isPending}
      okText="Schedule Session"
      destroyOnClose
      width={560}
    >
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <Text type="secondary">
          Coordinate an interview session with a candidate. If the application is in SHORTLISTED status, it will auto-transition to INTERVIEW.
        </Text>
      </div>

      {errorDetails && (
        <Alert
          type="error"
          showIcon
          message="Scheduling Error"
          description={errorDetails.message}
          style={{ marginBottom: 16 }}
        />
      )}

      {availableApplications.length === 0 && !isLoadingApps && !preselectedApplication && (
        <Alert
          type="warning"
          showIcon
          message="No Eligible Candidates for Interview"
          description="Only applications in SHORTLISTED or INTERVIEW status can be scheduled for an interview."
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="applicationId"
          label="Candidate Application"
          rules={[{ required: true, message: 'Please select an application' }]}
        >
          <Select
            placeholder="Select candidate application..."
            loading={isLoadingApps}
            disabled={!!preselectedApplication || availableApplications.length === 0}
            showSearch
            optionFilterProp="label"
            options={availableApplications.map((app) => ({
              value: app.id,
              label: `${app.candidate?.firstName} ${app.candidate?.lastName} - ${app.jobPosting?.title} (${app.status})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="interviewerId"
          label="Lead Interviewer"
          rules={[{ required: true, message: 'Interviewer is required' }]}
        >
          <Select
            options={[
              {
                value: user?.id || 1,
                label: `Current Officer: ${user?.email || 'Logged in user'} (ID #${user?.id})`,
              },
            ]}
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="type"
            label="Interview Type"
            rules={[{ required: true, message: 'Please select interview type' }]}
          >
            <Select
              options={[
                { label: 'HR Screening', value: 'HR' },
                { label: 'Technical Assessment', value: 'TECHNICAL' },
                { label: 'Behavioral / Culture', value: 'BEHAVIORAL' },
                { label: 'Final Executive Interview', value: 'FINAL' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="scheduledAt"
            label="Date & Time"
            rules={[
              { required: true, message: 'Interview date/time is required' },
              () => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  if (value.isBefore(dayjs())) {
                    return Promise.reject(new Error('Interview must be scheduled in the future'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              disabledDate={(current) =>
                current && current.isBefore(dayjs().startOf('day'))
              }
            />
          </Form.Item>
        </div>

        <Form.Item
          name="location"
          label="Location or Meeting URL"
          rules={[{ required: true, message: 'Meeting location or URL is required' }]}
        >
          <Input placeholder="e.g. Google Meet: https://meet.google.com/xyz or Room 402" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
