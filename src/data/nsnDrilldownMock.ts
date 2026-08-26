import dayjs from 'dayjs';
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
  prItem: string;
  poNo: string;
  poItem: string;
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

/** Demo EDD mix: ~1/3 Cannibalise (both late), ~2/3 Wait (repair or new buy meets need-by). */
function supplyEddProfile(nsn: string): { repairEddIso: string; newBuyEddIso: string } {
  const late = '2026-09-26';
  const earlyRepair = '2026-02-20';
  const earlyNewBuy = '2026-02-25';
  const bucket = nsn.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;

  switch (bucket) {
    case 0:
      return { repairEddIso: late, newBuyEddIso: late };
    case 1:
      return { repairEddIso: earlyRepair, newBuyEddIso: late };
    default:
      return { repairEddIso: late, newBuyEddIso: earlyNewBuy };
  }
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
  const { newBuyEddIso } = supplyEddProfile(line.nsn);
  const eddByRow = [newBuyEddIso, '2026-10-15', '2026-11-01', '2026-12-05'];

  return statuses.map((status, index) => ({
    id: `${line.nsn}-newbuy-${index}`,
    prNo: `12345678${index}`,
    prItem: String((index + 1) * 10).padStart(5, '0'),
    poNo: `12345678${index}`,
    poItem: String((index + 1) * 10).padStart(5, '0'),
    status,
    prDate: formatDate('2026-01-05'),
    poDate: formatDate('2026-01-05'),
    qty: (index + 1) * 10,
    edd: formatDate(eddByRow[index] ?? newBuyEddIso),
    sdd: formatDate('2026-02-05'),
    vendor: 'ST Logistics',
    airwayBill: airwayBills[index] ?? '',
    agingDays: (index + 1) * 30,
    timeSincePrRaisedDays: (index + 1) * 30,
  }));
}

export type RepairStatus = 'Sent out' | 'Repair done' | 'Delivered';

export interface RepairRow {
  id: string;
  prNo: string;
  poNo: string;
  serialNo: string;
  status: RepairStatus;
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

export function getRepairRows(line: PlanLine): RepairRow[] {
  const statuses: RepairStatus[] = ['Sent out', 'Repair done', 'Delivered', 'Delivered'];
  const prNumbers = ['123456789', '123456780', '123456789', '123456789'];
  const poNumbers = ['987654321', '987654322', '987654321', '987654321'];
  const { repairEddIso } = supplyEddProfile(line.nsn);
  const eddByRow = [repairEddIso, '2026-10-20', '2026-11-10', '2026-12-01'];

  return statuses.map((status, index) => ({
    id: `${line.nsn}-repair-${index}`,
    prNo: prNumbers[index] ?? '123456789',
    poNo: poNumbers[index] ?? '987654321',
    serialNo: padSerial(1),
    status,
    prDate: formatDate('2025-01-05'),
    poDate: formatDate('2025-01-05'),
    qty: 1,
    edd: formatDate(eddByRow[index] ?? repairEddIso),
    sdd: formatDate('2025-02-25'),
    vendor: 'ST Logistics',
    airwayBill: '158-12345678',
    agingDays: (index + 1) * 30,
    timeSincePrRaisedDays: (index + 1) * 30,
  }));
}

export interface AwaitingSupplyOrderOption {
  id: string;
  qty: number;
  poNumber: string;
  edd: string;
  serialNo?: string;
  source: 'repair' | 'newBuy';
}

function parseRowEdd(edd: string): string {
  return dayjs(edd, 'D MMM YYYY').format('YYYY-MM-DD');
}

export function formatAwaitingSupplyOrderLabel(option: AwaitingSupplyOrderOption): string {
  const serial = option.serialNo?.trim() ? option.serialNo : '—';
  return `${option.qty} | ${option.poNumber} | ${formatDate(option.edd)} | ${serial}`;
}

export function getAwaitingSupplyOrderOptions(line: PlanLine): AwaitingSupplyOrderOption[] {
  const repairOptions: AwaitingSupplyOrderOption[] = getRepairRows(line).map((row) => ({
    id: row.id,
    qty: row.qty,
    poNumber: row.poNo,
    edd: parseRowEdd(row.edd),
    serialNo: row.serialNo,
    source: 'repair' as const,
  }));

  const newBuyOptions: AwaitingSupplyOrderOption[] = getNewBuyRows(line).map((row) => ({
    id: row.id,
    qty: row.qty,
    poNumber: row.poNo,
    edd: parseRowEdd(row.edd),
    source: 'newBuy' as const,
  }));

  return [...repairOptions, ...newBuyOptions];
}

export interface CannibaliseTailOption {
  tailNo: string;
  etr: string;
  qpa: number;
}

export function formatCannibaliseTailLabel(option: CannibaliseTailOption): string {
  return `${option.tailNo} | ${formatDate(option.etr)} | QPA: ${option.qpa}`;
}

export function getCannibaliseTailOptions(line: PlanLine): CannibaliseTailOption[] {
  const qpaBase = (line.nsn.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3) + 1;

  const options: CannibaliseTailOption[] = [
    { tailNo: '9876', etr: '2026-11-20', qpa: qpaBase },
    { tailNo: '3012', etr: '2026-09-30', qpa: Math.max(1, qpaBase - 1) || 1 },
    { tailNo: '982', etr: '2026-08-15', qpa: qpaBase + 1 },
    { tailNo: '2041', etr: '2026-06-10', qpa: qpaBase },
  ];

  return options.sort(
    (left, right) => dayjs(right.etr).valueOf() - dayjs(left.etr).valueOf(),
  );
}
