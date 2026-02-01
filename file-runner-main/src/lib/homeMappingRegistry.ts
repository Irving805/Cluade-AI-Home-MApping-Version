/**
 * Home Mapping Registry — Single Source of Truth
 * 
 * This module defines all Service Areas for "Detailed Home Mapping" as a central registry.
 * Each area's visibility (gating), labels, ordering, and stable ID strategy is declared once here.
 * 
 * IMPORTANT: Gating functions delegate to propertyCategory.ts for property detection.
 * This ensures consistency with visibility.ts and other consumers.
 */

import { 
  getPropertyContext, 
  canHaveGarage, 
  canHaveMudroom, 
  canHaveHallways, 
  canHaveStairs, 
  canHaveDen,
  canHaveBedrooms,
  canHaveSeparateLiving,
  shouldShowStudioMainSpace,
  isStudio,
  isOneBedroom,
  type PropertyContext,
  type PropertyContextInput,
} from './propertyCategory';
import { normalizePropertyType, type NormalizedPropertyType } from './homeMappingTypes';

// ============= TYPE DEFINITIONS =============

/** Service Area keys - extensible union type */
export type ServiceAreaKey = 
  | 'home_entry'
  | 'kitchen' 
  | 'living' 
  | 'studio_main_space'  // NEW: Replaces living/dining/bedrooms for studios
  | 'dining' 
  | 'bedrooms' 
  | 'hallways' 
  | 'stairs'
  // Premium Spaces (Mudroom & Den only - Entryway absorbed into Home Entry)
  | 'mudroom'
  | 'den'
  // Utility & Support Areas
  | 'office'
  | 'laundry'
  // Exterior / Semi-Exterior Areas
  | 'garage'
  | 'patio';

/** Context passed to gating functions for visibility decisions */
export interface AreaGatingContext {
  situation: 'LIVE_HERE' | 'MOVING' | 'HOURLY' | 'SPECIFIC_AREAS' | 'COMMERCIAL' | 'RENOVATION' | null;
  serviceType: string;
  sqftRange?: string;                  // THE source of truth (e.g., "5000_7500")
  homeSizeLabel?: string;              // Legacy - kept for backward compat
  bedroomCount?: number;
  propertyFloors?: number;
  propertyType?: string;              // Raw property type string
  normalizedPropertyType?: NormalizedPropertyType; // Normalized for consistent gating
  // NEW: Apartment-specific fields
  apartmentUnitLevels?: number;       // 1 = standard, 2+ = loft/duplex
}

/** Definition for a single Service Area in the registry */
export interface ServiceAreaDefinition {
  key: ServiceAreaKey;
  order: number;                    // Display order (10, 20, 30... for easy insertion)
  emoji: string;                    // 🍳, 🛋️, 🍽️, 🛏️, 🚶, 🪜
  labelKey: string;                 // Translation key for area name
  subtitleKey?: string;             // Optional subtitle translation key
  idPrefix: string;                 // Tracking code prefix: KT, LV, DN, BR, HW, ST
  supportsFloorType: boolean;       // Does this area have floor type selector?
  supportsFloorLevel: boolean;      // Does this area have floor level selector?
  supportsCollapse: boolean;        // Is this area collapsible?
  isMultiEntry: boolean;            // Can have multiple instances (hallways, bedrooms)?
  gatingFn: (ctx: AreaGatingContext) => boolean;  // Visibility function
}

// ============= CONTEXT BUILDER HELPER =============

/**
 * Build PropertyContext from AreaGatingContext
 * Used by gating functions to delegate to propertyCategory.ts
 */
function buildPropertyContextFromGating(ctx: AreaGatingContext): PropertyContext {
  return getPropertyContext(undefined, {
    homeSize: ctx.bedroomCount,
    propertyType: ctx.propertyType,
    houseLevels: ctx.propertyFloors,
    apartmentUnitLevels: ctx.apartmentUnitLevels || ctx.propertyFloors,
    squareFootageRange: ctx.sqftRange || ctx.homeSizeLabel,
  });
}

// ============= GATING FUNCTIONS =============

/** Home Entry visible for residential flows (LIVE_HERE, MOVING) */
function gateHomeEntry(ctx: AreaGatingContext): boolean {
  return ctx.situation === 'LIVE_HERE' || ctx.situation === 'MOVING';
}

/** Kitchen always visible for residential flows */
function gateKitchen(ctx: AreaGatingContext): boolean {
  return ctx.situation !== 'COMMERCIAL' && ctx.situation !== 'RENOVATION';
}

/** Living visible for residential, hidden for studios */
function gateLiving(ctx: AreaGatingContext): boolean {
  if (ctx.situation === 'COMMERCIAL' || ctx.situation === 'RENOVATION') return false;
  const propCtx = buildPropertyContextFromGating(ctx);
  return canHaveSeparateLiving(propCtx);
}

/** Studio Main Space: Only for studio properties */
function gateStudioMainSpace(ctx: AreaGatingContext): boolean {
  if (ctx.situation === 'COMMERCIAL' || ctx.situation === 'RENOVATION') return false;
  const propCtx = buildPropertyContextFromGating(ctx);
  return shouldShowStudioMainSpace(propCtx);
}

/** Dining: hidden for studios and 1BR homes (combined in living area) */
function gateDining(ctx: AreaGatingContext): boolean {
  if (ctx.situation === 'COMMERCIAL' || ctx.situation === 'RENOVATION') return false;
  const propCtx = buildPropertyContextFromGating(ctx);
  // Studios NEVER have separate dining - it's part of studio_main_space
  if (isStudio(propCtx)) return false;
  // 1BR homes typically have open living/dining layout
  if (isOneBedroom(propCtx)) return false;
  return true;
}

/** Bedrooms visible if bedroom count > 0 */
function gateBedrooms(ctx: AreaGatingContext): boolean {
  const propCtx = buildPropertyContextFromGating(ctx);
  return canHaveBedrooms(propCtx);
}

/** 
 * Hallways gating logic:
 * - STUDIO: NEVER show hallways (open layout, covered by studio_main_space)
 * - MOVING: always visible (need hallway info for move logistics)
 * - LIVE_HERE: delegates to propertyCategory.canHaveHallways()
 */
function gateHallways(ctx: AreaGatingContext): boolean {
  const propCtx = buildPropertyContextFromGating(ctx);
  
  // Studios NEVER have hallways - even for MOVING (open layout)
  if (isStudio(propCtx)) return false;
  
  // For MOVING (non-studio), show hallways (need hallway info for move logistics)
  if (ctx.situation === 'MOVING') return true;
  
  // For LIVE_HERE and other flows, use property-based gating
  return canHaveHallways(propCtx);
}

/** Stairs visible only for 2+ floor properties */
function gateStairs(ctx: AreaGatingContext): boolean {
  const propCtx = buildPropertyContextFromGating(ctx);
  return canHaveStairs(propCtx);
}

/** Office visible for residential flows (LIVE_HERE, MOVING), NEVER for studios or 1BR */
function gateOffice(ctx: AreaGatingContext): boolean {
  if (ctx.situation !== 'LIVE_HERE' && ctx.situation !== 'MOVING') return false;
  
  const propCtx = buildPropertyContextFromGating(ctx);
  // Studios don't have separate office space - workspace is part of main area
  if (isStudio(propCtx)) return false;
  // 1BR homes rarely have dedicated office - workspace is in bedroom/living
  if (isOneBedroom(propCtx)) return false;
  
  return true;
}

/** Laundry visible for residential flows (LIVE_HERE, MOVING) */
function gateLaundry(ctx: AreaGatingContext): boolean {
  return ctx.situation === 'LIVE_HERE' || ctx.situation === 'MOVING';
}

/** 
 * Garage visible only for SFH/Townhouse property types
 * Delegates to propertyCategory.canHaveGarage()
 */
function gateGarage(ctx: AreaGatingContext): boolean {
  // Exclude commercial and renovation flows explicitly
  if (ctx.situation === 'COMMERCIAL' || ctx.situation === 'RENOVATION') return false;
  
  // For SPECIFIC_AREAS (hourly), don't show utility areas
  if (ctx.situation === 'SPECIFIC_AREAS') return false;
  
  // For LIVE_HERE and MOVING, check property type
  if (ctx.situation !== 'LIVE_HERE' && ctx.situation !== 'MOVING' && ctx.situation !== null) {
    return false;
  }
  
  const propCtx = buildPropertyContextFromGating(ctx);
  return canHaveGarage(propCtx);
}

/** Patio/Balcony visible for all residential flows */
function gatePatio(ctx: AreaGatingContext): boolean {
  return ctx.situation === 'LIVE_HERE' || ctx.situation === 'MOVING';
}

// ============= PREMIUM SPACES GATING =============

/**
 * Mudroom: Delegates to propertyCategory.canHaveMudroom()
 * SFH/Townhouse only, with size requirements
 */
function gateMudroom(ctx: AreaGatingContext): boolean {
  if (!['LIVE_HERE', 'MOVING'].includes(ctx.situation as string)) return false;
  
  const propCtx = buildPropertyContextFromGating(ctx);
  return canHaveMudroom(propCtx);
}

/**
 * Den/Bonus Room: Delegates to propertyCategory.canHaveDen()
 * Not shown for studios
 */
function gateDen(ctx: AreaGatingContext): boolean {
  if (!['LIVE_HERE', 'MOVING'].includes(ctx.situation as string)) return false;
  
  const propCtx = buildPropertyContextFromGating(ctx);
  return canHaveDen(propCtx);
}

// ============= REGISTRY DEFINITION =============

export const HOME_MAPPING_REGISTRY: ServiceAreaDefinition[] = [
  {
    key: 'home_entry',
    order: 5,
    emoji: '🚪',
    labelKey: 'homeEntry.title',
    subtitleKey: 'homeEntry.subtitle',
    idPrefix: 'HE',
    supportsFloorType: false,
    supportsFloorLevel: false,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateHomeEntry,
  },
  {
    key: 'kitchen',
    order: 10,
    emoji: '🍳',
    labelKey: 'core.kitchen',
    idPrefix: 'KT',
    supportsFloorType: true,
    supportsFloorLevel: true,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateKitchen,
  },
  {
    key: 'studio_main_space',
    order: 15,
    emoji: '🛏️',
    labelKey: 'spaces.studio_main_space',
    subtitleKey: 'spaces.studio_main_space_subtitle',
    idPrefix: 'SM',
    supportsFloorType: true,
    supportsFloorLevel: false,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateStudioMainSpace,
  },
  {
    key: 'living',
    order: 20,
    emoji: '🛋️',
    labelKey: 'core.living',
    idPrefix: 'LV',
    supportsFloorType: true,
    supportsFloorLevel: true,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateLiving,
  },
  {
    key: 'dining',
    order: 30,
    emoji: '🍽️',
    labelKey: 'core.dining',
    idPrefix: 'DN',
    supportsFloorType: true,
    supportsFloorLevel: true,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateDining,  // Uses dedicated gateDining which checks isStudio
  },
  {
    key: 'bedrooms',
    order: 40,
    emoji: '🛏️',
    labelKey: 'spaces.bedrooms_title',
    idPrefix: 'BR',
    supportsFloorType: true,
    supportsFloorLevel: true,
    supportsCollapse: true,
    isMultiEntry: true,
    gatingFn: gateBedrooms,
  },
  {
    key: 'hallways',
    order: 50,
    emoji: '🚶',
    labelKey: 'hallway.section_title',
    idPrefix: 'HW',
    supportsFloorType: true,
    supportsFloorLevel: true,
    supportsCollapse: true,
    isMultiEntry: true,
    gatingFn: gateHallways,
  },
  {
    key: 'stairs',
    order: 60,
    emoji: '🪜',
    labelKey: 'core.stairs',
    idPrefix: 'ST',
    supportsFloorType: true,
    supportsFloorLevel: false,  // Stairs span floors, no single location
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateStairs,
  },
  // === PREMIUM SPACES (Mudroom & Den only - Entryway absorbed into Home Entry) ===
  {
    key: 'mudroom',
    order: 61,
    emoji: '👟',
    labelKey: 'spaces.mudroom',
    subtitleKey: 'spaces.mudroom.subtitle',
    idPrefix: 'MR',
    supportsFloorType: true,
    supportsFloorLevel: false,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateMudroom,
  },
  {
    key: 'den',
    order: 62,
    emoji: '🛋️',
    labelKey: 'spaces.den',
    subtitleKey: 'spaces.den.subtitle',
    idPrefix: 'DN',
    supportsFloorType: true,
    supportsFloorLevel: true,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateDen,
  },
  // === UTILITY & SUPPORT AREAS ===
  {
    key: 'office',
    order: 65,
    emoji: '💼',
    labelKey: 'spaces.office',
    subtitleKey: 'spaces.office.subtitle',
    idPrefix: 'OF',
    supportsFloorType: true,
    supportsFloorLevel: true,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateOffice,
  },
  {
    key: 'laundry',
    order: 70,
    emoji: '🧺',
    labelKey: 'spaces.laundry',
    subtitleKey: 'spaces.laundry.subtitle',
    idPrefix: 'LR',
    supportsFloorType: true,
    supportsFloorLevel: true,
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateLaundry,
  },
  // === EXTERIOR / SEMI-EXTERIOR AREAS ===
  {
    key: 'garage',
    order: 75,
    emoji: '🚗',
    labelKey: 'spaces.garage',
    subtitleKey: 'spaces.garage.subtitle',
    idPrefix: 'GR',
    supportsFloorType: false,   // Concrete only
    supportsFloorLevel: false,  // Always ground level
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gateGarage,
  },
  {
    key: 'patio',
    order: 80,
    emoji: '🌿',
    labelKey: 'spaces.patio',
    subtitleKey: 'spaces.patio.subtitle',
    idPrefix: 'PT',
    supportsFloorType: true,    // Tile/Concrete/Deck
    supportsFloorLevel: true,   // Balcony can be on any floor
    supportsCollapse: true,
    isMultiEntry: false,
    gatingFn: gatePatio,
  },
];

// ============= HELPER FUNCTIONS =============

/** Get area definition by key */
export function getAreaDefinition(key: ServiceAreaKey): ServiceAreaDefinition | undefined {
  return HOME_MAPPING_REGISTRY.find(a => a.key === key);
}

/** Get visible areas based on context (returns sorted by order) */
export function getVisibleAreas(context: AreaGatingContext): ServiceAreaDefinition[] {
  return HOME_MAPPING_REGISTRY
    .filter(area => area.gatingFn(context))
    .sort((a, b) => a.order - b.order);
}

/** Get all area keys */
export function getAllAreaKeys(): ServiceAreaKey[] {
  return HOME_MAPPING_REGISTRY.map(a => a.key);
}

/** Get tracking code prefix for an area */
export function getAreaPrefix(key: ServiceAreaKey): string {
  return getAreaDefinition(key)?.idPrefix || 'XX';
}

// ============= DEV-ONLY VALIDATION =============

/** DEV-only validation (call once on mount in development) */
export function validateRegistry(): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  
  const keys = new Set<string>();
  const orders = new Set<number>();
  const prefixes = new Set<string>();
  let hasErrors = false;
  
  HOME_MAPPING_REGISTRY.forEach(area => {
    // Check for duplicate keys
    if (keys.has(area.key)) {
      console.warn(`[homeMappingRegistry] Duplicate key: ${area.key}`);
      hasErrors = true;
    }
    keys.add(area.key);
    
    // Check for duplicate orders
    if (orders.has(area.order)) {
      console.warn(`[homeMappingRegistry] Duplicate order: ${area.order}`);
      hasErrors = true;
    }
    orders.add(area.order);
    
    // Check for duplicate prefixes
    if (prefixes.has(area.idPrefix)) {
      console.warn(`[homeMappingRegistry] Duplicate idPrefix: ${area.idPrefix}`);
      hasErrors = true;
    }
    prefixes.add(area.idPrefix);
    
    // Check required fields
    if (!area.labelKey) {
      console.warn(`[homeMappingRegistry] Missing labelKey for: ${area.key}`);
      hasErrors = true;
    }
    if (!area.emoji) {
      console.warn(`[homeMappingRegistry] Missing emoji for: ${area.key}`);
      hasErrors = true;
    }
  });
  
}
