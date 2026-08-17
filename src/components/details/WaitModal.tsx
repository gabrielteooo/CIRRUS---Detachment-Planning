import { List, Modal, Typography } from 'antd';
import type { WaitEntry } from '../../types/planLine';
import { formatDate } from '../../utils/planUtils';

interface WaitModalProps {
  open: boolean;
  entries: WaitEntry[];
  onClose: () => void;
}

export default function WaitModal({ open, entries, onClose }: WaitModalProps) {
  return (
    <Modal
      title="Wait items"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      {entries.length === 0 ? (
        <Typography.Text type="secondary">No wait resolutions recorded.</Typography.Text>
      ) : (
        <List
          size="small"
          dataSource={entries}
          renderItem={(entry) => (
            <List.Item>
              <Typography.Text>
                {entry.description} - {formatDate(entry.needByDate)}
                {entry.qty > 1 ? ` (×${entry.qty})` : ''}
              </Typography.Text>
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}
