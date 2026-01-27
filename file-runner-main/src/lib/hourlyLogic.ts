// ============= ESTATE & COMPOUND HOURLY LOGIC ENGINE =============
// Calculates recommended hours for large properties with logistics overhead
// Enhanced with South Coast Concierge features for SB/Ventura region
// === V2: Accurate Session Suggestions based on Service Intent & Job Requirements ===

import { BookingFormData } from '@/contexts/BookingContext';
import { HOURLY_CONFIG, HOURLY_SQFT_OPTIONS, ADDON_TIMES, CleaningDensity } from './pricing';

// Estate logistics constants
export const ESTATE_LOGIC = {
  // Minutes lost per 1,000 sqft of TOTAL property (traversal time)
  dragPer1000Sqft: 2.5,
  
  // Setup time per additional structure (minutes) - LEGACY (kept for backward compat)
  setupGuestHouse: 25,
  setupPoolHouse: 15,
  
  // === ENHANCED ADDITIONAL STRUCTURES SYSTEM (Premium Estate Flow) ===
  additionalStructures: {
    guest_house: {
      id: 'guest_house',
      label: 'Guest House',
      labelEs: 'Casa de Huéspedes',
      description: 'Detached dwelling - full kitchen, bath, living area',
      descriptionEs: 'Vivienda separada - cocina, baño, sala completos',
      emoji: '🏡',
      setupMinutes: 25,          // Logistics drag (moving equipment between buildings)
      activeCleaningMinutes: 90,  // Base cleaning labor (400-600 sqft)
      deepCleaningMinutes: 120,   // Deep clean takes longer
      moveInMinutes: 150,         // Move-in standard requires more detail
      maxCount: 3,
      sqftEstimate: '400-800 sqft',
      typicalRooms: '1 bed, 1 bath, kitchenette',
      isDetached: true,
    },
    studio: {
      id: 'studio',
      label: 'Studio / ADU',
      labelEs: 'Estudio / ADU',
      description: 'Attached unit - shares wall with main house',
      descriptionEs: 'Unidad adjunta - comparte pared con casa principal',
      emoji: '🏠',
      setupMinutes: 10,          // Less setup (attached, no equipment move)
      activeCleaningMinutes: 60,  // Smaller footprint (~300-500 sqft)
      deepCleaningMinutes: 80,    // Deep clean
      moveInMinutes: 100,         // Move-in detail
      maxCount: 2,
      sqftEstimate: '300-500 sqft',
      typicalRooms: 'Open floor plan, 1 bath',
      isDetached: false,
    },
    pool_house: {
      id: 'pool_house',
      label: 'Pool House / Cabana',
      labelEs: 'Casa de Piscina',
      description: 'Poolside structure - bathroom, changing area',
      descriptionEs: 'Estructura junto a piscina - baño, vestidor',
      emoji: '🏊',
      setupMinutes: 15,          // Equipment carry to pool area
      activeCleaningMinutes: 45,  // Smaller, simpler (~200-400 sqft)
      deepCleaningMinutes: 60,
      moveInMinutes: 75,
      maxCount: 2,
      sqftEstimate: '200-400 sqft',
      typicalRooms: 'Bath, kitchenette optional',
      isDetached: true,
    },
  } as const,
  
  // Base setup time (equipment unload, initial consult)
  baseSetup: 20,
  
  // Cleaning speed (man-minutes per 1,000 sqft of ACTIVE cleaning area)
  speed: {
    maintenance: 45,      // Standard hourly (surface clean)
    deep: 90,             // Deep clean with furniture
    moveIn: 120,          // Move-In vacant (cabinets, baseboards, detail)
  },
  
  // === V2: ROOM-BASED TIME CONSTANTS (per spec) ===
  roomBasedTime: {
    bathroom: 45,         // 45 min per bathroom (standard)
    bathroom_moveIn: 60,  // 60 min per bathroom (move-in/deep)
    kitchen: 60,          // 60 min for kitchen (standard)
    kitchen_deep: 90,     // 90 min for kitchen (deep/move-in)
    bedroom: 25,          // 25 min per bedroom/common area
    bedroom_deep: 35,     // 35 min per bedroom (deep/move-in)
    living: 45,           // 45 min living areas (standard)
    living_deep: 70,      // 70 min living areas (deep)
  },
  
  // === V3: UNIFIED SPACES TIME CONSTANTS (Work-Summation Engine) ===
  // These minutes sum into the total BEFORE applying intent multiplier
  unifiedSpacesTime: {
    office: 25,           // Detail on screens, shelves, desk organization
    laundry: 15,          // Filter cleaning, machine exteriors, surfaces
    loft: 25,             // Deep upholstery vacuum, electronics dusting
    garage: 30,           // Technical sweep, cobweb removal (high-level dusting)
    patio_sweep: 15,      // Surface debris, basic furniture
    patio_scrub: 35,      // Pressure wash or mechanical scrub (stone/cement)
  },
  
  // === LUXURY MOVE-IN MULTIPLIER (The Finisher Concierge) ===
  luxuryMoveInMultiplier: 1.5, // Applied to unified spaces when isMovingHourly
  
  // === SERVICE INTENT SPEED MULTIPLIERS (per Agency Model) ===
  // Updated based on scientific cleaning matrix
  intentSpeedMultiplier: {
    routine_maintenance: 1.0, // The Keeper - $110/hr
    priority_focus: 0.9,      // The Efficiency Expert - FAST, $110/hr
    deep_scrub: 1.35,         // The Heavy-Lifter - $120/hr
    post_event: 1.15,         // The Recovery Team - $115/hr
    organization: 1.0,        // The Home Assistant - $110/hr
    move_in_out: 1.50,        // The Finisher - $128/hr, vacancy standards
  } as Record<string, number>,
  
  // === SUGGESTED HOURLY RATES BY INTENT (for display) ===
  intentHourlyRates: {
    routine_maintenance: 110,
    priority_focus: 110,
    deep_scrub: 120,
    post_event: 115,
    organization: 55,    // $55/hr specialist rate (organization mode)
    move_in_out: 128,
  } as Record<string, number>,
  
  // ═══════════════════════════════════════════════════════════════════════
  // THE HOME ASSISTANT: LUXURY RESIDENTIAL ORGANIZATION ENGINE
  // Tarifa de Especialista: $55/hr | Equipo: 1 Specialist Default
  // ═══════════════════════════════════════════════════════════════════════
  organizationMode: {
    // === PARADIGM SHIFT ===
    surfaceScrubMultiplier: 0.0,      // IGNORA fregado de superficies
    organizingMultiplier: 1.0,        // ACTIVA Labor Organizativa 100%
    
    // === AESTHETIC ASSESSMENT PROTOCOL ===
    aestheticAssessment: 30,          // 30 min obligatorio para diseño de flujo visual
    
    // === CLUTTER FRICTION MULTIPLIER ===
    clutterMultiplier: {
      minimal: 0.8,                   // -20% - espacios despejados
      moderate: 1.0,                  // Base time
      significant: 1.3,               // +30% - más objetos que ordenar
      overwhelming: 1.6,              // +60% - requiere despejar pasillos
    } as Record<string, number>,
    
    // === AESTHETIC BUFFER (Desplazamiento SB/Ventura) ===
    aestheticBuffer: {
      baseSqft: 1000,
      minutesPer500Sqft: 10,          // +10 min por cada 500 sqft adicionales
      maxMinutes: 60,                 // Cap at 60 min
    },
    
    // === SPECIALIST RATE ===
    hourlyRate: 55,
  },

  // === DYNAMIC ORGANIZATION MENU (Per-Unit Task Engine) ===
  organizationTasks: {
    laundry_management: { 
      id: 'laundry_management',
      label: 'Laundry Management',
      labelEs: 'Gestión de Lavandería',
      description: 'Folding and put-away only',
      descriptionEs: 'Solo doblado y guardado',
      baseMinutes: 20,
      isPerUnit: true,
      unitLabel: 'load',
      unitLabelEs: 'carga',
      maxUnits: 5,
    },
    closet_curation: {
      id: 'closet_curation',
      label: 'Closet Curation',
      labelEs: 'Curación de Armarios',
      description: 'Color-coding and hanging',
      descriptionEs: 'Ordenar por color y colgar',
      baseMinutes: 45,
      isPerUnit: true,
      unitLabel: 'closet',
      unitLabelEs: 'armario',
      maxUnits: 6,
    },
    toy_nursery_reset: {
      id: 'toy_nursery_reset',
      label: 'Toy/Nursery Reset',
      labelEs: 'Reset de Juguetes/Cuarto',
      description: 'Sorting and binning',
      descriptionEs: 'Clasificar y guardar en cajas',
      baseMinutes: 30,
      isPerUnit: true,
      unitLabel: 'room',
      unitLabelEs: 'habitación',
      maxUnits: 3,
    },
    pantry_kitchen_tidying: {
      id: 'pantry_kitchen_tidying',
      label: 'Pantry/Kitchen Tidying',
      labelEs: 'Orden de Despensa/Cocina',
      description: 'Lining up labels, clearing counters',
      descriptionEs: 'Alinear etiquetas, despejar encimeras',
      baseMinutes: 40,
      isPerUnit: false,
    },
    entryway_refresh: {
      id: 'entryway_refresh',
      label: 'Entryway/Mudroom Refresh',
      labelEs: 'Refresh de Entrada',
      description: 'Shoe and coat arrangement',
      descriptionEs: 'Organizar zapatos y abrigos',
      baseMinutes: 20,
      isPerUnit: false,
    },
    desk_office_reset: {
      id: 'desk_office_reset',
      label: 'Desk/Office Reset',
      labelEs: 'Reset de Escritorio/Oficina',
      description: 'Papers, cables, supplies',
      descriptionEs: 'Papeles, cables, suministros',
      baseMinutes: 45,
      isPerUnit: true,
      unitLabel: 'workspace',
      unitLabelEs: 'espacio de trabajo',
      maxUnits: 3,
    },
    linen_closet: {
      id: 'linen_closet',
      label: 'Linen Closet',
      labelEs: 'Armario de Ropa Blanca',
      description: 'Folding and categorizing',
      descriptionEs: 'Doblar y categorizar',
      baseMinutes: 30,
      isPerUnit: true,
      unitLabel: 'closet',
      unitLabelEs: 'armario',
      maxUnits: 3,
    },
    bathroom_drawers: {
      id: 'bathroom_drawers',
      label: 'Bathroom Drawers',
      labelEs: 'Cajones de Baño',
      description: 'Makeup, toiletries reset',
      descriptionEs: 'Maquillaje, artículos de tocador',
      baseMinutes: 30,
      isPerUnit: true,
      unitLabel: 'bathroom',
      unitLabelEs: 'baño',
      maxUnits: 4,
    },
    garage_organization: {
      id: 'garage_organization',
      label: 'Garage Organization',
      labelEs: 'Organización de Garaje',
      description: 'Shelf sorting, tool arrangement',
      descriptionEs: 'Ordenar estantes, herramientas',
      baseMinutes: 90,
      isPerUnit: false,
    },
    packing_unpacking: {
      id: 'packing_unpacking',
      label: 'Packing/Unpacking Assist',
      labelEs: 'Asistencia Empaque/Desempaque',
      description: 'Moving box assistance',
      descriptionEs: 'Asistencia con cajas de mudanza',
      baseMinutes: 90,
      isPerUnit: false,
    },
  } as const,

  // === ORGANIZATION-SPECIFIC TEAM SIZING ===
  organizationTeamSizing: {
    soloThresholdMinutes: 240,        // 4 horas = 240 min, mantiene 1 especialista
    soloTeamSize: 1,                  // 1 especialista por defecto (consistencia estética)
    duoTeamSize: 2,                   // 2 si excede 4 horas
  },
  
  // Minimum hours by intent
  intentMinHours: {
    routine_maintenance: 2,   // The Keeper
    priority_focus: 2,        // The Efficiency Expert
    deep_scrub: 4,            // The Heavy-Lifter - needs minimum 4 hours
    post_event: 2,            // The Recovery Team
    organization: 2,          // The Home Assistant
    move_in_out: 4,           // The Finisher - minimum 4 hours for vacancy
  } as Record<string, number>,
  
  // Bath time per unit (minutes) - LEGACY, replaced by roomBasedTime
  bathTime: {
    standard: 45,
    moveIn: 60,
  },
  
  // Kitchen base time (minutes) - LEGACY, kept for backward compat
  kitchenTime: {
    standard: 60,
    deep: 90,
    moveIn: 90,
  },
  
  // Living area base time (minutes)
  livingTime: {
    standard: 45,
    deep: 70,
    moveIn: 90,
  },
  
  // Add-on time multiplier for Move-In (grimier appliances)
  moveInTaskMultiplier: 1.25,
  
  // Scalable tasks (minutes per 1,000 sqft of active area)
  scalableTasks: {
    cabinets: 45,   // Inside all cabinets
    windows: 30,    // Interior windows
  },
  
  // === V2: SQFT ADJUSTMENT (for properties > 2,500 sqft) ===
  sqftAdjustment: {
    threshold: 2500,        // Apply adjustment above this
    minutesPer500: 15,      // +15 min per 500 sqft over threshold
  },
  
  // === LARGE ESTATE TRAVERSAL BUFFER ===
  largeEstateTraversalBuffer: {
    threshold: 5000,    // sqft threshold
    bufferMinutes: 30,  // Additional 30 min for internal wing-to-wing movement
  },
  
  // === SOUTH COAST CONCIERGE ADDITIONS ===
  // Access friction deductions (minutes lost to logistics)
  accessFriction: {
    standard: 0,           // Driveway/flat - no deduction
    hillside: 15,          // Stairs, equipment carry (Riviera/Montecito)
    estate_gated: 20,      // Long walk from service parking
  },
  
  // Surface complexity buffer (multiplier for careful handling)
  surfaceBuffer: {
    none: 1.0,             // Standard materials
    hasDelicate: 1.10,     // +10% time for pH-neutral care, slower pace
  },
  
  // Condition efficiency multipliers (affects cleaning speed)
  conditionEfficiency: {
    tidy: 1.0,             // 100% speed - surfaces clear
    lived_in: 0.8,         // 80% speed - daily clutter
    cluttered: 0.6,        // 60% speed - heavy items, covered surfaces
    deep_recovery: 0.4,    // 40% speed - heavy dust, grease, post-party (2.5x slower)
  },
  
  // === HIGH-PERCEPTION LOGISTIC ENGINEERING ADDITIONS ===
  // Occupancy multiplier (Contents Manipulation time)
  occupancyMultiplier: {
    vacant: 1.0,           // No items to move around
    occupied: 1.15,        // +15% for moving items, pets, kids traffic
  },
  
  // Vertical logistics friction (apartment access) - V2 Enhanced
  verticalFriction: {
    ground: 0,             // Ground floor - no extra time
    elevator: 5,           // Elevator access - 5 min setup
    walkup_base: 15,       // Walk-up stairs - base 15 min equipment carry
    walkup_per_floor: 10,  // +10 min per floor above level 2
  },
  
  // === DYNAMIC TEAM SIZING THRESHOLDS ===
  teamSizingThresholds: {
    standard: { maxHours: 6, teamSize: 2 },    // 2 cleaners for <6 man-hours
    recommended: { maxHours: 12, teamSize: 3 }, // 3 cleaners for 6-12 man-hours
    estate: { maxHours: 20, teamSize: 4 },     // 4 cleaners for 12-20 man-hours
    complex: { teamSize: 5 },                  // 5+ cleaners for >20 man-hours
  },
  
  // === FREQUENCY-BASED LABOR ADJUSTMENT ===
  // Efficiency multipliers applied to cleaning time based on visit frequency
  frequencyLaborMultiplier: {
    daily: 0.85,      // -15% time - minimal buildup between visits
    weekly: 0.85,     // -15% time - consistency mode, surfaces stay clean
    biweekly: 0.90,   // -10% time - slight maintenance efficiency
    monthly: 1.0,     // Base time - requires full attention each visit
    onetime: 1.0,     // Base time - no efficiency gain
  } as Record<string, number>,
  
  // === MONTHLY DEEP MAINTENANCE BUFFER (The Keeper Intent + Monthly) ===
  // Extra minutes for baseboards, blinds, light fixtures when monthly
  monthlyDeepMaintenanceBuffer: {
    enabled: true,
    intentFilter: ['routine_maintenance'], // Only applies to The Keeper
    baseMinutes: 15,      // +15 min minimum
    sqftBonus: 0.005,     // +0.5 min per 100 sqft over 2000
    maxMinutes: 30,       // Cap at +30 min
    description: 'Deep maintenance reset for baseboards, reachable fixtures, and buildup areas',
  },
} as const;

// Get midpoint sqft from option value
export function getSqftMidpoint(sqftValue: string): number {
  const option = HOURLY_SQFT_OPTIONS.find(opt => opt.value === sqftValue);
  return option?.midpoint ?? 2000;
}

// Calculate active cleaning area based on density
export function calculateActiveSqft(
  totalSqft: number,
  density: CleaningDensity,
  customActiveSqft?: number
): number {
  switch (density) {
    case 'entire':
      return totalSqft;
    case 'main_areas':
      return Math.round(totalSqft * 0.6);
    case 'specific_wing':
      return Math.round(totalSqft * 0.35);
    case 'custom':
      return customActiveSqft ?? totalSqft;
    default:
      return totalSqft;
  }
}

// === V3: UNIFIED SPACES BREAKDOWN INTERFACE ===
export interface UnifiedSpacesBreakdown {
  office: { count: number; minutes: number };
  laundry: { count: number; minutes: number };
  loft: { count: number; minutes: number };
  garage: { count: number; minutes: number };
  patio: { count: number; scope: 'sweep' | 'scrub'; minutes: number };
  totalMinutes: number;
  luxuryMultiplierApplied: boolean;
}

// === ADDITIONAL STRUCTURES BREAKDOWN INTERFACE ===
export interface StructureTimeBreakdown {
  guestHouse: { count: number; setupMinutes: number; cleaningMinutes: number; total: number };
  studio: { count: number; setupMinutes: number; cleaningMinutes: number; total: number };
  poolHouse: { count: number; setupMinutes: number; cleaningMinutes: number; total: number };
  totalSetupMinutes: number;
  totalCleaningMinutes: number;
  totalMinutes: number;
}

// === V3: DYNAMIC TEAM SIZING RESULT ===
export interface DynamicTeamResult {
  recommendedTeamSize: number;
  clockHours: number;           // Time on-site
  laborHours: number;           // Total paid hours (clock × team)
  rationale: string;            // Explanation for client
  tier: 'standard' | 'recommended' | 'estate' | 'complex';
}

// === V3: AI TIME RECEIPT (Transparency Panel) ===
export interface AITimeReceipt {
  // === SECTION 1: LOGISTICS DRAG ===
  logistics: {
    baseSetup: number;                 // 20 min standard
    accessFriction: number;            // Hillside/Gated: +15-20 min
    verticalFriction: number;          // Walk-up: +15 min base + 10/floor
    largeEstateTraversal: number;      // >5000 sqft: +30 min
    totalLogistics: number;
  };
  
  // === SECTION 2: ACTIVE CLEANING TIME ===
  activeArea: {
    bathrooms: { count: number; minutes: number };
    bedrooms: { count: number; minutes: number };
    kitchen: { included: boolean; minutes: number };
    living: { included: boolean; minutes: number };
    sqftAdjustment: number;            // >2500 sqft buffer
    subtotalMinutes: number;
  };
  
  // === SECTION 3: UNIFIED SPACES ===
  unifiedSpaces: UnifiedSpacesBreakdown;
  
  // === SECTION 4: TASKS (ADD-ONS) ===
  tasks: {
    items: Array<{ id: string; label: string; minutes: number }>;
    totalMinutes: number;
  };
  
  // === SECTION 5: MULTIPLIERS ===
  multipliers: {
    intentMultiplier: number;          // 0.9 - 1.5
    intentLabel: string;               // "The Heavy-Lifter"
    surfaceBuffer: number;             // 1.0 or 1.1
    conditionEfficiency: number;       // 0.4 - 1.0
    occupancyMultiplier: number;       // 1.0 or 1.15
  };
  
  // === SECTION 6: FREQUENCY ADJUSTMENT ===
  frequencyAdjustment: {
    frequency: string;                  // 'weekly' | 'biweekly' | 'monthly' | 'onetime'
    laborMultiplier: number;            // 0.85 - 1.0
    deepMaintenanceBuffer: number;      // 0-30 min (only for Keeper + Monthly)
    adjustmentLabel: string;            // Human-readable label
    isEfficiencyMode: boolean;          // true for weekly/biweekly
  };
  
  // === SECTION 7: TEAM SIZING ===
  teamSizing: DynamicTeamResult;
  
  // === SECTION 7.5: ADDITIONAL STRUCTURES ===
  additionalStructures?: StructureTimeBreakdown;
  
  // === SECTION 8: FINAL SUMMARY ===
  summary: {
    totalManMinutes: number;
    suggestedClockHours: number;
    suggestedHourlyRate: number;
    matchingNote: string;
  };
}

// Main calculation function for estate hourly recommendations
export interface EstateHourlyResult {
  minHours: number;
  maxHours: number;
  activeSqft: number;
  logisticsMinutes: number;
  cleaningMinutes: number;
  taskMinutes: number;
  totalManMinutes: number;
  message: string;
  isEstate: boolean;
  // === SOUTH COAST CONCIERGE ADDITIONS ===
  accessFrictionMinutes: number;    // Minutes lost to access friction
  surfaceBufferApplied: boolean;    // Whether delicate surface buffer was applied
  conditionEfficiency: number;      // Current condition efficiency (0.4-1.0)
  effectiveCleaningMinutes: number; // Cleaning minutes after efficiency applied
  // === HIGH-PERCEPTION LOGISTIC ENGINEERING ADDITIONS ===
  occupancyMultiplier: number;      // 1.0 (vacant) or 1.15 (occupied)
  verticalFrictionMinutes: number;  // Minutes for apartment access logistics
  
  // === V2: ENHANCED BREAKDOWN FOR AI RECOMMENDATION ===
  recommendedTeamSize: number;      // Suggested team size (2-5)
  clockHours: number;               // Time on-site
  laborHours: number;               // Total paid hours (clockHours × teamSize)
  bufferRangeLow: number;           // Recommended range low (-0.5)
  bufferRangeHigh: number;          // Recommended range high (+1.0)
  
  // Breakdown components for display
  roomMinutes: {
    bathrooms: number;
    bedrooms: number;
    kitchen: number;
    living: number;
  };
  sqftAdjustmentMinutes: number;    // Extra time for large properties
  intentMultiplierApplied: number;  // The multiplier used (0.9 - 1.5)
  matchingNote: string;             // AI matching explanation
  
  // === V3: NEW BREAKDOWN FIELDS ===
  unifiedSpacesMinutes: number;                // Total time for unified spaces
  unifiedSpacesBreakdown: UnifiedSpacesBreakdown; // Detailed breakdown
  largeEstateTraversalMinutes: number;        // >5000 sqft buffer
  aiTimeReceipt: AITimeReceipt;               // Full transparency receipt
}

// === V3: CALCULATE UNIFIED SPACES MINUTES ===
export function calculateUnifiedSpacesMinutes(
  formData: BookingFormData,
  isMovingHourly: boolean
): UnifiedSpacesBreakdown {
  const times = ESTATE_LOGIC.unifiedSpacesTime;
  const luxuryMultiplier = isMovingHourly ? ESTATE_LOGIC.luxuryMoveInMultiplier : 1.0;
  
  // Get counts from formData (hourly-specific or fallback to standard)
  const officeCount = formData.hourlyOfficeCount ?? formData.officeCount ?? 0;
  const laundryCount = formData.hourlyLaundryCount ?? formData.laundryRoomCount ?? 0;
  const loftCount = formData.hourlyLoftCount ?? formData.loftCount ?? 0;
  const garageCount = formData.hourlyGarageCount ?? formData.garageCount ?? 0;
  const patioCount = formData.hourlyPatioCount ?? formData.patioCount ?? 0;
  const patioScope = (formData.hourlyPatioScope ?? formData.patioScope ?? 'sweep') as 'sweep' | 'scrub';
  
  // Calculate minutes with luxury multiplier for concierge services
  const officeMinutes = officeCount * times.office * luxuryMultiplier;
  const laundryMinutes = laundryCount * times.laundry * luxuryMultiplier;
  const loftMinutes = loftCount * times.loft * luxuryMultiplier;
  const garageMinutes = garageCount * times.garage * luxuryMultiplier;
  const patioMinutes = patioCount * (patioScope === 'scrub' ? times.patio_scrub : times.patio_sweep) * luxuryMultiplier;
  
  return {
    office: { count: officeCount, minutes: Math.round(officeMinutes) },
    laundry: { count: laundryCount, minutes: Math.round(laundryMinutes) },
    loft: { count: loftCount, minutes: Math.round(loftMinutes) },
    garage: { count: garageCount, minutes: Math.round(garageMinutes) },
    patio: { count: patioCount, scope: patioScope, minutes: Math.round(patioMinutes) },
    totalMinutes: Math.round(officeMinutes + laundryMinutes + loftMinutes + garageMinutes + patioMinutes),
    luxuryMultiplierApplied: isMovingHourly,
  };
}

// === CALCULATE ADDITIONAL STRUCTURES MINUTES (Guest House, Studio, Pool House) ===
export function calculateAdditionalStructuresMinutes(
  formData: BookingFormData
): StructureTimeBreakdown {
  const structures = ESTATE_LOGIC.additionalStructures;
  const intent = formData.hourlyIntent || 'priority_focus';
  const isMoving = intent === 'move_in_out';
  const isDeep = intent === 'deep_scrub' || isMoving;
  
  const guestHouseCount = formData.guestHouseCount || 0;
  const studioCount = (formData as any).studioCount || 0;
  const poolHouseCount = formData.poolHouseCount || 0;
  
  // Get appropriate cleaning time based on intent for each structure type
  const getGuestHouseTime = () => {
    if (isMoving) return structures.guest_house.moveInMinutes;
    if (isDeep) return structures.guest_house.deepCleaningMinutes;
    return structures.guest_house.activeCleaningMinutes;
  };
  
  const getStudioTime = () => {
    if (isMoving) return structures.studio.moveInMinutes;
    if (isDeep) return structures.studio.deepCleaningMinutes;
    return structures.studio.activeCleaningMinutes;
  };
  
  const getPoolHouseTime = () => {
    if (isMoving) return structures.pool_house.moveInMinutes;
    if (isDeep) return structures.pool_house.deepCleaningMinutes;
    return structures.pool_house.activeCleaningMinutes;
  };
  
  const guestHouseSetup = guestHouseCount * structures.guest_house.setupMinutes;
  const guestHouseCleaning = guestHouseCount * getGuestHouseTime();
  
  const studioSetup = studioCount * structures.studio.setupMinutes;
  const studioCleaning = studioCount * getStudioTime();
  
  const poolHouseSetup = poolHouseCount * structures.pool_house.setupMinutes;
  const poolHouseCleaning = poolHouseCount * getPoolHouseTime();
  
  return {
    guestHouse: {
      count: guestHouseCount,
      setupMinutes: guestHouseSetup,
      cleaningMinutes: guestHouseCleaning,
      total: guestHouseSetup + guestHouseCleaning,
    },
    studio: {
      count: studioCount,
      setupMinutes: studioSetup,
      cleaningMinutes: studioCleaning,
      total: studioSetup + studioCleaning,
    },
    poolHouse: {
      count: poolHouseCount,
      setupMinutes: poolHouseSetup,
      cleaningMinutes: poolHouseCleaning,
      total: poolHouseSetup + poolHouseCleaning,
    },
    totalSetupMinutes: guestHouseSetup + studioSetup + poolHouseSetup,
    totalCleaningMinutes: guestHouseCleaning + studioCleaning + poolHouseCleaning,
    totalMinutes: guestHouseSetup + guestHouseCleaning + studioSetup + studioCleaning + poolHouseSetup + poolHouseCleaning,
  };
}

// === V3: CALCULATE DYNAMIC TEAM SIZE ===
export function calculateDynamicTeamSize(totalManMinutes: number): DynamicTeamResult {
  const manHours = totalManMinutes / 60;
  
  let teamSize: number;
  let tier: DynamicTeamResult['tier'];
  let rationale: string;
  
  const thresholds = ESTATE_LOGIC.teamSizingThresholds;
  
  if (manHours <= thresholds.standard.maxHours) {
    teamSize = thresholds.standard.teamSize;
    tier = 'standard';
    rationale = 'Standard 2-person team for efficient service';
  } else if (manHours <= thresholds.recommended.maxHours) {
    teamSize = thresholds.recommended.teamSize;
    tier = 'recommended';
    rationale = 'Recommended 3-person team for optimal timing';
  } else if (manHours <= thresholds.estate.maxHours) {
    teamSize = thresholds.estate.teamSize;
    tier = 'estate';
    rationale = 'Estate-level 4-person team for thorough coverage';
  } else {
    teamSize = thresholds.complex.teamSize;
    tier = 'complex';
    rationale = 'Complex project requiring 5+ specialists';
  }
  
  // Clock time = Man-Hours / Team Size, rounded to nearest 0.5
  const clockHoursRaw = manHours / teamSize;
  const clockHours = Math.ceil(clockHoursRaw * 2) / 2;
  
  return {
    recommendedTeamSize: teamSize,
    clockHours,
    laborHours: clockHours * teamSize,
    rationale,
    tier,
  };
}

// === INTENT LABEL MAPPING ===
const INTENT_LABELS: Record<string, string> = {
  routine_maintenance: 'The Keeper',
  priority_focus: 'The Efficiency Expert',
  deep_scrub: 'The Heavy-Lifter',
  post_event: 'The Recovery Team',
  organization: 'The Home Assistant',
  move_in_out: 'The Finisher',
};

// ═══════════════════════════════════════════════════════════════════════
// THE HOME ASSISTANT: TASK-BASED ORGANIZATIONAL LABOR ENGINE
// Ignores sqft cleaning, calculates purely by selected tasks
// ═══════════════════════════════════════════════════════════════════════
export function calculateOrganizationHours(formData: BookingFormData): EstateHourlyResult {
  const orgConfig = ESTATE_LOGIC.organizationMode;
  const taskConfig = ESTATE_LOGIC.organizationTasks;
  const teamConfig = ESTATE_LOGIC.organizationTeamSizing;
  
  // === 1. AESTHETIC ASSESSMENT PROTOCOL (30 min obligatorio) ===
  let logisticsMinutes = ESTATE_LOGIC.baseSetup + orgConfig.aestheticAssessment;
  
  // === 2. ACCESS FRICTION (hillside/gated still applies) ===
  const accessType = formData.accessType || 'standard';
  const accessFrictionMinutes = ESTATE_LOGIC.accessFriction[accessType] || 0;
  logisticsMinutes += accessFrictionMinutes;
  
  // === 3. TASK-BASED TIME CALCULATION (Motor por Unidades) ===
  const selectedTasks = formData.organizationTasks || [];
  const taskCounts = formData.organizationTaskCounts || {
    laundry_loads: 0, closets: 0, toy_rooms: 0,
    desk_areas: 0, linen_closets: 0, bathroom_drawers: 0
  };
  
  let taskMinutes = 0;
  const taskItems: Array<{ id: string; label: string; minutes: number }> = [];
  
  // Per-unit tasks with counters
  if (taskCounts.laundry_loads > 0) {
    const mins = taskCounts.laundry_loads * taskConfig.laundry_management.baseMinutes;
    taskMinutes += mins;
    taskItems.push({ 
      id: 'laundry_management', 
      label: `${taskCounts.laundry_loads} load(s) laundry`, 
      minutes: mins 
    });
  }
  
  if (taskCounts.closets > 0) {
    const mins = taskCounts.closets * taskConfig.closet_curation.baseMinutes;
    taskMinutes += mins;
    taskItems.push({ 
      id: 'closet_curation', 
      label: `${taskCounts.closets} closet(s) curation`, 
      minutes: mins 
    });
  }
  
  if (taskCounts.toy_rooms > 0) {
    const mins = taskCounts.toy_rooms * taskConfig.toy_nursery_reset.baseMinutes;
    taskMinutes += mins;
    taskItems.push({ 
      id: 'toy_nursery_reset', 
      label: `${taskCounts.toy_rooms} room(s) toy reset`, 
      minutes: mins 
    });
  }
  
  if (taskCounts.desk_areas > 0) {
    const mins = taskCounts.desk_areas * taskConfig.desk_office_reset.baseMinutes;
    taskMinutes += mins;
    taskItems.push({ 
      id: 'desk_office_reset', 
      label: `${taskCounts.desk_areas} workspace(s) reset`, 
      minutes: mins 
    });
  }
  
  if (taskCounts.linen_closets > 0) {
    const mins = taskCounts.linen_closets * taskConfig.linen_closet.baseMinutes;
    taskMinutes += mins;
    taskItems.push({ 
      id: 'linen_closet', 
      label: `${taskCounts.linen_closets} linen closet(s)`, 
      minutes: mins 
    });
  }
  
  if (taskCounts.bathroom_drawers > 0) {
    const mins = taskCounts.bathroom_drawers * taskConfig.bathroom_drawers.baseMinutes;
    taskMinutes += mins;
    taskItems.push({ 
      id: 'bathroom_drawers', 
      label: `${taskCounts.bathroom_drawers} bathroom(s) drawers`, 
      minutes: mins 
    });
  }
  
  // Flat-rate tasks from legacy selection
  if (selectedTasks.includes('pantry')) {
    taskMinutes += taskConfig.pantry_kitchen_tidying.baseMinutes;
    taskItems.push({ 
      id: 'pantry_kitchen_tidying', 
      label: 'Pantry/Kitchen tidying', 
      minutes: taskConfig.pantry_kitchen_tidying.baseMinutes 
    });
  }
  
  if (selectedTasks.includes('entryway')) {
    taskMinutes += taskConfig.entryway_refresh.baseMinutes;
    taskItems.push({ 
      id: 'entryway_refresh', 
      label: 'Entryway refresh', 
      minutes: taskConfig.entryway_refresh.baseMinutes 
    });
  }
  
  if (selectedTasks.includes('garage')) {
    taskMinutes += taskConfig.garage_organization.baseMinutes;
    taskItems.push({ 
      id: 'garage_organization', 
      label: 'Garage organization', 
      minutes: taskConfig.garage_organization.baseMinutes 
    });
  }
  
  if (selectedTasks.includes('packing')) {
    taskMinutes += taskConfig.packing_unpacking.baseMinutes;
    taskItems.push({ 
      id: 'packing_unpacking', 
      label: 'Packing/unpacking assist', 
      minutes: taskConfig.packing_unpacking.baseMinutes 
    });
  }
  
  // === 4. APPLY CLUTTER FRICTION MULTIPLIER ===
  const clutterLevel = formData.clutterLevel || 'moderate';
  const clutterMultiplier = orgConfig.clutterMultiplier[clutterLevel] || 1.0;
  const adjustedTaskMinutes = Math.round(taskMinutes * clutterMultiplier);
  
  // === 5. AESTHETIC BUFFER (Factor de Fricción Estética) ===
  // +10 min por cada 500 sqft adicionales para propiedades grandes de SB/Ventura
  const totalSqft = getSqftMidpoint(formData.hourlyTotalSqft || '1500_2000');
  const sqftOverBase = Math.max(0, totalSqft - orgConfig.aestheticBuffer.baseSqft);
  const aestheticBufferMinutes = Math.min(
    orgConfig.aestheticBuffer.maxMinutes,
    Math.ceil(sqftOverBase / 500) * orgConfig.aestheticBuffer.minutesPer500Sqft
  );
  
  // === 6. TOTAL MAN-MINUTES (Zero surface scrubbing) ===
  const totalManMinutes = logisticsMinutes + adjustedTaskMinutes + aestheticBufferMinutes;
  
  // === 7. ORGANIZATION-SPECIFIC TEAM SIZING ===
  // 1 Especialista por defecto para mantener consistencia estética
  // 2 solo si excede 240 minutos (4 horas)
  const recommendedTeamSize = totalManMinutes > teamConfig.soloThresholdMinutes 
    ? teamConfig.duoTeamSize 
    : teamConfig.soloTeamSize;
  
  const clockHours = Math.max(2, Math.ceil(totalManMinutes / recommendedTeamSize / 60));
  const laborHours = clockHours * recommendedTeamSize;
  
  // === 8. BUILD AI TIME RECEIPT (Organizational Labor Mode) ===
  const aiTimeReceipt: AITimeReceipt = {
    logistics: {
      baseSetup: ESTATE_LOGIC.baseSetup,
      accessFriction: accessFrictionMinutes,
      verticalFriction: 0,
      largeEstateTraversal: 0,
      totalLogistics: logisticsMinutes,
    },
    // ZERO active cleaning - this is organization mode
    activeArea: {
      bathrooms: { count: 0, minutes: 0 },
      bedrooms: { count: 0, minutes: 0 },
      kitchen: { included: false, minutes: 0 },
      living: { included: false, minutes: 0 },
      sqftAdjustment: aestheticBufferMinutes,
      subtotalMinutes: 0,
    },
    unifiedSpaces: {
      office: { count: 0, minutes: 0 },
      laundry: { count: 0, minutes: 0 },
      loft: { count: 0, minutes: 0 },
      garage: { count: 0, minutes: 0 },
      patio: { count: 0, scope: 'sweep', minutes: 0 },
      totalMinutes: 0,
      luxuryMultiplierApplied: false,
    },
    tasks: {
      items: taskItems,
      totalMinutes: adjustedTaskMinutes,
    },
    multipliers: {
      intentMultiplier: 1.0,
      intentLabel: 'The Home Assistant',
      surfaceBuffer: 1.0,
      conditionEfficiency: clutterMultiplier,
      occupancyMultiplier: 1.0,
    },
    frequencyAdjustment: {
      frequency: formData.hourlyFrequency || 'onetime',
      laborMultiplier: 1.0,
      deepMaintenanceBuffer: 0,
      adjustmentLabel: 'Standard',
      isEfficiencyMode: false,
    },
    teamSizing: {
      recommendedTeamSize,
      clockHours,
      laborHours,
      rationale: recommendedTeamSize === 1 
        ? 'Solo specialist for organizational consistency' 
        : 'Duo team for extended project (>4 hrs)',
      tier: 'standard',
    },
    summary: {
      totalManMinutes: Math.round(totalManMinutes),
      suggestedClockHours: clockHours,
      suggestedHourlyRate: orgConfig.hourlyRate,
      matchingNote: `Organization focus: ${taskItems.length} tasks, ${clutterLevel} clutter`,
    },
  };
  
  return {
    minHours: Math.max(2, clockHours),
    maxHours: Math.max(2, clockHours + 1),
    activeSqft: 0,
    logisticsMinutes,
    cleaningMinutes: 0,
    taskMinutes: adjustedTaskMinutes,
    totalManMinutes: Math.round(totalManMinutes),
    message: `Organization session: ${taskItems.length} tasks`,
    isEstate: false,
    accessFrictionMinutes,
    surfaceBufferApplied: false,
    conditionEfficiency: clutterMultiplier,
    effectiveCleaningMinutes: 0,
    occupancyMultiplier: 1.0,
    verticalFrictionMinutes: 0,
    recommendedTeamSize,
    clockHours,
    laborHours,
    bufferRangeLow: clockHours - 0.5,
    bufferRangeHigh: clockHours + 1,
    roomMinutes: { bathrooms: 0, bedrooms: 0, kitchen: 0, living: 0 },
    sqftAdjustmentMinutes: aestheticBufferMinutes,
    intentMultiplierApplied: 1.0,
    matchingNote: `Organization focus: ${taskItems.length} tasks, ${clutterLevel} clutter`,
    unifiedSpacesMinutes: 0,
    unifiedSpacesBreakdown: {
      office: { count: 0, minutes: 0 },
      laundry: { count: 0, minutes: 0 },
      loft: { count: 0, minutes: 0 },
      garage: { count: 0, minutes: 0 },
      patio: { count: 0, scope: 'sweep', minutes: 0 },
      totalMinutes: 0,
      luxuryMultiplierApplied: false,
    },
    largeEstateTraversalMinutes: 0,
    aiTimeReceipt,
  };
}

export function calculateEstateHours(formData: BookingFormData): EstateHourlyResult {
  // === ORGANIZATION MODE BYPASS ===
  // The Home Assistant uses task-based, not sqft-based calculation
  if (formData.hourlyIntent === 'organization') {
    return calculateOrganizationHours(formData);
  }
  
  // Get total property sqft
  const totalSqft = getSqftMidpoint(formData.hourlyTotalSqft);
  const isEstate = totalSqft > 4000;
  
  // Calculate active cleaning area
  const activeSqft = calculateActiveSqft(
    totalSqft,
    formData.cleaningDensity || 'entire',
    formData.customActiveSqft ? parseInt(formData.customActiveSqft) : undefined
  );
  
  let manMinutes = ESTATE_LOGIC.baseSetup;
  let logisticsMinutes = ESTATE_LOGIC.baseSetup; // Start with base setup in logistics

  // === SOUTH COAST: ACCESS FRICTION (Critical for SB & Ventura County) ===
  const accessType = formData.accessType || 'standard';
  const accessFrictionMinutes = ESTATE_LOGIC.accessFriction[accessType];
  logisticsMinutes += accessFrictionMinutes;
  manMinutes += accessFrictionMinutes;

  // === V2: ENHANCED VERTICAL LOGISTICS (Walk-up per floor) ===
  const verticalLogistics = formData.verticalLogistics || 'ground';
  const unitFloorLevel = formData.unitFloorLevel || 1;
  let verticalFrictionMinutes = 0;

  if (verticalLogistics === 'ground') {
    verticalFrictionMinutes = 0;
  } else if (verticalLogistics === 'elevator') {
    verticalFrictionMinutes = ESTATE_LOGIC.verticalFriction.elevator;
  } else if (verticalLogistics === 'walkup') {
    verticalFrictionMinutes = ESTATE_LOGIC.verticalFriction.walkup_base;
    // +10 min per floor above level 2
    if (unitFloorLevel > 2) {
      verticalFrictionMinutes += (unitFloorLevel - 2) * ESTATE_LOGIC.verticalFriction.walkup_per_floor;
    }
  }
  
  logisticsMinutes += verticalFrictionMinutes;
  manMinutes += verticalFrictionMinutes;

  // 1. ESTATE DRAG (logistics based on TOTAL size, not active)
  if (totalSqft > 3000) {
    const estateDrag = (totalSqft / 1000) * ESTATE_LOGIC.dragPer1000Sqft;
    logisticsMinutes += estateDrag;
    manMinutes += estateDrag;
  }

  // === V3: LARGE ESTATE TRAVERSAL BUFFER (>5000 sqft) ===
  let largeEstateTraversalMinutes = 0;
  if (totalSqft > ESTATE_LOGIC.largeEstateTraversalBuffer.threshold) {
    largeEstateTraversalMinutes = ESTATE_LOGIC.largeEstateTraversalBuffer.bufferMinutes;
    logisticsMinutes += largeEstateTraversalMinutes;
    manMinutes += largeEstateTraversalMinutes;
  }

  // 2. ADDITIONAL STRUCTURES (setup time + cleaning labor calculated after cleaningMinutes is initialized)
  const structureBreakdown = calculateAdditionalStructuresMinutes(formData);
  logisticsMinutes += structureBreakdown.totalSetupMinutes;
  // Note: Structure cleaning minutes added later after base cleaningMinutes is calculated
  manMinutes += structureBreakdown.totalSetupMinutes;

  // 3. DETERMINE CLEANING SPEED (Service Intent based)
  const hourlyIntent = formData.hourlyIntent || 'priority_focus';
  const isMovingIntent = hourlyIntent === 'move_in_out';
  const isDeepIntent = hourlyIntent === 'deep_scrub' || isMovingIntent;
  
  // Get intent-based speed multiplier
  const intentSpeedMultiplier = ESTATE_LOGIC.intentSpeedMultiplier[hourlyIntent] || 1.0;
  const intentMinHours = ESTATE_LOGIC.intentMinHours[hourlyIntent] || 2;
  
  // 4. V2: ROOM-BASED CLEANING TIME (per spec)
  const bedsToClean = formData.hourlyBedsToClean ?? 2;
  const bathsToClean = formData.hourlyBathsToClean ?? 2;
  
  // Bathroom time: 45 min standard, 60 min for move-in/deep
  const bathTimePerUnit = isMovingIntent 
    ? ESTATE_LOGIC.roomBasedTime.bathroom_moveIn 
    : ESTATE_LOGIC.roomBasedTime.bathroom;
  const bathroomMinutes = bathsToClean * bathTimePerUnit;
  
  // Bedroom time: 25 min standard, 35 min for deep/move-in
  const bedTimePerUnit = isDeepIntent 
    ? ESTATE_LOGIC.roomBasedTime.bedroom_deep 
    : ESTATE_LOGIC.roomBasedTime.bedroom;
  const bedroomMinutes = bedsToClean * bedTimePerUnit;
  
  // Kitchen time: 60 min standard, 90 min for deep/move-in
  const includeKitchen = formData.hourlyIncludeKitchen ?? true;
  const kitchenMinutes = includeKitchen 
    ? (isDeepIntent ? ESTATE_LOGIC.roomBasedTime.kitchen_deep : ESTATE_LOGIC.roomBasedTime.kitchen)
    : 0;
  
  // Living areas: 45 min standard, 70 min deep
  const includeLiving = formData.hourlyIncludeLivingAreas ?? true;
  const livingMinutes = includeLiving 
    ? (isDeepIntent ? ESTATE_LOGIC.roomBasedTime.living_deep : ESTATE_LOGIC.roomBasedTime.living)
    : 0;
  
  // Sum room-based time
  const roomBasedMinutes = bathroomMinutes + bedroomMinutes + kitchenMinutes + livingMinutes;
  let cleaningMinutes = roomBasedMinutes;
  
  // 5. V2: SQFT ADJUSTMENT (if > 2,500 sqft, add 15 min per 500 sqft additional)
  let sqftAdjustmentMinutes = 0;
  if (activeSqft > ESTATE_LOGIC.sqftAdjustment.threshold) {
    const additionalSqft = activeSqft - ESTATE_LOGIC.sqftAdjustment.threshold;
    const additionalBlocks = Math.ceil(additionalSqft / 500);
    sqftAdjustmentMinutes = additionalBlocks * ESTATE_LOGIC.sqftAdjustment.minutesPer500;
    cleaningMinutes += sqftAdjustmentMinutes;
  }

  // === V3: UNIFIED SPACES (Work-Summation Engine) ===
  const unifiedSpacesBreakdown = calculateUnifiedSpacesMinutes(formData, isMovingIntent);
  cleaningMinutes += unifiedSpacesBreakdown.totalMinutes;
  
  // === ADDITIONAL STRUCTURES CLEANING TIME (added after base cleaningMinutes) ===
  cleaningMinutes += structureBreakdown.totalCleaningMinutes;
  manMinutes += structureBreakdown.totalCleaningMinutes;
  
  // 6. APPLY INTENT SPEED MULTIPLIER
  cleaningMinutes = cleaningMinutes * intentSpeedMultiplier;

  // === SOUTH COAST: SURFACE COMPLEXITY BUFFER ===
  const hasDelicateSurfaces = formData.hasDelicateSurfaces || false;
  const surfaceBufferApplied = hasDelicateSurfaces;
  const surfaceMultiplier = hasDelicateSurfaces 
    ? ESTATE_LOGIC.surfaceBuffer.hasDelicate 
    : ESTATE_LOGIC.surfaceBuffer.none;
  cleaningMinutes = cleaningMinutes * surfaceMultiplier;

  // === SOUTH COAST: CONDITION EFFICIENCY (Speed Factor) ===
  const homeCondition = formData.homeConditionLevel || 'lived_in';
  const conditionEfficiency = ESTATE_LOGIC.conditionEfficiency[homeCondition as keyof typeof ESTATE_LOGIC.conditionEfficiency] || 0.8;
  let effectiveCleaningMinutes = cleaningMinutes / conditionEfficiency;
  
  // === HIGH-PERCEPTION: OCCUPANCY MULTIPLIER (Contents Manipulation) ===
  const isPropertyOccupied = formData.isPropertyOccupied ?? true;
  const occupancyMultiplier = isPropertyOccupied 
    ? ESTATE_LOGIC.occupancyMultiplier.occupied 
    : ESTATE_LOGIC.occupancyMultiplier.vacant;
  effectiveCleaningMinutes = effectiveCleaningMinutes * occupancyMultiplier;
  
  // === FREQUENCY-BASED LABOR ADJUSTMENT ===
  const hourlyFrequency = formData.hourlyFrequency || 'onetime';
  const frequencyLaborMultiplier = ESTATE_LOGIC.frequencyLaborMultiplier[hourlyFrequency] || 1.0;
  
  // Apply frequency efficiency to cleaning time (not logistics)
  effectiveCleaningMinutes = effectiveCleaningMinutes * frequencyLaborMultiplier;
  
  // === MONTHLY DEEP MAINTENANCE BUFFER (The Keeper + Monthly only) ===
  let deepMaintenanceBufferMinutes = 0;
  const deepMaintConfig = ESTATE_LOGIC.monthlyDeepMaintenanceBuffer;
  
  if (
    deepMaintConfig.enabled &&
    hourlyFrequency === 'monthly' &&
    (deepMaintConfig.intentFilter as readonly string[]).includes(hourlyIntent)
  ) {
    // Base + sqft bonus, capped at max
    const sqftBonus = Math.max(0, (activeSqft - 2000) * deepMaintConfig.sqftBonus);
    deepMaintenanceBufferMinutes = Math.min(
      deepMaintConfig.maxMinutes,
      deepMaintConfig.baseMinutes + sqftBonus
    );
    
    // Add to active cleaning time (not logistics)
    effectiveCleaningMinutes += deepMaintenanceBufferMinutes;
  }
  
  // Build frequency adjustment label
  const frequencyAdjustmentLabel = frequencyLaborMultiplier < 1.0 
    ? `Efficiency Mode (-${Math.round((1 - frequencyLaborMultiplier) * 100)}%)`
    : deepMaintenanceBufferMinutes > 0 
      ? `+${Math.round(deepMaintenanceBufferMinutes)} min deep maintenance reset`
      : 'Standard';
  
  manMinutes += effectiveCleaningMinutes;

  // 7. CONCIERGE TASKS (hourlyTasks - add-ons as TIME, not price)
  const hourlyTasks = formData.hourlyTasks || [];
  let taskMinutes = 0;
  const taskItems: Array<{ id: string; label: string; minutes: number }> = [];
  
  hourlyTasks.forEach((taskId: string) => {
    let time = ADDON_TIMES[taskId] || 15;
    
    // Move-In tasks take longer (grimier)
    if (isMovingIntent) {
      time *= ESTATE_LOGIC.moveInTaskMultiplier;
    }
    
    // Scalable tasks (cabinets, windows) scale with active sqft
    if (taskId === 'cabinets') {
      time = Math.max(45, (activeSqft / 1000) * ESTATE_LOGIC.scalableTasks.cabinets);
      if (isMovingIntent) time *= ESTATE_LOGIC.moveInTaskMultiplier;
    }
    if (taskId === 'interior_windows') {
      time = Math.max(30, (activeSqft / 1000) * ESTATE_LOGIC.scalableTasks.windows);
    }
    
    taskMinutes += time;
    taskItems.push({ id: taskId, label: taskId.replace(/_/g, ' '), minutes: Math.round(time) });
  });
  
  manMinutes += taskMinutes;

  // 8. SAFETY NET: Use bath load as minimum if sqft calculation is too low
  const bathLoadMinimum = (bathsToClean * bathTimePerUnit) + 30;
  const cleaningWithLogistics = logisticsMinutes + effectiveCleaningMinutes + taskMinutes;
  if (cleaningWithLogistics < bathLoadMinimum) {
    manMinutes = ESTATE_LOGIC.baseSetup + bathLoadMinimum;
  }

  // === V3: DYNAMIC TEAM SIZING ===
  const dynamicTeamResult = calculateDynamicTeamSize(manMinutes);
  
  // Use user-selected team size OR dynamic recommendation
  const teamSize = formData.hourlyTeamSize || dynamicTeamResult.recommendedTeamSize;
  const clockHoursRaw = manMinutes / teamSize / 60;
  
  // Round to nearest 0.5 hours, respecting intent minimum
  const minHours = Math.max(intentMinHours, HOURLY_CONFIG.MIN_CLOCK_HOURS, Math.ceil(clockHoursRaw * 2) / 2);
  
  // V2: Buffer range calculation (-0.5 to +1.0 from estimate)
  const bufferRangeLow = Math.max(intentMinHours, minHours - 0.5);
  const bufferRangeHigh = minHours + 1.0;
  
  // Buffer is wider for estates (more variability)
  const buffer = activeSqft > 5000 ? 1.5 : (activeSqft > 3000 ? 1.0 : 0.5);
  const maxHours = minHours + buffer;

  // V2: Generate matching note based on intent + logistics
  const matchingFactors: string[] = [];
  
  if (hourlyIntent === 'deep_scrub') {
    matchingFactors.push('chemical expertise');
  }
  if (hourlyIntent === 'move_in_out') {
    matchingFactors.push('vacancy standards & detail work');
  }
  if (hourlyIntent === 'post_event') {
    matchingFactors.push('rapid recovery protocols');
  }
  if (accessType === 'hillside') {
    matchingFactors.push('hillside terrain handling');
  }
  if (accessType === 'estate_gated') {
    matchingFactors.push('gated estate protocols');
  }
  if (isPropertyOccupied) {
    matchingFactors.push('occupied-home sensitivity');
  }
  if (hasDelicateSurfaces) {
    matchingFactors.push('delicate surface care');
  }
  if (homeCondition === 'cluttered' || homeCondition === 'deep_recovery') {
    matchingFactors.push('heavy condition stamina');
  }
  
  const matchingNote = matchingFactors.length > 0 
    ? `Selected for ${matchingFactors.join(' • ')}`
    : 'Matched for efficiency and reliability';

  // 10. GENERATE MESSAGE (based on intent)
  let message = `Optimal for ${bedsToClean} bed${bedsToClean !== 1 ? 's' : ''}, ${bathsToClean} bath${bathsToClean !== 1 ? 's' : ''} maintenance`;
  
  if (hourlyIntent === 'move_in_out') {
    message = `Move-In/Out detail: ${activeSqft.toLocaleString()} sq ft (empty home standards)`;
  } else if (hourlyIntent === 'deep_scrub') {
    message = `Deep Scrub session: baseboards, buildup, detailed cleaning`;
  } else if (hourlyIntent === 'post_event') {
    message = `Post-Event restoration: trash, surfaces, sticky spots`;
  } else if (isEstate) {
    message = `Estate logistics + ${activeSqft.toLocaleString()} sq ft active area`;
  }
  
  // Add logistics context
  if (accessType !== 'standard') {
    const accessLabel = accessType === 'hillside' ? 'hillside' : 'gated';
    message += ` (${accessLabel})`;
  }
  
  if (structureBreakdown.guestHouse.count > 0 || structureBreakdown.studio.count > 0 || structureBreakdown.poolHouse.count > 0) {
    const structures = [];
    if (structureBreakdown.guestHouse.count > 0) structures.push(`${structureBreakdown.guestHouse.count} guest house${structureBreakdown.guestHouse.count > 1 ? 's' : ''}`);
    if (structureBreakdown.studio.count > 0) structures.push(`${structureBreakdown.studio.count} studio${structureBreakdown.studio.count > 1 ? 's' : ''}`);
    if (structureBreakdown.poolHouse.count > 0) structures.push(`${structureBreakdown.poolHouse.count} pool house${structureBreakdown.poolHouse.count > 1 ? 's' : ''}`);
    message += ` + ${structures.join(', ')}`;
  }

  // === V3: BUILD AI TIME RECEIPT ===
  const aiTimeReceipt: AITimeReceipt = {
    logistics: {
      baseSetup: ESTATE_LOGIC.baseSetup,
      accessFriction: Math.round(accessFrictionMinutes),
      verticalFriction: Math.round(verticalFrictionMinutes),
      largeEstateTraversal: Math.round(largeEstateTraversalMinutes),
      totalLogistics: Math.round(logisticsMinutes),
    },
    activeArea: {
      bathrooms: { count: bathsToClean, minutes: Math.round(bathroomMinutes) },
      bedrooms: { count: bedsToClean, minutes: Math.round(bedroomMinutes) },
      kitchen: { included: includeKitchen, minutes: Math.round(kitchenMinutes) },
      living: { included: includeLiving, minutes: Math.round(livingMinutes) },
      sqftAdjustment: Math.round(sqftAdjustmentMinutes),
      subtotalMinutes: Math.round(roomBasedMinutes + sqftAdjustmentMinutes),
    },
    unifiedSpaces: unifiedSpacesBreakdown,
    tasks: {
      items: taskItems,
      totalMinutes: Math.round(taskMinutes),
    },
    multipliers: {
      intentMultiplier: intentSpeedMultiplier,
      intentLabel: INTENT_LABELS[hourlyIntent] || 'Specialist',
      surfaceBuffer: surfaceMultiplier,
      conditionEfficiency,
      occupancyMultiplier,
    },
    frequencyAdjustment: {
      frequency: hourlyFrequency,
      laborMultiplier: frequencyLaborMultiplier,
      deepMaintenanceBuffer: Math.round(deepMaintenanceBufferMinutes),
      adjustmentLabel: frequencyAdjustmentLabel,
      isEfficiencyMode: frequencyLaborMultiplier < 1.0,
    },
    teamSizing: dynamicTeamResult,
    additionalStructures: structureBreakdown,
    summary: {
      totalManMinutes: Math.round(manMinutes),
      suggestedClockHours: minHours,
      suggestedHourlyRate: ESTATE_LOGIC.intentHourlyRates[hourlyIntent] || 110,
      matchingNote,
    },
  };

  return {
    minHours,
    maxHours,
    activeSqft,
    logisticsMinutes: Math.round(logisticsMinutes),
    cleaningMinutes: Math.round(cleaningMinutes),
    taskMinutes: Math.round(taskMinutes),
    totalManMinutes: Math.round(manMinutes),
    message,
    isEstate,
    // South Coast additions
    accessFrictionMinutes: Math.round(accessFrictionMinutes),
    surfaceBufferApplied,
    conditionEfficiency,
    effectiveCleaningMinutes: Math.round(effectiveCleaningMinutes),
    // High-Perception additions
    occupancyMultiplier,
    verticalFrictionMinutes: Math.round(verticalFrictionMinutes),
    // V2: Enhanced breakdown
    recommendedTeamSize: dynamicTeamResult.recommendedTeamSize,
    clockHours: minHours,
    laborHours: minHours * teamSize,
    bufferRangeLow,
    bufferRangeHigh,
    roomMinutes: {
      bathrooms: Math.round(bathroomMinutes),
      bedrooms: Math.round(bedroomMinutes),
      kitchen: Math.round(kitchenMinutes),
      living: Math.round(livingMinutes),
    },
    sqftAdjustmentMinutes: Math.round(sqftAdjustmentMinutes),
    intentMultiplierApplied: intentSpeedMultiplier,
    matchingNote,
    // V3: NEW FIELDS
    unifiedSpacesMinutes: unifiedSpacesBreakdown.totalMinutes,
    unifiedSpacesBreakdown,
    largeEstateTraversalMinutes: Math.round(largeEstateTraversalMinutes),
    aiTimeReceipt,
  };
}

// Helper to get estimated time for a single hourly task
export function getTaskTimeEstimate(
  taskId: string, 
  activeSqft: number, 
  isMovingHourly: boolean
): number {
  let time = ADDON_TIMES[taskId] || 15;
  
  if (isMovingHourly) {
    time *= ESTATE_LOGIC.moveInTaskMultiplier;
  }
  
  if (taskId === 'cabinets') {
    time = Math.max(45, (activeSqft / 1000) * ESTATE_LOGIC.scalableTasks.cabinets);
    if (isMovingHourly) time *= ESTATE_LOGIC.moveInTaskMultiplier;
  }
  if (taskId === 'interior_windows') {
    time = Math.max(30, (activeSqft / 1000) * ESTATE_LOGIC.scalableTasks.windows);
  }
  
  return Math.round(time);
}
