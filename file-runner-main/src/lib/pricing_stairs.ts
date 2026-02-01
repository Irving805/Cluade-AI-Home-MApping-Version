/**
 * Stair Pricing Engine
 * Single Source of Truth for multi-stair logistics pricing
 * 
 * NOTE: For now, stairs contribute ONLY to logistics minutes (not dollars).
 * Monetary pricing can be added in Phase 2 if needed.
 * 
 * Re-exports StairConfig and helpers from stairsModel.ts for convenience.
 */

import type { StairConfig } from '@/lib/stairs/stairsModel';
import {
  STAIR_LABOR_RATES,
  calcStairHazardMinutes,
  getStairHazardLabels,
  calcStairTotalMinutes,
} from '@/lib/stairs/stairsModel';

// Re-export for convenience
export { STAIR_LABOR_RATES } from '@/lib/stairs/stairsModel';
export type { StairConfig } from '@/lib/stairs/stairsModel';

// === STAIR SUMMARY TYPES ===
export interface StairSummaryItem {
  id: string;
  label: string;
  fromFloor: number;
  toFloor: number;
  surfaceType: string;
  stepCount: number;
  baseMinutes: number;
  hazardMinutes: number;
  totalMinutes: number;
  hazardLabels: string[];
}

export interface StairsSummary {
  totalCount: number;
  totalMinutes: number;
  totalBaseMinutes: number;
  totalHazardMinutes: number;
  stairs: StairSummaryItem[];
}

// === MAIN SUMMARY CALCULATION ===
/**
 * Calculate summary for all stairs in a property.
 * Used by layoutModel builder and pricing engine for zero drift.
 */
export function calcStairsSummary(stairs: StairConfig[]): StairsSummary {
  if (!stairs || stairs.length === 0) {
    return {
      totalCount: 0,
      totalMinutes: 0,
      totalBaseMinutes: 0,
      totalHazardMinutes: 0,
      stairs: [],
    };
  }

  const summaryItems: StairSummaryItem[] = stairs.map((stair) => {
    const baseMinutes = Math.ceil(stair.stepCount * STAIR_LABOR_RATES.BASE_PER_STEP);
    const hazardMinutes = calcStairHazardMinutes(stair);
    const hazardLabels = getStairHazardLabels(stair);

    return {
      id: stair.id,
      label: stair.label,
      fromFloor: stair.fromFloor,
      toFloor: stair.toFloor,
      surfaceType: stair.surfaceType,
      stepCount: stair.stepCount,
      baseMinutes,
      hazardMinutes,
      totalMinutes: baseMinutes + hazardMinutes,
      hazardLabels,
    };
  });

  const totalBaseMinutes = summaryItems.reduce((sum, s) => sum + s.baseMinutes, 0);
  const totalHazardMinutes = summaryItems.reduce((sum, s) => sum + s.hazardMinutes, 0);

  return {
    totalCount: summaryItems.length,
    totalMinutes: totalBaseMinutes + totalHazardMinutes,
    totalBaseMinutes,
    totalHazardMinutes,
    stairs: summaryItems,
  };
}

// === TOTAL STAIRS FEE (Future Phase 2) ===
/**
 * Calculate total fees for all stairs.
 * Currently returns 0 (logistics-first approach).
 * Can be extended in Phase 2 to charge for hazards or deep-clean extras.
 */
export function calculateStairsTotalFees(
  _stairs: StairConfig[],
  _isDeepClean: boolean = false
): number {
  // Phase 1: Logistics-first (no monetary fees)
  // Phase 2: Could add per-hazard fees or deep-clean surcharges
  return 0;
}
