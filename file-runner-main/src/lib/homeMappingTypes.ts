/**
 * Home Mapping Types — Shared Sub-Models & Single Source of Truth
 * 
 * This module defines reusable data structures for Detailed Home Mapping.
 * All utility areas (Office, Laundry, Garage, Patio) use these shared sub-models
 * to prevent field duplication and ensure consistent pricing/time calculation.
 * 
 * PRINCIPLE: Define once, reuse everywhere (UI, Sidebar, Pricing, PDF, Payloads)
 */

import type { RoomFloorType, ResidentialCeilingHeight } from '@/contexts/BookingContext';

// ============= SHARED SUB-MODELS =============

/**
 * Floor Meta — Reusable floor configuration
 * Used by: Kitchen, Living, Dining, Office, Laundry, Patio, Bedrooms
 */
export interface FloorMeta {
  floorType: RoomFloorType;         // hardwood_tile | carpet | mixed
  floorLevel: number | null;        // 1-6 for multi-floor properties
}

export const DEFAULT_FLOOR_META: FloorMeta = {
  floorType: 'hardwood_tile',
  floorLevel: null,
};

/**
 * Ceiling Meta — Reusable ceiling configuration
 * Used by: All indoor areas
 */
export interface CeilingMeta {
  ceilingHeight: ResidentialCeilingHeight | null; // LOW | MEDIUM | HIGH
}

export const DEFAULT_CEILING_META: CeilingMeta = {
  ceilingHeight: null,
};

/**
 * Blinds Type — Shared window treatment type
 */
export type BlindsType = 'none' | 'standard' | 'plantation' | 'shutters' | 'vertical';

/**
 * Openings Meta — Reusable window/door configuration
 * Used by: All areas with windows or glass doors
 */
export interface OpeningsMeta {
  windowCount: number;              // 0-10 standard windows
  blindsType: BlindsType;           // Type of blinds/shutters
  slidingDoorCount: number;         // 0-4 sliding glass doors (Patio/Balcony)
}

export const DEFAULT_OPENINGS_META: OpeningsMeta = {
  windowCount: 0,
  blindsType: 'none',
  slidingDoorCount: 0,
};

/**
 * Detail Meta — Reusable detail configuration (Deep/Move flows)
 * Used by: All areas with baseboards and standard inclusions
 */
export interface DetailMeta {
  baseboardsIncluded: boolean;      // Deep/Move: include baseboards
  trashBags: number;                // 0-15 bags estimate
  stickySpills: boolean;            // Sticky floor hazard
}

export const DEFAULT_DETAIL_META: DetailMeta = {
  baseboardsIncluded: true,
  trashBags: 0,
  stickySpills: false,
};

// ============= AREA SIZE TIER =============

export type AreaSizeTier = 'small' | 'medium' | 'large';

// ============= OFFICE AREA CONFIG =============

export interface OfficeAreaConfig {
  enabled: boolean;
  size: AreaSizeTier;
  desks: number;                    // 0-3 desks
  hasShelving: boolean;             // Bookshelves/shelving
  // Shared sub-models
  floor: FloorMeta;
  ceiling: CeilingMeta;
  openings: OpeningsMeta;
  detail: DetailMeta;
  // Hazards
  hazards: {
    dustBuildup: boolean;
    paperClutter: boolean;
    cableManagement: boolean;
  };
}

export const DEFAULT_OFFICE_AREA: OfficeAreaConfig = {
  enabled: false,
  size: 'medium',
  desks: 1,
  hasShelving: false,
  floor: { ...DEFAULT_FLOOR_META },
  ceiling: { ...DEFAULT_CEILING_META },
  openings: { ...DEFAULT_OPENINGS_META, windowCount: 1 },
  detail: { ...DEFAULT_DETAIL_META },
  hazards: {
    dustBuildup: false,
    paperClutter: false,
    cableManagement: false,
  },
};

// ============= LAUNDRY AREA CONFIG =============

export type LaundryAreaType = 'closet' | 'room';

export interface LaundryAreaConfig {
  enabled: boolean;
  type: LaundryAreaType;            // Closet vs Separate Room
  size: AreaSizeTier;
  hasSink: boolean;
  hasCabinets: boolean;
  // Shared sub-models
  floor: FloorMeta;
  ceiling: CeilingMeta;
  openings: OpeningsMeta;
  detail: DetailMeta;
  // Hazards
  hazards: {
    lintBuildup: boolean;
    detergentSpills: boolean;
  };
}

export const DEFAULT_LAUNDRY_AREA: LaundryAreaConfig = {
  enabled: false,
  type: 'closet',
  size: 'small',
  hasSink: false,
  hasCabinets: false,
  floor: { ...DEFAULT_FLOOR_META },
  ceiling: { ...DEFAULT_CEILING_META },
  openings: { ...DEFAULT_OPENINGS_META },
  detail: { ...DEFAULT_DETAIL_META },
  hazards: {
    lintBuildup: false,
    detergentSpills: false,
  },
};

// ============= GARAGE AREA CONFIG =============

export type GarageCapacity = 1 | 2 | 3;
export type GarageStorageLevel = 'light' | 'medium' | 'heavy';
export type GarageFloorCondition = 'concrete' | 'coated' | 'epoxy';

export interface GarageAreaConfig {
  enabled: boolean;
  capacity: GarageCapacity;         // 1, 2, or 3 car garage
  storageLevel: GarageStorageLevel;
  floorCondition: GarageFloorCondition;
  hasOilStains: boolean;
  hasShelving: boolean;
  hasWorkbench: boolean;
  // Shared sub-models (garage-specific: no floor type, always ground)
  openings: OpeningsMeta;           // Windows only, no sliding doors
  detail: Omit<DetailMeta, 'baseboardsIncluded'>; // No baseboards in garage
  // Hazards
  hazards: {
    oilLeaks: boolean;
    heavyDebris: boolean;
  };
}

export const DEFAULT_GARAGE_AREA: GarageAreaConfig = {
  enabled: false,
  capacity: 2,
  storageLevel: 'light',
  floorCondition: 'concrete',
  hasOilStains: false,
  hasShelving: false,
  hasWorkbench: false,
  openings: { ...DEFAULT_OPENINGS_META },
  detail: { trashBags: 0, stickySpills: false },
  hazards: {
    oilLeaks: false,
    heavyDebris: false,
  },
};

// ============= PATIO / BALCONY AREA CONFIG =============

export type PatioAreaType = 'balcony' | 'patio' | 'terrace' | 'yard';
export type PatioSurfaceType = 'tile' | 'concrete' | 'wood_deck';

export interface PatioAreaConfig {
  enabled: boolean;
  type: PatioAreaType;
  size: AreaSizeTier;
  surfaceType: PatioSurfaceType;
  hasFurniture: boolean;
  hasGlassRailing: boolean;
  // Shared sub-models
  floor: Pick<FloorMeta, 'floorLevel'>; // Balcony can be on any floor
  openings: OpeningsMeta;               // Sliding doors + windows
}

export const DEFAULT_PATIO_AREA: PatioAreaConfig = {
  enabled: false,
  type: 'patio',
  size: 'medium',
  surfaceType: 'concrete',
  hasFurniture: false,
  hasGlassRailing: false,
  floor: { floorLevel: null },
  openings: { ...DEFAULT_OPENINGS_META, slidingDoorCount: 1 },
};

// ============= PREMIUM SPACES CONFIG =============
// NOTE: Entryway/Foyer removed - absorbed into Home Entry (Entry Zone section)

/**
 * Den Primary Use — Affects cleaning approach and pricing
 */
export type DenPrimaryUse = 'office' | 'playroom' | 'media' | 'gym' | 'guest' | 'general';

/**
 * Mudroom Soil Level — Affects cleaning time for mudrooms
 */
export type MudroomSoilLevel = 'none' | 'light' | 'heavy';

/**
 * Den Clutter Level — Affects cleaning time significantly
 */
export type DenClutterLevel = 'low' | 'medium' | 'high';

/**
 * Mudroom — Transition/storage area from garage/outside
 * SIMPLIFIED: Focus on cleaning-relevant fields only
 */
export interface MudroomAreaConfig {
  enabled: boolean;
  size: AreaSizeTier;                 // small | medium | large
  floorType: RoomFloorType;           // hardwood_tile | carpet | mixed
  hasBuiltInsCubbies: boolean;        // Storage cubbies (wipe down time)
  hasBench: boolean;                  // Seating bench
  hasPetArea: boolean;                // Pet bowls/mats
  heavySoil: MudroomSoilLevel;        // Mud/sand level (affects time)
  baseboardsIncluded: boolean;
}

export const DEFAULT_MUDROOM_AREA: MudroomAreaConfig = {
  enabled: false,
  size: 'medium',
  floorType: 'hardwood_tile',
  hasBuiltInsCubbies: false,
  hasBench: false,
  hasPetArea: false,
  heavySoil: 'none',
  baseboardsIncluded: true,
};

/**
 * Den / Bonus Room — Multi-purpose flex space
 * SIMPLIFIED: Focus on cleaning-relevant fields only
 */
export interface DenAreaConfig {
  enabled: boolean;
  size: AreaSizeTier;                 // small | medium | large
  primaryUse: DenPrimaryUse;          // office | playroom | media | gym | guest | general
  floorType: RoomFloorType;
  clutterLevel: DenClutterLevel;      // Affects time significantly
  hasBuiltInShelving: boolean;        // Dust/wipe shelves
  hasSpecialEquipment: boolean;       // Gym/media equipment
  baseboardsIncluded: boolean;
}

export const DEFAULT_DEN_AREA: DenAreaConfig = {
  enabled: false,
  size: 'medium',
  primaryUse: 'general',
  floorType: 'carpet',
  clutterLevel: 'low',
  hasBuiltInShelving: false,
  hasSpecialEquipment: false,
  baseboardsIncluded: true,
};

// ============= STUDIO MAIN SPACE CONFIG =============

/**
 * Studio Furniture Density — Affects pricing and time
 */
export type StudioFurnitureDensity = 'light' | 'normal' | 'heavy';

/**
 * Studio Clutter Level — Affects time significantly
 */
export type StudioClutterLevel = 'light' | 'normal' | 'heavy';

/**
 * Studio Structure Type — Affects access logistics and time
 */
export type StudioStructureType = 
  | 'apartment_unit'    // Studio in multi-unit building (most common)
  | 'adu_attached'      // Attached ADU / granny flat (part of house)
  | 'adu_detached';     // Detached studio structure

/**
 * Studio Size Range — Affects base pricing/time
 */
export type StudioSizeRange = 'under_400' | '400_600' | '600_800' | 'over_800';

/**
 * Studio Main Space — Combined living/sleeping/dining zone
 * Replaces Living, Dining, and Bedrooms for studio properties
 * 
 * PRINCIPLE: Studio = one unified operational space
 */
/**
 * Studio Dust Level — For Deep Reset flow
 */
export type StudioDustLevel = 'light' | 'normal' | 'heavy';

/**
 * Studio Moving Config — MOVING-only fields
 */
export interface StudioMovingConfig {
  isEmptyHome: boolean;
  insideCabinets: boolean;
  insideClosets: boolean;
  insideAppliances: boolean;
  wallMarks: boolean;
}

/**
 * Studio Main Space — Combined living/sleeping/dining zone
 * Replaces Living, Dining, and Bedrooms for studio properties
 * 
 * PRINCIPLE: Studio = one unified operational space
 * 
 * SSOT NOTE: Windows use roomWindowSelections['studio_main'] (not windowCount)
 * SSOT NOTE: Hazards (stickySpills, trashBags, messTypes) use global keys by roomId
 */
export interface StudioMainSpaceConfig {
  enabled: boolean;
  isCustomized: boolean;           // CRITICAL: Tracks if user modified defaults
  floorType: RoomFloorType;
  furnitureDensity: StudioFurnitureDensity;
  clutterLevel: StudioClutterLevel;
  structureType: StudioStructureType;
  studioSize: StudioSizeRange;
  // Sub-areas
  hasCloset: boolean;
  hasDeskArea: boolean;
  hasTvArea: boolean;
  hasBalconyDoor: boolean;
  hasEntryNook: boolean;           // NEW: Entry nook area
  // Window count (DEPRECATED - use roomWindowSelections['studio_main'] instead)
  windowCount: number;
  // Hazard kept in config (no global SSOT for this)
  petHairRisk: boolean;
  // Deep Reset specific
  dustLevel: StudioDustLevel;
  // Moving-only fields (no global SSOT exists for these)
  movingConfig?: StudioMovingConfig;
}

export const DEFAULT_STUDIO_MAIN_SPACE: StudioMainSpaceConfig = {
  enabled: true,                   // Auto-enabled for studios
  isCustomized: false,             // Fresh state
  floorType: 'hardwood_tile',
  furnitureDensity: 'normal',
  clutterLevel: 'normal',
  structureType: 'apartment_unit', // Most common default
  studioSize: '400_600',           // Common studio size
  hasCloset: true,
  hasDeskArea: false,
  hasTvArea: true,
  hasBalconyDoor: false,
  hasEntryNook: false,
  windowCount: 2,                  // DEPRECATED - kept for backward compat
  petHairRisk: false,
  dustLevel: 'normal',
  movingConfig: undefined,
};

// ============= UNIFIED AREAS CONTAINER =============

/**
 * HomeMapping Areas — Single Source of Truth for all mapped areas
 * This is stored in formData.homeMapping.areas and is the ONLY place
 * where these area configurations live.
 * 
 * Includes UTILITY AREAS (office, laundry, garage, patio),
 * PREMIUM SPACES (mudroom, den), and STUDIO MAIN SPACE
 */
export interface HomeMappingAreas {
  // Utility Areas
  office: OfficeAreaConfig;
  laundry: LaundryAreaConfig;
  garage: GarageAreaConfig;
  patio: PatioAreaConfig;
  // Premium Spaces (Mudroom & Den only)
  mudroom: MudroomAreaConfig;
  den: DenAreaConfig;
  // Studio Main Space (replaces living/dining/bedrooms for studios)
  studioMainSpace?: StudioMainSpaceConfig;
}

export const DEFAULT_HOME_MAPPING_AREAS: HomeMappingAreas = {
  // Utility Areas
  office: { ...DEFAULT_OFFICE_AREA },
  laundry: { ...DEFAULT_LAUNDRY_AREA },
  garage: { ...DEFAULT_GARAGE_AREA },
  patio: { ...DEFAULT_PATIO_AREA },
  // Premium Spaces
  mudroom: { ...DEFAULT_MUDROOM_AREA },
  den: { ...DEFAULT_DEN_AREA },
  // Studio Main Space (undefined by default - only set for studios)
  studioMainSpace: undefined,
};

// ============= PROPERTY TYPE NORMALIZATION =============

/**
 * Normalized property type for consistent gating logic
 */
export type NormalizedPropertyType = 
  | 'single_family'
  | 'townhouse'
  | 'apartment'
  | 'condo'
  | 'studio'
  | 'unknown';

/**
 * Normalize property type string to enum for consistent gating
 * Handles various input formats: 'house', 'apartment', 'Single Family', etc.
 * 
 * EXPANDED COVERAGE: Includes all common real estate terminology
 */
export function normalizePropertyType(propertyType: string | null | undefined): NormalizedPropertyType {
  if (!propertyType) return 'unknown';
  
  const lower = propertyType.toLowerCase().trim();
  
  // Empty string check
  if (!lower) return 'unknown';
  
  // Single Family / House patterns (EXPANDED)
  if (
    lower === 'house' ||
    lower === 'home' ||
    lower.includes('single') ||
    lower.includes('sfh') ||
    lower.includes('detached') ||
    lower.includes('residence') ||
    lower.includes('family home') ||
    lower.includes('single-family')
  ) {
    return 'single_family';
  }
  
  // Townhouse patterns (EXPANDED)
  if (
    lower.includes('townhouse') || 
    lower.includes('townhome') || 
    lower.includes('town house') || 
    lower.includes('row house') ||
    lower.includes('rowhome')
  ) {
    return 'townhouse';
  }
  
  // Apartment patterns (EXPANDED)
  if (
    lower.includes('apartment') || 
    lower.includes('apt') ||
    lower.includes('unit') ||
    lower.includes('flat')
  ) {
    return 'apartment';
  }
  
  // Condo patterns
  if (lower.includes('condo') || lower.includes('condominium')) {
    return 'condo';
  }
  
  // Studio patterns
  if (lower.includes('studio') || lower.includes('efficiency')) {
    return 'studio';
  }
  
  return 'unknown';
}

/**
 * Check if property type supports garage (SFH/Townhouse only)
 */
export function propertySupportsGarage(propertyType: NormalizedPropertyType): boolean {
  return propertyType === 'single_family' || propertyType === 'townhouse' || propertyType === 'unknown';
}

/**
 * Get default patio type based on property
 */
export function getDefaultPatioType(propertyType: NormalizedPropertyType): PatioAreaType {
  switch (propertyType) {
    case 'apartment':
    case 'condo':
    case 'studio':
      return 'balcony';
    case 'single_family':
    case 'townhouse':
    default:
      return 'patio';
  }
}

// ============= MIGRATION HELPERS =============

/**
 * Migrate legacy counter-based areas to new config-based areas
 * Called during form data hydration to maintain backward compatibility
 */
export function migrateLegacyAreas(formData: {
  officeCount?: number;
  laundryRoomCount?: number;
  garageCount?: number;
  patioCount?: number;
  patioScope?: 'sweep' | 'scrub';
  propertyType?: string | null;
}): Partial<HomeMappingAreas> {
  const result: Partial<HomeMappingAreas> = {};
  
  // Migrate office
  if ((formData.officeCount || 0) > 0) {
    result.office = {
      ...DEFAULT_OFFICE_AREA,
      enabled: true,
    };
  }
  
  // Migrate laundry
  if ((formData.laundryRoomCount || 0) > 0) {
    result.laundry = {
      ...DEFAULT_LAUNDRY_AREA,
      enabled: true,
      type: 'room', // Assume room if they had count > 0
    };
  }
  
  // Migrate garage
  if ((formData.garageCount || 0) > 0) {
    result.garage = {
      ...DEFAULT_GARAGE_AREA,
      enabled: true,
      capacity: Math.min(formData.garageCount || 1, 3) as GarageCapacity,
    };
  }
  
  // Migrate patio
  if ((formData.patioCount || 0) > 0) {
    const normalizedType = normalizePropertyType(formData.propertyType);
    result.patio = {
      ...DEFAULT_PATIO_AREA,
      enabled: true,
      type: getDefaultPatioType(normalizedType),
      // scrub scope means larger/dirtier, map to 'large'
      size: formData.patioScope === 'scrub' ? 'large' : 'medium',
    };
  }
  
  return result;
}

// ============= BATHROOM TYPES RE-EXPORT =============
// Bathroom types moved to dedicated domain: bathroomMappingTypes.ts
// Re-export for backward compatibility with existing imports
export type { 
  BathroomType, 
  BathroomFixtures, 
  BathroomVanityType, 
  BathroomGlassLevel, 
  BathroomTileLevel, 
  BathroomSizeType, 
  BathroomCondition,
  BathroomUnit, 
  BathroomInventory 
} from './bathroomMappingTypes';
export { DEFAULT_BATHROOM_UNIT_BY_TYPE } from './bathroomMappingTypes';

// ============= AREA COMPLETENESS HELPERS =============

export interface AreaCompleteness {
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Check if an area configuration is complete for review/submission
 * Supports all mapped area types: utility areas + premium spaces + studio
 */
export function checkAreaCompleteness(
  areaKey: keyof HomeMappingAreas,
  config: OfficeAreaConfig | LaundryAreaConfig | GarageAreaConfig | PatioAreaConfig | MudroomAreaConfig | DenAreaConfig | StudioMainSpaceConfig | undefined
): AreaCompleteness {
  const missingFields: string[] = [];
  
  if (!config || !config.enabled) {
    return { isComplete: true, missingFields: [] }; // Disabled areas are "complete"
  }
  
  // Studio main space has its own completeness logic
  if (areaKey === 'studioMainSpace') {
    return { isComplete: true, missingFields: [] }; // Studio is always "complete" when enabled
  }
  
  // Common checks for other areas
  if (areaKey !== 'garage' && 'floor' in config) {
    const floorConfig = config.floor as FloorMeta;
    if (floorConfig.floorLevel === null) {
      missingFields.push(`${areaKey}.floorLevel`);
    }
  }
  
  if ('ceiling' in config && config.ceiling.ceilingHeight === null) {
    missingFields.push(`${areaKey}.ceilingHeight`);
  }
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get overall mapping completeness for all utility areas
 */
export function getOverallCompleteness(areas: HomeMappingAreas): {
  status: 'complete' | 'partial' | 'none';
  enabledCount: number;
  completeCount: number;
  missingFields: string[];
} {
  // Filter out studioMainSpace if undefined and check enabled
  const enabledAreas = (Object.keys(areas) as (keyof HomeMappingAreas)[])
    .filter(key => {
      const area = areas[key];
      return area && typeof area === 'object' && 'enabled' in area && area.enabled;
    });
  
  if (enabledAreas.length === 0) {
    return { status: 'none', enabledCount: 0, completeCount: 0, missingFields: [] };
  }
  
  const completenessResults = enabledAreas.map(key => ({
    key,
    ...checkAreaCompleteness(key, areas[key] as any),
  }));
  
  const completeCount = completenessResults.filter(r => r.isComplete).length;
  const allMissingFields = completenessResults.flatMap(r => r.missingFields);
  
  return {
    status: completeCount === enabledAreas.length ? 'complete' : 'partial',
    enabledCount: enabledAreas.length,
    completeCount,
    missingFields: allMissingFields,
  };
}
