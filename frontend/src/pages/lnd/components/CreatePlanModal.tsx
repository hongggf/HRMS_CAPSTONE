import React from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
} from 'antd';
import { CreateTrainingPlanInput, Training } from '../../../types/lnd';
import { normalizeApiError } from '../../../api/client';

interface CreatePlanModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTrainingPlanInput) => Promise<void>;
  trainings: Training[];
  loading?: boolean;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  trainings,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        trainingId: values.trainingId,
        identifiedNeed: values.identifiedNeed,
        objective: values.objective,
        targetEmployees: values.targetEmployees,
        priority: values.priority,
        budget: values.budget,
        plannedDate: values.plannedDate
          ? values.plannedDate.toISOString()
          : undefined,
      });
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      const norm = normalizeApiError(err);
      message.error(norm.message);
    }
  };

  return (
    <Modal
      title="Create Annual Training Plan"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ priority: 'HIGH' }}>
        <Form.Item
          name="trainingId"
          label="Training Program"
          rules={[
            { required: true, message: 'Please select training program' },
          ]}
        >
          <Select placeholder="Select Course">
            {trainings.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.title} ({t.type})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="identifiedNeed"
          label="Identified Training Need / Skill Gap"
          rules={[
            {
              required: true,
              message: 'Please describe the identified training need',
            },
          ]}
        >
          <Input placeholder="e.g. Modernization of microservices and observability gaps" />
        </Form.Item>

        <Form.Item
          name="objective"
          label="Business Objective & Target Outcome"
          rules={[
            {
              required: true,
              message: 'Please specify learning and business objective',
            },
          ]}
        >
          <Input placeholder="e.g. Reduce mean time to recovery (MTTR) by 40%" />
        </Form.Item>

        <Form.Item name="targetEmployees" label="Target Cohort / Department">
          <Input placeholder="e.g. Core Engineering, Mid-level to Senior Backend Devs" />
        </Form.Item>

        <Form.Item name="priority" label="Priority Level">
          <Select>
            <Select.Option value="CRITICAL">Critical</Select.Option>
            <Select.Option value="HIGH">High</Select.Option>
            <Select.Option value="MEDIUM">Medium</Select.Option>
            <Select.Option value="LOW">Low</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="budget" label="Allocated Budget ($)">
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            prefix="$"
            placeholder="e.g. 5000"
          />
        </Form.Item>

        <Form.Item name="plannedDate" label="Target Rollout Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
