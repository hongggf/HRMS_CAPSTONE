import React from 'react';
import { Modal, Form, Input, InputNumber, Select, Alert } from 'antd';
import { Payroll, CreateAdjustmentInput } from '../../../types/payroll';

interface AdjustmentModalProps {
  payroll: Payroll | null;
  open: boolean;
  onCancel: () => void;
  onSubmit: (payrollId: number, payload: CreateAdjustmentInput) => void;
  loading: boolean;
  isLocked: boolean;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  payroll,
  open,
  onCancel,
  onSubmit,
  loading,
  isLocked,
}) => {
  const [form] = Form.useForm<CreateAdjustmentInput>();

  const handleOk = () => {
    form.validateFields().then((values) => {
      if (payroll) {
        onSubmit(payroll.id, {
          type: values.type,
          amount: Number(values.amount),
          reason: values.reason.trim(),
        });
      }
    });
  };

  return (
    <Modal
      title={`Add Adjustment: ${payroll?.employee?.firstName} ${payroll?.employee?.lastName}`}
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnHidden
    >
      {isLocked && (
        <Alert
          title="Period is LOCKED"
          description="This payroll period is locked. Any adjustment submitted will be recorded in the audit trail for financial governance, but will NOT retroactively modify the locked net payout."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: 'ADDITION' }}
      >
        <Form.Item
          name="type"
          label="Adjustment Type"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: 'Addition (+) [Bonus, retroactive allowance]', value: 'ADDITION' },
              { label: 'Deduction (-) [Unpaid leave adjustment, penalty]', value: 'DEDUCTION' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Adjustment Amount (USD)"
          rules={[
            { required: true, message: 'Please enter adjustment amount' },
            { type: 'number', min: 0.01, message: 'Amount must be greater than zero' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0.01}
            step={0.01}
            placeholder="0.00"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Business Justification / Reason"
          rules={[{ required: true, message: 'Please provide mandatory audit reason' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="e.g. Retroactive bonus payout approved by management"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
