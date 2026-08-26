import dayjs from 'dayjs';
import { getNewBuyRows, getRepairRows } from '../data/nsnDrilldownMock';
import type { PlanLine } from '../types/planLine';

export type SupplyRecommendation = 'Cannibalise' | 'Wait for Repair / New buys';

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

export function assessSupply(line: PlanLine, sparesRequiredBy: string): SupplyAssessment {
  const repair = findEarliestSupply(getRepairRows(line));
  const newBuy = findEarliestSupply(getNewBuyRows(line));

  const repairExceeds = repair ? exceedsNeedBy(repair.eddIso, sparesRequiredBy) : false;
  const newBuyExceeds = newBuy ? exceedsNeedBy(newBuy.eddIso, sparesRequiredBy) : false;

  const recommendation: SupplyRecommendation =
    repair && newBuy && repairExceeds && newBuyExceeds
      ? 'Cannibalise'
      : 'Wait for Repair / New buys';

  return {
    repairEarliestEdd: repair?.eddIso ?? null,
    repairPoNumber: repair?.poNo ?? null,
    newBuyEarliestEdd: newBuy?.eddIso ?? null,
    newBuyPoNumber: newBuy?.poNo ?? null,
    sparesRequiredBy,
    recommendation,
  };
}
