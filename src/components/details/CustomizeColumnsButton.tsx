import { Button, Checkbox, Popover, Typography } from 'antd';
import { TableOutlined } from '@ant-design/icons';
import type { ComponentCategory } from '../../types/planLine';

export type LruOptionalColumnKey = 'trade' | 'system' | 'remarks';
export type ConsumableOptionalColumnKey = 'remarks';
export type PolOptionalColumnKey = 'remarks' | 'uom';

export type ComponentColumnVisibility = {
  LRU: Record<LruOptionalColumnKey, boolean>;
  Consumable: Record<ConsumableOptionalColumnKey, boolean>;
  POL: Record<PolOptionalColumnKey, boolean>;
};

export const DEFAULT_COMPONENT_COLUMN_VISIBILITY: ComponentColumnVisibility = {
  LRU: {
    trade: false,
    system: false,
    remarks: true,
  },
  Consumable: {
    remarks: true,
  },
  POL: {
    remarks: true,
    uom: true,
  },
};

const COLUMN_OPTIONS: Record<
  ComponentCategory,
  { key: string; label: string }[]
> = {
  LRU: [
    { key: 'trade', label: 'Trade' },
    { key: 'system', label: 'System' },
    { key: 'remarks', label: 'Remarks' },
  ],
  Consumable: [{ key: 'remarks', label: 'Remarks' }],
  POL: [
    { key: 'remarks', label: 'Remarks' },
    { key: 'uom', label: 'UOM' },
  ],
};

interface CustomizeColumnsButtonProps {
  category: ComponentCategory;
  visibility: Record<string, boolean>;
  onToggle: (key: string, visible: boolean) => void;
}

export default function CustomizeColumnsButton({
  category,
  visibility,
  onToggle,
}: CustomizeColumnsButtonProps) {
  const options = COLUMN_OPTIONS[category];

  const content = (
    <div className="customize-columns-popover">
      <Typography.Text strong className="customize-columns-popover-title">
        Customise columns
      </Typography.Text>
      <div className="customize-columns-popover-list">
        {options.map((option) => (
          <Checkbox
            key={option.key}
            checked={visibility[option.key] ?? false}
            onChange={(event) => onToggle(option.key, event.target.checked)}
          >
            {option.label}
          </Checkbox>
        ))}
      </div>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Button
        icon={<TableOutlined />}
        aria-label="Customise columns"
        title="Customise columns"
        className="customize-columns-button"
      />
    </Popover>
  );
}
