import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Checkbox,
  message,
  DatePicker,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentApi, positionApi } from '../../api/organization';
import { tasksApi } from '../../api/tasks';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TaskCategory =
  | 'WORKFORCE_PLANNING'
  | 'JOB_REQUISITION'
  | 'LEAVE'
  | 'OVERTIME'
  | 'PROMOTION'
  | 'TRAINING';

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRoles = useMemo(
    () => (Array.isArray(user?.roles) ? user.roles : []),
    [user],
  );

  const isHeadOfHr = userRoles.includes('HEAD_OF_HR');
  const isRecruitment = userRoles.includes('HR_RECRUITMENT');
  const isAttendance = userRoles.includes('HR_ATTENDANCE');
  const isPerformance = userRoles.includes('HR_PERFORMANCE');
  const isLnd = userRoles.includes('HR_LND');
  const isAdmin = userRoles.includes('HR_ADMIN');

  // Compute available task categories based on user role
  const availableCategories = useMemo(() => {
    if (isHeadOfHr || isAdmin) {
      return [
        { label: 'Workforce Headcount Request', value: 'WORKFORCE_PLANNING' },
        { label: 'Job Requisition (Recruitment)', value: 'JOB_REQUISITION' },
        { label: 'Leave Request', value: 'LEAVE' },
        { label: 'Overtime Request', value: 'OVERTIME' },
        { label: 'Employee Promotion Request', value: 'PROMOTION' },
        { label: 'Training & Development Proposal', value: 'TRAINING' },
      ];
    }
    const list = [];
    if (isRecruitment) {
      list.push({
        label: 'Job Requisition (Recruitment)',
        value: 'JOB_REQUISITION',
      });
      list.push({
        label: 'Workforce Headcount Request',
        value: 'WORKFORCE_PLANNING',
      });
    }
    if (isAttendance) {
      list.push({ label: 'Leave Request', value: 'LEAVE' });
      list.push({ label: 'Overtime Request', value: 'OVERTIME' });
    }
    if (isPerformance) {
      list.push({ label: 'Employee Promotion Request', value: 'PROMOTION' });
    }
    if (isLnd) {
      list.push({
        label: 'Training & Development Proposal',
        value: 'TRAINING',
      });
    }
    if (list.length === 0) {
      list.push({
        label: 'Workforce Headcount Request',
        value: 'WORKFORCE_PLANNING',
      });
    }
    return list;
  }, [isHeadOfHr, isAdmin, isRecruitment, isAttendance, isPerformance, isLnd]);

  const defaultCategory: TaskCategory = (availableCategories[0]?.value ||
    'WORKFORCE_PLANNING') as TaskCategory;

  const [selectedCategory, setSelectedCategory] =
    useState<TaskCategory>(defaultCategory);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(
    undefined,
  );
  const [submitNow, setSubmitNow] = useState<boolean>(true);

  useEffect(() => {
    if (open) {
      setSelectedCategory(defaultCategory);
      setSubmitNow(true);
      form.setFieldsValue({
        type: defaultCategory,
        headcount: 1,
        submitNow: true,
      });
    }
  }, [open, defaultCategory, form]);

  // Departments
  const { data: deptData, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentApi.list({ limit: 100 }),
    enabled: open,
  });

  // Positions for selected department
  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['positions-select', selectedDeptId],
    queryFn: () =>
      positionApi.list({ departmentId: selectedDeptId, limit: 100 }),
    enabled: open && Boolean(selectedDeptId),
  });

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const dateRange = values.dateRange as [Date, Date] | undefined;
      const dateVal = values.date as Date | undefined;

      return tasksApi.createTask({
        type: selectedCategory,
        departmentId: values.departmentId as number | undefined,
        positionId: values.positionId as number | undefined,
        headcount: values.headcount as number | undefined,
        justification: (values.justification as string) || '',
        submitNow,
        hours: values.hours as number | undefined,
        startDate: dateRange?.[0]
          ? new Date(dateRange[0]).toISOString()
          : undefined,
        endDate: dateRange?.[1]
          ? new Date(dateRange[1]).toISOString()
          : undefined,
        date: dateVal ? new Date(dateVal).toISOString() : undefined,
        proposedPositionId: values.proposedPositionId as number | undefined,
        proposedSalary: values.proposedSalary as number | undefined,
        trainingTitle: values.trainingTitle as string | undefined,
        budget: values.budget as number | undefined,
      });
    },
    onSuccess: () => {
      message.success(
        submitNow
          ? 'Task created and submitted to Head of HR for approval!'
          : 'Task saved as draft successfully',
      );
      queryClient.invalidateQueries({ queryKey: ['unified-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workforce-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      form.resetFields();
      setSelectedDeptId(undefined);
      onClose();
      onSuccess?.();
    },
    onError: (err) => {
      message.error(normalizeApiError(err).message);
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate(values);
    } catch {
      // Form validation error
    }
  };

  return (
    <Modal
      title="Create New Task / Request"
      open={open}
      onCancel={() => {
        form.resetFields();
        setSelectedDeptId(undefined);
        onClose();
      }}
      onOk={handleSubmit}
      okText={submitNow ? 'Submit to Head of HR' : 'Save Draft'}
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: defaultCategory,
          headcount: 1,
          submitNow: true,
        }}
      >
        <Form.Item
          name="type"
          label="Task Category / Domain"
          rules={[{ required: true, message: 'Please select a task category' }]}
        >
          <Select
            placeholder="Select task domain"
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val as TaskCategory);
              form.setFieldValue('positionId', undefined);
            }}
            options={availableCategories}
          />
        </Form.Item>

        <Form.Item
          name="departmentId"
          label="Department"
          rules={[{ required: true, message: 'Please select a department' }]}
        >
          <Select
            placeholder="Select department"
            loading={deptsLoading}
            onChange={(val) => {
              setSelectedDeptId(val);
              form.setFieldValue('positionId', undefined);
            }}
            options={deptData?.departments?.map((d) => ({
              label: `${d.name} (${d.code})`,
              value: d.id,
            }))}
          />
        </Form.Item>

        {/* Dynamic Fields for Workforce & Recruitment */}
        {(selectedCategory === 'WORKFORCE_PLANNING' ||
          selectedCategory === 'JOB_REQUISITION') && (
          <>
            <Form.Item
              name="positionId"
              label="Position"
              rules={[{ required: true, message: 'Please select a position' }]}
            >
              <Select
                placeholder={
                  selectedDeptId
                    ? 'Select position'
                    : 'Select a department first'
                }
                disabled={!selectedDeptId}
                loading={posLoading}
                options={posData?.positions?.map((p) => ({
                  label: `${p.title} (${p.code})`,
                  value: p.id,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="headcount"
              label="Requested Headcount"
              rules={[{ required: true, message: 'Please specify headcount' }]}
            >
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}

        {/* Dynamic Fields for Leave */}
        {selectedCategory === 'LEAVE' && (
          <Form.Item
            name="dateRange"
            label="Leave Date Range"
            rules={[
              { required: true, message: 'Please select leave duration' },
            ]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
        )}

        {/* Dynamic Fields for Overtime */}
        {selectedCategory === 'OVERTIME' && (
          <>
            <Form.Item
              name="date"
              label="Overtime Date"
              rules={[
                { required: true, message: 'Please select overtime date' },
              ]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="hours"
              label="Overtime Hours"
              rules={[{ required: true, message: 'Please specify hours' }]}
            >
              <InputNumber
                min={0.5}
                max={16}
                step={0.5}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </>
        )}

        {/* Dynamic Fields for Promotion */}
        {selectedCategory === 'PROMOTION' && (
          <>
            <Form.Item
              name="proposedPositionId"
              label="Proposed Position"
              rules={[
                { required: true, message: 'Please select proposed position' },
              ]}
            >
              <Select
                placeholder={
                  selectedDeptId
                    ? 'Select target position'
                    : 'Select a department first'
                }
                disabled={!selectedDeptId}
                loading={posLoading}
                options={posData?.positions?.map((p) => ({
                  label: `${p.title} (${p.code})`,
                  value: p.id,
                }))}
              />
            </Form.Item>

            <Form.Item name="proposedSalary" label="Proposed New Salary ($)">
              <InputNumber
                min={1000}
                max={500000}
                style={{ width: '100%' }}
                placeholder="e.g. 6500"
              />
            </Form.Item>
          </>
        )}

        {/* Dynamic Fields for Training */}
        {selectedCategory === 'TRAINING' && (
          <>
            <Form.Item
              name="trainingTitle"
              label="Training Program Title"
              rules={[
                { required: true, message: 'Please specify training title' },
              ]}
            >
              <Input placeholder="e.g. Advanced Leadership Certification" />
            </Form.Item>

            <Form.Item name="budget" label="Estimated Budget ($)">
              <InputNumber
                min={0}
                max={100000}
                style={{ width: '100%' }}
                placeholder="e.g. 2500"
              />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="justification"
          label="Business Justification & Task Details"
          rules={[
            { required: true, message: 'Please provide task justification' },
            { min: 5, message: 'Must be at least 5 characters' },
            { max: 1000, message: 'Cannot exceed 1000 characters' },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Explain why this request is needed for review by Head of HR..."
            showCount
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item name="submitNow" valuePropName="checked">
          <Checkbox
            checked={submitNow}
            onChange={(e) => setSubmitNow(e.target.checked)}
          >
            Submit immediately to <strong>Head of HR</strong> for executive
            approval
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};
