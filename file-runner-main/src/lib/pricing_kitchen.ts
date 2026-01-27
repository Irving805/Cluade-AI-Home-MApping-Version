/**
 * Kitchen Pricing Logic — Multi-Factor SSOT Cabinet Pricing
 * 
 * SSOT for all kitchen addon pricing calculations.
 * Cabinets price is dynamic based on: Bedrooms + SQFT Range + Property Type + Override
 * Other kitchen addons have fixed prices.
 * 
 * SCOPE: "Inside Kitchen Cabinets" = LOWER/BASE cabinets + under-sink only.
 * Quick interior wipe-down + light detail.
 * EXCLUDES: upper cabinets, pantry inside, empty/organize, heavy degrease.
 */

import type { PropertyCategory } from './pricing';

// ============= CALIBRATION CONSTANTS (EASY TO ADJUST) =============
// Rate per minute for all kitchen add-ons (~$93/hr effective rate)
const RATE_PER_MIN = 1.55;

// ============= CABINET SIZE OVERRIDE TYPE =============
export type CabinetSizeOverride = 'small' | 'typical' | 'large';

// ============= CABINET COMPLEXITY TYPE (NEW: Phase 2) =============
export type CabinetComplexity = 'standard' | 'organized' | 'high';

// Complexity multipliers (apply to BOTH lower and upper cabinets)
const COMPLEXITY_FACTORS: Record<CabinetComplexity, number> = {
  standard: 1.00,   // Mostly single/double wall cabinets
  organized: 1.12,  // Pull-outs, dividers, tiered shelves
  high: 1.25,       // Corner lazy susans, many pullouts, complex organizers
};

// ============= DEGREASE SEVERITY TYPE =============
export type DegreaseLevel = 'light' | 'medium' | 'heavy';

// ============= KITCHEN ADDON FIXED PRICES =============

export const KITCHEN_ADDON_PRICES = {
  fridge_empty: 35,  // Fixed $35 — NEVER CHANGES
  oven: 35,
  hood: 25,
  // cabinets is DYNAMIC - not in fixed prices
  // upper_cabinets is DYNAMIC - not in fixed prices
  // kitchen_cabinets_degrease is DYNAMIC - not in fixed prices
} as const;

export const KITCHEN_ADDON_MINUTES = {
  fridge_empty: 20,
  oven: 25,
  hood: 15,
  // cabinets is DYNAMIC
  // upper_cabinets is DYNAMIC
  // kitchen_cabinets_degrease is DYNAMIC
} as const;

// ============= MULTI-FACTOR PRICING CONSTANTS =============

// Base minutes by bedroom count (proxy for family size/usage)
const BASE_MINUTES_BY_BEDROOMS: Record<number, number> = {
  0: 14,  // Studio
  1: 14,  // 1 Bed
  2: 18,  // 2 Bed
  3: 22,  // 3 Bed
  4: 28,  // 4 Bed
  5: 34,  // 5 Bed
  6: 40,  // 6+ Bed
};

// SQFT Factor mapping (matches UI sqft range enums)
const SQFT_FACTORS: Record<string, number> = {
  'SF_<600': 0.85,
  'SF_600_900': 0.90,
  'SF_900_1200': 0.95,
  'SF_1200_1500': 1.00,
  'SF_1500_2000': 1.05,
  'SF_2000_2500': 1.10,
  'SF_2500_3000': 1.15,
  'SF_3000_3500': 1.20,
  'SF_3500_4000': 1.25,
  'SF_4000_5000': 1.35,
  'SF_5000_7000': 1.50,
  'SF_7000+': 1.70,
};

// Structure factor by property type
const STRUCTURE_FACTORS: Record<string, number> = {
  apartment_condo: 0.90,
  apartment: 0.90,
  condo: 0.90,
  studio: 0.90,
  townhouse: 1.00,
  single_family: 1.10,
  house: 1.10,
};

// Cabinet size override factors
const CABINET_OVERRIDE_FACTORS: Record<CabinetSizeOverride, number> = {
  small: 0.85,
  typical: 1.00,
  large: 1.20,
};

// ============= VIRTUAL UNITS ENGINE CONSTANTS (Phase 2) =============

// Base upper cabinet units by bedroom count (realistic kitchen sizes)
const UPPER_CABINET_UNITS_BY_BEDROOMS: Record<number, number> = {
  0: 4,   // Studio - minimal upper cabinets
  1: 5,   // 1 Bed - small kitchen
  2: 7,   // 2 Bed - standard kitchen
  3: 9,   // 3 Bed - family kitchen
  4: 12,  // 4 Bed - larger kitchen
  5: 15,  // 5 Bed - large kitchen
  6: 18,  // 6+ Bed - estate kitchen
};

// Minutes per upper cabinet unit (base time)
const MIN_PER_UPPER_UNIT = 2.5;

// Workflow zone distribution (internal - no user selection)
// Zones: prep (lower grease), cooking (high grease), cleaning (medium grease)
const ZONE_DISTRIBUTION = {
  prep: { weight: 0.35, factor: 1.00 },
  cooking: { weight: 0.40, factor: 1.20 },  // Grease-prone = more time
  cleaning: { weight: 0.25, factor: 1.10 },
};

// ============= DEGREASE SEVERITY CONSTANTS =============
// Base minutes by severity (before sqft/structure factors)
const DEGREASE_BASE_MINUTES: Record<DegreaseLevel, number> = {
  light: 12,
  medium: 22,
  heavy: 35,
};

// ============= SIZE CATEGORY (for display) =============
type CabinetSizeCategory = 'XS' | 'S' | 'M' | 'L' | 'XL';

const CABINET_SIZE_BY_BEDROOMS: Record<number, CabinetSizeCategory> = {
  0: 'XS',  // Studio
  1: 'XS',  // 1 Bed
  2: 'S',   // 2 Bed
  3: 'M',   // 3 Bed
  4: 'L',   // 4 Bed
  5: 'XL',  // 5 Bed
  6: 'XL',  // 6+ Bed
};

// ============= MAIN CABINET PRICING FUNCTION =============

export interface KitchenCabinetPricingFactors {
  baseMinutes: number;
  sqftFactor: number;
  structureFactor: number;
  overrideFactor: number;
  ratePerMin: number;
}

export interface KitchenCabinetPricing {
  price: number;
  minutes: number;
  sizeCategory: CabinetSizeCategory;
  description: string;
  breakdownText: string;
  factors: KitchenCabinetPricingFactors;
  units?: number;  // Virtual units count (for upper cabinets display)
}

/**
 * Calculate dynamic kitchen cabinet pricing using 5 factors (now includes complexity).
 * 
 * Formula: 
 *   minutes = round(baseMinutes × sqftFactor × structureFactor × overrideFactor × complexityFactor)
 *   price = round(minutes × RATE_PER_MIN)
 * 
 * @param bedrooms - Number of bedrooms (0 = Studio, 6+ = 6)
 * @param sqftRange - Square footage range enum (e.g., 'SF_5000_7000')
 * @param propertyType - Property type (single_family, apartment_condo, townhouse)
 * @param cabinetOverride - User override: small | typical | large (default: typical)
 * @param cabinetComplexity - Interior complexity: standard | organized | high (default: standard)
 */
export function calculateKitchenCabinetsPrice(params: {
  bedrooms: number;
  propertyType?: PropertyCategory | string;
  sqftRange?: string;
  cabinetOverride?: CabinetSizeOverride;
  cabinetComplexity?: CabinetComplexity;
}): KitchenCabinetPricing {
  const { 
    bedrooms, 
    propertyType, 
    sqftRange,
    cabinetOverride = 'typical',
    cabinetComplexity = 'standard'
  } = params;
  
  // 1. Determine base minutes from bedrooms
  const clampedBeds = Math.min(Math.max(bedrooms, 0), 6);
  const baseMinutes = BASE_MINUTES_BY_BEDROOMS[clampedBeds] ?? 22;
  
  // 2. Get SQFT factor (default 1.0 if not provided or unknown)
  const sqftFactor = sqftRange && SQFT_FACTORS[sqftRange] 
    ? SQFT_FACTORS[sqftRange] 
    : 1.0;
  
  // 3. Get structure factor from property type
  const normalizedType = (propertyType || 'single_family').toLowerCase().replace(/[- ]/g, '_');
  const structureFactor = STRUCTURE_FACTORS[normalizedType] ?? 1.0;
  
  // 4. Get override factor
  const overrideFactor = CABINET_OVERRIDE_FACTORS[cabinetOverride] ?? 1.0;
  
  // 5. Get complexity factor (NEW: Phase 2)
  const complexityFactor = COMPLEXITY_FACTORS[cabinetComplexity] ?? 1.0;
  
  // 6. Calculate final minutes (now includes complexity)
  const rawMinutes = baseMinutes * sqftFactor * structureFactor * overrideFactor * complexityFactor;
  const finalMinutes = Math.round(rawMinutes);
  
  // 7. Calculate price using rate per minute
  const price = Math.round(finalMinutes * RATE_PER_MIN);
  
  // 8. Determine size category for display
  const sizeCategory = CABINET_SIZE_BY_BEDROOMS[clampedBeds] || 'M';
  
  // 9. Build human-readable labels
  const sizeLabels: Record<CabinetSizeCategory, string> = {
    XS: 'Extra Small',
    S: 'Small',
    M: 'Medium',
    L: 'Large',
    XL: 'Extra Large',
  };
  
  const bedLabel = clampedBeds === 0 ? 'Studio' : `${clampedBeds}${clampedBeds === 6 ? '+' : ''} bed`;
  const sqftLabel = sqftRange ? formatSqftLabel(sqftRange) : '';
  const structureLabel = formatStructureLabel(normalizedType);
  const overrideLabel = cabinetOverride;
  const complexityLabel = cabinetComplexity !== 'standard' ? cabinetComplexity : '';
  
  const description = `${sizeLabels[sizeCategory]} kitchen (${finalMinutes} min)`;
  const breakdownText = [bedLabel, sqftLabel, structureLabel, overrideLabel, complexityLabel]
    .filter(Boolean)
    .join(' · ');
  
  return {
    price,
    minutes: finalMinutes,
    sizeCategory,
    description,
    breakdownText,
    factors: {
      baseMinutes,
      sqftFactor,
      structureFactor,
      overrideFactor,
      ratePerMin: RATE_PER_MIN,
    },
  };
}

// ============= HELPER FUNCTIONS =============

function formatSqftLabel(sqftRange: string): string {
  // Convert SF_5000_7000 to "5,000–7,000 sqft"
  const match = sqftRange.match(/SF_(\d+)_(\d+)/);
  if (match) {
    const low = parseInt(match[1], 10).toLocaleString();
    const high = parseInt(match[2], 10).toLocaleString();
    return `${low}–${high} sqft`;
  }
  if (sqftRange === 'SF_<600') return '<600 sqft';
  if (sqftRange === 'SF_7000+') return '7,000+ sqft';
  return '';
}

function formatStructureLabel(normalizedType: string): string {
  const labels: Record<string, string> = {
    apartment_condo: 'apartment',
    apartment: 'apartment',
    condo: 'condo',
    studio: 'studio',
    townhouse: 'townhouse',
    single_family: 'single family',
    house: 'single family',
  };
  return labels[normalizedType] || '';
}

// ============= VIRTUAL UNITS ESTIMATOR (Phase 2) =============

/**
 * Estimate the number of upper cabinet units based on home size.
 * Uses bedrooms, sqft, and property type to derive a realistic count.
 * 
 * @param bedrooms - Number of bedrooms (0 = Studio, 6+ = 6)
 * @param sqftRange - Square footage range enum
 * @param propertyType - Property type
 */
export function estimateUpperCabinetUnits(params: {
  bedrooms: number;
  sqftRange?: string;
  propertyType?: PropertyCategory | string;
}): number {
  const { bedrooms, sqftRange, propertyType } = params;
  
  // 1. Base units from bedrooms
  const clampedBeds = Math.min(Math.max(bedrooms, 0), 6);
  const baseUnits = UPPER_CABINET_UNITS_BY_BEDROOMS[clampedBeds] ?? 9;
  
  // 2. SQFT factor
  const sqftFactor = sqftRange && SQFT_FACTORS[sqftRange] 
    ? SQFT_FACTORS[sqftRange] 
    : 1.0;
  
  // 3. Structure factor
  const normalizedType = (propertyType || 'single_family').toLowerCase().replace(/[- ]/g, '_');
  const structureFactor = STRUCTURE_FACTORS[normalizedType] ?? 1.0;
  
  // 4. Calculate estimated units (round to whole number)
  return Math.round(baseUnits * sqftFactor * structureFactor);
}

// ============= UPPER CABINETS PRICING (Virtual Units Engine) =============

/**
 * Calculate dynamic upper cabinets pricing using Virtual Units Engine.
 * Uses estimated cabinet units × workflow zone blend × complexity.
 * 
 * @param params - Same parameters as lower cabinets + complexity
 */
export function calculateUpperCabinetsPrice(params: {
  bedrooms: number;
  propertyType?: PropertyCategory | string;
  sqftRange?: string;
  cabinetOverride?: CabinetSizeOverride;
  cabinetComplexity?: CabinetComplexity;
}): KitchenCabinetPricing {
  const { 
    bedrooms, 
    propertyType, 
    sqftRange,
    cabinetOverride = 'typical',
    cabinetComplexity = 'standard'
  } = params;
  
  // 1. Estimate virtual cabinet units
  const upperUnits = estimateUpperCabinetUnits({ bedrooms, sqftRange, propertyType });
  
  // 2. Calculate blended zone factor (internal)
  const blendedZoneFactor = 
    ZONE_DISTRIBUTION.prep.weight * ZONE_DISTRIBUTION.prep.factor +
    ZONE_DISTRIBUTION.cooking.weight * ZONE_DISTRIBUTION.cooking.factor +
    ZONE_DISTRIBUTION.cleaning.weight * ZONE_DISTRIBUTION.cleaning.factor;
  // = ~1.11
  
  // 3. Get override and complexity factors
  const overrideFactor = CABINET_OVERRIDE_FACTORS[cabinetOverride] ?? 1.0;
  const complexityFactor = COMPLEXITY_FACTORS[cabinetComplexity] ?? 1.0;
  
  // 4. Calculate final minutes using units (NOT lower × factor anymore)
  const rawMinutes = upperUnits * MIN_PER_UPPER_UNIT * blendedZoneFactor * overrideFactor * complexityFactor;
  const finalMinutes = Math.round(rawMinutes);
  
  // 5. Calculate price
  const price = Math.round(finalMinutes * RATE_PER_MIN);
  
  // 6. Determine size category for display
  const clampedBeds = Math.min(Math.max(bedrooms, 0), 6);
  const sizeCategory = CABINET_SIZE_BY_BEDROOMS[clampedBeds] || 'M';
  
  // 7. Build breakdown with units info
  const bedLabel = clampedBeds === 0 ? 'Studio' : `${clampedBeds}${clampedBeds === 6 ? '+' : ''} bed`;
  const sqftLabel = sqftRange ? formatSqftLabel(sqftRange) : '';
  const structureLabel = formatStructureLabel((propertyType || 'single_family').toString());
  const complexityLabel = cabinetComplexity !== 'standard' ? cabinetComplexity : '';
  
  return {
    price,
    minutes: finalMinutes,
    sizeCategory,
    description: `Upper cabinets (${upperUnits} units, ${finalMinutes} min)`,
    breakdownText: [bedLabel, sqftLabel, structureLabel, cabinetOverride, complexityLabel, `${upperUnits} units`]
      .filter(Boolean)
      .join(' · '),
    factors: {
      baseMinutes: upperUnits * MIN_PER_UPPER_UNIT,
      sqftFactor: blendedZoneFactor,
      structureFactor: 1,
      overrideFactor: overrideFactor * complexityFactor,
      ratePerMin: RATE_PER_MIN,
    },
    units: upperUnits,  // Expose units for UI display
  };
}

// ============= DEGREASE MODE PRICING =============

export interface DegreasePricing {
  price: number;
  minutes: number;
  severityLabel: string;
  breakdownText: string;
}

/**
 * Calculate kitchen cabinets heavy degrease mode pricing.
 * This is a condition modifier add-on (not a cabinet type).
 * 
 * @param degreaseLevel - Severity: light | medium | heavy
 * @param propertyType - Property structure type
 * @param sqftRange - Square footage range
 */
export function calculateKitchenCabinetsDegreasePrice(params: {
  degreaseLevel: DegreaseLevel;
  propertyType?: PropertyCategory | string;
  sqftRange?: string;
}): DegreasePricing {
  const { degreaseLevel, propertyType, sqftRange } = params;
  
  // 1. Get base minutes from severity
  const baseMinutes = DEGREASE_BASE_MINUTES[degreaseLevel];
  
  // 2. Get sqft factor (reuse existing)
  const sqftFactor = sqftRange && SQFT_FACTORS[sqftRange] 
    ? SQFT_FACTORS[sqftRange] 
    : 1.0;
  
  // 3. Get structure factor (reuse existing)
  const normalizedType = (propertyType || 'single_family').toLowerCase().replace(/[- ]/g, '_');
  const structureFactor = STRUCTURE_FACTORS[normalizedType] ?? 1.0;
  
  // 4. Calculate minutes
  const rawMinutes = baseMinutes * sqftFactor * structureFactor;
  const finalMinutes = Math.round(rawMinutes);
  
  // 5. Calculate price
  const price = Math.round(finalMinutes * RATE_PER_MIN);
  
  // 6. Build labels
  const severityLabels: Record<DegreaseLevel, string> = {
    light: 'Light',
    medium: 'Medium',
    heavy: 'Heavy',
  };
  
  return {
    price,
    minutes: finalMinutes,
    severityLabel: severityLabels[degreaseLevel],
    breakdownText: `${severityLabels[degreaseLevel]} degrease · ${formatStructureLabel(normalizedType)}`,
  };
}

// ============= KITCHEN ADDON HELPER =============

export interface KitchenAddonPricing {
  id: string;
  labelKey: string;  // Translation key (SSOT - no hardcoded English)
  price: number;
  minutes: number;
  sizeCategory?: CabinetSizeCategory;
  breakdownText?: string;
  units?: number;  // Virtual units count (for upper cabinets)
}

/**
 * Get pricing for a specific kitchen addon.
 * For cabinets, uses dynamic multi-factor pricing.
 * For others, uses fixed prices.
 */
export function getKitchenAddonPricing(
  addonId: string,
  bedrooms: number,
  propertyType: PropertyCategory | string | undefined,
  sqftRange?: string,
  cabinetOverride?: CabinetSizeOverride,
  degreaseLevel?: DegreaseLevel,
  cabinetComplexity?: CabinetComplexity
): KitchenAddonPricing | null {
  // Handle lower cabinets (dynamic)
  if (addonId === 'cabinets') {
    const cabinetPricing = calculateKitchenCabinetsPrice({ 
      bedrooms, 
      propertyType,
      sqftRange,
      cabinetOverride,
      cabinetComplexity,
    });
    return {
      id: 'cabinets',
      labelKey: 'addon.kitchen_cabinets',  // SSOT: use translation key
      price: cabinetPricing.price,
      minutes: cabinetPricing.minutes,
      sizeCategory: cabinetPricing.sizeCategory,
      breakdownText: cabinetPricing.breakdownText,
    };
  }
  
  // Handle upper cabinets (dynamic - Virtual Units Engine)
  if (addonId === 'upper_cabinets') {
    const upperPricing = calculateUpperCabinetsPrice({ 
      bedrooms, 
      propertyType,
      sqftRange,
      cabinetOverride,
      cabinetComplexity,
    });
    return {
      id: 'upper_cabinets',
      labelKey: 'addon.upper_cabinets',  // SSOT: use translation key
      price: upperPricing.price,
      minutes: upperPricing.minutes,
      sizeCategory: upperPricing.sizeCategory,
      breakdownText: upperPricing.breakdownText,
      units: upperPricing.units,  // Expose virtual units for UI
    };
  }
  
  // Handle degrease mode (dynamic - severity-based)
  if (addonId === 'kitchen_cabinets_degrease') {
    const degreasePricing = calculateKitchenCabinetsDegreasePrice({
      degreaseLevel: degreaseLevel || 'light',
      propertyType,
      sqftRange,
    });
    return {
      id: 'kitchen_cabinets_degrease',
      labelKey: 'addon.kitchen_cabinets_degrease',  // SSOT: use translation key
      price: degreasePricing.price,
      minutes: degreasePricing.minutes,
      breakdownText: degreasePricing.breakdownText,
    };
  }
  
  // Handle fixed-price addons
  const fixedPrice = KITCHEN_ADDON_PRICES[addonId as keyof typeof KITCHEN_ADDON_PRICES];
  const fixedMinutes = KITCHEN_ADDON_MINUTES[addonId as keyof typeof KITCHEN_ADDON_MINUTES];
  
  if (fixedPrice === undefined) return null;
  
  // Map addon IDs to their translation keys (SSOT)
  const labelKeys: Record<string, string> = {
    fridge_empty: 'addon.fridge_empty',
    oven: 'addon.oven',
    hood: 'addon.hood',
  };
  
  return {
    id: addonId,
    labelKey: labelKeys[addonId] || `addon.${addonId}`,  // SSOT: use translation key
    price: fixedPrice,
    minutes: fixedMinutes,
  };
}

/**
 * Calculate total price for all selected kitchen addons.
 * Uses multi-factor SSOT pricing for cabinets, upper_cabinets, and degrease.
 */
export function calculateKitchenAddonsTotal(
  kitchenAddons: Array<{ addonId: string }> | undefined,
  bedrooms: number,
  propertyType: PropertyCategory | string | undefined,
  sqftRange?: string,
  cabinetOverride?: CabinetSizeOverride,
  degreaseLevel?: DegreaseLevel,
  cabinetComplexity?: CabinetComplexity
): { totalPrice: number; totalMinutes: number; details: KitchenAddonPricing[] } {
  if (!kitchenAddons || kitchenAddons.length === 0) {
    return { totalPrice: 0, totalMinutes: 0, details: [] };
  }
  
  const details: KitchenAddonPricing[] = [];
  let totalPrice = 0;
  let totalMinutes = 0;
  
  kitchenAddons.forEach(addon => {
    const pricing = getKitchenAddonPricing(
      addon.addonId, 
      bedrooms, 
      propertyType,
      sqftRange,
      cabinetOverride,
      degreaseLevel,
      cabinetComplexity
    );
    if (pricing) {
      details.push(pricing);
      totalPrice += pricing.price;
      totalMinutes += pricing.minutes;
    }
  });
  
  return { totalPrice, totalMinutes, details };
}
