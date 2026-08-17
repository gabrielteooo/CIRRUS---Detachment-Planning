import { List, Modal, Typography } from 'antd';
import type { CannibalisedEntry } from '../../types/planLine';
import { formatCannibalisedItemLabel } from '../../utils/tailNumber';

interface CannibalisedModalProps {
  open: boolean;
  entries: CannibalisedEntry[];
  onClose: () => void;
}

export default function CannibalisedModal({ open, entries, onClose }: CannibalisedModalProps) {
  return (
    <Modal
      title="Cannibalised items"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      {entries.length === 0 ? (
        <Typography.Text type="secondary">No cannibalised items recorded.</Typography.Text>
      ) : (
        <List
          size="small"
          dataSource={entries}
          renderItem={(entry) => (
            <List.Item>
              <Typography.Text>
                {formatCannibalisedItemLabel(entry.description, entry.tailNumber)}
                {entry.qty > 1 ? ` (×${entry.qty})` : ''}
              </Typography.Text>
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}
