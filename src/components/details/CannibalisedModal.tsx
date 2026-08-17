import { Modal, Table, Typography } from 'antd';
import type { CannibalisedEntry } from '../../types/planLine';
import { formatAircraftTailNumber } from '../../utils/tailNumber';
import { DETACHMENT_TABLE_LAYOUT } from './nsnTableColumns';

interface CannibalisedModalProps {
  open: boolean;
  entries: CannibalisedEntry[];
  onClose: () => void;
}

export default function CannibalisedModal({ open, entries, onClose }: CannibalisedModalProps) {
  return (
    <Modal
      title="Cannibalised LRU"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
      className="kpi-insight-modal"
    >
      {entries.length === 0 ? (
        <Typography.Text type="secondary">No cannibalised LRU recorded.</Typography.Text>
      ) : (
        <Table
          dataSource={entries}
          rowKey={(entry) => `${entry.lineId}-${entry.tailNumber}`}
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
              title: 'Tail no.',
              key: 'tailNumber',
              width: 88,
              render: (_: unknown, record: CannibalisedEntry) =>
                formatAircraftTailNumber(record.tailNumber),
            },
          ]}
        />
      )}
    </Modal>
  );
}
