import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Checkbox,
  Alert,
  message,
} from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';
import { attendanceApi } from '../../api/attendance';

interface CreateShiftModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS_OPTIONS = [
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
  { label: 'Sunday', value: '0' },
];

export const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBackendError(null);
      form.setFieldsValue({
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
        workingDays: ['1', '2', '3', '4', '5'],
      });
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setBackendError(null);

      const workingDays = Array.isArray(values.workingDays)
        ? values.workingDays.join(',')
        : values.workingDays;

      await attendanceApi.createShift({
        name: values.name.trim(),
        startTime: values.startTime.trim(),
        endTime: values.endTime.trim(),
        breakDuration: Number(values.breakDuration),
        workingDays,
      });

      message.success('Shift template created successfully');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return;
      const msg =
        err.response?.data?.error || err.message || 'Failed to create shift';
      setBackendError(msg);
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <ScheduleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Create Shift Schedule
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      okText="Create Shift"
      destroyOnClose
    >
      {backendError && (
        <Alert
          message="Creation Failed"
          description={backendError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setBackendError(null)}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Shift Name"
          rules={[{ required: true, message: 'Please enter shift name' }]}
        >
          <Input
            placeholder="e.g. Standard Morning Shift"
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          name="startTime"
          label="Start Time (HH:MM)"
          rules={[
            { required: true, message: 'Start time is required' },
            {
              pattern: /^([01]\d|2[0-3]):?([0-5]\d)$/,
              message: 'Must be in 24h format (HH:MM)',
            },
          ]}
        >
          <Input placeholder="09:00" disabled={submitting} />
        </Form.Item>

        <Form.Item
          name="endTime"
          label="End Time (HH:MM)"
          rules={[
            { required: true, message: 'End time is required' },
            {
              pattern: /^([01]\d|2[0-3]):?([0-5]\d)$/,
              message: 'Must be in 24h format (HH:MM)',
            },
          ]}
        >
          <Input placeholder="17:00" disabled={submitting} />
        </Form.Item>

        <Form.Item
          name="breakDuration"
          label="Break Duration (Minutes)"
          rules={[{ required: true, message: 'Break duration is required' }]}
        >
          <InputNumber
            min={0}
            max={240}
            style={{ width: '100%' }}
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          name="workingDays"
          label="Working Days"
          rules={[
            { required: true, message: 'Select at least one working day' },
          ]}
        >
          <Checkbox.Group options={DAYS_OPTIONS} disabled={submitting} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
