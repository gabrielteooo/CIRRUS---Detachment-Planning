import { Modal, Table, Typography } from 'antd';
import type { WaitEntry } from '../../types/planLine';
import { formatDate } from '../../utils/planUtils';
import { DETACHMENT_TABLE_LAYOUT } from './nsnTableColumns';

interface WaitModalProps {
  open: boolean;
  entries: WaitEntry[];
  onClose: () => void;
}

export default function WaitModal({ open, entries, onClose }: WaitModalProps) {
  return (
    <Modal
      title="LRU awaiting supply"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
      className="kpi-insight-modal"
    >
      {entries.length === 0 ? (
        <Typography.Text type="secondary">No LRU awaiting supply.</Typography.Text>
      ) : (
        <Table
          dataSource={entries}
          rowKey={(entry) => `${entry.lineId}-${entry.needByDate}`}
          pagination={false}
          size="small"
          tableLayout={DETACHMENT_TABLE_LAYOUT}
          scroll={{ x: 640 }}
          columns={[
            {
              title: 'Qty',
              dataIndex: 'qty',
              width: 64,
            },
            {
              title: 'NSN no.',
              dataIndex: 'nsn',
              width: 120,
              ellipsis: true,
            },
            {
              title: 'Description',
              dataIndex: 'description',
              ellipsis: true,
            },
            {
              title: 'EDD',
              key: 'needByDate',
              width: 112,
              render: (_: unknown, record: WaitEntry) => formatDate(record.needByDate),
            },
          ]}
        />
      )}
    </Modal>
  );
}
