import { Card, Col, Row, Statistic } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  countAircraftCannibalised,
  countApprovedPackLines,
  countDeviations,
  computeFillRate,
  computeShortfallResolvedProgress,
} from '../../types/planLine';
import { fillRateColor } from '../../data/mockPlans';

interface KpiStripProps {
  lines: PlanLine[];
}

export default function KpiStrip({ lines }: KpiStripProps) {
  const fillRate = computeFillRate(lines);
  const { resolved: shortfallsResolved, total: shortfallTotal } =
    computeShortfallResolvedProgress(lines);
  const deviations = countDeviations(lines);
  const aircraftCannibalised = countAircraftCannibalised(lines);
  const approvedLines = countApprovedPackLines(lines);

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={8} md={4} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic
            title="Fill rate"
            value={fillRate}
            suffix="%"
            valueStyle={{ color: fillRateColor(fillRate) }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={4} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic
            title="Shortfall resolved"
            value={`${shortfallsResolved}/${shortfallTotal}`}
            valueStyle={{ fontSize: 24 }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={4} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic title="Deviations" value={deviations} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={4} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic title="Aircraft cannibalised" value={aircraftCannibalised} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={4} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic title="NSN lines" value={lines.length} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={4} flex="1 1 0">
        <Card size="small" style={{ height: '100%' }}>
          <Statistic
            title="Approved lines"
            value={approvedLines}
            valueStyle={{ color: approvedLines > 0 ? '#00636a' : undefined }}
          />
        </Card>
      </Col>
    </Row>
  );
}
