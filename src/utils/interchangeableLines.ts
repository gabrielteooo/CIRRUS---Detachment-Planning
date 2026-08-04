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
      nsn: '1560-01-233-A',
      mpn: 'MPN-IGN-A',
      description: 'Igniter Plug Type A',
      availableQty: 0,
      isPrimary: true,
      inventory: buildMemberInventory(
        '1560-01-233-A',
        'Igniter Plug Type A',
        0,
        'WH-A / Rack 12',
      ),
    },
    {
      nsn: '1560-01-233-B',
      mpn: 'MPN-IGN-B',
      description: 'Igniter Plug Type B',
      availableQty: 0,
      inventory: buildMemberInventory(
        '1560-01-233-B',
        'Igniter Plug Type B',
        0,
        'WH-A / Rack 12',
      ),
    },
    {
      nsn: '1560-01-233-C',
      mpn: 'MPN-IGN-C',
      description: 'Igniter Plug Type C',
      availableQty: 0,
      inventory: buildMemberInventory(
        '1560-01-233-C',
        'Igniter Plug Type C',
        0,
        'WH-B / Rack 4',
      ),
    },
    {
      nsn: '1560-01-233-D',
      mpn: 'MPN-IGN-D',
      description: 'Igniter Plug Type D',
      availableQty: 1,
      inventory: buildMemberInventory(
        '1560-01-233-D',
        'Igniter Plug Type D',
        1,
        'WH-B / Rack 4',
      ),
    },
  ];

  const toBringAllocation: ToBringAllocation[] = [{ nsn: '1560-01-233-D', qty: 1 }];
  const requiredQty = 2;
  const availableQty = 1;

  return {
    ...base,
    nsn: '1560-01-233-A',
    description: 'Igniter Plug, Turbine Engine',
    requiredQty,
    availableQty,
    toBringQty: 2,
    interchangeableMembers: members,
    toBringAllocation,
    shortfallTargetNsn: '1560-01-233-A',
    inventory: members.flatMap((member) => member.inventory),
    shortfallActions: [
      {
        type: 'wait',
        qty: 1,
        targetNsn: '1560-01-233-A',
        repairComponentRef: 'PO-IGN-001',
        needByDate: '2026-03-01',
        approved: false,
      },
    ],
  };
}
