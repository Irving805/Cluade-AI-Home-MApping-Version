// ============ COMPONENT-BASED PRICING ENGINE V2 ============
// This module implements a modular pricing system where:
// - BASE price is determined by number of bedrooms (home size)
// - BATHROOM prices are added as separate modules
// - CABINET pricing scales with number of bathrooms

export type ServiceLevel = 'std' | 'deep';

// === FLOOR TYPE DEFINITIONS ===
export type RoomFloorType = 'hardwood_tile' | 'carpet' | 'mixed';

// === FLOOR TYPE LABOR MULTIPLIERS ===
// Carpet requires more labor (vacuum + spot treatment vs mop/sweep)
export const FLOOR_TYPE_LABOR_MULTIPLIER: Record<RoomFloorType, number> = {
  hardwood_tile: 1.0,   // Base time - mop/sweep
  carpet: 1.15,         // +15% - vacuum + edge work + spot treatment
  mixed: 1.08,          // +8% - switching between tools
};

/**
 * Calculate floor-type-adjusted labor time for a space
 * @param baseMinutes - Base labor time for the space
 * @param floorType - The floor type selected for this space
 * @returns Adjusted labor time in minutes
 */
export function calculateFloorAdjustedTime(
  baseMinutes: number,
  floorType: RoomFloorType = 'hardwood_tile'
): number {
  return Math.round(baseMinutes * FLOOR_TYPE_LABOR_MULTIPLIER[floorType]);
}

// === HOME BASE RATES ===
// Base pricing by bedroom count (indexed 0-5 for Studio through 5 Bed)
export const HOME_BASE_RATES: Record<number, { std: number; deep: number }> = {
  0: { std: 105, deep: 205 },  // Studio
  1: { std: 125, deep: 245 },  // 1 Bed
  2: { std: 150, deep: 280 },  // 2 Bed
  3: { std: 175, deep: 320 },  // 3 Bed
  4: { std: 195, deep: 355 },  // 4 Bed
  5: { std: 220, deep: 395 },  // 5 Bed
  6: { std: 245, deep: 435 },  // 6+ Bed
};

// === BEDROOM SKIP RATES ===
// Price and time credit for each bedroom type when skipped
// South Coast Logic: Allow clients to skip unused/storage bedrooms
export const BEDROOM_SKIP_RATES = {
  master: { std: 25, deep: 45, timeStd: 35, timeDeep: 45 },
  standard: { std: 20, deep: 35, timeStd: 25, timeDeep: 35 },
} as const;

// === HOME BASE TIME (Hours) ===
// Estimated labor hours by bedroom count for Standard / Deep cleans
// Based on "Common Area Core" + Bedroom time logic:
// - Core (Kitchen+Living+Dining+Halls+Laundry): 2.0 hrs Std / 3.5 hrs Deep
// - Master Bedroom: +35 min Std / +45 min Deep
// - Standard Bedroom: +25 min Std / +35 min Deep
export const HOME_BASE_TIME: Record<number, { std: number; deep: number }> = {
  0: { std: 2.0, deep: 3.5 },  // Studio (Core only: 120m / 210m)
  1: { std: 2.6, deep: 4.2 },  // 1 Bed (Core + 1 Master: 155m / 255m)
  2: { std: 3.0, deep: 4.8 },  // 2 Bed (Core + 1 Master + 1 Std: 180m / 290m)
  3: { std: 3.4, deep: 5.4 },  // 3 Bed (Core + 1 Master + 2 Std: 205m / 325m)
  4: { std: 3.8, deep: 6.0 },  // 4 Bed (Core + 1 Master + 3 Std: 230m / 360m)
  5: { std: 4.2, deep: 6.6 },  // 5 Bed (Core + 1 Master + 4 Std: 255m / 395m)
  6: { std: 4.6, deep: 7.2 },  // 6+ Bed (Core + 1 Master + 5 Std: 280m / 430m)
};

// === CORE ZONE TIME ALLOCATIONS (Minutes) - PHASE 3 ===
// Explicit per-zone allocations for MOVING flow decomposition.
// Enables accurate Partial Empty discounts when zones are excluded.
// 
// NOTE: These allocations should align with HOME_BASE_TIME[0] (Studio)
// Studio baseline: Core only = 120 min std / 210 min deep
export const CORE_ZONE_TIME = {
  std: {
    kitchen: 45,   // Main time sink (appliances, surfaces)
    living: 25,    // Vacuum, dust, surfaces
    dining: 15,    // Table area, chairs
    entry: 10,     // Entry + foyer
    // Total core zones: 95 min, plus ~25 min buffer = 120 min (2.0 hrs)
  },
  deep: {
    kitchen: 75,   // Deep clean appliances, cabinets, grout
    living: 40,    // Baseboards, detailed dusting
    dining: 25,    // Detail work
    entry: 15,     // Deep clean entry
    // Total core zones: 155 min, plus ~55 min buffer = 210 min (3.5 hrs)
  },
} as const;

// Bedroom time allocations (mirrors BEDROOM_SKIP_RATES times)
const BEDROOM_TIME = {
  master: { std: 35, deep: 45 },
  standard: { std: 25, deep: 35 },
} as const;

/**
 * Calculate decomposed base time for MOVING flow with zone exclusions.
 * 
 * SSOT: Use getIncludedBedroomCount for bedroom time calculation.
 * This function replaces HOME_BASE_TIME lookup when excludedSpaces are present.
 * 
 * IMPORTANT: Only for MOVING flow. LIVE_HERE uses standard HOME_BASE_TIME.
 * 
 * @param includedBedroomCount - From getIncludedBedroomCount (already accounts for skips)
 * @param excludedSpaces - Array of excluded core zones (kitchen/living/dining)
 * @param isDeep - Deep clean or Move-In/Out service
 * @returns Total base minutes for MOVING
 */
export function calculateDecomposedBaseTime(
  includedBedroomCount: number,
  excludedSpaces: string[],
  isDeep: boolean
): number {
  const tier = isDeep ? 'deep' : 'std';
  const zones = CORE_ZONE_TIME[tier];
  const bedroomTimes = BEDROOM_TIME[tier === 'deep' ? 'master' : 'master'];
  
  let totalMinutes = 0;
  
  // Entry always included (cannot be excluded)
  totalMinutes += zones.entry;
  
  // Core zones (gated by excludedSpaces)
  if (!excludedSpaces.includes('kitchen')) totalMinutes += zones.kitchen;
  if (!excludedSpaces.includes('living')) totalMinutes += zones.living;
  if (!excludedSpaces.includes('dining')) totalMinutes += zones.dining;
  
  // Bedroom time (Master uses higher allocation)
  // SSOT: includedBedroomCount already accounts for skipped bedrooms
  const masterMinutes = isDeep ? BEDROOM_TIME.master.deep : BEDROOM_TIME.master.std;
  const standardMinutes = isDeep ? BEDROOM_TIME.standard.deep : BEDROOM_TIME.standard.std;
  
  if (includedBedroomCount >= 1) {
    totalMinutes += masterMinutes;  // First bedroom = master rate
  }
  if (includedBedroomCount >= 2) {
    totalMinutes += (includedBedroomCount - 1) * standardMinutes;  // Additional bedrooms
  }
  
  // Buffer for transitions/setup (matches HOME_BASE_TIME formula)
  const bufferMinutes = isDeep ? 55 : 25;
  totalMinutes += bufferMinutes;
  
  return totalMinutes;
}

// === BATHROOM RATES ===
// Per-bathroom pricing by type
export const BATH_RATES = {
  master: { std: 41.25, deep: 74.67 },
  full: { std: 27.50, deep: 53.33 },
  half: { std: 13.75, deep: 26.67 },
} as const;

// === BATHROOM TIME (Minutes) ===
// Estimated labor time per bathroom type
export const BATH_TIME = {
  master: { std: 45, deep: 70 },  // Master: shower + tub + double vanity
  full: { std: 30, deep: 50 },    // Full: tub/shower + toilet
  half: { std: 15, deep: 25 },    // Half: toilet + sink only
} as const;

// === PROGRESSIVE CABINET PRICING BY ZONE ===
// Scales by home size (sqft) with separate zones for kitchen, bathroom, laundry
export const CABINET_ZONES = {
  // Kitchen cabinets - scales by square footage
  kitchen: {
    small: { maxSqft: 1500, price: 35, time: 35 },    // <1500 sqft: $35, ~35 min
    medium: { maxSqft: 3500, price: 45, time: 45 },   // 1500-3500 sqft: $45, ~45 min  
    large: { maxSqft: Infinity, price: 50, time: 60 }, // 3500+ sqft: $50, ~1 hr
  },
  // Per bathroom cabinet interior
  bathroom: { price: 15, time: 15 },  // $15 per bath, ~15 min each
  // Laundry / Hallways / Pasillos
  laundry: { price: 25, time: 25 },   // $25 flat, ~25 min
} as const;

// Organization rate for FULL cabinets (not empty)
export const CABINET_ORGANIZATION_RATE = 64; // $/hr

// Legacy export for backward compatibility
export const CABINET_LOGIC = {
  baseKitchen: 50,
  perBathAddon: 15,
} as const;

// === LIVING AREA (FUNCTIONAL ZONE) RATES ===
// These are mini-modules for additional living areas beyond bedrooms/baths
export const LIVING_AREA_RATES = {
  office:  { std: 15, deep: 35, time: 25 },  // Basic $15, Deep/Moving $35
  laundry: { std: 35, deep: 35, time: 15 },  // Flat $35 (no discount for basic)
  loft:    { std: 25, deep: 35, time: 25 },  // Basic $25, Deep/Moving $35
  garage:  { std: 25, deep: 35, time: 30 },  // Basic $25 (surfaces), Deep $35
  patio:   { sweep: 15, scrub: 25, sweepTime: 15, scrubTime: 35 },  // Sweep +$15, Scrub +$25
} as const;

// === ADDITIONAL STRUCTURES (Compound/Estate Pricing) ===
// Independent flat-rate pricing for detached or attached auxiliary buildings
export const ADDITIONAL_STRUCTURE_RATES = {
  guestHouse: {
    base: 120,    // Base price for guest house (1BR/1BA equivalent)
    deepMultiplier: 1.25, // Deep clean adds 25%
    description: 'Full guest house with bedroom, bathroom, kitchenette',
    // Config modifiers
    kitchenModifiers: {
      none: -15,      // No kitchen = less scope
      kitchenette: 0, // Base price
      full: 20,       // Full kitchen = more appliances
    },
    layoutModifiers: {
      studio: -10,    // Smaller layout
      '1br_1ba': 0,   // Standard layout
    },
    detachedTransitMinutes: 10, // Extra time for equipment transit
  },
  artStudio: {
    base: 85,     // Art studio / ADU / workshop
    deepMultiplier: 1.25,
    description: 'Art studio, home office, or accessory dwelling unit',
    // Config modifiers
    bathroomModifier: 25,     // Add bathroom = +$25
    delicateModifier: 15,     // Delicate surfaces = HEPA/careful handling
    detachedTransitMinutes: 10,
  },
  poolHouse: {
    base: 65,     // Pool house / cabana (simpler space)
    deepMultiplier: 1.25,
    description: 'Pool house, cabana, or outdoor entertaining space',
  },
} as const;

// Structure breakdown item with detailed config
export interface StructureBreakdownItem {
  label: string;
  id: string;
  count: number;
  price: number;
  configSummary: string;
  isDetached: boolean;
  trashBags: number;
  stickySpills: boolean;
}

// Import types for structure configs
import type { GuestHouseConfig } from '@/components/cleaning/GuestHouseCard';
import type { ArtStudioConfig } from '@/components/cleaning/ArtStudioCard';

/**
 * Calculate price for a single guest house based on configuration
 */
export function calculateGuestHousePrice(config: GuestHouseConfig, isDeep: boolean): number {
  const rates = ADDITIONAL_STRUCTURE_RATES.guestHouse;
  let price: number = rates.base;
  
  // Kitchen modifier
  const kitchenMod = rates.kitchenModifiers[config.kitchenType] || 0;
  price += kitchenMod;
  
  // Layout modifier
  const layoutMod = rates.layoutModifiers[config.layout] || 0;
  price += layoutMod;
  
  // Deep clean multiplier
  if (isDeep) {
    price = Math.round(price * rates.deepMultiplier);
  }
  
  return Math.round(price);
}

/**
 * Calculate price for a single art studio based on configuration
 */
export function calculateArtStudioPrice(config: ArtStudioConfig, isDeep: boolean): number {
  const rates = ADDITIONAL_STRUCTURE_RATES.artStudio;
  let price: number = rates.base;
  
  // Bathroom modifier
  if (config.hasBathroom) {
    price += rates.bathroomModifier;
  }
  
  // Delicate surfaces modifier
  if (config.surfaceSensitivity === 'delicate') {
    price += rates.delicateModifier;
  }
  
  // Deep clean multiplier
  if (isDeep) {
    price = Math.round(price * rates.deepMultiplier);
  }
  
  return Math.round(price);
}

/**
 * Get config summary string for display
 */
function getGuestHouseConfigSummary(config: GuestHouseConfig): string {
  const parts: string[] = [];
  parts.push(config.layout === '1br_1ba' ? '1BR/1BA' : 'Studio');
  parts.push(config.kitchenType === 'full' ? 'Full Kitchen' : 
             config.kitchenType === 'kitchenette' ? 'Kitchenette' : 'No Kitchen');
  if (config.attachment === 'detached') parts.push('Detached');
  return parts.join(', ');
}

function getArtStudioConfigSummary(config: ArtStudioConfig): string {
  const parts: string[] = [];
  const typeLabel = config.studioType === 'art_studio' ? 'Art Studio' :
                    config.studioType === 'home_office' ? 'Home Office' :
                    config.studioType === 'workshop' ? 'Workshop' : 'ADU';
  parts.push(typeLabel);
  if (config.hasBathroom) parts.push('w/ Bath');
  if (config.surfaceSensitivity === 'delicate') parts.push('⚠️ Delicate');
  if (config.attachment === 'detached') parts.push('Detached');
  return parts.join(', ');
}

/**
 * Calculate total for additional structures with detailed config pricing
 */
export function calculateAdditionalStructuresTotal(params: {
  guestHouseCount: number;
  artStudioCount: number;
  poolHouseCount: number;
  isDeepClean: boolean;
  guestHouseConfigs?: Record<string, GuestHouseConfig>;
  artStudioConfigs?: Record<string, ArtStudioConfig>;
}): { 
  total: number; 
  breakdown: StructureBreakdownItem[];
  totalTrashBags: number;
  detachedCount: number;
  transitBufferMinutes: number;
} {
  const { guestHouseCount, artStudioCount, poolHouseCount, isDeepClean, guestHouseConfigs, artStudioConfigs } = params;
  const multiplier = isDeepClean ? 1.25 : 1;
  
  const breakdown: StructureBreakdownItem[] = [];
  let total = 0;
  let totalTrashBags = 0;
  let detachedCount = 0;
  
  // Guest Houses with detailed config
  for (let i = 0; i < guestHouseCount; i++) {
    const id = `guest_house_${i}`;
    const config = guestHouseConfigs?.[id];
    
    if (config) {
      const price = calculateGuestHousePrice(config, isDeepClean);
      total += price;
      totalTrashBags += config.trashBags || 0;
      if (config.attachment === 'detached') detachedCount++;
      
      breakdown.push({
        label: `Guest House ${i + 1}`,
        id,
        count: 1,
        price,
        configSummary: getGuestHouseConfigSummary(config),
        isDetached: config.attachment === 'detached',
        trashBags: config.trashBags || 0,
        stickySpills: config.stickySpills || false,
      });
    } else {
      // Fallback to base price
      const price = Math.round(ADDITIONAL_STRUCTURE_RATES.guestHouse.base * multiplier);
      total += price;
      breakdown.push({
        label: `Guest House ${i + 1}`,
        id,
        count: 1,
        price,
        configSummary: '1BR/1BA, Kitchenette',
        isDetached: false,
        trashBags: 0,
        stickySpills: false,
      });
    }
  }
  
  // Art Studios with detailed config
  for (let i = 0; i < artStudioCount; i++) {
    const id = `art_studio_${i}`;
    const config = artStudioConfigs?.[id];
    
    if (config) {
      const price = calculateArtStudioPrice(config, isDeepClean);
      total += price;
      totalTrashBags += config.trashBags || 0;
      if (config.attachment === 'detached') detachedCount++;
      
      breakdown.push({
        label: `Art Studio ${i + 1}`,
        id,
        count: 1,
        price,
        configSummary: getArtStudioConfigSummary(config),
        isDetached: config.attachment === 'detached',
        trashBags: config.trashBags || 0,
        stickySpills: config.stickySpills || false,
      });
    } else {
      // Fallback to base price
      const price = Math.round(ADDITIONAL_STRUCTURE_RATES.artStudio.base * multiplier);
      total += price;
      breakdown.push({
        label: `Art Studio ${i + 1}`,
        id,
        count: 1,
        price,
        configSummary: 'Art Studio',
        isDetached: false,
        trashBags: 0,
        stickySpills: false,
      });
    }
  }
  
  // Pool Houses (simple count-based)
  if (poolHouseCount > 0) {
    const poolTotal = Math.round(poolHouseCount * ADDITIONAL_STRUCTURE_RATES.poolHouse.base * multiplier);
    total += poolTotal;
    for (let i = 0; i < poolHouseCount; i++) {
      breakdown.push({
        label: `Pool House ${i + 1}`,
        id: `pool_house_${i}`,
        count: 1,
        price: Math.round(ADDITIONAL_STRUCTURE_RATES.poolHouse.base * multiplier),
        configSummary: 'Pool House / Cabana',
        isDetached: true,
        trashBags: 0,
        stickySpills: false,
      });
    }
    detachedCount += poolHouseCount;
  }
  
  return { 
    total, 
    breakdown,
    totalTrashBags,
    detachedCount,
    transitBufferMinutes: detachedCount * ADDITIONAL_STRUCTURE_RATES.guestHouse.detachedTransitMinutes,
  };
}

// === VERTICAL LOGISTICS SURCHARGES ===
// Accounts for fatigue/safety when carrying equipment up/down stairs
export const VERTICAL_SURCHARGES = {
  // House internal levels (carrying equipment up/down internal stairs)
  // Expanded to 6 levels for mansions and compound properties
  house: {
    1: 0,    // Single story - no surcharge
    2: 15,   // 2-story - $15 fatigue surcharge
    3: 30,   // 3-story - $30 high labor intensity
    4: 45,   // 4-story - $45 mansion logistics
    5: 60,   // 5-story - $60 estate compound
    6: 75,   // 6-story - $75 maximum vertical complexity
  } as Record<number, number>,
  // Apartment access levels (external access difficulty)
  apartment: {
    withElevator: 0,      // Any floor with elevator - no surcharge
    walkUp: {             // Walk-up surcharges (no elevator)
      1: 0,               // Ground floor - no surcharge
      2: 10,              // 2nd floor walk-up - $10
      3: 20,              // 3rd floor walk-up - $20
      4: 30,              // 4+ floor walk-up - $30 (capped)
    } as Record<number, number>,
  },
} as const;

/**
 * Calculate vertical logistics surcharge for MOVING mode
 * Returns surcharge amount and reason string for display
 */
export function calculateVerticalSurcharge(params: {
  propertyType: 'house' | 'apartment' | null;
  houseLevels: number;
  apartmentFloor: number;
  hasElevator: boolean;
}): { surcharge: number; reason: string } {
  const { propertyType, houseLevels, apartmentFloor, hasElevator } = params;
  
  if (propertyType === 'house') {
    const level = Math.min(houseLevels, 6) as 1 | 2 | 3 | 4 | 5 | 6;
    const surcharge = VERTICAL_SURCHARGES.house[level] || 0;
    const reason = level >= 4 
      ? `${level}-Story Estate (High Labor Intensity)` 
      : level === 3 
        ? '3-Story Home (Extended Vertical Labor)'
        : level === 2 
          ? '2-Story Home (Fatigue Surcharge)' 
          : '';
    return { surcharge, reason };
  }
  
  if (propertyType === 'apartment') {
    if (hasElevator) {
      return { surcharge: 0, reason: '' };
    }
    // Walk-up logic - cap at floor 4 for surcharge
    const floor = Math.min(apartmentFloor, 4);
    if (floor <= 1) return { surcharge: 0, reason: '' };
    const surcharge = VERTICAL_SURCHARGES.apartment.walkUp[floor] || 30;
    return { 
      surcharge, 
      reason: `${apartmentFloor}${apartmentFloor === 2 ? 'nd' : apartmentFloor === 3 ? 'rd' : 'th'} Floor Walk-Up`
    };
  }
  
  return { surcharge: 0, reason: '' };
}

/**
 * Calculate patio cleaning price and time
 */
export function calculatePatioTotal(
  patioCount: number,
  patioScope: 'sweep' | 'scrub'
): { price: number; timeMinutes: number } {
  if (patioCount <= 0) return { price: 0, timeMinutes: 0 };
  
  const rate = LIVING_AREA_RATES.patio;
  const price = patioScope === 'scrub' ? rate.scrub : rate.sweep;
  const time = patioScope === 'scrub' ? rate.scrubTime : rate.sweepTime;
  
  return { 
    price: price * patioCount, 
    timeMinutes: time * patioCount 
  };
}

/**
 * Calculate living areas (functional zones) total price and time
 */
export function calculateLivingAreasTotal(
  officeCount: number,
  laundryCount: number,
  loftCount: number,
  garageCount: number,
  isDeep: boolean
): { price: number; timeHours: number } {
  const level = isDeep ? 'deep' : 'std';
  
  const price = 
    (officeCount * LIVING_AREA_RATES.office[level]) +
    (laundryCount * LIVING_AREA_RATES.laundry[level]) +
    (loftCount * LIVING_AREA_RATES.loft[level]) +
    (garageCount * LIVING_AREA_RATES.garage[level]);

  const timeHours = (
    (officeCount * LIVING_AREA_RATES.office.time) +
    (laundryCount * LIVING_AREA_RATES.laundry.time) +
    (loftCount * LIVING_AREA_RATES.loft.time) +
    (garageCount * LIVING_AREA_RATES.garage.time)
  ) / 60;

  return { price, timeHours };
}

// === FREQUENCY MULTIPLIERS ===
// Applied to Standard Clean base price for recurring discounts
// Discounts applied to one-time rate to incentivize commitment
export const FREQUENCY_MULTIPLIERS = {
  onetime: 1.0,        // One-time / Deep / Move-In/Out - Full price
  monthly: 0.90,       // Monthly - 10% discount (avoid deep cleans every time)
  biweekly: 0.85,      // Bi-Weekly - 15% discount (Best Value - skip buildup cycle)
  weekly: 0.80,        // Weekly - 20% discount (prevent buildup permanently)
} as const;

// === MOVE OCCUPANCY MULTIPLIERS ===
// DEPRECATED: Replaced by Move Condition system (Partial Empty freeze toggles)
// Kept for backward compatibility - no longer used in pricing
export const MOVE_OCCUPANCY_MULTIPLIERS = {
  vacant: 1.0,         // Empty property - standard rate
  furnished: 1.0,      // CHANGED from 1.25 - no multiplier (use freeze toggles instead)
} as const;

// === CONDITION FACTORS ===
// Multiplier for home condition
export const CONDITION_FACTORS = {
  standard: 1.0,       // Maintained / Standard
  heavy: 1.25,         // Heavy Soil / Neglected
  extreme: 1.40,       // Extra Heavy
} as const;

// === HELPER FUNCTIONS ===

/**
 * Extract bedroom count from homeSize index (used in pricing dropdown)
 * V2 SIMPLIFIED: Direct 1:1 mapping (0=Studio, 1=1Bed, 2=2Bed, etc.)
 */
export function getBedroomCountFromHomeSize(homeSize: number): number {
  // V2 Simplified model: homeSize directly maps to bedroom count
  // 0 = Studio, 1 = 1 Bed, 2 = 2 Bed, 3 = 3 Bed, 4 = 4 Bed, 5 = 5 Bed, 6 = 6+ Bed
  if (homeSize >= 6) return 6; // Now supports 6+ tier
  return homeSize;
}

/**
 * Get validated set of skipped bedroom IDs
 * SSOT: Single source of truth for valid skipped bedrooms
 * - Filters to IDs matching /^bed_\d+$/
 * - Ensures index is within [0, totalBedrooms-1]
 * - Returns unique Set (handles duplicates and stale localStorage IDs)
 */
export function getValidSkippedBedroomSet(
  homeSize: number,
  skippedBedrooms: string[]
): Set<string> {
  const totalBedrooms = getBedroomCountFromHomeSize(homeSize);
  
  return new Set(
    (skippedBedrooms || []).filter(id => {
      const match = id.match(/^bed_(\d+)$/);
      if (!match) return false;
      const index = parseInt(match[1], 10);
      return index >= 0 && index < totalBedrooms;
    })
  );
}

/**
 * Derive included bedroom count from homeSize and skippedBedrooms
 * SSOT-safe: Uses getValidSkippedBedroomSet for robust validation
 */
export function getIncludedBedroomCount(
  homeSize: number,
  skippedBedrooms: string[]
): number {
  const totalBedrooms = getBedroomCountFromHomeSize(homeSize);
  const validSkipped = getValidSkippedBedroomSet(homeSize, skippedBedrooms);
  
  // Clamp 0..6 to match HOME_BASE_RATES table bounds
  return Math.max(0, Math.min(6, totalBedrooms - validSkipped.size));
}

/**
 * Get base rate for a home size
 */
export function getHomeBaseRate(homeSize: number, isDeep: boolean): number {
  const bedrooms = getBedroomCountFromHomeSize(homeSize);
  const rates = HOME_BASE_RATES[bedrooms] || HOME_BASE_RATES[5]; // Default to largest
  return isDeep ? rates.deep : rates.std;
}

/**
 * Calculate bathroom total based on counts and service level
 */
export function calculateBathroomTotal(
  masterBaths: number,
  fullBaths: number,
  halfBaths: number,
  isDeep: boolean
): number {
  const level: ServiceLevel = isDeep ? 'deep' : 'std';
  
  const masterTotal = masterBaths * BATH_RATES.master[level];
  const fullTotal = fullBaths * BATH_RATES.full[level];
  const halfTotal = halfBaths * BATH_RATES.half[level];
  
  return masterTotal + fullTotal + halfTotal;
}

// === SQFT RANGE HELPERS ===

/**
 * Get approximate sqft from squareFootageRange metadata string
 */
export function getSqftFromRange(sqftRange: string): number {
  const sqftMap: Record<string, number> = {
    'SF_<600': 500,
    'SF_600_900': 750,
    'SF_900_1200': 1050,
    'SF_1200_1500': 1350,
    'SF_1500_2000': 1750,
    'SF_2000_2500': 2250,
    'SF_2500_3000': 2750,
    'SF_3000_3500': 3250,
    'SF_3500_4000': 3750,
    'SF_4000_5000': 4500,
    'SF_5000_7000': 6000,
    'SF_7000+': 8000,
  };
  return sqftMap[sqftRange] || 1750; // Default to medium
}

/**
 * Get kitchen cabinet price based on home sq ft
 */
export function getKitchenCabinetPrice(sqftRange: string): { price: number; time: number } {
  const sqft = getSqftFromRange(sqftRange);
  
  if (sqft <= CABINET_ZONES.kitchen.small.maxSqft) {
    return { price: CABINET_ZONES.kitchen.small.price, time: CABINET_ZONES.kitchen.small.time };
  }
  if (sqft <= CABINET_ZONES.kitchen.medium.maxSqft) {
    return { price: CABINET_ZONES.kitchen.medium.price, time: CABINET_ZONES.kitchen.medium.time };
  }
  return { price: CABINET_ZONES.kitchen.large.price, time: CABINET_ZONES.kitchen.large.time };
}

/**
 * Calculate progressive cabinet cleaning price (empty cabinets only)
 * For full cabinets, use CABINET_ORGANIZATION_RATE ($64/hr)
 */
export function calculateProgressiveCabinetPrice(params: {
  sqftRange: string;
  totalBathrooms: number;
  includeLaundry?: boolean;
}): { 
  kitchenPrice: number; 
  bathroomPrice: number; 
  laundryPrice: number;
  totalPrice: number;
  estimatedTime: number; // minutes
} {
  const { sqftRange, totalBathrooms, includeLaundry = false } = params;
  
  // Kitchen cabinets (scaled by sqft)
  const kitchen = getKitchenCabinetPrice(sqftRange);
  
  // Bathroom cabinets ($15 each)
  const bathroomPrice = totalBathrooms * CABINET_ZONES.bathroom.price;
  const bathroomTime = totalBathrooms * CABINET_ZONES.bathroom.time;
  
  // Laundry/hallways
  const laundryPrice = includeLaundry ? CABINET_ZONES.laundry.price : 0;
  const laundryTime = includeLaundry ? CABINET_ZONES.laundry.time : 0;
  
  return {
    kitchenPrice: kitchen.price,
    bathroomPrice,
    laundryPrice,
    totalPrice: kitchen.price + bathroomPrice + laundryPrice,
    estimatedTime: kitchen.time + bathroomTime + laundryTime,
  };
}

/**
 * Legacy: Calculate cabinet cleaning price based on bathroom count
 * @deprecated Use calculateProgressiveCabinetPrice for zone-based pricing
 */
export function calculateCabinetPrice(totalBathrooms: number): number {
  return CABINET_LOGIC.baseKitchen + (totalBathrooms * CABINET_LOGIC.perBathAddon);
}

/**
 * Get frequency multiplier from service type string
 * Returns discount multiplier: 0.80 (Weekly), 0.85 (Bi-Weekly), 0.90 (Monthly), 1.0 (One-time)
 */
export function getFrequencyMultiplier(serviceType: string): number {
  // Weekly (20% off) - must check before Bi-Weekly to avoid false match
  if (serviceType.includes('Weekly') && !serviceType.includes('Bi-Weekly')) {
    return FREQUENCY_MULTIPLIERS.weekly;  // 0.80
  }
  // Bi-Weekly (15% off - Best Value)
  if (serviceType.includes('Bi-Weekly')) {
    return FREQUENCY_MULTIPLIERS.biweekly; // 0.85
  }
  // Monthly (10% off)
  if (serviceType.includes('Monthly')) {
    return FREQUENCY_MULTIPLIERS.monthly;  // 0.90
  }
  return FREQUENCY_MULTIPLIERS.onetime;
}

/**
 * Get condition multiplier from condition fee
 */
export function getConditionMultiplier(conditionFee: number): number {
  if (conditionFee >= 180) return CONDITION_FACTORS.extreme;
  if (conditionFee >= 120) return CONDITION_FACTORS.heavy;
  return CONDITION_FACTORS.standard;
}

/**
 * Smart auto-fill: Suggest initial bathroom counts based on bedroom count
 * Returns recommended { masterBaths, fullBaths, halfBaths }
 */
export function getDefaultBathroomCounts(homeSize: number): {
  masterBaths: number;
  fullBaths: number;
  halfBaths: number;
} {
  const bedrooms = getBedroomCountFromHomeSize(homeSize);
  
  switch (bedrooms) {
    case 0: // Studio
      return { masterBaths: 0, fullBaths: 1, halfBaths: 0 };
    case 1: // 1 Bed
      return { masterBaths: 1, fullBaths: 0, halfBaths: 0 };
    case 2: // 2 Bed
      return { masterBaths: 1, fullBaths: 1, halfBaths: 0 };
    case 3: // 3 Bed
      return { masterBaths: 1, fullBaths: 1, halfBaths: 1 };
    case 4: // 4 Bed
      return { masterBaths: 1, fullBaths: 2, halfBaths: 1 };
    case 5: // 5 Bed
      return { masterBaths: 2, fullBaths: 2, halfBaths: 1 };
    default:
      return { masterBaths: 1, fullBaths: 1, halfBaths: 0 };
  }
}

/**
 * Calculate estimated labor time in hours (range format)
 * Enhanced to include functional zones and addon time
 */
// === STAIR HAZARD TIME BUFFERS (minutes) ===
export const STAIR_HAZARD_TIMES = {
  cornerBuildup: 12,      // Heavy dust in corners
  petHairAccumulation: 10, // Pet hair on steps
  slipHazards: 5,         // Cleanup time for slip hazards
  railingsDetail: 18,     // Intricate railings detail
} as const;

/**
 * Calculate stair hazard time buffer in minutes
 */
export function getStairHazardBuffer(stairsConfig?: {
  enabled?: boolean;
  cornerBuildup?: boolean;
  petHairAccumulation?: boolean;
  slipHazards?: boolean;
  railingsDetail?: boolean;
}): number {
  if (!stairsConfig || !stairsConfig.enabled) return 0;
  let buffer = 0;
  if (stairsConfig.cornerBuildup) buffer += STAIR_HAZARD_TIMES.cornerBuildup;
  if (stairsConfig.petHairAccumulation) buffer += STAIR_HAZARD_TIMES.petHairAccumulation;
  if (stairsConfig.slipHazards) buffer += STAIR_HAZARD_TIMES.slipHazards;
  if (stairsConfig.railingsDetail) buffer += STAIR_HAZARD_TIMES.railingsDetail;
  return buffer;
}

// === HALLWAY HAZARD TIME BUFFERS (minutes) ===
export const HALLWAY_HAZARD_TIMES = {
  highTrafficDust: 8,     // Heavy dust in baseboards and corners
  runnerOrRug: 10,        // Deep vacuuming of runner
  wallScuffs: 12,         // Magic eraser for scuffs
  galleryWall: 15,        // Glass/frame detail work
  entryDebris: 8,         // Entry sweep/mop
} as const;

// === BEDROOM HAZARD TIME BUFFERS (per bedroom, minutes) ===
export const BEDROOM_HAZARD_TIMES = {
  dustBuildup: 8,         // Heavy dust cleanup
  petHair: 10,            // Pet hair removal
  underBedDebris: 6,      // Under-bed cleaning
  closetClutter: 12,      // Heavy closet (Move-Out)
  textileAccumulation: 15, // Textile bagging (Move-Out)
} as const;

// === DINING ROOM HAZARD TIME BUFFERS (minutes) ===
export const DINING_HAZARD_TIMES = {
  drink_stains: 5,        // Beverage stain treatment
  food_spills: 5,         // Food residue deep clean
  stickySpills: 8,        // Enzymatic floor treatment
} as const;

/**
 * Calculate dining room hazard time buffer in minutes
 */
export function getDiningHazardBuffer(
  messTypes: string[],
  stickySpills: boolean
): number {
  let buffer = 0;
  if (messTypes.includes('drink_stains')) buffer += DINING_HAZARD_TIMES.drink_stains;
  if (messTypes.includes('food_spills')) buffer += DINING_HAZARD_TIMES.food_spills;
  if (stickySpills) buffer += DINING_HAZARD_TIMES.stickySpills;
  return buffer;
}

// BedroomHazards interface for typing
interface BedroomHazardsInput {
  dustBuildup?: boolean;
  petHair?: boolean;
  underBedDebris?: boolean;
  closetClutter?: boolean;
  textileAccumulation?: boolean;
}

/**
 * Calculate bedroom hazard time buffer in minutes for all bedrooms
 */
export function getBedroomHazardBuffer(bedroomHazards?: Record<string, BedroomHazardsInput>): number {
  if (!bedroomHazards) return 0;
  let buffer = 0;
  
  Object.values(bedroomHazards).forEach(hazards => {
    if (hazards.dustBuildup) buffer += BEDROOM_HAZARD_TIMES.dustBuildup;
    if (hazards.petHair) buffer += BEDROOM_HAZARD_TIMES.petHair;
    if (hazards.underBedDebris) buffer += BEDROOM_HAZARD_TIMES.underBedDebris;
    if (hazards.closetClutter) buffer += BEDROOM_HAZARD_TIMES.closetClutter;
    if (hazards.textileAccumulation) buffer += BEDROOM_HAZARD_TIMES.textileAccumulation;
  });
  
  return buffer;
}

/**
 * Calculate hallway hazard time buffer in minutes
 */
export function getHallwayHazardBuffer(hallwaysConfig?: {
  enabled?: boolean;
  highTrafficDust?: boolean;
  runnerOrRug?: boolean;
  wallScuffs?: boolean;
  galleryWall?: boolean;
  entryDebris?: boolean;
}): number {
  if (!hallwaysConfig || !hallwaysConfig.enabled) return 0;
  let buffer = 0;
  if (hallwaysConfig.highTrafficDust) buffer += HALLWAY_HAZARD_TIMES.highTrafficDust;
  if (hallwaysConfig.runnerOrRug) buffer += HALLWAY_HAZARD_TIMES.runnerOrRug;
  if (hallwaysConfig.wallScuffs) buffer += HALLWAY_HAZARD_TIMES.wallScuffs;
  if (hallwaysConfig.galleryWall) buffer += HALLWAY_HAZARD_TIMES.galleryWall;
  if (hallwaysConfig.entryDebris) buffer += HALLWAY_HAZARD_TIMES.entryDebris;
  return buffer;
}

// === LIVING ROOM HAZARD TIME BUFFERS (minutes) ===
export const LIVING_HAZARD_TIMES = {
  drink_stains: 8,        // Beverage stain treatment (higher for upholstery risk)
  confetti: 10,           // Post-party cleanup - crevices & baseboards
  stickySpills: 8,        // Enzymatic floor treatment
};

/**
 * Calculate living room hazard time buffer in minutes
 */
export function getLivingHazardBuffer(
  messTypes: string[],
  stickySpills: boolean
): number {
  let buffer = 0;
  if (messTypes.includes('drink_stains')) buffer += LIVING_HAZARD_TIMES.drink_stains;
  if (messTypes.includes('confetti')) buffer += LIVING_HAZARD_TIMES.confetti;
  if (stickySpills) buffer += LIVING_HAZARD_TIMES.stickySpills;
  return buffer;
}

export function calculateEstimatedTime(params: {
  homeSize: number;
  masterBaths: number;
  fullBaths: number;
  halfBaths: number;
  isDeep: boolean;
  officeCount?: number;
  laundryCount?: number;
  loftCount?: number;
  garageCount?: number;
  addonMinutes?: number;
  stairsConfig?: {
    enabled?: boolean;
    cornerBuildup?: boolean;
    petHairAccumulation?: boolean;
    slipHazards?: boolean;
    railingsDetail?: boolean;
  };
}): { min: number; max: number; display: string } {
  const { 
    homeSize, masterBaths, fullBaths, halfBaths, isDeep,
    officeCount = 0, laundryCount = 0, loftCount = 0, garageCount = 0,
    addonMinutes = 0, stairsConfig
  } = params;
  const level = isDeep ? 'deep' : 'std';
  
  // Get base time from home size
  const bedrooms = getBedroomCountFromHomeSize(homeSize);
  const baseTime = HOME_BASE_TIME[bedrooms]?.[level] || HOME_BASE_TIME[6][level];
  
  // Calculate bathroom time (convert minutes to hours)
  const bathroomMinutes = 
    (masterBaths * BATH_TIME.master[level]) +
    (fullBaths * BATH_TIME.full[level]) +
    (halfBaths * BATH_TIME.half[level]);
  const bathroomHours = bathroomMinutes / 60;
  
  // Calculate functional zone time
  const { timeHours: zoneHours } = calculateLivingAreasTotal(
    officeCount, laundryCount, loftCount, garageCount, isDeep
  );
  
  // Calculate stair hazard buffer
  const stairHazardMinutes = getStairHazardBuffer(stairsConfig);
  
  // Total time including addons and stair hazards
  const totalTime = baseTime + bathroomHours + zoneHours + (addonMinutes / 60) + (stairHazardMinutes / 60);
  
  // Create range (±18 min buffer for tighter estimate)
  const minTime = Math.max(2, totalTime - 0.3);
  const maxTime = totalTime + 0.3;
  
  return {
    min: Math.round(minTime * 10) / 10,
    max: Math.round(maxTime * 10) / 10,
    display: `${Math.round(minTime * 10) / 10}-${Math.round(maxTime * 10) / 10}`,
  };
}

/**
 * Calculate the complete price using V2 component-based logic
 */
export function calculateComponentPrice(params: {
  homeSize: number;
  masterBaths: number;
  fullBaths: number;
  halfBaths: number;
  serviceType: string;
  conditionFee: number;
  includeCabinets?: boolean;
}): {
  basePrice: number;
  bathroomPrice: number;
  cabinetPrice: number;
  subtotal: number;
  frequencyMultiplier: number;
  conditionMultiplier: number;
  finalPrice: number;
} {
  const { homeSize, masterBaths, fullBaths, halfBaths, serviceType, conditionFee, includeCabinets = false } = params;
  
  // Determine if deep clean (Deep Clean or Move-In/Out)
  const isDeep = serviceType === 'Deep Clean' || serviceType === 'Move-In/Out';
  
  // Step 1: Base price from bedrooms
  const basePrice = getHomeBaseRate(homeSize, isDeep);
  
  // Step 2: Bathroom additions
  const bathroomPrice = calculateBathroomTotal(masterBaths, fullBaths, halfBaths, isDeep);
  
  // Step 3: Cabinet price (if applicable)
  const totalBathrooms = masterBaths + fullBaths + halfBaths;
  const cabinetPrice = includeCabinets ? calculateCabinetPrice(totalBathrooms) : 0;
  
  // Step 4: Subtotal before multipliers
  const subtotal = basePrice + bathroomPrice + cabinetPrice;
  
  // Step 5: Apply multipliers
  const frequencyMultiplier = getFrequencyMultiplier(serviceType);
  const conditionMultiplier = getConditionMultiplier(conditionFee);
  
  // Final calculation
  const finalPrice = Math.round(subtotal * frequencyMultiplier * conditionMultiplier);
  
  return {
    basePrice,
    bathroomPrice,
    cabinetPrice,
    subtotal,
    frequencyMultiplier,
    conditionMultiplier,
    finalPrice,
  };
}

// ============ FRESH SHEETS & ORGANIZATION HELPERS ============
// Pure helper functions for Single Source of Truth architecture

export const FRESH_SHEETS_RATE = 5;       // $5 per extra bed
export const FRESH_SHEETS_TIME = 10;      // 10 min per bed
export const ORGANIZATION_RATE = 35;      // $35/hr

export interface FreshSheetsRoomResult {
  roomId: string;
  roomLabel: string;
  beds: number;
  courtesyBeds: number;
  chargedBeds: number;
  cost: number;
  timeMinutes: number;
  hasCourtesy: boolean;
}

export interface FreshSheetsTotals {
  totalBeds: number;
  totalCost: number;
  totalMinutes: number;
  roomsWithSheets: number;
  byRoom: FreshSheetsRoomResult[];
}

export interface OrganizationRoomResult {
  roomId: string;
  roomLabel: string;
  hours: number;
  cost: number;
  timeMinutes: number;
}

export interface OrganizationTotals {
  totalHours: number;
  totalCost: number;
  totalMinutes: number;
  byRoom: OrganizationRoomResult[];
}

/**
 * Determine if current flow qualifies for lifestyle addons (courtesy pricing)
 * Lifestyle Flow = LIVE_HERE + (Deep Clean OR Standard Clean)
 * Note: Organization is allowed in LIVE_HERE + MOVING (exclude Commercial)
 */
export function isLifestyleFlow(
  situation: 'LIVE_HERE' | 'MOVING' | 'SPECIFIC_AREAS' | 'COMMERCIAL' | 'RENOVATION' | null | string,
  serviceType: string
): boolean {
  return situation === 'LIVE_HERE' && 
    (serviceType === 'Deep Clean' || serviceType === 'Standard Clean');
}

/**
 * Determine if Organization should be shown in the current flow
 * Organization is available in LIVE_HERE and MOVING (not Commercial)
 */
export function isOrganizationAllowed(
  situation: 'LIVE_HERE' | 'MOVING' | 'SPECIFIC_AREAS' | 'COMMERCIAL' | 'RENOVATION' | null | string
): boolean {
  return situation === 'LIVE_HERE' || situation === 'MOVING';
}

/**
 * Get stable room label from roomId
 */
export function getRoomLabel(roomId: string): string {
  if (roomId.startsWith('bed_')) {
    const num = parseInt(roomId.replace('bed_', '')) + 1;
    return `Bedroom ${num}`;
  }
  return roomId.charAt(0).toUpperCase() + roomId.slice(1);
}

/**
 * Get stable room ID (already normalized)
 */
export function getRoomStableId(roomId: string): string {
  return roomId.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Calculate Fresh Sheets cost for a single bedroom
 * @returns Detailed breakdown with courtesy logic
 */
export function calcFreshSheetsCostPerBedroom(
  bedCount: number,
  isLifestyle: boolean
): { cost: number; courtesyBeds: number; chargedBeds: number; timeMinutes: number } {
  if (bedCount <= 0) return { cost: 0, courtesyBeds: 0, chargedBeds: 0, timeMinutes: 0 };
  
  // Lifestyle flows: 1st bed FREE (courtesy), extras $5 each
  // Non-lifestyle: $5 per bed (no courtesy)
  const courtesyBeds = isLifestyle ? Math.min(1, bedCount) : 0;
  const chargedBeds = isLifestyle ? Math.max(0, bedCount - 1) : bedCount;
  const cost = chargedBeds * FRESH_SHEETS_RATE;
  const timeMinutes = bedCount * FRESH_SHEETS_TIME; // Time for ALL beds (courtesy doesn't reduce labor)
  
  return { cost, courtesyBeds, chargedBeds, timeMinutes };
}

/**
 * Calculate aggregated Fresh Sheets totals across all bedrooms
 * Used by: Sidebar, StepReview, PDF, Normalized Payload
 * @param validSkippedSet - SSOT: Set of validated skipped bedroom IDs (use getValidSkippedBedroomSet)
 */
export function calcFreshSheetsTotals(
  bedroomConfigs: Record<string, { freshSheets?: number; profile?: string }>,
  isLifestyle: boolean,
  validSkippedSet: Set<string> = new Set()
): FreshSheetsTotals {
  const byRoom: FreshSheetsRoomResult[] = [];
  let totalBeds = 0;
  let totalCost = 0;
  let totalMinutes = 0;
  let roomsWithSheets = 0;
  
  Object.entries(bedroomConfigs).forEach(([roomId, config]) => {
    // SSOT: Skip addons for excluded bedrooms
    if (validSkippedSet.has(roomId)) return;
    
    const beds = config.freshSheets || 0;
    if (beds > 0) {
      const calc = calcFreshSheetsCostPerBedroom(beds, isLifestyle);
      byRoom.push({
        roomId,
        roomLabel: getRoomLabel(roomId),
        beds,
        courtesyBeds: calc.courtesyBeds,
        chargedBeds: calc.chargedBeds,
        cost: calc.cost,
        timeMinutes: calc.timeMinutes,
        hasCourtesy: calc.courtesyBeds > 0,
      });
      totalBeds += beds;
      totalCost += calc.cost;
      totalMinutes += calc.timeMinutes;
      roomsWithSheets++;
    }
  });
  
  return { totalBeds, totalCost, totalMinutes, roomsWithSheets, byRoom };
}

/**
 * Calculate Organization totals across all bedrooms
 * Used by: Sidebar, StepReview, PDF, Normalized Payload
 * @param validSkippedSet - SSOT: Set of validated skipped bedroom IDs (use getValidSkippedBedroomSet)
 * @returns Aggregated organization data with per-room breakdown
 */
export function calcOrganizationTotals(
  bedroomConfigs: Record<string, { organizationHours?: number; profile?: string }>,
  validSkippedSet: Set<string> = new Set()
): OrganizationTotals {
  const byRoom: OrganizationRoomResult[] = [];
  let totalHours = 0;
  
  Object.entries(bedroomConfigs).forEach(([roomId, config]) => {
    // SSOT: Skip addons for excluded bedrooms
    if (validSkippedSet.has(roomId)) return;
    
    const hours = config.organizationHours || 0;
    if (hours > 0) {
      byRoom.push({
        roomId,
        roomLabel: getRoomLabel(roomId),
        hours,
        cost: hours * ORGANIZATION_RATE,
        timeMinutes: hours * 60,
      });
      totalHours += hours;
    }
  });
  
  return {
    totalHours,
    totalCost: totalHours * ORGANIZATION_RATE,
    totalMinutes: totalHours * 60,
    byRoom,
  };
}

/**
 * Validate Logistics Consistency (Dev-mode only)
 * Ensures Fresh Sheets and Organization are properly synced across all surfaces
 */
export function validateLogisticsConsistency(params: {
  formData: { bedroomConfigs?: Record<string, { freshSheets?: number; organizationHours?: number }> };
  situation: string | null;
  serviceType: string;
  hasSidebarSheets: boolean;
  hasSidebarOrg: boolean;
  hasReviewSheets: boolean;
  hasReviewOrg: boolean;
}): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const { formData, situation, serviceType, hasSidebarSheets, hasSidebarOrg, hasReviewSheets, hasReviewOrg } = params;
  
  const bedroomConfigs = formData.bedroomConfigs || {};
  const isLifestyle = isLifestyleFlow(situation, serviceType);
  const sheetsTotals = calcFreshSheetsTotals(bedroomConfigs, isLifestyle);
  const orgTotals = calcOrganizationTotals(bedroomConfigs);
  
  // Fresh Sheets validation
  if (sheetsTotals.roomsWithSheets > 0) {
    if (!hasSidebarSheets) warnings.push('Fresh Sheets selected but missing from Sidebar');
    if (!hasReviewSheets) warnings.push('Fresh Sheets selected but missing from Review');
  }
  
  // Organization validation
  if (orgTotals.totalHours > 0) {
    if (!hasSidebarOrg) warnings.push('Organization selected but missing from Sidebar Extra Services');
    if (!hasReviewOrg) warnings.push('Organization selected but missing from Review');
  }
  
  if (warnings.length > 0 && import.meta.env.DEV) {
    console.warn('[Logistics Consistency Check]', warnings);
  }
  
  return { valid: warnings.length === 0, warnings };
}
