import type { Platform } from '../types/detachment';

export interface AircraftEntry {
  tailNumber: string;
  variant: string;
}

export const AIRCRAFT_BY_PLATFORM: Record<Platform, AircraftEntry[]> = {
  'F-16': [
    { tailNumber: '982', variant: 'D' },
    { tailNumber: '9876', variant: 'DU' },
    { tailNumber: '2041', variant: 'C' },
    { tailNumber: '3012', variant: 'CU' },
    { tailNumber: '1102', variant: 'D' },
    { tailNumber: '2234', variant: 'DU' },
  ],
  'CH-47': [
    { tailNumber: '301', variant: 'SD' },
    { tailNumber: '402', variant: 'F' },
    { tailNumber: '518', variant: 'SD' },
    { tailNumber: '622', variant: 'F' },
  ],
};

export function getTailOptions(platform: Platform | undefined) {
  if (!platform) return [];
  return AIRCRAFT_BY_PLATFORM[platform].map((entry) => ({
    label: entry.tailNumber,
    value: entry.tailNumber,
  }));
}

export function getVariantsForTails(platform: Platform, tailNumbers: string[]): string[] {
  const variants = new Set<string>();
  for (const tailNumber of tailNumbers) {
    const entry = AIRCRAFT_BY_PLATFORM[platform].find((item) => item.tailNumber === tailNumber);
    if (entry) variants.add(entry.variant);
  }
  return [...variants].sort();
}

/** Best-effort tail selection when reopening a plan that only stores variant rows. */
export function inferTailNumbersFromPlan(
  platform: Platform,
  variants: string[],
  aircraftCount: number,
): string[] {
  const fleet = AIRCRAFT_BY_PLATFORM[platform];
  const selected: string[] = [];

  for (const variant of variants) {
    if (selected.length >= aircraftCount) break;
    const entry = fleet.find(
      (item) => item.variant === variant && !selected.includes(item.tailNumber),
    );
    if (entry) selected.push(entry.tailNumber);
  }

  for (const entry of fleet) {
    if (selected.length >= aircraftCount) break;
    if (!selected.includes(entry.tailNumber)) {
      selected.push(entry.tailNumber);
    }
  }

  return selected.slice(0, aircraftCount);
}
