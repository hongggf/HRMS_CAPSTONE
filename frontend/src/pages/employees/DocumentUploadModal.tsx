import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Upload,
  Button,
  Progress,
  Alert,
  Typography,
  Space,
  message,
} from 'antd';
import { InboxOutlined, UploadOutlined, RedoOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { employeeApi } from '../../api/employee';
import {
  DOCUMENT_TYPE_LABELS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_EXTENSIONS,
} from '../../types/employee';
import { normalizeApiError } from '../../api/client';

const { Text } = Typography;

interface DocumentUploadModalProps {
  open: boolean;
  employeeId: number;
  employeeName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  open,
  employeeId,
  employeeName,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleReset = () => {
    form.resetFields();
    setFileList([]);
    setUploading(false);
    setUploadPercent(0);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    if (uploading) return;
    handleReset();
    onClose();
  };

  const beforeUpload = (file: File) => {
    setErrorMessage(null);

    // 1. File size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const err = `File exceeds the maximum allowed size of 5 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB uploaded).`;
      setErrorMessage(err);
      message.error(err);
      return Upload.LIST_IGNORE;
    }

    // 2. Allowed extension validation
    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExt)) {
      const err = `Invalid file type "${fileExt}". Allowed formats: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`;
      setErrorMessage(err);
      message.error(err);
      return Upload.LIST_IGNORE;
    }

    setFileList([file as unknown as UploadFile]);
    return false; // Prevent automatic antd upload
  };

  const handleSubmit = async () => {
    if (uploading) return; // Prevent duplicate clicks

    try {
      const values = await form.validateFields();
      if (fileList.length === 0) {
        setErrorMessage('Please select a file to upload.');
        return;
      }

      const fileObj = (fileList[0].originFileObj || fileList[0]) as unknown as File;
      setUploading(true);
      setUploadPercent(0);
      setErrorMessage(null);
      setSuccessMessage(null);

      await employeeApi.uploadDocument(
        employeeId,
        fileObj,
        values.documentType,
        (percent) => {
          setUploadPercent(percent);
        },
      );

      setSuccessMessage('Document uploaded and attached successfully.');
      message.success('Document uploaded successfully');
      setTimeout(() => {
        handleReset();
        onSuccess();
      }, 700);
    } catch (err: unknown) {
      const normalized = normalizeApiError(err);
      setErrorMessage(normalized.message || 'Failed to upload document. Please retry.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title="Upload Employee Document"
      open={open}
      onCancel={handleClose}
      destroyOnClose
      maskClosable={!uploading}
      closable={!uploading}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>,
        errorMessage && (
          <Button
            key="retry"
            icon={<RedoOutlined />}
            onClick={handleSubmit}
            disabled={uploading || fileList.length === 0}
          >
            Retry Upload
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          icon={<UploadOutlined />}
          loading={uploading}
          disabled={uploading || fileList.length === 0}
          onClick={handleSubmit}
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Uploading official record for employee: <Text strong>{employeeName}</Text>
        </Text>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          message="Upload Failed"
          description={errorMessage}
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="documentType"
          label="Document Classification"
          rules={[{ required: true, message: 'Please select a document type' }]}
        >
          <Select
            placeholder="Select verified document type"
            disabled={uploading}
            options={Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Form.Item>

        <Form.Item label="File Attachment" required>
          <Upload.Dragger
            fileList={fileList}
            beforeUpload={beforeUpload}
            onRemove={() => {
              if (!uploading) {
                setFileList([]);
                setErrorMessage(null);
              }
            }}
            disabled={uploading}
            maxCount={1}
            accept={ALLOWED_FILE_EXTENSIONS.join(',')}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#1677ff' }} />
            </p>
            <p className="ant-upload-text">
              Click or drag document to this area to attach
            </p>
            <p className="ant-upload-hint">
              Allowed formats: PDF, PNG, JPG, JPEG, DOC, DOCX. Maximum file size: 5 MB.
            </p>
          </Upload.Dragger>
        </Form.Item>
      </Form>

      {uploading && (
        <div style={{ marginTop: 12 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13 }}>Uploading file securely...</Text>
              <Text strong style={{ fontSize: 13 }}>{uploadPercent}%</Text>
            </div>
            <Progress percent={uploadPercent} status="active" showInfo={false} />
          </Space>
        </div>
      )}
    </Modal>
  );
};
