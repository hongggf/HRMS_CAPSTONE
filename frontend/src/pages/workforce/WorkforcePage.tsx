import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Select,
  Tag,
  Popconfirm,
  message,
  Typography,
  Card,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workforceApi } from '../../api/workforce';
import { departmentApi } from '../../api/organization';
import {
  WorkforceRequest,
  WorkforceStatus,
  CreateWorkforceRequestInput,
  UpdateWorkforceRequestInput,
} from '../../types/workforce';
import { WorkforceRequestModal } from './WorkforceRequestModal';
import { WorkforceRejectModal } from './WorkforceRejectModal';
import { WorkforceDetailDrawer } from './WorkforceDetailDrawer';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

export const WorkforcePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isHeadOfHr = user?.roles?.includes('HEAD_OF_HR');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<WorkforceStatus | undefined>(
    undefined,
  );
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>(
    undefined,
  );

  // Modal / Drawer states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [editingRequest, setEditingRequest] = useState<WorkforceRequest | null>(
    null,
  );

  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(
    null,
  );

  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] =
    useState<WorkforceRequest | null>(null);

  // Department list for filter
  const { data: deptData } = useQuery({
    queryKey: ['wf-departments-filter'],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  // Fetch workforce requests
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      'workforce-requests',
      page,
      pageSize,
      statusFilter,
      departmentFilter,
    ],
    queryFn: () =>
      workforceApi.list({
        page,
        limit: pageSize,
        status: statusFilter,
        departmentId: departmentFilter,
      }),
  });

  const invalidateWF = () => {
    queryClient.invalidateQueries({ queryKey: ['workforce-requests'] });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: CreateWorkforceRequestInput) =>
      workforceApi.create(values),
    onSuccess: () => {
      message.success('Draft request created successfully');
      invalidateWF();
      setIsRequestModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: UpdateWorkforceRequestInput;
    }) => workforceApi.update(id, values),
    onSuccess: (updated) => {
      message.success('Draft request updated successfully');
      invalidateWF();
      setIsRequestModalOpen(false);
      setEditingRequest(null);
      if (selectedRequest?.id === updated.id) {
        setSelectedRequest(updated);
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => workforceApi.submit(id),
    onSuccess: (updated) => {
      message.success('Request submitted for Head of HR approval');
      invalidateWF();
      if (selectedRequest?.id === updated.id) {
        setSelectedRequest(updated);
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => workforceApi.approve(id),
    onSuccess: (updated) => {
      message.success('Headcount request approved successfully');
      invalidateWF();
      if (selectedRequest?.id === updated.id) {
        setSelectedRequest(updated);
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      workforceApi.reject(id, { rejectionReason: reason }),
    onSuccess: (updated) => {
      message.success('Headcount request rejected');
      invalidateWF();
      setRejectModalOpen(false);
      setRejectingRequestId(null);
      if (selectedRequest?.id === updated.id) {
        setSelectedRequest(updated);
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => workforceApi.cancel(id),
    onSuccess: (updated) => {
      message.success('Request cancelled');
      invalidateWF();
      if (selectedRequest?.id === updated.id) {
        setSelectedRequest(updated);
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workforceApi.delete(id),
    onSuccess: () => {
      message.success('Draft request deleted');
      invalidateWF();
      setDetailDrawerOpen(false);
      setSelectedRequest(null);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const isAnyActionPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  const handleOpenCreate = () => {
    setEditingRequest(null);
    setIsRequestModalOpen(true);
  };

  const handleOpenEdit = (req: WorkforceRequest) => {
    setEditingRequest(req);
    setIsRequestModalOpen(true);
  };

  const handleOpenReject = (id: number) => {
    setRejectingRequestId(id);
    setRejectModalOpen(true);
  };

  const handleViewDetails = (req: WorkforceRequest) => {
    setSelectedRequest(req);
    setDetailDrawerOpen(true);
  };

  const handleSubmitModal = async (
    values: CreateWorkforceRequestInput | UpdateWorkforceRequestInput,
  ) => {
    if (editingRequest) {
      await updateMutation.mutateAsync({
        id: editingRequest.id,
        values: values as UpdateWorkforceRequestInput,
      });
    } else {
      await createMutation.mutateAsync(values as CreateWorkforceRequestInput);
    }
  };

  const formatStatusTag = (status: WorkforceStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="default">DRAFT</Tag>;
      case 'SUBMITTED':
        return <Tag color="blue">SUBMITTED</Tag>;
      case 'PENDING_APPROVAL':
        return <Tag color="warning">PENDING APPROVAL</Tag>;
      case 'APPROVED':
        return <Tag color="success">APPROVED</Tag>;
      case 'REJECTED':
        return <Tag color="error">REJECTED</Tag>;
      case 'CANCELLED':
        return <Tag color="magenta">CANCELLED</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => <Text strong>#{id}</Text>,
    },
    {
      title: 'Department',
      dataIndex: ['department', 'name'],
      key: 'department',
      render: (_: unknown, record: WorkforceRequest) => (
        <span>{record.department?.name || `Dept #${record.departmentId}`}</span>
      ),
    },
    {
      title: 'Position',
      dataIndex: ['position', 'title'],
      key: 'position',
      render: (_: unknown, record: WorkforceRequest) => (
        <div>
          <Text strong>
            {record.position?.title || `Position #${record.positionId}`}
          </Text>
          {record.position?.code && (
            <div>
              <Tag color="purple" style={{ fontSize: 11 }}>
                {record.position.code}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Headcount',
      dataIndex: 'headcount',
      key: 'headcount',
      width: 100,
      render: (hc: number) => (
        <Tag color="cyan">
          {hc} {hc === 1 ? 'person' : 'persons'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: WorkforceStatus) => formatStatusTag(status),
    },
    {
      title: 'Requester',
      dataIndex: ['requester', 'email'],
      key: 'requester',
      render: (_: unknown, record: WorkforceRequest) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.requester?.email || `User #${record.requestedBy}`}
        </Text>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (dateStr: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(dateStr).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 260,
      render: (_: unknown, record: WorkforceRequest) => {
        const isDraft = record.status === 'DRAFT';
        const isPending = record.status === 'PENDING_APPROVAL';
        const isCancellable = [
          'DRAFT',
          'SUBMITTED',
          'PENDING_APPROVAL',
        ].includes(record.status);

        return (
          <Space size="small" wrap>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            >
              View
            </Button>

            {isDraft && (
              <>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEdit(record)}
                  disabled={isAnyActionPending}
                >
                  Edit
                </Button>

                <Popconfirm
                  title="Submit Request"
                  description="Submit this request for Head of HR review?"
                  okText="Submit"
                  cancelText="No"
                  okButtonProps={{ loading: submitMutation.isPending }}
                  onConfirm={() => submitMutation.mutate(record.id)}
                >
                  <Button
                    size="small"
                    type="primary"
                    icon={<SendOutlined />}
                    disabled={isAnyActionPending}
                  >
                    Submit
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Delete Draft"
                  description="Are you sure you want to delete this draft?"
                  okText="Delete"
                  cancelText="No"
                  okButtonProps={{
                    danger: true,
                    loading: deleteMutation.isPending,
                  }}
                  onConfirm={() => deleteMutation.mutate(record.id)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={isAnyActionPending}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              </>
            )}

            {isPending && isHeadOfHr && (
              <>
                <Popconfirm
                  title="Approve Request"
                  description={`Approve request for ${record.headcount} headcount?`}
                  okText="Approve"
                  cancelText="Cancel"
                  okButtonProps={{ loading: approveMutation.isPending }}
                  onConfirm={() => approveMutation.mutate(record.id)}
                >
                  <Button
                    size="small"
                    type="primary"
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    icon={<CheckCircleOutlined />}
                    disabled={isAnyActionPending}
                  >
                    Approve
                  </Button>
                </Popconfirm>

                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleOpenReject(record.id)}
                  disabled={isAnyActionPending}
                >
                  Reject
                </Button>
              </>
            )}

            {isCancellable && !isDraft && (
              <Popconfirm
                title="Cancel Request"
                description="Are you sure you want to cancel this request?"
                okText="Yes, Cancel"
                cancelText="No"
                okButtonProps={{
                  danger: true,
                  loading: cancelMutation.isPending,
                }}
                onConfirm={() => cancelMutation.mutate(record.id)}
              >
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  disabled={isAnyActionPending}
                >
                  Cancel
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header section */}
      <div style={{ marginBottom: 20 }}>
        <Space align="center" wrap>
          <Title level={4} style={{ margin: 0 }}>
            Workforce Planning & Headcount Requests
          </Title>
          <Tag color="cyan">Phase 3</Tag>
        </Space>
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Plan departmental quotas, submit headcount expansion requests, and
            manage approval lifecycle
          </Text>
        </div>
      </div>

      <Card bordered={false}>
        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Space wrap>
            <Select
              placeholder="Filter by Status"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              allowClear
              style={{ width: 180 }}
              options={[
                { label: 'All Statuses', value: undefined },
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Submitted', value: 'SUBMITTED' },
                { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
                { label: 'Approved', value: 'APPROVED' },
                { label: 'Rejected', value: 'REJECTED' },
                { label: 'Cancelled', value: 'CANCELLED' },
              ]}
            />

            <Select
              placeholder="Filter by Department"
              value={departmentFilter}
              onChange={(val) => {
                setDepartmentFilter(val);
                setPage(1);
              }}
              allowClear
              style={{ width: 200 }}
              showSearch
              optionFilterProp="label"
              options={(deptData?.departments || []).map((d) => ({
                label: d.name,
                value: d.id,
              }))}
            />

            <Button
              icon={<ReloadOutlined spin={isFetching} />}
              onClick={() => refetch()}
              loading={isFetching}
            >
              Refresh
            </Button>
          </Space>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
          >
            Create Request
          </Button>
        </div>

        {isError && (
          <Alert
            type="error"
            message="Failed to load workforce requests"
            description={
              (error as Error)?.message ||
              'An error occurred fetching workforce requests.'
            }
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" type="primary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        )}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.workforceRequests || []}
          loading={isLoading || isFetching}
          pagination={{
            current: page,
            pageSize,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} requests`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />

        {/* Create/Edit Request Modal */}
        <WorkforceRequestModal
          open={isRequestModalOpen}
          request={editingRequest}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmitModal}
          onCancel={() => {
            setIsRequestModalOpen(false);
            setEditingRequest(null);
          }}
        />

        {/* Head of HR Rejection Modal */}
        <WorkforceRejectModal
          open={rejectModalOpen}
          requestId={rejectingRequestId}
          isSubmitting={rejectMutation.isPending}
          onSubmit={async (id, reason) => {
            await rejectMutation.mutateAsync({ id, reason });
          }}
          onCancel={() => {
            setRejectModalOpen(false);
            setRejectingRequestId(null);
          }}
        />

        {/* Request Details Drawer */}
        <WorkforceDetailDrawer
          open={detailDrawerOpen}
          request={selectedRequest}
          onClose={() => {
            setDetailDrawerOpen(false);
            setSelectedRequest(null);
          }}
          onSubmit={(id) => submitMutation.mutate(id)}
          onApprove={(id) => approveMutation.mutate(id)}
          onOpenReject={(id) => handleOpenReject(id)}
          onCancelRequest={(id) => cancelMutation.mutate(id)}
          onEdit={(req) => {
            setDetailDrawerOpen(false);
            handleOpenEdit(req);
          }}
          onDelete={(id) => deleteMutation.mutate(id)}
          isActionPending={isAnyActionPending}
        />
      </Card>
    </div>
  );
};
