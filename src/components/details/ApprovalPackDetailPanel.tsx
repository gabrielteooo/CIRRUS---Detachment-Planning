import { Button, Checkbox, Tooltip, Typography } from 'antd';
import { EditOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { getMpnForNsn } from '../../data/lSeriesTemplate';
import type { PlanLine } from '../../types/planLine';
import {
  formatDeviationResolution,
  getDeviationDelta,
  getGroupAvailableQty,
  getShortfallDelta,
  hasDeviationCondition,
  hasShortfallCondition,
} from '../../types/planLine';
import { formatDate } from '../../utils/planUtils';
import LineStatusTags from './LineStatusTags';
import { getApprovalPackResolutionSections } from './approvalPackResolutionRows';

interface ApprovalPackDetailPanelProps {
  line: PlanLine;
  showShortfallResolutions: boolean;
  showDeviationReason: boolean;
  viewOnly: boolean;
  approvedForSave: boolean;
  onApproveToggle: (lineId: string, checked: boolean) => void;
  onEdit: (line: PlanLine) => void;
}

function MetricCell({
  label,
  value,
  highlight,
  deviationHighlight,
  info,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  deviationHighlight?: boolean;
  info?: string;
}) {
  const className = [
    'approval-pack-metric',
    highlight ? 'approval-pack-metric--delta' : '',
    deviationHighlight ? 'approval-pack-metric--deviation-delta' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className="approval-pack-metric-label">
        <span>{label}</span>
        {info && (
          <Tooltip title={info}>
            <InfoCircleOutlined className="approval-pack-metric-info" aria-label={info} />
          </Tooltip>
        )}
      </div>
      <Typography.Text strong className="approval-pack-metric-value">
        {value}
      </Typography.Text>
    </div>
  );
}

function formatDeviationDeltaValue(delta: number): string {
  return delta >= 0 ? `+${delta}` : String(delta);
}

function formatResolutionDate(value: string): string {
  if (value === '—') return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value;
}

export default function ApprovalPackDetailPanel({
  line,
  showShortfallResolutions,
  showDeviationReason,
  viewOnly,
  approvedForSave,
  onApproveToggle,
  onEdit,
}: ApprovalPackDetailPanelProps) {
  const availableQty = getGroupAvailableQty(line);
  const shortfallDelta = getShortfallDelta(line);
  const deviationDelta = getDeviationDelta(line);
  const showShortfallDelta = showShortfallResolutions && hasShortfallCondition(line);
  const showDeviationDelta = showDeviationReason && hasDeviationCondition(line);
  const mpn = line.mpn ?? getMpnForNsn(line.nsn);
  const resolutionSections = showShortfallResolutions
    ? getApprovalPackResolutionSections(line)
    : { awaitingSupply: [], cannibalised: [], accept: undefined };

  return (
    <article className="approval-pack-detail-panel">
      <div className="approval-pack-presenter-card-header">
        <div>
          <Typography.Title level={4} className="approval-pack-detail-title">
            {line.description}
          </Typography.Title>
          <Typography.Text type="secondary" className="approval-pack-presenter-card-meta">
            NSN: {line.nsn} | MPN: {mpn}
          </Typography.Text>
          <LineStatusTags line={line} />
        </div>
        {!viewOnly && (
          <div className="approval-pack-presenter-card-actions">
            <Checkbox
              checked={approvedForSave}
              onChange={(event) => onApproveToggle(line.id, event.target.checked)}
            >
              Approve
            </Checkbox>
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label={`Edit ${line.description}`}
              onClick={() => onEdit(line)}
            />
          </div>
        )}
      </div>

      <div className="approval-pack-presenter-metrics">
        <MetricCell label="Required" value={line.requiredQty} />
        <MetricCell label="Available" value={availableQty} />
        <MetricCell label="To-bring" value={line.toBringQty} />
        {showShortfallDelta ? (
          <MetricCell
            label="Delta"
            value={shortfallDelta}
            highlight
            info="Gap between available stock and to-bring qty"
          />
        ) : showDeviationDelta ? (
          <MetricCell
            label="Delta"
            value={formatDeviationDeltaValue(deviationDelta)}
            deviationHighlight
            info="Difference between to-bring and L-series required qty"
          />
        ) : (
          <MetricCell label="Delta" value={shortfallDelta} />
        )}
      </div>

      {showShortfallResolutions && resolutionSections.awaitingSupply.length > 0 && (
        <section className="approval-pack-resolution-section">
          <Typography.Title level={5} className="approval-pack-resolution-section-title">
            Resolution: Awaiting Supply
          </Typography.Title>
          <div className="approval-pack-resolution-table approval-pack-resolution-table--wait">
            <div className="approval-pack-resolution-header">
              <span>To-take qty</span>
              <span>Ordered Qty</span>
              <span>PO no.</span>
              <span>EDD</span>
              <span>S/N</span>
              <span>Remarks</span>
            </div>
            {resolutionSections.awaitingSupply.map((row) => (
              <div key={row.key} className="approval-pack-resolution-row">
                <span>{row.toTakeQty}</span>
                <span>{row.orderedQty}</span>
                <span>{row.poNumber}</span>
                <span>{formatResolutionDate(row.edd)}</span>
                <span>{row.serialNo}</span>
                <span>{row.remarks}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {showShortfallResolutions && resolutionSections.cannibalised.length > 0 && (
        <section className="approval-pack-resolution-section">
          <Typography.Title level={5} className="approval-pack-resolution-section-title">
            Resolution: Cannibalised
          </Typography.Title>
          <div className="approval-pack-resolution-table approval-pack-resolution-table--cannibalise">
            <div className="approval-pack-resolution-header">
              <span>Qty</span>
              <span>Tail no.</span>
              <span>ETR</span>
              <span>QPA</span>
              <span>Remarks</span>
            </div>
            {resolutionSections.cannibalised.map((row) => (
              <div key={row.key} className="approval-pack-resolution-row">
                <span>{row.qty}</span>
                <span>{row.tailNumber}</span>
                <span>{formatResolutionDate(row.etr)}</span>
                <span>{row.qpa}</span>
                <span>{row.remarks}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {showShortfallResolutions && resolutionSections.accept && (
        <section className="approval-pack-resolution-section">
          <Typography.Title level={5} className="approval-pack-resolution-section-title">
            Resolution: Accept shortfall
          </Typography.Title>
          <div className="approval-pack-presenter-reason-value">
            Qty {resolutionSections.accept.qty} — {resolutionSections.accept.remarks}
          </div>
        </section>
      )}

      {showDeviationReason && (
        <section className="approval-pack-resolution-section">
          <Typography.Text type="secondary" className="approval-pack-presenter-reason-label">
            Reason / Remarks
          </Typography.Text>
          {showShortfallDelta && showDeviationDelta && (
            <Typography.Text type="secondary" className="approval-pack-presenter-deviation-delta-note">
              Deviation delta: {formatDeviationDeltaValue(deviationDelta)}
            </Typography.Text>
          )}
          <Typography.Paragraph className="approval-pack-presenter-reason-readonly">
            {formatDeviationResolution(line)}
          </Typography.Paragraph>
        </section>
      )}
    </article>
  );
}
