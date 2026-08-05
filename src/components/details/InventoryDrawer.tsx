import { Drawer, Table, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import { getGroupAvailableQty, isInterchangeableLine } from '../../types/planLine';
import { QTY_COLUMN_WIDTH } from './nsnTableColumns';

interface InventoryDrawerProps {
  line: PlanLine | null;
  open: boolean;
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

export default function InventoryDrawer({ line, open, onClose }: InventoryDrawerProps) {
  if (!line) return null;

  const availableQty = getGroupAvailableQty(line);
  const rows = buildInventoryRows(line);

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
    { title: 'Available', dataIndex: 'availableQty', width: QTY_COLUMN_WIDTH },
    { title: 'To-bring', dataIndex: 'toBringQty', width: QTY_COLUMN_WIDTH },
  ];

  return (
    <Drawer title="Inventory breakdown" open={open} onClose={onClose} width={640}>
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
    </Drawer>
  );
}
