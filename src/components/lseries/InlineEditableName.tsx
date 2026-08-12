import { useState } from 'react';
import { Input, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';

interface InlineEditableNameProps {
  value: string;
  onSave: (value: string) => void;
  editable?: boolean;
}

export default function InlineEditableName({
  value,
  onSave,
  editable = true,
}: InlineEditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => {
    if (!editable) return;
    setDraft(value);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="lseries-inline-name-edit">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPressEnter={save}
          autoFocus
          aria-label="L-series name"
        />
        <CheckOutlined className="lseries-inline-name-action" onClick={save} aria-label="Save name" />
        <CloseOutlined className="lseries-inline-name-action" onClick={cancel} aria-label="Cancel edit" />
      </div>
    );
  }

  return (
    <div className="lseries-inline-name">
      <Typography.Title level={3} style={{ margin: 0 }}>
        {value}
      </Typography.Title>
      {editable && (
        <EditOutlined
          className="lseries-inline-name-pen"
          onClick={startEdit}
          aria-label="Edit L-series name"
        />
      )}
    </div>
  );
}
