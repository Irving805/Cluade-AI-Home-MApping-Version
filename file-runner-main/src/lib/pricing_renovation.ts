/**
 * Residential Renovation Cleaning Pricing Engine
 * Phase-locked logic: Rough Safety vs Final Punch-List
 * Multiplier system for occupancy, debris, and surface conditions
 * Premium Add-ons: Surface Restoration, Hidden Dust, Height Access, Exterior
 * NEW Groups: Sparkle Clean, Air Quality, Upholstery, Exterior Glass
 */

import { DebrisLevel, PaintOverspray, DebrisHaulSize, UpholsteryItems, ExteriorWindowTypes, RenovationBathroomCounts, KitchenSize } from '@/contexts/BookingContext';

// ===== TYPES =====
export type RenovationPhase = 'rough_safety' | 'final_punch_list';
export type OccupancyState = 'vacant_empty' | 'furnished_lived_in';
export type SurfaceRisk = 'standard_materials' | 'delicate_stone_wood';

export interface RenovationScope {
  phase: RenovationPhase;
  sqft: number;
  contractorsFinished: boolean;
  occupancy: OccupancyState;
  debrisLevel: DebrisLevel;
  surfaceRisk: SurfaceRisk;
  dumpsterOnSite: boolean;
  windowCount: number;
  hvacFilters: boolean;
  // Property Composition
  bedrooms: number;
  bathrooms: RenovationBathroomCounts;
  hasNewKitchen: boolean;
  kitchenSize: KitchenSize;
  // Scope definition
  hasNewTiling: boolean;
  hasNewCarpets: boolean;
  hasNewWindows: boolean;
  hasNewCabinetry: boolean;
  // Category 1: Surface Restoration
  groutHazeSqft: number;
  paintOverspray: PaintOverspray;
  floorPolishing: boolean;
  // Category 2: Hidden Dust
  insideCabinetry: boolean;
  applianceCount: number;
  carpetExtraction: boolean;
  carpetExtractionSqft: number;
  // Category 3: Height & Safety
  highCeilings: boolean;
  // Category 4: Exterior & Waste
  pressureWashing: boolean;
  debrisHaulSize: DebrisHaulSize;
  // Group 1: Sparkle Clean
  sparkleClean: boolean;
  // Group 2: Air Quality
  ventCoverCount: number;
  ductCleaningCoordination: boolean;
  // Group 3: Upholstery
  upholsteryItems: UpholsteryItems;
  // Group 4: Exterior Glass
  exteriorWindows: ExteriorWindowTypes;
  hasExteriorPaintSplatter: boolean;
}

export const initialRenovationScope: RenovationScope = {
  phase: 'final_punch_list',
  sqft: 0,
  contractorsFinished: true,
  occupancy: 'vacant_empty',
  debrisLevel: 'broom_swept',
  surfaceRisk: 'standard_materials',
  dumpsterOnSite: true,
  windowCount: 0,
  hvacFilters: false,
  bedrooms: 0,
  bathrooms: { master: 0, full: 0, half: 0 },
  hasNewKitchen: false,
  kitchenSize: 'standard',
  hasNewTiling: false,
  hasNewCarpets: false,
  hasNewWindows: false,
  hasNewCabinetry: false,
  groutHazeSqft: 0,
  paintOverspray: 'none',
  floorPolishing: false,
  insideCabinetry: false,
  applianceCount: 0,
  carpetExtraction: false,
  carpetExtractionSqft: 0,
  highCeilings: false,
  pressureWashing: false,
  debrisHaulSize: 'none',
  sparkleClean: false,
  ventCoverCount: 0,
  ductCleaningCoordination: false,
  upholsteryItems: { sofas: 0, armchairs: 0, diningChairs: 0, mattresses: 0 },
  exteriorWindows: { standardPanes: 0, pictureWindows: 0, slidingDoors: 0, skylights: 0 },
  hasExteriorPaintSplatter: false,
};

// ===== RATE CONFIGURATION =====
const BASE_RATES: Record<RenovationPhase, number> = {
  rough_safety: 0.22,
  final_punch_list: 0.40,
};

const OCCUPANCY_MULTIPLIERS: Record<OccupancyState, number> = {
  vacant_empty: 1.0,
  furnished_lived_in: 1.5,
};

const DEBRIS_MULTIPLIERS: Record<DebrisLevel, number> = {
  broom_swept: 1.0,
  standard_debris: 1.25,
  heavy_haul: 1.60,
};

const SURFACE_RISK_MULTIPLIERS: Record<SurfaceRisk, number> = {
  standard_materials: 1.0,
  delicate_stone_wood: 1.30,
};

// Legacy logistics costs
const LOGISTICS_COSTS = {
  sticker_removal: 18.00,
  filter_change: 35.00,
  bagging_fee: 175.00,
  min_deployment: 350,
};

// ===== PREMIUM ADD-ON PRICING =====
export const ADDON_PRICES = {
  // Category 1: Surface Restoration
  grout_haze_per_sqft: 0.45,
  paint_overspray_light: 75,
  paint_overspray_moderate: 175,
  paint_overspray_heavy: 325,
  floor_polishing_per_sqft: 0.25,
  
  // Category 2: Hidden Dust
  inside_cabinetry: 125,
  appliance_detail_each: 35,
  carpet_extraction_per_sqft: 0.18, // Updated for precision sqft pricing
  
  // Category 3: Height Access
  high_ceiling_surcharge: 150,
  
  // Category 4: Exterior
  pressure_washing: 195,
  debris_haul_small: 125,
  debris_haul_truck: 375,
  
  // NEW Group 1: Sparkle Clean (Dust Settling Protocol)
  sparkle_clean_percent: 0.25,
  sparkle_clean_minimum: 150,
  
  // NEW Group 2: Advanced Air Quality
  vent_cover_detail: 10,
  duct_cleaning_coordination: 295,
  
  // NEW Group 3: Upholstery (Furnished Only)
  upholstery_sofa: 85,
  upholstery_armchair: 45,
  upholstery_dining_chair: 15,
  upholstery_mattress: 65,
  
  // NEW Group 4: Exterior Glass (Window Types)
  exterior_standard_pane: 12,
  exterior_picture_window: 35,
  exterior_sliding_door: 45,
  exterior_skylight: 75,
  exterior_paint_splatter_surcharge: 8,
};

// ===== PROPERTY DENSITY SURCHARGES (Work Complexity) =====
export const ROOM_SURCHARGES = {
  // Bathrooms are "hot spots" - most time-intensive for post-reno
  bathroom_master: 75,   // New fixtures, tile grout, vanity detail
  bathroom_full: 55,     // Tub/shower, toilet, vanity
  bathroom_half: 25,     // Toilet + sink only
  
  // Bedroom vertical cleaning (walls, baseboards, closets, vents)
  bedroom_surcharge: 35, // Per bedroom
  
  // Kitchen scaling based on size
  kitchen_galley: 45,
  kitchen_standard: 75,
  kitchen_open_concept: 95,
  kitchen_chef: 125,
};

// Time additions per room (in minutes)
const ROOM_TIME_MINUTES = {
  bathroom_master: 45,   // ~45 mins per master bath
  bathroom_full: 30,     // ~30 mins per full bath
  bathroom_half: 15,     // ~15 mins per half bath
  bedroom: 25,           // ~25 mins per bedroom (closet, doors, baseboards)
  kitchen_base: 45,      // Base kitchen time
};

// Production speeds for time estimation (sqft per clock hour, 2-person team)
const PRODUCTION_SPEEDS: Record<RenovationPhase, number> = {
  rough_safety: 800,
  final_punch_list: 400,
};

// ===== QUOTE RESULT =====
export interface RenovationQuote {
  total: number;
  hours: number;
  teamSize: number;
  rateApplied: number;
  breakdown: {
    laborBase: number;
    windowStickers: number;
    hvacFilters: number;
    baggingFee: number;
    // Premium add-on categories
    surfaceRestoration: number;
    hiddenDust: number;
    heightAccess: number;
    exterior: number;
    // NEW breakdown categories
    dustSettlement: number;
    airQuality: number;
    upholstery: number;
    exteriorGlass: number;
  };
  minimumApplied: boolean;
  addonsApplied: string[];
}

// ===== MAIN PRICING FUNCTION =====
export function calculateRenovationQuote(scope: RenovationScope): RenovationQuote {
  const addonsApplied: string[] = [];
  
  // A. Get base rate for phase
  let rate = BASE_RATES[scope.phase];

  // B. Apply friction multipliers (cascade)
  rate *= OCCUPANCY_MULTIPLIERS[scope.occupancy];
  rate *= DEBRIS_MULTIPLIERS[scope.debrisLevel];
  rate *= SURFACE_RISK_MULTIPLIERS[scope.surfaceRisk];

  // C. Calculate labor total
  const laborBase = scope.sqft * rate;

  // D. Calculate legacy logistics costs
  let windowStickers = 0;
  let hvacFiltersTotal = 0;
  let baggingFee = 0;

  // Window sticker removal only applies to Final Clean
  if (scope.phase === 'final_punch_list' && scope.windowCount > 0) {
    windowStickers = scope.windowCount * LOGISTICS_COSTS.sticker_removal;
    addonsApplied.push(`Window Stickers (${scope.windowCount})`);
  }

  // HVAC filter replacement
  if (scope.hvacFilters) {
    hvacFiltersTotal = LOGISTICS_COSTS.filter_change * 2;
    addonsApplied.push('HVAC Filters');
  }

  // Bagging fee if no dumpster
  if (!scope.dumpsterOnSite && (scope.phase === 'rough_safety' || scope.debrisLevel === 'heavy_haul')) {
    baggingFee = LOGISTICS_COSTS.bagging_fee;
    addonsApplied.push('Haul-Away Fee');
  }

  // E. PROPERTY COMPOSITION (Informational only - for time estimation, NOT pricing)
  let densityTimeMinutes = 0;
  
  // Bathroom time (construction hot spots - for labor estimation)
  if (scope.bathrooms) {
    const { master, full, half } = scope.bathrooms;
    densityTimeMinutes += master * ROOM_TIME_MINUTES.bathroom_master;
    densityTimeMinutes += full * ROOM_TIME_MINUTES.bathroom_full;
    densityTimeMinutes += half * ROOM_TIME_MINUTES.bathroom_half;
  }
  
  // Bedroom time (for labor estimation)
  if (scope.bedrooms > 0) {
    densityTimeMinutes += scope.bedrooms * ROOM_TIME_MINUTES.bedroom;
  }
  
  // Kitchen time
  if (scope.hasNewKitchen) {
    densityTimeMinutes += ROOM_TIME_MINUTES.kitchen_base;
  }

  // F. Calculate PREMIUM ADD-ONS
  
  // === Category 1: Surface Restoration ===
  let surfaceRestoration = 0;
  
  if (scope.groutHazeSqft > 0) {
    const groutCost = scope.groutHazeSqft * ADDON_PRICES.grout_haze_per_sqft;
    surfaceRestoration += groutCost;
    addonsApplied.push(`Grout Haze (${scope.groutHazeSqft} sqft)`);
  }
  
  if (scope.paintOverspray !== 'none') {
    let paintCost = 0;
    switch (scope.paintOverspray) {
      case 'light': paintCost = ADDON_PRICES.paint_overspray_light; break;
      case 'moderate': paintCost = ADDON_PRICES.paint_overspray_moderate; break;
      case 'heavy': paintCost = ADDON_PRICES.paint_overspray_heavy; break;
    }
    surfaceRestoration += paintCost;
    addonsApplied.push(`Paint Remediation (${scope.paintOverspray})`);
  }
  
  if (scope.floorPolishing && scope.sqft > 0) {
    const polishCost = scope.sqft * ADDON_PRICES.floor_polishing_per_sqft;
    surfaceRestoration += polishCost;
    addonsApplied.push('Floor Buff & Seal');
  }

  // === Category 2: Hidden Dust ===
  let hiddenDust = 0;
  
  if (scope.insideCabinetry) {
    hiddenDust += ADDON_PRICES.inside_cabinetry;
    addonsApplied.push('Inside Cabinetry');
  }
  
  if (scope.applianceCount > 0) {
    const applianceCost = scope.applianceCount * ADDON_PRICES.appliance_detail_each;
    hiddenDust += applianceCost;
    addonsApplied.push(`Appliance Detail (${scope.applianceCount})`);
  }
  
  // Carpet extraction with precise sqft (or fallback to estimate)
  if (scope.carpetExtractionSqft > 0) {
    const extractionCost = scope.carpetExtractionSqft * ADDON_PRICES.carpet_extraction_per_sqft;
    hiddenDust += extractionCost;
    addonsApplied.push(`Carpet Extraction (${scope.carpetExtractionSqft} sqft)`);
  } else if (scope.carpetExtraction && scope.sqft > 0) {
    const carpetSqft = Math.round(scope.sqft * 0.3);
    const extractionCost = carpetSqft * ADDON_PRICES.carpet_extraction_per_sqft;
    hiddenDust += extractionCost;
    addonsApplied.push('Carpet Extraction');
  }

  // === Category 3: Height & Safety ===
  let heightAccess = 0;
  
  if (scope.highCeilings) {
    heightAccess = ADDON_PRICES.high_ceiling_surcharge;
    addonsApplied.push('High Ceiling Protocol');
  }

  // === Category 4: Exterior & Waste (legacy) ===
  let exterior = 0;
  
  if (scope.pressureWashing) {
    exterior += ADDON_PRICES.pressure_washing;
    addonsApplied.push('Pressure Washing');
  }
  
  if (scope.debrisHaulSize !== 'none') {
    const haulCost = scope.debrisHaulSize === 'small' 
      ? ADDON_PRICES.debris_haul_small 
      : ADDON_PRICES.debris_haul_truck;
    exterior += haulCost;
    addonsApplied.push(`Debris Haul (${scope.debrisHaulSize})`);
  }

  // === NEW Group 1: Sparkle Clean (Dust Settlement) ===
  let dustSettlement = 0;
  
  if (scope.sparkleClean) {
    const baseForSparkle = laborBase + surfaceRestoration + hiddenDust;
    dustSettlement = Math.max(
      Math.round(baseForSparkle * ADDON_PRICES.sparkle_clean_percent),
      ADDON_PRICES.sparkle_clean_minimum
    );
    addonsApplied.push('Sparkle Clean (Return Visit)');
  }

  // === NEW Group 2: Advanced Air Quality ===
  let airQuality = 0;
  
  if (scope.ventCoverCount > 0) {
    airQuality += scope.ventCoverCount * ADDON_PRICES.vent_cover_detail;
    addonsApplied.push(`Vent Cover Detail (${scope.ventCoverCount})`);
  }
  
  if (scope.ductCleaningCoordination) {
    airQuality += ADDON_PRICES.duct_cleaning_coordination;
    addonsApplied.push('Duct Cleaning Coordination');
  }

  // === NEW Group 3: Upholstery (Furnished Only) ===
  let upholstery = 0;
  
  if (scope.occupancy === 'furnished_lived_in' && scope.upholsteryItems) {
    const { sofas, armchairs, diningChairs, mattresses } = scope.upholsteryItems;
    upholstery += sofas * ADDON_PRICES.upholstery_sofa;
    upholstery += armchairs * ADDON_PRICES.upholstery_armchair;
    upholstery += diningChairs * ADDON_PRICES.upholstery_dining_chair;
    upholstery += mattresses * ADDON_PRICES.upholstery_mattress;
    
    if (upholstery > 0) {
      const items: string[] = [];
      if (sofas > 0) items.push(`${sofas} sofa`);
      if (armchairs > 0) items.push(`${armchairs} chair`);
      if (diningChairs > 0) items.push(`${diningChairs} dining`);
      if (mattresses > 0) items.push(`${mattresses} mattress`);
      addonsApplied.push(`Upholstery (${items.join(', ')})`);
    }
  }

  // === NEW Group 4: Exterior Glass (Window Types) ===
  let exteriorGlass = 0;
  
  if (scope.exteriorWindows) {
    const { standardPanes, pictureWindows, slidingDoors, skylights } = scope.exteriorWindows;
    const totalPanes = standardPanes + pictureWindows + slidingDoors + skylights;
    
    exteriorGlass += standardPanes * ADDON_PRICES.exterior_standard_pane;
    exteriorGlass += pictureWindows * ADDON_PRICES.exterior_picture_window;
    exteriorGlass += slidingDoors * ADDON_PRICES.exterior_sliding_door;
    exteriorGlass += skylights * ADDON_PRICES.exterior_skylight;
    
    if (scope.hasExteriorPaintSplatter && totalPanes > 0) {
      exteriorGlass += totalPanes * ADDON_PRICES.exterior_paint_splatter_surcharge;
      addonsApplied.push('Exterior Glass + Paint Removal');
    } else if (exteriorGlass > 0) {
      addonsApplied.push(`Exterior Glass (${totalPanes} panes)`);
    }
  }

  // G. Calculate total (Property Composition no longer affects price)
  let total = laborBase + windowStickers + hvacFiltersTotal + baggingFee +
              surfaceRestoration + hiddenDust + heightAccess + exterior +
              dustSettlement + airQuality + upholstery + exteriorGlass;

  // G. Apply minimum deployment charge
  const minimumApplied = total < LOGISTICS_COSTS.min_deployment;
  total = Math.max(Math.round(total), LOGISTICS_COSTS.min_deployment);

  // H. Time estimation
  const speed = PRODUCTION_SPEEDS[scope.phase];
  const adjustedSpeed = scope.occupancy === 'furnished_lived_in' ? speed * 0.7 : speed;
  let hours = Math.ceil(scope.sqft / adjustedSpeed);
  
  // Add time for add-ons
  if (scope.groutHazeSqft > 0) hours += Math.ceil(scope.groutHazeSqft / 200);
  if (scope.paintOverspray !== 'none') hours += scope.paintOverspray === 'heavy' ? 3 : 1;
  if (scope.insideCabinetry) hours += 2;
  if (scope.applianceCount > 0) hours += Math.ceil(scope.applianceCount * 0.5);
  if (scope.carpetExtractionSqft > 0) hours += Math.ceil(scope.carpetExtractionSqft / 300);
  else if (scope.carpetExtraction) hours += 2;
  if (scope.highCeilings) hours += 1;
  if (scope.pressureWashing) hours += 1;
  if (scope.sparkleClean) hours += 2;
  if (scope.ventCoverCount > 0) hours += Math.ceil(scope.ventCoverCount / 10);
  if (scope.ductCleaningCoordination) hours += 1;
  if (upholstery > 0) hours += 2;
  if (exteriorGlass > 0) hours += Math.ceil((scope.exteriorWindows?.standardPanes || 0) / 8) + 1;
  
  // Add property density time
  hours += Math.ceil(densityTimeMinutes / 60);

  // Team sizing
  const teamSize = hours > 10 ? 3 : 2;

  return {
    total,
    hours,
    teamSize,
    rateApplied: rate,
    breakdown: {
      laborBase: Math.round(laborBase),
      windowStickers,
      hvacFilters: hvacFiltersTotal,
      baggingFee,
      surfaceRestoration: Math.round(surfaceRestoration),
      hiddenDust: Math.round(hiddenDust),
      heightAccess,
      exterior,
      dustSettlement,
      airQuality,
      upholstery,
      exteriorGlass,
    },
    minimumApplied,
    addonsApplied,
  };
}

// ===== HELPER FUNCTIONS =====
export function getPhaseLabel(phase: RenovationPhase): string {
  return phase === 'rough_safety' ? 'Rough Clean (Safety)' : 'Final Punch-List';
}

export function getOccupancyLabel(occupancy: OccupancyState): string {
  return occupancy === 'vacant_empty' ? 'Vacant / Empty' : 'Furnished / Lived-In';
}

export function getSurfaceRiskLabel(surfaceRisk: SurfaceRisk): string {
  return surfaceRisk === 'standard_materials' ? 'Standard Materials' : 'Delicate (Stone/Wood)';
}

export function getDebrisLabel(debrisLevel: DebrisLevel): string {
  switch (debrisLevel) {
    case 'broom_swept': return 'Dust Only';
    case 'standard_debris': return 'Scattered Debris';
    case 'heavy_haul': return 'Heavy Load';
    default: return 'Standard';
  }
}

export function getPaintOversprayLabel(intensity: PaintOverspray): string {
  switch (intensity) {
    case 'none': return 'None';
    case 'light': return 'Light (+$75)';
    case 'moderate': return 'Moderate (+$175)';
    case 'heavy': return 'Heavy (+$325)';
    default: return 'None';
  }
}

export function getDebrisHaulLabel(size: DebrisHaulSize): string {
  switch (size) {
    case 'none': return 'None';
    case 'small': return 'Small Load (+$125)';
    case 'truck': return 'Truck Load (+$375)';
    default: return 'None';
  }
}