/**
 * Stairs Model — Single Source of Truth for Multi-Stair Logistics
 * 
 * SSOT for StairConfig interface, factory functions, and auto-creation logic.
 * All stairs-related code MUST import from here to avoid drift.
 */

import type { FloorId } from '@/lib/floorLocationTypes';

// === STAIR SURFACE TYPES ===
export type StairSurfaceType = 'carpet' | 'hardwood' | 'mixed_runner';

// === STAIR CONFIG (Multi-Entity SSOT) ===
export interface StairConfig {
  id: string;                    // STABLE: stair_0, stair_1 (NO reindexing on remove)
  label: string;                 // "Stair 1", "Main Stair"
  fromFloor: number;             // 1 = F1, 2 = F2, etc.
  toFloor: number;               // Connection target floor
  surfaceType: StairSurfaceType;
  stepCount: number;             // 8-22 steps
  // Hazards (same as legacy StairsConfig)
  cornerBuildup: boolean;
  petHairAccumulation: boolean;
  slipHazards: boolean;
  railingsDetail: boolean;
}

// === STAIR LABOR RATES (SSOT) ===
export const STAIR_LABOR_RATES = {
  BASE_PER_STEP: 0.8,           // minutes/step
  HAZARD_CORNER_BUILDUP: 12,    // +12 min
  HAZARD_PET_HAIR: 10,          // +10 min
  HAZARD_SLIP: 5,               // +5 min
  HAZARD_RAILINGS: 18,          // +18 min (intricate spindles)
} as const;

// === STAIR SIZE INFO (for UI microcopy) ===
export const STAIR_SIZE_INFO = {
  short: { stepRange: '8–12', typical: 'Single flight, compact' },
  medium: { stepRange: '12–16', typical: 'Standard residential stair' },
  long: { stepRange: '16–22', typical: 'Tall staircase, split landing' },
} as const;

// === FACTORY: Create Default Stair Config ===
/**
 * Create a default stair config with a stable ID.
 * @param index - Unique index for this stair (used to generate stable ID)
 * @param fromFloor - Source floor number (1-based)
 * @param toFloor - Destination floor number
 */
export function createDefaultStairConfig(
  index: number,
  fromFloor: number,
  toFloor: number
): StairConfig {
  return {
    id: `stair_${index}`,  // Stable ID pattern
    label: `Stair ${index + 1}`,
    fromFloor,
    toFloor,
    surfaceType: 'carpet',
    stepCount: 14,
    cornerBuildup: false,
    petHairAccumulation: false,
    slipHazards: false,
    railingsDetail: false,
  };
}

// === REQUIRED STAIR CONNECTIONS ===
/**
 * Get the required stair connections based on floor count.
 * 2 floors → [{1,2}], 3 floors → [{1,2}, {2,3}], etc.
 */
export function getRequiredStairConnections(
  maxFloors: number
): Array<{ from: number; to: number }> {
  const connections: Array<{ from: number; to: number }> = [];
  for (let i = 1; i < maxFloors; i++) {
    connections.push({ from: i, to: i + 1 });
  }
  return connections;
}

// === SAFE AUTO-CREATE: Ensure Required Stairs Exist ===
/**
 * Ensures required stair connections exist without overwriting user edits.
 * - Only adds MISSING floor connections
 * - Never deletes or reindexes existing stairs
 * - Uses stable IDs
 * 
 * @param currentStairs - Current stairs array from formData
 * @param maxFloors - Number of floors in the property
 * @returns Updated stairs array with missing connections added
 */
export function ensureStairsExist(
  currentStairs: StairConfig[],
  maxFloors: number
): StairConfig[] {
  // No stairs needed for single-floor properties
  if (maxFloors < 2) return currentStairs;
  
  const required = getRequiredStairConnections(maxFloors);
  const existing = new Set(
    currentStairs.map(s => `${s.fromFloor}->${s.toFloor}`)
  );
  
  // Find highest existing index for new IDs
  const maxIdx = currentStairs.reduce((max, s) => {
    const match = s.id.match(/stair_(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, -1);
  
  let nextIdx = maxIdx + 1;
  const additions: StairConfig[] = [];
  
  required.forEach(({ from, to }) => {
    if (!existing.has(`${from}->${to}`)) {
      additions.push(createDefaultStairConfig(nextIdx++, from, to));
    }
  });
  
  // Return original + additions (preserves user edits)
  return [...currentStairs, ...additions];
}

// === HAZARD MINUTE CALCULATION ===
/**
 * Calculate total hazard minutes for a single stair.
 */
export function calcStairHazardMinutes(stair: StairConfig): number {
  let minutes = 0;
  if (stair.cornerBuildup) minutes += STAIR_LABOR_RATES.HAZARD_CORNER_BUILDUP;
  if (stair.petHairAccumulation) minutes += STAIR_LABOR_RATES.HAZARD_PET_HAIR;
  if (stair.slipHazards) minutes += STAIR_LABOR_RATES.HAZARD_SLIP;
  if (stair.railingsDetail) minutes += STAIR_LABOR_RATES.HAZARD_RAILINGS;
  return minutes;
}

// === HAZARD LABELS ===
/**
 * Get human-readable hazard labels for a stair.
 */
export function getStairHazardLabels(stair: StairConfig): string[] {
  const labels: string[] = [];
  if (stair.cornerBuildup) labels.push('Corner Buildup');
  if (stair.petHairAccumulation) labels.push('Pet Hair');
  if (stair.slipHazards) labels.push('Slip Hazards');
  if (stair.railingsDetail) labels.push('Intricate Railings');
  return labels;
}

// === TOTAL MINUTES FOR A STAIR ===
/**
 * Calculate total minutes (base + hazards) for a single stair.
 */
export function calcStairTotalMinutes(stair: StairConfig): number {
  const baseMinutes = Math.ceil(stair.stepCount * STAIR_LABOR_RATES.BASE_PER_STEP);
  const hazardMinutes = calcStairHazardMinutes(stair);
  return baseMinutes + hazardMinutes;
}

// === STAIR CONNECTION LABEL ===
/**
 * Generate a display label for a stair connection (e.g., "F1 → F2").
 */
export function getStairConnectionLabel(stair: StairConfig): string {
  return `F${stair.fromFloor} → F${stair.toFloor}`;
}
