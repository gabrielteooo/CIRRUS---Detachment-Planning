import { Drawer, Table, Tag, Typography } from 'antd';
import type { PlanLine, InventoryItem } from '../../types/planLine';
import { getNsnMpnDescriptionColumns } from './nsnTableColumns';
import { getMpnForNsn } from '../../data/lSeriesTemplate';

interface InventoryDrawerProps {
  line: PlanLine | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'In WH': 'success',
  Blocked: 'warning',
  QI: 'processing',
  QIT: 'default',
};

export default function InventoryDrawer({ line, open, onClose }: InventoryDrawerProps) {
  if (!line) return null;

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      width: 70,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    ...getNsnMpnDescriptionColumns<InventoryItem>(),
    { title: 'Location', dataIndex: 'location', width: 140 },
    { title: 'Qty', dataIndex: 'qty', width: 60 },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag>,
    },
  ];

  return (
    <Drawer
      title="Inventory breakdown"
      open={open}
      onClose={onClose}
      width={720}
    >
      <Typography.Paragraph style={{ marginBottom: 8 }}>
        <Typography.Text style={{ display: 'block' }}>{line.nsn}</Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
          {getMpnForNsn(line.nsn)}
        </Typography.Text>
        <Typography.Text strong style={{ display: 'block', fontSize: 12 }}>
          {line.description}
        </Typography.Text>
      </Typography.Paragraph>
      <Typography.Text>
        Available qty (serviceable main + alt):{' '}
        <Typography.Text strong>{line.availableQty}</Typography.Text>
      </Typography.Text>
      <div className="detachment-table-container" style={{ marginTop: 16 }}>
        <Table
          dataSource={line.inventory}
          columns={columns}
          rowKey={(r) => `${r.nsn}-${r.type}`}
          pagination={false}
          size="small"
        />
      </div>
    </Drawer>
  );
}
