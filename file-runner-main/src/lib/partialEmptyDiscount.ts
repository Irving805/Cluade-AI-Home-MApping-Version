/**
 * Partial Empty Discount Calculator — PHASE 4
 * 
 * SSOT: Calculates discount based on removed operational minutes.
 * Ensures profit protection with minimum charge floor.
 * 
 * RULES:
 * - Only applies when moveCondition === 'partial_empty' in MOVING flow
 * - Excludes zone base time, NOT addons (addons already zeroed elsewhere)
 * - Bedroom skips are handled by includedBedroomCount (NO double discount)
 * - Hallways/Stairs disabled = remove their time contribution
 */

import type { BookingFormData } from '@/contexts/BookingContext';
import { CORE_ZONE_TIME } from '@/lib/pricing_v2';
import { calcHallwaySummary } from '@/lib/pricing_hallways';
import { calcStairsSummary } from '@/lib/pricing_stairs';

// ============= LABOR RATE (CENTRALIZED) =============
// Labor rate for converting time → discount
// This should be adjusted based on actual labor costs
export const LABOR_RATE_PER_HOUR = 35;

// ============= RESULT TYPE =============
export interface PartialEmptyDiscountResult {
  /** Total minutes removed from operational estimate */
  removedMinutes: number;
  /** Human-readable list of removed zones */
  removedZones: string[];
  /** Dollar discount amount (removedMinutes * laborRate) */
  discountAmount: number;
  /** Labor rate used for calculation */
  laborRate: number;
  /** Whether discount was applied (moveCondition === 'partial_empty') */
  applied: boolean;
}

// ============= MAIN CALCULATION FUNCTION =============
/**
 * Calculate discount for Partial Empty exclusions in MOVING flow.
 * 
 * IMPORTANT: This does NOT include bedroom skips.
 * Bedroom skips reduce includedBedroomCount which already reduces base time.
 * Adding them here would double-discount.
 * 
 * @param formData - Current booking form data
 * @param isDeep - Whether this is a deep clean (Move-In/Out = true)
 * @returns Discount result with removedMinutes, removedZones, and discountAmount
 */
export function calculatePartialEmptyDiscount(
  formData: BookingFormData,
  isDeep: boolean
): PartialEmptyDiscountResult {
  // Cast to access extended fields
  const moveCondition = (formData as any).moveCondition;
  
  // Only applies to partial_empty
  if (moveCondition !== 'partial_empty') {
    return {
      removedMinutes: 0,
      removedZones: [],
      discountAmount: 0,
      laborRate: LABOR_RATE_PER_HOUR,
      applied: false,
    };
  }
  
  const tier = isDeep ? 'deep' : 'std';
  const zones = CORE_ZONE_TIME[tier];
  const excludedSpaces = formData.excludedSpaces || [];
  
  let removedMinutes = 0;
  const removedZones: string[] = [];
  
  // === CORE ZONE EXCLUSIONS ===
  // These are the main living zones that can be excluded in Partial Empty
  if (excludedSpaces.includes('kitchen')) {
    removedMinutes += zones.kitchen;
    removedZones.push('Kitchen');
  }
  if (excludedSpaces.includes('living')) {
    removedMinutes += zones.living;
    removedZones.push('Living Room');
  }
  if (excludedSpaces.includes('dining')) {
    removedMinutes += zones.dining;
    removedZones.push('Dining Room');
  }
  
  // === HALLWAYS DISABLED ===
  // Use same SSOT calculation as time engine
  const hallwaysEnabled = (formData as any).hallwaysEnabled !== false;
  if (!hallwaysEnabled && formData.hallways && formData.hallways.length > 0) {
    const hallwaySummary = calcHallwaySummary(
      formData.hallways,
      'MOVING',
      'Move-In/Out'
    );
    removedMinutes += hallwaySummary.totalMinutes;
    removedZones.push('Hallways');
  }
  
  // === STAIRS DISABLED ===
  // Use same SSOT calculation as time engine
  const stairsEnabled = (formData as any).stairsEnabled !== false;
  if (!stairsEnabled && formData.stairs && formData.stairs.length > 0) {
    const stairsSummary = calcStairsSummary(formData.stairs);
    removedMinutes += stairsSummary.totalMinutes;
    removedZones.push('Stairs');
  }
  
  // NOTE: Bedroom skips are NOT added here.
  // They reduce includedBedroomCount which already reduces base time via
  // calculateDecomposedBaseTime. Adding them here would double-discount.
  
  // === CONVERT MINUTES TO DOLLARS ===
  const discountAmount = Math.round((removedMinutes / 60) * LABOR_RATE_PER_HOUR);
  
  return {
    removedMinutes,
    removedZones,
    discountAmount,
    laborRate: LABOR_RATE_PER_HOUR,
    applied: true,
  };
}
