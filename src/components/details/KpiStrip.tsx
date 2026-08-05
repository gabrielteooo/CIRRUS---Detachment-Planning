import { Card, Col, Row, Statistic, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  computeApprovalProgress,
  computeFillRate,
  computeShortfallResolvedProgress,
  countAircraftCannibalised,
  countDeviations,
} from '../../types/planLine';
import { fillRateColor } from '../../data/mockPlans';

interface KpiStripProps {
  lines: PlanLine[];
}

export default function KpiStrip({ lines }: KpiStripProps) {
  const fillRate = computeFillRate(lines);
  const { resolved: shortfallsResolved, total: shortfallTotal } =
    computeShortfallResolvedProgress(lines);
  const { approved, total } = computeApprovalProgress(lines);
  const aircraftCannibalised = countAircraftCannibalised(lines);
  const deviations = countDeviations(lines);
  const allApproved = total > 0 && approved === total;
  const allShortfallsResolved =
    shortfallTotal > 0 && shortfallsResolved === shortfallTotal;

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
            title="Shortfall resolved"
            value={`${shortfallsResolved}/${shortfallTotal}`}
            valueStyle={{
              color: allShortfallsResolved
                ? '#00636a'
                : shortfallsResolved > 0
                  ? '#d48806'
                  : shortfallTotal > 0
                    ? '#cf1322'
                    : undefined,
              fontSize: 24,
            }}
          />
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
      <Col xs={12} sm={8} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic title="Aircraft cannibalised" value={aircraftCannibalised} />
        </Card>
      </Col>
      <Col xs={12} sm={8} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic title="Deviations" value={deviations} />
        </Card>
      </Col>
      <Col xs={12} sm={8} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic title="NSN lines" value={lines.length} />
        </Card>
      </Col>
    </Row>
  );
}
