import { useMemo, useState } from 'react';
import { Button, Modal, Space, Tag, Typography, message } from 'antd';
import { EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { useApp } from '../../context/AppContext';
import type { Detachment, PlatformPlan } from '../../types/detachment';
import { formatDate } from '../../utils/planUtils';
import {
  formatLSeriesVersions,
  formatVariantLabels,
  formatVariantRowParameters,
} from '../../utils/planDisplayUtils';
import type { PlanLine } from '../../types/planLine';
import type { NsnCatalogEntry } from '../../data/nsnCatalog';
import { createAddedPlanLines } from '../../utils/addedPlanLines';
import KpiStrip from './KpiStrip';
import ShortfallSummary from './ShortfallSummary';
import DeviationSummary from './DeviationSummary';
import LSeriesTable from './LSeriesTable';
import AddNsnDrawer from './AddNsnDrawer';
import InventoryDrawer from './InventoryDrawer';
import EditLineDrawer from './EditLineDrawer';
import RemarksModal from './RemarksModal';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  'Partially Approved': 'processing',
  Approved: 'success',
};

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
  const { getPlanLines, updatePlanLines, updatePlan } = useApp();
  const planId = plan.id;
  const lines = getPlanLines(planId);

  const [inventoryLine, setInventoryLine] = useState<PlanLine | null>(null);
  const [editLine, setEditLine] = useState<PlanLine | null>(null);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [editParamsOpen, setEditParamsOpen] = useState(false);
  const [addNsnOpen, setAddNsnOpen] = useState(false);

  const existingNsns = useMemo(() => lines.map((line) => line.nsn), [lines]);
  const variantLabel = formatVariantLabels(plan);

  const handleSaveLine = (updated: PlanLine) => {
    const next = lines.map((l) => (l.id === updated.id ? updated : l));
    updatePlanLines(planId, next);
    message.success('Line updated');
  };

  const handleShortfallApproval = (lineId: string, approved: boolean) => {
    const next = lines.map((l) => {
      if (l.id !== lineId) return l;
      return {
        ...l,
        shortfallActions: l.shortfallActions.map((a) => ({ ...a, approved })),
      };
    });
    updatePlanLines(planId, next);
  };

  const handleDeviationApproval = (lineId: string, approved: boolean) => {
    const next = lines.map((l) =>
      l.id === lineId ? { ...l, deviationApproved: approved } : l,
    );
    updatePlanLines(planId, next);
  };

  const handleAddNsns = (entries: NsnCatalogEntry[], deviationReason: string) => {
    const newLines = createAddedPlanLines(planId, entries, deviationReason).reverse();
    updatePlanLines(planId, [...newLines, ...lines]);
    message.success(`${entries.length} NSN${entries.length > 1 ? 's' : ''} added — pending approval`);
  };

  const handleDeleteLine = (line: PlanLine) => {
    updatePlanLines(
      planId,
      lines.filter((l) => l.id !== line.id),
    );
    message.success('NSN removed');
  };

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

        <section className="plan-details-summaries">
          <ShortfallSummary
            lines={lines}
            platform={plan.platform}
            variant={variantLabel}
            viewOnly={viewOnly}
            onEditLine={setEditLine}
            onToggleApproval={handleShortfallApproval}
            onViewInventory={setInventoryLine}
          />

          <DeviationSummary
            lines={lines}
            platform={plan.platform}
            variant={variantLabel}
            viewOnly={viewOnly}
            onEditLine={setEditLine}
            onToggleApproval={handleDeviationApproval}
            onViewInventory={setInventoryLine}
          />
        </section>

        <section className="plan-details-lseries">
          <LSeriesTable
            lines={lines}
            platform={plan.platform}
            variant={variantLabel}
            viewOnly={viewOnly}
            onEditLine={setEditLine}
            onViewInventory={setInventoryLine}
            onAddNsn={() => setAddNsnOpen(true)}
            onDeleteLine={handleDeleteLine}
          />
        </section>
      </div>

      <InventoryDrawer
        line={inventoryLine}
        open={!!inventoryLine}
        onClose={() => setInventoryLine(null)}
      />

      <EditLineDrawer
        line={editLine}
        open={!!editLine}
        onClose={() => setEditLine(null)}
        onSave={handleSaveLine}
        planNeedByDate={plan.needByDate}
      />

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
