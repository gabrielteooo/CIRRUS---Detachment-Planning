import type { ColumnType } from 'antd/es/table';
import { Button, Checkbox, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { getMpnForNsn } from '../../data/lSeriesTemplate';
import type { Platform } from '../../types/detachment';
import type { ComponentCategory, PlanLine } from '../../types/planLine';
import { getDeviationDelta, getDisplayIssuedQty, getGroupAvailableQty, getShortfallDelta } from '../../types/planLine';
import FulfillmentStatusTags from './FulfillmentStatusTags';
import LineStatusTags from './LineStatusTags';
import { formatDate } from '../../utils/planUtils';
import MpnCell from '../lseries/MpnCell';

export interface ComponentTableColumnOptions {
  lines?: PlanLine[];
  planVariants?: string[];
  getApplicableVariants?: (line: PlanLine) => string[];
}

const NOT_APPROVED_FILTER_VALUE = '__not_approved__';

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
export const PLATFORM_COLUMN_WIDTH = 96;
export const VARIANT_COLUMN_WIDTH = 110;
export const COMPONENT_PLATFORM_VARIANT_WIDTH =
  PLATFORM_COLUMN_WIDTH + VARIANT_COLUMN_WIDTH;
export const QTY_COLUMN_WIDTH = 88;
export const REQUIRED_HUG_COLUMN_WIDTH = 88;
export const TO_BRING_HUG_COLUMN_WIDTH = 92;
export const WAREHOUSE_HUG_COLUMN_WIDTH = 96;
export const ISSUED_HUG_COLUMN_WIDTH = 88;
export const FULFILLMENT_COLUMN_WIDTH = 132;
export const QTY_HUG_COLUMNS_SCROLL_WIDTH =
  REQUIRED_HUG_COLUMN_WIDTH +
  TO_BRING_HUG_COLUMN_WIDTH +
  WAREHOUSE_HUG_COLUMN_WIDTH +
  ISSUED_HUG_COLUMN_WIDTH +
  FULFILLMENT_COLUMN_WIDTH;
export const REQUIRED_TO_BRING_HUG_SCROLL_WIDTH =
  REQUIRED_HUG_COLUMN_WIDTH + TO_BRING_HUG_COLUMN_WIDTH;
export const UOM_COLUMN_WIDTH = 70;
export const REMARKS_COLUMN_WIDTH = 160;
export const APPROVED_BY_COLUMN_WIDTH = 140;
export const APPROVED_ON_COLUMN_WIDTH = 130;
export const POL_FULFILLED_COLUMN_WIDTH = 88;
export const TRADE_COLUMN_WIDTH = 90;
export const SYSTEM_COLUMN_WIDTH = 120;
export const MRP_CONTROLLER_COLUMN_WIDTH = 120;

/** 7th column width shared by shortfall and deviation summary tables. */
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

export function getMrpControllerColumn<T extends { mrpController?: string }>(): ColumnType<T> {
  return {
    title: 'MRP controller',
    key: 'mrpController',
    width: MRP_CONTROLLER_COLUMN_WIDTH,
    render: (_: unknown, record: T) => record.mrpController?.trim() || '—',
  };
}

export function getPlatformVariantColumn<T extends PlanLine>(
  platform: Platform,
  variant: string,
  options: ComponentTableColumnOptions = {},
): ColumnType<T> {
  const planVariants =
    options.planVariants ??
    variant
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  const getApplicableVariants =
    options.getApplicableVariants ?? (() => planVariants);

  return {
    title: 'Platform / Variant',
    key: 'platformVariant',
    width: PLATFORM_VARIANT_COLUMN_WIDTH,
    filters: planVariants.map((planVariant) => ({
      text: `${platform} · ${planVariant}`,
      value: planVariant,
    })),
    onFilter: (value, record) =>
      getApplicableVariants(record).includes(String(value)),
    render: (_: unknown, record: T) => {
      const applicableVariants = getApplicableVariants(record);
      return (
        <PlatformVariantTags
          platform={platform}
          variant={applicableVariants.join(', ')}
        />
      );
    },
  };
}

export function getPlatformColumn<T extends PlanLine>(platform: Platform): ColumnType<T> {
  return {
    title: 'Platform',
    key: 'platform',
    width: PLATFORM_COLUMN_WIDTH,
    filters: [{ text: platform, value: platform }],
    onFilter: (value) => value === platform,
    render: () => <Tag>{platform}</Tag>,
  };
}

export function getVariantColumn<T extends PlanLine>(
  variant: string,
  options: ComponentTableColumnOptions = {},
): ColumnType<T> {
  const planVariants =
    options.planVariants ??
    variant
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  const getApplicableVariants =
    options.getApplicableVariants ?? (() => planVariants);

  return {
    title: 'Variant',
    key: 'variant',
    width: VARIANT_COLUMN_WIDTH,
    filters: planVariants.map((planVariant) => ({
      text: planVariant,
      value: planVariant,
    })),
    onFilter: (value, record) =>
      getApplicableVariants(record).includes(String(value)),
    render: (_: unknown, record: T) => {
      const applicableVariants = getApplicableVariants(record);
      if (applicableVariants.length === 0) return '—';

      return (
        <Space size={[4, 4]} wrap>
          {applicableVariants.map((planVariant) => (
            <Tag key={planVariant}>{planVariant}</Tag>
          ))}
        </Space>
      );
    },
  };
}

export function getComponentPlatformVariantColumns<T extends PlanLine>(
  platform: Platform,
  variant: string,
  options: ComponentTableColumnOptions = {},
): ColumnType<T>[] {
  const planVariants =
    options.planVariants ??
    variant
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  return [
    getPlatformColumn<T>(platform),
    getVariantColumn<T>(variant, { ...options, planVariants }),
  ];
}

export function getNsnColumnLinkRenderer(
  onViewNsn: (line: PlanLine) => void,
): NonNullable<ColumnType<PlanLine>['render']> {
  return (value: string, record: PlanLine) => (
    <Button
      type="link"
      size="small"
      className="nsn-link"
      style={{ padding: 0 }}
      onClick={() => onViewNsn(record)}
    >
      {value}
    </Button>
  );
}

export function getNsnMpnDescriptionColumns<T extends NsnRow>(
  onViewNsn?: (line: PlanLine) => void,
): ColumnType<T>[] {
  const nsnRender = onViewNsn
    ? (getNsnColumnLinkRenderer(onViewNsn) as unknown as ColumnType<T>['render'])
    : undefined;

  return [
    {
      title: 'NSN',
      dataIndex: 'nsn',
      width: NSN_COLUMN_WIDTH,
      ellipsis: true,
      render: nsnRender,
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

export function getNumericQtySortFilter<T>(
  getValue: (record: T) => number,
  rows: T[] = [],
): Pick<ColumnType<T>, 'sorter' | 'filters' | 'onFilter'> {
  const filters = [...new Set(rows.map(getValue))]
    .sort((a, b) => a - b)
    .map((value) => ({ text: String(value), value }));

  return {
    sorter: (a, b) => getValue(a) - getValue(b),
    filters,
    onFilter: (value, record) => getValue(record) === value,
  };
}

export function withTableHugColumn<T>(column: ColumnType<T>, width: number): ColumnType<T> {
  return {
    ...column,
    width,
    onHeaderCell: () => ({ className: 'table-hug-col' }),
    onCell: () => ({ className: 'table-hug-col' }),
  };
}

export function getRequiredColumn<T extends PlanLine>(lines: PlanLine[] = []): ColumnType<T> {
  return withTableHugColumn(
    {
      title: 'Required',
      key: 'requiredQty',
      ...getNumericQtySortFilter<T>((record) => record.requiredQty, lines as T[]),
      render: (_: unknown, record: T) => record.requiredQty,
    },
    REQUIRED_HUG_COLUMN_WIDTH,
  );
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
  options: { lines?: PlanLine[] } = {},
): ColumnType<T> {
  const lines = options.lines ?? [];
  return withTableHugColumn(
    {
      title: 'Warehouse',
      dataIndex: 'availableQty',
      render,
      ...getNumericQtySortFilter<T>((record) => getGroupAvailableQty(record), lines as T[]),
    },
    WAREHOUSE_HUG_COLUMN_WIDTH,
  );
}

export function getToBringColumn<T extends PlanLine>(lines: PlanLine[] = []): ColumnType<T> {
  return withTableHugColumn(
    {
      title: 'To-bring',
      dataIndex: 'toBringQty',
      ...getNumericQtySortFilter<T>((record) => record.toBringQty, lines as T[]),
    },
    TO_BRING_HUG_COLUMN_WIDTH,
  );
}

export function getIssuedColumnLinkRenderer(
  onEditIssued: (line: PlanLine) => void,
): NonNullable<ColumnType<PlanLine>['render']> {
  return (_: unknown, record: PlanLine) => (
    <Button
      type="link"
      size="small"
      className="issued-qty-link"
      style={{ padding: 0 }}
      onClick={() => onEditIssued(record)}
    >
      {getDisplayIssuedQty(record)}
    </Button>
  );
}

export function getIssuedColumn<T extends PlanLine>(
  lines: PlanLine[] = [],
  onEditIssued?: (line: PlanLine) => void,
): ColumnType<T> {
  const render = onEditIssued
    ? (getIssuedColumnLinkRenderer(onEditIssued) as ColumnType<T>['render'])
    : (_: unknown, record: T) => getDisplayIssuedQty(record);

  return withTableHugColumn(
    {
      title: 'Issued',
      key: 'issuedQty',
      ...getNumericQtySortFilter<T>((record) => getDisplayIssuedQty(record), lines as T[]),
      render,
    },
    ISSUED_HUG_COLUMN_WIDTH,
  );
}

export function getFulfillmentColumn<T extends PlanLine>(): ColumnType<T> {
  return {
    title: 'Fulfillment',
    key: 'fulfillment',
    width: FULFILLMENT_COLUMN_WIDTH,
    render: (_: unknown, record: T) => <FulfillmentStatusTags line={record} />,
  };
}

export function getStatusColumn<T extends PlanLine>(): ColumnType<T> {
  return {
    title: 'Status',
    key: 'status',
    width: STATUS_COLUMN_WIDTH,
    render: (_: unknown, record: T) => <LineStatusTags line={record} />,
  };
}

export function getRequiredToBringWarehouseIssuedColumns<T extends PlanLine>(
  onViewInventory?: (line: PlanLine) => void,
  onEditIssued?: (line: PlanLine) => void,
  options: { lines?: PlanLine[] } = {},
): ColumnType<T>[] {
  const lines = options.lines ?? [];
  const inventoryRender = onViewInventory
    ? (getAvailableColumnLinkRenderer(onViewInventory) as ColumnType<T>['render'])
    : undefined;
  return [
    getRequiredColumn<T>(lines),
    getToBringColumn<T>(lines),
    getAvailableColumn<T>(inventoryRender, { lines }),
    getIssuedColumn<T>(lines, onEditIssued),
  ];
}

export function getFulfillmentStatusColumns<T extends PlanLine>(): ColumnType<T>[] {
  return [getFulfillmentColumn<T>(), getStatusColumn<T>()];
}

/** @deprecated Use getRequiredToBringWarehouseIssuedColumns + getFulfillmentStatusColumns */
export function getRequiredToBringInWarehouseColumns<T extends PlanLine>(
  onViewInventory?: (line: PlanLine) => void,
  options: { lines?: PlanLine[]; onEditIssued?: (line: PlanLine) => void } = {},
): ColumnType<T>[] {
  const lines = options.lines ?? [];
  return [
    ...getRequiredToBringWarehouseIssuedColumns<T>(
      onViewInventory,
      options.onEditIssued,
      { lines },
    ),
    ...getFulfillmentStatusColumns<T>(),
  ];
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

export function getApprovedByColumn<T extends PlanLine>(
  lines: PlanLine[] = [],
): ColumnType<T> {
  const approvers = [
    ...new Set(
      lines
        .map((line) => line.offlineApproval?.approverName?.trim())
        .filter((name): name is string => !!name),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return {
    title: 'Approved by',
    key: 'approvedBy',
    width: APPROVED_BY_COLUMN_WIDTH,
    ellipsis: true,
    sorter: (a, b) =>
      (a.offlineApproval?.approverName?.trim() ?? '').localeCompare(
        b.offlineApproval?.approverName?.trim() ?? '',
      ),
    filters: [
      { text: 'Not approved', value: NOT_APPROVED_FILTER_VALUE },
      ...approvers.map((name) => ({ text: name, value: name })),
    ],
    onFilter: (value, record) => {
      const approver = record.offlineApproval?.approverName?.trim();
      if (value === NOT_APPROVED_FILTER_VALUE) return !approver;
      return approver === value;
    },
    render: (_: unknown, record: T) => record.offlineApproval?.approverName?.trim() || '—',
  };
}

export function getApprovedOnColumn<T extends PlanLine>(
  lines: PlanLine[] = [],
): ColumnType<T> {
  const approvalDates = [
    ...new Set(
      lines
        .map((line) => line.offlineApproval?.approvedDate)
        .filter((date): date is string => !!date),
    ),
  ].sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());

  return {
    title: 'Approved on',
    key: 'approvedOn',
    width: APPROVED_ON_COLUMN_WIDTH,
    sorter: (a, b) => {
      const aTime = a.offlineApproval?.approvedDate
        ? dayjs(a.offlineApproval.approvedDate).valueOf()
        : 0;
      const bTime = b.offlineApproval?.approvedDate
        ? dayjs(b.offlineApproval.approvedDate).valueOf()
        : 0;
      return aTime - bTime;
    },
    filters: [
      { text: 'Not approved', value: NOT_APPROVED_FILTER_VALUE },
      ...approvalDates.map((date) => ({ text: formatDate(date), value: date })),
    ],
    onFilter: (value, record) => {
      const date = record.offlineApproval?.approvedDate;
      if (value === NOT_APPROVED_FILTER_VALUE) return !date;
      return date === value;
    },
    render: (_: unknown, record: T) => {
      const date = record.offlineApproval?.approvedDate;
      return date ? formatDate(date) : '—';
    },
  };
}

export function getApprovalMetaColumns<T extends PlanLine>(
  lines: PlanLine[] = [],
): ColumnType<T>[] {
  return [getApprovedByColumn<T>(lines), getApprovedOnColumn<T>(lines)];
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

/** POL tab: reference columns with warehouse, issued, fulfillment, status. */
export function getPolReferenceColumns<T extends PlanLine>(
  platform: Platform,
  variant: string,
  columnVisibility: Partial<Record<'remarks' | 'uom', boolean>> = {},
  tableOptions: ComponentTableColumnOptions = {},
  onViewInventory?: (line: PlanLine) => void,
  onEditIssued?: (line: PlanLine) => void,
): ColumnType<T>[] {
  const showRemarks = columnVisibility.remarks !== false;
  const showUom = columnVisibility.uom !== false;
  const lines = tableOptions.lines ?? [];

  const inventoryRender = onViewInventory
    ? (getAvailableColumnLinkRenderer(onViewInventory) as ColumnType<T>['render'])
    : undefined;

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
    ...getComponentPlatformVariantColumns<T>(platform, variant, tableOptions),
    getRequiredColumn<T>(lines),
    getToBringColumn<T>(lines),
    getAvailableColumn<T>(inventoryRender, { lines }),
    getIssuedColumn<T>(lines, onEditIssued),
  ];

  if (showUom) {
    columns.push(getUomColumn<T>());
  }
  if (showRemarks) {
    columns.push(getRemarksColumn<T>());
  }

  columns.push(...getFulfillmentStatusColumns<T>(), ...getApprovalMetaColumns<T>(lines));

  return columns;
}

export function getOperationalComponentColumns(
  category: Extract<ComponentCategory, 'LRU' | 'Consumable'>,
  platform: Platform,
  variant: string,
  onViewInventory: (line: PlanLine) => void,
  columnVisibility: Partial<Record<'trade' | 'system' | 'mrpController' | 'remarks', boolean>> = {},
  tableOptions: ComponentTableColumnOptions = {},
  onViewNsn?: (line: PlanLine) => void,
  onEditIssued?: (line: PlanLine) => void,
): ColumnType<PlanLine>[] {
  const showTrade = category === 'LRU' && columnVisibility.trade === true;
  const showSystem = category === 'LRU' && columnVisibility.system === true;
  const showMrpController = columnVisibility.mrpController === true;
  const showRemarks = columnVisibility.remarks !== false;
  const lines = tableOptions.lines ?? [];

  const columns: ColumnType<PlanLine>[] = [
    ...getNsnMpnDescriptionColumns<PlanLine>(onViewNsn),
  ];

  if (showTrade) {
    columns.push(getTradeColumn<PlanLine>());
  }
  if (showSystem) {
    columns.push(getSystemColumn<PlanLine>());
  }
  if (showMrpController) {
    columns.push(getMrpControllerColumn<PlanLine>());
  }

  columns.push(
    ...getComponentPlatformVariantColumns<PlanLine>(platform, variant, tableOptions),
    ...getRequiredToBringWarehouseIssuedColumns<PlanLine>(onViewInventory, onEditIssued, { lines }),
    ...getFulfillmentStatusColumns<PlanLine>(),
  );

  if (showRemarks) {
    columns.push(getRemarksColumn<PlanLine>());
  }

  columns.push(...getApprovalMetaColumns<PlanLine>(lines));

  return columns;
}

export function computeOperationalTableScrollX(
  category: Extract<ComponentCategory, 'LRU' | 'Consumable'>,
  columnVisibility: Partial<Record<'trade' | 'system' | 'mrpController' | 'remarks', boolean>> = {},
): number {
  const extraWidths = [
    COMPONENT_PLATFORM_VARIANT_WIDTH,
    REQUIRED_HUG_COLUMN_WIDTH,
    TO_BRING_HUG_COLUMN_WIDTH,
    WAREHOUSE_HUG_COLUMN_WIDTH,
    ISSUED_HUG_COLUMN_WIDTH,
    FULFILLMENT_COLUMN_WIDTH,
    STATUS_COLUMN_WIDTH,
    APPROVED_BY_COLUMN_WIDTH,
    APPROVED_ON_COLUMN_WIDTH,
    ACTION_COLUMN_WIDTH,
  ];

  if (category === 'LRU' && columnVisibility.trade === true) {
    extraWidths.unshift(TRADE_COLUMN_WIDTH);
  }
  if (category === 'LRU' && columnVisibility.system === true) {
    extraWidths.unshift(SYSTEM_COLUMN_WIDTH);
  }
  if (columnVisibility.mrpController === true) {
    extraWidths.unshift(MRP_CONTROLLER_COLUMN_WIDTH);
  }
  if (columnVisibility.remarks !== false) {
    extraWidths.splice(-3, 0, REMARKS_COLUMN_WIDTH);
  }

  return computeDetachmentTableScrollX(extraWidths);
}

export function computePolTableScrollX(
  columnVisibility: Partial<Record<'remarks' | 'uom', boolean>> = {},
  options: { includeAction?: boolean } = {},
): number {
  const { includeAction = false } = options;
  const extraWidths = [
    COMPONENT_PLATFORM_VARIANT_WIDTH,
    REQUIRED_HUG_COLUMN_WIDTH,
    TO_BRING_HUG_COLUMN_WIDTH,
    WAREHOUSE_HUG_COLUMN_WIDTH,
    ISSUED_HUG_COLUMN_WIDTH,
  ];

  if (columnVisibility.uom !== false) {
    extraWidths.push(UOM_COLUMN_WIDTH);
  }
  if (columnVisibility.remarks !== false) {
    extraWidths.push(REMARKS_COLUMN_WIDTH);
  }

  extraWidths.push(
    FULFILLMENT_COLUMN_WIDTH,
    STATUS_COLUMN_WIDTH,
    APPROVED_BY_COLUMN_WIDTH,
    APPROVED_ON_COLUMN_WIDTH,
  );

  if (includeAction) {
    extraWidths.push(ACTION_COLUMN_WIDTH);
  }

  return computeDetachmentTableScrollX(extraWidths);
}

export function getSummaryToBringColumn<T extends PlanLine>(lines: PlanLine[] = []): ColumnType<T> {
  return getToBringColumn<T>(lines);
}

export function getSummaryShortfallDeltaColumn<T extends PlanLine>(): ColumnType<T> {
  return {
    title: 'Shortfall',
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
    title: 'Deviation',
    key: 'delta',
    width,
    onCell: (record: T) => {
      const delta = getDeviationDelta(record);
      const className =
        delta < 0
          ? 'deviation-delta-cell deviation-delta-cell--down'
          : 'deviation-delta-cell';
      return { className };
    },
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

/** LRU tab: Trade, System, Platform, Variant, Required, To-bring, Warehouse, Issued, Fulfillment, Remarks, Approved by, Approved on, Status, Action */
export const LRU_OPERATIONAL_TABLE_SCROLL_X = computeDetachmentTableScrollX([
  TRADE_COLUMN_WIDTH,
  SYSTEM_COLUMN_WIDTH,
  COMPONENT_PLATFORM_VARIANT_WIDTH,
  REQUIRED_HUG_COLUMN_WIDTH,
  TO_BRING_HUG_COLUMN_WIDTH,
  WAREHOUSE_HUG_COLUMN_WIDTH,
  ISSUED_HUG_COLUMN_WIDTH,
  FULFILLMENT_COLUMN_WIDTH,
  REMARKS_COLUMN_WIDTH,
  APPROVED_BY_COLUMN_WIDTH,
  APPROVED_ON_COLUMN_WIDTH,
  STATUS_COLUMN_WIDTH,
  ACTION_COLUMN_WIDTH,
]);

/** Consumable tab: Platform, Variant, Required, To-bring, Warehouse, Issued, Fulfillment, Remarks, Approved by, Approved on, Status, Action */
export const CONSUMABLE_OPERATIONAL_TABLE_SCROLL_X = computeDetachmentTableScrollX([
  COMPONENT_PLATFORM_VARIANT_WIDTH,
  REQUIRED_HUG_COLUMN_WIDTH,
  TO_BRING_HUG_COLUMN_WIDTH,
  WAREHOUSE_HUG_COLUMN_WIDTH,
  ISSUED_HUG_COLUMN_WIDTH,
  FULFILLMENT_COLUMN_WIDTH,
  REMARKS_COLUMN_WIDTH,
  APPROVED_BY_COLUMN_WIDTH,
  APPROVED_ON_COLUMN_WIDTH,
  STATUS_COLUMN_WIDTH,
  ACTION_COLUMN_WIDTH,
]);

/** @deprecated Use LRU_OPERATIONAL_TABLE_SCROLL_X or CONSUMABLE_OPERATIONAL_TABLE_SCROLL_X */
export const DETACHMENT_TABLE_SCROLL_X = LRU_OPERATIONAL_TABLE_SCROLL_X;

/** POL reference table: Platform, Variant, Required, To-bring, UOM, Remarks, Fulfilled */
export const POL_REFERENCE_TABLE_SCROLL_X = computeDetachmentTableScrollX([
  COMPONENT_PLATFORM_VARIANT_WIDTH,
  REQUIRED_HUG_COLUMN_WIDTH,
  TO_BRING_HUG_COLUMN_WIDTH,
  UOM_COLUMN_WIDTH,
  REMARKS_COLUMN_WIDTH,
  POL_FULFILLED_COLUMN_WIDTH,
]);

export function computeWorkQueueTableScrollX(
  columnVisibility: Partial<Record<'mrpController', boolean>> = {},
): number {
  const extraWidths = [
    PLATFORM_VARIANT_COLUMN_WIDTH,
    REQUIRED_HUG_COLUMN_WIDTH,
    TO_BRING_HUG_COLUMN_WIDTH,
    WAREHOUSE_HUG_COLUMN_WIDTH,
    ISSUED_HUG_COLUMN_WIDTH,
    FULFILLMENT_COLUMN_WIDTH,
    STATUS_COLUMN_WIDTH,
    SUMMARY_SEVENTH_COLUMN_WIDTH,
    SUMMARY_EDIT_COLUMN_WIDTH,
  ];

  if (columnVisibility.mrpController === true) {
    extraWidths.unshift(MRP_CONTROLLER_COLUMN_WIDTH);
  }

  return computeDetachmentTableScrollX(extraWidths);
}

export function computeAwaitingSparesTableScrollX(
  columnVisibility: Partial<Record<'mrpController', boolean>> = {},
): number {
  const extraWidths = [
    PLATFORM_VARIANT_COLUMN_WIDTH,
    REQUIRED_HUG_COLUMN_WIDTH,
    TO_BRING_HUG_COLUMN_WIDTH,
    WAREHOUSE_HUG_COLUMN_WIDTH,
    ISSUED_HUG_COLUMN_WIDTH,
    FULFILLMENT_COLUMN_WIDTH,
    STATUS_COLUMN_WIDTH,
    FLEX_TEXT_COLUMN_MIN_WIDTH,
    SUMMARY_EDIT_COLUMN_WIDTH,
  ];

  if (columnVisibility.mrpController === true) {
    extraWidths.unshift(MRP_CONTROLLER_COLUMN_WIDTH);
  }

  return computeDetachmentTableScrollX(extraWidths);
}

/** Approval pack shortfall: Platform/Variant, Required, To-bring, Warehouse, Issued, Fulfillment, Shortfall, Resolution, Edit */
export const APPROVAL_PACK_SHORTFALL_SCROLL_X = computeDetachmentTableScrollX([
  PLATFORM_VARIANT_COLUMN_WIDTH,
  REQUIRED_HUG_COLUMN_WIDTH,
  TO_BRING_HUG_COLUMN_WIDTH,
  WAREHOUSE_HUG_COLUMN_WIDTH,
  ISSUED_HUG_COLUMN_WIDTH,
  FULFILLMENT_COLUMN_WIDTH,
  SUMMARY_SEVENTH_COLUMN_WIDTH,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
  SUMMARY_EDIT_COLUMN_WIDTH,
]);

/** Approval pack deviation: Platform/Variant, Required, To-bring, Warehouse, Issued, Fulfillment, Deviation, Reason, Edit */
export const APPROVAL_PACK_DEVIATION_SCROLL_X = computeDetachmentTableScrollX([
  PLATFORM_VARIANT_COLUMN_WIDTH,
  REQUIRED_HUG_COLUMN_WIDTH,
  TO_BRING_HUG_COLUMN_WIDTH,
  WAREHOUSE_HUG_COLUMN_WIDTH,
  ISSUED_HUG_COLUMN_WIDTH,
  FULFILLMENT_COLUMN_WIDTH,
  80,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
  SUMMARY_EDIT_COLUMN_WIDTH,
]);

/** @deprecated Use APPROVAL_PACK_DEVIATION_SCROLL_X */
export const DEVIATION_SUMMARY_SCROLL_X = APPROVAL_PACK_DEVIATION_SCROLL_X;

/** @deprecated Use APPROVAL_PACK_SHORTFALL_SCROLL_X */
export const SHORTFALL_SUMMARY_SCROLL_X = APPROVAL_PACK_SHORTFALL_SCROLL_X;
