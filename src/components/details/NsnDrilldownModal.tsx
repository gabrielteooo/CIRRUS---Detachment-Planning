import { useMemo } from 'react';
import { Modal, Table, Tabs, Tag, Typography, Button, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PlanLine } from '../../types/planLine';
import {
  getNewBuyRows,
  getOnAircraftRows,
  getRepairRows,
  getStorageLocationRows,
  type NewBuyRow,
  type OnAircraftRow,
  type RepairRow,
  type StorageLocationRow,
} from '../../data/nsnDrilldownMock';
import { DETACHMENT_TABLE_LAYOUT } from './nsnTableColumns';

interface NsnDrilldownModalProps {
  line: PlanLine | null;
  open: boolean;
  onClose: () => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function CopyableText({ value }: { value: string }) {
  if (!value) return '—';

  return (
    <span className="nsn-drilldown-copy-cell">
      <span>{value}</span>
      <Button
        type="text"
        size="small"
        className="nsn-drilldown-copy-btn"
        icon={<CopyOutlined />}
        aria-label={`Copy ${value}`}
        onClick={() => {
          void navigator.clipboard.writeText(value);
          message.success('Copied');
        }}
      />
    </span>
  );
}

function NewBuyStatusTag({ status }: { status: NewBuyRow['status'] }) {
  return <Tag className="new-buy-status-tag">{status}</Tag>;
}

function RepairStatusTag({ status }: { status: RepairRow['status'] }) {
  return <Tag className="repair-status-tag">{status}</Tag>;
}

const STORAGE_COLUMNS: ColumnsType<StorageLocationRow> = [
  { title: 'S/N No.', dataIndex: 'serialNo', width: 120, ellipsis: true },
  { title: 'Batch no.', dataIndex: 'batchNo', width: 110, render: (v: string) => v || '—' },
  { title: 'SLoc', dataIndex: 'sloc', width: 90 },
  { title: 'SLoc Description', dataIndex: 'slocDescription', width: 180, ellipsis: true },
  { title: 'Equipment No.', dataIndex: 'equipmentNo', width: 130, ellipsis: true },
  { title: 'Qty', dataIndex: 'qty', width: 70, align: 'right' },
  { title: 'Stock Status', dataIndex: 'stockStatus', width: 120 },
  {
    title: 'Remaining Utilisation (AFH)',
    dataIndex: 'remainingUtilisationAfH',
    width: 190,
    align: 'right',
  },
  {
    title: 'TSN',
    dataIndex: 'tsn',
    width: 90,
    align: 'right',
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'TSO',
    dataIndex: 'tso',
    width: 90,
    align: 'right',
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'Remaining Shelf Life',
    dataIndex: 'remainingShelfLife',
    width: 150,
    align: 'right',
  },
  { title: 'Shelf Life', dataIndex: 'shelfLife', width: 120 },
];

const ON_AIRCRAFT_COLUMNS: ColumnsType<OnAircraftRow> = [
  { title: 'S/N No.', dataIndex: 'serialNo', width: 120, ellipsis: true },
  { title: 'Batch No.', dataIndex: 'batchNo', width: 110, render: (v: string) => v || '—' },
  { title: 'Tail No.', dataIndex: 'tailNo', width: 90 },
  { title: 'FL Description', dataIndex: 'flDescription', width: 150, ellipsis: true },
  { title: 'Equipment No.', dataIndex: 'equipmentNo', width: 130, ellipsis: true },
  { title: 'Qty', dataIndex: 'qty', width: 70, align: 'right' },
  { title: 'Servicing due', dataIndex: 'servicingDue', width: 120 },
  { title: 'Remaining days', dataIndex: 'remainingDays', width: 120, align: 'right' },
  {
    title: 'Remaining Utilisation (AFH)',
    dataIndex: 'remainingUtilisationAfH',
    width: 190,
    align: 'right',
  },
  {
    title: 'TSI',
    dataIndex: 'tsi',
    width: 90,
    align: 'right',
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'TSN',
    dataIndex: 'tsn',
    width: 90,
    align: 'right',
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'TSO',
    dataIndex: 'tso',
    width: 90,
    align: 'right',
    render: (v: number) => formatNumber(v),
  },
];

const NEW_BUY_COLUMNS: ColumnsType<NewBuyRow> = [
  {
    title: 'PR No.',
    dataIndex: 'prNo',
    width: 130,
    render: (value: string) => <CopyableText value={value} />,
  },
  { title: 'PR Item', dataIndex: 'prItem', width: 90, align: 'right' },
  {
    title: 'PO No.',
    dataIndex: 'poNo',
    width: 130,
    render: (value: string) => <CopyableText value={value} />,
  },
  { title: 'PO Item', dataIndex: 'poItem', width: 90, align: 'right' },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 120,
    render: (status: NewBuyRow['status']) => <NewBuyStatusTag status={status} />,
  },
  { title: 'PR Date', dataIndex: 'prDate', width: 110 },
  { title: 'PO Date', dataIndex: 'poDate', width: 110 },
  { title: 'Qty', dataIndex: 'qty', width: 70, align: 'right' },
  { title: 'EDD', dataIndex: 'edd', width: 110 },
  { title: 'SDD', dataIndex: 'sdd', width: 110 },
  { title: 'Vendor', dataIndex: 'vendor', width: 120, ellipsis: true },
  {
    title: 'Airway Bill',
    dataIndex: 'airwayBill',
    width: 150,
    render: (value: string) => <CopyableText value={value} />,
  },
  { title: 'Aging (days)', dataIndex: 'agingDays', width: 110, align: 'right' },
  {
    title: 'Time since PR Raised',
    dataIndex: 'timeSincePrRaisedDays',
    width: 160,
    align: 'right',
  },
];

const STORAGE_SCROLL_X = STORAGE_COLUMNS.reduce((sum, col) => sum + Number(col.width ?? 120), 0);
const ON_AIRCRAFT_SCROLL_X = ON_AIRCRAFT_COLUMNS.reduce(
  (sum, col) => sum + Number(col.width ?? 120),
  0,
);
const NEW_BUY_SCROLL_X = NEW_BUY_COLUMNS.reduce((sum, col) => sum + Number(col.width ?? 120), 0);

const REPAIR_COLUMNS: ColumnsType<RepairRow> = [
  {
    title: 'PR No.',
    dataIndex: 'prNo',
    width: 130,
    render: (value: string) => <CopyableText value={value} />,
  },
  {
    title: 'PO No.',
    dataIndex: 'poNo',
    width: 130,
    render: (value: string) => <CopyableText value={value} />,
  },
  { title: 'S/N No.', dataIndex: 'serialNo', width: 120, ellipsis: true },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 120,
    render: (status: RepairRow['status']) => <RepairStatusTag status={status} />,
  },
  { title: 'PR Date', dataIndex: 'prDate', width: 110 },
  { title: 'PO Date', dataIndex: 'poDate', width: 110 },
  { title: 'Qty', dataIndex: 'qty', width: 70, align: 'right' },
  { title: 'EDD', dataIndex: 'edd', width: 110 },
  { title: 'SDD', dataIndex: 'sdd', width: 110 },
  { title: 'Vendor', dataIndex: 'vendor', width: 120, ellipsis: true },
  {
    title: 'Airway Bill',
    dataIndex: 'airwayBill',
    width: 150,
    render: (value: string) => <CopyableText value={value} />,
  },
  { title: 'Aging (days)', dataIndex: 'agingDays', width: 110, align: 'right' },
  {
    title: 'Time since PR Raised',
    dataIndex: 'timeSincePrRaisedDays',
    width: 160,
    align: 'right',
  },
];

const REPAIR_SCROLL_X = REPAIR_COLUMNS.reduce((sum, col) => sum + Number(col.width ?? 120), 0);

export default function NsnDrilldownModal({ line, open, onClose }: NsnDrilldownModalProps) {
  const storageRows = useMemo(() => (line ? getStorageLocationRows(line) : []), [line]);
  const onAircraftRows = useMemo(() => (line ? getOnAircraftRows(line) : []), [line]);
  const newBuyRows = useMemo(() => (line ? getNewBuyRows(line) : []), [line]);
  const repairRows = useMemo(() => (line ? getRepairRows(line) : []), [line]);

  if (!line) return null;

  return (
    <Modal
      className="nsn-drilldown-modal"
      title={
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
            NSN drilldown
          </Typography.Text>
          <Typography.Text strong style={{ fontSize: 16 }}>
            {line.nsn}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
            {line.description}
          </Typography.Text>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1120}
      destroyOnClose
    >
      <Tabs
        className="nsn-drilldown-tabs"
        items={[
          {
            key: 'storage',
            label: 'Storage location',
            children: (
              <div className="nsn-drilldown-table-container">
                <Table
                  dataSource={storageRows}
                  columns={STORAGE_COLUMNS}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  tableLayout={DETACHMENT_TABLE_LAYOUT}
                  scroll={{ x: STORAGE_SCROLL_X }}
                />
              </div>
            ),
          },
          {
            key: 'on-aircraft',
            label: 'On Aircraft',
            children: (
              <div className="nsn-drilldown-table-container">
                <Table
                  dataSource={onAircraftRows}
                  columns={ON_AIRCRAFT_COLUMNS}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  tableLayout={DETACHMENT_TABLE_LAYOUT}
                  scroll={{ x: ON_AIRCRAFT_SCROLL_X }}
                />
              </div>
            ),
          },
          {
            key: 'new-buys',
            label: 'New buys',
            children: (
              <div className="nsn-drilldown-table-container">
                <Table
                  dataSource={newBuyRows}
                  columns={NEW_BUY_COLUMNS}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  tableLayout={DETACHMENT_TABLE_LAYOUT}
                  scroll={{ x: NEW_BUY_SCROLL_X }}
                />
              </div>
            ),
          },
          {
            key: 'repair',
            label: 'Repair',
            children: (
              <div className="nsn-drilldown-table-container">
                <Table
                  dataSource={repairRows}
                  columns={REPAIR_COLUMNS}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  tableLayout={DETACHMENT_TABLE_LAYOUT}
                  scroll={{ x: REPAIR_SCROLL_X }}
                />
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
