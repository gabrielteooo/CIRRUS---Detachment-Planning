import { useMemo, useState } from 'react';
import { App, Button, Modal, Space, Tabs, Tag, Typography } from 'antd';
import { EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { useApp } from '../../context/AppContext';
import type { Detachment, PlatformPlan } from '../../types/detachment';
import { formatDate } from '../../utils/planUtils';
import {
  formatLSeriesVersions,
  formatVariantLabels,
  formatVariantRowParameters,
} from '../../utils/planDisplayUtils';
import {
  applyOfflineApproval,
  clearOfflineApproval,
  countApprovalPackLines,
  countWorkQueueLines,
} from '../../types/planLine';
import type { OfflineApprovalRecord, PlanLine } from '../../types/planLine';
import { isPolLine } from '../../types/planLine';
import type { NsnCatalogEntry } from '../../data/nsnCatalog';
import { createAddedPlanLines } from '../../utils/addedPlanLines';
import { showAddedNsnToast, showPlanLineSaveToast } from '../../utils/planLineToasts';
import KpiStrip from './KpiStrip';
import WorkQueueTab from './WorkQueueTab';
import ApprovalPackTab from './ApprovalPackTab';
import LSeriesTable from './LSeriesTable';
import AddNsnDrawer from './AddNsnDrawer';
import InventoryDrawer from './InventoryDrawer';
import NsnDrilldownModal from './NsnDrilldownModal';
import EditLineDrawer from './EditLineDrawer';
import EditPolLineDrawer from './EditPolLineDrawer';
import RemarksModal from './RemarksModal';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  'Partially Approved': 'processing',
  Approved: 'success',
};

type PlanTabKey = 'work-queue' | 'all-components' | 'approval-pack';

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
  const [nsnDrilldownLine, setNsnDrilldownLine] = useState<PlanLine | null>(null);
  const [editLine, setEditLine] = useState<PlanLine | null>(null);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [editParamsOpen, setEditParamsOpen] = useState(false);
  const [addNsnOpen, setAddNsnOpen] = useState(false);

  const existingNsns = useMemo(() => lines.map((line) => line.nsn), [lines]);
  const variantLabel = formatVariantLabels(plan);
  const workQueueCount = countWorkQueueLines(lines);
  const approvalPackCount = countApprovalPackLines(lines);

  const openEditLine = (line: PlanLine) => {
    setEditLine(line);
  };

  const closeEditLine = () => {
    setEditLine(null);
  };

  const handleSaveLine = (updated: PlanLine) => {
    const previous = lines.find((l) => l.id === updated.id);
    const next = lines.map((l) => (l.id === updated.id ? updated : l));
    updatePlanLines(planId, next);
    if (isPolLine(updated)) {
      message.success('POL line updated');
      return;
    }
    showPlanLineSaveToast(message, previous, updated);
  };

  const handleAddNsns = (entries: NsnCatalogEntry[], deviationReason: string) => {
    const newLines = createAddedPlanLines(planId, entries, deviationReason).reverse();
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

  const handleApproveLine = (lineId: string, approval: OfflineApprovalRecord | null) => {
    const next = lines.map((line) => {
      if (line.id !== lineId) return line;
      return approval ? applyOfflineApproval(line, approval) : clearOfflineApproval(line);
    });
    updatePlanLines(planId, next);
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
          onViewNsn={setNsnDrilldownLine}
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
          onViewNsn={setNsnDrilldownLine}
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
          onViewNsn={setNsnDrilldownLine}
          onApproveLine={handleApproveLine}
        />
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e2e2',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space wrap size={[16, 8]}>
            <Typography.Text>
              <strong>{plan.platform}</strong> · {variantLabel}
            </Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">
              L-series: {formatLSeriesVersions(plan)}
            </Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">
              {formatVariantRowParameters(plan)}
            </Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">
              Type: {plan.detachmentType}
            </Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">
              Need-by: {formatDate(plan.needByDate)}
            </Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">
              Detachment: {formatDate(detachment.detachmentDate)}
            </Typography.Text>
            <Tag color={STATUS_COLORS[plan.status]}>{plan.status}</Tag>
          </Space>

          <Space>
            {!viewOnly && (
              <>
                <Button icon={<EditOutlined />} onClick={() => setEditParamsOpen(true)}>
                  Edit parameters
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
        onClose={() => setInventoryLine(null)}
      />

      <NsnDrilldownModal
        line={nsnDrilldownLine}
        open={!!nsnDrilldownLine}
        onClose={() => setNsnDrilldownLine(null)}
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

      <RemarksModal
        open={remarksOpen}
        onClose={() => setRemarksOpen(false)}
        remarks={plan.remarks ?? ''}
        viewOnly={viewOnly}
        onSave={(remarks) => updatePlan(planId, { remarks })}
      />

      <Modal
        title="Edit parameters"
        open={editParamsOpen}
        onCancel={() => setEditParamsOpen(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setEditParamsOpen(false)}>
            OK
          </Button>,
        ]}
      >
        <Typography.Paragraph style={{ marginTop: 16 }}>
          Edit parameters is planned for a future release. Plan parameters can be amended while the
          plan is open, but this prototype shows a coming-soon stub.
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}
