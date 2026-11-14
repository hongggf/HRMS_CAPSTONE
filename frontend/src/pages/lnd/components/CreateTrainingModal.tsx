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
import { CreateTrainingInput, TrainingCategory } from '../../../types/lnd';
import { Department } from '../../../types/organization';
import { normalizeApiError } from '../../../api/client';

interface CreateTrainingModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTrainingInput) => Promise<void>;
  categories: TrainingCategory[];
  departments?: Department[];
  loading?: boolean;
}

export const CreateTrainingModal: React.FC<CreateTrainingModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  categories,
  departments = [],
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const dates = values.dateRange;
      const startDate = dates && dates[0] ? dates[0].toISOString() : undefined;
      const endDate = dates && dates[1] ? dates[1].toISOString() : undefined;

      await onSubmit({
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        departmentId: values.departmentId ? Number(values.departmentId) : null,
        provider: values.provider,
        type: values.type,
        capacity: values.capacity,
        cost: values.cost,
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
      title="Create Training Course"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'ONLINE' }}>
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
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="capacity"
          label="Capacity Limit (Seats)"
          rules={[
            { type: 'number', min: 1, message: 'Capacity must be at least 1' },
          ]}
        >
          <InputNumber
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
