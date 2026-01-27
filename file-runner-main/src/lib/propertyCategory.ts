/**
 * Property Category Module — Single Source of Truth
 * 
 * This module centralizes all property type detection and area gating logic.
 * Used by visibility.ts, homeMappingRegistry.ts, and UI components to ensure
 * consistent behavior across the entire application.
 * 
 * PRINCIPLE: "One brain" for property intelligence — no duplicate logic elsewhere.
 */

import type { HomeEntryConfig } from '@/contexts/BookingContext';
import { normalizePropertyType, type NormalizedPropertyType } from './homeMappingTypes';
import { getSqftMidpoint } from './hourlyLogic';

// ============= CORE TYPES =============

export type PropertyCategory = 'SFH_TOWNHOUSE' | 'APARTMENT_CONDO' | 'STUDIO';

export interface PropertyContext {
  category: PropertyCategory;
  levels: number;                    // 1+ floors (houses: houseLevels, apartments: apartmentUnitLevels)
  isMultiLevel: boolean;             // true if levels > 1
  bedroomCount: number;
  sqftMidpoint: number;              // Numeric sqft for comparisons
  hasElevator: boolean;              // Apartment only
  unitFloor: number | null;          // Apartment only: which floor is unit on
  normalizedType: NormalizedPropertyType;
}

export interface PropertyContextInput {
  homeSize?: number;
  propertyType?: string | null;
  houseLevels?: number;
  apartmentUnitLevels?: number;
  hasElevator?: boolean;
  apartmentFloor?: number;
  squareFootageRange?: string;
}

// ============= MAIN DETECTION FUNCTION =============

/**
 * Get complete property context from form data and home entry config.
 * This is THE source of truth for property category detection.
 */
export function getPropertyContext(
  homeEntry: HomeEntryConfig | undefined,
  formData: PropertyContextInput
): PropertyContext {
  const homeSize = formData.homeSize ?? 0;
  const sqftRange = formData.squareFootageRange || '';
  const sqftMidpoint = getSqftMidpoint(sqftRange);
  
  // Normalize property type from multiple sources
  const normalizedType = normalizePropertyType(formData.propertyType);
  
  // === CATEGORY DETECTION (Priority order) ===
  // STUDIO DETECTION: Single Source of Truth
  // - homeSize === 0 is ALWAYS studio, regardless of property type (house/apartment)
  // - Property type (house/apartment) affects OTHER gating (garage, etc.) but NOT studio detection
  let category: PropertyCategory;
  
  const isExplicitStudioSelection = normalizedType === 'studio';
  const isImpliedStudio = homeSize === 0;  // SSOT: 0 bedrooms = studio ALWAYS
  
  // 1. Studio detection: explicit selection OR implied by 0 bedrooms
  if (isExplicitStudioSelection || isImpliedStudio) {
    category = 'STUDIO';
  }
  // 2. Check homeEntry.propertyType (user selection in Home Entry section)
  else if (homeEntry?.propertyType === 'APARTMENT_CONDO_STUDIO') {
    category = 'APARTMENT_CONDO';
  }
  else if (homeEntry?.propertyType === 'SINGLE_FAMILY_TOWNHOUSE') {
    category = 'SFH_TOWNHOUSE';
  }
  // 3. Check normalized property type from formData
  else if (normalizedType === 'apartment' || normalizedType === 'condo') {
    category = 'APARTMENT_CONDO';
  }
  else if (normalizedType === 'single_family' || normalizedType === 'townhouse') {
    category = 'SFH_TOWNHOUSE';
  }
  // 4. Default to SFH/Townhouse (most common)
  else {
    category = 'SFH_TOWNHOUSE';
  }
  
  // === LEVELS DETECTION ===
  // For SFH/Townhouse: use houseLevels
  // For Apartment/Condo: use apartmentUnitLevels (loft/duplex/penthouse)
  // For Studio: always 1 level
  let levels: number;
  if (category === 'STUDIO') {
    levels = 1;
  } else if (category === 'APARTMENT_CONDO') {
    levels = formData.apartmentUnitLevels || 1;
  } else {
    levels = formData.houseLevels || 1;
  }
  
  return {
    category,
    levels,
    isMultiLevel: levels > 1,
    bedroomCount: homeSize,
    sqftMidpoint,
    hasElevator: formData.hasElevator ?? false,
    unitFloor: formData.apartmentFloor ?? null,
    normalizedType,
  };
}

// ============= CATEGORY HELPERS =============

export function isStudio(ctx: PropertyContext): boolean {
  return ctx.category === 'STUDIO';
}

/**
 * Check if property is a 1-bedroom home
 * Used for gating areas that don't apply to small 1BR layouts (dining, office)
 */
export function isOneBedroom(ctx: PropertyContext): boolean {
  return ctx.bedroomCount === 1;
}

export function isApartmentOrCondo(ctx: PropertyContext): boolean {
  return ctx.category === 'APARTMENT_CONDO';
}

export function isSFHOrTownhouse(ctx: PropertyContext): boolean {
  return ctx.category === 'SFH_TOWNHOUSE';
}

// ============= SSOT FLOOR HELPERS =============

/**
 * Get canonical property floors from formData
 * SSOT: All components must use this, not compute floors independently
 */
export function getCanonicalPropertyFloors(formData: PropertyContextInput): number {
  if (formData.propertyType === 'apartment') {
    return formData.apartmentUnitLevels || 1;
  }
  return formData.houseLevels || 1;
}

// ============= AREA CAPABILITY HELPERS =============
// These determine if a property CAN have an area (not if it DOES)

/**
 * Garage: SFH/Townhouse only (condos rarely have private garage)
 * NOTE: For condos, this returns false. If needed, add soft-gating toggle in UI.
 */
export function canHaveGarage(ctx: PropertyContext): boolean {
  return ctx.category === 'SFH_TOWNHOUSE';
}

/**
 * Mudroom: SFH/Townhouse only, with size requirements
 * - 2500+ sqft OR 3+ bedrooms
 */
export function canHaveMudroom(ctx: PropertyContext): boolean {
  if (ctx.category !== 'SFH_TOWNHOUSE') return false;
  return ctx.sqftMidpoint >= 2500 || ctx.bedroomCount >= 3;
}

/**
 * Hallways: Not for studio or standard apartments
 * - Studio: Never (open layout)
 * - Apartment: Only if 3+ beds OR multi-level unit
 * - SFH/Townhouse: If 2+ beds OR multi-level
 */
export function canHaveHallways(ctx: PropertyContext): boolean {
  if (ctx.category === 'STUDIO') return false;
  
  if (ctx.category === 'APARTMENT_CONDO') {
    // Large apartments (3+ beds) or multi-level units CAN have internal hallways
    return ctx.bedroomCount >= 3 || ctx.isMultiLevel;
  }
  
  // SFH/Townhouse: 2+ bedrooms or multi-floor
  return ctx.bedroomCount >= 2 || ctx.isMultiLevel;
}

/**
 * Stairs: Only for multi-level properties
 */
export function canHaveStairs(ctx: PropertyContext): boolean {
  return ctx.isMultiLevel;
}

/**
 * Den/Bonus Room: Not for studio, requires size
 * - Studio: Never
 * - Apartment: Only if multi-level unit AND 4+ beds OR 3000+ sqft
 * - SFH/Townhouse: 4+ beds OR 3000+ sqft
 */
export function canHaveDen(ctx: PropertyContext): boolean {
  if (ctx.category === 'STUDIO') return false;
  
  if (ctx.category === 'APARTMENT_CONDO') {
    // Standard apartments rarely have dens; only multi-level luxury units
    if (!ctx.isMultiLevel) return false;
    return ctx.bedroomCount >= 4 || ctx.sqftMidpoint >= 3000;
  }
  
  // SFH/Townhouse
  return ctx.bedroomCount >= 4 || ctx.sqftMidpoint >= 3000;
}

/**
 * Dining: Optional for studios and 1BR homes (usually combined with living)
 * 2+ bedroom properties can have separate dining
 */
export function canHaveDining(ctx: PropertyContext): boolean {
  // Studios rarely have separate dining areas
  if (ctx.category === 'STUDIO') return false;
  // 1BR homes typically have open living/dining layout
  if (ctx.bedroomCount === 1) return false;
  return true;
}

/**
 * Bedrooms: Only if bedroom count > 0
 */
export function canHaveBedrooms(ctx: PropertyContext): boolean {
  return ctx.bedroomCount > 0;
}

// ============= STUDIO-SPECIFIC HELPERS =============

/**
 * Studio Main Space: Only visible for studio properties
 * This is THE gating function — replaces living/dining/bedrooms for studios
 */
export function shouldShowStudioMainSpace(ctx: PropertyContext): boolean {
  return ctx.category === 'STUDIO';
}

/**
 * Standard Living: Hidden for studios (replaced by studio_main_space)
 */
export function canHaveSeparateLiving(ctx: PropertyContext): boolean {
  return ctx.category !== 'STUDIO';
}

// ============= LABEL HELPERS =============

export type OutdoorSpaceType = 'patio' | 'balcony';

/**
 * Get outdoor space type based on property category
 * - SFH/Townhouse: "Patio / Yard"
 * - Apartment/Condo/Studio: "Balcony"
 */
export function getOutdoorSpaceType(ctx: PropertyContext): OutdoorSpaceType {
  if (ctx.category === 'SFH_TOWNHOUSE') {
    return 'patio';
  }
  return 'balcony';
}

export type LivingLabelKey = 'core.living' | 'spaces.living_sleeping_zone';

/**
 * Get living room label key based on property category
 * - Studio: "Living / Sleeping Zone" (combined space)
 * - Others: "Living Room"
 */
export function getLivingLabelKey(ctx: PropertyContext): LivingLabelKey {
  if (ctx.category === 'STUDIO') {
    return 'spaces.living_sleeping_zone';
  }
  return 'core.living';
}

export type OutdoorLabelKey = 'spaces.patio' | 'spaces.balcony';

/**
 * Get outdoor space label key
 */
export function getOutdoorLabelKey(ctx: PropertyContext): OutdoorLabelKey {
  const type = getOutdoorSpaceType(ctx);
  return type === 'patio' ? 'spaces.patio' : 'spaces.balcony';
}

// ============= VISIBILITY REASON HELPERS =============

/**
 * Get the reason why an area is visible or hidden
 * Used for debugging and UI tooltips
 */
export function getAreaVisibilityReason(
  areaKey: string,
  ctx: PropertyContext,
  isVisible: boolean
): string {
  if (!isVisible) {
    switch (areaKey) {
      case 'bedrooms':
        return 'Studio - combined living/sleeping zone';
      case 'hallways':
        if (ctx.category === 'STUDIO') return 'Studio layout - no hallways';
        if (ctx.category === 'APARTMENT_CONDO') return 'Standard apartment - no internal hallways';
        return 'Small home with fewer than 2 bedrooms';
      case 'stairs':
        return 'Single-floor property';
      case 'garage':
        return 'Apartments typically no private garage';
      case 'mudroom':
        if (ctx.category !== 'SFH_TOWNHOUSE') return 'SFH/Townhouse only';
        return 'Home under 2500 sqft and fewer than 3 bedrooms';
      case 'den':
        if (ctx.category === 'STUDIO') return 'Studio - no den';
        if (ctx.category === 'APARTMENT_CONDO' && !ctx.isMultiLevel) return 'Standard apartment - no den';
        return 'Home under 3000 sqft and fewer than 4 bedrooms';
      case 'dining':
        return 'Studio - combined with living area';
      default:
        return 'Not applicable for this property type';
    }
  }
  
  // Visible reasons
  switch (areaKey) {
    case 'bedrooms':
      return `${ctx.bedroomCount} bedroom(s)`;
    case 'hallways':
      if (ctx.category === 'APARTMENT_CONDO') return 'Large/multi-level apartment may have hallways';
      return ctx.isMultiLevel ? 'Multi-floor home' : `${ctx.bedroomCount}+ bedroom home`;
    case 'stairs':
      return `${ctx.levels}-floor property`;
    case 'garage':
      return 'SFH/Townhouse property';
    case 'mudroom':
      return ctx.sqftMidpoint >= 2500 ? '2500+ sqft home' : '3+ bedroom home';
    case 'den':
      return ctx.sqftMidpoint >= 3000 ? '3000+ sqft home' : '4+ bedroom home';
    case 'patio':
      return ctx.category === 'SFH_TOWNHOUSE' ? 'Patio/Yard' : 'Balcony';
    default:
      return 'Always shown';
  }
}

// ============= SOFT GATING HELPERS =============

/**
 * Check if an area should be "soft gated" (shown with "if applicable" note)
 * vs strictly hidden
 */
export function shouldSoftGate(areaKey: string, ctx: PropertyContext): boolean {
  switch (areaKey) {
    case 'hallways':
      // Large apartments: soft gate (they might have internal hallways)
      if (ctx.category === 'APARTMENT_CONDO' && (ctx.bedroomCount >= 3 || ctx.isMultiLevel)) {
        return true;
      }
      return false;
    case 'den':
      // Multi-level apartments: soft gate
      if (ctx.category === 'APARTMENT_CONDO' && ctx.isMultiLevel) {
        return true;
      }
      return false;
    default:
      return false;
  }
}

// ============= DEBUG HELPER =============

/**
 * Log property context for debugging (dev only)
 */
export function debugPropertyContext(ctx: PropertyContext, label?: string): void {
  if (typeof window !== 'undefined' && (window as any).__DEBUG_PROPERTY_CONTEXT__) {
    console.log(`[PropertyContext${label ? ` - ${label}` : ''}]`, {
      category: ctx.category,
      levels: ctx.levels,
      isMultiLevel: ctx.isMultiLevel,
      bedroomCount: ctx.bedroomCount,
      sqftMidpoint: ctx.sqftMidpoint,
      normalizedType: ctx.normalizedType,
      capabilities: {
        garage: canHaveGarage(ctx),
        mudroom: canHaveMudroom(ctx),
        hallways: canHaveHallways(ctx),
        stairs: canHaveStairs(ctx),
        den: canHaveDen(ctx),
        dining: canHaveDining(ctx),
      },
    });
  }
}
