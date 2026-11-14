import React from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
} from 'antd';
import {
  CreatePromotionInput,
  PerformanceReview,
} from '../../../types/performance';
import { Employee } from '../../../types/employee';
import { Position } from '../../../types/organization';
import { normalizeApiError } from '../../../api/client';

interface RequestPromotionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreatePromotionInput) => Promise<void>;
  employees: Employee[];
  positions: Position[];
  reviews: PerformanceReview[];
  loading?: boolean;
}

export const RequestPromotionModal: React.FC<RequestPromotionModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  employees,
  positions,
  reviews,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        employeeId: values.employeeId,
        proposedPositionId: values.proposedPositionId,
        proposedSalary: values.proposedSalary,
        reason: values.reason,
        performanceReviewId: values.performanceReviewId,
        effectiveDate: values.effectiveDate.toISOString(),
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
      title="Submit Promotion & Salary Recommendation"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="employeeId"
          label="Recommended Employee"
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
              label: `${e.firstName} ${e.lastName} (${e.employeeId}) - Current: ${e.position?.title || 'None'}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="proposedPositionId"
          label="Proposed Position / Promotion Target"
          rules={[
            {
              required: true,
              message: 'Please select the target promotion position',
            },
          ]}
        >
          <Select
            placeholder="Select Proposed Position"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={positions.map((p) => ({
              value: p.id,
              label: `${p.title} (${p.code})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="proposedSalary"
          label="New Adjusted Monthly Base Salary ($)"
          rules={[
            {
              type: 'number',
              min: 1,
              message: 'Salary must be greater than zero',
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="e.g. 6500"
            prefix="$"
            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          />
        </Form.Item>

        <Form.Item
          name="performanceReviewId"
          label="Supporting Performance Review"
        >
          <Select
            placeholder="Link to Performance Review (Optional)"
            allowClear
          >
            {reviews.map((r) => (
              <Select.Option key={r.id} value={r.id}>
                Review #{r.id} - {r.employee?.firstName} {r.employee?.lastName}{' '}
                (Score: {r.overallScore ?? 'N/A'}, Status: {r.status})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="effectiveDate"
          label="Promotion Effective Date"
          rules={[
            { required: true, message: 'Please select effective start date' },
          ]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Executive Justification & Accomplishments"
          rules={[
            {
              required: true,
              message:
                'Please document reasons for promotion and salary increase',
            },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Detail merit, sustained high performance, scope expansion, and business impact"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
