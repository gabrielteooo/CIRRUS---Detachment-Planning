import { Card, Col, Row, Tag, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { Detachment, PlatformPlan } from '../../types/detachment';
import {
  aggregateDeviations,
  aggregateDetachmentStatus,
  aggregateFillRate,
  aggregateShortfalls,
  fillRateColor,
} from '../../data/mockPlans';
import { formatDate, isPastDetachment } from '../../utils/planUtils';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  'Partially Approved': 'processing',
  Approved: 'success',
};

interface DetachmentCardProps {
  detachment: Detachment;
  plans: PlatformPlan[];
  showCreator?: boolean;
}

export default function DetachmentCard({
  detachment,
  plans,
  showCreator,
}: DetachmentCardProps) {
  const navigate = useNavigate();
  const { getPlanLines } = useApp();
  const isPast = isPastDetachment(detachment);
  const status = aggregateDetachmentStatus(plans, getPlanLines);
  const fillRate = aggregateFillRate(plans, getPlanLines);
  const shortfalls = aggregateShortfalls(plans, getPlanLines);
  const deviations = aggregateDeviations(plans, getPlanLines);
  const platforms = [...new Set(plans.map((p) => p.platform))];

  return (
    <Card
      hoverable
      onClick={() => navigate(`/detachment-planning/${detachment.id}`)}
      style={{
        opacity: isPast ? 0.85 : 1,
        background: isPast ? '#fafafa' : '#fff',
        borderColor: isPast ? '#d9d9d9' : undefined,
      }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <Typography.Text strong style={{ fontSize: 16, flex: 1, minWidth: 0 }}>
            {detachment.name}
          </Typography.Text>
          <Tag color={STATUS_COLORS[status]} style={{ flexShrink: 0 }}>
            {plans.length === 0 ? 'No plans' : status}
          </Tag>
        </div>

        <Space size={4} wrap>
          {platforms.length > 0 ? (
            platforms.map((platform) => (
              <Tag key={platform}>{platform}</Tag>
            ))
          ) : (
            <Typography.Text type="secondary">No platform plans yet</Typography.Text>
          )}
        </Space>

        {showCreator && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Created by {detachment.createdByName}
          </Typography.Text>
        )}

        {plans.length > 0 && (
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
                style={{ fontSize: 22, lineHeight: 1, color: fillRateColor(fillRate) }}
              >
                {fillRate}%
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
                  color: shortfalls > 0 ? '#cf1322' : 'rgba(0,0,0,0.88)',
                }}
              >
                {shortfalls}
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
                  color: deviations > 0 ? '#d48806' : 'rgba(0,0,0,0.88)',
                }}
              >
                {deviations}
              </Typography.Text>
            </div>
          </div>
        )}

        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Detachment: {formatDate(detachment.detachmentDate)}
        </Typography.Text>
      </Space>
    </Card>
  );
}

export function DetachmentCardGrid({
  detachments,
  plans,
  showCreator,
}: {
  detachments: Detachment[];
  plans: PlatformPlan[];
  showCreator?: boolean;
}) {
  if (detachments.length === 0) {
    return (
      <Typography.Text type="secondary" style={{ display: 'block', padding: 40, textAlign: 'center' }}>
        No detachments found.
      </Typography.Text>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {detachments.map((detachment) => (
        <Col key={detachment.id} xs={24} sm={12} md={8} lg={8} xl={8}>
          <DetachmentCard
            detachment={detachment}
            plans={plans.filter((p) => p.detachmentId === detachment.id)}
            showCreator={showCreator}
          />
        </Col>
      ))}
    </Row>
  );
}

/** @deprecated Use DetachmentCard */
export { DetachmentCard as PlanCard, DetachmentCardGrid as PlanCardGrid };
