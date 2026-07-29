import { useMemo, useState } from 'react';
import { Alert, Button, Modal, Space, Tag, Typography, message } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp, useIsViewOnly, isPastPlanViewOnly } from '../context/AppContext';
import { formatDate } from '../utils/planUtils';
import type { PlanLine } from '../types/planLine';
import KpiStrip from '../components/details/KpiStrip';
import ShortfallSummary from '../components/details/ShortfallSummary';
import DeviationSummary from '../components/details/DeviationSummary';
import LSeriesTable from '../components/details/LSeriesTable';
import InventoryDrawer from '../components/details/InventoryDrawer';
import EditLineDrawer from '../components/details/EditLineDrawer';
import RemarksModal from '../components/details/RemarksModal';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  'Partially Approved': 'processing',
  Approved: 'success',
};

export default function PlanDetailsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { plans, getPlanLines, updatePlanLines, updatePlan, role } = useApp();

  const plan = plans.find((p) => p.id === planId);
  const lines = planId ? getPlanLines(planId) : [];
  const viewOnly = useIsViewOnly(plan);
  const isPast = plan ? isPastPlanViewOnly(plan) : false;

  const [inventoryLine, setInventoryLine] = useState<PlanLine | null>(null);
  const [editLine, setEditLine] = useState<PlanLine | null>(null);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [editParamsOpen, setEditParamsOpen] = useState(false);

  const viewOnlyBanner = useMemo(() => {
    if (role === 'director') return 'View only — detachment director';
    if (isPast) return 'View only — past detachment';
    return null;
  }, [role, isPast]);

  if (!plan || !planId) {
    return (
      <Typography.Text type="secondary">
        Plan not found.{' '}
        <Button type="link" onClick={() => navigate('/detachment-planning')}>
          Back to list
        </Button>
      </Typography.Text>
    );
  }

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

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/detachment-planning')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        Back to list
      </Button>

      {viewOnlyBanner && (
        <Alert message={viewOnlyBanner} type="info" showIcon style={{ marginBottom: 16 }} />
      )}

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
              <strong>{plan.platform}</strong> · {plan.variant}
            </Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">L-series: {plan.lSeriesVersion}</Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">
              {plan.parameterLabel}: {plan.parameterValue}
            </Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">Need-by: {formatDate(plan.needByDate)}</Typography.Text>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text type="secondary">
              Detachment: {formatDate(plan.detachmentDate)}
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
                  Detachment remarks
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
            viewOnly={viewOnly}
            onEditLine={setEditLine}
            onToggleApproval={handleShortfallApproval}
          />

          <DeviationSummary
            lines={lines}
            viewOnly={viewOnly}
            onEditLine={setEditLine}
            onToggleApproval={handleDeviationApproval}
          />
        </section>

        <section className="plan-details-lseries">
          <LSeriesTable
            lines={lines}
            viewOnly={viewOnly}
            onEditLine={setEditLine}
            onViewInventory={setInventoryLine}
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
