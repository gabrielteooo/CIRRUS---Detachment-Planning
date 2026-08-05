import type { PlanLine } from '../types/planLine';
import { formatDate } from '../utils/planUtils';

export interface StorageLocationRow {
  id: string;
  serialNo: string;
  batchNo: string;
  sloc: string;
  slocDescription: string;
  equipmentNo: string;
  qty: number;
  stockStatus: string;
  remainingUtilisationAfH: number;
  tsn: number;
  tso: number;
  remainingShelfLife: number;
  shelfLife: string;
}

export interface OnAircraftRow {
  id: string;
  serialNo: string;
  batchNo: string;
  tailNo: string;
  flDescription: string;
  equipmentNo: string;
  qty: number;
  servicingDue: string;
  remainingDays: number;
  remainingUtilisationAfH: number;
  tsi: number;
  tsn: number;
  tso: number;
}

export type NewBuyStatus = 'PR Release' | 'PO Release' | 'Delivered';

export interface NewBuyRow {
  id: string;
  prNo: string;
  poNo: string;
  status: NewBuyStatus;
  prDate: string;
  poDate: string;
  qty: number;
  edd: string;
  sdd: string;
  vendor: string;
  airwayBill: string;
  agingDays: number;
  timeSincePrRaisedDays: number;
}

const STOCK_STATUS_BY_INVENTORY: Record<string, string> = {
  'In WH': 'Warehouse',
  Blocked: 'Blocked',
  QI: 'QI',
  QIT: 'QIT',
};

function padSerial(index: number): string {
  return `T${String(index).padStart(8, '0')}`;
}

function padEquipment(index: number): string {
  return `E${String(index).padStart(8, '0')}`;
}

function slocFromLocation(location: string, index: number): string {
  if (location.includes('WH-A')) return 'SL01';
  if (location.includes('WH-B')) return 'SL02';
  return index % 2 === 0 ? 'SL01' : 'SL02';
}

export function getStorageLocationRows(line: PlanLine): StorageLocationRow[] {
  if (line.inventory.length === 0) {
    return [
      {
        id: `${line.nsn}-storage-0`,
        serialNo: padSerial(1),
        batchNo: '',
        sloc: 'SL01',
        slocDescription: 'XXXXX-XXX-S',
        equipmentNo: padEquipment(1),
        qty: 0,
        stockStatus: 'Warehouse',
        remainingUtilisationAfH: 20,
        tsn: 2074,
        tso: 316,
        remainingShelfLife: 20,
        shelfLife: '31 Dec 2025',
      },
    ];
  }

  return line.inventory.map((item, index) => ({
    id: `${line.nsn}-storage-${index}`,
    serialNo: padSerial(index + 1),
    batchNo: '',
    sloc: slocFromLocation(item.location, index),
    slocDescription: item.location || 'XXXXX-XXX-S',
    equipmentNo: padEquipment(index + 1),
    qty: item.qty,
    stockStatus: STOCK_STATUS_BY_INVENTORY[item.status] ?? item.status,
    remainingUtilisationAfH: 20,
    tsn: 2074 + index * 76,
    tso: 316 - index * 14,
    remainingShelfLife: 20,
    shelfLife: '31 Dec 2025',
  }));
}

export function getOnAircraftRows(line: PlanLine): OnAircraftRow[] {
  const tailNumbers = ['982', '9876', '2041', '3012'];
  const flDescriptions = [line.nsn, 'XXXXX-XXX-S', '71-132131'];

  return tailNumbers.slice(0, 3).map((tailNo, index) => ({
    id: `${line.nsn}-aircraft-${index}`,
    serialNo: padSerial(index + 1),
    batchNo: '',
    tailNo,
    flDescription: flDescriptions[index] ?? 'XXXXX-XXX-S',
    equipmentNo: padEquipment(index + 1),
    qty: 1,
    servicingDue: '31 Dec 2025',
    remainingDays: 20,
    remainingUtilisationAfH: 20,
    tsi: 1471 + index * 110,
    tsn: 2074 + index * 76,
    tso: 316 - index * 57,
  }));
}

export function getNewBuyRows(line: PlanLine): NewBuyRow[] {
  const statuses: NewBuyStatus[] = ['PR Release', 'PO Release', 'Delivered', 'PO Release'];
  const airwayBills = ['158-12345678', '', '158-87654321', ''];

  return statuses.map((status, index) => ({
    id: `${line.nsn}-newbuy-${index}`,
    prNo: `12345678${index}`,
    poNo: `12345678${index}`,
    status,
    prDate: formatDate('2026-01-05'),
    poDate: formatDate('2026-01-05'),
    qty: (index + 1) * 10,
    edd: formatDate('2026-02-05'),
    sdd: formatDate('2026-02-05'),
    vendor: 'ST Logistics',
    airwayBill: airwayBills[index] ?? '',
    agingDays: (index + 1) * 30,
    timeSincePrRaisedDays: (index + 1) * 30,
  }));
}
