import { Card, Col, Row, Statistic, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  computeApprovalProgress,
  computeFillRate,
  countDeviations,
  countShortfalls,
} from '../../types/planLine';
import { fillRateColor } from '../../data/mockPlans';

interface KpiStripProps {
  lines: PlanLine[];
}

export default function KpiStrip({ lines }: KpiStripProps) {
  const fillRate = computeFillRate(lines);
  const shortfalls = countShortfalls(lines);
  const deviations = countDeviations(lines);
  const { approved, total } = computeApprovalProgress(lines);
  const allApproved = total > 0 && approved === total;

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={8} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic
            title="Fill rate"
            value={fillRate}
            suffix="%"
            valueStyle={{ color: fillRateColor(fillRate) }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic
            title="Shortfalls"
            value={shortfalls}
            valueStyle={{ color: shortfalls > 0 ? '#cf1322' : undefined }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic
            title="Deviations"
            value={deviations}
            valueStyle={{ color: deviations > 0 ? '#d48806' : undefined }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic title="Total NSN lines" value={lines.length} />
        </Card>
      </Col>
      <Col xs={12} sm={8} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic
            title="Approval status"
            value={`${approved}/${total}`}
            valueStyle={{
              color: allApproved ? '#00636a' : approved > 0 ? '#d48806' : undefined,
              fontSize: 24,
            }}
          />
          {allApproved && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Fully approved
            </Typography.Text>
          )}
        </Card>
      </Col>
    </Row>
  );
}
