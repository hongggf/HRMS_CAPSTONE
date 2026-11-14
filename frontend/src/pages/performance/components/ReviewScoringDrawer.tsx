import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Tag,
  Alert,
  Card,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  LockOutlined,
  SendOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { PerformanceReview, Goal } from '../../../types/performance';
import { normalizeApiError } from '../../../api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ReviewScoringDrawerProps {
  visible: boolean;
  onClose: () => void;
  review: PerformanceReview | null;
  goals: Goal[];
  onSubmitScores: (payload: {
    ratings: { goalId: number; rating: number; comment?: string }[];
    comments?: string;
    employeeFeedback?: string;
    managerFeedback?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const ReviewScoringDrawer: React.FC<ReviewScoringDrawerProps> = ({
  visible,
  onClose,
  review,
  goals,
  onSubmitScores,
  isSubmitting = false,
}) => {
  const [form] = Form.useForm();
  const [ratingsState, setRatingsState] = useState<Record<number, number>>({});
  const isFinalized = review?.status === 'FINALIZED';

  // Initialize form and local state when review or drawer opens
  useEffect(() => {
    if (visible && review) {
      const initialRatings: Record<number, number> = {};
      review.ratings?.forEach((r) => {
        initialRatings[r.goalId] = r.rating;
      });

      // Default ratings from goals if not already set
      goals.forEach((g) => {
        if (initialRatings[g.id] === undefined) {
          initialRatings[g.id] = 3.0; // default middle rating
        }
      });

      setRatingsState(initialRatings);

      form.setFieldsValue({
        comments: review.comments || '',
        employeeFeedback: review.employeeFeedback || '',
        managerFeedback: review.managerFeedback || '',
        ratings: initialRatings,
      });
    } else {
      form.resetFields();
      setRatingsState({});
    }
  }, [visible, review, goals, form]);

  // Real-time weighted score calculation
  const calculatedOverallScore = React.useMemo(() => {
    if (goals.length === 0) return 0;
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const g of goals) {
      const rating = ratingsState[g.id] ?? 0;
      totalWeightedScore += rating * g.weight;
      totalWeight += g.weight;
    }

    return totalWeight > 0
      ? Number((totalWeightedScore / totalWeight).toFixed(2))
      : 0;
  }, [goals, ratingsState]);

  const handleRatingChange = (goalId: number, value: number | null) => {
    const val = value ?? 0;
    setRatingsState((prev) => ({ ...prev, [goalId]: val }));
  };

  const handleFinish = async (values: any) => {
    if (goals.length === 0) {
      message.error('Employee has no defined goals to evaluate in this cycle');
      return;
    }

    const ratingsPayload = goals.map((g) => ({
      goalId: g.id,
      rating: ratingsState[g.id] ?? 0,
      comment: values[`comment_${g.id}`] || undefined,
    }));

    try {
      await onSubmitScores({
        ratings: ratingsPayload,
        comments: values.comments,
        employeeFeedback: values.employeeFeedback,
        managerFeedback: values.managerFeedback,
      });
      message.success('Performance review evaluated successfully');
      onClose();
    } catch (err) {
      const norm = normalizeApiError(err);
      message.error(norm.message);
    }
  };

  if (!review) return null;

  return (
    <Drawer
      title={
        <Space>
          <span>Review Evaluation & Scoring</span>
          {isFinalized ? (
            <Tag color="red" icon={<LockOutlined />}>
              FINALIZED (Locked)
            </Tag>
          ) : (
            <Tag color="blue">{review.status}</Tag>
          )}
        </Space>
      }
      width={720}
      open={visible}
      onClose={onClose}
      destroyOnClose
    >
      {isFinalized && (
        <Alert
          title="Review Finalized & Locked"
          description="This performance evaluation has been finalized by executive HR and is stored as an immutable audit record. Modification is disabled."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Employee & Cycle Card */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space direction="horizontal" size="middle">
            <Text strong>Employee:</Text>
            <Text>
              {review.employee?.firstName} {review.employee?.lastName} (
              {review.employee?.employeeId})
            </Text>
          </Space>
          <Space direction="horizontal" size="middle">
            <Text strong>Department / Title:</Text>
            <Text>
              {review.employee?.department?.name || 'N/A'} -{' '}
              {review.employee?.position?.title || 'N/A'}
            </Text>
          </Space>
          <Space direction="horizontal" size="middle">
            <Text strong>Evaluation Cycle:</Text>
            <Text>{review.cycle?.name || `Cycle #${review.cycleId}`}</Text>
          </Space>
          <Space orientation="horizontal" size="middle">
            <Text strong>Current Overall Score:</Text>
            <Tag
              color={review.overallScore ? 'green' : 'default'}
              style={{ fontSize: 14 }}
            >
              {review.overallScore !== null && review.overallScore !== undefined
                ? review.overallScore.toFixed(2)
                : 'Not Yet Scored'}
            </Tag>
          </Space>
        </Space>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        disabled={isFinalized}
      >
        <Title level={5}>Goal-by-Goal Scoring (Scale: 0.0 to 5.0)</Title>
        <Paragraph type="secondary">
          Assign scores between 0 and 5 based on key results and goal metrics.
          Overall score is weighted automatically.
        </Paragraph>

        {goals.length === 0 ? (
          <Alert
            type="info"
            title="No goals found"
            description="No assigned goals were found for this employee in the cycle. Add goals first before scoring."
            style={{ marginBottom: 16 }}
          />
        ) : (
          goals.map((g) => (
            <Card
              key={g.id}
              size="small"
              title={`${g.title} (Weight: ${g.weight}%)`}
              style={{ marginBottom: 12 }}
            >
              <Text
                type="secondary"
                style={{ display: 'block', marginBottom: 8 }}
              >
                {g.description || 'No description provided'}
                {g.target && ` | Target: ${g.target}`}
              </Text>

              <Form.Item
                label="Score (0.00 - 5.00)"
                required
                style={{ marginBottom: 8 }}
              >
                <InputNumber
                  min={0}
                  max={5}
                  step={0.1}
                  precision={2}
                  style={{ width: 140 }}
                  value={ratingsState[g.id]}
                  onChange={(val) => handleRatingChange(g.id, val)}
                  disabled={isFinalized}
                />
              </Form.Item>

              <Form.Item
                name={`comment_${g.id}`}
                label="Goal Feedback / Justification"
                style={{ marginBottom: 0 }}
              >
                <Input
                  placeholder="Optional goal accomplishment note"
                  disabled={isFinalized}
                />
              </Form.Item>
            </Card>
          ))
        )}

        <Divider />

        {/* Real-time weighted computation preview */}
        <Card
          size="small"
          style={{
            marginBottom: 16,
            borderColor: '#91caff',
            backgroundColor: '#e6f4ff',
          }}
        >
          <Space
            align="center"
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <Space>
              <CalculatorOutlined style={{ fontSize: 18, color: '#1677ff' }} />
              <Text strong>Calculated Weighted Score:</Text>
            </Space>
            <Title level={4} style={{ margin: 0, color: '#0958d9' }}>
              {calculatedOverallScore.toFixed(2)} / 5.00
            </Title>
          </Space>
        </Card>

        <Form.Item
          name="comments"
          label="Overall Appraisal Comments"
          rules={[
            {
              required: true,
              message: 'Please provide overall evaluation feedback',
            },
          ]}
        >
          <TextArea
            rows={3}
            placeholder="Synthesize overall quarterly/annual performance, achievements, and impact"
            disabled={isFinalized}
          />
        </Form.Item>

        <Form.Item
          name="managerFeedback"
          label="Manager Recommendation / Next Steps"
        >
          <TextArea
            rows={2}
            placeholder="Areas for improvement, promotion recommendation, training suggestions"
            disabled={isFinalized}
          />
        </Form.Item>

        <Form.Item
          name="employeeFeedback"
          label="Employee Self-Assessment / Comments"
        >
          <TextArea
            rows={2}
            placeholder="Employee notes or acknowledgments"
            disabled={isFinalized}
          />
        </Form.Item>

        {!isFinalized && (
          <Space style={{ marginTop: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={isSubmitting}
            >
              Submit Evaluation
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        )}
      </Form>
    </Drawer>
  );
};
