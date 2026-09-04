import { Modal, Table, Typography } from 'antd';
import type { PendingOcApprovalEntry } from '../../types/planLine';
import { getDisplayIssuedQty, getGroupAvailableQty } from '../../types/planLine';
import LineStatusTags from './LineStatusTags';
import { DETACHMENT_TABLE_LAYOUT } from './nsnTableColumns';

interface PendingOcApprovalModalProps {
  open: boolean;
  entries: PendingOcApprovalEntry[];
  onClose: () => void;
}

export default function PendingOcApprovalModal({
  open,
  entries,
  onClose,
}: PendingOcApprovalModalProps) {
  return (
    <Modal
      title="Low volume spares"
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      destroyOnClose
      className="kpi-insight-modal"
    >
      {entries.length === 0 ? (
        <Typography.Text type="secondary">No low volume spares.</Typography.Text>
      ) : (
        <Table
          dataSource={entries}
          rowKey={(entry) => entry.line.id}
          pagination={false}
          size="small"
          tableLayout={DETACHMENT_TABLE_LAYOUT}
          scroll={{ x: 920 }}
          columns={[
            {
              title: 'NSN no.',
              key: 'nsn',
              width: 120,
              ellipsis: true,
              render: (_: unknown, record: PendingOcApprovalEntry) => record.line.nsn,
            },
            {
              title: 'Description',
              key: 'description',
              ellipsis: true,
              render: (_: unknown, record: PendingOcApprovalEntry) => record.line.description,
            },
            {
              title: 'Required',
              key: 'requiredQty',
              width: 88,
              render: (_: unknown, record: PendingOcApprovalEntry) => record.line.requiredQty,
            },
            {
              title: 'To-bring',
              key: 'toBringQty',
              width: 88,
              render: (_: unknown, record: PendingOcApprovalEntry) => record.line.toBringQty,
            },
            {
              title: 'Warehouse',
              key: 'warehouseQty',
              width: 96,
              render: (_: unknown, record: PendingOcApprovalEntry) =>
                getGroupAvailableQty(record.line),
            },
            {
              title: 'Issued',
              key: 'issuedQty',
              width: 72,
              render: (_: unknown, record: PendingOcApprovalEntry) =>
                getDisplayIssuedQty(record.line),
            },
            {
              title: 'Status',
              key: 'status',
              width: 120,
              render: (_: unknown, record: PendingOcApprovalEntry) => (
                <LineStatusTags line={record.line} />
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
