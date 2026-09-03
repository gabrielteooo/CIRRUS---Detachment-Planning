import { useMemo, useState } from 'react';
import { App, Button, Space, Tabs, Tag, Typography } from 'antd';
import { CopyOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { useApp } from '../../context/AppContext';
import type { Detachment, PlatformPlan } from '../../types/detachment';
import { formatDateRange } from '../../utils/planUtils';
import {
  formatLSeriesVersions,
  formatPlatformVariant,
  formatPlanOperationalParameters,
  formatVariantLabels,
} from '../../utils/planDisplayUtils';
import {
  applyOfflineApprovalToLines,
  countApprovalPackLines,
  countApprovedPackLines,
  countAwaitingSparesLines,
  countWorkQueueLines,
  syncLineIssuance,
  syncPlanLinesIssuance,
} from '../../types/planLine';
import type { OfflineApprovalRecord, PlanLine } from '../../types/planLine';
import { isPolLine } from '../../types/planLine';
import type { NsnCatalogEntry } from '../../data/nsnCatalog';
import { createAddedPlanLines } from '../../utils/addedPlanLines';
import { showAddedNsnToast, showPlanLineSaveToast } from '../../utils/planLineToasts';
import KpiStrip from './KpiStrip';
import WorkQueueTab from './WorkQueueTab';
import AwaitingSparesTab from './AwaitingSparesTab';
import ApprovalPackTab from './ApprovalPackTab';
import ApprovedTab from './ApprovedTab';
import LSeriesTable from './LSeriesTable';
import AddNsnDrawer from './AddNsnDrawer';
import InventoryDrawer from './InventoryDrawer';
import SparesDetailPlaceholderModal from './SparesDetailPlaceholderModal';
import EditLineDrawer from './EditLineDrawer';
import EditPolLineDrawer from './EditPolLineDrawer';
import EditParametersModal from './EditParametersModal';
import RemarksModal from './RemarksModal';
import IssuedQtyDrawer from './IssuedQtyDrawer';
import DuplicatePlanModal from '../plans/DuplicatePlanModal';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  'Partially Approved': 'processing',
  Approved: 'success',
};

type PlanTabKey =
  | 'work-queue'
  | 'awaiting-supply'
  | 'all-components'
  | 'approval-pack'
  | 'approved';

interface PlanDetailsContentProps {
  plan: PlatformPlan;
  detachment: Detachment;
  viewOnly: boolean;
}

export default function PlanDetailsContent({
  plan,
  detachment,
  viewOnly,
}: PlanDetailsContentProps) {
  const { message } = App.useApp();
  const { getPlanLines, updatePlanLines, updatePlan } = useApp();
  const planId = plan.id;
  const lines = getPlanLines(planId);

  const [activeTab, setActiveTab] = useState<PlanTabKey>('work-queue');
  const [inventoryLine, setInventoryLine] = useState<PlanLine | null>(null);
  const [sparesDetailLine, setSparesDetailLine] = useState<PlanLine | null>(null);
  const [editLine, setEditLine] = useState<PlanLine | null>(null);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [editParamsOpen, setEditParamsOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [addNsnOpen, setAddNsnOpen] = useState(false);
  const [issuedLine, setIssuedLine] = useState<PlanLine | null>(null);

  const existingNsns = useMemo(() => lines.map((line) => line.nsn), [lines]);
  const variantLabel = formatVariantLabels(plan);
  const workQueueCount = countWorkQueueLines(lines);
  const awaitingSparesCount = countAwaitingSparesLines(lines);
  const approvalPackCount = countApprovalPackLines(lines);
  const approvedCount = countApprovedPackLines(lines);

  const openEditLine = (line: PlanLine) => {
    setEditLine(line);
  };

  const closeEditLine = () => {
    setEditLine(null);
  };

  const handleSaveLine = (updated: PlanLine) => {
    const previous = lines.find((l) => l.id === updated.id);
    const synced = syncLineIssuance(updated);
    const next = lines.map((l) => (l.id === synced.id ? synced : l));
    updatePlanLines(planId, syncPlanLinesIssuance(next));
    if (isPolLine(updated)) {
      message.success('POL line updated');
      return;
    }
    showPlanLineSaveToast(message, previous, synced);
  };

  const handleSaveIssuedQty = (line: PlanLine, issuedQty: number) => {
    const next = lines.map((l) =>
      l.id === line.id ? syncLineIssuance({ ...l, issuedQty }) : l,
    );
    updatePlanLines(planId, syncPlanLinesIssuance(next));
    message.success('Issued qty updated');
  };

  const handleAddNsns = (entries: NsnCatalogEntry[], deviationReason: string) => {
    const newLines = createAddedPlanLines(planId, entries, deviationReason, plan.platform).reverse();
    updatePlanLines(planId, [...newLines, ...lines]);
    showAddedNsnToast(message);
    setActiveTab('work-queue');
  };

  const handleDeleteLine = (line: PlanLine) => {
    updatePlanLines(
      planId,
      lines.filter((l) => l.id !== line.id),
    );
    message.success('NSN removed');
  };

  const handleApproveLines = (lineIds: string[], approval: OfflineApprovalRecord) => {
    updatePlanLines(planId, applyOfflineApprovalToLines(lines, lineIds, approval));
  };

  const tabItems = [
    {
      key: 'work-queue',
      label: `Action required${workQueueCount > 0 ? ` (${workQueueCount})` : ''}`,
      children: (
        <WorkQueueTab
          lines={lines}
          platform={plan.platform}
          variant={variantLabel}
          viewOnly={viewOnly}
          onEditLine={openEditLine}
          onViewInventory={setInventoryLine}
          onEditIssued={setIssuedLine}
          onViewNsn={setSparesDetailLine}
        />
      ),
    },
    {
      key: 'awaiting-supply',
      label: `Awaiting supply${awaitingSparesCount > 0 ? ` (${awaitingSparesCount})` : ''}`,
      children: (
        <AwaitingSparesTab
          lines={lines}
          platform={plan.platform}
          variant={variantLabel}
          viewOnly={viewOnly}
          onEditLine={openEditLine}
          onViewInventory={setInventoryLine}
          onEditIssued={setIssuedLine}
          onViewNsn={setSparesDetailLine}
        />
      ),
    },
    {
      key: 'all-components',
      label: 'All components',
      children: (
        <LSeriesTable
          lines={lines}
          platform={plan.platform}
          variant={variantLabel}
          viewOnly={viewOnly}
          onEditLine={openEditLine}
          onViewInventory={setInventoryLine}
          onEditIssued={setIssuedLine}
          onViewNsn={setSparesDetailLine}
          onAddNsn={() => setAddNsnOpen(true)}
          onDeleteLine={handleDeleteLine}
        />
      ),
    },
    {
      key: 'approval-pack',
      label: `Approval pack${approvalPackCount > 0 ? ` (${approvalPackCount})` : ''}`,
      children: (
        <ApprovalPackTab
          lines={lines}
          platform={plan.platform}
          variant={variantLabel}
          viewOnly={viewOnly}
          onEditLine={openEditLine}
          onViewInventory={setInventoryLine}
          onViewNsn={setSparesDetailLine}
          onApproveLines={handleApproveLines}
          onSaved={() => setActiveTab('approved')}
        />
      ),
    },
    {
      key: 'approved',
      label: `Approved${approvedCount > 0 ? ` (${approvedCount})` : ''}`,
      children: (
        <ApprovedTab
          lines={lines}
          platform={plan.platform}
          variant={variantLabel}
          viewOnly={viewOnly}
          onEditLine={openEditLine}
          onViewInventory={setInventoryLine}
          onViewNsn={setSparesDetailLine}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="plan-summary-header">
        <div className="plan-summary-header-row plan-summary-header-row--meta">
          <div className="plan-summary-meta">
            <Typography.Text>
              <strong>{formatPlatformVariant(plan.platform, plan)}</strong>
            </Typography.Text>
            <Typography.Text type="secondary" className="plan-summary-divider">
              |
            </Typography.Text>
            <Typography.Text type="secondary">
              L-series: {formatLSeriesVersions(plan)}
            </Typography.Text>
            <Typography.Text type="secondary" className="plan-summary-divider">
              |
            </Typography.Text>
            <Typography.Text type="secondary">
              {plan.platform === 'F-16' ? 'Flying hours' : 'No. of aircraft'}:{' '}
              {formatPlanOperationalParameters(plan)}
            </Typography.Text>
            <Typography.Text type="secondary" className="plan-summary-divider">
              |
            </Typography.Text>
            <Typography.Text type="secondary">
              Plan dates: {formatDateRange(plan.planDateStart, plan.planDateEnd)}
            </Typography.Text>
          </div>
          <Tag color={STATUS_COLORS[plan.status]} className="plan-summary-status">
            {plan.status}
          </Tag>
        </div>

        <div className="plan-summary-header-row plan-summary-header-row--actions">
          <Space wrap>
            {!viewOnly && (
              <>
                <Button icon={<EditOutlined />} onClick={() => setEditParamsOpen(true)}>
                  Edit parameters
                </Button>
                <Button icon={<CopyOutlined />} onClick={() => setDuplicateOpen(true)}>
                  Duplicate plan
                </Button>
                <Button icon={<FileTextOutlined />} onClick={() => setRemarksOpen(true)}>
                  Plan remarks
                </Button>
              </>
            )}
            {viewOnly && (
              <Button icon={<FileTextOutlined />} onClick={() => setRemarksOpen(true)}>
                View remarks
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div className="plan-details-content">
        <section className="plan-details-kpi">
          <KpiStrip lines={lines} />
        </section>

        <section className="plan-details-tabs">
          <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as PlanTabKey)} items={tabItems} />
        </section>
      </div>

      <InventoryDrawer
        line={inventoryLine}
        open={!!inventoryLine}
        sparesRequiredBy={detachment.detachmentDateStart}
        onClose={() => setInventoryLine(null)}
      />

      <IssuedQtyDrawer
        line={issuedLine}
        open={!!issuedLine}
        viewOnly={viewOnly}
        onClose={() => setIssuedLine(null)}
        onSave={handleSaveIssuedQty}
      />

      <SparesDetailPlaceholderModal
        line={sparesDetailLine}
        open={!!sparesDetailLine}
        onClose={() => setSparesDetailLine(null)}
      />

      {editLine && isPolLine(editLine) ? (
        <EditPolLineDrawer
          line={editLine}
          open={!!editLine}
          onClose={closeEditLine}
          onSave={handleSaveLine}
        />
      ) : (
        <EditLineDrawer
          line={editLine}
          open={!!editLine}
          onClose={closeEditLine}
          onSave={handleSaveLine}
          planNeedByDate={plan.needByDate}
        />
      )}

      <AddNsnDrawer
        open={addNsnOpen}
        existingNsns={existingNsns}
        onClose={() => setAddNsnOpen(false)}
        onAdd={handleAddNsns}
      />

      <EditParametersModal
        open={editParamsOpen}
        onClose={() => setEditParamsOpen(false)}
        plan={plan}
        detachment={detachment}
        onSave={(updates) => updatePlan(planId, updates)}
      />

      <RemarksModal
        open={remarksOpen}
        onClose={() => setRemarksOpen(false)}
        remarks={plan.remarks ?? ''}
        viewOnly={viewOnly}
        onSave={(remarks) => updatePlan(planId, { remarks })}
      />

      <DuplicatePlanModal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        plan={plan}
        detachment={detachment}
      />
    </div>
  );
}
