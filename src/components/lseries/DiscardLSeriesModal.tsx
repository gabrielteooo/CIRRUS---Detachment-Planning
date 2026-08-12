import { Button, Modal } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

interface DiscardLSeriesModalProps {
  open: boolean;
  onContinue: () => void;
  onDiscard: () => void;
}

export default function DiscardLSeriesModal({
  open,
  onContinue,
  onDiscard,
}: DiscardLSeriesModalProps) {
  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      centered
      width={628}
      className="lseries-discard-modal"
      onCancel={onContinue}
    >
      <div className="lseries-discard-modal-content">
        <ExclamationCircleFilled className="lseries-discard-modal-icon" />
        <h3 className="lseries-discard-modal-title">Discard changes?</h3>
        <p className="lseries-discard-modal-description">
          All unsaved changes will be discarded.
          <br />
          Are you sure you want to proceed?
        </p>
        <div className="lseries-discard-modal-actions">
          <Button type="primary" onClick={onContinue}>
            Continue editing
          </Button>
          <Button onClick={onDiscard}>Discard changes</Button>
        </div>
      </div>
    </Modal>
  );
}
