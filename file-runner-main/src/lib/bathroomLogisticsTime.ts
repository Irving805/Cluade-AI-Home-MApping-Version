/**
 * Bathroom Logistics Time Engine V1
 * 
 * PRINCIPLE: Only calculates EXTRA time from operational signals.
 * Base bathroom time comes from calculateBathroomInventoryTotals (SSOT).
 * 
 * Time architecture:
 *   totalBathroomTime = baseSSOT + logisticsExtra
 *   
 * Where baseSSOT includes: fixtures, vanity, glass, tile, size, condition, window
 * And logisticsExtra includes: toiletScale, tubScale, showerDoorScale, cabinetInterior, mirrors
 */

import type { BathroomLogistics, BathroomUnit } from './bathroomMappingTypes';

// ============= TIME DELTAS (in minutes) =============

export const LOGISTICS_TIME_DELTAS = {
  toiletScale: {
    none: 0,
    light: 3,
    heavy: 7,
    stained: 12,
  },
  tubScale: {
    none: 0,
    soap: 5,
    mineral: 8,
    heavy: 15,
  },
  showerDoorScale: {
    none: 0,
    water_spots: 5,
    mineral: 10,
    heavy: 18,
  },
  cabinetInterior: {
    no: 0,
    yes_empty: 4,
    yes_with_items: 8,
  },
  mirrors: {
    baseIncluded: 1,  // First mirror included in base time
    perExtra: 2,      // +2 min per additional mirror
  },
} as const;

// ============= CALCULATION FUNCTIONS =============

/**
 * Calculate extra logistics time for a single bathroom (V1)
 * Returns minutes to add ON TOP of base bathroom time
 */
export function calculateBathroomLogisticsTime(
  logistics: BathroomLogistics | undefined
): number {
  if (!logistics) return 0;
  
  let extraMinutes = 0;
  
  // Core surface signals
  extraMinutes += LOGISTICS_TIME_DELTAS.toiletScale[logistics.toiletScale];
  extraMinutes += LOGISTICS_TIME_DELTAS.tubScale[logistics.tubScale];
  extraMinutes += LOGISTICS_TIME_DELTAS.showerDoorScale[logistics.showerDoorScale];
  
  // Cabinet interior
  extraMinutes += LOGISTICS_TIME_DELTAS.cabinetInterior[logistics.cabinetInterior];
  
  // Mirrors: first included, extras add time
  const extraMirrors = Math.max(0, logistics.mirrorCount - LOGISTICS_TIME_DELTAS.mirrors.baseIncluded);
  extraMinutes += extraMirrors * LOGISTICS_TIME_DELTAS.mirrors.perExtra;
  
  // Manual override (if supervisor set it)
  if (logistics.extraMinutesManual) {
    extraMinutes += logistics.extraMinutesManual;
  }
  
  return extraMinutes;
}

/**
 * Calculate total logistics time for all bathrooms in inventory
 */
export function calculateTotalBathroomLogisticsTime(
  bathrooms: BathroomUnit[] | undefined
): number {
  if (!bathrooms || bathrooms.length === 0) return 0;
  
  return bathrooms.reduce((total, bath) => {
    return total + calculateBathroomLogisticsTime(bath.logistics);
  }, 0);
}

/**
 * Get logistics time breakdown for a single bathroom (for display)
 */
export function getBathroomLogisticsBreakdown(
  logistics: BathroomLogistics | undefined
): Array<{ label: string; minutes: number }> {
  if (!logistics) return [];
  
  const breakdown: Array<{ label: string; minutes: number }> = [];
  
  const toiletTime = LOGISTICS_TIME_DELTAS.toiletScale[logistics.toiletScale];
  if (toiletTime > 0) {
    breakdown.push({ label: `Toilet: ${logistics.toiletScale}`, minutes: toiletTime });
  }
  
  const tubTime = LOGISTICS_TIME_DELTAS.tubScale[logistics.tubScale];
  if (tubTime > 0) {
    breakdown.push({ label: `Tub: ${logistics.tubScale}`, minutes: tubTime });
  }
  
  const doorTime = LOGISTICS_TIME_DELTAS.showerDoorScale[logistics.showerDoorScale];
  if (doorTime > 0) {
    breakdown.push({ label: `Shower door: ${logistics.showerDoorScale}`, minutes: doorTime });
  }
  
  const cabinetTime = LOGISTICS_TIME_DELTAS.cabinetInterior[logistics.cabinetInterior];
  if (cabinetTime > 0) {
    const cabinetLabel = logistics.cabinetInterior === 'yes_empty' ? 'empty' : 'with items';
    breakdown.push({ label: `Inside cabinets: ${cabinetLabel}`, minutes: cabinetTime });
  }
  
  const extraMirrors = Math.max(0, logistics.mirrorCount - LOGISTICS_TIME_DELTAS.mirrors.baseIncluded);
  const mirrorTime = extraMirrors * LOGISTICS_TIME_DELTAS.mirrors.perExtra;
  if (mirrorTime > 0) {
    breakdown.push({ label: `Mirrors: ${logistics.mirrorCount}`, minutes: mirrorTime });
  }
  
  if (logistics.extraMinutesManual && logistics.extraMinutesManual > 0) {
    breakdown.push({ label: 'Manual adjustment', minutes: logistics.extraMinutesManual });
  }
  
  return breakdown;
}
