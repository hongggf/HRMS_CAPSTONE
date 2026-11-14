import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Alert,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { Training, UpdateTrainingInput, TrainingCategory } from '../../../types/lnd';
import { Department } from '../../../types/organization';
import { normalizeApiError } from '../../../api/client';

interface EditTrainingModalProps {
  visible: boolean;
  training: Training | null;
  onCancel: () => void;
  onSubmit: (id: number, values: UpdateTrainingInput) => Promise<void>;
  categories: TrainingCategory[];
  departments?: Department[];
  loading?: boolean;
}

export const EditTrainingModal: React.FC<EditTrainingModalProps> = ({
  visible,
  training,
  onCancel,
  onSubmit,
  categories,
  departments = [],
  loading = false,
}) => {
  const [form] = Form.useForm();
  const isLocked = training?.status === 'COMPLETED' || training?.status === 'CANCELLED';

  useEffect(() => {
    if (training && visible) {
      form.setFieldsValue({
        title: training.title,
        description: training.description || '',
        categoryId: training.categoryId,
        departmentId: training.departmentId || undefined,
        provider: training.provider || '',
        type: training.type,
        capacity: training.capacity || undefined,
        cost: training.cost !== null && training.cost !== undefined ? training.cost : undefined,
        dateRange:
          training.startDate && training.endDate
            ? [dayjs(training.startDate), dayjs(training.endDate)]
            : training.startDate
              ? [dayjs(training.startDate), dayjs(training.startDate)]
              : undefined,
      });
    } else {
      form.resetFields();
    }
  }, [training, visible, form]);

  const handleOk = async () => {
    if (!training) return;
    try {
      const values = await form.validateFields();
      const dates = values.dateRange;
      const startDate = dates && dates[0] ? dates[0].toISOString() : undefined;
      const endDate = dates && dates[1] ? dates[1].toISOString() : undefined;

      await onSubmit(training.id, {
        title: values.title.trim(),
        description: values.description ? values.description.trim() : undefined,
        categoryId: Number(values.categoryId),
        departmentId: values.departmentId ? Number(values.departmentId) : null,
        provider: values.provider ? values.provider.trim() : undefined,
        type: values.type || 'ONLINE',
        capacity:
          values.capacity !== undefined &&
          values.capacity !== null &&
          values.capacity !== ''
            ? Number(values.capacity)
            : undefined,
        cost:
          values.cost !== undefined &&
          values.cost !== null &&
          values.cost !== ''
            ? Number(values.cost)
            : undefined,
        startDate,
        endDate,
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
      title="Edit Training Course"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      {isLocked && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Course is ${training?.status}`}
          description="Structural settings (Category, Schedule Window, and Capacity) are locked from changes for completed or cancelled courses to preserve historical audit integrity."
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Course Title"
          rules={[{ required: true, message: 'Please enter course title' }]}
        >
          <Input placeholder="e.g. Microservices Architecture & Event Sourcing" />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="Training Category"
          rules={[{ required: true, message: 'Please select a category' }]}
        >
          <Select
            disabled={isLocked}
            placeholder="Select Category"
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="departmentId"
          label="Target Department"
          tooltip="Specify which department this course is designed for so their employees can easily find and join it, or leave blank for company-wide."
        >
          <Select
            allowClear
            showSearch
            placeholder="All Departments (Company-wide)"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={departments.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.code})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="type"
          label="Delivery Format"
          rules={[{ required: true, message: 'Please select delivery format' }]}
        >
          <Select
            placeholder="Format"
            options={[
              { value: 'ONLINE', label: 'Online / Virtual' },
              { value: 'CLASSROOM', label: 'Classroom / In-Person' },
              { value: 'INTERNAL', label: 'Internal Workshop' },
              { value: 'EXTERNAL', label: 'External Certification' },
            ]}
          />
        </Form.Item>

        <Form.Item name="provider" label="Training Vendor / Instructor">
          <Input placeholder="e.g. AWS Training, Internal Tech Lead, Coursera" />
        </Form.Item>

        <Form.Item name="dateRange" label="Course Schedule Window">
          <DatePicker.RangePicker disabled={isLocked} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="capacity"
          label="Capacity Limit (Seats)"
          rules={[
            { type: 'number', min: 1, message: 'Capacity must be at least 1' },
          ]}
        >
          <InputNumber
            disabled={isLocked}
            min={1}
            style={{ width: '100%' }}
            placeholder="e.g. 30"
          />
        </Form.Item>

        <Form.Item
          name="cost"
          label="Per-Seat Budget Cost ($)"
          rules={[
            { type: 'number', min: 0, message: 'Cost cannot be negative' },
          ]}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            prefix="$"
            placeholder="e.g. 150"
          />
        </Form.Item>

        <Form.Item name="description" label="Curriculum Summary">
          <Input.TextArea
            rows={3}
            placeholder="Syllabus, prerequisites, and learning objectives"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
