import React, { useState } from 'react';
import { Modal, Input, Typography, message } from 'antd';
import { PayrollPeriod } from '../../../types/payroll';

const { Paragraph } = Typography;

interface RejectPeriodModalProps {
  period: PayrollPeriod | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (periodId: number, comments: string) => void;
  loading: boolean;
}

export const RejectPeriodModal: React.FC<RejectPeriodModalProps> = ({
  period,
  open,
  onCancel,
  onConfirm,
  loading,
}) => {
  const [comments, setComments] = useState('');

  const handleOk = () => {
    if (!comments.trim()) {
      message.warning('Please enter an executive reason for rejecting this payroll period.');
      return;
    }
    if (period) {
      onConfirm(period.id, comments.trim());
    }
  };

  return (
    <Modal
      title="Reject Payroll Period"
      open={open}
      onCancel={() => {
        setComments('');
        onCancel();
      }}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Confirm Rejection"
      okButtonProps={{ danger: true }}
      destroyOnHidden
    >
      <Paragraph type="secondary">
        Please state the justification for rejecting payroll period &ldquo;{period?.name}&rdquo;.
        The payroll officer will be notified to correct discrepancies or recalculate figures.
      </Paragraph>
      <Input.TextArea
        rows={4}
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="State reason for rejection (e.g. Missing overtime audit records for IT department)..."
      />
    </Modal>
  );
};
