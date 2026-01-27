/**
 * Mapped Spaces Selector — SSOT for area visibility across all surfaces
 * 
 * This module determines which areas are truly "mapped" (visible to user)
 * by combining:
 *   1. Property eligibility (from homeMappingRegistry gating functions)
 *   2. User enablement (from homeMapping.areas.[key].enabled toggle)
 * 
 * PRINCIPLE: Core areas are always mapped if eligible.
 *            Utility/Premium areas require explicit user enablement.
 * 
 * CONSUMERS:
 *   - SidebarContractSection (Detailed Home Mapping list)
 *   - UnifiedSpacesSection (Main flow mapping)
 *   - Any future "mapped areas" displays
 */

import { BookingFormData } from '@/contexts/BookingContext';
import { 
  getVisibleAreas, 
  AreaGatingContext, 
  ServiceAreaKey,
  ServiceAreaDefinition 
} from './homeMappingRegistry';

// ============= AREA CLASSIFICATION =============

/**
 * Core areas: Always mapped if property-eligible
 * These are fundamental spaces that every home has
 */
const CORE_AREA_KEYS: Set<ServiceAreaKey> = new Set([
  'home_entry',
  'kitchen',
  'living',
  'studio_main_space',
  'dining',
  'bedrooms',
]);

/**
 * Connector areas: Always mapped if property-eligible
 * These connect other areas and are essential for multi-floor homes
 */
const CONNECTOR_AREA_KEYS: Set<ServiceAreaKey> = new Set([
  'hallways',
  'stairs',
]);

/**
 * Utility areas: Require explicit user enablement
 * These are optional spaces that not every home uses
 */
const UTILITY_AREA_KEYS: Set<ServiceAreaKey> = new Set([
  'office',
  'laundry',
  'garage',
  'patio',
]);

/**
 * Premium areas: Require explicit user enablement
 * These are specialty spaces in larger homes
 */
const PREMIUM_AREA_KEYS: Set<ServiceAreaKey> = new Set([
  'mudroom',
  'den',
]);

// ============= HELPER FUNCTIONS =============

/**
 * Check if an area is a core or connector area (always mapped if eligible)
 */
export function isCoreOrConnectorArea(key: ServiceAreaKey): boolean {
  return CORE_AREA_KEYS.has(key) || CONNECTOR_AREA_KEYS.has(key);
}

/**
 * Check if an area requires user enablement
 */
export function requiresEnablement(key: ServiceAreaKey): boolean {
  return UTILITY_AREA_KEYS.has(key) || PREMIUM_AREA_KEYS.has(key);
}

/**
 * Get the enabled state for an area from formData
 * Returns true for core/connector areas (always enabled if eligible)
 * Returns the actual enabled state for utility/premium areas
 */
export function isAreaEnabled(
  key: ServiceAreaKey, 
  formData: BookingFormData
): boolean {
  // Core and connector areas are always "enabled" if eligible
  if (isCoreOrConnectorArea(key)) {
    return true;
  }
  
  // For utility/premium areas, check the homeMapping.areas.[key].enabled flag
  const areas = formData.homeMapping?.areas;
  if (!areas) return false;
  
  switch (key) {
    case 'office':
      return areas.office?.enabled === true;
    case 'laundry':
      return areas.laundry?.enabled === true;
    case 'garage':
      return areas.garage?.enabled === true;
    case 'patio':
      return areas.patio?.enabled === true;
    case 'mudroom':
      return areas.mudroom?.enabled === true;
    case 'den':
      return areas.den?.enabled === true;
    default:
      return false;
  }
}

// ============= MAIN SELECTOR =============

export interface MappedSpace {
  key: ServiceAreaKey;
  definition: ServiceAreaDefinition;
  isMapped: boolean;
  isEligible: boolean;
  isEnabled: boolean;
  category: 'core' | 'connector' | 'utility' | 'premium';
}

/**
 * Get all mapped spaces for the current booking context
 * 
 * SSOT: This is the single source of truth for what areas should appear
 * in the sidebar, main flow, and any other "mapped areas" displays.
 * 
 * @param formData - Current booking form data
 * @param context - Area gating context (property type, situation, etc.)
 * @returns Array of MappedSpace objects for areas that should be displayed
 */
export function getMappedSpaces(
  formData: BookingFormData,
  context: AreaGatingContext
): MappedSpace[] {
  // Get all eligible areas from the registry
  const eligibleAreas = getVisibleAreas(context);
  
  // Map each eligible area to a MappedSpace with enabled check
  return eligibleAreas.map(definition => {
    const key = definition.key;
    const isEnabled = isAreaEnabled(key, formData);
    
    // Determine category
    let category: MappedSpace['category'] = 'core';
    if (CONNECTOR_AREA_KEYS.has(key)) category = 'connector';
    else if (UTILITY_AREA_KEYS.has(key)) category = 'utility';
    else if (PREMIUM_AREA_KEYS.has(key)) category = 'premium';
    
    // An area is "mapped" if it's eligible AND enabled
    const isMapped = isEnabled;
    
    return {
      key,
      definition,
      isMapped,
      isEligible: true, // All items in this list are eligible (from getVisibleAreas)
      isEnabled,
      category,
    };
  });
}

/**
 * Get only the mapped (visible) area keys
 * Convenience helper for components that just need the keys
 */
export function getMappedAreaKeys(
  formData: BookingFormData,
  context: AreaGatingContext
): ServiceAreaKey[] {
  return getMappedSpaces(formData, context)
    .filter(space => space.isMapped)
    .map(space => space.key);
}

/**
 * Get mapped spaces filtered to only those that are actually mapped (visible)
 * Use this for rendering lists where only mapped areas should appear
 */
export function getVisibleMappedSpaces(
  formData: BookingFormData,
  context: AreaGatingContext
): MappedSpace[] {
  return getMappedSpaces(formData, context).filter(space => space.isMapped);
}

/**
 * Get the ServiceAreaDefinition objects for mapped areas only
 * Matches the return type of getVisibleAreas for easy substitution
 */
export function getMappedAreaDefinitions(
  formData: BookingFormData,
  context: AreaGatingContext
): ServiceAreaDefinition[] {
  return getVisibleMappedSpaces(formData, context).map(space => space.definition);
}
