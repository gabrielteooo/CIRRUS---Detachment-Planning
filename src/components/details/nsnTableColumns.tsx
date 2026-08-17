import type { ColumnType } from 'antd/es/table';
import { Button, Checkbox, Space, Tag } from 'antd';
import { getMpnForNsn } from '../../data/lSeriesTemplate';
import type { Platform } from '../../types/detachment';
import type { ComponentCategory, PlanLine } from '../../types/planLine';
import { getDeviationDelta, getShortfallDelta } from '../../types/planLine';
import MpnCell from '../lseries/MpnCell';

interface NsnRow {
  nsn: string;
  description: string;
  mpn?: string;
}

/** Fixed widths so Required column aligns across all detachment detail tables. */
export const NSN_COLUMN_WIDTH = 120;
export const MPN_COLUMN_WIDTH = 120;
export const DESCRIPTION_COLUMN_WIDTH = 260;
export const PLATFORM_VARIANT_COLUMN_WIDTH = 120;
export const QTY_COLUMN_WIDTH = 88;
export const UOM_COLUMN_WIDTH = 70;
export const REMARKS_COLUMN_WIDTH = 160;
export const POL_FULFILLED_COLUMN_WIDTH = 88;
export const TRADE_COLUMN_WIDTH = 90;
export const SYSTEM_COLUMN_WIDTH = 120;

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

export function getMpnColumn<T extends NsnRow>(): ColumnType<T> {
  return {
    title: 'MPN',
    key: 'mpn',
    width: MPN_COLUMN_WIDTH,
    render: (_: unknown, record: T) => (
      <MpnCell mpn={record.mpn ?? getMpnForNsn(record.nsn)} />
    ),
  };
}

export function getTradeColumn<T extends { trade?: string }>(): ColumnType<T> {
  return {
    title: 'Trade',
    key: 'trade',
    width: TRADE_COLUMN_WIDTH,
    render: (_: unknown, record: T) => record.trade?.trim() || '—',
  };
}

export function getSystemColumn<T extends { system?: string }>(): ColumnType<T> {
  return {
    title: 'System',
    key: 'system',
    width: SYSTEM_COLUMN_WIDTH,
    render: (_: unknown, record: T) => record.system?.trim() || '—',
  };
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
    getMpnColumn<T>(),
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

export function getUomColumn<T extends { uom?: string }>(): ColumnType<T> {
  return {
    title: 'UOM',
    key: 'uom',
    width: UOM_COLUMN_WIDTH,
    render: (_: unknown, record: T) => record.uom ?? '—',
  };
}

export function getRemarksColumn<T extends { remarks?: string }>(): ColumnType<T> {
  return {
    title: 'Remarks',
    key: 'remarks',
    width: REMARKS_COLUMN_WIDTH,
    ellipsis: true,
    render: (_: unknown, record: T) => record.remarks?.trim() || '—',
  };
}

export function getPolFulfilledColumn(
  viewOnly: boolean,
  onToggle: (line: PlanLine, fulfilled: boolean) => void,
): ColumnType<PlanLine> {
  return {
    title: 'Fulfilled',
    key: 'polFulfilled',
    width: POL_FULFILLED_COLUMN_WIDTH,
    fixed: 'right' as const,
    render: (_: unknown, record: PlanLine) => (
      <Checkbox
        checked={record.polFulfilled === true}
        disabled={viewOnly}
        onChange={(event) => onToggle(record, event.target.checked)}
      />
    ),
  };
}

export function getPolActionColumn(
  viewOnly: boolean,
  onEditLine: (line: PlanLine) => void,
): ColumnType<PlanLine> {
  return {
    title: 'Action',
    key: 'action',
    width: ACTION_COLUMN_WIDTH,
    fixed: 'right' as const,
    render: (_: unknown, record: PlanLine) =>
      !viewOnly ? (
        <Button type="link" size="small" onClick={() => onEditLine(record)}>
          Edit
        </Button>
      ) : null,
  };
}

/** POL tab: reference columns with optional edit for to-bring and remarks. */
export function getPolReferenceColumns<T extends PlanLine>(
  platform: Platform,
  variant: string,
  columnVisibility: Partial<Record<'remarks' | 'uom', boolean>> = {},
): ColumnType<T>[] {
  const showRemarks = columnVisibility.remarks !== false;
  const showUom = columnVisibility.uom !== false;

  const columns: ColumnType<T>[] = [
    {
      title: 'NSN',
      dataIndex: 'nsn',
      width: NSN_COLUMN_WIDTH,
      ellipsis: true,
    },
    getMpnColumn<T>(),
    {
      title: 'Description',
      dataIndex: 'description',
      width: DESCRIPTION_COLUMN_WIDTH,
      ellipsis: true,
    },
    getPlatformVariantColumn<T>(platform, variant),
    getRequiredColumn<T>(),
    getToBringColumn<T>(),
  ];

  if (showUom) {
    columns.push(getUomColumn<T>());
  }
  if (showRemarks) {
    columns.push(getRemarksColumn<T>());
  }

  return columns;
}

export function getOperationalComponentColumns(
  category: Extract<ComponentCategory, 'LRU' | 'Consumable'>,
  platform: Platform,
  variant: string,
  onViewNsn: (line: PlanLine) => void,
  onViewInventory: (line: PlanLine) => void,
  columnVisibility: Partial<Record<'trade' | 'system' | 'remarks', boolean>> = {},
): ColumnType<PlanLine>[] {
  const showTrade = category === 'LRU' && columnVisibility.trade === true;
  const showSystem = category === 'LRU' && columnVisibility.system === true;
  const showRemarks = columnVisibility.remarks !== false;

  const columns: ColumnType<PlanLine>[] = [
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
  ];

  if (showTrade) {
    columns.push(getTradeColumn<PlanLine>());
  }
  if (showSystem) {
    columns.push(getSystemColumn<PlanLine>());
  }

  columns.push(
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory)),
    getToBringColumn<PlanLine>(),
  );

  if (showRemarks) {
    columns.push(getRemarksColumn<PlanLine>());
  }

  return columns;
}

export function computeOperationalTableScrollX(
  category: Extract<ComponentCategory, 'LRU' | 'Consumable'>,
  columnVisibility: Partial<Record<'trade' | 'system' | 'remarks', boolean>> = {},
): number {
  const extraWidths = [
    PLATFORM_VARIANT_COLUMN_WIDTH,
    QTY_COLUMN_WIDTH,
    QTY_COLUMN_WIDTH,
    QTY_COLUMN_WIDTH,
    STATUS_COLUMN_WIDTH,
    ACTION_COLUMN_WIDTH,
  ];

  if (category === 'LRU' && columnVisibility.trade === true) {
    extraWidths.unshift(TRADE_COLUMN_WIDTH);
  }
  if (category === 'LRU' && columnVisibility.system === true) {
    extraWidths.unshift(SYSTEM_COLUMN_WIDTH);
  }
  if (columnVisibility.remarks !== false) {
    extraWidths.splice(-2, 0, REMARKS_COLUMN_WIDTH);
  }

  return computeDetachmentTableScrollX(extraWidths);
}

export function computePolTableScrollX(
  columnVisibility: Partial<Record<'remarks' | 'uom', boolean>> = {},
  options: { includeFulfilled?: boolean; includeAction?: boolean } = {},
): number {
  const { includeFulfilled = true, includeAction = false } = options;
  const extraWidths = [
    PLATFORM_VARIANT_COLUMN_WIDTH,
    QTY_COLUMN_WIDTH,
    QTY_COLUMN_WIDTH,
  ];

  if (columnVisibility.uom !== false) {
    extraWidths.push(UOM_COLUMN_WIDTH);
  }
  if (columnVisibility.remarks !== false) {
    extraWidths.push(REMARKS_COLUMN_WIDTH);
  }
  if (includeFulfilled) {
    extraWidths.push(POL_FULFILLED_COLUMN_WIDTH);
  }
  if (includeAction) {
    extraWidths.push(ACTION_COLUMN_WIDTH);
  }

  return computeDetachmentTableScrollX(extraWidths);
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

/** LRU tab: Trade, System, Platform/Variant, Required, Available, To-bring, Remarks, Status, Action */
export const LRU_OPERATIONAL_TABLE_SCROLL_X = computeDetachmentTableScrollX([
  TRADE_COLUMN_WIDTH,
  SYSTEM_COLUMN_WIDTH,
  PLATFORM_VARIANT_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  REMARKS_COLUMN_WIDTH,
  STATUS_COLUMN_WIDTH,
  ACTION_COLUMN_WIDTH,
]);

/** Consumable tab: Platform/Variant, Required, Available, To-bring, Remarks, Status, Action */
export const CONSUMABLE_OPERATIONAL_TABLE_SCROLL_X = computeDetachmentTableScrollX([
  PLATFORM_VARIANT_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  REMARKS_COLUMN_WIDTH,
  STATUS_COLUMN_WIDTH,
  ACTION_COLUMN_WIDTH,
]);

/** @deprecated Use LRU_OPERATIONAL_TABLE_SCROLL_X or CONSUMABLE_OPERATIONAL_TABLE_SCROLL_X */
export const DETACHMENT_TABLE_SCROLL_X = LRU_OPERATIONAL_TABLE_SCROLL_X;

/** POL reference table: Platform/Variant, Required, To-bring, UOM, Remarks, Fulfilled */
export const POL_REFERENCE_TABLE_SCROLL_X = computeDetachmentTableScrollX([
  PLATFORM_VARIANT_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  UOM_COLUMN_WIDTH,
  REMARKS_COLUMN_WIDTH,
  POL_FULFILLED_COLUMN_WIDTH,
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
