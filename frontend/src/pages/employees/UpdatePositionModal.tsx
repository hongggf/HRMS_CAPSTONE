import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Alert,
  Typography,
  message,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../../api/employee';
import { departmentApi, positionApi } from '../../api/organization';
import { normalizeApiError } from '../../api/client';

const { Text } = Typography;

interface UpdatePositionModalProps {
  open: boolean;
  employeeId: number;
  employeeName: string;
  currentDepartmentId?: number;
  currentPositionId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const UpdatePositionModal: React.FC<UpdatePositionModalProps> = ({
  open,
  employeeId,
  employeeName,
  currentDepartmentId,
  currentPositionId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch departments
  const { data: deptData, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentApi.list({ limit: 100 }),
    enabled: open,
  });

  // Fetch positions
  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['positions-select'],
    queryFn: () => positionApi.list({ limit: 100 }),
    enabled: open,
  });

  const selectedDeptId = Form.useWatch('departmentId', form);

  // Filter positions by selected department if applicable
  const filteredPositions = React.useMemo(() => {
    const list = posData?.positions || [];
    if (!selectedDeptId) return list;
    return list.filter((p) => p.departmentId === selectedDeptId);
  }, [posData, selectedDeptId]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        departmentId: currentDepartmentId,
        positionId: currentPositionId,
      });
      setErrorMessage(null);
    }
  }, [open, currentDepartmentId, currentPositionId, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setErrorMessage(null);

      await employeeApi.updatePosition(employeeId, {
        departmentId: values.departmentId,
        positionId: values.positionId,
      });

      message.success('Employee position updated and history recorded');
      onSuccess();
    } catch (err: unknown) {
      const normalized = normalizeApiError(err);
      setErrorMessage(normalized.message || 'Failed to update employee position');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Update Employee Position & Department"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Update Position"
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Transfer or assign new organizational position for: <Text strong>{employeeName}</Text>
        </Text>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          message="Update Failed"
          description={errorMessage}
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="departmentId"
          label="Department"
          rules={[{ required: true, message: 'Please select a department' }]}
        >
          <Select
            placeholder="Select department"
            loading={deptsLoading}
            options={(deptData?.departments || []).map((d) => ({
              value: d.id,
              label: `${d.name} (${d.code})`,
            }))}
            onChange={() => form.setFieldValue('positionId', undefined)}
          />
        </Form.Item>

        <Form.Item
          name="positionId"
          label="Position Title"
          rules={[{ required: true, message: 'Please select a position' }]}
        >
          <Select
            placeholder="Select position"
            loading={posLoading}
            options={filteredPositions.map((p) => ({
              value: p.id,
              label: `${p.title} (${p.code})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
