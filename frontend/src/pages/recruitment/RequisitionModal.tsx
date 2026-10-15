import React, { useEffect } from 'react';
import { Modal, Form, Select, Typography, Alert, Space, Tag } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workforceApi } from '../../api/workforce';
import { recruitmentApi } from '../../api/recruitment';
import { normalizeApiError } from '../../api/client';

const { Text } = Typography;

interface RequisitionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RequisitionModal: React.FC<RequisitionModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch approved workforce requests that can be converted into job requisitions
  const { data: wfData, isLoading: isLoadingWf } = useQuery({
    queryKey: ['approved-workforce-requests'],
    queryFn: () => workforceApi.list({ status: 'APPROVED', limit: 100 }),
    enabled: open,
  });

  // Fetch existing requisitions to filter out workforce requests that already have requisitions
  const { data: reqData } = useQuery({
    queryKey: ['existing-requisitions-check'],
    queryFn: () => recruitmentApi.listRequisitions({ limit: 100 }),
    enabled: open,
  });

  const existingWfRequestIds = new Set(
    reqData?.requisitions.map((r) => r.workforceRequestId) || [],
  );

  const availableRequests =
    wfData?.workforceRequests.filter(
      (wf) => !existingWfRequestIds.has(wf.id),
    ) || [];

  const createMutation = useMutation({
    mutationFn: (values: { workforceRequestId: number }) =>
      recruitmentApi.createRequisition(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['approved-workforce-requests'] });
      form.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate(values);
    } catch {
      // Form validation errors handled by Ant Design Form
    }
  };

  const errorDetails = createMutation.error
    ? normalizeApiError(createMutation.error)
    : null;

  return (
    <Modal
      title="Create Job Requisition"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending}
      okText="Create Requisition"
      destroyOnClose
      width={600}
    >
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <Text type="secondary">
          Select an approved workforce planning request to initiate a recruitment job requisition.
        </Text>
      </div>

      {errorDetails && (
        <Alert
          type="error"
          showIcon
          message={errorDetails.message}
          style={{ marginBottom: 16 }}
        />
      )}

      {availableRequests.length === 0 && !isLoadingWf && (
        <Alert
          type="info"
          showIcon
          message="No Unrequisitioned Approved Workforce Requests"
          description="All approved workforce headcount requests currently have linked job requisitions, or none are currently approved."
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="workforceRequestId"
          label="Approved Workforce Request"
          rules={[
            {
              required: true,
              message: 'Please select an approved workforce request',
            },
          ]}
        >
          <Select
            placeholder="Select approved workforce request..."
            loading={isLoadingWf}
            disabled={availableRequests.length === 0}
            showSearch
            optionFilterProp="label"
            options={availableRequests.map((wf) => ({
              value: wf.id,
              label: `${wf.position?.title || 'Position'} (${wf.department?.name || 'Dept'}) - ${wf.headcount} opening(s)`,
              render: (
                <div style={{ padding: '4px 0' }}>
                  <div style={{ fontWeight: 600 }}>
                    {wf.position?.title} ·{' '}
                    <Tag color="blue">{wf.department?.name}</Tag>
                  </div>
                  <Space style={{ fontSize: 12, color: '#888' }}>
                    <span>Headcount: {wf.headcount}</span>
                    <span>·</span>
                    <span>Justification: {wf.justification}</span>
                  </Space>
                </div>
              ),
            }))}
            optionRender={(option) => option.data.render}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
