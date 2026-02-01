/**
 * Bathroom Mapping Types — Dedicated Domain for Bathroom Inventory
 * 
 * This module defines all bathroom-related types for the premium
 * Bathroom Mapping Inventory system. Kept SEPARATE from homeMappingTypes
 * to maintain clean domain boundaries.
 * 
 * PRINCIPLE: Bathrooms are their own SSOT domain (types, presets, pricing)
 */

import type { FloorId } from './floorLocationTypes';

// ============= BATHROOM UNIT CONFIGURATION =============

export type BathroomType = 'master' | 'full' | 'half';

export type BathroomFixtures = 'shower' | 'tub' | 'shower_tub' | 'none';

export type BathroomVanityType = 'single' | 'double';

export type BathroomGlassLevel = 'none' | 'standard' | 'heavy';

export type BathroomTileLevel = 'light' | 'normal' | 'heavy';

export type BathroomSizeType = 'small' | 'normal' | 'large';

export type BathroomCondition = 'standard' | 'buildup' | 'severe';

// ============= BATHROOM LOGISTICS TYPES (OPERATIONAL ONLY) =============
// These fields are for TIME estimation only, never duplicating pricing fields

/** Toilet bowl scale/buildup level (ring, bottom, lime) */
export type ToiletScaleLevel = 'none' | 'light' | 'heavy' | 'stained';

/** Tub/shower surface soap scum, minerals */
export type TubScaleLevel = 'none' | 'soap' | 'mineral' | 'heavy';

/** Glass door water spots, minerals - separate from glass PRICING field */
export type ShowerDoorScaleLevel = 'none' | 'water_spots' | 'mineral' | 'heavy';

/** Cabinet interior load - different from vanity type (exterior) */
export type CabinetInteriorLoad = 'no' | 'yes_empty' | 'yes_with_items';

/**
 * BathroomLogistics — Operational-only fields for time estimation
 * 
 * PRINCIPLE: These fields NEVER overlap with existing pricing fields.
 * - glass/size/condition/tileLevel already exist in BathroomUnit and affect PRICE
 * - This layer adds REAL-WORLD operational signals for TIME only
 */
export interface BathroomLogistics {
  // Surface scale/buildup (not same as "condition" which is overall state)
  toiletScale: ToiletScaleLevel;           // Toilet bowl ring, bottom, lime
  tubScale: TubScaleLevel;                 // Tub/shower surface soap scum, minerals
  showerDoorScale: ShowerDoorScaleLevel;   // Glass door water spots, minerals

  // Cabinet interior (not same as vanity type which is exterior)
  cabinetInterior: CabinetInteriorLoad;    // Inside cabinets empty/with items

  // Mirrors (not tracked elsewhere)
  mirrorCount: number;                     // 0, 1, 2, 3+

  // Crew notes (optional, for edge cases)
  notes?: string;

  // Supervisor manual override (optional)
  extraMinutesManual?: number;
}

/**
 * BathroomUnit — Individual bathroom configuration
 * Each bathroom in the inventory has its own config for premium pricing
 */
export interface BathroomUnit {
  id: string;                           // Stable ID: bath_master_0, bath_full_1, etc.
  type: BathroomType;                   // master | full | half
  fixtures: BathroomFixtures;           // shower | tub | shower_tub | none
  vanity: BathroomVanityType;           // single | double
  glass: BathroomGlassLevel;            // none | standard | heavy
  tileLevel: BathroomTileLevel;         // light | normal | heavy
  size: BathroomSizeType;               // small | normal | large
  condition: BathroomCondition;         // standard | buildup | severe
  isEnsuite: boolean;                   // Connected to bedroom
  hasWindow: boolean;                   // Window in bathroom
  isCustomized: boolean;                // CRITICAL: Track user modifications (config)
  // Floor mapping (SSOT for multi-floor properties)
  floorId: FloorId;                     // Floor assignment using canonical FloorId
  floorCustomized?: boolean;            // Track if user explicitly set floor (separate from isCustomized)
  floorRemappedFrom?: FloorId;          // Track original floor when auto-remapped (for UI visibility)
  
  // NEW: Operational logistics (optional, backward compatible)
  logistics?: BathroomLogistics;
  
  // NEW: Track if logistics was manually customized (prevents MOVING defaults from overwriting)
  logisticsCustomized?: boolean;
}

/**
 * BathroomInventory — Container for all bathroom units
 */
export interface BathroomInventory {
  version: number;                      // For migration compatibility
  bathrooms: BathroomUnit[];
}

/**
 * Default unit configs by bathroom type
 * Used when generating inventory from counts
 */
export const DEFAULT_BATHROOM_UNIT_BY_TYPE: Record<BathroomType, Omit<BathroomUnit, 'id'>> = {
  master: {
    type: 'master',
    fixtures: 'shower_tub',
    vanity: 'double',
    glass: 'standard',
    tileLevel: 'normal',
    size: 'normal',
    condition: 'standard',
    isEnsuite: true,
    hasWindow: false,
    isCustomized: false,
    floorId: 'FLOOR_1',  // Will be overridden by smart defaults
    floorCustomized: false,
  },
  full: {
    type: 'full',
    fixtures: 'shower_tub',
    vanity: 'single',
    glass: 'none',
    tileLevel: 'normal',
    size: 'normal',
    condition: 'standard',
    isEnsuite: false,
    hasWindow: false,
    isCustomized: false,
    floorId: 'FLOOR_1',
    floorCustomized: false,
  },
  half: {
    type: 'half',
    fixtures: 'none',
    vanity: 'single',
    glass: 'none',
    tileLevel: 'light',
    size: 'small',
    condition: 'standard',
    isEnsuite: false,
    hasWindow: false,
    isCustomized: false,
    floorId: 'FLOOR_1',
    floorCustomized: false,
  },
};
