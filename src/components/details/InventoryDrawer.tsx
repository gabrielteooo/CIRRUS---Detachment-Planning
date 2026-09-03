import { useMemo } from 'react';
import { Drawer, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getStorageLocationRows, type StorageLocationRow } from '../../data/nsnDrilldownMock';
import type { PlanLine } from '../../types/planLine';
import { getGroupAvailableQty, isPolLine } from '../../types/planLine';
import { formatDate } from '../../utils/planUtils';
import { assessSupply } from '../../utils/supplyAssessment';
import {
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

function getDisplayDescription(line: PlanLine): string {
  return line.description.replace(/\s*\(interchangeable[^)]*\)/i, '').trim();
}

function isLruWarehouseView(line: PlanLine): boolean {
  return !isPolLine(line) && line.componentCategory !== 'Consumable';
}

function getInventoryDrawerColumns(
  line: PlanLine,
  rows: StorageLocationRow[],
): ColumnsType<StorageLocationRow> {
  const qtyColumn = withTableHugColumn(
    {
      title: 'Qty',
      dataIndex: 'qty',
      align: 'right' as const,
      ...getNumericQtySortFilter((record) => record.qty, rows),
    },
    WAREHOUSE_HUG_COLUMN_WIDTH,
  );

  if (isLruWarehouseView(line)) {
    return [
      { title: 'S/N', dataIndex: 'serialNo', width: 120, ellipsis: true },
      { title: 'SLOC', dataIndex: 'sloc', width: 80 },
      { title: 'SLOC Description', dataIndex: 'slocDescription', ellipsis: true },
      qtyColumn,
    ];
  }

  return [
    { title: 'Batch no.', dataIndex: 'batchNo', width: 120, ellipsis: true },
    { title: 'SLOC', dataIndex: 'sloc', width: 80 },
    { title: 'SLOC Description', dataIndex: 'slocDescription', ellipsis: true },
    qtyColumn,
  ];
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
  const rows = useMemo(() => (line ? getStorageLocationRows(line) : []), [line]);
  const columns = useMemo(
    () => (line ? getInventoryDrawerColumns(line, rows) : []),
    [line, rows],
  );

  if (!line) return null;

  const availableQty = getGroupAvailableQty(line);
  const assessment = assessSupply(line, sparesRequiredBy);
  const isConsumable = line.componentCategory === 'Consumable';

  return (
    <Drawer title="Available qty" open={open} onClose={onClose} width={680}>
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
          rowKey="id"
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
