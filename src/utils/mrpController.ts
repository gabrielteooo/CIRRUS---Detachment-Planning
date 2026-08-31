import type { Platform } from '../types/detachment';

/** F-16 SAP field RXX — mock MRP controller codes for prototype tables. */
const F16_MRP_CONTROLLERS = ['R01', 'R02', 'R03', 'R04', 'R05', 'RXX'];

export function mockMrpController(platform: Platform, nsn: string): string | undefined {
  if (platform !== 'F-16') return undefined;

  let hash = 0;
  for (const char of nsn) {
    hash = (hash + char.charCodeAt(0)) % F16_MRP_CONTROLLERS.length;
  }

  return F16_MRP_CONTROLLERS[hash];
}
