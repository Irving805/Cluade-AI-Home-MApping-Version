/**
 * Commercial/B2B Pricing Engine v3.0 - "Operational Reality Engine"
 * 
 * Based on Nancy's Maid Services methodology with Golden Billable Rate ($55/hr labor)
 * 
 * === CORE PRICING LOGIC ===
 * Uses "Dual Safety Algorithm" - charges the HIGHER of:
 * 1. Table D Market Rate ($/SF based on project size)
 * 2. Production Floor (Safety Net) based on $55/hr and estimated labor hours
 * 
 * === FRICTION INDEX (v3.0) ===
 * Construction projects apply "Chaos Multipliers" that adjust man-hours based on:
 * - Debris Level (Rough Clean): broom_swept (fast) → heavy_haul (slow)
 * - Ceiling Height (Final Clean): 10ft (standard) → 20ft+ (lift required)
 * - No Elevator Penalty: +20% when multi-floor without elevator
 * - Active Trades: +25% coordination overhead when contractors on-site
 * 
 * === HARD COSTS ===
 * - Window Razor Scrape: $15/panel (vs $8 standard) for adhesive removal
 * - Dumpster Haul Fee: $250 if no on-site dumpster (Rough only)
 */

import { DebrisLevel, CeilingHeight, CommercialScope } from '@/contexts/BookingContext';

// ===== BUSINESS CONSTANTS =====

// Golden Billable Rate - $55 per hour of labor
export const GOLDEN_HOUR_RATE = 55;

// === PRODUCTION RATES (Base Speed) ===
// Square Feet per Hour per Worker - before friction adjustments
export const PRODUCTION_RATES = {
  office_standard: 3000,         // Standard office maintenance (light cleaning)
  medical_specialized: 2000,     // Medical/specialized with strict protocols
  post_construction_final: 700,  // Post-construction final clean (fine dust, detail work)
  post_construction_rough: 1250, // Rough clean (debris removal) - Updated from operational data
};

// === DEBRIS-BASED PRODUCTION RATES (Rough Clean Only) ===
// Overrides base rate when debris level is known
export const DEBRIS_PRODUCTION_RATES: Record<DebrisLevel, number> = {
  broom_swept: 1500,      // Light - fast sweep, minimal debris
  standard_debris: 1000,  // Normal construction waste (drywall dust, wood scraps)
  heavy_haul: 500,        // Heavy debris requiring shovels, physical hauling
};

// === FRICTION MULTIPLIERS (Chaos Index) ===
// These multiply man-hours to account for operational friction
export const FRICTION_MULTIPLIERS = {
  height: {
    standard_10ft: 1.0,          // No adjustment
    high_12_15ft: 1.25,          // +25% for ladder work, safety overhead
    warehouse_20ft_plus: 1.60,   // +60% for lift equipment, safety protocols
  } as Record<CeilingHeight, number>,
  no_elevator: 1.20,             // +20% fatigue on multi-floor without elevator
  active_trades: 1.25,           // +25% coordination overhead when other contractors present
};

// === HARD COSTS (Add-ons) ===
export const HARD_COSTS = {
  window_razor_scrape: 15.00,    // Per panel with stickers/paint overspray
  window_standard: 8.00,         // Standard window polish
  dumpster_haul_fee: 250,        // Off-site debris removal if no dumpster
};

// ===== COMMERCIAL ADD-ON DEFINITIONS =====
// Post-Construction Final Clean Add-ons
export interface CommercialAddonConfig {
  id: string;
  labelKey: string;
  price: number;
  hasQuantity: boolean;
  unit?: string;
  icon: string;
  description: string;
  isSqftBased?: boolean;
}

export const FINAL_CLEAN_ADDONS: CommercialAddonConfig[] = [
  { 
    id: 'window_razor_scrape', 
    labelKey: 'commercial.addon_window_razor',
    price: 15,
    hasQuantity: true,
    unit: '/panel',
    icon: 'Square',
    description: 'Razor blade removal of stickers, paint overspray'
  },
  { 
    id: 'cabinet_interior', 
    labelKey: 'commercial.addon_cabinet_interior',
    price: 8,
    hasQuantity: true,
    unit: '/cabinet',
    icon: 'DoorOpen',
    description: 'Interior wipe-down and shelf cleaning'
  },
  { 
    id: 'light_fixture_detail', 
    labelKey: 'commercial.addon_light_fixtures',
    price: 5,
    hasQuantity: true,
    unit: '/fixture',
    icon: 'Lightbulb',
    description: 'Dust removal and lens cleaning'
  },
  { 
    id: 'vent_cover_cleaning', 
    labelKey: 'commercial.addon_vent_covers',
    price: 4,
    hasQuantity: true,
    unit: '/vent',
    icon: 'Wind',
    description: 'HVAC vent cover removal and cleaning'
  },
  { 
    id: 'pressure_wash_exterior', 
    labelKey: 'commercial.addon_pressure_wash',
    price: 150,
    hasQuantity: false,
    icon: 'Droplets',
    description: 'Exterior walkway/patio pressure washing'
  },
];

// Post-Construction Rough Clean Add-ons
export const ROUGH_CLEAN_ADDONS: CommercialAddonConfig[] = [
  { 
    id: 'heavy_debris_removal', 
    labelKey: 'commercial.addon_heavy_debris',
    price: 75,
    hasQuantity: true,
    unit: '/hr',
    icon: 'Trash2',
    description: 'Large debris hauling (drywall, wood)'
  },
  { 
    id: 'dumpster_haul_away', 
    labelKey: 'commercial.addon_dumpster_haul',
    price: 250,
    hasQuantity: false,
    icon: 'Truck',
    description: 'Off-site debris disposal service'
  },
  { 
    id: 'floor_scraping', 
    labelKey: 'commercial.addon_floor_scraping',
    price: 0.10,
    hasQuantity: false,
    isSqftBased: true,
    icon: 'Layers',
    description: 'Adhesive/grout removal from floors'
  },
  { 
    id: 'hazmat_disposal', 
    labelKey: 'commercial.addon_hazmat',
    price: 200,
    hasQuantity: false,
    icon: 'AlertTriangle',
    description: 'Chemical/hazardous material handling'
  },
];

// Helper to get addons for project type
export function getCommercialAddons(projectType: CommercialProjectType): CommercialAddonConfig[] {
  if (projectType === 'post_construction_final') return FINAL_CLEAN_ADDONS;
  if (projectType === 'post_construction_rough') return ROUGH_CLEAN_ADDONS;
  return [];
}

// Calculate addon total from selected addons
export function calculateCommercialAddonsTotal(
  selectedAddons: Array<{ id: string; quantity: number }>,
  projectType: CommercialProjectType,
  sqft: number = 0
): number {
  const availableAddons = getCommercialAddons(projectType);
  let total = 0;
  
  selectedAddons.forEach(selected => {
    const addon = availableAddons.find(a => a.id === selected.id);
    if (addon) {
      if (addon.isSqftBased) {
        total += addon.price * sqft;
      } else {
        total += addon.price * selected.quantity;
      }
    }
  });
  
  return Math.round(total);
}

// ===== COMMERCIAL FREQUENCY MULTIPLIERS =====
// Incentivizes recurring B2B contracts for Office/Medical
export const COMMERCIAL_FREQUENCY = {
  one_time: 1.0,    // No discount
  daily: 0.80,      // 20% discount (high volume)
  weekly: 0.90,     // 10% discount
  biweekly: 0.95,   // 5% discount
  monthly: 1.0,     // No discount (nearly one-time)
} as const;

export type CommercialFrequency = keyof typeof COMMERCIAL_FREQUENCY;

// ===== INTELLIGENT SCOPE OF WORK DEFINITIONS =====
// Technical work breakdown by project type for CRM and customer clarity
export const COMMERCIAL_SCOPES = {
  post_construction_final: {
    intention: "Immediate Habitability & Inspection Ready",
    logistics: "Detailed removal of fine dust, salt residue from coastal air, window tracks, and cabinet interiors.",
    tasks: [
      "Industrial vacuuming (ceilings to floors)",
      "Detailing of window tracks & interior glass",
      "Cabinet interior/exterior disinfection & polishing",
      "Removal of fine dust, adhesives, and paint overspray"
    ]
  },
  post_construction_rough: {
    intention: "Safety & Surface Preparation",
    logistics: "Debris removal prior to flooring/painting. PPE required.",
    tasks: [
      "Removal of minor debris, sawdust, and heavy dust",
      "Safety protocol compliance (PPE)",
      "Floor scraping and prep for final finish",
      "General wipe down of vertical surfaces"
    ]
  },
  office_standard: {
    intention: "Professional Image & Employee Health",
    logistics: "Efficient routing for minimal disruption.",
    tasks: [
      "Trash & recycling management",
      "Carpet vacuuming & hard floor care",
      "Restroom sanitation & restocking",
      "Common area disinfection"
    ]
  },
  medical_specialized: {
    intention: "Hospital-Grade Disinfection",
    logistics: "EPA protocols & high-touch dwell times.",
    tasks: [
      "EPA-approved disinfectants (High dwell time)",
      "Cross-contamination prevention protocols",
      "High-touch surface sterilization",
      "Waiting room & exam room detailing"
    ]
  }
} as const;

export type CommercialScopeDetail = {
  intention: string;
  logistics: string;
  tasks: readonly string[];
};

// Table D: Post-Construction Cleaning Rates ($/SF)
// Tiered pricing based on project square footage
export const TABLE_D_CONSTRUCTION = [
  { maxSqft: 3000,     rough: 0.25, final: 0.50, fluff: 0.15 },
  { maxSqft: 7000,     rough: 0.20, final: 0.42, fluff: 0.12 },
  { maxSqft: 15000,    rough: 0.18, final: 0.35, fluff: 0.10 },
  { maxSqft: Infinity, rough: 0.15, final: 0.30, fluff: 0.08 },
];

// Office/Facility Rates ($/SF) - Lower rates due to higher production
export const TABLE_OFFICE_RATES = [
  { maxSqft: 5000,     standard: 0.08, deep: 0.15 },
  { maxSqft: 15000,    standard: 0.06, deep: 0.12 },
  { maxSqft: 30000,    standard: 0.05, deep: 0.10 },
  { maxSqft: Infinity, standard: 0.04, deep: 0.08 },
];

// Medical/Specialized Rates ($/SF) - Higher rates due to strict protocols
export const TABLE_MEDICAL_RATES = [
  { maxSqft: 3000,     standard: 0.12, deep: 0.22 },
  { maxSqft: 10000,    standard: 0.10, deep: 0.18 },
  { maxSqft: 25000,    standard: 0.08, deep: 0.15 },
  { maxSqft: Infinity, standard: 0.06, deep: 0.12 },
];

// Minimum service charge
export const COMMERCIAL_MINIMUM = 250;

// ===== TYPES =====

export type CommercialProjectType = 
  | 'post_construction_final' 
  | 'post_construction_rough' 
  | 'office_standard' 
  | 'medical_specialized';

export type CommercialCleanPhase = 'rough' | 'final' | 'fluff';

export interface CommercialQuoteResult {
  total: number;                   // Final price (higher of market vs floor)
  estimatedHours: number;          // Estimated labor hours
  ratePerSqft: number;             // $/SF rate applied
  method: 'table_d' | 'safety_net' | 'office_rate' | 'medical_rate' | 'minimum';
  methodLabel: string;             // Human-readable method label
  productionRate: number;          // SF/hr used in calculation
  marketPrice: number;             // Price from table rates
  floorPrice: number;              // Safety net price from production
  teamSize: number;                // Recommended team size
  totalLaborHours: number;         // Total labor hours (hours × team)
  scope: CommercialScopeDetail;    // Intelligent scope of work
  frequencyDiscount: number;       // Discount percentage applied (0-20)
}

// === CONSTRUCTION QUOTE RESULT (v3.0) ===
export interface ConstructionQuoteResult {
  total: number;
  manHours: number;
  teamSize: number;
  clockHours: number;              // On-site hours (manHours / teamSize)
  breakdown: {
    labor: number;
    addons: number;
  };
  logisticsNotes: string[];
  method: 'table_d' | 'production_floor' | 'minimum';
  methodLabel: string;
  frictionApplied: {
    height: number;
    noElevator: boolean;
    activeTrades: boolean;
    debrisLevel: DebrisLevel;
  };
  scope: CommercialScopeDetail;
  frequencyDiscount: number;
  // Added for compatibility
  estimatedHours: number;
  ratePerSqft: number;
  productionRate: number;
  marketPrice: number;
  floorPrice: number;
  totalLaborHours: number;
}

// ===== CALCULATION FUNCTIONS =====

/**
 * Get recommended team size based on project scope
 */
function getRecommendedTeamSize(sqft: number, projectType: CommercialProjectType): number {
  if (projectType.includes('post_construction')) {
    if (sqft <= 3000) return 2;
    if (sqft <= 7000) return 3;
    if (sqft <= 15000) return 4;
    return 5;
  }
  // Office/Medical
  if (sqft <= 5000) return 2;
  if (sqft <= 15000) return 3;
  return 4;
}

/**
 * Calculate commercial cleaning quote using Dual Safety Algorithm
 * 
 * @param sqft - Project square footage
 * @param projectType - Type of commercial project
 * @param cleanPhase - Cleaning phase (rough/final/fluff) - only for construction
 * @param frequency - Service frequency for recurring contracts
 * @returns CommercialQuoteResult with pricing breakdown
 */
export function calculateCommercialQuote(
  sqft: number,
  projectType: CommercialProjectType,
  cleanPhase: CommercialCleanPhase = 'final',
  frequency: CommercialFrequency = 'one_time'
): CommercialQuoteResult {
  // 1. Get production speed for this project type
  const productionSpeed = PRODUCTION_RATES[projectType] || PRODUCTION_RATES.post_construction_final;
  
  // 2. Calculate estimated hours per worker (Safety Net formula)
  const estimatedHours = sqft / productionSpeed;
  const floorPrice = Math.ceil(estimatedHours * GOLDEN_HOUR_RATE);
  
  // 3. Get team size
  const teamSize = getRecommendedTeamSize(sqft, projectType);
  const totalLaborHours = Math.round(estimatedHours * 10) / 10;
  
  // 4. Calculate market price based on project type
  let marketPrice = 0;
  let rateApplied = 0;
  let method: CommercialQuoteResult['method'] = 'safety_net';
  let methodLabel = 'Production Floor ($55/hr)';
  
  if (projectType.includes('post_construction')) {
    // Use Table D for construction
    const tier = TABLE_D_CONSTRUCTION.find(t => sqft <= t.maxSqft) || TABLE_D_CONSTRUCTION[TABLE_D_CONSTRUCTION.length - 1];
    rateApplied = tier[cleanPhase];
    marketPrice = Math.round(sqft * rateApplied);
    
    if (marketPrice >= floorPrice) {
      method = 'table_d';
      methodLabel = `Table D (${cleanPhase.charAt(0).toUpperCase() + cleanPhase.slice(1)} Clean)`;
    }
  } else if (projectType === 'office_standard') {
    // Use Office Rates
    const tier = TABLE_OFFICE_RATES.find(t => sqft <= t.maxSqft) || TABLE_OFFICE_RATES[TABLE_OFFICE_RATES.length - 1];
    rateApplied = tier.standard;
    marketPrice = Math.round(sqft * rateApplied);
    
    if (marketPrice >= floorPrice) {
      method = 'office_rate';
      methodLabel = 'Office Standard Rate';
    }
  } else if (projectType === 'medical_specialized') {
    // Use Medical Rates
    const tier = TABLE_MEDICAL_RATES.find(t => sqft <= t.maxSqft) || TABLE_MEDICAL_RATES[TABLE_MEDICAL_RATES.length - 1];
    rateApplied = tier.standard;
    marketPrice = Math.round(sqft * rateApplied);
    
    if (marketPrice >= floorPrice) {
      method = 'medical_rate';
      methodLabel = 'Medical/Specialized Rate';
    }
  }
  
  // 5. THE GOLDEN RULE: Charge the HIGHER of market vs floor
  let finalPrice = Math.max(marketPrice, floorPrice);
  
  // Update method label if safety net was activated
  if (method === 'safety_net') {
    rateApplied = floorPrice / sqft;
    methodLabel = 'Safety Net Activated (High Density)';
  }
  
  // 6. Apply minimum charge
  if (finalPrice < COMMERCIAL_MINIMUM) {
    finalPrice = COMMERCIAL_MINIMUM;
    method = 'minimum';
    methodLabel = 'Minimum Service Charge';
    rateApplied = COMMERCIAL_MINIMUM / sqft;
  }
  
  // 7. Apply frequency discount (ONLY for Office/Medical - not construction)
  let frequencyDiscount = 0;
  if (!projectType.includes('post_construction')) {
    const multiplier = COMMERCIAL_FREQUENCY[frequency];
    if (multiplier < 1.0) {
      frequencyDiscount = Math.round((1 - multiplier) * 100);
      finalPrice = Math.round(finalPrice * multiplier);
    }
  }
  
  // 8. Get scope of work
  const scope = COMMERCIAL_SCOPES[projectType];
  
  return {
    total: Math.round(finalPrice),
    estimatedHours: Math.round(estimatedHours * 10) / 10,
    ratePerSqft: Math.round(rateApplied * 100) / 100,
    method,
    methodLabel,
    productionRate: productionSpeed,
    marketPrice: Math.round(marketPrice),
    floorPrice: Math.round(floorPrice),
    teamSize,
    totalLaborHours,
    scope,
    frequencyDiscount,
  };
}

/**
 * Calculate construction quote with Friction Index (Operational Reality Engine v3.0)
 * 
 * This function applies real-world friction multipliers to construction projects:
 * - Debris level affects Rough Clean speed
 * - Ceiling height affects Final Clean time
 * - No elevator adds fatigue penalty
 * - Active trades add coordination overhead
 * - Window scraping and dumpster fees as add-ons
 */
export function calculateConstructionQuote(scope: CommercialScope): ConstructionQuoteResult {
  const sqft = parseInt(scope.sqft || '0');
  const isFinal = scope.projectType === 'post_construction_final';
  const isRough = scope.projectType === 'post_construction_rough';
  
  // A. DETERMINE BASE PRODUCTION SPEED
  // For Rough Clean, use debris-based rates; for Final, use standard rate
  let baseSpeed: number;
  if (isRough) {
    baseSpeed = DEBRIS_PRODUCTION_RATES[scope.debrisLevel] || DEBRIS_PRODUCTION_RATES.standard_debris;
  } else {
    baseSpeed = PRODUCTION_RATES[scope.projectType] || PRODUCTION_RATES.post_construction_final;
  }
  
  // B. CALCULATE RAW MAN-HOURS
  let manHours = sqft / baseSpeed;
  
  // C. APPLY FRICTION MULTIPLIERS (Chaos Index)
  // 1. Ceiling height (primarily affects Final Clean, but applies to all)
  const heightMultiplier = FRICTION_MULTIPLIERS.height[scope.ceilingHeight] || 1.0;
  manHours *= heightMultiplier;
  
  // 2. No elevator penalty (multi-floor without elevator)
  const noElevatorApplied = !scope.hasElevator && scope.floors > 1;
  if (noElevatorApplied) {
    manHours *= FRICTION_MULTIPLIERS.no_elevator;
  }
  
  // 3. Active trades coordination overhead
  if (scope.activeTrades) {
    manHours *= FRICTION_MULTIPLIERS.active_trades;
  }
  
  // D. CALCULATE LABOR TOTAL (Production Floor)
  const laborTotal = manHours * GOLDEN_HOUR_RATE;
  
  // E. CALCULATE ADD-ONS (Hard Costs)
  let addonsTotal = 0;
  const logisticsNotes: string[] = [];
  
  // Window pricing - razor scrape vs standard
  if (scope.windowCount > 0) {
    const pricePerWindow = scope.windowStickerRemoval 
      ? HARD_COSTS.window_razor_scrape 
      : HARD_COSTS.window_standard;
    addonsTotal += scope.windowCount * pricePerWindow;
    
    if (scope.windowStickerRemoval) {
      logisticsNotes.push(`Window razor scraping: ${scope.windowCount} panels @ $${HARD_COSTS.window_razor_scrape}`);
    } else {
      logisticsNotes.push(`Standard window polish: ${scope.windowCount} panels @ $${HARD_COSTS.window_standard}`);
    }
  }
  
  // Dumpster fee (Rough only - if no dumpster on site)
  if (!scope.dumpsterOnSite && isRough) {
    addonsTotal += HARD_COSTS.dumpster_haul_fee;
    logisticsNotes.push(`Off-site debris hauling: $${HARD_COSTS.dumpster_haul_fee}`);
  }
  
  // F. CALCULATE MARKET PRICE (Table D)
  const tier = TABLE_D_CONSTRUCTION.find(t => sqft <= t.maxSqft) || TABLE_D_CONSTRUCTION[TABLE_D_CONSTRUCTION.length - 1];
  const rateApplied = tier[scope.cleanPhase] || tier.final;
  const marketPrice = Math.round(sqft * rateApplied);
  
  // G. FLOOR PRICE (Labor + Add-ons)
  const floorPrice = Math.ceil(laborTotal + addonsTotal);
  
  // H. DUAL SAFETY: Take the HIGHER of market vs floor
  let method: ConstructionQuoteResult['method'] = 'production_floor';
  let methodLabel = 'Production Floor (Friction Applied)';
  let finalPrice = floorPrice;
  
  if (marketPrice > floorPrice) {
    finalPrice = marketPrice + Math.ceil(addonsTotal); // Add-ons still apply on top
    method = 'table_d';
    methodLabel = `Table D (${scope.cleanPhase.charAt(0).toUpperCase() + scope.cleanPhase.slice(1)} Clean)`;
  }
  
  // I. APPLY MINIMUM
  if (finalPrice < COMMERCIAL_MINIMUM) {
    finalPrice = COMMERCIAL_MINIMUM;
    method = 'minimum';
    methodLabel = 'Minimum Service Charge';
  }
  
  // J. TEAM SIZE (minimum 2 for construction safety)
  const teamSize = getRecommendedTeamSize(sqft, scope.projectType);
  const clockHours = Math.ceil(manHours / teamSize);
  
  // K. GET SCOPE OF WORK
  const scopeOfWork = COMMERCIAL_SCOPES[scope.projectType];
  
  return {
    total: Math.round(finalPrice),
    manHours: Math.round(manHours * 10) / 10,
    teamSize,
    clockHours,
    breakdown: {
      labor: Math.round(laborTotal),
      addons: Math.round(addonsTotal),
    },
    logisticsNotes,
    method,
    methodLabel,
    frictionApplied: {
      height: heightMultiplier,
      noElevator: noElevatorApplied,
      activeTrades: scope.activeTrades,
      debrisLevel: scope.debrisLevel,
    },
    scope: scopeOfWork,
    frequencyDiscount: 0, // No frequency discount for construction
    // Compatibility fields
    estimatedHours: Math.round(manHours * 10) / 10,
    ratePerSqft: Math.round((finalPrice / sqft) * 100) / 100,
    productionRate: baseSpeed,
    marketPrice: Math.round(marketPrice),
    floorPrice: Math.round(floorPrice),
    totalLaborHours: Math.round(manHours * 10) / 10,
  };
}

/**
 * Get complexity index color based on friction multipliers
 */
export function getComplexityLevel(frictionApplied: ConstructionQuoteResult['frictionApplied']): 'low' | 'medium' | 'high' {
  let totalFriction = frictionApplied.height;
  if (frictionApplied.noElevator) totalFriction *= FRICTION_MULTIPLIERS.no_elevator;
  if (frictionApplied.activeTrades) totalFriction *= FRICTION_MULTIPLIERS.active_trades;
  
  // Heavy debris adds implicit friction
  if (frictionApplied.debrisLevel === 'heavy_haul') totalFriction *= 1.2;
  
  if (totalFriction >= 1.6) return 'high';
  if (totalFriction >= 1.2) return 'medium';
  return 'low';
}

/**
 * Get debris level display label
 */
export function getDebrisLevelLabel(level: DebrisLevel): string {
  const labels: Record<DebrisLevel, string> = {
    broom_swept: 'Light (Broom Swept)',
    standard_debris: 'Standard Debris',
    heavy_haul: 'Heavy (Haul Required)',
  };
  return labels[level] || level;
}

/**
 * Get ceiling height display label
 */
export function getCeilingHeightLabel(height: CeilingHeight): string {
  const labels: Record<CeilingHeight, string> = {
    standard_10ft: 'Standard (<10ft)',
    high_12_15ft: 'High (12-15ft)',
    warehouse_20ft_plus: 'Warehouse (20ft+)',
  };
  return labels[height] || height;
}

/**
 * Get project type display label
 */
export function getProjectTypeLabel(projectType: CommercialProjectType): string {
  const labels: Record<CommercialProjectType, string> = {
    post_construction_final: 'Post-Construction Final Clean',
    post_construction_rough: 'Post-Construction Rough Clean',
    office_standard: 'Office/Facility Standard',
    medical_specialized: 'Medical/Specialized',
  };
  return labels[projectType] || projectType;
}

/**
 * Get clean phase display label
 */
export function getCleanPhaseLabel(phase: CommercialCleanPhase): string {
  const labels: Record<CommercialCleanPhase, string> = {
    rough: 'Rough Clean',
    final: 'Final Clean',
    fluff: 'Touch-Up (Fluff)',
  };
  return labels[phase] || phase;
}

/**
 * Generate Housecall Pro formatted description for commercial project
 * 
 * @param sqft - Project square footage
 * @param projectType - Type of commercial project
 * @param projectName - Project name/reference
 * @param price - Calculated total price
 * @param cleanPhase - Cleaning phase
 * @param frequency - Service frequency
 * @returns Formatted description string for CRM
 */
export function generateCommercialDescription(
  sqft: number,
  projectType: CommercialProjectType,
  projectName: string,
  price: number,
  cleanPhase: CommercialCleanPhase = 'final',
  frequency: CommercialFrequency = 'one_time'
): string {
  const projectLabel = getProjectTypeLabel(projectType);
  const scope = COMMERCIAL_SCOPES[projectType];
  const frequencyLabel = frequency === 'one_time' ? 'One-Time' : frequency.charAt(0).toUpperCase() + frequency.slice(1).replace('_', '-');
  
  return `
Service: ${projectLabel} | ${projectName || 'Commercial Project'}
Frequency: ${frequencyLabel}
Area: ${sqft.toLocaleString()} sq ft

// INTENTION:
${scope.intention}

// LOGISTICS & APPROACH:
${scope.logistics}

// SCOPE OF WORK:
${scope.tasks.map(t => `• ${t}`).join('\n')}

// PRICING BASIS:
Based on production rate of ${PRODUCTION_RATES[projectType].toLocaleString()} sq ft/hr
Est. Labor: ${(sqft / PRODUCTION_RATES[projectType]).toFixed(1)} Hours

Unit Price${frequency !== 'one_time' ? ' (Per Visit)' : ''}: $${price.toFixed(2)}
`.trim();
}

/**
 * Format square footage for display
 */
export function formatSqft(sqft: number | string): string {
  const num = typeof sqft === 'string' ? parseInt(sqft, 10) : sqft;
  if (isNaN(num) || num <= 0) return '0 sq ft';
  return `${num.toLocaleString()} sq ft`;
}
