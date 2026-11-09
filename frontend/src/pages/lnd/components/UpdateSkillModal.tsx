import React from 'react';
import { Modal, Form, Select, Input, message } from 'antd';
import { UpdateEmployeeSkillInput } from '../../../types/lnd';
import { Employee } from '../../../types/employee';
import { normalizeApiError } from '../../../api/client';

interface UpdateSkillModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (employeeId: number, values: UpdateEmployeeSkillInput) => Promise<void>;
  employees: Employee[];
  loading?: boolean;
}

export const UpdateSkillModal: React.FC<UpdateSkillModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  employees,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values.employeeId, {
        skillName: values.skillName,
        level: values.level,
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
      title="Add / Update Employee Skill Profile"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ level: 'INTERMEDIATE' }}>
        <Form.Item
          name="employeeId"
          label="Employee"
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
          name="skillName"
          label="Skill Competency Name"
          rules={[{ required: true, message: 'Please enter skill name' }]}
        >
          <Input placeholder="e.g. TypeScript, Kubernetes, Financial Modeling, System Architecture" />
        </Form.Item>

        <Form.Item
          name="level"
          label="Proficiency Level"
          rules={[{ required: true, message: 'Please select proficiency level' }]}
        >
          <Select>
            <Select.Option value="BEGINNER">Beginner (Foundational understanding)</Select.Option>
            <Select.Option value="INTERMEDIATE">Intermediate (Independent practitioner)</Select.Option>
            <Select.Option value="ADVANCED">Advanced (Deep expertise & mentoring)</Select.Option>
            <Select.Option value="EXPERT">Expert (Subject matter authority)</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};
