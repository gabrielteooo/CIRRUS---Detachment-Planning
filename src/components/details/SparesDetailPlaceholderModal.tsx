import { Modal, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';

interface SparesDetailPlaceholderModalProps {
  line: PlanLine | null;
  open: boolean;
  onClose: () => void;
}

export default function SparesDetailPlaceholderModal({
  line,
  open,
  onClose,
}: SparesDetailPlaceholderModalProps) {
  if (!line) return null;

  const sparesLabel = `${line.nsn} | ${line.description}`;

  return (
    <Modal
      title="Spares detail"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        This link would lead user to the Spares detail page of{' '}
        <Typography.Text strong>&ldquo;{sparesLabel}&rdquo;</Typography.Text>
      </Typography.Paragraph>
    </Modal>
  );
}
