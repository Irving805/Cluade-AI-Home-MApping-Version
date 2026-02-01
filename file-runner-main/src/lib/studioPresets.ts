/**
 * Studio Presets — Situation-Aware Defaults
 * 
 * Provides preset configurations for Studio Main Space based on situation.
 * 
 * RULE: Apply preset only when:
 * 1. studioMainSpace doesn't exist, OR
 * 2. studioMainSpace.isCustomized === false
 */

import type { Situation } from '@/contexts/BookingContext';
import type { StudioMainSpaceConfig } from '@/lib/homeMappingTypes';
import { DEFAULT_STUDIO_MAIN_SPACE } from '@/lib/homeMappingTypes';

/**
 * Get studio preset by situation
 * 
 * MOVING: Empty/light furniture, no clutter, focus on surfaces
 * LIVE_HERE: Normal density, typical setup with desk area
 */
export function getStudioPresetBySituation(situation: Situation): StudioMainSpaceConfig {
  const base = { ...DEFAULT_STUDIO_MAIN_SPACE };
  
  if (situation === 'MOVING') {
    // Move-out: Empty/light, no clutter, focus on surfaces
    return {
      ...base,
      furnitureDensity: 'light',
      clutterLevel: 'light',
      hasDeskArea: false,
      petHairRisk: false,
      isCustomized: false,
    };
  }
  
  // LIVE_HERE: Normal density, typical setup
  return {
    ...base,
    furnitureDensity: 'normal',
    clutterLevel: 'normal',
    hasDeskArea: true,
    petHairRisk: false,
    isCustomized: false,
  };
}

/**
 * Apply preset only if not customized
 * Returns existing config if user has made changes
 */
export function applyStudioPresetIfFresh(
  existing: StudioMainSpaceConfig | undefined,
  situation: Situation
): StudioMainSpaceConfig {
  // No existing config → apply preset
  if (!existing) {
    return getStudioPresetBySituation(situation);
  }
  
  // User hasn't customized → apply preset
  if (!existing.isCustomized) {
    return getStudioPresetBySituation(situation);
  }
  
  // User has customized → preserve their settings
  return existing;
}
