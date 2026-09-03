import { Space, Tag } from 'antd';
import type { PlanLine } from '../../types/planLine';
import { formatFulfillmentStatus, getFulfillmentStatus } from '../../types/planLine';

const FULFILLMENT_TAG_COLORS = {
  'Partially fulfilled': 'processing',
  Fulfilled: 'success',
} as const;

export default function FulfillmentStatusTags({
  line,
  className = 'fulfillment-status-tags',
}: {
  line: PlanLine;
  className?: string;
}) {
  const status = getFulfillmentStatus(line);
  if (!status) return <span className={className}>—</span>;

  return (
    <Space size={[4, 4]} wrap className={className}>
      <Tag color={FULFILLMENT_TAG_COLORS[status]}>{formatFulfillmentStatus(status)}</Tag>
    </Space>
  );
}
