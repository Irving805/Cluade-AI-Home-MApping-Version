/**
 * Bathroom Presets Engine — Generator + Sync Functions
 * 
 * This module handles the creation and synchronization of bathroom inventory
 * with the legacy count fields (masterBaths, fullBaths, halfBaths).
 * 
 * PRINCIPLE: Presets only apply when isCustomized = false
 * Floor assignment tracked separately via floorCustomized
 */

import type { Situation } from '@/contexts/BookingContext';
import type { 
  BathroomUnit, 
  BathroomType, 
  BathroomInventory,
  BathroomCondition,
  BathroomLogistics,
} from './bathroomMappingTypes';
import { DEFAULT_BATHROOM_UNIT_BY_TYPE } from './bathroomMappingTypes';
import type { FloorId } from './floorLocationTypes';
import { getFloorOptions, numberToFloorId } from './floorLocationTypes';

// ============= DEFAULT BATHROOM LOGISTICS =============

/**
 * Default logistics configuration - all "none" / baseline
 * These are operational-only fields that affect TIME, not price
 */
export const DEFAULT_BATHROOM_LOGISTICS: BathroomLogistics = {
  toiletScale: 'none',
  tubScale: 'none',
  showerDoorScale: 'none',
  cabinetInterior: 'no',
  mirrorCount: 1,
  notes: undefined,
  extraMinutesManual: undefined,
};

/**
 * MOVING flow defaults - slightly elevated expectations
 * Only applied when creating new bathrooms, NOT when logisticsCustomized = true
 */
export const MOVING_LOGISTICS_DEFAULTS: Partial<BathroomLogistics> = {
  toiletScale: 'light',
  tubScale: 'soap',
};

/**
 * Get initial logistics for a bathroom based on situation
 * Only applies MOVING defaults if not already customized
 */
export function getInitialLogistics(
  situation: Situation,
  existingLogistics?: BathroomLogistics,
  logisticsCustomized?: boolean
): BathroomLogistics {
  // If already customized, keep existing
  if (logisticsCustomized && existingLogistics) {
    return existingLogistics;
  }
  
  const base = { ...DEFAULT_BATHROOM_LOGISTICS };
  
  // Apply situation-specific defaults
  if (situation === 'MOVING') {
    return { ...base, ...MOVING_LOGISTICS_DEFAULTS };
  }
  
  return base;
}

// ============= PRESET CONFIGURATIONS =============

/**
 * Situation-specific preset overrides
 * MOVING = expect more buildup (previous occupants left residue)
 * LIVE_HERE = standard conditions
 */
const SITUATION_PRESETS: Record<Situation, Partial<BathroomUnit>> = {
  LIVE_HERE: {
    condition: 'standard' as BathroomCondition,
  },
  MOVING: {
    condition: 'standard' as BathroomCondition,  // Standard condition by default for move-in/out
    tileLevel: 'normal',
  },
  HOURLY: {
    condition: 'standard' as BathroomCondition,  // Hourly sessions use standard condition
  },
  SPECIFIC_AREAS: {
    condition: 'standard' as BathroomCondition,
  },
  COMMERCIAL: {
    condition: 'standard' as BathroomCondition,
  },
  RENOVATION: {
    condition: 'severe' as BathroomCondition,  // Post-construction often has heavy buildup
    tileLevel: 'heavy',
  },
};

// ============= SMART FLOOR DEFAULTS =============

/**
 * Get smart floor default for bathroom type
 * Master (ensuite) → Floor 2 for multi-floor homes (typical upstairs primary suite)
 * Others → Floor 1
 */
function getSmartFloorDefault(type: BathroomType, propertyFloors: number): FloorId {
  if (propertyFloors >= 2 && type === 'master') {
    return 'FLOOR_2';  // Master ensuite typically upstairs
  }
  return 'FLOOR_1';
}

// ============= GENERATOR FUNCTIONS =============

/**
 * Generate a single bathroom unit with situation-aware presets
 * Exported for use by marginal delta calculations in bathroomPricing
 */
export function createBathroomUnit(
  type: BathroomType,
  index: number,
  situation: Situation,
  propertyFloors: number = 1
): BathroomUnit {
  const baseConfig = DEFAULT_BATHROOM_UNIT_BY_TYPE[type];
  const situationPresets = situation ? SITUATION_PRESETS[situation] : {};
  
  // Half baths always stay 'standard' condition (just toilet + sink)
  const conditionOverride = type === 'half' ? 'standard' : situationPresets.condition;
  
  // Smart floor default based on bathroom type
  const floorId = getSmartFloorDefault(type, propertyFloors);
  
  // Initialize logistics based on situation
  const logistics = getInitialLogistics(situation);
  
  return {
    id: `bath_${type}_${index}`,
    ...baseConfig,
    condition: conditionOverride || baseConfig.condition,
    tileLevel: situationPresets.tileLevel || baseConfig.tileLevel,
    floorId,
    floorCustomized: false,
    isCustomized: false,
    logistics,
    logisticsCustomized: false,
  };
}

/**
 * Generate default bathroom inventory from counts
 * Only applies presets when isCustomized = false
 */
export function generateDefaultBathroomInventory(
  masterBaths: number,
  fullBaths: number,
  halfBaths: number,
  situation: Situation,
  propertyFloors: number = 1
): BathroomInventory {
  const bathrooms: BathroomUnit[] = [];
  
  // Generate master baths
  for (let i = 0; i < masterBaths; i++) {
    bathrooms.push(createBathroomUnit('master', i, situation, propertyFloors));
  }
  
  // Generate full baths
  for (let i = 0; i < fullBaths; i++) {
    bathrooms.push(createBathroomUnit('full', i, situation, propertyFloors));
  }
  
  // Generate half baths
  for (let i = 0; i < halfBaths; i++) {
    bathrooms.push(createBathroomUnit('half', i, situation, propertyFloors));
  }
  
  return { version: 1, bathrooms };
}

// ============= SYNC FUNCTIONS =============

/**
 * Adjust bathroom units of a specific type while preserving customized ones
 * Returns new array of units for that type
 */
function adjustBathroomType(
  existingBathrooms: BathroomUnit[],
  type: BathroomType,
  targetCount: number,
  situation: Situation,
  propertyFloors: number = 1
): BathroomUnit[] {
  // Get existing bathrooms of this type
  const typeUnits = existingBathrooms.filter(b => b.type === type);
  const currentCount = typeUnits.length;
  
  if (targetCount === currentCount) {
    // No change needed
    return typeUnits;
  }
  
  if (targetCount > currentCount) {
    // Need to add more - keep existing, add new with defaults
    const newUnits: BathroomUnit[] = [];
    for (let i = currentCount; i < targetCount; i++) {
      newUnits.push(createBathroomUnit(type, i, situation, propertyFloors));
    }
    return [...typeUnits, ...newUnits];
  }
  
  // Need to remove some - prioritize keeping customized ones
  const sorted = [...typeUnits].sort((a, b) => {
    // Keep customized units first (they won't be removed)
    if (a.isCustomized && !b.isCustomized) return -1;
    if (!a.isCustomized && b.isCustomized) return 1;
    // Then sort by index (higher index = newer = remove first)
    const aIdx = parseInt(a.id.split('_').pop() || '0');
    const bIdx = parseInt(b.id.split('_').pop() || '0');
    return aIdx - bIdx;
  });
  
  // Keep only targetCount units
  return sorted.slice(0, targetCount);
}

/**
 * Validate/remap bathroom floors when property floors change
 * If floorId is now invalid (e.g., was FLOOR_2 but now only 1 floor):
 * - Remap to FLOOR_1
 * - Track original floor in floorRemappedFrom for UI visibility
 * - Keep floorCustomized=true to indicate it was user-set
 */
export function validateBathroomFloors(
  inventory: BathroomInventory,
  propertyFloors: number
): BathroomInventory {
  const validFloors = getFloorOptions(propertyFloors);
  
  return {
    ...inventory,
    bathrooms: inventory.bathrooms.map(unit => {
      // If current floorId is not in valid options, remap
      if (!validFloors.includes(unit.floorId)) {
        return {
          ...unit,
          floorRemappedFrom: unit.floorId,  // Track where it came from for UI
          floorId: 'FLOOR_1',
          // Keep floorCustomized so user knows something changed
        };
      }
      // Clear remap flag if floor is now valid again
      if (unit.floorRemappedFrom && validFloors.includes(unit.floorId)) {
        const { floorRemappedFrom, ...rest } = unit;
        return rest;
      }
      return unit;
    }),
  };
}

/**
 * Sync inventory with count changes
 * Adds/removes units while preserving customized ones
 * 
 * ID STABILITY: IDs are assigned once on creation and NEVER reindexed
 * This ensures payload fields (bath_0_*, bath_1_*) remain stable across count changes
 */
export function syncInventoryWithCounts(
  inventory: BathroomInventory | undefined,
  masterBaths: number,
  fullBaths: number,
  halfBaths: number,
  situation: Situation,
  propertyFloors: number = 1
): BathroomInventory {
  // If no existing inventory, generate fresh
  if (!inventory || !inventory.bathrooms) {
    return generateDefaultBathroomInventory(masterBaths, fullBaths, halfBaths, situation, propertyFloors);
  }
  
  // Adjust each type while preserving customized units
  // IDs remain stable - no reindexing
  const updatedBathrooms = [
    ...adjustBathroomType(inventory.bathrooms, 'master', masterBaths, situation, propertyFloors),
    ...adjustBathroomType(inventory.bathrooms, 'full', fullBaths, situation, propertyFloors),
    ...adjustBathroomType(inventory.bathrooms, 'half', halfBaths, situation, propertyFloors),
  ];
  
  // NO reindexing - IDs are stable from creation
  // Validate floors (in case propertyFloors changed)
  return validateBathroomFloors({ version: inventory.version, bathrooms: updatedBathrooms }, propertyFloors);
}

/**
 * Reindex bathroom IDs to be sequential after add/remove operations
 */
function reindexBathrooms(bathrooms: BathroomUnit[]): BathroomUnit[] {
  const counters: Record<BathroomType, number> = { master: 0, full: 0, half: 0 };
  
  return bathrooms.map(unit => ({
    ...unit,
    id: `bath_${unit.type}_${counters[unit.type]++}`,
  }));
}

/**
 * Update a single bathroom unit in the inventory
 * Sets isCustomized = true when user modifies config
 * Sets floorCustomized = true when user changes floor
 */
export function updateBathroomUnit(
  inventory: BathroomInventory,
  unitId: string,
  updates: Partial<BathroomUnit>
): BathroomInventory {
  return {
    ...inventory,
    bathrooms: inventory.bathrooms.map(unit => {
      if (unit.id !== unitId) return unit;
      
      // Determine what flags to set
      const isFloorChange = updates.floorId !== undefined && updates.floorId !== unit.floorId;
      
      return {
        ...unit,
        ...updates,
        isCustomized: true,  // Any change marks as customized
        floorCustomized: isFloorChange ? true : unit.floorCustomized,  // Only set if floor changed
      };
    }),
  };
}

/**
 * Get inventory counts (for syncing with legacy fields)
 */
export function getInventoryCounts(inventory: BathroomInventory | undefined): {
  masterBaths: number;
  fullBaths: number;
  halfBaths: number;
  total: number;
} {
  if (!inventory || !inventory.bathrooms) {
    return { masterBaths: 0, fullBaths: 0, halfBaths: 0, total: 0 };
  }
  
  const counts = {
    masterBaths: inventory.bathrooms.filter(b => b.type === 'master').length,
    fullBaths: inventory.bathrooms.filter(b => b.type === 'full').length,
    halfBaths: inventory.bathrooms.filter(b => b.type === 'half').length,
  };
  
  return {
    ...counts,
    total: counts.masterBaths + counts.fullBaths + counts.halfBaths,
  };
}

/**
 * Check if inventory has any customized bathrooms
 */
export function hasCustomizedBathrooms(inventory: BathroomInventory | undefined): boolean {
  if (!inventory || !inventory.bathrooms) return false;
  return inventory.bathrooms.some(b => b.isCustomized);
}

/**
 * Format bathroom unit summary for display (includes floor if multi-floor)
 */
export function formatBathroomUnitSummary(unit: BathroomUnit, includeFloor: boolean = false): string {
  const parts: string[] = [];
  
  // Type label
  const typeLabels: Record<BathroomType, string> = {
    master: 'Master',
    full: 'Full',
    half: 'Half',
  };
  parts.push(typeLabels[unit.type]);
  
  // Floor (if multi-floor and requested)
  if (includeFloor && unit.floorId) {
    const floorNum = unit.floorId.replace('FLOOR_', 'F');
    parts.push(floorNum);
  }
  
  // Key features
  if (unit.fixtures !== 'none') {
    const fixtureLabels: Record<string, string> = {
      shower: 'Shower',
      tub: 'Tub',
      shower_tub: 'Tub+Shower',
    };
    parts.push(fixtureLabels[unit.fixtures] || '');
  }
  
  if (unit.vanity === 'double') parts.push('Dbl Vanity');
  if (unit.glass === 'heavy') parts.push('Heavy Glass');
  if (unit.condition !== 'standard') {
    parts.push(unit.condition === 'buildup' ? 'Buildup' : 'Severe');
  }
  
  return parts.filter(Boolean).join(' • ');
}

/**
 * Build floor-grouped summary for crew (language-neutral)
 */
export function buildBathroomsByFloorSummary(inventory: BathroomInventory | undefined): string {
  if (!inventory?.bathrooms || inventory.bathrooms.length === 0) return '';
  
  // Group by floor
  const byFloor: Record<FloorId, BathroomUnit[]> = {} as Record<FloorId, BathroomUnit[]>;
  inventory.bathrooms.forEach(unit => {
    if (!byFloor[unit.floorId]) byFloor[unit.floorId] = [];
    byFloor[unit.floorId].push(unit);
  });
  
  // Build summary string
  const parts = Object.entries(byFloor).map(([floor, units]) => {
    const floorLabel = floor.replace('FLOOR_', 'F');
    const types = units.map(u => {
      const typeLabel = u.type.charAt(0).toUpperCase() + u.type.slice(1);
      return u.condition !== 'standard' ? `${typeLabel} (${u.condition})` : typeLabel;
    }).join(', ');
    return `${floorLabel}: ${types}`;
  });
  
  return parts.join(' | ');
}
