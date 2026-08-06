import type { ColumnType } from 'antd/es/table';
import { Button, Space, Tag } from 'antd';
import { getMpnForNsn } from '../../data/lSeriesTemplate';
import type { Platform } from '../../types/detachment';
import type { PlanLine } from '../../types/planLine';
import { getDeviationDelta, getShortfallDelta } from '../../types/planLine';

interface NsnRow {
  nsn: string;
  description: string;
}

/** Fixed widths so Required column aligns across all detachment detail tables. */
export const NSN_COLUMN_WIDTH = 120;
export const MPN_COLUMN_WIDTH = 120;
export const DESCRIPTION_COLUMN_WIDTH = 260;
export const PLATFORM_VARIANT_COLUMN_WIDTH = 120;
export const QTY_COLUMN_WIDTH = 88;

/** 7th column width shared by shortfall (Delta) and deviation (To-bring) summary tables. */
export const SUMMARY_SEVENTH_COLUMN_WIDTH = 100;

export const ACTION_COLUMN_WIDTH = 160;
export const SUMMARY_EDIT_COLUMN_WIDTH = 70;
export const STATUS_COLUMN_WIDTH = 110;
/** Min width for Resolution / Reason columns in summary tables (included in scroll.x). */
export const FLEX_TEXT_COLUMN_MIN_WIDTH = 160;

export function PlatformVariantTags({
  platform,
  variant,
}: {
  platform: Platform;
  variant: string;
}) {
  const variants = variant
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <Space size={[4, 4]} wrap>
      <Tag>{platform}</Tag>
      {variants.map((value) => (
        <Tag key={value}>{value}</Tag>
      ))}
    </Space>
  );
}

export function getPlatformVariantColumn<T extends PlanLine>(
  platform: Platform,
  variant: string,
): ColumnType<T> {
  return {
    title: 'Platform / Variant',
    key: 'platformVariant',
    width: PLATFORM_VARIANT_COLUMN_WIDTH,
    render: () => <PlatformVariantTags platform={platform} variant={variant} />,
  };
}

export function getNsnMpnDescriptionColumns<T extends NsnRow>(
  onViewNsn?: (record: T) => void,
): ColumnType<T>[] {
  return [
    {
      title: 'NSN',
      dataIndex: 'nsn',
      width: NSN_COLUMN_WIDTH,
      ellipsis: true,
      render: onViewNsn
        ? (nsn: string, record: T) => (
            <Button
              type="link"
              size="small"
              className="nsn-link"
              style={{ padding: 0 }}
              onClick={() => onViewNsn(record)}
            >
              {nsn}
            </Button>
          )
        : undefined,
    },
    {
      title: 'MPN',
      key: 'mpn',
      width: MPN_COLUMN_WIDTH,
      ellipsis: true,
      render: (_: unknown, record: T) => getMpnForNsn(record.nsn),
    },
    {
      title: 'NSN description',
      dataIndex: 'description',
      width: DESCRIPTION_COLUMN_WIDTH,
      ellipsis: true,
    },
  ];
}

export function getRequiredColumn<T extends PlanLine>(): ColumnType<T> {
  return { title: 'Required', dataIndex: 'requiredQty', width: QTY_COLUMN_WIDTH };
}

export function getAvailableColumnLinkRenderer(
  onViewInventory: (line: PlanLine) => void,
): NonNullable<ColumnType<PlanLine>['render']> {
  return (value: number, record: PlanLine) => (
    <Button
      type="link"
      size="small"
      className="available-qty-link"
      style={{ padding: 0 }}
      onClick={() => onViewInventory(record)}
    >
      {value}
    </Button>
  );
}

export function getAvailableColumn<T extends PlanLine>(
  render?: ColumnType<T>['render'],
): ColumnType<T> {
  return {
    title: 'Available',
    dataIndex: 'availableQty',
    width: QTY_COLUMN_WIDTH,
    render,
  };
}

export function getToBringColumn<T extends PlanLine>(
  width: number = QTY_COLUMN_WIDTH,
): ColumnType<T> {
  return { title: 'To-bring', dataIndex: 'toBringQty', width };
}

export function getSummaryToBringColumn<T extends PlanLine>(): ColumnType<T> {
  return getToBringColumn(SUMMARY_SEVENTH_COLUMN_WIDTH);
}

export function getSummaryShortfallDeltaColumn<T extends PlanLine>(): ColumnType<T> {
  return {
    title: 'Delta',
    key: 'delta',
    width: SUMMARY_SEVENTH_COLUMN_WIDTH,
    onCell: () => ({ className: 'shortfall-delta-cell' }),
    render: (_: unknown, record: T) => getShortfallDelta(record),
  };
}

export function getSummaryDeviationDeltaColumn<T extends PlanLine>(
  width: number = SUMMARY_SEVENTH_COLUMN_WIDTH,
): ColumnType<T> {
  return {
    title: 'Delta',
    key: 'delta',
    width,
    onCell: () => ({ className: 'deviation-delta-cell' }),
    render: (_: unknown, record: T) => {
      const delta = getDeviationDelta(record);
      return delta >= 0 ? `+${delta}` : delta;
    },
  };
}

export function getSummaryEditColumn<T extends PlanLine>(
  viewOnly: boolean,
  onEditLine: (line: T) => void,
  label: string | ((line: T) => string) = 'Deviate',
): ColumnType<T> {
  return {
    title: '',
    key: 'edit',
    width: SUMMARY_EDIT_COLUMN_WIDTH,
    fixed: 'right' as const,
    render: (_: unknown, record: T) =>
      !viewOnly ? (
        <Button type="link" size="small" onClick={() => onEditLine(record)}>
          {typeof label === 'function' ? label(record) : label}
        </Button>
      ) : null,
  };
}

export const DETACHMENT_TABLE_LAYOUT = 'fixed' as const;

const NSN_MPN_DESCRIPTION_WIDTH =
  NSN_COLUMN_WIDTH + MPN_COLUMN_WIDTH + DESCRIPTION_COLUMN_WIDTH;

export function computeDetachmentTableScrollX(extraColumnWidths: number[]): number {
  return NSN_MPN_DESCRIPTION_WIDTH + extraColumnWidths.reduce((sum, width) => sum + width, 0);
}

/** L-series table: Platform/Variant, Required, Available, To-bring, Status, Action */
export const DETACHMENT_TABLE_SCROLL_X = computeDetachmentTableScrollX([
  PLATFORM_VARIANT_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  STATUS_COLUMN_WIDTH,
  ACTION_COLUMN_WIDTH,
]);

/** Work queue: Platform/Variant, Required, Available, Delta, Edit */
export const WORK_QUEUE_SCROLL_X = computeDetachmentTableScrollX([
  PLATFORM_VARIANT_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  SUMMARY_SEVENTH_COLUMN_WIDTH,
  SUMMARY_EDIT_COLUMN_WIDTH,
]);

/** Approval pack shortfall: Platform/Variant, Required, Available, Delta, Resolution, Edit */
export const APPROVAL_PACK_SHORTFALL_SCROLL_X = computeDetachmentTableScrollX([
  PLATFORM_VARIANT_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  SUMMARY_SEVENTH_COLUMN_WIDTH,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
  SUMMARY_EDIT_COLUMN_WIDTH,
]);

/** Approval pack deviation: Platform/Variant, Required, Available, Delta, Reason, Edit */
export const APPROVAL_PACK_DEVIATION_SCROLL_X = computeDetachmentTableScrollX([
  PLATFORM_VARIANT_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  80,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
  SUMMARY_EDIT_COLUMN_WIDTH,
]);

/** @deprecated Use APPROVAL_PACK_DEVIATION_SCROLL_X */
export const DEVIATION_SUMMARY_SCROLL_X = APPROVAL_PACK_DEVIATION_SCROLL_X;

/** @deprecated Use APPROVAL_PACK_SHORTFALL_SCROLL_X */
export const SHORTFALL_SUMMARY_SCROLL_X = APPROVAL_PACK_SHORTFALL_SCROLL_X;
