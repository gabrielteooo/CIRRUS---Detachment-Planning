import type { InventoryItem, PlanLine, ToBringAllocation } from '../types/planLine';

export function buildMemberInventory(
  nsn: string,
  description: string,
  qty: number,
  location: string,
): InventoryItem[] {
  return [
    {
      type: 'Main',
      nsn,
      description,
      location,
      qty,
      status: qty > 0 ? 'In WH' : 'QIT',
    },
  ];
}

export function buildInterchangeableDemoLine(base: PlanLine): PlanLine {
  const members = [
    {
      nsn: '1560-01-2333-A',
      mpn: 'MPN-SG-A',
      description: 'Starter Generator Type A',
      availableQty: 0,
      isPrimary: true,
      inventory: buildMemberInventory(
        '1560-01-2333-A',
        'Starter Generator Type A',
        0,
        'WH-A / Rack 12',
      ),
    },
    {
      nsn: '1560-01-2333-B',
      mpn: 'MPN-SG-B',
      description: 'Starter Generator Type B',
      availableQty: 0,
      inventory: buildMemberInventory(
        '1560-01-2333-B',
        'Starter Generator Type B',
        0,
        'WH-A / Rack 12',
      ),
    },
    {
      nsn: '1560-01-2333-C',
      mpn: 'MPN-SG-C',
      description: 'Starter Generator Type C',
      availableQty: 0,
      inventory: buildMemberInventory(
        '1560-01-2333-C',
        'Starter Generator Type C',
        0,
        'WH-B / Rack 4',
      ),
    },
    {
      nsn: '1560-01-2333-D',
      mpn: 'MPN-SG-D',
      description: 'Starter Generator Type D',
      availableQty: 1,
      inventory: buildMemberInventory(
        '1560-01-2333-D',
        'Starter Generator Type D',
        1,
        'WH-B / Rack 4',
      ),
    },
  ];

  const toBringAllocation: ToBringAllocation[] = [{ nsn: '1560-01-2333-D', qty: 1 }];
  const requiredQty = 2;
  const availableQty = 1;

  return {
    ...base,
    nsn: '1560-01-2333-A',
    description: 'Starter Generator',
    requiredQty,
    availableQty,
    toBringQty: 2,
    interchangeableMembers: members,
    toBringAllocation,
    shortfallTargetNsn: '1560-01-2333-A',
    inventory: members.flatMap((member) => member.inventory),
    shortfallActions: [
      {
        type: 'wait',
        qty: 1,
        targetNsn: '1560-01-2333-A',
        remarks: 'Expedite starter generator repair',
        needByDate: '2026-03-01',
        approved: false,
      },
    ],
  };
}
