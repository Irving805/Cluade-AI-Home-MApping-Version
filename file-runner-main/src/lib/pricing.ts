// Pricing data: [Move-In/Out, Deep Clean, Standard Clean, Weekly Price, Bi-Weekly Price, Monthly Price]
// Column order: 0=Move-In/Out, 1=Deep Clean, 2=Standard Clean, 3=Weekly, 4=Bi-Weekly, 5=Monthly

// === HOURLY PRIORITY SERVICE CONFIGURATION ===
// For "Luxury Bypass" team-based sessions within SPECIFIC_AREAS flow
// Rates are tiered by frequency: Daily/2+/week, Weekly/Bi-Weekly, Monthly, One-time

export type HourlyFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'onetime';
export type HourlyIntensity = 'basic' | 'deep';
export type HourlySupplies = 'client' | 'company';

// Frequency-based hourly rates (per person/hour)
// Rate tiers: basic (Priority/Post-Event/Org), deep (Deep Scrub), moveInOut (Move In/Out + Deep Scrub)
export const HOURLY_FREQUENCY_RATES: Record<HourlyFrequency, { basic: number; deep: number; moveInOut: number }> = {
  daily: { basic: 35, deep: 45, moveInOut: 55 },      // Daily or 2+ days/week - Labor Only
  weekly: { basic: 45, deep: 55, moveInOut: 64 },     // Weekly - Ideal maintenance
  biweekly: { basic: 45, deep: 55, moveInOut: 64 },   // Bi-Weekly (same as weekly)
  monthly: { basic: 50, deep: 55, moveInOut: 64 },    // Monthly Maintenance - $50/hr (deep reset)
  onetime: { basic: 55, deep: 55, moveInOut: 64 },    // One-time Session (Golden Billable Rate $55)
};

// Minimum session total for commercial deployment costs
export const HOURLY_MIN_SESSION_TOTAL = 250;

export const HOURLY_CONFIG = {
  TEAM_SIZE: 2,                    // 2-person team
  MIN_CLOCK_HOURS: 2,              // Minimum 2 hours on-site (4 man-hours total)
  // Legacy rates (for backward compatibility, use HOURLY_FREQUENCY_RATES for new logic)
  RATE_BASIC_CLIENT: 45,           // $45/hr per person - client provides supplies (legacy)
  RATE_BASIC_COMPANY: 55,          // $55/hr per person - Nancy's provides supplies
  RATE_DEEP_COMPANY: 64,           // $64/hr per person - Deep cleaning intensity
} as const;

// === HOURLY SMART ESTIMATOR: Labor Time Constants ===
// Man-minutes per unit for calculating recommended session hours
export const HOURLY_LABOR_TIMES = {
  setup: 20,           // Equipment unload + initial consult (man-minutes)
  sqftPer1000: 10,     // Additional minutes per 1,000 sqft for surfaces/travel
  bedroom: { basic: 25, deep: 35 },
  bathroom: {
    standard: { basic: 30, deep: 50 },
    master: { basic: 45, deep: 70 },
    half: { basic: 15, deep: 25 },
  },
  kitchen: { basic: 50, deep: 100 },
  livingArea: { basic: 45, deep: 70 },
} as const;

// === ADDON LABOR TIMES (Minutes) ===
// Estimated labor time for each add-on service
export const ADDON_TIMES: Record<string, number> = {
  // Appliance Detailing
  oven: 45,
  fridge_empty: 36,
  fridge_org: 60,
  cabinets: 60,
  hood: 30,
  patio: 15,
  
  // Extra Touches
  sheets: 10,
  laundry: 15,
  dishwashing: 15,
  dishwasher_run: 5,
  organization: 60,
  ceiling_fan: 10,
  light_fixture: 5,
  fireplace: 15,
  
  // Standard Clean Only
  sliding_patio_glass: 5,
  patio_sweep: 15,
  interior_windows: 5,
  
  // Pets (recurring)
  pets: 10,
  
  // Functional Zones
  laundry_room: 15,
  office_room: 25,
  loft_room: 25,
  garage_room: 30,
  
  // Deep Scrub Specific
  baseboards: 45,           // Full baseboard detail
  range_hood: 30,           // Range hood deep clean
  
  // Hallway & Stair Add-ons (Multi-Floor)
  stair_railings: 25,       // Manual spindle detail
  stair_edging: 20,         // Deep corner vacuuming
  baseboard_detail: 15,     // Full hallway wipe
  
  // Cabinet Interior Add-ons
  hallway_cabinets: 20,     // Hallway linen cabinet interior
  living_cabinets: 25,      // Living room built-in cabinet interior
  bedroom_cabinets: 15,     // Per bedroom closet interior
  
  // Living Room Lifestyle
  pet_hair_removal: 30,     // Upholstery extraction
};

// === PROPERTY TYPE OPTIONS (SB/Ventura Market) - Compact 2-Option ===
export type PropertyCategory = 'single_family' | 'apartment_condo';

export const PROPERTY_CATEGORY_OPTIONS = [
  { 
    value: 'single_family' as PropertyCategory, 
    label: 'Single Family Home / Townhouse', 
    shortLabel: 'House / Townhouse',
    icon: 'home', 
    description: 'Detached or attached residential home' 
  },
  { 
    value: 'apartment_condo' as PropertyCategory, 
    label: 'Apartment / Condo / Studio', 
    shortLabel: 'Apartment / Condo',
    icon: 'building2', 
    description: 'Multi-unit building or complex' 
  },
] as const;

// Sub-options: Home Stories (for Single Family) - Extended to support 1-6 floors
export const HOME_STORIES_OPTIONS = [
  { value: 1 as const, label: '1 Story', surcharge: 0, description: 'Single level home' },
  { value: 2 as const, label: '2 Floors', surcharge: 15, description: 'Two-story home' },
  { value: 3 as const, label: '3 Floors', surcharge: 30, description: 'Three-story home' },
  { value: 4 as const, label: '4 Floors', surcharge: 45, description: 'Four-story home' },
  { value: 5 as const, label: '5 Floors', surcharge: 60, description: 'Five-story home' },
  { value: 6 as const, label: '6+ Floors', surcharge: 75, description: 'Estate/Multi-level' },
] as const;

// Sub-options: Floor Level + Elevator (for Apartment/Condo)
export const FLOOR_LEVEL_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
  value: i + 1,
  label: i === 0 ? 'Floor 1 (Ground)' : `Floor ${i + 1}`,
}));

export const ELEVATOR_ACCESS_OPTIONS = [
  { value: true, label: 'Yes (Elevator)', surcharge: 0, description: 'Standard access' },
  { value: false, label: 'No (Walk-up)', surcharge: 20, description: 'Equipment carry fee' },
] as const;

// Legacy PROPERTY_TYPE_OPTIONS for backward compatibility
export const PROPERTY_TYPE_OPTIONS = [
  { value: 'studio_loft', label: 'Studio/Loft', icon: 'building', description: 'Compact urban living, open floor plan' },
  { value: 'apartment_condo', label: 'Apartment/Condo', icon: 'building2', description: 'Multi-unit complex, shared building' },
  { value: 'townhouse', label: 'Townhouse', icon: 'home', description: 'Multi-story attached home' },
  { value: 'single_family', label: 'Single-Family Home', icon: 'home', description: 'Detached residential property' },
  { value: 'spanish_mediterranean', label: 'Spanish/Mediterranean', icon: 'castle', description: 'Tile roofs, courtyards, stucco walls' },
  { value: 'craftsman_bungalow', label: 'Craftsman/Bungalow', icon: 'home', description: 'Wood details, porches, historic charm' },
  { value: 'ranch', label: 'Ranch Home', icon: 'sun', description: 'Single-story, sprawling layout' },
  { value: 'modern_contemporary', label: 'Modern/Contemporary', icon: 'gem', description: 'Open concept, large windows, minimalist' },
  { value: 'guest_house_adu', label: 'Guest House/ADU', icon: 'home', description: 'Secondary dwelling on property' },
  { value: 'estate_mansion', label: 'Estate/Mansion', icon: 'crown', description: '4000+ sqft, multiple structures' },
] as const;

export type PropertyTypeValue = typeof PROPERTY_TYPE_OPTIONS[number]['value'];

// Square footage options for hourly estimator (expanded for SB/Ventura estates)
export const HOURLY_SQFT_OPTIONS = [
  { value: 'under_1000', label: 'Under 1,000 sqft (Studio/1BR Apt)', midpoint: 750 },
  { value: '1000_1500', label: '1,000 - 1,500 sqft (Condo/Small Home)', midpoint: 1250 },
  { value: '1500_2000', label: '1,500 - 2,000 sqft (Typical SB Home)', midpoint: 1750 },
  { value: '2000_2500', label: '2,000 - 2,500 sqft (Family Home)', midpoint: 2250 },
  { value: '2500_3000', label: '2,500 - 3,000 sqft (Large Family)', midpoint: 2750 },
  { value: '3000_4000', label: '3,000 - 4,000 sqft (Executive Home)', midpoint: 3500 },
  { value: '4000_5000', label: '4,000 - 5,000 sqft (Mini Estate)', midpoint: 4500 },
  { value: '5000_7500', label: '5,000 - 7,500 sqft (Montecito Style)', midpoint: 6250 },
  { value: '7500_10000', label: '7,500 - 10,000 sqft (Large Estate)', midpoint: 8750 },
  { value: '10000_15000', label: '10,000 - 15,000 sqft (Grand Estate)', midpoint: 12500 },
  { value: '15000_20000', label: '15,000 - 20,000 sqft (Premiere Estate)', midpoint: 17500 },
  { value: 'over_20000', label: '20,000+ sqft (Landmark Estate)', midpoint: 25000 },
] as const;

// === AREAS TO INCLUDE OPTIONS (Rooms to Clean) ===
export const AREAS_TO_INCLUDE_OPTIONS: readonly {
  id: string;
  label: string;
  icon: string;
  description: string;
  minSqft: number;
  propertyTypes: readonly string[];
}[] = [
  { id: 'kitchen', label: 'Kitchen', icon: 'chef-hat', description: 'Surfaces & appliances', minSqft: 0, propertyTypes: ['all'] },
  { id: 'living_room', label: 'Living/Family Room', icon: 'sofa', description: 'Common living spaces', minSqft: 0, propertyTypes: ['all'] },
  { id: 'dining_room', label: 'Dining Room', icon: 'utensils', description: 'Formal dining area', minSqft: 1500, propertyTypes: ['all'] },
  { id: 'home_office', label: 'Home Office/Study', icon: 'briefcase', description: 'Work from home space', minSqft: 1000, propertyTypes: ['all'] },
  { id: 'laundry_room', label: 'Laundry Room', icon: 'shirt', description: 'Washer/dryer area', minSqft: 1000, propertyTypes: ['all'] },
  { id: 'mudroom', label: 'Mudroom/Entryway', icon: 'door-open', description: 'Entry & transition spaces', minSqft: 2000, propertyTypes: ['single_family'] },
  { id: 'garage', label: 'Garage (Sweep Only)', icon: 'car', description: 'Floor sweep, no deep clean', minSqft: 1500, propertyTypes: ['single_family'] },
  { id: 'patio', label: 'Patio/Outdoor', icon: 'sun', description: 'Outdoor living areas', minSqft: 1500, propertyTypes: ['single_family'] },
  { id: 'balcony', label: 'Balcony', icon: 'sun', description: 'Outdoor balcony space', minSqft: 0, propertyTypes: ['apartment_condo'] },
  { id: 'wine_cellar', label: 'Wine Cellar', icon: 'wine', description: 'Montecito/Hope Ranch specialty', minSqft: 4000, propertyTypes: ['single_family'] },
  { id: 'butlers_pantry', label: "Butler's Pantry", icon: 'utensils', description: 'Estate-level serving area', minSqft: 4000, propertyTypes: ['single_family'] },
  { id: 'media_room', label: 'Media/Theater Room', icon: 'tv', description: 'Entertainment space', minSqft: 3000, propertyTypes: ['single_family'] },
  { id: 'gym', label: 'Home Gym', icon: 'dumbbell', description: 'Fitness equipment area', minSqft: 2500, propertyTypes: ['all'] },
];

// === UNIFIED SMART SPACES SYSTEM (3-Tier Architecture) ===
// Tier 1: Core Spaces (Always included, cannot remove)
// Tier 2: Conditional Spaces (Included when property qualifies, can exclude)
// Tier 3: Paid Add-ons (Never in base, separate pricing with counters)

// TIER 1: Core spaces - always in base price, shown with lock icon
export const CORE_SPACES = [
  { id: 'kitchen', label: 'Kitchen', emoji: '🍳', icon: 'chef-hat' },
  { id: 'living', label: 'Living Room', emoji: '🛋️', icon: 'sofa' },
  { id: 'hallways', label: 'Hallways & Stairs', emoji: '🚶', icon: 'footprints' },
] as const;

// TIER 2: Conditional spaces - included when property size qualifies
// NOTE: entryway, mudroom, den are now in Premium Spaces (contract-driven via homeMappingRegistry.ts)
export const CONDITIONAL_SPACES = [
  { id: 'dining', label: 'Dining Room', emoji: '🍽️', icon: 'utensils', minSqft: 1200, minBeds: 2 },
] as const;

// TIER 3: Paid add-ons - separate pricing, shown with price badges and counters
export const ADDON_SPACES = [
  { id: 'office', label: 'Office / Study', emoji: '💼', icon: 'briefcase', stdPrice: 15, deepPrice: 35, maxQty: 2 },
  { id: 'laundry', label: 'Laundry Room', emoji: '👕', icon: 'shirt', stdPrice: 35, deepPrice: 35, maxQty: 1 },
  { id: 'loft', label: 'Loft / Media Room', emoji: '🏠', icon: 'layers', stdPrice: 25, deepPrice: 35, maxQty: 2 },
  { id: 'garage', label: 'Garage', emoji: '🚗', icon: 'car', stdPrice: 25, deepPrice: 35, maxQty: 2 },
  { id: 'patio', label: 'Patio / Balcony', emoji: '☀️', icon: 'sun', stdPrice: 15, deepPrice: 25, maxQty: 1 },
] as const;

// Legacy COMMON_SPACE_OPTIONS for backward compatibility
// NOTE: mudroom is now in Premium Spaces (contract-driven via homeMappingRegistry.ts)
export const COMMON_SPACE_OPTIONS: readonly {
  id: string;
  label: string;
  emoji: string;
  icon: string;
  minSqft: number;
  minBeds: number;
  always: boolean;
}[] = [
  { id: 'kitchen', label: 'Kitchen', emoji: '🍳', icon: 'chef-hat', minSqft: 0, minBeds: 0, always: true },
  { id: 'living', label: 'Living Room', emoji: '🛋️', icon: 'sofa', minSqft: 0, minBeds: 0, always: true },
  { id: 'dining', label: 'Dining Room', emoji: '🍽️', icon: 'utensils', minSqft: 1200, minBeds: 2, always: false },
];

// Get available conditional spaces based on property size
export function getAvailableConditionalSpaces(sqftRange: string, beds: number) {
  const sqft = SQFT_RANGE_MAP[sqftRange] || 1000;
  return CONDITIONAL_SPACES.filter(space => sqft >= space.minSqft && beds >= space.minBeds);
}

// Get addon space price based on service type
export function getAddonSpacePrice(spaceId: string, isDeep: boolean): number {
  const space = ADDON_SPACES.find(s => s.id === spaceId);
  if (!space) return 0;
  return isDeep ? space.deepPrice : space.stdPrice;
}

// Inline sqft mapping to avoid circular dependency with pricing_v2
const SQFT_RANGE_MAP: Record<string, number> = {
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

// Get available common spaces based on property size
export function getAvailableSpaces(sqftRange: string, beds: number): typeof COMMON_SPACE_OPTIONS[number][] {
  const sqft = SQFT_RANGE_MAP[sqftRange] || 1000;
  return COMMON_SPACE_OPTIONS.filter(space => {
    if (space.always) return true;
    return sqft >= space.minSqft && beds >= space.minBeds;
  });
}

// Get default included spaces for a property
export function getDefaultIncludedSpaces(sqftRange: string, beds: number): string[] {
  return getAvailableSpaces(sqftRange, beds).map(s => s.id);
}

// === AREAS TO SKIP OPTIONS (Exclusion Chips) ===
export const AREAS_TO_SKIP_OPTIONS: readonly {
  id: string;
  label: string;
  reason: string;
  minBeds?: number;
  minSqft?: number;
  propertyTypes: readonly string[];
}[] = [
  { id: 'skip_master', label: 'Skip Master Bedroom', reason: 'Guest staying', minBeds: 2, propertyTypes: ['all'] },
  { id: 'skip_kids', label: "Skip Kids' Rooms", reason: 'Toys everywhere', minBeds: 3, propertyTypes: ['all'] },
  { id: 'skip_guest', label: 'Skip Guest Room', reason: 'Not in use', minBeds: 3, propertyTypes: ['all'] },
  { id: 'skip_office', label: 'Skip Home Office', reason: 'Confidential papers', minSqft: 1000, propertyTypes: ['all'] },
  { id: 'skip_basement', label: 'Skip Basement/Storage', reason: 'Not in scope', minSqft: 2000, propertyTypes: ['single_family'] },
  { id: 'skip_attic', label: 'Skip Attic', reason: 'Not in scope', minSqft: 2000, propertyTypes: ['single_family'] },
  { id: 'skip_garage', label: 'Skip Garage', reason: 'Not needed', minSqft: 1500, propertyTypes: ['single_family'] },
  { id: 'skip_outdoor', label: 'Skip Outdoor Areas', reason: 'Weather/access', minSqft: 1500, propertyTypes: ['single_family'] },
];

// === SMART DYNAMIC FILTERS ===
import { getSqftMidpoint } from './hourlyLogic';

export type PropertyCategoryType = 'single_family' | 'apartment_condo';

// Get relevant areas to include based on property context
export function getRelevantAreasToInclude(
  propertyCategory: PropertyCategoryType,
  sqftRange: string,
  beds: number
): typeof AREAS_TO_INCLUDE_OPTIONS[number][] {
  const sqft = getSqftMidpoint(sqftRange);
  
  return AREAS_TO_INCLUDE_OPTIONS.filter(area => {
    // Check sqft requirement
    if (sqft < area.minSqft) return false;
    
    // Check property type requirement
    if (!area.propertyTypes.includes('all') && !area.propertyTypes.includes(propertyCategory)) {
      return false;
    }
    
    return true;
  });
}

// Get relevant areas to skip based on property context
export function getRelevantAreasToSkip(
  propertyCategory: PropertyCategoryType,
  sqftRange: string,
  beds: number
): typeof AREAS_TO_SKIP_OPTIONS[number][] {
  const sqft = getSqftMidpoint(sqftRange);
  
  return AREAS_TO_SKIP_OPTIONS.filter(area => {
    // Check beds requirement if exists
    if ('minBeds' in area && beds < (area.minBeds || 0)) return false;
    
    // Check sqft requirement if exists
    if ('minSqft' in area && sqft < (area.minSqft || 0)) return false;
    
    // Check property type requirement
    if (!area.propertyTypes.includes('all') && !area.propertyTypes.includes(propertyCategory)) {
      return false;
    }
    
    return true;
  });
}

// Get default areas to include based on property
export function getDefaultAreasToInclude(propertyCategory: PropertyCategoryType, beds: number): string[] {
  const defaults = ['kitchen', 'living_room'];
  if (beds >= 3) defaults.push('dining_room');
  return defaults;
}

// Cleaning density options for estate mode
export type CleaningDensity = 'entire' | 'main_areas' | 'specific_wing' | 'custom';

export const CLEANING_DENSITY_OPTIONS = [
  { value: 'entire' as CleaningDensity, label: 'Entire Estate', multiplier: 1.0, description: '100% of area' },
  { value: 'main_areas' as CleaningDensity, label: 'Main Areas Only', multiplier: 0.6, description: '~60% of area' },
  { value: 'specific_wing' as CleaningDensity, label: 'Specific Wing', multiplier: 0.35, description: '~35% of area' },
  { value: 'custom' as CleaningDensity, label: 'Custom', multiplier: null, description: 'Enter manually' },
] as const;

// Estate threshold - properties above this trigger estate mode UI
export const ESTATE_SQFT_THRESHOLD = 4000;

// === SOUTH COAST CONCIERGE OPTIONS ===
// Access friction options for SB/Ventura region
export const ACCESS_TYPE_OPTIONS = [
  { value: 'standard' as const, label: 'Driveway / Flat', icon: 'car', detail: 'Standard setup time.', deductMinutes: 0 },
  { value: 'hillside' as const, label: 'Hillside / Stairs', icon: 'stairs', detail: 'Crew requires extra setup time for equipment carry (Riviera/Montecito).', deductMinutes: 15 },
  { value: 'estate_gated' as const, label: 'Gated Estate / Remote', icon: 'gate', detail: 'Long walk from service parking.', deductMinutes: 20 },
] as const;

// Delicate surface options requiring special care
export const DELICATE_SURFACE_OPTIONS = [
  { value: 'stone' as const, label: 'Natural Stone (Travertine/Marble)', icon: 'gem' },
  { value: 'clay' as const, label: 'Saltillo / Spanish Tile', icon: 'brick' },
  { value: 'beams' as const, label: 'High Beams / Vaulted Ceilings', icon: 'ceiling' },
] as const;

// Surface accessibility options affecting cleaning speed (renamed from "Home Condition")
export const HOME_CONDITION_OPTIONS = [
  { value: 'tidy' as const, label: 'Clear Surfaces', description: 'Counters, floors accessible - ready to clean', efficiency: 1.0, emoji: '✨' },
  { value: 'lived_in' as const, label: 'Light Clutter', description: 'Some items to work around (normal)', efficiency: 0.8, emoji: '🏠' },
  { value: 'cluttered' as const, label: 'Heavy Clutter', description: 'Surfaces covered, items on floors', efficiency: 0.6, emoji: '📦' },
  { value: 'deep_recovery' as const, label: 'Heavy Buildup', description: 'Thick dust, grease, grime (slows cleaning)', efficiency: 0.4, emoji: '🔧' },
] as const;

// === HIGH-PERCEPTION LOGISTIC ENGINEERING OPTIONS ===

// Occupancy options - About presence during cleaning (not furniture)
export const OCCUPANCY_OPTIONS = [
  { value: 'vacant' as const, label: 'Unoccupied', description: 'No one home during cleaning (faster, no interruptions)', multiplier: 1.0, icon: 'home' },
  { value: 'occupied' as const, label: 'Occupied', description: 'People, pets, or kids present (requires care)', multiplier: 1.15, icon: 'users' },
] as const;

// Vertical logistics for apartment access
export const VERTICAL_LOGISTICS_OPTIONS = [
  { value: 'ground' as const, label: 'Ground Floor', description: 'Easy access for equipment', addMinutes: 0, icon: 'home' },
  { value: 'elevator' as const, label: 'Elevator', description: 'Building has elevator access', addMinutes: 5, icon: 'building' },
  { value: 'walkup' as const, label: 'Walk-Up', description: 'Stairs only - equipment carry', addMinutes: 15, icon: 'stairs' },
] as const;

// Scope exclusion items (liability protection)
export const SCOPE_EXCLUSION_ITEMS = [
  { id: 'no_biohazard', label: 'No bio-hazards (pet waste, mold, blood)', required: true },
  { id: 'height_limit', label: 'Height Limit: No ladders over 2 steps (OSHA)', required: true },
  { id: 'heavy_lifting', label: 'Heavy Lifting: No furniture over 25lbs', required: true },
] as const;

// === INTENT-BASED CONDITIONAL FIELD CONFIGURATION ===
// Each intent displays ONLY relevant fields to reduce decision fatigue
export const INTENT_FIELD_CONFIG = {
  routine_maintenance: {
    // Fields to SHOW
    showFrequency: true,
    allowedFrequencies: ['daily', 'weekly', 'biweekly', 'monthly'] as const, // Add daily + monthly
    showLifestyleAddons: true,      // Laundry, dishwasher, bed making
    showPetProfile: true,           // Shedding pets → HEPA
    showPropertyStructure: true,    // Show property category
    showPropertyComposition: true,  // ENABLED - need beds/baths for time estimate
    showAreasSelector: true,        // ENABLED - need to know which rooms
    showConditionSlider: false,     // Not needed for maintenance
    showMaterialSafety: false,
    showPriorityTriage: true,       // ENABLED - what matters most each visit
    showLogistics: true,            // ENABLED - access, parking
    showEquipmentPreference: true,  // NEW - who provides supplies
    // Auto-redirect logic
    redirectIfOnetime: 'deep_scrub' as const, // If One-Time attempted, switch intent
    matchingFocus: ['consistency', 'pet-friendly', 'familiarity'],
  },
  priority_focus: {
    showFrequency: true,
    allowedFrequencies: ['daily', 'weekly', 'biweekly', 'monthly', 'onetime'] as const,
    showBudgetTimer: false,         // Using session selector instead
    showPriorityDragDrop: false,    // Replaced by custom section
    showScopeExclusion: false,      // Replaced by custom section
    showPropertyStructure: true,    // ENABLED - The Structure
    showPropertyComposition: true,  // ENABLED - Property Composition
    showAreasSelector: true,        // ENABLED - Rooms to INCLUDE + Areas to SKIP
    showConditionSlider: false,
    showPriorityTriage: false,      // Built into the custom section
    showLogistics: true,            // ENABLED - Property Logistics
    showPriorityFocusSpace: true,   // NEW - Custom Priority Focus Section
    matchingFocus: ['speed', 'task-oriented', 'efficient'],
  },
  deep_scrub: {
    showFrequency: true,
    allowedFrequencies: ['daily', 'weekly', 'biweekly', 'monthly', 'onetime'] as const,
    showGrimeAssessment: true,      // Standard vs Recovery Mode
    showMaterialSafety: true,       // Natural stone check
    showHiddenAreas: true,          // Pull out fridge/oven
    showPropertyStructure: true,
    showPropertyComposition: true,
    showAreasSelector: true,
    showConditionSlider: true,
    showPriorityTriage: true,
    showLogistics: true,
    matchingFocus: ['detail-oriented', 'physical-stamina', 'chemical-expertise'],
  },
  post_event: {
    showFrequency: true,
    allowedFrequencies: ['onetime'] as const, // Typically one-time
    showDebrisVolume: true,         // 1-10+ bags slider
    showHazardCheck: true,          // Sticky spills, biohazard
    showTimeSensitivity: true,      // "Must finish by" input
    showPropertyStructure: false,   // Focus on mess, not structure
    showPropertyComposition: false,
    showAreasSelector: false,
    showConditionSlider: false,
    showPriorityTriage: false,
    showLogistics: false,
    matchingFocus: ['resilient', 'non-judgmental', 'fast-response'],
  },
  organization: {
    showFrequency: true,
    allowedFrequencies: ['daily', 'weekly', 'biweekly', 'monthly', 'onetime'] as const,
    showTaskSelector: true,         // Closet/Pantry/Toys/Packing
    showNoScrubDisclaimer: true,    // Required disclaimer
    showPropertyStructure: false,
    showPropertyComposition: true,  // ENABLED - need home size for organization scope
    showAreasSelector: true,       // ENABLED - "Rooms to INCLUDE This Session"
    showConditionSlider: false,     // Clutter is the point
    showPriorityTriage: false,
    showLogistics: false,
    showClutterLevel: true,         // NEW - assess current clutter state
    matchingFocus: ['organizer', 'high-aesthetics', 'attention-to-detail'],
  },
  move_in_out: {
    showFrequency: true,
    allowedFrequencies: ['onetime'] as const,
    showOccupancyCheck: true,       // CRITICAL: Is home 100% empty?
    showInvisibleChecklist: true,   // Cabinets, fridge, oven, windows
    showReceiptToggle: true,        // Landlord receipt needed?
    showPropertyStructure: true,
    showPropertyComposition: true,
    showAreasSelector: true,
    showConditionSlider: false,
    showPriorityTriage: false,
    showLogistics: true,
    redirectIfFurnished: 'deep_scrub' as const, // If not empty, switch intent
    matchingFocus: ['checklist-perfectionist', 'inspector', 'vacancy-standards'],
  },
} as const;

export type IntentFieldConfig = typeof INTENT_FIELD_CONFIG;
export type IntentFieldConfigKey = keyof IntentFieldConfig;

// Helper to get field config for an intent
export function getIntentFieldConfig(intent: string): typeof INTENT_FIELD_CONFIG[keyof typeof INTENT_FIELD_CONFIG] {
  return INTENT_FIELD_CONFIG[intent as keyof typeof INTENT_FIELD_CONFIG] || INTENT_FIELD_CONFIG.priority_focus;
}

// Service intent options for hourly bookings - UNIFIED (replaces old Service Type + Intensity)
// Rate types: 'basic' = $55/hr, 'deep' = $55/hr + 30% time, 'moveInOut' = $64/hr + 50% time
// Agency Model: Each intent represents a specialist profile, not just a task list
export const HOURLY_INTENT_OPTIONS = [
  { 
    value: 'routine_maintenance' as const, 
    label: 'Routine Lifestyle Support', 
    shortLabel: 'Maintenance',
    aspirationalTitle: 'The Keeper',
    promise: 'Consistency & Peace of Mind',
    description: 'Same professional each visit. Weekly reset, laundry management, and keeping your home running.', 
    clientPitch: 'We match you with a Dedicated Keeper who learns your preferences and ensures your home simply works every week.',
    logisticNote: 'Low rotation. Familiarity with the home. Surface disinfection, dusting, floor maintenance.',
    specialistProfile: 'Detail-oriented and consistent. Assigned cleaner learns your preferences.',
    icon: 'shield',
    intensity: 'basic' as const,
    rateType: 'basic' as const,
    speedMultiplier: 1.0,
    minHours: 2,
    recommendedFrequency: ['weekly', 'biweekly'],
  },
  { 
    value: 'priority_focus' as const, 
    label: 'Priority Focus', 
    shortLabel: 'Priority',
    aspirationalTitle: 'The Efficiency Expert',
    promise: 'Precision & Speed',
    description: 'Targeting specific rooms or tasks only (e.g., "Kitchen & Baths" or "Floors Only").', 
    clientPitch: 'Maximum impact in minimum time. We focus exclusively on your highest-priority areas.',
    logisticNote: 'Efficient task-based cleaning without full-home coverage.',
    specialistProfile: 'Fast, focused, and task-oriented. Maximum impact in minimum time.',
    icon: 'target',
    intensity: 'basic' as const,
    rateType: 'basic' as const,
    speedMultiplier: 1.0,
    minHours: 2,
  },
  { 
    value: 'deep_scrub' as const, 
    label: 'Deep Scrub / Spring Clean', 
    shortLabel: 'Deep Scrub',
    aspirationalTitle: 'The Heavy-Lifter',
    promise: 'Revitalization & Hygiene',
    description: 'Heavy buildup removal, inside appliances, baseboards, and detailed scrubbing.', 
    clientPitch: 'We deploy a Restoration Specialist equipped with heavy-duty supplies to break down buildup and reset your home\'s hygiene baseline.',
    logisticNote: 'Requires +30% time. Rigorous scrubbing of wet areas and kitchen degreasing.',
    specialistProfile: 'High endurance, expert in chemicals and technique. Heavy-duty restoration.',
    icon: 'sparkles',
    intensity: 'deep' as const,
    rateType: 'deep' as const,
    speedMultiplier: 1.3,
    minHours: 4,
    badge: '+30% time',
  },
  { 
    value: 'post_event' as const, 
    label: 'Post-Event / Party Cleanup', 
    shortLabel: 'Post-Event',
    aspirationalTitle: 'The Recovery Team',
    promise: 'Swift Restoration',
    description: 'Restoring order after a gathering. Trash collection, surface wiping, sticky spots.', 
    clientPitch: 'Our Recovery Team specializes in post-event restoration—from trash collection to sticky surface removal.',
    logisticNote: '+10% time for collection and surface restoration.',
    specialistProfile: 'Rapid response team, experts in post-event restoration.',
    icon: 'party',
    intensity: 'basic' as const,
    rateType: 'basic' as const,
    speedMultiplier: 1.1,
    minHours: 2,
    badge: '+10% time',
  },
  { 
    value: 'organization' as const, 
    label: 'Lifestyle & Organization', 
    shortLabel: 'Organize',
    aspirationalTitle: 'The Home Assistant',
    promise: 'Order & Visual Calm',
    description: 'Folding laundry, organizing closets, tidying toys, and clearing surfaces.', 
    clientPitch: 'More than just cleaning, this is Household Management. We match you with a Concierge who has an eye for aesthetics.',
    logisticNote: 'Focus on tidying and order, not heavy scrubbing. Non-toxic products used.',
    specialistProfile: 'Expert in order and aesthetics. Focus on visual calm.',
    scopeWarning: 'Tidying (arranging items) vs. Organizing (systems/categories) - scope must be defined upfront.',
    icon: 'boxes',
    intensity: 'basic' as const,
    rateType: 'basic' as const,
    speedMultiplier: 1.0,
    minHours: 2,
    note: 'Focus on tidying, not cleaning surfaces',
  },
  { 
    value: 'move_in_out' as const, 
    label: 'Move-In / Move-Out', 
    shortLabel: 'Move',
    aspirationalTitle: 'The Finisher',
    promise: 'Fresh Start & Deposit Protection',
    description: 'Technical restoration for empty homes. Inside cabinets, appliances, baseboards, and tracks.', 
    clientPitch: 'We assign a Detailer trained in Vacancy Standards—inside cabinets, appliances, and tracks. 100% Satisfaction Guarantee for deposit inspection.',
    logisticNote: 'Requires +50% time. Includes inside fridge/oven, cabinet interiors, door frames.',
    specialistProfile: 'Fast, efficient, and perfectionist. Trained in vacancy standards.',
    icon: 'key',
    intensity: 'moveInOut' as const,
    rateType: 'moveInOut' as const,
    speedMultiplier: 1.5,
    minHours: 4,
    badge: '+50% time • $64/hr',
    priorityTasks: [
      'Interior of oven and refrigerator',
      'Inside all cabinets and drawers',
      'Baseboards and door frames',
      'Window tracks and sills',
    ],
  },
] as const;

export type HourlyIntentValue = typeof HOURLY_INTENT_OPTIONS[number]['value'];

// Helper functions for Agency Model
export function getAspirationTitle(intent: string | undefined): string {
  const option = HOURLY_INTENT_OPTIONS.find(o => o.value === intent);
  return option?.aspirationalTitle || 'Cleaning Specialist';
}

export function getPromise(intent: string | undefined): string {
  const option = HOURLY_INTENT_OPTIONS.find(o => o.value === intent);
  return option?.promise || 'Professional Cleaning';
}

export function getClientPitch(intent: string | undefined): string {
  const option = HOURLY_INTENT_OPTIONS.find(o => o.value === intent);
  return option?.clientPitch || '';
}

export function getSpecialistProfile(intent: string | undefined): string {
  const option = HOURLY_INTENT_OPTIONS.find(o => o.value === intent);
  return option?.specialistProfile || '';
}

export function getIntentPriorityTasks(intent: string | undefined): string[] {
  const option = HOURLY_INTENT_OPTIONS.find(o => o.value === intent);
  return (option as any)?.priorityTasks || [];
}

// Overtime protocol options
export const OVERTIME_PROTOCOL_OPTIONS = [
  { value: 'strict' as const, label: 'Hard Stop (Strict Budget)', description: 'Stop exactly when booked time ends.' },
  { value: 'flex' as const, label: 'Flexible (Finish the Job)', description: 'Authorize up to 1 hr overtime if "Must Haves" aren\'t done.' },
] as const;

// Priority must-have options for hourly sessions with smart filtering
export const HOURLY_MUST_HAVE_OPTIONS = [
  { id: 'kitchen_deep', label: 'Kitchen Deep Clean', requiresArea: ['kitchen'], minBeds: 0, minBaths: 0, minSqft: 0, propertyTypes: ['all'] },
  { id: 'master_bath', label: 'Master Bath Scrub', requiresArea: [], minBeds: 0, minBaths: 1, minSqft: 0, propertyTypes: ['all'] },
  { id: 'all_bathrooms', label: 'All Bathrooms', requiresArea: [], minBeds: 0, minBaths: 2, minSqft: 0, propertyTypes: ['all'] },
  { id: 'living_areas', label: 'Living Areas', requiresArea: ['living_room'], minBeds: 0, minBaths: 0, minSqft: 0, propertyTypes: ['all'] },
  { id: 'floors', label: 'Floors (Vacuum/Mop)', requiresArea: [], minBeds: 0, minBaths: 0, minSqft: 1500, propertyTypes: ['all'] },
  { id: 'bedrooms', label: 'Bedrooms', requiresArea: [], minBeds: 1, minBaths: 0, minSqft: 0, propertyTypes: ['all'] },
  { id: 'master_bedroom', label: 'Master Bedroom', requiresArea: [], minBeds: 2, minBaths: 0, minSqft: 0, propertyTypes: ['all'] },
  { id: 'kids_rooms', label: "Kids' Rooms", requiresArea: [], minBeds: 3, minBaths: 0, minSqft: 0, propertyTypes: ['all'] },
  { id: 'patio_outdoor', label: 'Patio/Balcony', requiresArea: ['patio', 'balcony'], minBeds: 0, minBaths: 0, minSqft: 0, propertyTypes: ['all'] },
  { id: 'garage', label: 'Garage Sweep', requiresArea: ['garage'], minBeds: 0, minBaths: 0, minSqft: 0, propertyTypes: ['single_family'] },
  { id: 'guest_house', label: 'Guest House', requiresArea: [], minBeds: 0, minBaths: 0, minSqft: 4000, propertyTypes: ['single_family'] },
  { id: 'home_office', label: 'Home Office', requiresArea: ['home_office'], minBeds: 0, minBaths: 0, minSqft: 0, propertyTypes: ['all'] },
  { id: 'laundry_room', label: 'Laundry Room', requiresArea: ['laundry_room'], minBeds: 0, minBaths: 0, minSqft: 0, propertyTypes: ['all'] },
] as const;

// Helper to get sqft midpoint for filtering
function getFilterSqftMidpoint(sqftRange: string): number {
  const option = HOURLY_SQFT_OPTIONS.find(o => o.value === sqftRange);
  return option?.midpoint ?? 1500;
}

// Filter priority options based on property context
export function getRelevantPriorityOptions(
  propertyCategory: PropertyCategoryType,
  sqftRange: string,
  beds: number,
  baths: number,
  areasIncluded: string[]
): typeof HOURLY_MUST_HAVE_OPTIONS[number][] {
  const sqft = getFilterSqftMidpoint(sqftRange);
  
  return HOURLY_MUST_HAVE_OPTIONS.filter(option => {
    // Check property type
    const propertyTypesArr = option.propertyTypes as readonly string[];
    if (propertyTypesArr[0] !== 'all' && !propertyTypesArr.includes(propertyCategory)) {
      return false;
    }
    
    // Check minimum sqft
    if (sqft < option.minSqft) {
      return false;
    }
    
    // Check minimum beds
    if (beds < option.minBeds) {
      return false;
    }
    
    // Check minimum baths
    if (baths < option.minBaths) {
      return false;
    }
    
    // Check required areas (if any required, at least one must be included)
    if (option.requiresArea.length > 0) {
      const hasRequiredArea = option.requiresArea.some(area => areasIncluded.includes(area));
      if (!hasRequiredArea) {
        return false;
      }
    }
    
    return true;
  });
}
export const pricingData: number[][] = [
  [295, 290, 185, 150, 155, 165], // 0: Studio / 1 Bath
  [295, 290, 185, 150, 155, 165], // 1: 1 Bed / 1 Bath
  [320, 315, 200, 160, 170, 180], // 2: 1 Bed / 1.5 Bath
  [330, 325, 205, 165, 175, 185], // 3: 2 Bed / 1 Bath
  [355, 350, 220, 175, 185, 200], // 4: 2 Bed / 1.5 Bath
  [380, 370, 235, 190, 200, 210], // 5: 2 Bed / 2 Bath
  [395, 390, 250, 200, 215, 225], // 6: 2 Bed / 2.5 Bath
  [395, 390, 240, 190, 205, 215], // 7: 3 Bed / 1 Bath
  [455, 450, 270, 215, 230, 245], // 8: 3 Bed / 2 Bath
  [485, 480, 285, 230, 240, 255], // 9: 3 Bed / 2.5 Bath
  [515, 505, 300, 240, 255, 270], // 10: 3 Bed / 3 Bath
  [520, 510, 305, 245, 260, 275], // 11: 4 Bed / 2 Bath
  [580, 570, 335, 270, 285, 300], // 12: 4 Bed / 3 Bath
  [640, 630, 365, 290, 310, 330], // 13: 4 Bed / 4 Bath
  [690, 680, 430, 345, 365, 385], // 14: 5 Bed / 3 Bath
];

// Service type to column index mapping
export const serviceTypeMap: Record<string, number> = {
  'Standard Clean': 2,
  'Deep Clean': 1,
  'Move-In/Out': 0,
  'Weekly Price': 3,
  'Bi-Weekly Price': 4,
  'Monthly Price': 5,
};

// All addon prices (includes windows, blinds, appliances, extras, and recurring)
export const addonPrices: Record<string, number> = {
  // Appliance Detailing
  oven: 35,
  fridge_empty: 35,
  fridge_org: 65,
  // cabinets: DEPRECATED - now uses dynamic SSOT pricing in pricing_kitchen.ts
  // upper_cabinets: DEPRECATED - now uses dynamic SSOT pricing in pricing_kitchen.ts
  // kitchen_cabinets_degrease: DEPRECATED - now uses dynamic SSOT pricing in pricing_kitchen.ts
  hood: 35,
  patio: 15,
  
  // Standard Clean Only Add-ons
  sliding_patio_glass: 5,
  patio_sweep: 15,
  interior_windows: 5,
  fridge_organize: 65,
  
  // Recurring Only Add-ons
  pets: 15,
  
  // Extra Touches
  sheets: 10,
  laundry: 15,
  dishwashing: 10,
  dishwasher_run: 5,
  organization: 35,
  ceiling_fan: 10,
  light_fixture: 5,
  laundry_room: 25,
  office_room: 25,
  loft_room: 25,
  garage_room: 35,
  fireplace: 15,
  
  // Window add-ons (by type) - base prices per side
  window_standard: 5,
  window_picture: 8.5,
  window_garden: 5,
  window_bay: 8.5,
  window_bow: 8.5,
  window_patio: 5,
  window_awning: 5,
  window_hopper: 5,
  window_casement: 5,
  window_doublehung: 5,
  window_trapezoid: 5,
  window_circle: 10,
  
  // Window add-ons - inside/outside variants (same price per side)
  window_standard_in: 5,
  window_standard_out: 5,
  window_picture_in: 8.5,
  window_picture_out: 8.5,
  window_garden_in: 5,
  window_garden_out: 5,
  window_bay_in: 8.5,
  window_bay_out: 8.5,
  window_bow_in: 8.5,
  window_bow_out: 8.5,
  window_patio_in: 5,
  window_patio_out: 5,
  window_awning_in: 5,
  window_awning_out: 5,
  window_hopper_in: 5,
  window_hopper_out: 5,
  window_casement_in: 5,
  window_casement_out: 5,
  window_doublehung_in: 5,
  window_doublehung_out: 5,
  window_trapezoid_in: 5,
  window_trapezoid_out: 5,
  window_circle_in: 10,
  window_circle_out: 10,
  
  // Blind add-ons
  blinds_standard: 15,
  blinds_shutters: 8,
  
  // Legacy window/blind keys (for backward compatibility)
  win_std: 5,
  win_large: 8.5,
  win_patio: 5,
  window_in: 5,
  blinds: 10,
  blind_std: 10,
  blind_venetian: 15,
  blind_vertical: 20,
  blind_shutter: 25,
  
  // Bedroom/Living extras (for custom mode)
  bedroom_window: 5,
  bedroom_blinds: 10,
  living_window: 5,
  living_blinds: 20,
  living_patio: 15,
  living_pet_hair: 25,
};

// Home size dropdown options
// Home size dropdown options - Bedroom-only model (V2 Pricing)
// Bathrooms are now calculated separately via BATH_RATES
export const homeSizeOptions = [
  { value: 0, labelKey: 'opt.studio' },
  { value: 1, labelKey: 'opt.1bed' },
  { value: 2, labelKey: 'opt.2bed' },
  { value: 3, labelKey: 'opt.3bed' },
  { value: 4, labelKey: 'opt.4bed' },
  { value: 5, labelKey: 'opt.5bed' },
  { value: 6, labelKey: 'opt.6bed' },
];

// Square footage dropdown options
export const sqftOptions = [
  { value: 'Studio (350-650 sqft)', labelKey: 'sqft.studio' },
  { value: '1 Bed (650-1,100 sqft)', labelKey: 'sqft.1bed' },
  { value: '2 Bed (1,100-1,700 sqft)', labelKey: 'sqft.2bed' },
  { value: '2 Bed Large (1,700-2,000 sqft)', labelKey: 'sqft.2bedlarge' },
  { value: '3 Bed (1,600-2,400 sqft)', labelKey: 'sqft.3bed' },
  { value: '3 Bed Large (2,400-2,800 sqft)', labelKey: 'sqft.3bedlarge' },
  { value: '4 Bed (2,400-3,000 sqft)', labelKey: 'sqft.4bed' },
  { value: '4 Bed Large (3,000-3,500 sqft)', labelKey: 'sqft.4bedlarge' },
  { value: '5 Bed (3,500-4,500 sqft)', labelKey: 'sqft.5bed' },
  { value: '5+ Bed (4,500-5,500+ sqft)', labelKey: 'sqft.5plus' },
  { value: 'Luxury (5,500-7,000+ sqft)', labelKey: 'sqft.luxury' },
  { value: 'Estate (7,000+ sqft)', labelKey: 'sqft.estate' },
];

// Service type options for selector
export const serviceTypes = [
  { value: 'Standard Clean', labelKey: 'st.standard', icon: 'sparkles' },
  { value: 'Deep Clean', labelKey: 'st.deep', icon: 'sparkles' },
  { value: 'Move-In/Out', labelKey: 'st.move', icon: 'truck' },
  { value: 'Weekly Price', labelKey: 'st.weekly', icon: 'calendar', badge: 'badge.save20' },
  { value: 'Bi-Weekly Price', labelKey: 'st.biweekly', icon: 'calendar', badge: 'badge.save15' },
  { value: 'Monthly Price', labelKey: 'st.monthly', icon: 'calendar', badge: 'badge.save10' },
];

// Condition fee options
export const conditionFees = [
  { value: 0, labelKey: 'fee.std', subKey: 'fee.std_sub' },
  { value: 120, labelKey: 'fee.heavy', subKey: 'fee.heavy_sub' },
  { value: 180, labelKey: 'fee.extra', subKey: 'fee.extra_sub' },
];

// ============ ADDON CATEGORIES FOR FULL HOME REFRESH ============

// A. Appliance Detailing
export const applianceAddons = [
  { value: 'oven', labelKey: 'addon.oven', price: 35 },
  { value: 'fridge_empty', labelKey: 'addon.fridge_empty', price: 35 },
  { value: 'fridge_org', labelKey: 'addon.fridge_org', price: 65 },
  { value: 'cabinets', labelKey: 'addon.cabinets', price: 45 },
  { value: 'hood', labelKey: 'addon.hood', price: 35 },
  { value: 'patio', labelKey: 'addon.patio', price: 15 },
];

// B. Extra Touches
// NOTE: laundry_room, office_room, loft_room, garage_room moved to Functional Zones in StepStart
export const extraTouchAddons = [
  { value: 'sheets', labelKey: 'addon.sheets', price: 10, hasQuantity: true, unit: '/bed' },
  { value: 'laundry', labelKey: 'addon.laundry', price: 15, hasQuantity: true, unit: '/load' },
  { value: 'dishwashing', labelKey: 'addon.dishwashing', price: 10 },
  { value: 'dishwasher_run', labelKey: 'addon.dishwasher_run', price: 5 },
  { value: 'organization', labelKey: 'addon.organization', price: 35, hasQuantity: true, unit: '/hr' },
  { value: 'ceiling_fan', labelKey: 'addon.ceiling_fan', price: 10, hasQuantity: true, unit: ' ea' },
  { value: 'light_fixture', labelKey: 'addon.light_fixture', price: 5, hasQuantity: true, unit: ' ea' },
  { value: 'fireplace', labelKey: 'addon.fireplace', price: 15 },
];

// ============ STANDARD CLEAN ONLY ADD-ONS ============
// These add-ons are ONLY available for Standard Clean service type
export const standardCleanOnlyAddons = [
  { value: 'sliding_patio_glass', labelKey: 'addon.sliding_patio_glass', price: 5, standardOnly: true },
  { value: 'patio_sweep', labelKey: 'addon.patio_sweep', price: 15, standardOnly: true },
  { value: 'interior_windows', labelKey: 'addon.interior_windows', price: 5, hasQuantity: true, unit: '/panel', standardOnly: true },
  { value: 'fridge_organize', labelKey: 'addon.fridge_organize', price: 65, standardOnly: true },
];

// ============ RECURRING ADD-ONS ============
// Available for recurring services (Weekly, Bi-Weekly, Monthly) and I Live Here / I'm Moving flows
export const recurringOnlyAddons = [
  { value: 'pets', labelKey: 'addon.pets', price: 15, recurringOnly: true },
];

// C. Windows & Blinds Add-Ons (shown when toggle is enabled)
export const windowTypeAddons = [
  { value: 'window_standard', labelKey: 'win.standard', price: 5, hasQuantity: true, unit: ' ea', laborMinutes: 4.5 },
  { value: 'window_picture', labelKey: 'win.picture', price: 8.5, hasQuantity: true, unit: ' ea', laborMinutes: 8 },
  { value: 'window_garden', labelKey: 'win.garden', price: 5, hasQuantity: true, unit: ' ea', laborMinutes: 4.5 },
  { value: 'window_bay', labelKey: 'win.bay', price: 8.5, hasQuantity: true, unit: ' ea', laborMinutes: 8 },
  { value: 'window_bow', labelKey: 'win.bow', price: 8.5, hasQuantity: true, unit: ' ea', laborMinutes: 8 },
  { value: 'window_patio', labelKey: 'win.patio_door', price: 5, hasQuantity: true, unit: ' ea', laborMinutes: 4.5 },
  { value: 'window_awning', labelKey: 'win.awning', price: 5, hasQuantity: true, unit: ' ea', laborMinutes: 4.5 },
  { value: 'window_hopper', labelKey: 'win.hopper', price: 5, hasQuantity: true, unit: ' ea', laborMinutes: 4.5 },
  { value: 'window_casement', labelKey: 'win.casement', price: 5, hasQuantity: true, unit: ' ea', laborMinutes: 4.5 },
  { value: 'window_doublehung', labelKey: 'win.doublehung', price: 5, hasQuantity: true, unit: ' ea', laborMinutes: 4.5 },
  { value: 'window_trapezoid', labelKey: 'win.trapezoid', price: 5, hasQuantity: true, unit: ' ea', laborMinutes: 4.5 },
  { value: 'window_circle', labelKey: 'win.circle', price: 10, hasQuantity: true, unit: ' ea', laborMinutes: 9.5 },
];

export const blindTypeAddons = [
  { value: 'blinds_standard', labelKey: 'blind.standard', price: 15, hasQuantity: true, unit: ' ea', laborMinutes: 15 },
  { value: 'blinds_shutters', labelKey: 'blind.shutters', price: 8, hasQuantity: true, unit: ' ea', laborMinutes: 12 },
];

// Legacy one-time add-ons (for backward compatibility)
export const oneTimeAddons = [
  { value: 'oven', labelKey: 'addon.oven', price: 35 },
  { value: 'fridge_empty', labelKey: 'addon.fridge_empty', price: 35 },
  { value: 'fridge_org', labelKey: 'addon.fridge_org', price: 65 },
  { value: 'cabinets', labelKey: 'addon.cabinets', price: 45 },
  { value: 'hood', labelKey: 'addon.hood', price: 35 },
  { value: 'patio', labelKey: 'addon.patio', price: 15 },
];

// Legacy recurring add-ons (for backward compatibility)
export const recurringAddons = [
  { value: 'sheets', labelKey: 'addon.sheets', price: 10, hasQuantity: true, unit: '/bed' },
  { value: 'laundry', labelKey: 'addon.laundry', price: 15, hasQuantity: true, unit: '/load' },
];

// Legacy window cleaning add-ons (for backward compatibility)
export const windowAddons = [
  { value: 'win_std', labelKey: 'win.std', price: 5, icon: 'grid-2x2' },
  { value: 'win_large', labelKey: 'win.large', price: 8.5, icon: 'maximize' },
  { value: 'win_patio', labelKey: 'win.patio', price: 5, icon: 'door-open' },
];

// Legacy blind cleaning add-ons (for backward compatibility)
export const blindAddons = [
  { value: 'blind_std', labelKey: 'blind.std', price: 10, icon: 'align-justify' },
  { value: 'blind_venetian', labelKey: 'blind.venetian', price: 15, icon: 'list' },
  { value: 'blind_vertical', labelKey: 'blind.vertical', price: 20, icon: 'grip-vertical' },
  { value: 'blind_shutter', labelKey: 'blind.shutter', price: 25, icon: 'columns' },
];

// Living room add-ons (for custom mode)
export const livingAddons = [
  { value: 'living_pet_hair', labelKey: 'addon.pet_hair', price: 25 },
  { value: 'living_blinds', labelKey: 'addon.living_blinds', price: 20 },
  { value: 'patio', labelKey: 'addon.patio', price: 15 },
];

// ============ MICRO-SERVICES (Minimum $120 Visit) ============
// These are standalone tasks for quick, focused cleaning visits

export interface MicroService {
  id: string;
  labelKey: string;
  helperKey: string;
  priceFirst: number;           // Price for first unit (or per-unit price for 'per-unit' type)
  priceAdditional?: number;     // Price for additional units (defaults to priceFirst if undefined)
  maxQuantity: number;          // Maximum quantity allowed
  category: 'bathroom' | 'kitchen' | 'general';
  // Pricing type: 'standard' = first/additional, 'per-unit' = flat rate per unit, 'sqft-based' = depends on home size
  pricingType?: 'standard' | 'per-unit' | 'sqft-based';
  // Heavy surcharge: applies additional % when condition is "Heavy" (conditionFee === 180)
  heavySurchargePercent?: number;
  // Labor time estimates (minutes)
  estimatedMinutesFirst?: number;   // Time for first unit
  estimatedMinutesAdd?: number;     // Time for additional units
}

// === PROGRESSIVE CABINET PRICING (Zone-Based) ===
// Kitchen price scales by sqft, bathroom/laundry are flat rates
import { 
  CABINET_ZONES, 
  CABINET_ORGANIZATION_RATE,
  getSqftFromRange,
  getKitchenCabinetPrice,
  calculateProgressiveCabinetPrice 
} from './pricing_v2';

// Re-export for convenience
export { 
  CABINET_ZONES, 
  CABINET_ORGANIZATION_RATE,
  getSqftFromRange,
  getKitchenCabinetPrice,
  calculateProgressiveCabinetPrice 
};

// Legacy sqft-based pricing tiers for micro-services (Cabinet Interiors Only)
export const CABINET_SQFT_TIERS = [
  { maxSqft: 1500, price: 35 },    // Small homes: $35 kitchen base
  { maxSqft: 3500, price: 45 },    // Medium homes: $45 kitchen base
  { maxSqft: Infinity, price: 50 }, // Large homes: $50 kitchen base
];

// Map sqft dropdown value to approximate sqft for cabinet pricing
export const getSqftApproximate = (sqftValue: string): number => {
  // Extract upper bound from sqft value string
  if (sqftValue.includes('Studio')) return 650;
  if (sqftValue.includes('1 Bed')) return 1100;
  if (sqftValue.includes('2 Bed Large') || sqftValue.includes('2 Bed Spacious')) return 2000;
  if (sqftValue.includes('2 Bed')) return 1700;
  if (sqftValue.includes('3 Bed Large') || sqftValue.includes('3 Bed Spacious')) return 2800;
  if (sqftValue.includes('3 Bed')) return 2400;
  if (sqftValue.includes('4 Bed Large') || sqftValue.includes('4 Bed Spacious')) return 3500;
  if (sqftValue.includes('4 Bed')) return 3000;
  if (sqftValue.includes('5+ Bed') || sqftValue.includes('5 Bed')) return 5000;
  if (sqftValue.includes('Luxury')) return 6500;
  if (sqftValue.includes('Estate')) return 8000;
  return 1700; // Default to medium tier
};

// Get cabinet price based on sqft tier (kitchen only, for micro-services)
export const getCabinetPriceFromSqft = (sqftValue: string): number => {
  const sqft = getSqftApproximate(sqftValue);
  for (const tier of CABINET_SQFT_TIERS) {
    if (sqft <= tier.maxSqft) return tier.price;
  }
  return CABINET_SQFT_TIERS[CABINET_SQFT_TIERS.length - 1].price;
};

// Helper to calculate micro-service price for a given quantity
// For sqft-based services (cabinets), pass sqftValue to get the correct base price
export const calculateMicroServicePrice = (
  service: MicroService, 
  quantity: number, 
  sqftValue?: string
): number => {
  if (quantity <= 0) return 0;
  
  // Per-unit pricing (e.g., blinds): flat rate × quantity
  if (service.pricingType === 'per-unit') {
    return service.priceFirst * quantity;
  }
  
  // Sqft-based pricing (e.g., cabinets): price based on home size
  if (service.pricingType === 'sqft-based') {
    const basePrice = sqftValue ? getCabinetPriceFromSqft(sqftValue) : service.priceFirst;
    return basePrice * quantity;
  }
  
  // Standard first/additional pricing
  if (quantity === 1) return service.priceFirst;
  const additional = service.priceAdditional ?? service.priceFirst;
  return service.priceFirst + (quantity - 1) * additional;
};

export const microServices: MicroService[] = [
  // Bathroom Micro-Services (with heavy surcharge)
  {
    id: 'micro_toilet_only',
    labelKey: 'micro.toilet_only',
    helperKey: 'micro.toilet_only_helper',
    priceFirst: 60,
    priceAdditional: 60,
    maxQuantity: 3,
    category: 'bathroom',
    heavySurchargePercent: 30,
    estimatedMinutesFirst: 45,
    estimatedMinutesAdd: 25,
  },
  {
    id: 'micro_bathtub_only',
    labelKey: 'micro.bathtub_only',
    helperKey: 'micro.bathtub_only_helper',
    priceFirst: 90,
    priceAdditional: 45,
    maxQuantity: 3,
    category: 'bathroom',
    heavySurchargePercent: 30,
    estimatedMinutesFirst: 70,
    estimatedMinutesAdd: 40,
  },
  {
    id: 'micro_shower_only',
    labelKey: 'micro.shower_only',
    helperKey: 'micro.shower_only_helper',
    priceFirst: 100,
    priceAdditional: 45,
    maxQuantity: 3,
    category: 'bathroom',
    heavySurchargePercent: 30,
    estimatedMinutesFirst: 75,
    estimatedMinutesAdd: 40,
  },
  {
    id: 'micro_shower_doors_only',
    labelKey: 'micro.shower_doors_only',
    helperKey: 'micro.shower_doors_only_helper',
    priceFirst: 90,
    priceAdditional: 45,
    maxQuantity: 3,
    category: 'bathroom',
    heavySurchargePercent: 30,
    estimatedMinutesFirst: 60,
    estimatedMinutesAdd: 35,
  },
  // Kitchen Micro-Services (some with heavy surcharge)
  {
    id: 'micro_oven_only',
    labelKey: 'micro.oven_only',
    helperKey: 'micro.oven_only_helper',
    priceFirst: 90,
    priceAdditional: 50,
    maxQuantity: 2,
    category: 'kitchen',
    heavySurchargePercent: 30,
    estimatedMinutesFirst: 80,
    estimatedMinutesAdd: 45,
  },
  {
    id: 'micro_fridge_only',
    labelKey: 'micro.fridge_only',
    helperKey: 'micro.fridge_only_helper',
    priceFirst: 90,
    priceAdditional: 50,
    maxQuantity: 2,
    category: 'kitchen',
    heavySurchargePercent: 30,
    estimatedMinutesFirst: 80,
    estimatedMinutesAdd: 35,
  },
  {
    id: 'micro_cabinets_only',
    labelKey: 'micro.cabinets_only',
    helperKey: 'micro.cabinets_only_helper',
    priceFirst: 110,
    maxQuantity: 1,
    category: 'kitchen',
    pricingType: 'sqft-based',
    estimatedMinutesFirst: 60,
    estimatedMinutesAdd: 45,
  },
  {
    id: 'micro_rangehood_only',
    labelKey: 'micro.rangehood_only',
    helperKey: 'micro.rangehood_only_helper',
    priceFirst: 80,
    priceAdditional: 50,
    maxQuantity: 2,
    category: 'kitchen',
    estimatedMinutesFirst: 45,
    estimatedMinutesAdd: 30,
  },
  // General Micro-Services
  {
    id: 'micro_blinds_only',
    labelKey: 'micro.blinds_only',
    helperKey: 'micro.blinds_only_helper',
    priceFirst: 12,
    maxQuantity: 25,
    category: 'general',
    pricingType: 'per-unit',
    estimatedMinutesFirst: 8,
    estimatedMinutesAdd: 8,
  },
  {
    id: 'micro_sliding_glass_only',
    labelKey: 'micro.sliding_glass_only',
    helperKey: 'micro.sliding_glass_only_helper',
    priceFirst: 80,
    priceAdditional: 50,
    maxQuantity: 3,
    category: 'general',
    estimatedMinutesFirst: 25,
    estimatedMinutesAdd: 15,
  },
  {
    id: 'micro_linen_change_only',
    labelKey: 'micro.linen_change_only',
    helperKey: 'micro.linen_change_only_helper',
    priceFirst: 25,
    priceAdditional: 20,
    maxQuantity: 4,
    category: 'general',
    estimatedMinutesFirst: 15,
    estimatedMinutesAdd: 10,
  },
  {
    id: 'micro_dusting_only',
    labelKey: 'micro.dusting_only',
    helperKey: 'micro.dusting_only_helper',
    priceFirst: 120,
    priceAdditional: 60,
    maxQuantity: 2,
    category: 'general',
    estimatedMinutesFirst: 70,
    estimatedMinutesAdd: 45,
  },
  // New micro-services
  {
    id: 'micro_microwave_only',
    labelKey: 'micro.microwave_only',
    helperKey: 'micro.microwave_only_helper',
    priceFirst: 15,
    priceAdditional: 15,
    maxQuantity: 2,
    category: 'kitchen',
    estimatedMinutesFirst: 10,
    estimatedMinutesAdd: 10,
  },
  {
    id: 'micro_wet_wipe_blinds',
    labelKey: 'micro.wet_wipe_blinds',
    helperKey: 'micro.wet_wipe_blinds_helper',
    priceFirst: 15,
    maxQuantity: 20,
    category: 'general',
    pricingType: 'per-unit',
    estimatedMinutesFirst: 15,
    estimatedMinutesAdd: 15,
  },
  {
    id: 'micro_baseboard_detailing',
    labelKey: 'micro.baseboard_detailing',
    helperKey: 'micro.baseboard_detailing_helper',
    priceFirst: 25,
    maxQuantity: 10,
    category: 'general',
    pricingType: 'per-unit',
    estimatedMinutesFirst: 25,
    estimatedMinutesAdd: 25,
  },
  {
    id: 'micro_laundry_fold',
    labelKey: 'micro.laundry_fold',
    helperKey: 'micro.laundry_fold_helper',
    priceFirst: 20,
    maxQuantity: 5,
    category: 'general',
    pricingType: 'per-unit',
    estimatedMinutesFirst: 20,
    estimatedMinutesAdd: 20,
  },
  // NOTE: micro_garage_sweep moved to Functional Zones in StepStart
];

// Micro-services minimum visit charge
export const MICRO_SERVICES_MINIMUM = 120;

// English labels for micro-services (for payloads/PDF)
export const microServiceEnglishLabels: Record<string, string> = {
  'micro_toilet_only': 'Toilet Deep Clean Only',
  'micro_bathtub_only': 'Bathtub Deep Clean Only',
  'micro_shower_only': 'Shower Deep Clean Only',
  'micro_shower_doors_only': 'Shower Doors — Hard Water Removal',
  'micro_oven_only': 'Oven Interior Only',
  'micro_fridge_only': 'Fridge Interior Only',
  'micro_cabinets_only': 'Cabinet Interiors Only',
  'micro_rangehood_only': 'Range Hood Degrease Only',
  'micro_blinds_only': 'Blinds Only',
  'micro_sliding_glass_only': 'Sliding Door Glass Only',
  'micro_linen_change_only': 'Linen Change Only',
  'micro_dusting_only': 'Living Area Dusting Only',
  // New micro-services
  'micro_microwave_only': 'Microwave Interior Only',
  'micro_wet_wipe_blinds': 'Wet Wipe Blinds (per set)',
  'micro_baseboard_detailing': 'Baseboard Detailing (per room)',
  'micro_laundry_fold': 'Wash & Fold Laundry (per load)',
  'micro_garage_sweep': 'Garage Sweep',
};

// Check if heavy condition is selected (conditionFee >= 120)
// Note: conditionFee 120 is "Heavy", 180 is "Extra Heavy" - we apply heavy surcharge to both
export const isHeavyCondition = (conditionFee: number): boolean => {
  return conditionFee >= 120;
};

// Dynamic cabinet pricing based on sqft selection (legacy - kept for backward compatibility)
export const getCabinetPrice = (sqftValue: string): number => {
  if (sqftValue.includes('3 Bed') && !sqftValue.includes('Large')) return 55;
  if (sqftValue.includes('3 Bed Large') || sqftValue.includes('4 Bed')) return 65;
  if (sqftValue.includes('5+ Bed') || sqftValue.includes('5 Bed') || sqftValue.includes('Luxury') || sqftValue.includes('Estate')) return 85;
  return 45;
};

// ============ V2 COMPONENT-BASED PRICING INTEGRATION ============
// Re-export V2 pricing functions for use across the app
export {
  HOME_BASE_RATES,
  BATH_RATES,
  CABINET_LOGIC,
  FREQUENCY_MULTIPLIERS,
  CONDITION_FACTORS,
  getBedroomCountFromHomeSize,
  getHomeBaseRate,
  calculateBathroomTotal,
  calculateCabinetPrice,
  getFrequencyMultiplier,
  getConditionMultiplier,
  getDefaultBathroomCounts,
  calculateComponentPrice,
} from './pricing_v2';
