import { Button, Checkbox, Popover, Typography } from 'antd';
import { TableOutlined } from '@ant-design/icons';
import type { ComponentCategory } from '../../types/planLine';

export type LruOptionalColumnKey = 'trade' | 'system' | 'mrpController' | 'remarks';
export type ConsumableOptionalColumnKey = 'mrpController' | 'remarks';
export type PolOptionalColumnKey = 'remarks' | 'uom';
export type WorkQueueOptionalColumnKey = 'mrpController';

export type ComponentColumnVisibility = {
  LRU: Record<LruOptionalColumnKey, boolean>;
  Consumable: Record<ConsumableOptionalColumnKey, boolean>;
  POL: Record<PolOptionalColumnKey, boolean>;
};

export type WorkQueueColumnVisibility = Record<WorkQueueOptionalColumnKey, boolean>;

export const DEFAULT_COMPONENT_COLUMN_VISIBILITY: ComponentColumnVisibility = {
  LRU: {
    trade: false,
    system: false,
    mrpController: false,
    remarks: true,
  },
  Consumable: {
    mrpController: false,
    remarks: true,
  },
  POL: {
    remarks: true,
    uom: true,
  },
};

export const DEFAULT_WORK_QUEUE_COLUMN_VISIBILITY: WorkQueueColumnVisibility = {
  mrpController: false,
};

const COLUMN_OPTIONS: Record<
  ComponentCategory,
  { key: string; label: string }[]
> = {
  LRU: [
    { key: 'trade', label: 'Trade' },
    { key: 'system', label: 'System' },
    { key: 'mrpController', label: 'MRP controller' },
    { key: 'remarks', label: 'Remarks' },
  ],
  Consumable: [
    { key: 'mrpController', label: 'MRP controller' },
    { key: 'remarks', label: 'Remarks' },
  ],
  POL: [
    { key: 'remarks', label: 'Remarks' },
    { key: 'uom', label: 'UOM' },
  ],
};

export const WORK_QUEUE_COLUMN_OPTIONS: { key: string; label: string }[] = [
  { key: 'mrpController', label: 'MRP controller' },
];

interface CustomizeColumnsButtonProps {
  category?: ComponentCategory;
  options?: { key: string; label: string }[];
  visibility: Record<string, boolean>;
  onToggle: (key: string, visible: boolean) => void;
}

export default function CustomizeColumnsButton({
  category,
  options,
  visibility,
  onToggle,
}: CustomizeColumnsButtonProps) {
  const columnOptions = options ?? (category ? COLUMN_OPTIONS[category] : []);

  const content = (
    <div className="customize-columns-popover">
      <Typography.Text strong className="customize-columns-popover-title">
        Customise columns
      </Typography.Text>
      <div className="customize-columns-popover-list">
        {columnOptions.map((option) => (
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
