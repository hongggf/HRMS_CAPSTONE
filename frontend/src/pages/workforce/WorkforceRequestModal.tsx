import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Row, Col, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { departmentApi, positionApi } from '../../api/organization';
import {
  WorkforceRequest,
  CreateWorkforceRequestInput,
  UpdateWorkforceRequestInput,
} from '../../types/workforce';
import { normalizeApiError } from '../../api/client';

interface WorkforceRequestModalProps {
  open: boolean;
  request: WorkforceRequest | null; // null = create mode
  isSubmitting: boolean;
  onSubmit: (
    values: CreateWorkforceRequestInput | UpdateWorkforceRequestInput,
  ) => Promise<void>;
  onCancel: () => void;
}

export const WorkforceRequestModal: React.FC<WorkforceRequestModalProps> = ({
  open,
  request,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const selectedDepartmentId = Form.useWatch('departmentId', form);
  const isEdit = Boolean(request);

  // Fetch active departments
  const { data: deptData } = useQuery({
    queryKey: ['active-departments-wf'],
    queryFn: () => departmentApi.list({ status: 'ACTIVE', limit: 100 }),
    enabled: open,
  });

  // Fetch positions for the selected department
  const { data: posData, isLoading: isLoadingPositions } = useQuery({
    queryKey: ['positions-wf', selectedDepartmentId],
    queryFn: () =>
      positionApi.list({
        departmentId: selectedDepartmentId,
        status: 'OPEN',
        limit: 100,
      }),
    enabled: Boolean(open && selectedDepartmentId),
  });

  const departments = deptData?.departments || [];
  const openPositions = posData?.positions || [];

  useEffect(() => {
    if (open) {
      setServerError(null);
      if (request) {
        form.setFieldsValue({
          departmentId: request.departmentId,
          positionId: request.positionId,
          headcount: request.headcount,
          justification: request.justification,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, request, form]);

  const handleFinish = async (
    values: CreateWorkforceRequestInput | UpdateWorkforceRequestInput,
  ) => {
    setServerError(null);
    try {
      await onSubmit(values);
      form.resetFields();
    } catch (err) {
      const normalized = normalizeApiError(err);
      setServerError(normalized.message);
      if (normalized.details) {
        form.setFields(
          normalized.details.map((d) => ({
            name: d.field || 'justification',
            errors: [d.message],
          })),
        );
      }
    }
  };

  return (
    <Modal
      title={
        isEdit
          ? `Edit Headcount Request #${request?.id} (Draft)`
          : 'Create Headcount Request'
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      destroyOnClose
      width={600}
      okText={isEdit ? 'Save Draft' : 'Create Draft Request'}
    >
      {serverError && (
        <Alert
          type="error"
          message={serverError}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ headcount: 1 }}
      >
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="departmentId"
              label="Target Department"
              rules={[
                { required: true, message: 'Please select target department' },
              ]}
            >
              <Select
                placeholder="Select Department"
                showSearch
                optionFilterProp="label"
                onChange={() => {
                  form.setFieldValue('positionId', undefined);
                }}
                options={departments.map((d) => ({
                  label: `${d.name} (${d.code})`,
                  value: d.id,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={10}>
            <Form.Item
              name="headcount"
              label="Requested Headcount"
              rules={[
                { required: true, message: 'Please specify headcount' },
                {
                  type: 'number',
                  min: 1,
                  message: 'Headcount must be at least 1',
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={500}
                precision={0}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="positionId"
          label="Open Position"
          dependencies={['departmentId']}
          extra={
            !selectedDepartmentId
              ? 'Select a department first'
              : openPositions.length === 0 && !isLoadingPositions
                ? 'No OPEN positions found in this department'
                : undefined
          }
          rules={[
            { required: true, message: 'Please select an open position' },
          ]}
        >
          <Select
            placeholder={
              !selectedDepartmentId
                ? 'Select department first'
                : isLoadingPositions
                  ? 'Loading open positions...'
                  : 'Select Open Position'
            }
            disabled={!selectedDepartmentId || isLoadingPositions}
            showSearch
            optionFilterProp="label"
            options={openPositions.map((p) => ({
              label: `${p.title} (${p.code})`,
              value: p.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="justification"
          label="Business Justification"
          extra="Explain the operational requirement, team workload, or strategic goal"
          rules={[
            {
              required: true,
              message: 'Please provide business justification',
            },
            { min: 1, message: 'Justification cannot be empty' },
            {
              max: 1000,
              message: 'Justification cannot exceed 1000 characters',
            },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Detailed rationale for additional staffing..."
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
