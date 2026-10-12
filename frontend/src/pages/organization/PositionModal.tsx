import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Row, Col, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { departmentApi } from '../../api/organization';
import {
  Position,
  CreatePositionInput,
  UpdatePositionInput,
  EmploymentType,
} from '../../types/organization';
import { normalizeApiError } from '../../api/client';

interface PositionModalProps {
  open: boolean;
  position: Position | null; // null = create mode
  isSubmitting: boolean;
  onSubmit: (
    values: CreatePositionInput | UpdatePositionInput,
  ) => Promise<void>;
  onCancel: () => void;
}

export const PositionModal: React.FC<PositionModalProps> = ({
  open,
  position,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const isEdit = Boolean(position);

  // Fetch active departments for selector
  const { data: deptData } = useQuery({
    queryKey: ['active-departments'],
    queryFn: () => departmentApi.list({ status: 'ACTIVE', limit: 100 }),
    enabled: open,
  });

  const departments = deptData?.departments || [];

  useEffect(() => {
    if (open) {
      setServerError(null);
      if (position) {
        form.setFieldsValue({
          title: position.title,
          code: position.code,
          departmentId: position.departmentId,
          employmentType: position.employmentType,
          salaryMin: position.salaryMin ?? undefined,
          salaryMax: position.salaryMax ?? undefined,
          description: position.description || '',
          status: position.status,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, position, form]);

  const handleFinish = async (
    values: CreatePositionInput | UpdatePositionInput,
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
            name: d.field || 'title',
            errors: [d.message],
          })),
        );
      }
    }
  };

  return (
    <Modal
      title={
        isEdit ? `Edit Position: ${position?.title}` : 'Create New Position'
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      destroyOnClose
      width={600}
      okText={isEdit ? 'Save Changes' : 'Create Position'}
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
        initialValues={{
          employmentType: 'FULL_TIME',
          status: 'OPEN',
        }}
      >
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="title"
              label="Position Title"
              rules={[
                { required: true, message: 'Please enter position title' },
                {
                  max: 100,
                  message: 'Position title cannot exceed 100 characters',
                },
              ]}
            >
              <Input
                placeholder="e.g. Senior Software Engineer"
                maxLength={100}
              />
            </Form.Item>
          </Col>

          <Col span={10}>
            <Form.Item
              name="code"
              label="Position Code"
              extra="Uppercase letters, numbers, -, _"
              rules={[
                { required: true, message: 'Please enter position code' },
                {
                  max: 20,
                  message: 'Position code cannot exceed 20 characters',
                },
                {
                  pattern: /^[A-Z0-9_-]+$/,
                  message: 'Must be uppercase alphanumeric with - or _',
                },
              ]}
            >
              <Input
                placeholder="e.g. ENG_SR_SWE"
                maxLength={20}
                style={{ textTransform: 'uppercase' }}
                onChange={(e) => {
                  form.setFieldValue('code', e.target.value.toUpperCase());
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name="departmentId"
              label="Department"
              rules={[
                { required: true, message: 'Please select a department' },
              ]}
            >
              <Select
                placeholder="Select Department"
                showSearch
                optionFilterProp="label"
                options={departments.map((d) => ({
                  label: `${d.name} (${d.code})`,
                  value: d.id,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={10}>
            <Form.Item
              name="employmentType"
              label="Employment Type"
              rules={[
                { required: true, message: 'Please select employment type' },
              ]}
            >
              <Select<EmploymentType>>
                <Select.Option value="FULL_TIME">Full Time</Select.Option>
                <Select.Option value="PART_TIME">Part Time</Select.Option>
                <Select.Option value="CONTRACT">Contract</Select.Option>
                <Select.Option value="INTERNSHIP">Internship</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="salaryMin"
              label="Minimum Salary (USD)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Salary minimum cannot be negative',
                },
              ]}
            >
              <InputNumber<number>
                style={{ width: '100%' }}
                placeholder="e.g. 50000"
                min={0}
                formatter={(val) =>
                  val ? `$ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
                }
                parser={(val) =>
                  val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0
                }
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="salaryMax"
              label="Maximum Salary (USD)"
              dependencies={['salaryMin']}
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Salary maximum cannot be negative',
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const min = getFieldValue('salaryMin');
                    if (
                      value !== undefined &&
                      value !== null &&
                      min !== undefined &&
                      min !== null
                    ) {
                      if (value < min) {
                        return Promise.reject(
                          new Error(
                            'Salary maximum must be greater than or equal to minimum salary',
                          ),
                        );
                      }
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber<number>
                style={{ width: '100%' }}
                placeholder="e.g. 80000"
                min={0}
                formatter={(val) =>
                  val ? `$ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
                }
                parser={(val) =>
                  val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Job Description / Duties"
          rules={[
            { max: 500, message: 'Description cannot exceed 500 characters' },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Key responsibilities and qualifications required"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {isEdit && (
          <Form.Item
            name="status"
            label="Position Status"
            rules={[
              { required: true, message: 'Please select position status' },
            ]}
          >
            <Select>
              <Select.Option value="OPEN">
                Open (Accepting Workforce Requests)
              </Select.Option>
              <Select.Option value="FROZEN">Frozen</Select.Option>
              <Select.Option value="CLOSED">Closed</Select.Option>
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
