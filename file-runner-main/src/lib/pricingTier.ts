/**
 * Pricing Tier — SSOT for bathroom pricing tier selection
 * 
 * RULE: "Deep Reset" is UX/logistics branding only.
 * For LIVE_HERE and MOVING flows, bathrooms use STANDARD tier.
 * Only explicitly deep-priced services (if any) should use deep tier.
 * 
 * This helper is the ONLY place allowed to decide std/deep tier for bathrooms.
 * Modifiers (buildup, heavy glass, etc.) can still apply on top of the base tier.
 */

import type { Situation } from '@/contexts/BookingContext';

export type PricingTier = 'std' | 'deep';

/**
 * Get the bathroom pricing tier based on service level.
 * 
 * IMPORTANT: "Move-In/Out" is a logistics mode, NOT a pricing tier change.
 * - "I Live Here" flow → Standard tier
 * - "I'm Moving" flow → Standard tier (with modifier presets like buildup)
 * - Explicit "Deep Clean" service → Deep tier
 * 
 * @param baseServiceLevel - The base service level (e.g., 'Standard Clean', 'Deep Clean', 'Move-In/Out')
 * @param _situation - Optional situation context (not used for tier, but available for future use)
 * @returns PricingTier - 'std' or 'deep'
 */
export function getBathroomPricingTier(
  baseServiceLevel: string,
  _situation?: Situation | null
): PricingTier {
  // "Deep Clean" and "Move-In/Out" both use deep tier for bathrooms
  if (baseServiceLevel === 'Deep Clean' || baseServiceLevel === 'Move-In/Out') {
    return 'deep';
  }
  
  // Standard Clean and other flows use standard tier
  return 'std';
}

/**
 * Check if a service level would use deep pricing for NON-bathroom components.
 * This preserves the existing behavior for base price, living areas, etc.
 * 
 * IMPORTANT: This is NOT for bathrooms - use getBathroomPricingTier() for bathrooms.
 */
export function isDeepCleanLevel(baseServiceLevel: string): boolean {
  return baseServiceLevel === 'Deep Clean' || baseServiceLevel === 'Move-In/Out';
}
