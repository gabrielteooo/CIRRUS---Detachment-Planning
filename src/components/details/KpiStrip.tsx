import { useMemo, useState } from 'react';
import { Button, Card, Col, Row, Statistic, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  computeFillRate,
  computeShortfallResolvedProgress,
  getAcceptShortfallEntries,
  getCannibalisedEntries,
  getPendingOcApprovalEntries,
  getWaitEntries,
} from '../../types/planLine';
import { fillRateColor } from '../../data/mockPlans';
import AcceptShortfallModal from './AcceptShortfallModal';
import CannibalisedModal from './CannibalisedModal';
import PendingOcApprovalModal from './PendingOcApprovalModal';
import WaitModal from './WaitModal';

interface KpiStripProps {
  lines: PlanLine[];
}

interface KpiInsightCardProps {
  title: string;
  count: number;
  onViewDetails: () => void;
}

function KpiInsightCard({ title, count, onViewDetails }: KpiInsightCardProps) {
  return (
    <Card className="kpi-card kpi-insight-card" style={{ height: '100%' }}>
      <Typography.Text strong className="kpi-card-title">
        {title}
      </Typography.Text>
      <Typography.Text className="kpi-card-value">{count}</Typography.Text>
      {count > 0 && (
        <Button type="link" className="kpi-insight-link" onClick={onViewDetails}>
          View more
        </Button>
      )}
    </Card>
  );
}

export default function KpiStrip({ lines }: KpiStripProps) {
  const [cannibalisedModalOpen, setCannibalisedModalOpen] = useState(false);
  const [waitModalOpen, setWaitModalOpen] = useState(false);
  const [acceptShortfallModalOpen, setAcceptShortfallModalOpen] = useState(false);
  const [pendingOcApprovalModalOpen, setPendingOcApprovalModalOpen] = useState(false);

  const fillRate = useMemo(() => computeFillRate(lines), [lines]);
  const { resolved: shortfallsResolved, total: shortfallTotal } =
    computeShortfallResolvedProgress(lines);
  const cannibalisedEntries = useMemo(() => getCannibalisedEntries(lines), [lines]);
  const waitEntries = useMemo(() => getWaitEntries(lines), [lines]);
  const acceptShortfallEntries = useMemo(() => getAcceptShortfallEntries(lines), [lines]);
  const pendingOcApprovalEntries = useMemo(
    () => getPendingOcApprovalEntries(lines),
    [lines],
  );

  return (
    <>
      <Row gutter={[16, 16]} className="kpi-strip">
        <Col xs={12} sm={8} lg={4} flex="1 1 0">
          <Card className="kpi-card" style={{ height: '100%' }}>
            <Statistic
              title="Fill rate"
              value={fillRate}
              suffix="%"
              className="kpi-statistic"
              valueStyle={{ color: fillRateColor(fillRate) }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4} flex="1 1 0">
          <Card className="kpi-card" style={{ height: '100%' }}>
            <Statistic
              title="Shortfall resolved"
              value={`${shortfallsResolved}/${shortfallTotal}`}
              className="kpi-statistic"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4} flex="1 1 0">
          <KpiInsightCard
            title="Low volume spares"
            count={pendingOcApprovalEntries.length}
            onViewDetails={() => setPendingOcApprovalModalOpen(true)}
          />
        </Col>
        <Col xs={12} sm={8} lg={4} flex="1 1 0">
          <KpiInsightCard
            title="Cannibalised LRU"
            count={cannibalisedEntries.length}
            onViewDetails={() => setCannibalisedModalOpen(true)}
          />
        </Col>
        <Col xs={12} sm={8} lg={4} flex="1 1 0">
          <KpiInsightCard
            title="Awaiting Supply"
            count={waitEntries.length}
            onViewDetails={() => setWaitModalOpen(true)}
          />
        </Col>
        <Col xs={12} sm={8} lg={4} flex="1 1 0">
          <KpiInsightCard
            title="Accept Shortfall"
            count={acceptShortfallEntries.length}
            onViewDetails={() => setAcceptShortfallModalOpen(true)}
          />
        </Col>
      </Row>

      <CannibalisedModal
        open={cannibalisedModalOpen}
        entries={cannibalisedEntries}
        onClose={() => setCannibalisedModalOpen(false)}
      />
      <WaitModal
        open={waitModalOpen}
        entries={waitEntries}
        onClose={() => setWaitModalOpen(false)}
      />
      <AcceptShortfallModal
        open={acceptShortfallModalOpen}
        entries={acceptShortfallEntries}
        onClose={() => setAcceptShortfallModalOpen(false)}
      />
      <PendingOcApprovalModal
        open={pendingOcApprovalModalOpen}
        entries={pendingOcApprovalEntries}
        onClose={() => setPendingOcApprovalModalOpen(false)}
      />
    </>
  );
}
