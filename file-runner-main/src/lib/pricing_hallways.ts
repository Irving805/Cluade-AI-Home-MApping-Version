/**
 * Hallway Pricing Engine
 * Single Source of Truth for multi-entry hallway logistics
 * 
 * PRICING RULES (per-door):
 * - MOVING: $10/door (empty) or $15/door (not empty)
 * - LIVE_HERE Standard: $0 (cabinets captured for ops, no fee)
 * - LIVE_HERE Deep Clean: $10/door (empty) or $15/door (not empty)
 * 
 * ORGANIZATION: LIVE_HERE only at $35/hr
 */

import { HallwayConfig, HallwaySizeTier, Situation } from '@/contexts/BookingContext';
import { isDeepCleanLevel } from '@/lib/pricingTier';

// === HALLWAY RATES (SSOT) ===
export const HALLWAY_RATES = {
  CABINET_DOOR_EMPTY: 10,        // $10 per door if empty
  CABINET_DOOR_NOT_EMPTY: 15,    // $15 per door if not empty
  ORGANIZATION_RATE: 35,         // $35/hr (same as bedroom org)
  // Legacy (kept for backwards compat during migration)
  MOVING_LARGE_CABINET_FEE: 15,
  CABINET_THRESHOLD: 2,
} as const;

// === SSOT: Per-Door Cabinet Fee Calculation ===
/**
 * Calculate cabinet fee for a single hallway based on situation and service level.
 * 
 * Rules:
 * - LIVE_HERE + NOT Deep Clean = $0 (no fee)
 * - MOVING or LIVE_HERE + Deep Clean = $10/empty door, $15/not-empty door
 */
export function calculateHallwayCabinetFee(
  cabinetCount: number,
  cabinetsEmpty: boolean,
  situation: Situation,
  isDeepClean: boolean
): { fee: number; feePerDoor: number } {
  // LIVE_HERE Standard (NOT Deep Clean) = $0 always
  if (situation === 'LIVE_HERE' && !isDeepClean) {
    return { fee: 0, feePerDoor: 0 };
  }
  
  // No cabinets = no fee
  if (cabinetCount === 0) {
    return { fee: 0, feePerDoor: 0 };
  }
  
  // MOVING or LIVE_HERE + Deep Clean: charge per door
  const feePerDoor = cabinetsEmpty 
    ? HALLWAY_RATES.CABINET_DOOR_EMPTY 
    : HALLWAY_RATES.CABINET_DOOR_NOT_EMPTY;
  
  return { fee: cabinetCount * feePerDoor, feePerDoor };
}

// === SSOT: Total Hallways Fee Calculation ===
/**
 * Calculate total fees for all hallways.
 * Used by both layoutModel builder and computePricing for zero drift.
 */
export function calculateHallwaysTotalFees(
  hallways: HallwayConfig[],
  situation: Situation,
  isDeepClean: boolean
): number {
  if (!hallways || hallways.length === 0) return 0;
  
  return hallways.reduce((total, hw) => {
    const { fee: cabinetFee } = calculateHallwayCabinetFee(
      hw.cabinetCount,
      hw.cabinetsEmpty,
      situation,
      isDeepClean
    );
    
    // Organization: LIVE_HERE only
    const orgCost = situation === 'LIVE_HERE' 
      ? (hw.organizationHours || 0) * HALLWAY_RATES.ORGANIZATION_RATE 
      : 0;
    
    return total + cabinetFee + orgCost;
  }, 0);
}

// === HALLWAY SIZE LABOR TIMES ===
export const HALLWAY_SIZE_LABOR = {
  SMALL: { minutes: 8, ftRange: '6–12 ft', mRange: '2–4 m' },
  MEDIUM: { minutes: 12, ftRange: '12–24 ft', mRange: '4–7 m' },
  LARGE: { minutes: 18, ftRange: '24+ ft', mRange: '7+ m' },
} as const;

// === HALLWAY SIZE DESCRIPTIONS (for UI microcopy) ===
export const HALLWAY_SIZE_INFO = {
  SMALL: { 
    ftRange: '6–12 ft',
    mRange: '2–4 m',
    typical: 'Entry corridor, 1 door',
    typicalEs: 'Pasillo de entrada, 1 puerta',
  },
  MEDIUM: { 
    ftRange: '12–24 ft',
    mRange: '4–7 m',
    typical: 'Typical bedroom hallway',
    typicalEs: 'Pasillo típico de recámaras',
  },
  LARGE: { 
    ftRange: '24+ ft',
    mRange: '7+ m',
    typical: 'Long hall with closets',
    typicalEs: 'Pasillo largo con closets',
  },
} as const;

// === HALLWAY HAZARD TIME IMPACTS ===
export const HALLWAY_HAZARD_TIMES = {
  highTrafficDust: 8,     // Heavy dust in baseboards and corners
  runnerOrRug: 10,        // Long hallway runner requiring deep vacuuming
  wallScuffs: 12,         // Shoe marks/scuffs on walls
  galleryWall: 15,        // Multiple frames/mirrors needing glass detail
  entryDebris: 8,         // Entry zone with outdoor debris
} as const;

// === FLOW DETECTION HELPERS ===
export function isMovingFlow(
  situation: string | null,
  serviceType: string
): boolean {
  return situation === 'MOVING' || serviceType === 'Move-In/Out';
}

export function isDeepResetLiveHere(
  situation: string | null,
  serviceType: string
): boolean {
  return (situation === 'LIVE_HERE' || situation === null) && 
    (serviceType === 'Deep Clean' || serviceType === 'Standard Clean');
}

// === GATING HELPER: Should Hallways Section be visible? ===
/**
 * Determine if Hallways section should be visible based on home size.
 * Rules:
 * - Always show for MOVING flow (hallways are critical for move logistics)
 * - Hide for Studio or 1-Bedroom homes (typically no separate hallways)
 * - Show for 2+ Bedroom homes
 */
export function shouldShowHallwaysSection(
  bedroomCount: number,
  homeSize: string,
  situation: string | null
): boolean {
  // Always show for MOVING flow (hallways are critical for move logistics)
  if (situation === 'MOVING') return true;
  
  // Hide for studio or 1-bedroom homes
  if (bedroomCount <= 1) return false;
  if (homeSize.toLowerCase().includes('studio')) return false;
  if (homeSize.includes('1 Bedroom') || homeSize.includes('1 bed')) return false;
  
  return true;
}

// === MOVING FLOW: Cabinet Detail Fee Calculation ===
export interface HallwayCabinetResult {
  hallwayId: string;
  hallwayLabel: string;
  sizeTier: HallwaySizeTier;
  isLarge: boolean;
  hasCabinets: boolean;
  cabinetsEmpty: boolean;
  cabinetCount: number;
  isIncluded: boolean;
  fee: number;
  reason: string;
}

export interface HallwayCabinetTotals {
  byHallway: HallwayCabinetResult[];
  totalFee: number;
  includedCount: number;
  chargedCount: number;
}

export function calcHallwayCabinetCostMoving(
  hallways: HallwayConfig[]
): HallwayCabinetTotals {
  const byHallway: HallwayCabinetResult[] = [];
  let totalFee = 0;
  let includedCount = 0;
  let chargedCount = 0;
  
  hallways.forEach(h => {
    const isLarge = h.sizeTier === 'LARGE';
    const hasMajorCabinets = h.cabinetCount >= HALLWAY_RATES.CABINET_THRESHOLD;
    const cabinetsEmpty = h.cabinetsEmpty;
    
    // RULE: Large hallway with 2+ non-empty cabinets = +$15
    // - Small/Medium: ALWAYS included regardless of cabinets
    // - Large + <2 cabinets: included
    // - Large + 2+ cabinets + empty: included
    // - Large + 2+ cabinets + NOT empty: +$15
    const isIncluded = !isLarge || !hasMajorCabinets || cabinetsEmpty;
    const fee = isIncluded ? 0 : HALLWAY_RATES.MOVING_LARGE_CABINET_FEE;
    
    // Build reason string for UI
    let reason = '';
    if (isIncluded) {
      if (!isLarge) {
        reason = `${h.sizeTier} hallway: Included`;
      } else if (!hasMajorCabinets) {
        reason = h.cabinetCount === 0 ? 'No cabinets: Included' : `Only ${h.cabinetCount} cabinet: Included`;
      } else if (cabinetsEmpty) {
        reason = 'Cabinets empty: Included';
      }
    } else {
      reason = `Large + ${h.cabinetCount} cabinets (not empty): +$${fee}`;
    }
    
    byHallway.push({
      hallwayId: h.id,
      hallwayLabel: h.label,
      sizeTier: h.sizeTier,
      isLarge,
      hasCabinets: h.cabinetCount > 0,
      cabinetsEmpty,
      cabinetCount: h.cabinetCount,
      isIncluded,
      fee,
      reason,
    });
    
    totalFee += fee;
    if (isIncluded) includedCount++;
    else chargedCount++;
  });
  
  return { byHallway, totalFee, includedCount, chargedCount };
}

// === LIVE-HERE FLOW: Organization Service Calculation ===
export interface HallwayOrganizationResult {
  hallwayId: string;
  hallwayLabel: string;
  hours: number;
  cost: number;
  timeMinutes: number;
}

export interface HallwayOrganizationTotals {
  byHallway: HallwayOrganizationResult[];
  totalHours: number;
  totalCost: number;
  totalMinutes: number;
}

export function calcHallwayOrganizationTotals(
  hallways: HallwayConfig[]
): HallwayOrganizationTotals {
  const byHallway: HallwayOrganizationResult[] = [];
  let totalHours = 0;
  
  hallways.forEach(h => {
    const hours = h.organizationHours || 0;
    if (hours > 0) {
      byHallway.push({
        hallwayId: h.id,
        hallwayLabel: h.label,
        hours,
        cost: Math.round(hours * HALLWAY_RATES.ORGANIZATION_RATE * 100) / 100,
        timeMinutes: hours * 60,
      });
      totalHours += hours;
    }
  });
  
  return {
    byHallway,
    totalHours,
    totalCost: Math.round(totalHours * HALLWAY_RATES.ORGANIZATION_RATE * 100) / 100,
    totalMinutes: totalHours * 60,
  };
}

// === HAZARD TIME CALCULATION ===
export function calcHallwayHazardMinutes(hallway: HallwayConfig): number {
  let minutes = 0;
  if (hallway.highTrafficDust) minutes += HALLWAY_HAZARD_TIMES.highTrafficDust;
  if (hallway.runnerOrRug) minutes += HALLWAY_HAZARD_TIMES.runnerOrRug;
  if (hallway.wallScuffs) minutes += HALLWAY_HAZARD_TIMES.wallScuffs;
  if (hallway.galleryWall) minutes += HALLWAY_HAZARD_TIMES.galleryWall;
  if (hallway.entryDebris) minutes += HALLWAY_HAZARD_TIMES.entryDebris;
  return minutes;
}

// === UNIFIED SUMMARY (for all surfaces) ===
export interface HallwayLogisticsSummary {
  hallwayCount: number;
  isMovingFlow: boolean;
  isLiveHereFlow: boolean;
  
  // Moving flow data
  movingCabinetFee: number;
  movingIncludedCount: number;
  movingChargedCount: number;
  
  // Live-here flow data
  organizationHours: number;
  organizationCost: number;
  
  // Total cost to add to "Your Cleaning Total"
  totalCost: number;
  
  // Time impact (labor minutes)
  totalMinutes: number;
  
  // Per-hallway breakdown
  byHallway: Array<{
    id: string;
    label: string;
    sizeTier: HallwaySizeTier;
    cabinetCount: number;
    movingFee: number;
    organizationHours: number;
    organizationCost: number;
    isIncluded: boolean;
    laborMinutes: number;
    hazardMinutes: number;
  }>;
}

export function calcHallwaySummary(
  hallways: HallwayConfig[],
  situation: string | null,
  serviceType: string
): HallwayLogisticsSummary {
  const isMoving = isMovingFlow(situation, serviceType);
  const isLiveHere = isDeepResetLiveHere(situation, serviceType);
  
  const cabinetTotals = isMoving ? calcHallwayCabinetCostMoving(hallways) : null;
  const orgTotals = isLiveHere ? calcHallwayOrganizationTotals(hallways) : null;
  
  // Calculate time from size tiers + hazards
  let totalMinutes = 0;
  
  // Build per-hallway breakdown
  const byHallway = hallways.map(h => {
    const laborMinutes = HALLWAY_SIZE_LABOR[h.sizeTier].minutes;
    const hazardMinutes = calcHallwayHazardMinutes(h);
    totalMinutes += laborMinutes + hazardMinutes;
    
    const cabResult = cabinetTotals?.byHallway.find(c => c.hallwayId === h.id);
    const orgResult = orgTotals?.byHallway.find(o => o.hallwayId === h.id);
    
    return {
      id: h.id,
      label: h.label,
      sizeTier: h.sizeTier,
      cabinetCount: h.cabinetCount,
      movingFee: cabResult?.fee || 0,
      organizationHours: orgResult?.hours || 0,
      organizationCost: orgResult?.cost || 0,
      isIncluded: cabResult?.isIncluded ?? true,
      laborMinutes,
      hazardMinutes,
    };
  });
  
  // Add organization time to total
  if (orgTotals) {
    totalMinutes += orgTotals.totalMinutes;
  }
  
  return {
    hallwayCount: hallways.length,
    isMovingFlow: isMoving,
    isLiveHereFlow: isLiveHere,
    movingCabinetFee: cabinetTotals?.totalFee || 0,
    movingIncludedCount: cabinetTotals?.includedCount || 0,
    movingChargedCount: cabinetTotals?.chargedCount || 0,
    organizationHours: orgTotals?.totalHours || 0,
    organizationCost: orgTotals?.totalCost || 0,
    totalCost: (cabinetTotals?.totalFee || 0) + (orgTotals?.totalCost || 0),
    totalMinutes,
    byHallway,
  };
}

// === DEFAULT HALLWAY CONFIG FACTORY ===
export function createDefaultHallwayConfig(index: number): HallwayConfig {
  return {
    id: `hallway_${index}`,
    label: `Hallway ${index + 1}`,
    sizeTier: 'MEDIUM',
    cabinetCount: 0,
    cabinetsEmpty: true,
    organizationHours: 0,
    floorType: null,      // Per-hallway floor type
    floorLevel: 1,        // Default to F1
    highTrafficDust: false,
    runnerOrRug: false,
    wallScuffs: false,
    galleryWall: false,
    entryDebris: false,
    connectsTo: [],       // Connection Mapping (SSOT) - empty by default
  };
}
