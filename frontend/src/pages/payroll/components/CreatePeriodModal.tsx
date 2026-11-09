import React from 'react';
import { Modal, Form, Input, Row, Col, Alert } from 'antd';
import { CreatePayrollPeriodInput } from '../../../types/payroll';

interface CreatePeriodModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: CreatePayrollPeriodInput) => void;
  loading: boolean;
}

export const CreatePeriodModal: React.FC<CreatePeriodModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
}) => {
  const [form] = Form.useForm<CreatePayrollPeriodInput>();

  const handleOk = () => {
    form.validateFields().then((values) => {
      const startIso = new Date(values.startDate).toISOString();
      const endIso = new Date(values.endDate).toISOString();
      onSubmit({
        name: values.name.trim(),
        startDate: startIso,
        endDate: endIso,
      });
    });
  };

  return (
    <Modal
      title="Create New Payroll Period"
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Period Name"
          rules={[{ required: true, message: 'Please enter a descriptive period name' }]}
        >
          <Input placeholder="e.g. November 2026 Monthly Payroll" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="startDate"
              label="Start Date"
              rules={[{ required: true, message: 'Please enter start date' }]}
            >
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="endDate"
              label="End Date"
              rules={[{ required: true, message: 'Please enter end date' }]}
            >
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>

        <Alert
          title="Period Date Constraints"
          description="Start and end dates must not overlap with an existing period in the database. Duplicate date ranges will be rejected by the backend validation schema."
          type="info"
          showIcon
        />
      </Form>
    </Modal>
  );
};
