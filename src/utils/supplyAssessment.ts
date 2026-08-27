import dayjs from 'dayjs';
import { getNewBuyRows, getRepairRows } from '../data/nsnDrilldownMock';
import type { PlanLine } from '../types/planLine';

export type SupplyRecommendation =
  | 'Cannibalise'
  | 'Wait for Repair / New buys'
  | 'Wait for New buys'
  | 'Expedite New buys';

export interface SupplyAssessment {
  repairEarliestEdd: string | null;
  repairPoNumber: string | null;
  newBuyEarliestEdd: string | null;
  newBuyPoNumber: string | null;
  sparesRequiredBy: string;
  recommendation: SupplyRecommendation;
}

interface DatedPo {
  eddIso: string;
  poNo: string;
}

function parseFormattedEdd(edd: string): dayjs.Dayjs {
  return dayjs(edd, 'D MMM YYYY');
}

function findEarliestSupply(
  rows: { edd: string; poNo: string }[],
): DatedPo | null {
  if (rows.length === 0) return null;

  let earliest = rows[0];
  let earliestDay = parseFormattedEdd(earliest.edd);

  for (const row of rows.slice(1)) {
    const candidate = parseFormattedEdd(row.edd);
    if (candidate.isBefore(earliestDay, 'day')) {
      earliest = row;
      earliestDay = candidate;
    }
  }

  return {
    eddIso: earliestDay.format('YYYY-MM-DD'),
    poNo: earliest.poNo,
  };
}

function exceedsNeedBy(eddIso: string, needByIso: string): boolean {
  return dayjs(eddIso).startOf('day').isAfter(dayjs(needByIso).startOf('day'));
}

function isConsumableLine(line: PlanLine): boolean {
  return line.componentCategory === 'Consumable';
}

function assessConsumableSupply(
  newBuy: DatedPo | null,
  sparesRequiredBy: string,
): SupplyRecommendation {
  if (!newBuy) return 'Expedite New buys';
  return exceedsNeedBy(newBuy.eddIso, sparesRequiredBy)
    ? 'Expedite New buys'
    : 'Wait for New buys';
}

function assessOperationalSupply(
  repair: DatedPo | null,
  newBuy: DatedPo | null,
  sparesRequiredBy: string,
): SupplyRecommendation {
  const repairExceeds = repair ? exceedsNeedBy(repair.eddIso, sparesRequiredBy) : false;
  const newBuyExceeds = newBuy ? exceedsNeedBy(newBuy.eddIso, sparesRequiredBy) : false;

  if (repair && newBuy && repairExceeds && newBuyExceeds) {
    return 'Cannibalise';
  }

  return 'Wait for Repair / New buys';
}

export function assessSupply(line: PlanLine, sparesRequiredBy: string): SupplyAssessment {
  const repair = findEarliestSupply(getRepairRows(line));
  const newBuy = findEarliestSupply(getNewBuyRows(line));

  const recommendation = isConsumableLine(line)
    ? assessConsumableSupply(newBuy, sparesRequiredBy)
    : assessOperationalSupply(repair, newBuy, sparesRequiredBy);

  return {
    repairEarliestEdd: repair?.eddIso ?? null,
    repairPoNumber: repair?.poNo ?? null,
    newBuyEarliestEdd: newBuy?.eddIso ?? null,
    newBuyPoNumber: newBuy?.poNo ?? null,
    sparesRequiredBy,
    recommendation,
  };
}
