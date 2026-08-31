import { Drawer, Table, Tag, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import { getGroupAvailableQty, isInterchangeableLine } from '../../types/planLine';
import { formatDate } from '../../utils/planUtils';
import { assessSupply } from '../../utils/supplyAssessment';
import {
  TO_BRING_HUG_COLUMN_WIDTH,
  WAREHOUSE_HUG_COLUMN_WIDTH,
  getNumericQtySortFilter,
  withTableHugColumn,
} from './nsnTableColumns';

interface InventoryDrawerProps {
  line: PlanLine | null;
  open: boolean;
  sparesRequiredBy: string;
  onClose: () => void;
}

interface InventoryRow {
  nsn: string;
  description: string;
  availableQty: number;
  toBringQty: number;
}

function buildInventoryRows(line: PlanLine): InventoryRow[] {
  if (isInterchangeableLine(line)) {
    return line.interchangeableMembers!.map((member) => ({
      nsn: member.nsn,
      description: member.description,
      availableQty: member.availableQty,
      toBringQty: line.toBringAllocation?.find((item) => item.nsn === member.nsn)?.qty ?? 0,
    }));
  }

  return [
    {
      nsn: line.nsn,
      description: line.description,
      availableQty: line.availableQty,
      toBringQty: line.toBringQty,
    },
  ];
}

function getDisplayDescription(line: PlanLine): string {
  return line.description.replace(/\s*\(interchangeable[^)]*\)/i, '').trim();
}

const RECOMMENDATION_COLORS = {
  Cannibalise: 'error',
  'Wait for Repair / New buys': 'processing',
  'Wait for New buys': 'processing',
  'Expedite New buys': 'warning',
} as const;

export default function InventoryDrawer({
  line,
  open,
  sparesRequiredBy,
  onClose,
}: InventoryDrawerProps) {
  if (!line) return null;

  const availableQty = getGroupAvailableQty(line);
  const rows = buildInventoryRows(line);
  const assessment = assessSupply(line, sparesRequiredBy);
  const isConsumable = line.componentCategory === 'Consumable';

  const columns = [
    {
      title: 'NSN',
      dataIndex: 'nsn',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
    },
    withTableHugColumn(
      {
        title: 'Warehouse',
        dataIndex: 'availableQty',
        ...getNumericQtySortFilter((record) => record.availableQty, rows),
      },
      WAREHOUSE_HUG_COLUMN_WIDTH,
    ),
    withTableHugColumn(
      {
        title: 'To-bring',
        dataIndex: 'toBringQty',
        ...getNumericQtySortFilter((record) => record.toBringQty, rows),
      },
      TO_BRING_HUG_COLUMN_WIDTH,
    ),
  ];

  return (
    <Drawer title="Available qty" open={open} onClose={onClose} width={640}>
      <div className="inventory-drawer-summary">
        <div className="inventory-drawer-summary-row">
          <div className="inventory-drawer-summary-item">
            <Typography.Text type="secondary" className="inventory-drawer-summary-label">
              NSN Description
            </Typography.Text>
            <Typography.Text strong>{getDisplayDescription(line)}</Typography.Text>
          </div>
          <div className="inventory-drawer-summary-item">
            <Typography.Text type="secondary" className="inventory-drawer-summary-label">
              NSN no.
            </Typography.Text>
            <Typography.Text strong>{line.nsn}</Typography.Text>
          </div>
        </div>

        <div className="inventory-drawer-summary-row">
          <div className="inventory-drawer-summary-item">
            <Typography.Text type="secondary" className="inventory-drawer-summary-label">
              Required Qty
            </Typography.Text>
            <Typography.Text strong>{line.requiredQty}</Typography.Text>
          </div>
          <div className="inventory-drawer-summary-item">
            <Typography.Text type="secondary" className="inventory-drawer-summary-label">
              Available Qty
            </Typography.Text>
            <Typography.Text strong>{availableQty}</Typography.Text>
          </div>
        </div>
      </div>

      <div className="inventory-drawer-table" style={{ marginTop: 16 }}>
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="nsn"
          pagination={false}
          size="small"
          tableLayout="fixed"
        />
      </div>

      <section className="inventory-drawer-supply-assessment">
        <Typography.Title level={5} className="inventory-drawer-supply-title">
          Supply assessment
        </Typography.Title>
        <dl className="inventory-drawer-supply-list">
          {!isConsumable && (
            <div className="inventory-drawer-supply-item">
              <Typography.Text type="secondary">Repair earliest EDD</Typography.Text>
              <Typography.Text>
                {assessment.repairEarliestEdd
                  ? `${formatDate(assessment.repairEarliestEdd)} (${assessment.repairPoNumber})`
                  : '—'}
              </Typography.Text>
            </div>
          )}
          <div className="inventory-drawer-supply-item">
            <Typography.Text type="secondary">New buy earliest EDD</Typography.Text>
            <Typography.Text>
              {assessment.newBuyEarliestEdd
                ? `${formatDate(assessment.newBuyEarliestEdd)} (${assessment.newBuyPoNumber})`
                : '—'}
            </Typography.Text>
          </div>
          <div className="inventory-drawer-supply-item">
            <Typography.Text type="secondary">Spares required by</Typography.Text>
            <Typography.Text>{formatDate(assessment.sparesRequiredBy)}</Typography.Text>
          </div>
          <div className="inventory-drawer-supply-item inventory-drawer-supply-item--recommendation">
            <Typography.Text type="secondary">Recommendation</Typography.Text>
            <Tag color={RECOMMENDATION_COLORS[assessment.recommendation]}>
              {assessment.recommendation}
            </Tag>
          </div>
        </dl>
      </section>
    </Drawer>
  );
}
