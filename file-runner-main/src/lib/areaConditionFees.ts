/**
 * Area Condition Fees — SSOT Calculation Engine
 * 
 * Replaces blanket conditionFee (0|120|180) with area-specific fees
 * for Deep Clean + Move-In/Out flows ONLY.
 * 
 * Uses lookup tables with diminishing returns for multi-unit areas.
 * Applies cap/floor rules after summing raw values.
 */

import type { Situation } from '@/contexts/BookingContext';

// ============= TYPES =============

export type AreaConditionLevel = 'normal' | 'above_average' | 'heavy_severe';
export type ConditionAreaCategory = 'kitchen' | 'bathroom' | 'bedroom' | 'living';

export interface AreaConditionSelection {
  roomId: string;
  category: ConditionAreaCategory;
}

export interface ConditionFeeBreakdownItem {
  roomId: string;
  category: ConditionAreaCategory;
  displayName: string;
  fee: number;
}

export interface AreaConditionResult {
  totalFee: number;
  rawTotal: number;
  breakdown: ConditionFeeBreakdownItem[];
  capApplied: boolean;
  floorApplied: boolean;
  globalLevel: AreaConditionLevel;
}

// ============= LOOKUP TABLES =============
// Diminishing returns: 1st unit, 2nd unit, 3rd+ units

const CONDITION_RATES = {
  above_average: {
    kitchen: 65,
    bathroom: [32, 23, 18] as const,  // 1st, 2nd, 3rd+
    bedroom: [20, 15, 12] as const,   // 1st, 2nd, 3rd+
    living: 15,
    cap: 120,
    floor: 50,
  },
  heavy_severe: {
    kitchen: 100,
    bathroom: [52, 37, 28] as const,
    bedroom: [30, 22, 18] as const,
    living: 20,
    cap: 180,
    floor: 75,
  },
} as const;

// ============= CONDITION TIME MODIFIERS (PHASE 2) =============
// Extra minutes per area for condition levels (matches CONDITION_RATES structure)
// These represent additional operational time when areas have build-up/neglect

export const CONDITION_TIME_MODIFIERS = {
  above_average: {
    kitchen: 15,   // +15 min for greasy/dusty kitchen
    bathroom: 10,  // +10 min per bathroom
    bedroom: 8,    // +8 min per bedroom
    living: 10,    // +10 min for dusty living
  },
  heavy_severe: {
    kitchen: 25,   // +25 min for heavy grease/buildup
    bathroom: 20,  // +20 min per bathroom (mold, soap scum)
    bedroom: 15,   // +15 min per bedroom (dust/debris)
    living: 15,    // +15 min for heavy dust/debris
  },
} as const;

/**
 * Calculate extra time minutes from area condition selections.
 * Uses same SSOT selections as fee calculation.
 * 
 * @param selections - Same selections used for calculateAreaConditionFee
 * @param globalLevel - User-selected condition level
 * @returns Total extra minutes from condition
 */
export function calculateConditionTimeImpact(
  selections: AreaConditionSelection[],
  globalLevel: AreaConditionLevel
): number {
  // Normal = no extra time
  if (globalLevel === 'normal' || !selections || selections.length === 0) {
    return 0;
  }
  
  const modifiers = CONDITION_TIME_MODIFIERS[globalLevel];
  
  return selections.reduce((total, sel) => {
    const categoryMod = modifiers[sel.category] || 0;
    return total + categoryMod;
  }, 0);
}

// ============= GATING FUNCTION (SSOT) =============

/**
 * Determines if area-specific condition fees should be enabled.
 * ONLY for: LIVE_HERE + Deep Clean, MOVING + Move-In/Out
 */
export function shouldEnableAreaConditionFees(
  situation: Situation | null,
  baseServiceLevel: string
): boolean {
  if (situation === 'LIVE_HERE' && baseServiceLevel === 'Deep Clean') return true;
  if (situation === 'MOVING' && baseServiceLevel === 'Move-In/Out') return true;
  return false;
}

// ============= HELPER: Extract index from roomId for stable ordering =============

function extractIndexFromRoomId(roomId: string): number {
  // Match patterns like bath_master_0, bath_full_1, bedroom_2
  const match = roomId.match(/_(\d+)$/);
  if (match) return parseInt(match[1], 10);
  
  // bedroom_1, bedroom_2 pattern
  const bedroomMatch = roomId.match(/bedroom_(\d+)$/);
  if (bedroomMatch) return parseInt(bedroomMatch[1], 10);
  
  return 0;
}

// ============= MAIN CALCULATION FUNCTION =============

/**
 * Calculate area-specific condition fees with diminishing returns.
 * 
 * @param selections - Array of selected areas with roomId + category
 * @param globalLevel - User-selected condition level
 * @param getDisplayName - Function to get human-readable room name
 */
export function calculateAreaConditionFee(
  selections: AreaConditionSelection[],
  globalLevel: AreaConditionLevel,
  getDisplayName: (roomId: string) => string
): AreaConditionResult {
  // Normal = no fee
  if (globalLevel === 'normal' || !selections || selections.length === 0) {
    return {
      totalFee: 0,
      rawTotal: 0,
      breakdown: [],
      capApplied: false,
      floorApplied: false,
      globalLevel,
    };
  }

  const rates = CONDITION_RATES[globalLevel];
  const breakdown: ConditionFeeBreakdownItem[] = [];
  
  // Group selections by category for diminishing returns
  const byCategory: Record<ConditionAreaCategory, AreaConditionSelection[]> = {
    kitchen: [],
    bathroom: [],
    bedroom: [],
    living: [],
  };
  
  for (const sel of selections) {
    byCategory[sel.category].push(sel);
  }
  
  // Sort multi-unit categories by index for stable ordering
  byCategory.bathroom.sort((a, b) => extractIndexFromRoomId(a.roomId) - extractIndexFromRoomId(b.roomId));
  byCategory.bedroom.sort((a, b) => extractIndexFromRoomId(a.roomId) - extractIndexFromRoomId(b.roomId));
  
  let rawTotal = 0;
  
  // Kitchen (single unit, fixed rate)
  if (byCategory.kitchen.length > 0) {
    const fee = rates.kitchen;
    rawTotal += fee;
    breakdown.push({
      roomId: 'kitchen',
      category: 'kitchen',
      displayName: getDisplayName('kitchen'),
      fee,
    });
  }
  
  // Bathrooms (diminishing returns: 32/23/18 or 52/37/28)
  byCategory.bathroom.forEach((sel, idx) => {
    const tierIdx = Math.min(idx, rates.bathroom.length - 1);
    const fee = rates.bathroom[tierIdx];
    rawTotal += fee;
    breakdown.push({
      roomId: sel.roomId,
      category: 'bathroom',
      displayName: getDisplayName(sel.roomId),
      fee,
    });
  });
  
  // Bedrooms (diminishing returns: 20/15/12 or 30/22/18)
  byCategory.bedroom.forEach((sel, idx) => {
    const tierIdx = Math.min(idx, rates.bedroom.length - 1);
    const fee = rates.bedroom[tierIdx];
    rawTotal += fee;
    breakdown.push({
      roomId: sel.roomId,
      category: 'bedroom',
      displayName: getDisplayName(sel.roomId),
      fee,
    });
  });
  
  // Living (single unit, fixed rate)
  if (byCategory.living.length > 0) {
    const fee = rates.living;
    rawTotal += fee;
    // Use first living selection's roomId for display
    const livingRoom = byCategory.living[0];
    breakdown.push({
      roomId: livingRoom.roomId,
      category: 'living',
      displayName: getDisplayName(livingRoom.roomId),
      fee,
    });
  }
  
  // Apply cap/floor
  let totalFee = rawTotal;
  let capApplied = false;
  let floorApplied = false;
  
  if (rawTotal > rates.cap) {
    totalFee = rates.cap;
    capApplied = true;
  } else if (rawTotal < rates.floor && rawTotal > 0) {
    totalFee = rates.floor;
    floorApplied = true;
  }
  
  return {
    totalFee,
    rawTotal,
    breakdown,
    capApplied,
    floorApplied,
    globalLevel,
  };
}

// ============= LEGACY CONDITION LEVEL MAPPING =============

/**
 * Map legacy conditionFee to globalConditionLevel for migration hints
 */
export function legacyFeeToConditionLevel(conditionFee: number): AreaConditionLevel {
  if (conditionFee >= 180) return 'heavy_severe';
  if (conditionFee >= 120) return 'above_average';
  return 'normal';
}

/**
 * Get cap/floor values for a given level (for UI display)
 */
export function getConditionLevelLimits(level: AreaConditionLevel): { cap: number; floor: number } | null {
  if (level === 'normal') return null;
  const rates = CONDITION_RATES[level];
  return { cap: rates.cap, floor: rates.floor };
}

// ============= HEAVY CONDITION HELPER (SSOT for micro-services) =============

/**
 * Determines if "heavy" condition applies for micro-services surcharge.
 * 
 * This is the SINGLE SOURCE OF TRUTH for heavy condition detection.
 * Use this instead of checking conditionFee >= 120 directly.
 * 
 * For area-specific flows: heavy = globalConditionLevel === 'heavy_severe'
 * (regardless of total fee, since kitchen-only = $100 but still heavy)
 * 
 * For legacy flows: heavy = conditionFee >= 120
 */
export function isHeavyConditionForQuote(
  formData: { 
    areaConditionEnabled?: boolean; 
    globalConditionLevel?: AreaConditionLevel;
    conditionFee?: number;
    baseServiceLevel?: string;
  },
  situation: Situation | null
): boolean {
  const gating = shouldEnableAreaConditionFees(situation, formData.baseServiceLevel || '');
  
  // Area-specific mode: heavy = globalConditionLevel is heavy_severe
  if (gating && formData.areaConditionEnabled) {
    return formData.globalConditionLevel === 'heavy_severe';
  }
  
  // Legacy blanket mode: heavy = conditionFee >= 120
  return (formData.conditionFee || 0) >= 120;
}
