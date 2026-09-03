import { Space, Tag } from 'antd';
import type { LineStatus, PlanLine } from '../../types/planLine';
import { formatLineStatus, getLineStatuses } from '../../types/planLine';

const STATUS_TAG_COLORS: Record<LineStatus, string> = {
  Available: 'success',
  Deviation: 'warning',
  Shortfall: 'error',
};

export default function LineStatusTags({
  line,
  className = 'line-status-tags',
}: {
  line: PlanLine;
  className?: string;
}) {
  const statuses = getLineStatuses(line);

  return (
    <Space size={[4, 4]} wrap className={className}>
      {statuses.map((status) => (
        <Tag key={status} color={STATUS_TAG_COLORS[status]}>
          {formatLineStatus(status)}
        </Tag>
      ))}
    </Space>
  );
}
