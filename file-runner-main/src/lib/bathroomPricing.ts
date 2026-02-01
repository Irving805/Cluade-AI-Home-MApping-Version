/**
 * Bathroom Pricing — Dedicated SSOT for Bathroom Inventory Pricing
 * 
 * This module handles all pricing calculations for the Bathroom Mapping
 * Inventory system. Uses BATH_RATES/BATH_TIME from pricing_v2 as base,
 * adds modifiers for per-unit configuration.
 * 
 * PRINCIPLE: Single source of truth for bathroom pricing.
 * All UI (Modules, Sidebar, Review, PDF) must use these functions.
 * 
 * IMPORTANT: Uses PricingTier ('std' | 'deep') instead of boolean isDeep.
 * For LIVE_HERE and MOVING flows, tier is ALWAYS 'std' (standard rates).
 * "Deep Reset" is UX branding only - it does NOT change the pricing tier.
 */

import { BATH_RATES, BATH_TIME } from './pricing_v2';
import { createBathroomUnit } from './bathroomPresets';
import type { 
  BathroomInventory, 
  BathroomUnit, 
  BathroomType 
} from './bathroomMappingTypes';
import type { Situation } from '@/contexts/BookingContext';
import type { PricingTier } from './pricingTier';

// ============= PRICING RESULT TYPE =============

export interface BathroomPricingResult {
  price: number;
  timeMinutes: number;
  breakdown: Array<{ label: string; value: number; type: 'price' | 'time' }>;
}

// ============= BATHROOM UNIT PRICING RATES =============

/**
 * Bathroom Unit Pricing Rates
 * Time modifiers for per-unit configuration
 */
export const BATHROOM_UNIT_RATES = {
  // Time modifiers (in minutes)
  modifiers: {
    fixtures: {
      shower: { time: 0 },
      tub: { time: 5 },
      shower_tub: { time: 8 },
      none: { time: 0 },
    },
    vanity: {
      single: { time: 0 },
      double: { time: 5 },
    },
    glass: {
      none: { time: 0 },
      standard: { time: 5 },
      heavy: { time: 10, priceAdd: 5 },
    },
    tileLevel: {
      light: { time: 0 },
      normal: { time: 0 },
      heavy: { time: 10, priceAdd: 5 },
    },
    size: {
      small: { time: -5 },
      normal: { time: 0 },
      large: { time: 10 },
    },
    condition: {
      standard: { time: 0 },
      buildup: { time: 15, priceAdd: 8 },
      severe: { time: 25, priceAdd: 15 },
    },
    window: { time: 3 },
    ensuite: { time: 0 },  // Just logistics flag, no time impact
  },
} as const;

// ============= CALCULATION FUNCTIONS =============

/**
 * Calculate single bathroom unit pricing and time
 * 
 * @param unit - The bathroom unit configuration
 * @param tier - PricingTier ('std' | 'deep') - determines base rates
 */
export function calculateBathroomUnit(
  unit: BathroomUnit,
  tier: PricingTier
): BathroomPricingResult {
  const rates = BATHROOM_UNIT_RATES;
  const breakdown: BathroomPricingResult['breakdown'] = [];
  
  // Base price + time from BATH_RATES / BATH_TIME using tier directly
  let price = BATH_RATES[unit.type][tier];
  let time = BATH_TIME[unit.type][tier];
  
  breakdown.push({ 
    label: `${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)} Bath`, 
    value: price, 
    type: 'price' 
  });
  
  // Apply modifiers
  
  // Fixtures
  const fixturesMod = rates.modifiers.fixtures[unit.fixtures];
  time += fixturesMod.time;
  
  // Vanity
  const vanityMod = rates.modifiers.vanity[unit.vanity];
  time += vanityMod.time;
  
  // Glass
  const glassMod = rates.modifiers.glass[unit.glass];
  time += glassMod.time;
  if ('priceAdd' in glassMod && glassMod.priceAdd) {
    price += glassMod.priceAdd;
    breakdown.push({ label: 'Heavy Glass', value: glassMod.priceAdd, type: 'price' });
  }
  
  // Tile Level
  const tileMod = rates.modifiers.tileLevel[unit.tileLevel];
  time += tileMod.time;
  if ('priceAdd' in tileMod && tileMod.priceAdd) {
    price += tileMod.priceAdd;
    breakdown.push({ label: 'Heavy Grout', value: tileMod.priceAdd, type: 'price' });
  }
  
  // Size
  const sizeMod = rates.modifiers.size[unit.size];
  time += sizeMod.time;
  
  // Condition
  const conditionMod = rates.modifiers.condition[unit.condition];
  time += conditionMod.time;
  if ('priceAdd' in conditionMod && conditionMod.priceAdd) {
    price += conditionMod.priceAdd;
    breakdown.push({ label: 'Condition: ' + unit.condition, value: conditionMod.priceAdd, type: 'price' });
  }
  
  // Window
  if (unit.hasWindow) {
    time += rates.modifiers.window.time;
  }
  
  return { price: Math.round(price), timeMinutes: Math.round(time), breakdown };
}

/**
 * Calculate full bathroom inventory totals
 * If no inventory, falls back to legacy count-based calculation
 * 
 * @param inventory - The bathroom inventory
 * @param masterBaths - Legacy count of master baths
 * @param fullBaths - Legacy count of full baths
 * @param halfBaths - Legacy count of half baths
 * @param tier - PricingTier ('std' | 'deep') - determines base rates
 */
export function calculateBathroomInventoryTotals(
  inventory: BathroomInventory | undefined,
  masterBaths: number,
  fullBaths: number,
  halfBaths: number,
  tier: PricingTier
): { 
  totalPrice: number; 
  totalTime: number; 
  perUnit: BathroomPricingResult[];
  usedInventory: boolean;
} {
  // If no inventory or empty, use legacy counts with tier
  if (!inventory || !inventory.bathrooms || inventory.bathrooms.length === 0) {
    const totalPrice = 
      (masterBaths * BATH_RATES.master[tier]) +
      (fullBaths * BATH_RATES.full[tier]) +
      (halfBaths * BATH_RATES.half[tier]);
    const totalTime = 
      (masterBaths * BATH_TIME.master[tier]) +
      (fullBaths * BATH_TIME.full[tier]) +
      (halfBaths * BATH_TIME.half[tier]);
    
    return { 
      totalPrice: Math.round(totalPrice), 
      totalTime: Math.round(totalTime), 
      perUnit: [],
      usedInventory: false,
    };
  }
  
  // Use inventory for detailed calculation
  let totalPrice = 0;
  let totalTime = 0;
  const perUnit: BathroomPricingResult[] = [];
  
  for (const unit of inventory.bathrooms) {
    const result = calculateBathroomUnit(unit, tier);
    totalPrice += result.price;
    totalTime += result.timeMinutes;
    perUnit.push(result);
  }
  
  return { 
    totalPrice: Math.round(totalPrice), 
    totalTime: Math.round(totalTime), 
    perUnit,
    usedInventory: true,
  };
}

/**
 * Calculate legacy bathroom totals from counts only
 * For backward compatibility when inventory is not used
 * 
 * @param masterBaths - Count of master baths
 * @param fullBaths - Count of full baths
 * @param halfBaths - Count of half baths
 * @param tier - PricingTier ('std' | 'deep')
 */
export function calculateLegacyBathroomTotals(
  masterBaths: number,
  fullBaths: number,
  halfBaths: number,
  tier: PricingTier
): { totalPrice: number; totalTime: number } {
  const totalPrice = 
    (masterBaths * BATH_RATES.master[tier]) +
    (fullBaths * BATH_RATES.full[tier]) +
    (halfBaths * BATH_RATES.half[tier]);
  const totalTime = 
    (masterBaths * BATH_TIME.master[tier]) +
    (fullBaths * BATH_TIME.full[tier]) +
    (halfBaths * BATH_TIME.half[tier]);
  
  return { 
    totalPrice: Math.round(totalPrice), 
    totalTime: Math.round(totalTime)
  };
}

// ============= DISPLAY HELPERS =============

/**
 * Get pure base rate for display in QuickCountStepper
 * Returns the raw BATH_RATES value WITHOUT any modifiers
 * Used only for display - actual pricing still uses modifiers
 * 
 * @param type - Bathroom type (master, full, half)
 * @param tier - PricingTier ('std' | 'deep')
 */
export function getBathroomBaseRateForDisplay(
  type: 'master' | 'full' | 'half',
  tier: PricingTier
): number {
  return BATH_RATES[type][tier];
}

// ============= MARGINAL DELTA CALCULATION =============

/**
 * Calculate marginal cost to add one bathroom of a specific type
 * Uses T1-T0 simulation for accurate pricing including presets
 * 
 * This is used by QuickCountStepper to show accurate per-unit add cost
 * 
 * @param currentInventory - Current bathroom inventory
 * @param type - Type of bathroom to add
 * @param tier - PricingTier ('std' | 'deep') - determines base rates
 * @param situation - Situation context (affects preset defaults like condition)
 * @param propertyFloors - Number of floors for floor distribution
 */
export function calculateBathroomAddDelta(
  currentInventory: BathroomInventory | undefined,
  type: BathroomType,
  tier: PricingTier,
  situation: Situation,
  propertyFloors: number = 1
): number {
  // Get current counts from inventory
  const bathrooms = currentInventory?.bathrooms || [];
  const currentCounts = {
    master: bathrooms.filter(b => b.type === 'master').length,
    full: bathrooms.filter(b => b.type === 'full').length,
    half: bathrooms.filter(b => b.type === 'half').length,
  };
  
  // Calculate current total (T0) using tier
  const t0 = calculateBathroomInventoryTotals(
    currentInventory,
    currentCounts.master,
    currentCounts.full,
    currentCounts.half,
    tier
  ).totalPrice;
  
  // Simulate adding one unit of the requested type
  // NOTE: createBathroomUnit uses situation for preset defaults (e.g., condition=buildup for MOVING)
  // but the BASE PRICING TIER remains the same
  const newUnit = createBathroomUnit(type, currentCounts[type], situation, propertyFloors);
  const simulatedInventory: BathroomInventory = {
    version: currentInventory?.version || 1,
    bathrooms: [...bathrooms, newUnit],
  };
  
  // Calculate new total (T1) using tier
  const t1 = calculateBathroomInventoryTotals(
    simulatedInventory,
    currentCounts.master + (type === 'master' ? 1 : 0),
    currentCounts.full + (type === 'full' ? 1 : 0),
    currentCounts.half + (type === 'half' ? 1 : 0),
    tier
  ).totalPrice;
  
  return t1 - t0;  // Marginal delta
}
