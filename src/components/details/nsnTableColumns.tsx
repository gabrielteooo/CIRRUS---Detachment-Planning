import type { ColumnType } from 'antd/es/table';
import { getMpnForNsn } from '../../data/lSeriesTemplate';
import type { PlanLine } from '../../types/planLine';

interface NsnRow {
  nsn: string;
  description: string;
}

/** Fixed widths so Required column aligns across all detachment detail tables. */
export const NSN_COLUMN_WIDTH = 120;
export const MPN_COLUMN_WIDTH = 120;
export const DESCRIPTION_COLUMN_WIDTH = 260;
export const QTY_COLUMN_WIDTH = 88;

export function getNsnMpnDescriptionColumns<T extends NsnRow>(): ColumnType<T>[] {
  return [
    { title: 'NSN', dataIndex: 'nsn', width: NSN_COLUMN_WIDTH, ellipsis: true },
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

export function getToBringColumn<T extends PlanLine>(): ColumnType<T> {
  return { title: 'To-bring', dataIndex: 'toBringQty', width: QTY_COLUMN_WIDTH };
}

export const DETACHMENT_TABLE_LAYOUT = 'fixed' as const;

const NSN_MPN_DESCRIPTION_WIDTH =
  NSN_COLUMN_WIDTH + MPN_COLUMN_WIDTH + DESCRIPTION_COLUMN_WIDTH;

export function computeDetachmentTableScrollX(extraColumnWidths: number[]): number {
  return NSN_MPN_DESCRIPTION_WIDTH + extraColumnWidths.reduce((sum, width) => sum + width, 0);
}

/** L-series table: Required, Available, To-bring, Status, Action */
export const DETACHMENT_TABLE_SCROLL_X = computeDetachmentTableScrollX([
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  110,
  80,
]);

/** Deviation summary: Required, Available, To-bring, Delta, Reason, Offline approval, Edit */
export const DEVIATION_SUMMARY_SCROLL_X = computeDetachmentTableScrollX([
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  QTY_COLUMN_WIDTH,
  70,
  220,
  160,
  70,
]);
