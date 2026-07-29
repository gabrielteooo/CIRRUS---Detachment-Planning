import type { Platform } from '../types/detachment';

export interface LSComponent {
  nsn: string;
  mpn: string;
  description: string;
  qtyByTier: Record<string, number>;
}

export interface LSPlatformTemplate {
  paramLabel: string;
  tiers: number[];
  components: LSComponent[];
}

export const L_SERIES_TEMPLATE: Record<Platform, LSPlatformTemplate> = {
  'F-16': {
    "paramLabel": "Flying hours",
    "tiers": [
      100,
      200,
      300,
      400
    ],
    "components": [
      {
        "nsn": "1560-01-231",
        "mpn": "1560-01-231",
        "description": "Leading Edge Flap Actuator",
        "qtyByTier": {
          "100": 1,
          "200": 1,
          "300": 2,
          "400": 2
        }
      },
      {
        "nsn": "1560-01-232",
        "mpn": "1560-01-232",
        "description": "Fuel Control Unit, Main Engine",
        "qtyByTier": {
          "100": 1,
          "200": 1,
          "300": 1,
          "400": 2
        }
      },
      {
        "nsn": "1560-01-233",
        "mpn": "1560-01-233",
        "description": "Igniter Plug, Turbine Engine",
        "qtyByTier": {
          "100": 2,
          "200": 4,
          "300": 6,
          "400": 8
        }
      },
      {
        "nsn": "1560-01-234",
        "mpn": "1560-01-234",
        "description": "Hydraulic Pump, Utility System",
        "qtyByTier": {
          "100": 1,
          "200": 1,
          "300": 2,
          "400": 2
        }
      },
      {
        "nsn": "1560-01-235",
        "mpn": "1560-01-235",
        "description": "Main Wheel Tire Assembly",
        "qtyByTier": {
          "100": 4,
          "200": 8,
          "300": 12,
          "400": 16
        }
      },
      {
        "nsn": "1560-01-236",
        "mpn": "1560-01-236",
        "description": "Brake Assembly, Main Landing Gear",
        "qtyByTier": {
          "100": 2,
          "200": 4,
          "300": 4,
          "400": 6
        }
      },
      {
        "nsn": "1560-01-237",
        "mpn": "1560-01-237",
        "description": "Canopy Seal, Elastomeric",
        "qtyByTier": {
          "100": 1,
          "200": 2,
          "300": 2,
          "400": 3
        }
      },
      {
        "nsn": "1560-01-238",
        "mpn": "1560-01-238",
        "description": "Generator Control Unit",
        "qtyByTier": {
          "100": 1,
          "200": 1,
          "300": 1,
          "400": 2
        }
      },
      {
        "nsn": "1560-01-239",
        "mpn": "1560-01-239",
        "description": "HUD Combiner Glass Assembly",
        "qtyByTier": {
          "100": 1,
          "200": 1,
          "300": 1,
          "400": 1
        }
      },
      {
        "nsn": "1560-01-241",
        "mpn": "1560-01-241",
        "description": "AN/APG-68 Radar LRU (Transmitter)",
        "qtyByTier": {
          "100": 0,
          "200": 1,
          "300": 1,
          "400": 1
        }
      },
      {
        "nsn": "1560-01-242",
        "mpn": "1560-01-242",
        "description": "Environmental Control System Valve",
        "qtyByTier": {
          "100": 2,
          "200": 3,
          "300": 4,
          "400": 5
        }
      },
      {
        "nsn": "1560-01-243",
        "mpn": "1560-01-243",
        "description": "Ejection Seat Cartridge",
        "qtyByTier": {
          "100": 2,
          "200": 2,
          "300": 4,
          "400": 4
        }
      },
      {
        "nsn": "1560-01-244",
        "mpn": "1560-01-244",
        "description": "Starter Cartridge, JFS",
        "qtyByTier": {
          "100": 3,
          "200": 6,
          "300": 9,
          "400": 12
        }
      },
      {
        "nsn": "1560-01-245",
        "mpn": "1560-01-245",
        "description": "Fastener Kit, Access Panel",
        "qtyByTier": {
          "100": 10,
          "200": 20,
          "300": 30,
          "400": 40
        }
      },
      {
        "nsn": "1560-01-246",
        "mpn": "1560-01-246",
        "description": "Hydraulic Hose Assembly, High Pressure",
        "qtyByTier": {
          "100": 3,
          "200": 5,
          "300": 7,
          "400": 9
        }
      },
      {
        "nsn": "1560-01-247",
        "mpn": "1560-01-247",
        "description": "Pitot-Static Sensor",
        "qtyByTier": {
          "100": 1,
          "200": 1,
          "300": 2,
          "400": 2
        }
      },
      {
        "nsn": "1560-01-248",
        "mpn": "1560-01-248",
        "description": "Ground Power Receptacle Cover",
        "qtyByTier": {
          "100": 1,
          "200": 1,
          "300": 1,
          "400": 2
        }
      }
    ]
  },
  'CH-47': {
    "paramLabel": "Aircraft count",
    "tiers": [
      2,
      4,
      6,
      8
    ],
    "components": [
      {
        "nsn": "1615-01-111",
        "mpn": "1615-01-111",
        "description": "Forward Rotor Blade Assembly",
        "qtyByTier": {
          "2": 1,
          "4": 2,
          "6": 3,
          "8": 4
        }
      },
      {
        "nsn": "1615-01-112",
        "mpn": "1615-01-112",
        "description": "Aft Rotor Blade Assembly",
        "qtyByTier": {
          "2": 1,
          "4": 2,
          "6": 3,
          "8": 4
        }
      },
      {
        "nsn": "1615-01-113",
        "mpn": "1615-01-113",
        "description": "Engine, T55-GA-714A (Spare LRU)",
        "qtyByTier": {
          "2": 0,
          "4": 1,
          "6": 1,
          "8": 2
        }
      },
      {
        "nsn": "1615-01-114",
        "mpn": "1615-01-114",
        "description": "Combining Transmission Hydraulic Pump",
        "qtyByTier": {
          "2": 1,
          "4": 2,
          "6": 3,
          "8": 4
        }
      },
      {
        "nsn": "1615-01-115",
        "mpn": "1615-01-115",
        "description": "Forward Rotor Head Swashplate",
        "qtyByTier": {
          "2": 1,
          "4": 1,
          "6": 2,
          "8": 2
        }
      },
      {
        "nsn": "1615-01-116",
        "mpn": "1615-01-116",
        "description": "Synchronizing Shaft, Interconnect Drive",
        "qtyByTier": {
          "2": 2,
          "4": 3,
          "6": 5,
          "8": 6
        }
      },
      {
        "nsn": "1615-01-117",
        "mpn": "1615-01-117",
        "description": "Main Landing Gear Strut Assembly",
        "qtyByTier": {
          "2": 2,
          "4": 4,
          "6": 6,
          "8": 8
        }
      },
      {
        "nsn": "1615-01-118",
        "mpn": "1615-01-118",
        "description": "Rotor Blade Deicing Boot",
        "qtyByTier": {
          "2": 2,
          "4": 4,
          "6": 6,
          "8": 8
        }
      },
      {
        "nsn": "1615-01-119",
        "mpn": "1615-01-119",
        "description": "Generator, AC 20kVA",
        "qtyByTier": {
          "2": 1,
          "4": 2,
          "6": 2,
          "8": 3
        }
      },
      {
        "nsn": "1615-01-120",
        "mpn": "1615-01-120",
        "description": "Cargo Ramp Actuator",
        "qtyByTier": {
          "2": 1,
          "4": 2,
          "6": 3,
          "8": 4
        }
      },
      {
        "nsn": "1615-01-121",
        "mpn": "1615-01-121",
        "description": "Fuel Control Unit, Engine",
        "qtyByTier": {
          "2": 1,
          "4": 2,
          "6": 2,
          "8": 3
        }
      },
      {
        "nsn": "1615-01-122",
        "mpn": "1615-01-122",
        "description": "AN/APR-39 Radar Warning Antenna",
        "qtyByTier": {
          "2": 2,
          "4": 4,
          "6": 6,
          "8": 8
        }
      },
      {
        "nsn": "1615-01-123",
        "mpn": "1615-01-123",
        "description": "APU Starter Cartridge",
        "qtyByTier": {
          "2": 4,
          "4": 8,
          "6": 12,
          "8": 16
        }
      },
      {
        "nsn": "1615-01-124",
        "mpn": "1615-01-124",
        "description": "Fastener Kit, Rotor Hub Access",
        "qtyByTier": {
          "2": 15,
          "4": 30,
          "6": 45,
          "8": 60
        }
      },
      {
        "nsn": "1615-01-125",
        "mpn": "1615-01-125",
        "description": "Hydraulic Hose Assembly, Flight Controls",
        "qtyByTier": {
          "2": 4,
          "4": 8,
          "6": 12,
          "8": 16
        }
      },
      {
        "nsn": "1615-01-126",
        "mpn": "1615-01-126",
        "description": "Crew Seat Restraint Harness",
        "qtyByTier": {
          "2": 3,
          "4": 6,
          "6": 9,
          "8": 12
        }
      },
      {
        "nsn": "1615-01-127",
        "mpn": "1615-01-127",
        "description": "Airspeed/Altitude Sensor (ADS)",
        "qtyByTier": {
          "2": 1,
          "4": 2,
          "6": 3,
          "8": 4
        }
      },
      {
        "nsn": "1615-01-128",
        "mpn": "1615-01-128",
        "description": "External Cargo Hook Assembly",
        "qtyByTier": {
          "2": 1,
          "4": 2,
          "6": 3,
          "8": 4
        }
      }
    ]
  }
} as Record<Platform, LSPlatformTemplate>;

export const L_SERIES_VERSION_IDS = {
  'F-16': 'L-F16-2026-TEMPLATE',
  'CH-47': 'L-CH47-2026-TEMPLATE',
} as const;

export function getMpnForNsn(nsn: string): string {
  const base = nsn.replace(/-ALT$/, '');
  for (const template of Object.values(L_SERIES_TEMPLATE)) {
    const found = template.components.find((c) => c.nsn === base);
    if (found) return found.mpn;
  }
  return base;
}
