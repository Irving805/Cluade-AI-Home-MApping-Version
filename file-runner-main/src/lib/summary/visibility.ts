/**
 * Visibility Engine — Single Source of Truth for Gating
 * 
 * Computes which areas are visible based on:
 * - Property category (SFH/Townhouse, Apartment/Condo, Studio)
 * - Property levels (multi-floor detection)
 * - Bedroom count and square footage
 * 
 * IMPORTANT: This module delegates to propertyCategory.ts for all detection logic.
 * Do NOT duplicate property detection here — use the centralized helpers.
 */

import type { BookingFormData, Situation, HomeEntryConfig } from '@/contexts/BookingContext';
import type { VisibilityResult, ServiceAreaKey, AreaVisibility } from './types';
import {
  getPropertyContext,
  isStudio,
  isOneBedroom,
  isApartmentOrCondo,
  isSFHOrTownhouse,
  canHaveGarage,
  canHaveMudroom,
  canHaveHallways,
  canHaveStairs,
  canHaveDen,
  canHaveDining,
  canHaveBedrooms,
  canHaveSeparateLiving,
  shouldShowStudioMainSpace,
  getAreaVisibilityReason,
  shouldSoftGate,
  debugPropertyContext,
} from '@/lib/propertyCategory';

// ============= MAIN VISIBILITY FUNCTION =============

/**
 * Compute visibility for all service areas.
 * This is THE source of truth for what shows/hides in UI.
 * 
 * Uses propertyCategory.ts for all detection logic.
 */
export function computeVisibility(
  formData: BookingFormData,
  situation: Situation,
  homeEntry: HomeEntryConfig | undefined
): VisibilityResult {
  const areas: Record<ServiceAreaKey, AreaVisibility> = {} as Record<ServiceAreaKey, AreaVisibility>;
  
  // === GET PROPERTY CONTEXT (Single Source of Truth) ===
  const ctx = getPropertyContext(homeEntry, {
    homeSize: formData.homeSize,
    propertyType: formData.propertyType,
    houseLevels: formData.houseLevels,
    apartmentUnitLevels: formData.apartmentUnitLevels,
    hasElevator: formData.hasElevator,
    apartmentFloor: formData.apartmentFloor,
    squareFootageRange: formData.squareFootageRange,
  });
  
  // Debug logging (enable with window.__DEBUG_PROPERTY_CONTEXT__ = true)
  debugPropertyContext(ctx, 'visibility.computeVisibility');
  
  // === CORE AREAS (Always visible for residential) ===
  areas.homeEntry = { visible: true, reason: 'Always shown for residential' };
  areas.kitchen = { visible: true, reason: 'Always shown' };
  
  // === LIVING (Hidden for Studio - replaced by studioMainSpace) ===
  const showLiving = canHaveSeparateLiving(ctx);
  areas.living = {
    visible: showLiving,
    reason: isStudio(ctx) 
      ? 'Studio - replaced by Studio Main Space' 
      : 'Always shown for non-studio',
  };
  
  // === STUDIO MAIN SPACE (Only for Studios) ===
  const showStudioMainSpace = shouldShowStudioMainSpace(ctx);
  areas.studioMainSpace = {
    visible: showStudioMainSpace,
    reason: showStudioMainSpace 
      ? 'Studio combined living/sleeping/dining zone'
      : 'Not a studio property',
  };
  
  areas.bathrooms = { visible: true, reason: 'Always shown' };
  areas.windows = { visible: true, reason: 'Always shown' };
  areas.addons = { visible: true, reason: 'Always shown' };
  areas.microServices = { visible: true, reason: 'Always shown' };
  
  // === DINING (Hidden for Studio) ===
  const showDining = canHaveDining(ctx);
  areas.dining = {
    visible: showDining,
    reason: getAreaVisibilityReason('dining', ctx, showDining),
  };
  
  // === BEDROOMS (Hidden for Studio) ===
  const showBedrooms = canHaveBedrooms(ctx);
  areas.bedrooms = {
    visible: showBedrooms,
    reason: getAreaVisibilityReason('bedrooms', ctx, showBedrooms),
  };
  
  // === HALLWAYS (Hidden for Studio, conditional for Apartments) ===
  const showHallways = canHaveHallways(ctx);
  areas.hallways = {
    visible: showHallways,
    reason: getAreaVisibilityReason('hallways', ctx, showHallways),
    softGate: shouldSoftGate('hallways', ctx),
  };
  
  // === STAIRS (Only for multi-floor properties) ===
  const showStairs = canHaveStairs(ctx);
  areas.stairs = {
    visible: showStairs,
    reason: getAreaVisibilityReason('stairs', ctx, showStairs),
  };
  
  // === UTILITY AREAS ===
  // Office: Available for non-studio AND non-1BR residential only
  const showOffice = !isStudio(ctx) && !isOneBedroom(ctx);
  areas.office = { 
    visible: showOffice,
    reason: isStudio(ctx) 
      ? 'Studio - workspace included in main space' 
      : isOneBedroom(ctx)
        ? '1BR - workspace included in living/bedroom'
        : 'Office available for 2+ bedroom homes',
  };
  
  // Laundry: Always available (closet or room)
  areas.laundry = { visible: true, reason: 'Laundry always available' };
  
  // === GARAGE (SFH/Townhouse only) ===
  const showGarage = canHaveGarage(ctx);
  areas.garage = { 
    visible: showGarage,
    reason: getAreaVisibilityReason('garage', ctx, showGarage),
  };
  
  // === PATIO/BALCONY (Always available, label varies) ===
  // For apartments: "Balcony", for houses: "Patio/Yard"
  areas.patio = { 
    visible: true, 
    reason: getAreaVisibilityReason('patio', ctx, true),
  };
  
  // === MUDROOM (SFH/Townhouse, size requirements) ===
  const showMudroom = canHaveMudroom(ctx);
  areas.mudroom = { 
    visible: showMudroom, 
    reason: getAreaVisibilityReason('mudroom', ctx, showMudroom),
  };
  
  // === DEN/BONUS ROOM (Size requirements, never for studio) ===
  const showDen = canHaveDen(ctx);
  areas.den = { 
    visible: showDen, 
    reason: getAreaVisibilityReason('den', ctx, showDen),
    softGate: shouldSoftGate('den', ctx),
  };
  
  // === ADDITIONAL STRUCTURES (Compound/Estate only) ===
  // These remain sqft-gated for large properties
  const sqftEligible = ctx.sqftMidpoint >= 2000;
  const bedroomsEligible = ctx.bedroomCount >= 2;
  const structuresEligible = sqftEligible && bedroomsEligible && isSFHOrTownhouse(ctx);
  
  const structureReason = !isSFHOrTownhouse(ctx)
    ? 'SFH/Townhouse only'
    : !sqftEligible 
      ? 'Property under 2000 sqft' 
      : 'Less than 2 bedrooms';
  
  areas.guestHouses = { 
    visible: structuresEligible, 
    reason: structuresEligible ? '2000+ sqft compound-scale property' : structureReason,
  };
  areas.artStudios = { 
    visible: structuresEligible, 
    reason: structuresEligible ? '2000+ sqft compound-scale property' : structureReason,
  };
  areas.poolHouses = { 
    visible: structuresEligible, 
    reason: structuresEligible ? '2000+ sqft compound-scale property' : structureReason,
  };
  
  // === AGGREGATE FLAGS ===
  const showStructures = structuresEligible;
  const showPremiumSpaces = areas.mudroom.visible || areas.den.visible;
  const showUtilityAreas = areas.office.visible || areas.laundry.visible || 
                           areas.garage.visible || areas.patio.visible;
  const showEntryZone = true; // Entry zone always in Home Entry
  
  return {
    areas,
    showStructures,
    showHallways: areas.hallways.visible,
    showStairs: areas.stairs.visible,
    showPremiumSpaces,
    showUtilityAreas,
    showEntryZone,
    showStudioMainSpace: showStudioMainSpace,
    isStudio: isStudio(ctx),
    isOneBedroom: isOneBedroom(ctx),
    isMultiFloor: ctx.isMultiLevel,
  };
}

/**
 * Check if a specific area should contribute to pricing
 * Use this when calculating totals to respect visibility
 */
export function isAreaPriceable(
  areaKey: ServiceAreaKey,
  visibility: VisibilityResult
): boolean {
  return visibility.areas[areaKey]?.visible ?? false;
}
