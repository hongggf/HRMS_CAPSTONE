import React from 'react';
import { Modal, Form, Select, message } from 'antd';
import { CreateReviewInput, PerformanceCycle } from '../../../types/performance';
import { Employee } from '../../../types/employee';
import { normalizeApiError } from '../../../api/client';

interface CreateReviewModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateReviewInput) => Promise<void>;
  cycles: PerformanceCycle[];
  employees: Employee[];
  selectedCycleId?: number;
  loading?: boolean;
}

export const CreateReviewModal: React.FC<CreateReviewModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  cycles,
  employees,
  selectedCycleId,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        cycleId: values.cycleId,
        employeeId: values.employeeId,
        reviewerId: values.reviewerId,
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
      title="Initiate Performance Review"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ cycleId: selectedCycleId }}
      >
        <Form.Item
          name="cycleId"
          label="Evaluation Cycle"
          rules={[{ required: true, message: 'Please select a cycle' }]}
        >
          <Select placeholder="Select Cycle">
            {cycles.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="employeeId"
          label="Employee Under Review"
          rules={[{ required: true, message: 'Please select an employee' }]}
        >
          <Select
            placeholder="Select Employee"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.employeeId})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="reviewerId"
          label="Designated Reviewer / Manager"
          rules={[{ required: false }]}
        >
          <Select
            placeholder="Select Reviewer (Optional)"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.employeeId})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
