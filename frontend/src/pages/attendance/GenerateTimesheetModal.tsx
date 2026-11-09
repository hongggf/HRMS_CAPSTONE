import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Alert, message, Descriptions, Card } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import { attendanceApi } from '../../api/attendance';
import { Employee } from '../../types/employee';
import { Timesheet } from '../../types/attendance';
import { formatDateOnly } from '../../utils/dateUtils';

interface GenerateTimesheetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: Employee[];
}

export const GenerateTimesheetModal: React.FC<GenerateTimesheetModalProps> = ({
  open,
  onClose,
  onSuccess,
  employees,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [generatedTimesheet, setGeneratedTimesheet] = useState<Timesheet | null>(null);

  useEffect(() => {
    if (open) {
      setBackendError(null);
      setGeneratedTimesheet(null);
      const now = new Date();
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
      form.setFieldsValue({
        employeeId: employees.length > 0 ? employees[0].id : undefined,
        startDate: startOfMonth.toISOString().split('T')[0] + 'T00:00:00.000Z',
        endDate: endOfMonth.toISOString().split('T')[0] + 'T00:00:00.000Z',
      });
    }
  }, [open, employees, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Frontend sanity check
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      if (end.getTime() < start.getTime()) {
        setBackendError('End date cannot be earlier than start date');
        return;
      }

      setSubmitting(true);
      setBackendError(null);

      const result = await attendanceApi.generateTimesheet({
        employeeId: Number(values.employeeId),
        startDate: values.startDate,
        endDate: values.endDate,
      });

      setGeneratedTimesheet(result);
      message.success('Timesheet generated and calculated by server');
      onSuccess();
    } catch (err: any) {
      if (err.errorFields) return;
      const msg = err.response?.data?.error || err.message || 'Failed to generate timesheet';
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
          <CalculatorOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Generate Official Timesheet
        </span>
      }
      open={open}
      onOk={generatedTimesheet ? onClose : handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      okText={generatedTimesheet ? 'Close' : 'Generate Timesheet'}
      destroyOnClose
    >
      <Alert
        message="Official Server Calculation"
        description="Official overtime, regular hours, and payroll totals are calculated strictly by backend business logic based on closed attendance punches and approved overtime."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {backendError && (
        <Alert
          message="Generation Error"
          description={backendError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setBackendError(null)}
        />
      )}

      {!generatedTimesheet ? (
        <Form form={form} layout="vertical">
          <Form.Item
            name="employeeId"
            label="Employee"
            rules={[{ required: true, message: 'Please select an employee' }]}
          >
            <Select
              showSearch
              placeholder="Search employee..."
              optionFilterProp="children"
              disabled={submitting}
            >
              {employees.map((emp) => (
                <Select.Option key={emp.id} value={emp.id}>
                  {emp.employeeId} - {emp.firstName} {emp.lastName} (
                  {emp.department?.name || 'No Dept'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Period Start Date (ISO UTC)"
            rules={[{ required: true, message: 'Start date is required' }]}
          >
            <Input disabled={submitting} />
          </Form.Item>

          <Form.Item
            name="endDate"
            label="Period End Date (ISO UTC)"
            rules={[{ required: true, message: 'End date is required' }]}
          >
            <Input disabled={submitting} />
          </Form.Item>
        </Form>
      ) : (
        <Card title="Server Calculation Result" variant="outlined" style={{ background: '#fafafa' }}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Period">
              {formatDateOnly(generatedTimesheet.startDate)} to{' '}
              {formatDateOnly(generatedTimesheet.endDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Regular Hours">
              <strong>{generatedTimesheet.regularHours} hrs</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Overtime Hours">
              <strong style={{ color: '#fa8c16' }}>
                {generatedTimesheet.overtimeHours} hrs
              </strong>
            </Descriptions.Item>
            <Descriptions.Item label="Total Hours">
              <strong style={{ color: '#52c41a' }}>
                {generatedTimesheet.totalHours} hrs
              </strong>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Modal>
  );
};
