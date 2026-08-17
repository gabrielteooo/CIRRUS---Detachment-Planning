import { useMemo, useState } from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  computeFillRate,
  computeShortfallResolvedProgress,
  getCannibalisedEntries,
  getWaitEntries,
} from '../../types/planLine';
import { fillRateColor } from '../../data/mockPlans';
import { formatDate } from '../../utils/planUtils';
import CannibalisedModal from './CannibalisedModal';
import WaitModal from './WaitModal';
import { formatCannibalisedItemLabel } from '../../utils/tailNumber';

interface KpiStripProps {
  lines: PlanLine[];
}

const PREVIEW_LIMIT = 2;

function formatWaitLabel(description: string, needByDate: string): string {
  return `${description} - ${formatDate(needByDate)}`;
}

interface ResolutionPreviewCardProps {
  title: string;
  entries: { key: string; label: string }[];
  onOpenModal: () => void;
}

function ResolutionPreviewCard({ title, entries, onOpenModal }: ResolutionPreviewCardProps) {
  const previewEntries = entries.slice(0, PREVIEW_LIMIT);
  const overflowCount = Math.max(0, entries.length - PREVIEW_LIMIT);
  const hasEntries = entries.length > 0;

  return (
    <Card
      className={`kpi-card${hasEntries ? ' kpi-resolution-card' : ''}`}
      style={{ height: '100%', cursor: hasEntries ? 'pointer' : 'default' }}
      onClick={() => {
        if (hasEntries) onOpenModal();
      }}
    >
      <Typography.Text strong className="kpi-card-title">
        {title}
      </Typography.Text>
      {!hasEntries ? (
        <Typography.Text className="kpi-card-value">0</Typography.Text>
      ) : (
        <div className="kpi-resolution-list">
          {previewEntries.map((entry) => (
            <Typography.Text key={entry.key} className="kpi-resolution-line">
              {entry.label}
            </Typography.Text>
          ))}
          {overflowCount > 0 && (
            <Typography.Text type="secondary" className="kpi-resolution-overflow">
              +{overflowCount} more
            </Typography.Text>
          )}
        </div>
      )}
    </Card>
  );
}

export default function KpiStrip({ lines }: KpiStripProps) {
  const [cannibalisedModalOpen, setCannibalisedModalOpen] = useState(false);
  const [waitModalOpen, setWaitModalOpen] = useState(false);

  const fillRate = useMemo(() => computeFillRate(lines), [lines]);
  const { resolved: shortfallsResolved, total: shortfallTotal } =
    computeShortfallResolvedProgress(lines);
  const cannibalisedEntries = useMemo(() => getCannibalisedEntries(lines), [lines]);
  const waitEntries = useMemo(() => getWaitEntries(lines), [lines]);

  const cannibalisedPreview = cannibalisedEntries.map((entry) => ({
    key: `${entry.lineId}-${entry.tailNumber}`,
    label: formatCannibalisedItemLabel(entry.description, entry.tailNumber),
  }));

  const waitPreview = waitEntries.map((entry) => ({
    key: `${entry.lineId}-${entry.needByDate}`,
    label: formatWaitLabel(entry.description, entry.needByDate),
  }));

  return (
    <>
      <Row gutter={16} className="kpi-strip">
        <Col xs={12} sm={6} flex="1 1 0">
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
        <Col xs={12} sm={6} flex="1 1 0">
          <Card className="kpi-card" style={{ height: '100%' }}>
            <Statistic
              title="Shortfall resolved"
              value={`${shortfallsResolved}/${shortfallTotal}`}
              className="kpi-statistic"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6} flex="1 1 0">
          <ResolutionPreviewCard
            title="Cannibalised"
            entries={cannibalisedPreview}
            onOpenModal={() => setCannibalisedModalOpen(true)}
          />
        </Col>
        <Col xs={24} sm={6} flex="1 1 0">
          <ResolutionPreviewCard
            title="Wait"
            entries={waitPreview}
            onOpenModal={() => setWaitModalOpen(true)}
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
    </>
  );
}
