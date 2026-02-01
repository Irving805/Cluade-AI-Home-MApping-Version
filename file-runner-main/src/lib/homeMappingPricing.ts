/**
 * Home Mapping Pricing — Unified Area Pricing Engine
 * 
 * This module provides a single calculateAreaTotal() function that handles
 * pricing and time calculation for ALL utility areas (Office, Laundry, Garage, Patio).
 * 
 * PRINCIPLE: One function, one source of truth for pricing.
 * Your Cleaning Total, Review, PDF, and Payloads all use this.
 */

import type { 
  HomeMappingAreas,
  OfficeAreaConfig,
  LaundryAreaConfig,
  GarageAreaConfig,
  PatioAreaConfig,
  MudroomAreaConfig,
  DenAreaConfig,
  StudioMainSpaceConfig,
  AreaSizeTier,
  BlindsType,
  MudroomSoilLevel,
  DenClutterLevel,
  StudioFurnitureDensity,
  StudioClutterLevel,
  StudioStructureType,
  StudioSizeRange,
} from './homeMappingTypes';

// Re-export bathroom pricing from dedicated module for backward compatibility
export { 
  calculateBathroomUnit, 
  calculateBathroomInventoryTotals,
  calculateLegacyBathroomTotals,
  BATHROOM_UNIT_RATES,
  type BathroomPricingResult 
} from './bathroomPricing';

// ============= PRICING RATES =============

/**
 * Base rates for utility areas
 */
export const UTILITY_AREA_BASE_RATES = {
  office: {
    base: 35,
    sizeModifiers: { small: -10, medium: 0, large: 15 },
    deskRate: 5,           // Per desk beyond first
    shelvingRate: 8,       // Bookshelf detail
    deepMultiplier: 1.3,
  },
  laundry: {
    closet: { small: 15, medium: 20, large: 25 },
    room: { small: 25, medium: 35, large: 45 },
    sinkRate: 5,
    cabinetRate: 8,
    deepMultiplier: 1.2,
  },
  garage: {
    perCar: { 1: 45, 2: 65, 3: 85 },
    storageModifiers: { light: 0, medium: 10, heavy: 20 },
    oilStainsRate: 15,
    shelvingRate: 5,
    workbenchRate: 8,
    floorConditionModifiers: { concrete: 0, coated: -5, epoxy: -10 },
  },
  patio: {
    sizeRates: { small: 25, medium: 40, large: 60 },
    furnitureRate: 10,
    glassRailingRate: 15,
    slidingDoorRate: 8,    // Per sliding door
    surfaceModifiers: { tile: 0, concrete: -5, wood_deck: 10 },
  },
} as const;

/**
 * Time estimates (in minutes) for utility areas
 */
export const UTILITY_AREA_TIME_RATES = {
  office: {
    base: 25,
    sizeModifiers: { small: -5, medium: 0, large: 10 },
    deskTime: 5,
    shelvingTime: 10,
    windowTime: 3,
    blindsTime: { none: 0, standard: 3, plantation: 5, shutters: 6, vertical: 4 },
    hazardTimes: { dustBuildup: 5, paperClutter: 8, cableManagement: 5 },
  },
  laundry: {
    closet: { small: 10, medium: 15, large: 20 },
    room: { small: 20, medium: 30, large: 40 },
    sinkTime: 5,
    cabinetTime: 10,
    hazardTimes: { lintBuildup: 8, detergentSpills: 10 },
  },
  garage: {
    perCar: { 1: 30, 2: 45, 3: 60 },
    storageModifiers: { light: 0, medium: 10, heavy: 25 },
    oilStainsTime: 20,
    shelvingTime: 5,
    workbenchTime: 10,
    hazardTimes: { oilLeaks: 15, heavyDebris: 20 },
  },
  patio: {
    sizeTimes: { small: 15, medium: 25, large: 40 },
    furnitureTime: 15,
    glassRailingTime: 10,
    slidingDoorTime: 5,
    surfaceModifiers: { tile: 0, concrete: -5, wood_deck: 10 },
  },
} as const;

// ============= INDIVIDUAL AREA CALCULATIONS =============

export interface AreaPricingResult {
  price: number;
  timeMinutes: number;
  breakdown: Array<{ label: string; value: number; type: 'price' | 'time' }>;
}

/**
 * Calculate Office area pricing and time
 */
function calculateOfficeArea(config: OfficeAreaConfig, isDeep: boolean): AreaPricingResult {
  if (!config.enabled) return { price: 0, timeMinutes: 0, breakdown: [] };
  
  const rates = UTILITY_AREA_BASE_RATES.office;
  const times = UTILITY_AREA_TIME_RATES.office;
  const breakdown: AreaPricingResult['breakdown'] = [];
  
  // Base price + size modifier
  let price = rates.base + rates.sizeModifiers[config.size];
  let time = times.base + times.sizeModifiers[config.size];
  
  breakdown.push({ label: `Office (${config.size})`, value: price, type: 'price' });
  
  // Desks (first desk included in base)
  if (config.desks > 1) {
    const deskPrice = (config.desks - 1) * rates.deskRate;
    price += deskPrice;
    time += (config.desks - 1) * times.deskTime;
    breakdown.push({ label: 'Additional Desks', value: deskPrice, type: 'price' });
  }
  
  // Shelving
  if (config.hasShelving) {
    price += rates.shelvingRate;
    time += times.shelvingTime;
    breakdown.push({ label: 'Bookshelf Detail', value: rates.shelvingRate, type: 'price' });
  }
  
  // Windows + Blinds
  const windowTime = config.openings.windowCount * times.windowTime;
  const blindsTime = times.blindsTime[config.openings.blindsType] * config.openings.windowCount;
  time += windowTime + blindsTime;
  
  // Hazards (time only)
  if (config.hazards.dustBuildup) time += times.hazardTimes.dustBuildup;
  if (config.hazards.paperClutter) time += times.hazardTimes.paperClutter;
  if (config.hazards.cableManagement) time += times.hazardTimes.cableManagement;
  
  // Trash bags (time only)
  time += config.detail.trashBags * 3;
  
  // Deep clean multiplier
  if (isDeep) {
    price = Math.round(price * rates.deepMultiplier);
  }
  
  return { price: Math.round(price), timeMinutes: Math.round(time), breakdown };
}

/**
 * Calculate Laundry area pricing and time
 */
function calculateLaundryArea(config: LaundryAreaConfig, isDeep: boolean): AreaPricingResult {
  if (!config.enabled) return { price: 0, timeMinutes: 0, breakdown: [] };
  
  const rates = UTILITY_AREA_BASE_RATES.laundry;
  const times = UTILITY_AREA_TIME_RATES.laundry;
  const breakdown: AreaPricingResult['breakdown'] = [];
  
  // Base price by type and size
  const typeRates = config.type === 'closet' ? rates.closet : rates.room;
  const typeTimes = config.type === 'closet' ? times.closet : times.room;
  
  let price: number = typeRates[config.size];
  let time: number = typeTimes[config.size];
  
  breakdown.push({ 
    label: `Laundry ${config.type === 'closet' ? 'Closet' : 'Room'} (${config.size})`, 
    value: price, 
    type: 'price' 
  });
  
  // Sink
  if (config.hasSink) {
    price += rates.sinkRate;
    time += times.sinkTime;
    breakdown.push({ label: 'Utility Sink', value: rates.sinkRate, type: 'price' });
  }
  
  // Cabinets
  if (config.hasCabinets) {
    price += rates.cabinetRate;
    time += times.cabinetTime;
    breakdown.push({ label: 'Laundry Cabinets', value: rates.cabinetRate, type: 'price' });
  }
  
  // Hazards (time only)
  if (config.hazards.lintBuildup) time += times.hazardTimes.lintBuildup;
  if (config.hazards.detergentSpills) time += times.hazardTimes.detergentSpills;
  
  // Trash bags (time only)
  time += config.detail.trashBags * 3;
  
  // Deep clean multiplier
  if (isDeep) {
    price = Math.round(price * rates.deepMultiplier);
  }
  
  return { price: Math.round(price), timeMinutes: Math.round(time), breakdown };
}

/**
 * Calculate Garage area pricing and time
 */
function calculateGarageArea(config: GarageAreaConfig, isDeep: boolean): AreaPricingResult {
  if (!config.enabled) return { price: 0, timeMinutes: 0, breakdown: [] };
  
  const rates = UTILITY_AREA_BASE_RATES.garage;
  const times = UTILITY_AREA_TIME_RATES.garage;
  const breakdown: AreaPricingResult['breakdown'] = [];
  
  // Base price by capacity
  let price = rates.perCar[config.capacity];
  let time = times.perCar[config.capacity];
  
  breakdown.push({ label: `${config.capacity}-Car Garage`, value: price, type: 'price' });
  
  // Storage level
  const storagePriceMod = rates.storageModifiers[config.storageLevel] as number;
  const storageTimeMod = times.storageModifiers[config.storageLevel] as number;
  price += storagePriceMod;
  time += storageTimeMod;
  if (storagePriceMod > 0) {
    breakdown.push({ label: 'Heavy Storage', value: storagePriceMod, type: 'price' });
  }
  
  // Floor condition
  price += rates.floorConditionModifiers[config.floorCondition];
  
  // Oil stains
  if (config.hasOilStains) {
    price += rates.oilStainsRate;
    time += times.oilStainsTime;
    breakdown.push({ label: 'Oil Stain Treatment', value: rates.oilStainsRate, type: 'price' });
  }
  
  // Shelving
  if (config.hasShelving) {
    price += rates.shelvingRate;
    time += times.shelvingTime;
  }
  
  // Workbench
  if (config.hasWorkbench) {
    price += rates.workbenchRate;
    time += times.workbenchTime;
    breakdown.push({ label: 'Workbench Detail', value: rates.workbenchRate, type: 'price' });
  }
  
  // Hazards (time only)
  if (config.hazards.oilLeaks) time += times.hazardTimes.oilLeaks;
  if (config.hazards.heavyDebris) time += times.hazardTimes.heavyDebris;
  
  // Trash bags (time only)
  time += config.detail.trashBags * 3;
  
  return { price: Math.round(price), timeMinutes: Math.round(time), breakdown };
}

/**
 * Calculate Patio/Balcony area pricing and time
 */
function calculatePatioArea(config: PatioAreaConfig): AreaPricingResult {
  if (!config.enabled) return { price: 0, timeMinutes: 0, breakdown: [] };
  
  const rates = UTILITY_AREA_BASE_RATES.patio;
  const times = UTILITY_AREA_TIME_RATES.patio;
  const breakdown: AreaPricingResult['breakdown'] = [];
  
  // Base price by size
  let price = rates.sizeRates[config.size];
  let time = times.sizeTimes[config.size];
  
  const typeLabel = config.type === 'balcony' ? 'Balcony' : 
                    config.type === 'terrace' ? 'Terrace' :
                    config.type === 'yard' ? 'Yard Area' : 'Patio';
  breakdown.push({ label: `${typeLabel} (${config.size})`, value: price, type: 'price' });
  
  // Surface type modifier
  price += rates.surfaceModifiers[config.surfaceType];
  time += times.surfaceModifiers[config.surfaceType];
  
  // Furniture
  if (config.hasFurniture) {
    price += rates.furnitureRate;
    time += times.furnitureTime;
    breakdown.push({ label: 'Outdoor Furniture', value: rates.furnitureRate, type: 'price' });
  }
  
  // Glass railing
  if (config.hasGlassRailing) {
    price += rates.glassRailingRate;
    time += times.glassRailingTime;
    breakdown.push({ label: 'Glass Railing', value: rates.glassRailingRate, type: 'price' });
  }
  
  // Sliding doors
  if (config.openings.slidingDoorCount > 0) {
    const doorPrice = config.openings.slidingDoorCount * rates.slidingDoorRate;
    const doorTime = config.openings.slidingDoorCount * times.slidingDoorTime;
    price += doorPrice;
    time += doorTime;
    if (config.openings.slidingDoorCount > 1) {
      breakdown.push({ label: 'Sliding Doors', value: doorPrice, type: 'price' });
    }
  }
  
  return { price: Math.round(price), timeMinutes: Math.round(time), breakdown };
}

// ============= PREMIUM SPACES PRICING =============
// NOTE: Entryway removed - absorbed into Home Entry (free/logistics only)

/**
 * Premium Spaces pricing rates (Mudroom, Den only)
 * Single source of truth - NO pricing in contracts
 */
export const PREMIUM_SPACE_RATES = {
  mudroom: {
    sizeRates: { small: 10, medium: 15, large: 25 } as Record<string, number>,
    sizeTimes: { small: 12, medium: 18, large: 25 } as Record<string, number>,
    builtInsPrice: 8, builtInsTime: 8,
    benchPrice: 3, benchTime: 3,
    petAreaPrice: 6, petAreaTime: 6,
    heavySoilRates: { none: 0, light: 0, heavy: 10 } as Record<MudroomSoilLevel, number>,
    heavySoilTimes: { none: 0, light: 5, heavy: 15 } as Record<MudroomSoilLevel, number>,
    baseboardPrice: 6, baseboardTime: 5,
    deepMultiplier: 1.2,
  },
  den: {
    sizeRates: { small: 10, medium: 15, large: 25 } as Record<string, number>,
    sizeTimes: { small: 15, medium: 22, large: 30 } as Record<string, number>,
    shelvingPrice: 10, shelvingTime: 10,
    useModifiers: { office: 0, playroom: 8, media: 6, gym: 12, guest: 0, general: 0 } as Record<string, number>,
    clutterModifiers: { low: 0, medium: 5, high: 10 } as Record<DenClutterLevel, number>,
    clutterTimes: { low: 0, medium: 8, high: 15 } as Record<DenClutterLevel, number>,
    equipmentPrice: 12, equipmentTime: 10,
    baseboardPrice: 6, baseboardTime: 5,
    deepMultiplier: 1.3,
  },
} as const;

/**
 * Calculate Mudroom area pricing and time
 * SIMPLIFIED: Focus on cleaning-relevant fields
 */
function calculateMudroomArea(config: MudroomAreaConfig, isDeep: boolean): AreaPricingResult {
  if (!config.enabled) return { price: 0, timeMinutes: 0, breakdown: [] };
  
  const rates = PREMIUM_SPACE_RATES.mudroom;
  const breakdown: AreaPricingResult['breakdown'] = [];
  
  // Base price + time by size
  let price: number = rates.sizeRates[config.size] ?? rates.sizeRates.medium;
  let time: number = rates.sizeTimes[config.size] ?? rates.sizeTimes.medium;
  
  breakdown.push({ label: `Mudroom (${config.size})`, value: price, type: 'price' });
  
  // Built-ins/cubbies
  if (config.hasBuiltInsCubbies) {
    price += rates.builtInsPrice;
    time += rates.builtInsTime;
    breakdown.push({ label: 'Built-in Cubbies', value: rates.builtInsPrice, type: 'price' });
  }
  
  // Bench
  if (config.hasBench) {
    price += rates.benchPrice;
    time += rates.benchTime;
  }
  
  // Pet area
  if (config.hasPetArea) {
    price += rates.petAreaPrice;
    time += rates.petAreaTime;
    breakdown.push({ label: 'Pet Area', value: rates.petAreaPrice, type: 'price' });
  }
  
  // Heavy soil (mud/sand level)
  const soilPrice = rates.heavySoilRates[config.heavySoil] || 0;
  const soilTime = rates.heavySoilTimes[config.heavySoil] || 0;
  if (soilPrice > 0) {
    price += soilPrice;
    breakdown.push({ label: 'Heavy Soil Treatment', value: soilPrice, type: 'price' });
  }
  time += soilTime;
  
  // Baseboards
  if (config.baseboardsIncluded) {
    price += rates.baseboardPrice;
    time += rates.baseboardTime;
  }
  
  // Deep clean multiplier
  if (isDeep) {
    price = Math.round(price * rates.deepMultiplier);
    time = Math.round(time * rates.deepMultiplier);
  }
  
  return { price: Math.round(price), timeMinutes: Math.round(time), breakdown };
}

/**
 * Calculate Den/Bonus Room area pricing and time
 * SIMPLIFIED: Focus on cleaning-relevant fields
 */
function calculateDenArea(config: DenAreaConfig, isDeep: boolean): AreaPricingResult {
  if (!config.enabled) return { price: 0, timeMinutes: 0, breakdown: [] };
  
  const rates = PREMIUM_SPACE_RATES.den;
  const breakdown: AreaPricingResult['breakdown'] = [];
  
  // Base price + time by size
  let price: number = rates.sizeRates[config.size] ?? rates.sizeRates.medium;
  let time: number = rates.sizeTimes[config.size] ?? rates.sizeTimes.medium;
  
  breakdown.push({ label: `Den (${config.size})`, value: price, type: 'price' });
  
  // Primary use modifier
  const useModifier = rates.useModifiers[config.primaryUse] || 0;
  if (useModifier > 0) {
    price += useModifier;
    breakdown.push({ label: `${config.primaryUse} Setup`, value: useModifier, type: 'price' });
  }
  
  // Clutter level modifier
  const clutterPrice = rates.clutterModifiers[config.clutterLevel] || 0;
  const clutterTime = rates.clutterTimes[config.clutterLevel] || 0;
  if (clutterPrice > 0) {
    price += clutterPrice;
    breakdown.push({ label: 'High Clutter', value: clutterPrice, type: 'price' });
  }
  time += clutterTime;
  
  // Built-in shelving
  if (config.hasBuiltInShelving) {
    price += rates.shelvingPrice;
    time += rates.shelvingTime;
    breakdown.push({ label: 'Built-in Shelving', value: rates.shelvingPrice, type: 'price' });
  }
  
  // Special equipment
  if (config.hasSpecialEquipment) {
    price += rates.equipmentPrice;
    time += rates.equipmentTime;
    breakdown.push({ label: 'Special Equipment', value: rates.equipmentPrice, type: 'price' });
  }
  
  // Baseboards
  if (config.baseboardsIncluded) {
    price += rates.baseboardPrice;
    time += rates.baseboardTime;
  }
  
  // Deep clean multiplier
  if (isDeep) {
    price = Math.round(price * rates.deepMultiplier);
    time = Math.round(time * rates.deepMultiplier);
  }
  
  return { price: Math.round(price), timeMinutes: Math.round(time), breakdown };
}

// ============= STUDIO MAIN SPACE PRICING =============

/**
 * Studio Main Space pricing rates
 * Replaces Living + Dining + Bedroom pricing for studios
 */
export const STUDIO_MAIN_SPACE_RATES = {
  density: {
    light:  { std: 25, deep: 45 },
    normal: { std: 35, deep: 60 },
    heavy:  { std: 45, deep: 80 },
  } as Record<StudioFurnitureDensity, { std: number; deep: number }>,
  time: {
    light:  { std: 25, deep: 40 },
    normal: { std: 35, deep: 55 },
    heavy:  { std: 45, deep: 70 },
  } as Record<StudioFurnitureDensity, { std: number; deep: number }>,
  // Structure type modifiers (TIME ONLY - no price change)
  structureModifiers: {
    apartment_unit: { time: 0 },      // Standard
    adu_attached: { time: 5 },        // Slightly more complex access
    adu_detached: { time: 10 },       // Separate structure, more setup
  } as Record<string, { time: number }>,
  // Size modifiers (TIME ONLY - no price change)
  sizeModifiers: {
    under_400: { time: -10 },         // Smaller = faster
    '400_600': { time: 0 },           // Base
    '600_800': { time: 10 },          // Larger
    over_800: { time: 20 },           // Large studio
  } as Record<string, { time: number }>,
  modifiers: {
    petHair: { price: 0, time: 10 },
    clutterHeavy: { price: 5, time: 15 },
    deskArea: { price: 0, time: 5 },
    closet: { price: 0, time: 5 },
    balconyDoor: { price: 0, time: 3 },
    tvArea: { price: 0, time: 3 },
  },
} as const;

/**
 * Calculate Studio Main Space pricing and time
 * This replaces Living + Dining + Bedroom calculations for studios
 */
export function calculateStudioMainSpaceArea(
  config: StudioMainSpaceConfig,
  isDeep: boolean
): AreaPricingResult {
  if (!config.enabled) return { price: 0, timeMinutes: 0, breakdown: [] };
  
  const rates = STUDIO_MAIN_SPACE_RATES;
  const breakdown: AreaPricingResult['breakdown'] = [];
  
  // Base by density
  const densityRate = rates.density[config.furnitureDensity];
  let price = isDeep ? densityRate.deep : densityRate.std;
  let time = isDeep 
    ? rates.time[config.furnitureDensity].deep 
    : rates.time[config.furnitureDensity].std;
  
  breakdown.push({ 
    label: `Studio Main (${config.furnitureDensity})`, 
    value: price, 
    type: 'price' 
  });
  
  // Structure type modifier (TIME ONLY)
  const structureType = config.structureType || 'apartment_unit';
  const structureMod = rates.structureModifiers[structureType];
  if (structureMod) {
    time += structureMod.time;
  }
  
  // Size modifier (TIME ONLY)
  const studioSize = config.studioSize || '400_600';
  const sizeMod = rates.sizeModifiers[studioSize];
  if (sizeMod) {
    time += sizeMod.time;
  }
  
  // Micro modifiers for real-world accuracy
  if (config.petHairRisk) {
    time += rates.modifiers.petHair.time;
  }
  if (config.clutterLevel === 'heavy') {
    price += rates.modifiers.clutterHeavy.price;
    time += rates.modifiers.clutterHeavy.time;
    breakdown.push({ label: 'Heavy Clutter', value: 5, type: 'price' });
  }
  if (config.hasDeskArea) time += rates.modifiers.deskArea.time;
  if (config.hasCloset) time += rates.modifiers.closet.time;
  if (config.hasBalconyDoor) time += rates.modifiers.balconyDoor.time;
  if (config.hasTvArea) time += rates.modifiers.tvArea.time;
  
  return { price: Math.round(price), timeMinutes: Math.round(time), breakdown };
}

// ============= UNIFIED PRICING FUNCTION =============

/** All mapped area keys (Utility + Premium Spaces + Studio) */
export type MappedAreaKey = 'office' | 'laundry' | 'garage' | 'patio' | 'mudroom' | 'den' | 'studio_main_space';

/** Legacy alias for backward compatibility */
export type UtilityAreaKey = 'office' | 'laundry' | 'garage' | 'patio';

/**
 * Calculate total for a single area by key
 * This is the SINGLE function used by Your Cleaning Total, Review, PDF, and Payloads
 * Supports all 7 mapped areas (4 utility + 2 premium + 1 studio)
 */
export function calculateAreaTotal(
  areaKey: MappedAreaKey,
  config: OfficeAreaConfig | LaundryAreaConfig | GarageAreaConfig | PatioAreaConfig | MudroomAreaConfig | DenAreaConfig | StudioMainSpaceConfig,
  isDeep: boolean
): AreaPricingResult {
  switch (areaKey) {
    case 'office':
      return calculateOfficeArea(config as OfficeAreaConfig, isDeep);
    case 'laundry':
      return calculateLaundryArea(config as LaundryAreaConfig, isDeep);
    case 'garage':
      return calculateGarageArea(config as GarageAreaConfig, isDeep);
    case 'patio':
      return calculatePatioArea(config as PatioAreaConfig);
    case 'mudroom':
      return calculateMudroomArea(config as MudroomAreaConfig, isDeep);
    case 'den':
      return calculateDenArea(config as DenAreaConfig, isDeep);
    case 'studio_main_space':
      return calculateStudioMainSpaceArea(config as StudioMainSpaceConfig, isDeep);
    default:
      return { price: 0, timeMinutes: 0, breakdown: [] };
  }
}

/**
 * Calculate totals for all enabled mapped areas (utility + premium + studio)
 * Returns combined price, time, and per-area breakdown
 * 
 * This is the SINGLE AGGREGATOR for all 7 mapped areas.
 */
export function calculateAllMappedAreas(
  areas: HomeMappingAreas,
  isDeep: boolean
): {
  totalPrice: number;
  totalTimeMinutes: number;
  perArea: Record<MappedAreaKey, AreaPricingResult>;
  enabledAreas: MappedAreaKey[];
} {
  const allKeys: MappedAreaKey[] = ['office', 'laundry', 'garage', 'patio', 'mudroom', 'den', 'studio_main_space'];
  
  const perArea = {} as Record<MappedAreaKey, AreaPricingResult>;
  const enabledAreas: MappedAreaKey[] = [];
  let totalPrice = 0;
  let totalTimeMinutes = 0;
  
  for (const key of allKeys) {
    // Map registry key to context key for access
    const contextKey = key === 'studio_main_space' ? 'studioMainSpace' : key;
    const config = areas[contextKey as keyof HomeMappingAreas];
    
    if (!config) {
      perArea[key] = { price: 0, timeMinutes: 0, breakdown: [] };
      continue;
    }
    
    const result = calculateAreaTotal(key, config as any, isDeep);
    
    perArea[key] = result;
    
    if (result.price > 0 || result.timeMinutes > 0) {
      enabledAreas.push(key);
      totalPrice += result.price;
      totalTimeMinutes += result.timeMinutes;
    }
  }
  
  return {
    totalPrice,
    totalTimeMinutes,
    perArea,
    enabledAreas,
  };
}

/**
 * Legacy function - calculates only utility areas (backward compatibility)
 */
export function calculateAllUtilityAreasTotal(
  areas: HomeMappingAreas,
  isDeep: boolean
): {
  totalPrice: number;
  totalTimeMinutes: number;
  perArea: Record<UtilityAreaKey, AreaPricingResult>;
  enabledAreas: UtilityAreaKey[];
} {
  const areaKeys: UtilityAreaKey[] = ['office', 'laundry', 'garage', 'patio'];
  
  const perArea = {} as Record<UtilityAreaKey, AreaPricingResult>;
  const enabledAreas: UtilityAreaKey[] = [];
  let totalPrice = 0;
  let totalTimeMinutes = 0;
  
  for (const key of areaKeys) {
    const config = areas[key];
    const result = calculateAreaTotal(key, config, isDeep);
    
    perArea[key] = result;
    
    if (result.price > 0 || result.timeMinutes > 0) {
      enabledAreas.push(key);
      totalPrice += result.price;
      totalTimeMinutes += result.timeMinutes;
    }
  }
  
  return {
    totalPrice,
    totalTimeMinutes,
    perArea,
    enabledAreas,
  };
}

// ============= SERIALIZATION FOR PAYLOADS =============

export interface UtilityAreaPayload {
  areaKey: UtilityAreaKey;
  enabled: boolean;
  type?: string;
  size?: string;
  floorLevel?: number | null;
  ceilingHeight?: string | null;
  windowCount?: number;
  blindsType?: string;
  price: number;
  timeMinutes: number;
  configSummary: string;
}

/**
 * Serialize utility areas for Zapier/Web3Forms payloads
 */
export function serializeUtilityAreasForPayload(
  areas: HomeMappingAreas,
  isDeep: boolean
): {
  utilityAreas: UtilityAreaPayload[];
  totalPrice: number;
  totalTimeMinutes: number;
  mappingStatus: 'complete' | 'partial' | 'none';
} {
  const totals = calculateAllUtilityAreasTotal(areas, isDeep);
  
  const utilityAreas: UtilityAreaPayload[] = [];
  
  // Office
  if (areas.office.enabled) {
    const result = totals.perArea.office;
    utilityAreas.push({
      areaKey: 'office',
      enabled: true,
      size: areas.office.size,
      floorLevel: areas.office.floor.floorLevel,
      ceilingHeight: areas.office.ceiling.ceilingHeight,
      windowCount: areas.office.openings.windowCount,
      blindsType: areas.office.openings.blindsType,
      price: result.price,
      timeMinutes: result.timeMinutes,
      configSummary: `${areas.office.size} office, ${areas.office.desks} desk(s)${areas.office.hasShelving ? ', shelving' : ''}`,
    });
  }
  
  // Laundry
  if (areas.laundry.enabled) {
    const result = totals.perArea.laundry;
    utilityAreas.push({
      areaKey: 'laundry',
      enabled: true,
      type: areas.laundry.type,
      size: areas.laundry.size,
      floorLevel: areas.laundry.floor.floorLevel,
      ceilingHeight: areas.laundry.ceiling.ceilingHeight,
      windowCount: areas.laundry.openings.windowCount,
      price: result.price,
      timeMinutes: result.timeMinutes,
      configSummary: `${areas.laundry.size} ${areas.laundry.type}${areas.laundry.hasSink ? ', sink' : ''}${areas.laundry.hasCabinets ? ', cabinets' : ''}`,
    });
  }
  
  // Garage
  if (areas.garage.enabled) {
    const result = totals.perArea.garage;
    utilityAreas.push({
      areaKey: 'garage',
      enabled: true,
      type: `${areas.garage.capacity}-car`,
      price: result.price,
      timeMinutes: result.timeMinutes,
      configSummary: `${areas.garage.capacity}-car, ${areas.garage.storageLevel} storage${areas.garage.hasOilStains ? ', oil stains' : ''}`,
    });
  }
  
  // Patio
  if (areas.patio.enabled) {
    const result = totals.perArea.patio;
    utilityAreas.push({
      areaKey: 'patio',
      enabled: true,
      type: areas.patio.type,
      size: areas.patio.size,
      floorLevel: areas.patio.floor.floorLevel,
      price: result.price,
      timeMinutes: result.timeMinutes,
      configSummary: `${areas.patio.size} ${areas.patio.type}${areas.patio.hasFurniture ? ', furniture' : ''}${areas.patio.hasGlassRailing ? ', glass railing' : ''}`,
    });
  }
  
  // Determine mapping status
  let mappingStatus: 'complete' | 'partial' | 'none' = 'none';
  if (utilityAreas.length > 0) {
    const hasIncomplete = utilityAreas.some(a => 
      (a.floorLevel === null && a.areaKey !== 'garage') ||
      (a.ceilingHeight === null && a.areaKey !== 'garage' && a.areaKey !== 'patio')
    );
    mappingStatus = hasIncomplete ? 'partial' : 'complete';
  }
  
  return {
    utilityAreas,
    totalPrice: totals.totalPrice,
    totalTimeMinutes: totals.totalTimeMinutes,
    mappingStatus,
  };
}

// ============= BATHROOM PRICING RE-EXPORTED =============
// Bathroom pricing functions moved to dedicated module: bathroomPricing.ts
// Re-exports are at the top of this file for backward compatibility
