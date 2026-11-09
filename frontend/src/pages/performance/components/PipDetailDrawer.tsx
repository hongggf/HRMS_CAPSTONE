import React, { useState } from 'react';
import {
  Drawer,
  Typography,
  Tag,
  Descriptions,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  Slider,
  message,
  Card,
  Progress,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ImprovementPlan, ImprovementPlanItem, AddPipItemInput } from '../../../types/performance';
import { normalizeApiError } from '../../../api/client';

const { Title, Text, Paragraph } = Typography;

interface PipDetailDrawerProps {
  visible: boolean;
  onClose: () => void;
  pip: ImprovementPlan | null;
  onAddItem: (pipId: number, item: AddPipItemInput) => Promise<void>;
  onUpdateProgress: (itemId: number, progress: number) => Promise<void>;
  canUpdate?: boolean;
}

export const PipDetailDrawer: React.FC<PipDetailDrawerProps> = ({
  visible,
  onClose,
  pip,
  onAddItem,
  onUpdateProgress,
  canUpdate = true,
}) => {
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);

  if (!pip) return null;

  const totalProgress = pip.items && pip.items.length > 0
    ? Math.round(pip.items.reduce((acc, curr) => acc + curr.progress, 0) / pip.items.length)
    : 0;

  const handleAddItemSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      await onAddItem(pip.id, {
        action: values.action,
        target: values.target,
        owner: values.owner,
        dueDate: values.dueDate.toISOString(),
      });
      message.success('Action item added to improvement plan');
      addForm.resetFields();
      setAddItemModalOpen(false);
    } catch (err: any) {
      if (err?.errorFields) return;
      const norm = normalizeApiError(err);
      message.error(norm.message);
    }
  };

  const handleProgressChange = async (itemId: number, newProgress: number) => {
    try {
      setUpdatingItemId(itemId);
      await onUpdateProgress(itemId, newProgress);
      message.success(`Progress updated to ${newProgress}%`);
    } catch (err) {
      const norm = normalizeApiError(err);
      message.error(norm.message);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const columns = [
    {
      title: 'Action Description',
      dataIndex: 'action',
      key: 'action',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Target Outcome',
      dataIndex: 'target',
      key: 'target',
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 220,
      render: (_: any, record: ImprovementPlanItem) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Progress
            percent={record.progress}
            size="small"
            status={record.progress === 100 ? 'success' : 'active'}
          />
          {canUpdate && (
            <Slider
              min={0}
              max={100}
              step={10}
              value={record.progress}
              disabled={updatingItemId === record.id}
              onChangeComplete={(val) => handleProgressChange(record.id, val)}
            />
          )}
          {record.completionDate && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Completed: {dayjs(record.completionDate).format('YYYY-MM-DD')}
            </Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <span>Performance Improvement Plan Details</span>
          <Tag color={pip.status === 'ACTIVE' ? 'orange' : 'green'}>{pip.status}</Tag>
        </Space>
      }
      width={800}
      open={visible}
      onClose={onClose}
      destroyOnClose
    >
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Employee">
          {pip.employee?.firstName} {pip.employee?.lastName} ({pip.employee?.employeeId})
        </Descriptions.Item>
        <Descriptions.Item label="Department / Title">
          {pip.employee?.department?.name || 'N/A'} - {pip.employee?.position?.title || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Start Date">
          {dayjs(pip.startDate).format('YYYY-MM-DD')}
        </Descriptions.Item>
        <Descriptions.Item label="Target End Date">
          {dayjs(pip.endDate).format('YYYY-MM-DD')}
        </Descriptions.Item>
        <Descriptions.Item label="Primary Objective" span={2}>
          <Text strong>{pip.objective}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Performance Gap Reason" span={2}>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {pip.reason}
          </Paragraph>
        </Descriptions.Item>
      </Descriptions>

      <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong>Overall Plan Milestone Progress:</Text>
          <Progress percent={totalProgress} style={{ width: 250 }} />
        </Space>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>Action Items & Remediation Steps</Title>
        {canUpdate && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddItemModalOpen(true)}
          >
            Add Action Item
          </Button>
        )}
      </div>

      <Table
        dataSource={pip.items || []}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        bordered
      />

      {/* Add Item Modal */}
      <Modal
        title="Add Remediation Action Item"
        open={addItemModalOpen}
        onOk={handleAddItemSubmit}
        onCancel={() => {
          addForm.resetFields();
          setAddItemModalOpen(false);
        }}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            name="action"
            label="Specific Actionable Task"
            rules={[{ required: true, message: 'Please describe the task or training action' }]}
          >
            <Input placeholder="e.g. Complete Unit Testing Bootcamp and refactor Module X" />
          </Form.Item>

          <Form.Item
            name="target"
            label="Target Verification Metric"
            rules={[{ required: true, message: 'Please state the measurable success target' }]}
          >
            <Input placeholder="e.g. 90% test coverage with 0 regression defects" />
          </Form.Item>

          <Form.Item
            name="owner"
            label="Assignee / Owner"
            initialValue={`${pip.employee?.firstName} ${pip.employee?.lastName}`}
            rules={[{ required: true, message: 'Please specify owner' }]}
          >
            <Input placeholder="Owner name" />
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="Target Due Date"
            rules={[{ required: true, message: 'Please select target completion date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};
