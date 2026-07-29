import { Card, Col, Row, Tag, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { DetachmentPlan } from '../../types/detachment';
import { fillRateColor, formatPlatformVariant } from '../../data/mockPlans';
import { formatDate } from '../../utils/planUtils';
import { isPastPlanViewOnly } from '../../context/AppContext';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  'Partially Approved': 'processing',
  Approved: 'success',
};

interface PlanCardProps {
  plan: DetachmentPlan;
  showCreator?: boolean;
}

export default function PlanCard({ plan, showCreator }: PlanCardProps) {
  const navigate = useNavigate();
  const isPast = isPastPlanViewOnly(plan);

  return (
    <Card
      hoverable
      onClick={() => navigate(`/detachment-planning/${plan.id}`)}
      style={{
        opacity: isPast ? 0.85 : 1,
        background: isPast ? '#fafafa' : '#fff',
        borderColor: isPast ? '#d9d9d9' : undefined,
      }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <Typography.Text strong style={{ fontSize: 16, flex: 1, minWidth: 0 }}>
            {plan.name}
          </Typography.Text>
          <Tag color={STATUS_COLORS[plan.status]} style={{ flexShrink: 0 }}>
            {plan.status}
          </Tag>
        </div>

        <Typography.Text type="secondary">
          {formatPlatformVariant(plan.platform, plan.variant)}
        </Typography.Text>

        {showCreator && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Created by {plan.createdByName}
          </Typography.Text>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginTop: 4,
            padding: '12px 8px',
            background: isPast ? '#f0f0f0' : '#f5f8f8',
            borderRadius: 6,
            border: '1px solid #e8eded',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}
            >
              Fill rate
            </Typography.Text>
            <Typography.Text
              strong
              style={{ fontSize: 22, lineHeight: 1, color: fillRateColor(plan.fillRatePercent) }}
            >
              {plan.fillRatePercent}%
            </Typography.Text>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e2e2', borderRight: '1px solid #e2e2e2' }}>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}
            >
              Shortfalls
            </Typography.Text>
            <Typography.Text
              strong
              style={{
                fontSize: 22,
                lineHeight: 1,
                color: plan.shortfallCount > 0 ? '#cf1322' : 'rgba(0,0,0,0.88)',
              }}
            >
              {plan.shortfallCount}
            </Typography.Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}
            >
              Deviations
            </Typography.Text>
            <Typography.Text
              strong
              style={{
                fontSize: 22,
                lineHeight: 1,
                color: plan.deviationCount > 0 ? '#d48806' : 'rgba(0,0,0,0.88)',
              }}
            >
              {plan.deviationCount}
            </Typography.Text>
          </div>
        </div>

        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Detachment: {formatDate(plan.detachmentDate)}
        </Typography.Text>
      </Space>
    </Card>
  );
}

export function PlanCardGrid({
  plans,
  showCreator,
}: {
  plans: DetachmentPlan[];
  showCreator?: boolean;
}) {
  if (plans.length === 0) {
    return (
      <Typography.Text type="secondary" style={{ display: 'block', padding: 40, textAlign: 'center' }}>
        No detachment plans found.
      </Typography.Text>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {plans.map((plan) => (
        <Col key={plan.id} xs={24} sm={12} md={8} lg={6}>
          <PlanCard plan={plan} showCreator={showCreator} />
        </Col>
      ))}
    </Row>
  );
}
