import { Modal, Table, Typography } from 'antd';
import type { AcceptShortfallEntry } from '../../types/planLine';
import { DETACHMENT_TABLE_LAYOUT } from './nsnTableColumns';

interface AcceptShortfallModalProps {
  open: boolean;
  entries: AcceptShortfallEntry[];
  onClose: () => void;
}

export default function AcceptShortfallModal({
  open,
  entries,
  onClose,
}: AcceptShortfallModalProps) {
  return (
    <Modal
      title="Accept shortfall"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
      className="kpi-insight-modal"
    >
      {entries.length === 0 ? (
        <Typography.Text type="secondary">No accept shortfall records.</Typography.Text>
      ) : (
        <Table
          dataSource={entries}
          rowKey={(entry) => `${entry.lineId}-accept`}
          pagination={false}
          size="small"
          tableLayout={DETACHMENT_TABLE_LAYOUT}
          scroll={{ x: 720 }}
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
              title: 'Risk / remarks',
              dataIndex: 'remarks',
              ellipsis: true,
            },
          ]}
        />
      )}
    </Modal>
  );
}
