import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Alert,
  Typography,
  Space,
} from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentApi } from '../../api/recruitment';
import { Interview, SubmitEvaluationInput } from '../../types/recruitment';
import { normalizeApiError } from '../../api/client';

const { TextArea } = Input;
const { Text } = Typography;

interface InterviewEvaluationModalProps {
  open: boolean;
  onClose: () => void;
  interview: Interview | null;
  onSuccess?: () => void;
}

export const InterviewEvaluationModal: React.FC<InterviewEvaluationModalProps> = ({
  open,
  onClose,
  interview,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const evalMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubmitEvaluationInput }) =>
      recruitmentApi.submitInterviewEvaluation(id, data),
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
        score: 80,
        recommendation: 'Hire',
      });
    }
  }, [open, form]);

  if (!interview) return null;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      evalMutation.mutate({
        id: interview.id,
        data: values,
      });
    } catch {
      // Handled by Form
    }
  };

  const errorDetails = evalMutation.error
    ? normalizeApiError(evalMutation.error)
    : null;

  return (
    <Modal
      title="Submit Interview Evaluation"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={evalMutation.isPending}
      okText="Submit Evaluation"
      destroyOnClose
      width={580}
    >
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Candidate: </Text>
            <Text strong>
              {interview.application?.candidate?.firstName}{' '}
              {interview.application?.candidate?.lastName}
            </Text>
          </div>
          <div>
            <Text type="secondary">Job Position: </Text>
            <Text>{interview.application?.jobPosting?.title}</Text>
          </div>
          <div>
            <Text type="secondary">Session: </Text>
            <Text>
              {interview.type} Interview on{' '}
              {new Date(interview.scheduledAt).toLocaleString()}
            </Text>
          </div>
        </Space>
      </div>

      {errorDetails && (
        <Alert
          type="error"
          showIcon
          message="Evaluation Error"
          description={errorDetails.message}
          style={{ marginBottom: 16 }}
        />
      )}

      {interview.evaluation && (
        <Alert
          type="warning"
          showIcon
          message="Evaluation Already Submitted"
          description="An evaluation has already been recorded for this interview session. Further submissions are locked."
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" disabled={!!interview.evaluation}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="score"
            label="Evaluation Score (0 - 100)"
            rules={[
              { required: true, message: 'Score is required' },
              {
                type: 'number',
                min: 0,
                max: 100,
                message: 'Score must be between 0 and 100',
              },
            ]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="recommendation"
            label="Hiring Recommendation"
            rules={[{ required: true, message: 'Recommendation is required' }]}
          >
            <Select
              options={[
                { label: 'Strong Hire', value: 'Strong Hire' },
                { label: 'Hire', value: 'Hire' },
                { label: 'Neutral / Borderline', value: 'Neutral' },
                { label: 'Do Not Hire', value: 'Do Not Hire' },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="strengths"
          label="Demonstrated Strengths"
          rules={[{ required: true, message: 'Strengths are required' }]}
        >
          <TextArea
            rows={3}
            placeholder="Key technical capabilities, communication skills, domain knowledge..."
          />
        </Form.Item>

        <Form.Item
          name="weaknesses"
          label="Identified Weaknesses or Gaps"
          rules={[{ required: true, message: 'Weaknesses are required' }]}
        >
          <TextArea
            rows={3}
            placeholder="Areas for improvement, missing qualifications, risk factors..."
          />
        </Form.Item>

        <Form.Item name="comments" label="Additional Interviewer Notes (Optional)">
          <TextArea
            rows={2}
            placeholder="General feedback, salary expectations discussed, availability..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
