/** Supplemental NSNs for exercise needs — not part of the L-series template. */
export interface NsnCatalogEntry {
  nsn: string;
  mpn: string;
  description: string;
  availableQty: number;
}

export const NSN_CATALOG: NsnCatalogEntry[] = [
  {
    nsn: '1560-01-301',
    mpn: 'MPN-GPU-12',
    description: 'Portable Ground Power Unit Cable Assembly',
    availableQty: 4,
  },
  {
    nsn: '1560-01-302',
    mpn: 'MPN-TOOL-45',
    description: 'Specialty Torque Wrench Set, Airframe',
    availableQty: 6,
  },
  {
    nsn: '1560-01-303',
    mpn: 'MPN-SAFE-08',
    description: 'Arming Safety Pin Kit, Flight Line',
    availableQty: 12,
  },
  {
    nsn: '1560-01-304',
    mpn: 'MPN-LUBE-22',
    description: 'Hydraulic Fluid Servicing Kit',
    availableQty: 8,
  },
  {
    nsn: '1560-01-305',
    mpn: 'MPN-COMM-17',
    description: 'Secure Radio Antenna, Deployable',
    availableQty: 3,
  },
  {
    nsn: '1560-01-306',
    mpn: 'MPN-FUEL-09',
    description: 'Single-Point Refueling Adapter',
    availableQty: 5,
  },
  {
    nsn: '1560-01-307',
    mpn: 'MPN-NVG-03',
    description: 'NVG Mounting Bracket, Cockpit',
    availableQty: 2,
  },
  {
    nsn: '1560-01-308',
    mpn: 'MPN-ENV-14',
    description: 'Environmental Control Unit Filter Pack',
    availableQty: 10,
  },
  {
    nsn: '1615-01-201',
    mpn: 'MPN-ROTOR-11',
    description: 'Rotor Blade Tie-Down Assembly',
    availableQty: 4,
  },
  {
    nsn: '1615-01-202',
    mpn: 'MPN-HOIST-06',
    description: 'Rescue Hoist Cable, 250 ft',
    availableQty: 2,
  },
  {
    nsn: '1615-01-203',
    mpn: 'MPN-CARGO-19',
    description: 'Cargo Net, Medium Lift (10K)',
    availableQty: 6,
  },
  {
    nsn: '1615-01-204',
    mpn: 'MPN-MAINT-31',
    description: 'Blade Track and Balance Kit',
    availableQty: 3,
  },
];

export function getCatalogEntry(nsn: string): NsnCatalogEntry | undefined {
  return NSN_CATALOG.find((entry) => entry.nsn === nsn);
}

export function searchNsnCatalog(query: string, excludeNsns: string[]): NsnCatalogEntry[] {
  const excluded = new Set(excludeNsns);
  const q = query.trim().toLowerCase();

  return NSN_CATALOG.filter((entry) => !excluded.has(entry.nsn)).filter(
    (entry) =>
      !q ||
      entry.nsn.toLowerCase().includes(q) ||
      entry.mpn.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q),
  );
}
