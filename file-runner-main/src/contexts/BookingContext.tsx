import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePersistedBooking, useDebouncedSave } from '@/hooks/usePersistedBooking';
import { Language } from '@/lib/translations';
import { AITimeReceipt } from '@/lib/hourlyLogic';
import { RoomWindowSelection, calculateRoomWindowTotal, calcWindowMapByRoom, isWindowIncludedFlow } from '@/lib/roomWindowConfig';
import { 
  pricingData, 
  serviceTypeMap, 
  addonPrices, 
  microServices, 
  MICRO_SERVICES_MINIMUM, 
  calculateMicroServicePrice,
  isHeavyCondition,
  getCabinetPriceFromSqft,
  HOURLY_CONFIG,
  HOURLY_FREQUENCY_RATES,
  HOURLY_MIN_SESSION_TOTAL,
  HOURLY_LABOR_TIMES,
  HOURLY_SQFT_OPTIONS,
  HourlyIntensity,
  HourlySupplies,
  HourlyFrequency
} from '@/lib/pricing';
import { 
  calculateComponentPrice, 
  BATH_RATES,
  HOME_BASE_RATES,
  BEDROOM_SKIP_RATES,
  getBedroomCountFromHomeSize,
  getValidSkippedBedroomSet,
  getIncludedBedroomCount,
  calculateLivingAreasTotal,
  LIVING_AREA_RATES,
  MOVE_OCCUPANCY_MULTIPLIERS,
  calculateVerticalSurcharge,
  calculatePatioTotal,
  calculateAdditionalStructuresTotal,
  isLifestyleFlow,
  calcFreshSheetsTotals,
  calcOrganizationTotals,
  FRESH_SHEETS_RATE,
  ORGANIZATION_RATE
} from '@/lib/pricing_v2';
import { calcHallwaySummary } from '@/lib/pricing_hallways';
import { calculateAllUtilityAreasTotal } from '@/lib/homeMappingPricing';
import { ensureStairsExist } from '@/lib/stairs/stairsModel';
import type { BathroomInventory } from '@/lib/bathroomMappingTypes';
import type { RoomSectionToggles } from '@/lib/kitchenSectionToggles';

// Minimum service total
const MIN_TOTAL = 165;

export type ServiceMode = 'full' | 'custom';

// Industry type for first step - filters between residential and commercial services
export type Industry = 'residential' | 'commercial' | null;

// Situation type for triage step - includes HOURLY for hourly bookings, SPECIFIC_AREAS for room-based cleaning, COMMERCIAL for B2B, and RENOVATION for post-construction
export type Situation = 'LIVE_HERE' | 'MOVING' | 'HOURLY' | 'SPECIFIC_AREAS' | 'COMMERCIAL' | 'RENOVATION' | null;

// Move context for splitting Move In vs Move Out (same pricing, different UX)
export type MoveContext = 'move_out' | 'move_in' | null;

// Move occupancy for "Empty Shell Audit" - DEPRECATED: use MoveCondition instead
export type MoveOccupancy = 'vacant' | 'furnished';

// Move condition for "Partial Empty" feature (replaces MoveOccupancy)
export type MoveCondition = 'vacant' | 'partial_empty';

// Cleaning density type for estate mode
export type CleaningDensity = 'entire' | 'main_areas' | 'specific_wing' | 'custom';

// === SOUTH COAST CONCIERGE HOURLY TYPES ===
// Access friction for logistics calculation (SB/Ventura region)
export type AccessType = 'standard' | 'hillside' | 'estate_gated';

// Home condition affects cleaning speed
export type HomeConditionLevel = 'tidy' | 'lived_in' | 'cluttered' | 'deep_recovery';

// Overtime protocol for hourly sessions
export type OvertimeProtocol = 'strict' | 'flex';

// Service intent for hourly bookings - UNIFIED (replaces Service Type + Intensity)
// Agency Model: Each intent represents a specialist profile
export type HourlyIntent = 'routine_maintenance' | 'priority_focus' | 'deep_scrub' | 'post_event' | 'organization' | 'move_in_out';

// Delicate surface types requiring special care
export type DelicateSurfaceType = 'stone' | 'clay' | 'beams';

// Occupancy type for hourly mode (affects "Contents Manipulation" time)
export type HourlyOccupancyType = 'vacant' | 'occupied';

// Vertical logistics for apartment access
export type VerticalLogisticsType = 'ground' | 'elevator' | 'walkup';

// Commercial project types and phases
export type CommercialProjectType = 'post_construction_final' | 'post_construction_rough' | 'office_standard' | 'medical_specialized';
export type CommercialCleanPhase = 'rough' | 'final' | 'fluff';
export type CommercialFrequency = 'one_time' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

// === OPERATIONAL REALITY ENGINE v3.0 ===
// Debris level for Rough Clean (affects production speed) - used by both Commercial and Renovation
export type DebrisLevel = 'broom_swept' | 'standard_debris' | 'heavy_haul';

// Ceiling height for Final Clean (affects safety/equipment needs)
export type CeilingHeight = 'standard_10ft' | 'high_12_15ft' | 'warehouse_20ft_plus';

// === RESIDENTIAL RENOVATION TYPES ===
export type RenovationPhase = 'rough_safety' | 'final_punch_list';
export type OccupancyState = 'vacant_empty' | 'furnished_lived_in';
export type SurfaceRisk = 'standard_materials' | 'delicate_stone_wood';

// Paint overspray intensity levels
export type PaintOverspray = 'none' | 'light' | 'moderate' | 'heavy';

// Debris haul size options
export type DebrisHaulSize = 'none' | 'small' | 'truck';

// === HOME ENTRY CONFIGURATION (Arrival & Access Plan) ===
export type HomeEntryPropertyType = 'SINGLE_FAMILY_TOWNHOUSE' | 'APARTMENT_CONDO_STUDIO';
export type AccessMethod = 'SMART_LOCK' | 'LOCKBOX' | 'HIDDEN_KEY' | 'SOMEONE_HOME' | 'OTHER';
export type BuildingEntryMethod = 'CALL_BOX' | 'ENTRY_CODE' | 'FRONT_DESK' | 'KEY_FOB' | 'OTHER';
export type ElevatorType = 'ELEVATOR_AVAILABLE' | 'STAIRS_ONLY' | 'ELEVATOR_RESERVATION_REQUIRED';
export type EntryPathType = 'STEPS' | 'PORCH' | 'SIDE_GATE' | 'NONE' | 'OTHER';
export type ShoesPolicy = 'SHOES_OFF' | 'SHOE_COVERS_OK' | 'NO_PREFERENCE';

// === ENTRY ZONE TYPES (Absorbed from Entryway/Foyer) ===
export type EntryZoneStyle = 'standard_entry' | 'formal_foyer' | 'combined_living_entry';
export type EntryZoneFloor = 'hardwood_tile' | 'carpet' | 'stone';

// === PROPERTY LOGISTICS METADATA (Logistics-only, no pricing impact) ===
export type StudioSubtype = 'open' | 'alcove' | 'attached_adu';
export type PropertyStyleType = 'detached' | 'attached';
export type UnitPosition = 'ground_floor' | 'mid_rise' | 'high_rise';

export interface HomeEntryConfig {
  // Core (all property types)
  propertyType: HomeEntryPropertyType | null;
  accessMethod: AccessMethod | null;
  arrivalInstructions: string;
  parkingNotes: string;
  // SFH/Townhouse only
  gateAccessCode: string;
  entryPathType: EntryPathType | null;
  // Apartment/Condo/Studio only
  buildingEntryMethod: BuildingEntryMethod | null;
  unitNumber: string;
  elevatorType: ElevatorType | null;
  parkingRestrictions: string;
  // Flow: LIVE_HERE
  shoesPolicy: ShoesPolicy | null;
  dailyTrafficNotes: string;
  // Flow: MOVING
  entryClear: boolean | null;
  movingNotes: string;
  
  // === ENTRY ZONE DETAILS (FREE - absorbed from Entryway/Foyer) ===
  entryZoneStyle: EntryZoneStyle | null;
  entryZoneFloor: EntryZoneFloor | null;
  hasEntryRugMat: boolean;
  hasCoatCloset: boolean;
  hasGlassAtEntry: boolean;  // Glass door / sidelights
  
  // === PROPERTY LOGISTICS METADATA (affectsLogistics: true, no pricing) ===
  studioSubtype: StudioSubtype | null;      // Only when formData.homeSize === 0
  propertyStyle: PropertyStyleType | null;   // Only when formData.propertyType === 'house'
  unitPosition: UnitPosition | null;         // Only when formData.propertyType === 'apartment'
}

export const initialHomeEntryConfig: HomeEntryConfig = {
  propertyType: null,
  accessMethod: null,
  arrivalInstructions: '',
  parkingNotes: '',
  gateAccessCode: '',
  entryPathType: null,
  buildingEntryMethod: null,
  unitNumber: '',
  elevatorType: null,
  parkingRestrictions: '',
  shoesPolicy: null,
  dailyTrafficNotes: '',
  entryClear: null,
  movingNotes: '',
  // Entry Zone defaults
  entryZoneStyle: null,
  entryZoneFloor: null,
  hasEntryRugMat: false,
  hasCoatCloset: false,
  hasGlassAtEntry: false,
  // Property Logistics Metadata defaults
  studioSubtype: null,
  propertyStyle: null,
  unitPosition: null,
};

// === STAIR CONFIGURATION FOR MULTI-FLOOR PROPERTIES ===
export type StairSurfaceType = 'carpet' | 'hardwood' | 'mixed_runner';

// Import stair connection type from floor location types
import { StairConnection } from '@/lib/floorLocationTypes';

export interface StairsConfig {
  enabled: boolean;
  surfaceType: StairSurfaceType;
  stepCount: number; // For labor estimation (12-20 typical)
  // Floor connection (stairs connect floors, don't sit on one)
  stairConnection: StairConnection | null; // { from: 'FLOOR_1', to: 'FLOOR_2' }
  // Stair-specific hazards & conditions
  cornerBuildup: boolean;        // Heavy dust in stair corners
  petHairAccumulation: boolean;  // Pet hair on carpet/runner
  slipHazards: boolean;          // Liquids/objects affecting traction
  railingsDetail: boolean;       // Intricate spindles/banisters
}

// === HALLWAY CONFIGURATION (Traffic & Detail Logistics) ===
// Legacy single-entry config (DEPRECATED - kept for migration)
export interface HallwaysConfig {
  enabled: boolean;
  highTrafficDust: boolean;      // Heavy dust in baseboards and corners
  runnerOrRug: boolean;          // Long hallway runner requiring deep vacuuming
  wallScuffs: boolean;           // Shoe marks/scuffs on walls
  galleryWall: boolean;          // Multiple frames/mirrors needing glass detail
  entryDebris: boolean;          // Entry zone with outdoor debris
}

// === HALLWAY SIZE TIER (Affects labor + moving cabinet fee) ===
export type HallwaySizeTier = 'SMALL' | 'MEDIUM' | 'LARGE';

// === MULTI-ENTRY HALLWAY CONFIGURATION ===
export type HallwayFloorType = 'hardwood_tile' | 'carpet' | 'mixed' | null;

export interface HallwayConfig {
  id: string;                      // Stable ID: hallway_0, hallway_1, etc.
  label: string;                   // "Hallway 1", "Upper Hall", etc.
  sizeTier: HallwaySizeTier;       // SMALL | MEDIUM | LARGE
  cabinetCount: number;            // 0-4 linen/storage cabinets
  cabinetsEmpty: boolean;          // MOVING only: true = included, false = +$15 for large
  organizationHours: number;       // LIVE_HERE only: 0-4 hrs at $35/hr (0.5 steps)
  lengthFt?: number;               // Optional: hallway length for labor estimation
  // Floor configuration (per-hallway)
  floorType: HallwayFloorType;     // Hard Floor / Carpet / Mixed
  floorLevel: number | null;       // 1 = F1, 2 = F2, 3 = F3
  // Hazard flags (affects time estimation)
  highTrafficDust: boolean;
  runnerOrRug: boolean;
  wallScuffs: boolean;
  galleryWall: boolean;
  entryDebris: boolean;
  // Connection Mapping (raw area IDs - SSOT)
  connectsTo: string[];            // ['kitchen', 'living', 'bedrooms', etc.]
}

// Upholstery items for furnished properties
export interface UpholsteryItems {
  sofas: number;
  armchairs: number;
  diningChairs: number;
  mattresses: number;
}

// Bathroom breakdown for property composition (renovation density)
export interface RenovationBathroomCounts {
  master: number;
  full: number;
  half: number;
}

// Kitchen size options for renovation
export type KitchenSize = 'galley' | 'standard' | 'open_concept' | 'chef';

// Exterior window types for accurate glass pricing
export interface ExteriorWindowTypes {
  standardPanes: number;
  pictureWindows: number;
  slidingDoors: number;
  skylights: number;
}

// Renovation scope interface (Phase-Locked Logic)
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
  
  // === PROPERTY COMPOSITION (Work Density Calculation) ===
  bedrooms: number;
  bathrooms: RenovationBathroomCounts;
  hasNewKitchen: boolean;
  kitchenSize: KitchenSize;
  
  // === SCOPE DEFINITION (What was renovated?) ===
  hasNewTiling: boolean;
  hasNewCarpets: boolean;
  hasNewWindows: boolean;
  hasNewCabinetry: boolean;
  
  // === CATEGORY 1: Surface Restoration ===
  groutHazeSqft: number;
  paintOverspray: PaintOverspray;
  floorPolishing: boolean;
  
  // === CATEGORY 2: Hidden Dust ===
  insideCabinetry: boolean;
  applianceCount: number;
  carpetExtraction: boolean;
  carpetExtractionSqft: number; // Precise sqft for carpet extraction
  
  // === CATEGORY 3: Height & Safety ===
  highCeilings: boolean;
  
  // === CATEGORY 4: Exterior & Waste ===
  pressureWashing: boolean;
  debrisHaulSize: DebrisHaulSize;
  
  // === NEW GROUP 1: Sparkle Clean (Dust Settling) ===
  sparkleClean: boolean;
  
  // === NEW GROUP 2: Advanced Air Quality ===
  ventCoverCount: number;
  ductCleaningCoordination: boolean;
  
  // === NEW GROUP 3: Upholstery (Furnished Only) ===
  upholsteryItems: UpholsteryItems;
  
  // === NEW GROUP 4: Exterior Glass (Window Types) ===
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
  // Property composition defaults
  bedrooms: 0,
  bathrooms: { master: 0, full: 0, half: 0 },
  hasNewKitchen: false,
  kitchenSize: 'standard',
  // Scope definition defaults
  hasNewTiling: false,
  hasNewCarpets: false,
  hasNewWindows: false,
  hasNewCabinetry: false,
  // Category 1: Surface Restoration
  groutHazeSqft: 0,
  paintOverspray: 'none',
  floorPolishing: false,
  // Category 2: Hidden Dust
  insideCabinetry: false,
  applianceCount: 0,
  carpetExtraction: false,
  carpetExtractionSqft: 0,
  // Category 3: Height & Safety
  highCeilings: false,
  // Category 4: Exterior & Waste
  pressureWashing: false,
  debrisHaulSize: 'none',
  // Group 1: Sparkle Clean
  sparkleClean: false,
  // Group 2: Air Quality
  ventCoverCount: 0,
  ductCleaningCoordination: false,
  // Group 3: Upholstery
  upholsteryItems: {
    sofas: 0,
    armchairs: 0,
    diningChairs: 0,
    mattresses: 0,
  },
  // Group 4: Exterior Glass
  exteriorWindows: {
    standardPanes: 0,
    pictureWindows: 0,
    slidingDoors: 0,
    skylights: 0,
  },
  hasExteriorPaintSplatter: false,
};

// Commercial addon selection
export interface CommercialAddon {
  id: string;
  quantity: number;
}

// Commercial scope interface with friction matrix
export interface CommercialScope {
  sqft: string;
  projectType: CommercialProjectType;
  cleanPhase: CommercialCleanPhase;
  projectName: string;
  hasElevator: boolean;
  floors: number;
  notes: string;
  frequency: CommercialFrequency;
  // === FRICTION MATRIX (Operational Reality Engine) ===
  debrisLevel: DebrisLevel;         // Impacts Rough Clean production speed
  ceilingHeight: CeilingHeight;     // Impacts Final Clean time/safety equipment
  dumpsterOnSite: boolean;          // If false, +$250 haul-away fee (Rough only)
  windowStickerRemoval: boolean;    // If true, $15/panel vs $8 standard
  activeTrades: boolean;            // If true, +25% coordination penalty
  windowCount: number;              // Number of glass panels to clean
  // === SELECTED ADD-ONS ===
  selectedAddons: CommercialAddon[];
}

export const initialCommercialScope: CommercialScope = {
  sqft: '',
  projectType: 'post_construction_final',
  cleanPhase: 'final',
  projectName: '',
  hasElevator: true,
  floors: 1,
  notes: '',
  frequency: 'one_time',
  // Friction matrix defaults (assume worst-case for construction)
  debrisLevel: 'standard_debris',
  ceilingHeight: 'standard_10ft',
  dumpsterOnSite: true,
  windowStickerRemoval: true,       // Assume stickers present on new construction
  activeTrades: false,
  windowCount: 0,
  // Selected addons
  selectedAddons: [],
};

// Property type for MOVING mode vertical logistics
export type PropertyType = 'house' | 'apartment' | null;

// House levels for internal floor surcharge (expanded to 6 for mansions/compounds)
export type HouseLevels = 1 | 2 | 3 | 4 | 5 | 6;

// Patio cleaning scope
export type PatioScope = 'sweep' | 'scrub';

// === UTILITY AREA SIZE TIERS ===
export type UtilityAreaSize = 'small' | 'medium' | 'large';

// === BLINDS/SHUTTERS TYPE ===
export type BlindsType = 'none' | 'standard' | 'plantation' | 'shutters' | 'vertical';

// === OFFICE / STUDY CONFIGURATION ===
export interface OfficeConfig {
  enabled: boolean;
  size: UtilityAreaSize;
  floorType: RoomFloorType;
  floorLocation: number | null;
  ceilingHeight: ResidentialCeilingHeight | null;
  desks: number;                    // 0-3 desks
  shelving: boolean;                // Has bookshelves/shelving
  windowCount: number;              // 0-6 windows
  blindsType: BlindsType;
  baseboardsIncluded: boolean;      // Deep/Move flows
  hazards: {
    dustBuildup: boolean;
    paperClutter: boolean;
    cableManagement: boolean;
  };
  trashBags: number;
  stickySpills: boolean;
}

export const initialOfficeConfig: OfficeConfig = {
  enabled: false,
  size: 'medium',
  floorType: 'hardwood_tile',
  floorLocation: null,
  ceilingHeight: null,
  desks: 1,
  shelving: false,
  windowCount: 1,
  blindsType: 'none',
  baseboardsIncluded: true,
  hazards: {
    dustBuildup: false,
    paperClutter: false,
    cableManagement: false,
  },
  trashBags: 0,
  stickySpills: false,
};

// === LAUNDRY ROOM CONFIGURATION ===
export type LaundryType = 'closet' | 'room';

export interface LaundryConfig {
  enabled: boolean;
  type: LaundryType;                // Closet vs Separate Room
  size: UtilityAreaSize;
  floorType: RoomFloorType;
  floorLocation: number | null;
  ceilingHeight: ResidentialCeilingHeight | null;
  hasSink: boolean;
  hasCabinets: boolean;
  windowCount: number;
  blindsType: BlindsType;
  baseboardsIncluded: boolean;
  hazards: {
    lintBuildup: boolean;
    detergentSpills: boolean;
  };
  trashBags: number;
  stickySpills: boolean;
}

export const initialLaundryConfig: LaundryConfig = {
  enabled: false,
  type: 'closet',
  size: 'small',
  floorType: 'hardwood_tile',
  floorLocation: null,
  ceilingHeight: null,
  hasSink: false,
  hasCabinets: false,
  windowCount: 0,
  blindsType: 'none',
  baseboardsIncluded: true,
  hazards: {
    lintBuildup: false,
    detergentSpills: false,
  },
  trashBags: 0,
  stickySpills: false,
};

// === GARAGE CONFIGURATION (SFH/Townhouse only) ===
export type GarageCapacity = 1 | 2 | 3;
export type GarageStorageLevel = 'light' | 'medium' | 'heavy';
export type GarageFloorCondition = 'concrete' | 'coated' | 'epoxy';

export interface GarageConfig {
  enabled: boolean;
  capacity: GarageCapacity;         // 1, 2, or 3 car garage
  storageLevel: GarageStorageLevel;
  floorCondition: GarageFloorCondition;
  hasOilStains: boolean;
  hasShelving: boolean;
  hasWorkbench: boolean;
  windowCount: number;
  hazards: {
    oilLeaks: boolean;
    heavyDebris: boolean;
  };
  trashBags: number;
}

export const initialGarageConfig: GarageConfig = {
  enabled: false,
  capacity: 2,
  storageLevel: 'light',
  floorCondition: 'concrete',
  hasOilStains: false,
  hasShelving: false,
  hasWorkbench: false,
  windowCount: 0,
  hazards: {
    oilLeaks: false,
    heavyDebris: false,
  },
  trashBags: 0,
};

// === PATIO / BALCONY CONFIGURATION ===
export type PatioType = 'balcony' | 'patio' | 'terrace' | 'yard';
export type PatioSurfaceType = 'tile' | 'concrete' | 'wood_deck';

export interface PatioConfig {
  enabled: boolean;
  type: PatioType;
  size: UtilityAreaSize;
  surfaceType: PatioSurfaceType;
  hasFurniture: boolean;
  hasGlassRailing: boolean;
  floorLocation: number | null;     // Balcony can be on any floor
  windowCount: number;              // Glass doors count as windows
  blindsType: BlindsType;
}

export const initialPatioConfig: PatioConfig = {
  enabled: false,
  type: 'patio',
  size: 'medium',
  surfaceType: 'concrete',
  hasFurniture: false,
  hasGlassRailing: false,
  floorLocation: null,
  windowCount: 1,
  blindsType: 'none',
};

// Per-space floor type (for MOVING mode per-room floor mapping)
export type RoomFloorType = 'hardwood_tile' | 'carpet' | 'mixed';

// Per-space floor composition (replaces global floorHardwoodPercent for MOVING mode)
export interface SpaceFloorComposition {
  kitchen: RoomFloorType;
  living: RoomFloorType;
  dining?: RoomFloorType;
  hallways: RoomFloorType;
  bedrooms: Record<string, RoomFloorType>; // bed_0, bed_1, bed_2, etc.
}

// Import structure config types from components
import { GuestHouseConfig, defaultGuestHouseConfig } from '@/components/cleaning/GuestHouseCard';
import { ArtStudioConfig, defaultArtStudioConfig } from '@/components/cleaning/ArtStudioCard';

// Import home mapping types for single source of truth
import { HomeMappingAreas, DEFAULT_HOME_MAPPING_AREAS } from '@/lib/homeMappingTypes';

// === HOME MAPPING CONTAINER (Single Source of Truth) ===
export interface HomeMapping {
  areas: HomeMappingAreas;
}

export const initialHomeMapping: HomeMapping = {
  areas: { ...DEFAULT_HOME_MAPPING_AREAS },
};

export interface BookingFormData {
  firstName: string;
  lastName: string;
  homeSize: number;
  sqft: string; // Legacy - kept for backward compatibility with pricing engine
  squareFootageRange: string; // NEW: Pure metadata for CRM/reporting (e.g., "SF_600_900")
  serviceType: string;
  baseServiceLevel: string; // For 2-row selector: Standard/Deep/Move-In-Out
  masterBaths: number;
  fullBaths: number;
  halfBaths: number;
  conditionFee: number;
  // === VERTICAL LOGISTICS (MOVING mode only) ===
  propertyType: PropertyType;         // 'house' | 'apartment' - determines vertical logic path
  houseLevels: HouseLevels;           // 1-story, 2-story, 3+ story (for houses)
  apartmentFloor: number;             // Unit floor level 1-50+ (for apartments)
  hasElevator: boolean;               // Elevator access? (for apartments)
  apartmentUnitLevels: number;        // 1 = single-level, 2 = duplex/loft, 3+ = penthouse
  // === ROOM FLOOR LOCATIONS (Multi-Floor Properties) ===
  roomFloorLocations: RoomFloorLocations; // Per-room floor assignment for work routing
  // === PATIO / BALCONY (Legacy - kept for backward compatibility) ===
  patioCount: number;                 // 0-1 (has patio?)
  patioScope: PatioScope;             // 'sweep' (included) | 'scrub' (+$25, +20 min)
  // === HOME MAPPING (Single Source of Truth for Utility Areas) ===
  homeMapping: HomeMapping;
  // === UTILITY AREA CONFIGURATIONS (DEPRECATED - use homeMapping.areas) ===
  officeConfig: OfficeConfig | null;
  laundryConfig: LaundryConfig | null;
  garageConfig: GarageConfig | null;
  patioConfig: PatioConfig | null;
  date: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  // New fields
  homeType: string;
  gatedCommunity: boolean;
  apartmentComplex: boolean;
  upperFloorNoElevator: boolean;
  accessNotes: string;
  // Micro-services notes
  microServicesNotes: string;
  // Safety confirmation
  safetyConfirmed: boolean;
  // Recurring service operational checkboxes
  tidyUpPolicyConfirmed: boolean;
  teamContinuityConfirmed: boolean;
  // Hourly Priority Service fields
  isHourlyMode: boolean;
  hourlyHours: number;              // Clock hours on-site (min 2)
  hourlyIntensity: HourlyIntensity; // 'basic' | 'deep'
  hourlySupplies: HourlySupplies;   // 'client' | 'company'
  hourlyPriorityNotes: string;      // Priority areas from client
  hourlyFrequency: HourlyFrequency; // Frequency for recurring hourly sessions
  // Logistics fields for hourly service
  hasVacuum: boolean;               // Does client have vacuum on-site?
  hasParking: boolean;              // Is parking available for team?
  // Days per week for daily frequency
  daysPerWeek: number;              // Number of days per week (2-5) for "daily" frequency
  // Move-In/Out "Empty Shell Audit" fields
  moveOccupancy?: MoveOccupancy;    // DEPRECATED - kept for migration only
  moveCondition: MoveCondition;     // NEW: 'vacant' | 'partial_empty'
  hallwaysEnabled: boolean;         // NEW: Freeze toggle (preserves config when OFF)
  stairsEnabled: boolean;           // NEW: Freeze toggle (preserves config when OFF)
  // Floor Composition (MOVING mode only)
  floorHardwoodPercent: number;     // 0-100% hardwood/tile
  floorCarpetPercent: number;       // 0-100% carpet (auto-calculated: 100 - hardwood)
  floorIsFocus: boolean;            // Client wants special floor attention
  floorFocusNotes: string;          // Optional focus details
  // Functional Zones (mini-modules beyond bedrooms/baths)
  // For MOVING mode, these act as inventory (existence checklist), not optional add-ons
  officeCount: number;              // Office/Study rooms (0-2)
  laundryRoomCount: number;         // Laundry rooms (0-1)
  loftCount: number;                // Loft/Media rooms (0-2)
  garageCount: number;              // Garage bays (0-2)
  // Hourly Smart Estimator - Property Context
  hourlyTotalSqft: string;          // Square footage range (e.g., "1500_2000")
  hourlyTotalBeds: number;          // Total bedrooms in property
  hourlyTotalBaths: number;         // Total bathrooms in property
  // Hourly Smart Estimator - Active Scope
  hourlyBedsToClean: number;        // Bedrooms to clean this session (≤ total)
  hourlyBathsToClean: number;       // Bathrooms to clean this session (≤ total)
  hourlyIncludeKitchen: boolean;    // Include kitchen?
  hourlyIncludeLivingAreas: boolean; // Include living/dining areas?
  // Estate & Compound Fields (Hourly Mode)
  guestHouseCount: number;          // Detached guest houses (0-3)
  studioCount: number;              // Attached studios/ADUs (0-2)
  poolHouseCount: number;           // Pool houses/cabanas (0-2)
  // === ADDITIONAL STRUCTURE CONFIGURATIONS (Compound/Estate Mapping) ===
  guestHouseConfigs: Record<string, GuestHouseConfig>;
  artStudioConfigs: Record<string, ArtStudioConfig>;
  cleaningDensity: CleaningDensity; // How much of estate to clean
  customActiveSqft: string;         // Used when density === 'custom'
  isMovingHourly: boolean;          // Move-In/Out in hourly mode (high-density)
  hourlyTasks: string[];            // Add-ons converted to TIME (oven, fridge, cabinets, windows)
  // === PROPERTY TYPE (SB/Ventura Market) ===
  hourlyPropertyType: string;       // Property architecture style
  // === AREAS TO INCLUDE/SKIP ===
  hourlyAreasToInclude: string[];   // Rooms to clean this session
  hourlyAreasToSkip: string[];      // Rooms to explicitly skip
  // === SOUTH COAST CONCIERGE HOURLY FIELDS ===
  accessType: AccessType;           // 'standard' | 'hillside' | 'estate_gated'
  hasDelicateSurfaces: boolean;     // Any specialized surfaces?
  delicateSurfaceTypes: DelicateSurfaceType[]; // Which surfaces
  homeConditionLevel: HomeConditionLevel; // 'tidy' | 'lived_in' | 'cluttered'
  hourlyMustHaves: string[];        // Up to 3 core priorities
  hourlyNiceToHaves: string;        // Free-text bonus items
  overtimeProtocol: OvertimeProtocol; // 'strict' | 'flex'
  hourlyIntent: HourlyIntent;       // Service intention
  hourlyTeamSize: 2 | 3 | 4 | 5;    // Team size (dynamic scaling 2-5)
  // === HIGH-PERCEPTION LOGISTIC ENGINEERING FIELDS ===
  isPropertyOccupied: boolean;      // Vacant vs Occupied (Contents Manipulation)
  hasPetsToSecure: boolean;         // Pets safety acknowledgment
  verticalLogistics: VerticalLogisticsType; // Ground Floor / Elevator / Walk-up
  scopeExclusionsConfirmed: boolean; // Scope exclusion acknowledgment
  gateCode: string;                 // Secure gate entry code
  alarmCode: string;                // Secure alarm code
  keyLocation: string;              // Key/lockbox location
  
  // === V3: HOURLY UNIFIED SPACES (Work-Summation Engine) ===
  hourlyOfficeCount: number;        // Home offices to clean (0-3)
  hourlyLaundryCount: number;       // Laundry rooms (0-2)
  hourlyLoftCount: number;          // Loft/Media rooms (0-3)
  hourlyGarageCount: number;        // Garage bays (0-3)
  hourlyPatioCount: number;         // Patios/balconies (0-2)
  hourlyPatioScope: 'sweep' | 'scrub'; // Patio cleaning level
  
  // === V3: AI TIME RECEIPT (for Review + PDF) ===
  hourlyRecommendedTeamSize: number;
  hourlyClockHours: number;
  hourlyLaborHours: number;
  hourlyTeamRationale: string;
  hourlyTimeReceipt: AITimeReceipt | null;
  
  // === V3: PROPERTY CATEGORY & VERTICAL LOGISTICS (for hourly mode) ===
  propertyCategory: 'single_family' | 'multi_unit';
  homeStories: number;
  unitFloorLevel: number;
  hasElevatorAccess: boolean;
  
  // === INTENT-SPECIFIC FIELDS (Conditional Dynamic Fields) ===
  
  // THE KEEPER (Routine Maintenance) Fields
  lifestyleAddons: {
    laundryLoads: number;          // Number of loads
    dishwasher: boolean;           // Load/unload
    bedMaking: boolean;            // Change linens
    plantCare: boolean;            // Water plants
    trashOut: boolean;             // Take out trash/recycling
    mailSort: boolean;             // Sort mail & packages
    petBowls: boolean;             // Refresh pet bowls
  };
  hasSheddingPets: boolean;        // Triggers HEPA requirement
  preferredDay: string | null;     // Preferred cleaning day (Mon-Fri)
  
  // EFFICIENCY EXPERT (Priority Focus) Fields
  budgetHours: 2 | 3 | 4;          // Hard stop timer
  priorityRanking: string[];       // Ordered list of must-haves
  priorityAreas: string[];         // Ordered list of priority areas for Efficiency Expert
  scopeExclusionConfirmed: boolean; // "I understand secondary rooms may not be touched"
  
  // HEAVY-LIFTER (Deep Scrub) Fields
  grimeLevel: 'standard' | 'recovery'; // Standard vs +30% Recovery Mode
  hasNaturalStone: boolean;        // Marble/Travertine safety flag
  pullOutAppliances: boolean;      // Fridge/oven (requires 2 people)
  
  // RECOVERY TEAM (Post-Event) Fields
  eventType: 'party' | 'wedding' | 'corporate' | 'family' | 'holiday' | 'other' | null;
  eventGuestCount: '1-10' | '10-25' | '25-50' | '50-100' | '100+' | null;
  affectedAreas: string[];         // ['kitchen', 'living', 'bathrooms', 'outdoor', 'garage', 'bedrooms']
  messTypes: string[];             // ['food_spills', 'drink_stains', 'grease', 'confetti', 'candle_wax', 'broken_items']
  debrisBags: number;              // 1-15 bags estimate
  hasStickySpills: boolean;        // Alcohol/soda on floors
  furnitureNeedsResetting: boolean; // Tables/chairs moved for event
  hasBiohazard: boolean;           // Triggers decline or surcharge
  mustFinishBy: string;            // Time constraint
  
  // HOME ASSISTANT (Organization) Fields
  organizationTasks: string[];     // ['closet', 'pantry', 'toys', 'packing'] - legacy flat-rate
  noScrubAcknowledged: boolean;    // Required disclaimer confirmation
  clutterLevel: 'minimal' | 'moderate' | 'significant' | 'overwhelming' | null;
  // V2: Per-unit organization task counters (Motor de Tareas por Unidad)
  organizationTaskCounts: {
    laundry_loads: number;         // 0-5 loads
    closets: number;               // 0-6 closets
    toy_rooms: number;             // 0-3 rooms
    desk_areas: number;            // 0-3 workspaces
    linen_closets: number;         // 0-3 closets
    bathroom_drawers: number;      // 0-4 bathrooms
  };
  
  // THE FINISHER (Move-In/Out) Fields
  isHome100Empty: boolean | null;  // CRITICAL check - null means not answered
  needsLandlordReceipt: boolean;   // Receipt for deposit
  movingTimelineIntent: 'urgent' | 'planning' | null;  // MOVING: How urgent is the move?
  walkthroughDate: string;         // MOVING: Walkthrough date if urgent
  
  // THE KEEPER (Routine Maintenance) Extended Fields
  equipmentPreference: 'client_provides' | 'we_bring' | 'hybrid' | null;  // Who provides supplies
  clientSuppliesNotes: string;     // What supplies client has
  routinePriorities: string[];     // Priority ranking for routine visits
  
  // Commercial B2B scope (only used when situation === 'COMMERCIAL')
  commercialScope: CommercialScope;
  // Renovation scope (only used when situation === 'RENOVATION')
  renovationScope: RenovationScope;
  
  // === PROPERTY COMPOSITION (LIVE_HERE/MOVING mode) ===
  // Dynamic spaces based on sqft + bedrooms - users can toggle to exclude
  includedSpaces: string[];     // Spaces included in this session (e.g., ['kitchen', 'living', 'dining'])
  excludedSpaces: string[];     // Spaces explicitly excluded by user
  
  // === SKIP ROOM FEATURE (South Coast Flexibility) ===
  // Allows clients to exclude unused/storage bedrooms from service
  skippedBedrooms: string[];    // Array of bedroom IDs: ['bed_1', 'bed_2'] (bed_0 = Master, cannot skip)
  
  // === ROOM-BASED WINDOW SELECTIONS (LIVE_HERE/MOVING mode) ===
  roomWindowSelections: RoomWindowSelection[];
  
  // === PER-SPACE FLOOR COMPOSITION (MOVING mode) ===
  // Per-room floor type mapping for accurate labor calculation
  spaceFloorTypes: SpaceFloorComposition;
  
  // === SURFACE NOTES (Technical Data Collection - Zero Cost) ===
  // Per-room notes for surface details (delicate materials, pet stains, etc.)
  surfaceNotes: RoomSurfaceNotes;
  
  // === BEDROOM CONFIGURATIONS (Identity + Per-Room Add-ons) ===
  // Room identity profiles and per-bedroom add-ons (ceiling fans, light fixtures)
  bedroomConfigs: Record<string, BedroomConfig>;
  
  // === BASEBOARD SELECTIONS (Deep/Move flows) ===
  // Per-room baseboard inclusion toggle - default true for Deep/Move
  baseboardSelections: RoomBaseboardConfig;
  
  // === FLOOR FOCUS PRIORITY (Legacy - kept for backward compatibility) ===
  // Note: This is no longer used for pricing, but kept for data migration
  floorFocusRooms: string[];
  
  // === PER-ROOM ADDON SELECTIONS (Room Independence) ===
  // Stores addons per room instead of globally - prevents cross-room pollution
  roomAddons: RoomAddons;
  
  // === STAIR CONFIGURATION (Multi-Floor Properties) ===
  stairsConfig: StairsConfig;     // DEPRECATED: Legacy single-object config
  
  // === MULTI-ENTRY STAIRS (Multi-Floor Logistics SSOT) ===
  stairs: import('@/lib/stairs/stairsModel').StairConfig[];
  
  // === HALLWAY CONFIGURATION (Traffic & Detail Logistics) ===
  hallwaysConfig: HallwaysConfig;  // DEPRECATED: Legacy single-entry config
  
  // === MULTI-ENTRY HALLWAYS (Cabinet Logistics + Organization) ===
  hallways: HallwayConfig[];
  
  // === USER EXCLUSIONS (DO NOT TOUCH - Cognitive Mapping) ===
  // Per-room exclusion tracking for standard inclusions - price unchanged, team skips
  userExclusions: UserExclusions;
  
  // === AREA-SPECIFIC HAZARDS & WASTE (Deep/Move flows only) ===
  roomMessTypes: RoomMessTypes;
  roomTrashBags: RoomTrashBags;
  roomStickySpills: RoomStickySpills;
  
  // === BEDROOM HAZARDS (Per-Bedroom Logistics) ===
  bedroomHazards: Record<string, BedroomHazards>;
  
  // === CEILING HEIGHTS (Residential Detailed Home Mapping) ===
  // Per-room ceiling height for logistics and scope-of-work
  ceilingHeights: CeilingHeights;
  
  // === HOME ENTRY CONFIGURATION (Arrival & Access Plan) ===
  homeEntry: HomeEntryConfig;
  
  // === KITCHEN CABINET SIZE OVERRIDE (Multi-Factor Pricing) ===
  kitchenCabinetOverride: 'small' | 'typical' | 'large';
  
  // === KITCHEN DEGREASE LEVEL (Heavy Degrease Mode) ===
  kitchenDegreaseLevel?: 'light' | 'medium' | 'heavy';
  
  // === ROOM SECTION TOGGLES (Scalable per-room opt-in sections) ===
  roomSectionToggles?: RoomSectionToggles;
  
  // === BATHROOM INVENTORY (Premium Mapping) ===
  bathroomInventory?: BathroomInventory;
  
  // === AREA-SPECIFIC CONDITION FEES (Deep Clean / Move-In-Out only) ===
  areaConditionEnabled: boolean;
  globalConditionLevel: import('@/lib/areaConditionFees').AreaConditionLevel;
  areaConditionSelections: import('@/lib/areaConditionFees').AreaConditionSelection[];
}

// Per-room baseboard configuration
export interface RoomBaseboardConfig {
  kitchen: boolean;
  living: boolean;
  dining?: boolean;
  hallways: boolean;
  bedrooms: Record<string, boolean>; // bed_0, bed_1, etc.
}

// Surface notes per room (zero-cost data collection)
export interface RoomSurfaceNotes {
  kitchen: string;
  living: string;
  dining?: string;
  hallways: string;
  bedrooms: Record<string, string>; // bed_0, bed_1, etc.
}

// === USER EXCLUSIONS (DO NOT TOUCH mapping) ===
// Per-room exclusion tracking for standard inclusions - price unchanged, team skips
export interface UserExclusions {
  kitchen: string[];     // Excluded inclusion keys ['trash_removal', 'microwave']
  living: string[];
  dining: string[];
  hallways: string[];
  stairs: string[];
  bedrooms: Record<string, string[]>; // bed_0: ['closet_doors']
}

// === AREA-SPECIFIC HAZARDS & WASTE (Deep/Move flows only) ===
// Per-room mess type tracking (e.g., 'food_spills', 'grease')
export interface RoomMessTypes {
  kitchen: string[];
  living: string[];
  dining: string[];
  hallways: string[];
  stairs: string[];
  bedrooms: Record<string, string[]>;
  studio_main: string[];  // NEW: Studio SSOT
}

// Per-room trash bag estimates (0-15 bags)
export interface RoomTrashBags {
  kitchen: number;
  living: number;
  dining: number;
  hallways: number;
  stairs: number;
  bedrooms: Record<string, number>;
  studio_main: number;    // NEW: Studio SSOT
}

// Per-room sticky spills toggle
export interface RoomStickySpills {
  kitchen: boolean;
  living: boolean;
  dining: boolean;
  hallways: boolean;
  stairs: boolean;
  bedrooms: Record<string, boolean>;
  studio_main: boolean;   // NEW: Studio SSOT
}

// === ROOM FLOOR LOCATIONS (Multi-Floor Properties) ===
// Per-room floor assignment for work order routing
export interface RoomFloorLocations {
  kitchen: number;              // Floor 1, 2, 3...
  living: number;
  dining: number;
  hallways: number;             // Primary hallway location
  bedrooms: Record<string, number>;  // bed_0: 2, bed_1: 2
  bathrooms: {
    master: number[];           // [2] = master bath on floor 2
    full: number[];             // [1, 2] = full baths on floors 1 and 2
    half: number[];             // [1] = half bath on floor 1
  };
  optionalSpaces: {
    office: number[];
    laundry: number[];
    loft: number[];
    garage: number[];
  };
}

// === CEILING HEIGHTS (Residential Detailed Home Mapping) ===
// Per-room ceiling height for logistics and scope-of-work
export type ResidentialCeilingHeight = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CeilingHeights {
  kitchen: ResidentialCeilingHeight | null;
  living: ResidentialCeilingHeight | null;
  dining: ResidentialCeilingHeight | null;
  stairs: ResidentialCeilingHeight | null;
  hallways: Record<string, ResidentialCeilingHeight | null>; // hallway_0, hallway_1
  bedrooms: Record<string, ResidentialCeilingHeight | null>; // bed_0, bed_1
}

export const initialCeilingHeights: CeilingHeights = {
  kitchen: null,
  living: null,
  dining: null,
  stairs: null,
  hallways: {},
  bedrooms: {},
};

// Bedroom profile types for room identity
export type BedroomProfile = 'master' | 'primary' | 'studio_living' | 'kids' | 'guest' | 'office' | 'standard';

// Per-bedroom configuration (identity + add-ons)
export interface BedroomConfig {
  profile: BedroomProfile;
  ceilingFans: number;  // 0-2 per bedroom
  lightFixtures: number; // 0-3 per bedroom
  closetCabinets: number; // 0-2 per bedroom - interior closet detail
  freshSheets: number;    // 0 or 1 - Fresh Sheets & Made Beds ($10)
  organizationHours: number; // 0-4 hours - Organization service ($35/hr)
}

// === BEDROOM HAZARDS INTERFACE (Deep/Move flows) ===
// Per-bedroom hazard conditions for logistics planning
export interface BedroomHazards {
  dustBuildup: boolean;         // Heavy dust on surfaces (+8 min)
  petHair: boolean;             // Pet hair on carpets/fabrics (+10 min)
  underBedDebris: boolean;      // Items under bed (+6 min)
  closetClutter: boolean;       // Heavy closet contents - Move-Out only (+12 min)
  textileAccumulation: boolean; // Textile bagging needed - Move-Out only (+15 min)
  trashBags: number;            // 0-15 bags for Move-Out
  stickySpills: boolean;        // Sticky floor hazard
}

// === PER-ROOM ADDON SELECTIONS (Room Independence) ===
// Replaces global selectedAddons for core space addons - each room stores its own
export interface RoomAddonSelection {
  addonId: string;
  quantity: number;
}

export interface RoomAddons {
  kitchen: RoomAddonSelection[];
  living: RoomAddonSelection[];
  dining: RoomAddonSelection[];
  hallways: RoomAddonSelection[];
  stairs?: RoomAddonSelection[];  // NEW: Separate from hallways (only for 2+ floors)
  bedrooms: Record<string, RoomAddonSelection[]>; // bed_0: [{addonId: 'ceiling_fan', quantity: 2}]
}

export interface CustomZones {
  bathroom: boolean;
  kitchen: boolean;
  living: boolean;
  bedroom: boolean;
  windows: boolean;
}

export interface CustomCounts {
  masterBaths: number;
  fullBaths: number;
  halfBaths: number;
  bedroomCount: number;
}

export interface Addon {
  value: string;
  quantity: number;
}

// Micro-service selection interface
export interface MicroServiceSelection {
  id: string;
  quantity: number;
}

export type RecurringStartMode = 'deep-plus-recurring' | 'recurring-only';

interface BookingContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  industry: Industry;
  setIndustry: (industry: Industry) => void;
  mode: ServiceMode;
  setMode: (mode: ServiceMode) => void;
  situation: Situation;
  setSituation: (situation: Situation) => void;
  moveContext: MoveContext;
  setMoveContext: (context: MoveContext) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
  customZones: CustomZones;
  setCustomZones: React.Dispatch<React.SetStateAction<CustomZones>>;
  customCounts: CustomCounts;
  setCustomCounts: React.Dispatch<React.SetStateAction<CustomCounts>>;
  selectedAddons: Addon[];
  toggleAddon: (value: string, quantity?: number) => void;
  updateAddonQuantity: (value: string, quantity: number) => void;
  // === PER-ROOM ADDON HANDLERS ===
  toggleRoomAddon: (roomId: string, addonId: string, quantity?: number) => void;
  updateRoomAddonQuantity: (roomId: string, addonId: string, quantity: number) => void;
  getRoomAddonsTotal: () => { total: number; minutes: number };
  // === USER EXCLUSION HANDLER (Cognitive Mapping) ===
  toggleUserExclusion: (roomId: string, inclusionKey: string) => void;
  // === AREA-SPECIFIC HAZARDS & WASTE HANDLERS (Deep/Move flows) ===
  updateRoomMessTypes: (roomId: string, types: string[]) => void;
  updateRoomTrashBags: (roomId: string, count: number) => void;
  updateRoomStickySpills: (roomId: string, value: boolean) => void;
  showWindowStep: boolean;
  setShowWindowStep: (show: boolean) => void;
  recurringStartMode: RecurringStartMode;
  setRecurringStartMode: (mode: RecurringStartMode) => void;
  // HARD GATE: Services revealed flag for Step 2
  servicesRevealed: boolean;
  setServicesRevealed: (revealed: boolean) => void;
  // Track if moving add-ons pre-selection has been applied (once per session)
  movingAddonsApplied: boolean;
  setMovingAddonsApplied: (applied: boolean) => void;
  // Micro-services
  selectedMicroServices: MicroServiceSelection[];
  toggleMicroService: (id: string, quantity?: number) => void;
  updateMicroServiceQuantity: (id: string, quantity: number) => void;
  getMicroServicesTotal: () => { subtotal: number; total: number; minimumApplied: boolean; heavyApplied: boolean };
  hasMicroServicesOnly: () => boolean;
  getMicroServiceLinePrice: (id: string, quantity: number) => { base: number; withCondition: number; withHeavy: number };
  calculateTotal: () => number;
  calculateCustomTotal: () => number;
  calculateHourlyTotal: () => number;
  getHourlyRate: () => number;
  getAddonTotal: () => number;
  isRecurringService: () => boolean;
  getRawTotal: () => number;
  getRawCustomTotal: () => number;
  getFirstVisitPrice: () => number;
  calculateRecommendedHours: () => number;
  getFutureVisitsPrice: () => number | null;
  // === AREA-SPECIFIC CONDITION FEE HANDLERS ===
  setAreaConditionEnabled: (enabled: boolean) => void;
  setGlobalConditionLevel: (level: import('@/lib/areaConditionFees').AreaConditionLevel) => void;
  toggleAreaConditionSelection: (roomId: string, category: import('@/lib/areaConditionFees').ConditionAreaCategory) => void;
  clearAreaConditionSelections: () => void;
  MIN_TOTAL: number;
  MICRO_MIN: number;
  HOURLY_CONFIG: typeof HOURLY_CONFIG;
  clearPersistedState: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { loadPersistedState, saveState, clearPersistedState } = usePersistedBooking();
  const hasHydrated = useRef(false);

  const [language, setLanguage] = useState<Language>('en');
  // FROZEN: Industry selection bypassed - flow starts at Triage
  // TODO: Restore to `null` when re-enabling Industry step
  const [industry, setIndustry] = useState<Industry>('residential');
  const [mode, setMode] = useState<ServiceMode>('full');
  const [situation, setSituation] = useState<Situation>(null);
  const [moveContext, setMoveContext] = useState<MoveContext>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWindowStep, setShowWindowStep] = useState(false);
  // HARD GATE: Track if user has clicked "View Available Services"
  const [servicesRevealed, setServicesRevealed] = useState(false);
  // Track if moving add-ons have been pre-selected (once per session)
  const [movingAddonsApplied, setMovingAddonsApplied] = useState(false);
  
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: '',
    lastName: '',
    homeSize: 0, // Start at 0 - user must select
    sqft: '', // Empty - user must select
    squareFootageRange: '', // NEW: Pure metadata field
    serviceType: '', // Empty - user must select
    baseServiceLevel: '', // Empty - user must select
    masterBaths: 0,
    fullBaths: 0,
    halfBaths: 0,
    conditionFee: 0,
    // Vertical Logistics defaults (MOVING mode)
    propertyType: null,
    houseLevels: 1,
    apartmentFloor: 1,
    hasElevator: true,
    apartmentUnitLevels: 1,
    // Room Floor Locations defaults (multi-floor properties)
    roomFloorLocations: {
      kitchen: 1,
      living: 1,
      dining: 1,
      hallways: 1,
      bedrooms: {},
      bathrooms: {
        master: [1],
        full: [1],
        half: [1],
      },
      optionalSpaces: {
        office: [],
        laundry: [],
        loft: [],
        garage: [],
      },
    },
    patioCount: 0,
    patioScope: 'sweep',
    // === HOME MAPPING (Single Source of Truth for Utility Areas) ===
    homeMapping: initialHomeMapping,
    // === UTILITY AREA CONFIGURATIONS (DEPRECATED - use homeMapping.areas) ===
    officeConfig: null,
    laundryConfig: null,
    garageConfig: null,
    patioConfig: null,
    date: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
    // New fields
    homeType: 'Single-Family Home',
    gatedCommunity: false,
    apartmentComplex: false,
    upperFloorNoElevator: false,
    accessNotes: '',
    microServicesNotes: '',
    safetyConfirmed: false,
    // Recurring service operational checkboxes
    tidyUpPolicyConfirmed: false,
    teamContinuityConfirmed: false,
    // Hourly Priority Service defaults
    isHourlyMode: false,
    hourlyHours: 2,
    hourlyIntensity: 'basic',
    hourlySupplies: 'company',
    hourlyPriorityNotes: '',
    hourlyFrequency: 'onetime',
    // Logistics defaults
    hasVacuum: true,
    hasParking: true,
    // Days per week default
    daysPerWeek: 3,
    // Move-In/Out Empty Shell Audit defaults (NEW: moveCondition + enabled booleans)
    moveCondition: 'vacant',
    hallwaysEnabled: true,
    stairsEnabled: true,
    // Floor Composition defaults
    floorHardwoodPercent: 50,
    floorCarpetPercent: 50,
    floorIsFocus: false,
    floorFocusNotes: '',
    // Functional Zones defaults
    officeCount: 0,
    laundryRoomCount: 0,
    loftCount: 0,
    garageCount: 0,
    // Hourly Smart Estimator defaults
    hourlyTotalSqft: '1500_2000',
    hourlyTotalBeds: 3,
    hourlyTotalBaths: 2,
    hourlyBedsToClean: 2,
    hourlyBathsToClean: 2,
    hourlyIncludeKitchen: true,
    hourlyIncludeLivingAreas: true,
  // Estate & Compound defaults
  guestHouseCount: 0,
  studioCount: 0,
  poolHouseCount: 0,
  // === ADDITIONAL STRUCTURE CONFIGURATIONS ===
  guestHouseConfigs: {},
  artStudioConfigs: {},
    cleaningDensity: 'entire',
    customActiveSqft: '',
    isMovingHourly: false,
    hourlyTasks: [],
    // === PROPERTY TYPE (SB/Ventura Market) ===
    hourlyPropertyType: 'single_family',
    // === AREAS TO INCLUDE/SKIP ===
    hourlyAreasToInclude: ['kitchen', 'living_room'],
    hourlyAreasToSkip: [],
    // === SOUTH COAST CONCIERGE HOURLY DEFAULTS ===
    accessType: 'standard',
    hasDelicateSurfaces: false,
    delicateSurfaceTypes: [],
    homeConditionLevel: 'lived_in',
    hourlyMustHaves: [],
    hourlyNiceToHaves: '',
    overtimeProtocol: 'strict',
    hourlyIntent: 'priority_focus',
    hourlyTeamSize: 2,
    // === HIGH-PERCEPTION LOGISTIC ENGINEERING DEFAULTS ===
    isPropertyOccupied: true,
    hasPetsToSecure: false,
    verticalLogistics: 'ground',
    scopeExclusionsConfirmed: false,
    gateCode: '',
    alarmCode: '',
    keyLocation: '',
    
    // === V3: HOURLY UNIFIED SPACES DEFAULTS ===
    hourlyOfficeCount: 0,
    hourlyLaundryCount: 0,
    hourlyLoftCount: 0,
    hourlyGarageCount: 0,
    hourlyPatioCount: 0,
    hourlyPatioScope: 'sweep',
    
    // === V3: AI TIME RECEIPT DEFAULTS ===
    hourlyRecommendedTeamSize: 2,
    hourlyClockHours: 0,
    hourlyLaborHours: 0,
    hourlyTeamRationale: '',
    hourlyTimeReceipt: null,
    
    // === V3: PROPERTY CATEGORY & VERTICAL LOGISTICS DEFAULTS ===
    propertyCategory: 'single_family',
    homeStories: 1,
    unitFloorLevel: 1,
    hasElevatorAccess: true,
    
    // === INTENT-SPECIFIC FIELD DEFAULTS ===
    
    // THE KEEPER (Routine Maintenance) defaults
    lifestyleAddons: {
      laundryLoads: 0,
      dishwasher: false,
      bedMaking: false,
      plantCare: false,
      trashOut: false,
      mailSort: false,
      petBowls: false,
    },
    hasSheddingPets: false,
    preferredDay: null,
    
    // EFFICIENCY EXPERT (Priority Focus) defaults
    budgetHours: 3,
    priorityRanking: [],
    priorityAreas: [],
    scopeExclusionConfirmed: false,
    
    // HEAVY-LIFTER (Deep Scrub) defaults
    grimeLevel: 'standard',
    hasNaturalStone: false,
    pullOutAppliances: false,
    
    // RECOVERY TEAM (Post-Event) defaults
    eventType: null,
    eventGuestCount: null,
    affectedAreas: [],
    messTypes: [],
    debrisBags: 3,
    hasStickySpills: false,
    furnitureNeedsResetting: false,
    hasBiohazard: false,
    mustFinishBy: '',
    
    // HOME ASSISTANT (Organization) defaults
    organizationTasks: [],
    noScrubAcknowledged: false,
    clutterLevel: null,
    organizationTaskCounts: {
      laundry_loads: 0,
      closets: 0,
      toy_rooms: 0,
      desk_areas: 0,
      linen_closets: 0,
      bathroom_drawers: 0,
    },
    
    // THE FINISHER (Move-In/Out) defaults
    isHome100Empty: null,
    needsLandlordReceipt: false,
    movingTimelineIntent: null,
    walkthroughDate: '',
    
    // THE KEEPER (Routine Maintenance) Extended defaults
    equipmentPreference: null,
    clientSuppliesNotes: '',
    routinePriorities: [],
    
    // Commercial B2B defaults
    commercialScope: initialCommercialScope,
    // Renovation defaults
    renovationScope: initialRenovationScope,
    
    // === PROPERTY COMPOSITION DEFAULTS ===
    includedSpaces: ['kitchen', 'living', 'dining'],  // Auto-populated based on sqft/beds
    excludedSpaces: [],                               // User-excluded spaces
    
    // === SKIP ROOM FEATURE DEFAULTS ===
    skippedBedrooms: [],                              // No bedrooms skipped by default
    
    // === ROOM-BASED WINDOW SELECTIONS ===
    roomWindowSelections: [],                         // Populated by RoomBasedWindowSection
    
    // === PER-SPACE FLOOR COMPOSITION DEFAULTS ===
    spaceFloorTypes: {
      kitchen: 'hardwood_tile',   // Kitchens typically hard floors
      living: 'mixed',            // Living rooms often mixed
      dining: 'hardwood_tile',    // Dining rooms typically hard floors (BUG FIX: was missing)
      hallways: 'hardwood_tile',  // Hallways typically hard floors
      bedrooms: {},               // Populated dynamically based on bedroom count
    },
    
    // === SURFACE NOTES DEFAULTS ===
    surfaceNotes: {
      kitchen: '',
      living: '',
      hallways: '',
      bedrooms: {},
    },
    
    // === BEDROOM CONFIGURATIONS DEFAULTS ===
    bedroomConfigs: {},           // Populated dynamically based on bedroom count
    
    // === BASEBOARD SELECTIONS DEFAULTS ===
    baseboardSelections: {
      kitchen: true,              // All rooms have baseboards by default
      living: true,
      hallways: true,
      bedrooms: {},               // Populated dynamically based on bedroom count
    },
    
    // === FLOOR FOCUS PRIORITY DEFAULTS (Legacy) ===
    floorFocusRooms: [],          // No longer used for pricing
    
    // === PER-ROOM ADDON SELECTIONS DEFAULTS ===
    roomAddons: {
      kitchen: [],
      living: [],
      dining: [],
      hallways: [],
      bedrooms: {},
    },
    
    // === STAIR CONFIGURATION DEFAULTS (Multi-Floor Properties) ===
    stairsConfig: {
      enabled: true,
      surfaceType: 'carpet',
      stepCount: 14,
      stairConnection: null, // Set when user selects floor connection
      cornerBuildup: false,
      petHairAccumulation: false,
      slipHazards: false,
      railingsDetail: false,
    },
    
    // === HALLWAY CONFIGURATION DEFAULTS (Traffic & Detail Logistics) ===
    hallwaysConfig: {
      enabled: true,
      highTrafficDust: false,
      runnerOrRug: false,
      wallScuffs: false,
      galleryWall: false,
      entryDebris: false,
    },
    
    // === MULTI-ENTRY STAIRS DEFAULTS ===
    // Empty by default - auto-created when 2+ floors selected
    stairs: [],
    
    // === MULTI-ENTRY HALLWAYS DEFAULTS ===
    // Empty by default - user adds via "Add Hallway" button
    // Gated to 2+ bedroom homes (see shouldShowHallwaysSection)
    hallways: [],
    
    // === USER EXCLUSIONS DEFAULTS (Cognitive Mapping - DO NOT TOUCH) ===
    userExclusions: {
      kitchen: [],
      living: [],
      dining: [],
      hallways: [],
      stairs: [],
      bedrooms: {},
    },
    
    // === AREA-SPECIFIC HAZARDS & WASTE DEFAULTS (Deep/Move flows only) ===
    roomMessTypes: {
      kitchen: [],
      living: [],
      dining: [],
      hallways: [],
      stairs: [],
      bedrooms: {},
      studio_main: [],  // NEW: Studio SSOT hazard key
    },
    roomTrashBags: {
      kitchen: 0,
      living: 0,
      dining: 0,
      hallways: 0,
      stairs: 0,
      bedrooms: {},
      studio_main: 0,   // NEW: Studio SSOT trash key
    },
    roomStickySpills: {
      kitchen: false,
      living: false,
      dining: false,
      hallways: false,
      stairs: false,
      bedrooms: {},
      studio_main: false, // NEW: Studio SSOT sticky key
    },
    
    // === BEDROOM HAZARDS DEFAULTS ===
    bedroomHazards: {},  // Populated dynamically based on bedroom count
    
    // === CEILING HEIGHTS DEFAULTS (Residential Logistics) ===
    ceilingHeights: initialCeilingHeights,
    
    // === HOME ENTRY CONFIGURATION DEFAULTS ===
    homeEntry: initialHomeEntryConfig,
    
    // === KITCHEN CABINET SIZE OVERRIDE DEFAULT ===
    kitchenCabinetOverride: 'typical',
    
    // === AREA-SPECIFIC CONDITION FEES DEFAULTS ===
    areaConditionEnabled: false,
    globalConditionLevel: 'normal',
    areaConditionSelections: [],
  });

  const [customZones, setCustomZones] = useState<CustomZones>({
    bathroom: false,
    kitchen: false,
    living: false,
    bedroom: false,
    windows: false,
  });

  const [customCounts, setCustomCounts] = useState<CustomCounts>({
    masterBaths: 1,
    fullBaths: 1,
    halfBaths: 0,
    bedroomCount: 3,
  });

  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [recurringStartMode, setRecurringStartMode] = useState<RecurringStartMode>('deep-plus-recurring');
  
  // Micro-services state
  const [selectedMicroServices, setSelectedMicroServices] = useState<MicroServiceSelection[]>([]);
  
  // Track previous service LEVEL to detect actual service changes (not frequency)
  const prevServiceLevelRef = useRef<string | null>(null);
  
  // Auto-sync recurringStartMode based on baseServiceLevel when entering recurring
  useEffect(() => {
    const isRecurring = ['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType);
    
    if (isRecurring && formData.baseServiceLevel) {
      if (formData.baseServiceLevel === 'Deep Clean') {
        // Deep Clean selected → default to deep-plus-recurring
        setRecurringStartMode('deep-plus-recurring');
      } else if (formData.baseServiceLevel === 'Standard Clean') {
        // Standard Clean selected → default to recurring-only (maintenance only)
        setRecurringStartMode('recurring-only');
      }
    }
  }, [formData.serviceType, formData.baseServiceLevel]);
  
  // Reset relevant form data when service LEVEL changes (Standard ↔ Deep ↔ Move-In/Out)
  // Frequency changes (Just Once → Monthly) should NOT trigger reset
  useEffect(() => {
    if (!hasHydrated.current) return; // Skip on initial load
    
    const currentServiceLevel = formData.baseServiceLevel;
    
    // Only reset if service LEVEL actually changed (not frequency)
    if (prevServiceLevelRef.current !== null && prevServiceLevelRef.current !== currentServiceLevel) {
      console.log('[ServiceLevel Change] Resetting from', prevServiceLevelRef.current, 'to', currentServiceLevel);
      
      // Reset service-specific selections
      setSelectedAddons([]);
      setSelectedMicroServices([]);
      // Note: Don't reset servicesRevealed here - it should persist for Large Estate flow
      setMovingAddonsApplied(false);
      
      // Reset condition fee to standard
      setFormData(prev => ({
        ...prev,
        conditionFee: 0,
        // Also reset area-specific condition fees
        areaConditionEnabled: false,
        globalConditionLevel: 'normal',
        areaConditionSelections: [],
      }));
    }
    
    prevServiceLevelRef.current = currentServiceLevel;
  }, [formData.baseServiceLevel]);
  
  // === DATA HYGIENE: Clear area condition fees when gating becomes false ===
  // Import gating function inline to avoid circular dependencies
  useEffect(() => {
    if (!hasHydrated.current) return;
    
    // Check if area condition fees should be enabled
    const gatingEnabled = (
      (situation === 'LIVE_HERE' && formData.baseServiceLevel === 'Deep Clean') ||
      (situation === 'MOVING' && formData.baseServiceLevel === 'Move-In/Out')
    );
    
    // If gating is false and feature is enabled, auto-disable
    if (!gatingEnabled && formData.areaConditionEnabled) {
      setFormData(prev => ({
        ...prev,
        areaConditionEnabled: false,
        globalConditionLevel: 'normal',
        areaConditionSelections: [],
      }));
    }
  }, [situation, formData.baseServiceLevel, formData.areaConditionEnabled]);

  // === AUTO-CREATE STAIRS: Ensure required connections exist when structure changes ===
  // SSOT-safe: Only adds MISSING floor connections, never overwrites user edits
  useEffect(() => {
    // Calculate max floors from property config
    const maxFloors = formData.propertyType === 'apartment' 
      ? (formData.apartmentUnitLevels || 1)
      : (formData.houseLevels || 1);
    
    // Only process for multi-floor properties
    if (maxFloors < 2) return;
    
    // Get updated stairs (adds missing connections, preserves existing)
    const currentStairs = formData.stairs || [];
    const updated = ensureStairsExist(currentStairs, maxFloors);
    
    // Only update if changes were made (prevents infinite loops)
    if (updated.length !== currentStairs.length) {
      setFormData(prev => ({ ...prev, stairs: updated }));
    }
  }, [formData.propertyType, formData.houseLevels, formData.apartmentUnitLevels]);

  // === HYDRATION: Load persisted state on mount ===
  // Only restore if user had made meaningful progress (has email or phone filled)
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const persisted = loadPersistedState();
    if (persisted) {
      // Only restore if user had filled contact info (meaningful progress)
      const hasContactInfo = persisted.formData?.email || persisted.formData?.phone;
      
      if (hasContactInfo) {
        // Merge formData to preserve defaults for new fields not in old persisted state
        if (persisted.formData) setFormData(prev => ({ ...prev, ...persisted.formData }));
        if (persisted.selectedAddons) setSelectedAddons(persisted.selectedAddons);
        if (persisted.mode) setMode(persisted.mode);
        if (persisted.situation) setSituation(persisted.situation);
        if (persisted.currentStep !== undefined) setCurrentStep(persisted.currentStep);
        if (persisted.recurringStartMode) setRecurringStartMode(persisted.recurringStartMode);
        if (persisted.servicesRevealed !== undefined) setServicesRevealed(persisted.servicesRevealed);
        if (persisted.selectedMicroServices) setSelectedMicroServices(persisted.selectedMicroServices);
        console.log('[Persistence] State hydrated from localStorage');
      } else {
        // No meaningful progress - start fresh
        clearPersistedState();
        console.log('[Persistence] Cleared incomplete draft, starting fresh');
      }
    }
  }, [loadPersistedState, clearPersistedState]);

  // === DEBOUNCED SAVE: Persist state on every change ===
  const performSave = useCallback(() => {
    saveState({
      formData,
      selectedAddons,
      mode,
      situation,
      currentStep,
      recurringStartMode,
      servicesRevealed,
      selectedMicroServices,
    });
  }, [formData, selectedAddons, mode, situation, currentStep, recurringStartMode, servicesRevealed, selectedMicroServices, saveState]);

  const debouncedSave = useDebouncedSave(performSave, 300);

  // Trigger save on any state change (after hydration)
  useEffect(() => {
    if (hasHydrated.current) {
      debouncedSave();
    }
  }, [formData, selectedAddons, mode, situation, currentStep, recurringStartMode, servicesRevealed, selectedMicroServices, debouncedSave]);

  const updateFormData = useCallback((data: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  // === AREA-SPECIFIC CONDITION FEE HANDLERS ===
  const setAreaConditionEnabled = useCallback((enabled: boolean) => {
    setFormData(prev => {
      if (!enabled) {
        // Data hygiene: if disabled, clear selections + reset level
        return {
          ...prev,
          areaConditionEnabled: false,
          globalConditionLevel: 'normal' as const,
          areaConditionSelections: [],
        };
      }
      return { ...prev, areaConditionEnabled: enabled };
    });
  }, []);

  const setGlobalConditionLevel = useCallback((level: import('@/lib/areaConditionFees').AreaConditionLevel) => {
    setFormData(prev => {
      if (level === 'normal') {
        // Data hygiene: if 'normal', clear selections
        return {
          ...prev,
          globalConditionLevel: level,
          areaConditionSelections: [],
        };
      }
      return { ...prev, globalConditionLevel: level };
    });
  }, []);

  const toggleAreaConditionSelection = useCallback((roomId: string, category: import('@/lib/areaConditionFees').ConditionAreaCategory) => {
    setFormData(prev => {
      const current = prev.areaConditionSelections || [];
      const exists = current.some(s => s.roomId === roomId);
      return {
        ...prev,
        areaConditionSelections: exists
          ? current.filter(s => s.roomId !== roomId)
          : [...current, { roomId, category }],
      };
    });
  }, []);

  const clearAreaConditionSelections = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      areaConditionSelections: [],
    }));
  }, []);

  const toggleAddon = useCallback((value: string, quantity = 1) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.value === value);
      if (exists) {
        return prev.filter((a) => a.value !== value);
      }
      return [...prev, { value, quantity }];
    });
  }, []);

  const updateAddonQuantity = useCallback((value: string, quantity: number) => {
    setSelectedAddons((prev) =>
      prev.map((a) => (a.value === value ? { ...a, quantity } : a))
    );
  }, []);

  const getAddonTotal = useCallback(() => {
    return selectedAddons.reduce((total, addon) => {
      const price = addonPrices[addon.value] || 0;
      return total + price * addon.quantity;
    }, 0);
  }, [selectedAddons]);

  // === PER-ROOM ADDON HANDLERS ===
  // Toggle addon for a specific room (room-independent selection)
  const toggleRoomAddon = useCallback((roomId: string, addonId: string, quantity = 1) => {
    setFormData(prev => {
      const isBedroom = roomId.startsWith('bed_');
      
      if (isBedroom) {
        const currentAddons = prev.roomAddons?.bedrooms?.[roomId] || [];
        const exists = currentAddons.find(a => a.addonId === addonId);
        const newAddons = exists
          ? currentAddons.filter(a => a.addonId !== addonId)
          : [...currentAddons, { addonId, quantity }];
        
        return {
          ...prev,
          roomAddons: {
            ...prev.roomAddons,
            bedrooms: {
              ...prev.roomAddons?.bedrooms,
              [roomId]: newAddons,
            }
          }
        };
      } else {
        const roomKey = roomId as keyof Omit<RoomAddons, 'bedrooms'>;
        const currentAddons = prev.roomAddons?.[roomKey] || [];
        const exists = currentAddons.find(a => a.addonId === addonId);
        const newAddons = exists
          ? currentAddons.filter(a => a.addonId !== addonId)
          : [...currentAddons, { addonId, quantity }];
        
        return {
          ...prev,
          roomAddons: {
            ...prev.roomAddons,
            [roomKey]: newAddons,
          }
        };
      }
    });
  }, []);

  // Update quantity for room-specific addon
  // FIX: Now adds new addons if they don't exist, updates if they do, removes if quantity === 0
  const updateRoomAddonQuantity = useCallback((roomId: string, addonId: string, quantity: number) => {
    setFormData(prev => {
      const isBedroom = roomId.startsWith('bed_');
      
      if (isBedroom) {
        const currentAddons = prev.roomAddons?.bedrooms?.[roomId] || [];
        const exists = currentAddons.some(a => a.addonId === addonId);
        
        // If quantity === 0 → remove; if exists → update; else → add
        const newAddons = quantity === 0
          ? currentAddons.filter(a => a.addonId !== addonId)
          : exists
            ? currentAddons.map(a => a.addonId === addonId ? { ...a, quantity } : a)
            : [...currentAddons, { addonId, quantity }];
        
        return {
          ...prev,
          roomAddons: {
            ...prev.roomAddons,
            bedrooms: {
              ...prev.roomAddons?.bedrooms,
              [roomId]: newAddons,
            }
          }
        };
      } else {
        const roomKey = roomId as keyof Omit<RoomAddons, 'bedrooms'>;
        const currentAddons = prev.roomAddons?.[roomKey] || [];
        const exists = currentAddons.some(a => a.addonId === addonId);
        
        // If quantity === 0 → remove; if exists → update; else → add
        const newAddons = quantity === 0
          ? currentAddons.filter(a => a.addonId !== addonId)
          : exists
            ? currentAddons.map(a => a.addonId === addonId ? { ...a, quantity } : a)
            : [...currentAddons, { addonId, quantity }];
        
        return {
          ...prev,
          roomAddons: {
            ...prev.roomAddons,
            [roomKey]: newAddons,
          }
        };
      }
    });
  }, []);

  // Calculate total for all room addons
  const getRoomAddonsTotal = useCallback(() => {
    let total = 0;
    let minutes = 0;
    const roomAddons = formData.roomAddons;
    
    if (!roomAddons) return { total: 0, minutes: 0 };
    
    // Core spaces: kitchen, living, dining, hallways
    (['kitchen', 'living', 'dining', 'hallways'] as const).forEach(roomId => {
      const addons = roomAddons[roomId] || [];
      addons.forEach(addon => {
        const price = addonPrices[addon.addonId] || 0;
        total += price * addon.quantity;
        // Estimate 15 min per addon for labor calculation
        minutes += 15 * addon.quantity;
      });
    });
    
    // Bedroom addons
    Object.values(roomAddons.bedrooms || {}).forEach(addons => {
      addons.forEach(addon => {
        const price = addonPrices[addon.addonId] || 0;
        total += price * addon.quantity;
        minutes += 15 * addon.quantity;
      });
    });
    
    return { total, minutes };
  }, [formData.roomAddons]);

  // === USER EXCLUSION TOGGLE HANDLER (Cognitive Mapping) ===
  // Toggle inclusion exclusion for a specific room - price unchanged, signals "DO NOT TOUCH"
  const toggleUserExclusion = useCallback((roomId: string, inclusionKey: string) => {
    setFormData(prev => {
      const isBedroom = roomId.startsWith('bed_');
      
      if (isBedroom) {
        const currentExclusions = prev.userExclusions?.bedrooms?.[roomId] || [];
        const isExcluded = currentExclusions.includes(inclusionKey);
        const newExclusions = isExcluded
          ? currentExclusions.filter(k => k !== inclusionKey)
          : [...currentExclusions, inclusionKey];
        
        return {
          ...prev,
          userExclusions: {
            ...prev.userExclusions,
            bedrooms: {
              ...prev.userExclusions?.bedrooms,
              [roomId]: newExclusions,
            }
          }
        };
      } else {
        const roomKey = roomId as keyof Omit<UserExclusions, 'bedrooms'>;
        const currentExclusions = prev.userExclusions?.[roomKey] || [];
        const isExcluded = currentExclusions.includes(inclusionKey);
        const newExclusions = isExcluded
          ? currentExclusions.filter(k => k !== inclusionKey)
          : [...currentExclusions, inclusionKey];
        
        return {
          ...prev,
          userExclusions: {
            ...prev.userExclusions,
            [roomKey]: newExclusions,
          }
        };
      }
    });
  }, []);

  // === AREA-SPECIFIC HAZARDS & WASTE HANDLERS (Deep/Move flows) ===
  const updateRoomMessTypes = useCallback((roomId: string, types: string[]) => {
    const isBedroom = roomId.startsWith('bed_');
    setFormData(prev => {
      if (isBedroom) {
        return {
          ...prev,
          roomMessTypes: {
            ...prev.roomMessTypes,
            bedrooms: {
              ...prev.roomMessTypes?.bedrooms,
              [roomId]: types,
            }
          }
        };
      } else {
        return {
          ...prev,
          roomMessTypes: {
            ...prev.roomMessTypes,
            [roomId]: types,
          }
        };
      }
    });
  }, []);

  const updateRoomTrashBags = useCallback((roomId: string, count: number) => {
    const isBedroom = roomId.startsWith('bed_');
    setFormData(prev => {
      if (isBedroom) {
        return {
          ...prev,
          roomTrashBags: {
            ...prev.roomTrashBags,
            bedrooms: {
              ...prev.roomTrashBags?.bedrooms,
              [roomId]: count,
            }
          }
        };
      } else {
        return {
          ...prev,
          roomTrashBags: {
            ...prev.roomTrashBags,
            [roomId]: count,
          }
        };
      }
    });
  }, []);

  const updateRoomStickySpills = useCallback((roomId: string, value: boolean) => {
    const isBedroom = roomId.startsWith('bed_');
    setFormData(prev => {
      if (isBedroom) {
        return {
          ...prev,
          roomStickySpills: {
            ...prev.roomStickySpills,
            bedrooms: {
              ...prev.roomStickySpills?.bedrooms,
              [roomId]: value,
            }
          }
        };
      } else {
        return {
          ...prev,
          roomStickySpills: {
            ...prev.roomStickySpills,
            [roomId]: value,
          }
        };
      }
    });
  }, []);

  // === MICRO-SERVICES FUNCTIONS ===
  const toggleMicroService = useCallback((id: string, quantity = 1) => {
    setSelectedMicroServices((prev) => {
      const exists = prev.find((m) => m.id === id);
      if (exists) {
        return prev.filter((m) => m.id !== id);
      }
      return [...prev, { id, quantity }];
    });
  }, []);

  const updateMicroServiceQuantity = useCallback((id: string, quantity: number) => {
    setSelectedMicroServices((prev) =>
      prev.map((m) => (m.id === id ? { ...m, quantity } : m))
    );
  }, []);

  // Check if any area zones are selected (for determining if micro-services-only)
  const hasAreaZones = useCallback(() => {
    return customZones.bathroom || customZones.kitchen || customZones.living || customZones.bedroom;
  }, [customZones]);

  // Calculate individual micro-service line price (for display in Review/PDF)
  const getMicroServiceLinePrice = useCallback((id: string, quantity: number) => {
    const microService = microServices.find((m) => m.id === id);
    if (!microService) return { base: 0, withCondition: 0, withHeavy: 0 };
    
    // Calculate base price (passing sqft for cabinet pricing)
    const sqftValue = formData.sqft;
    const base = calculateMicroServicePrice(microService, quantity, sqftValue);
    
    // Calculate condition factor
    let conditionFactor = 1.0;
    if (formData.conditionFee === 120) conditionFactor = 1.25;
    else if (formData.conditionFee === 180) conditionFactor = 1.5;
    
    const withCondition = Math.round(base * conditionFactor);
    
    // Apply heavy surcharge if applicable - use SSOT helper
    // Import isHeavyConditionForQuote from areaConditionFees for proper area-specific support
    const isHeavyForQuote = (formData.areaConditionEnabled && formData.globalConditionLevel === 'heavy_severe') || 
                           (formData.conditionFee || 0) >= 120;
    let withHeavy = withCondition;
    if (isHeavyForQuote && microService.heavySurchargePercent) {
      const heavyFactor = 1 + (microService.heavySurchargePercent / 100);
      withHeavy = Math.round(withCondition * heavyFactor);
    }
    
    return { base, withCondition, withHeavy };
  }, [formData.sqft, formData.conditionFee, formData.areaConditionEnabled, formData.globalConditionLevel]);

  // Calculate micro-services total with condition factor, heavy surcharge, and $120 minimum
  const getMicroServicesTotal = useCallback(() => {
    if (selectedMicroServices.length === 0) {
      return { subtotal: 0, total: 0, minimumApplied: false, heavyApplied: false };
    }

    // Calculate condition factor from conditionFee
    // Light/Normal = 0 → 1.0x, Heavy = 120 → 1.25x, Extra = 180 → 1.5x
    let conditionFactor = 1.0;
    if (formData.conditionFee === 120) conditionFactor = 1.25;
    else if (formData.conditionFee === 180) conditionFactor = 1.5;
    
    // Use SSOT heavy detection: area-specific or legacy
    const isHeavyForQuote = (formData.areaConditionEnabled && formData.globalConditionLevel === 'heavy_severe') || 
                           (formData.conditionFee || 0) >= 120;
    let heavyApplied = false;

    // Sum up prices with condition and heavy surcharge
    const subtotalWithConditionAndHeavy = selectedMicroServices.reduce((total, selection) => {
      const microService = microServices.find((m) => m.id === selection.id);
      if (!microService) return total;
      
      // Calculate base price (passing sqft for cabinet pricing)
      const sqftValue = formData.sqft;
      const basePrice = calculateMicroServicePrice(microService, selection.quantity, sqftValue);
      
      // Apply condition factor
      let serviceTotal = Math.round(basePrice * conditionFactor);
      
      // Apply heavy surcharge if applicable
      if (isHeavyForQuote && microService.heavySurchargePercent) {
        const heavyFactor = 1 + (microService.heavySurchargePercent / 100);
        serviceTotal = Math.round(serviceTotal * heavyFactor);
        heavyApplied = true;
      }
      
      return total + serviceTotal;
    }, 0);

    // Check if micro-services only (no area zones selected)
    const isMicroOnly = !hasAreaZones();
    
    // Apply $120 minimum only for micro-services-only bookings
    if (isMicroOnly) {
      const finalTotal = Math.max(MICRO_SERVICES_MINIMUM, subtotalWithConditionAndHeavy);
      return {
        subtotal: subtotalWithConditionAndHeavy,
        total: finalTotal,
        minimumApplied: subtotalWithConditionAndHeavy < MICRO_SERVICES_MINIMUM,
        heavyApplied,
      };
    }

    // No minimum when combined with area services
    return {
      subtotal: subtotalWithConditionAndHeavy,
      total: subtotalWithConditionAndHeavy,
      minimumApplied: false,
      heavyApplied,
    };
  }, [selectedMicroServices, formData.conditionFee, formData.sqft, hasAreaZones]);

  // Check if booking is micro-services only (for display/payload purposes)
  const hasMicroServicesOnly = useCallback(() => {
    return selectedMicroServices.length > 0 && !hasAreaZones();
  }, [selectedMicroServices, hasAreaZones]);

  // Check if current service type is recurring (Weekly/Bi-Weekly/Monthly)
  const isRecurringService = useCallback(() => {
    const idx = serviceTypeMap[formData.serviceType];
    return idx >= 3; // Weekly=3, Bi-Weekly=4, Monthly=5
  }, [formData.serviceType]);

  // === HOURLY PRIORITY SERVICE CALCULATION ===
  // Uses frequency-based tiered rates with dynamic team size
  // Value-Based Pricing: Intent determines rate tier
  // - Priority Focus / Post-Event / Organization → basic rate ($55/hr one-time)
  // - Deep Scrub (furnished) → deep rate ($55/hr one-time, same as basic for Golden Billable Rate)
  // - Deep Scrub + Empty Home (Move In/Out) → moveInOut rate ($64/hr premium)
  const getHourlyRate = useCallback(() => {
    const frequency = formData.hourlyFrequency || 'onetime';
    const frequencyRates = HOURLY_FREQUENCY_RATES[frequency];
    const intent = formData.hourlyIntent || 'priority_focus';
    
    // Move-In/Out is now a first-class intent with its own premium rate
    if (intent === 'move_in_out') {
      return frequencyRates.moveInOut;  // $64/hr for one-time
    }
    
    // Deep Scrub intensity uses deep rate
    // Also respect explicit hourlyIntensity if set
    const isDeepIntent = intent === 'deep_scrub' || formData.hourlyIntensity === 'deep';
    if (isDeepIntent) {
      return frequencyRates.deep;  // $55/hr for one-time (Golden Billable Rate)
    }
    
    // All other intents (Priority Focus, Post-Event, Organization, Routine Maintenance) use basic rate
    return frequencyRates.basic;  // $55/hr for one-time
  }, [formData.hourlyIntensity, formData.hourlyFrequency, formData.hourlyIntent]);

  const calculateHourlyTotal = useCallback(() => {
    const hours = Math.max(formData.hourlyHours, HOURLY_CONFIG.MIN_CLOCK_HOURS);
    const rate = getHourlyRate();
    const teamSize = formData.hourlyTeamSize || HOURLY_CONFIG.TEAM_SIZE;
    // Total = Clock Hours × Team Size × Rate per person
    const rawTotal = hours * teamSize * rate;
    
    // Apply $250 minimum for commercial deployment costs
    return Math.max(HOURLY_MIN_SESSION_TOTAL, rawTotal);
  }, [formData.hourlyHours, formData.hourlyTeamSize, getHourlyRate]);

  // === HOURLY SMART ESTIMATOR: Calculate Recommended Hours ===
  const calculateRecommendedHours = useCallback(() => {
    const intensity = formData.hourlyIntensity || 'basic';
    const times = HOURLY_LABOR_TIMES;
    
    let totalManMinutes = times.setup;
    
    // Sqft factor with fallback
    const sqftValue = formData.hourlyTotalSqft || '1500_2000';
    const sqftOption = HOURLY_SQFT_OPTIONS.find(opt => opt.value === sqftValue);
    const sqftMidpoint = sqftOption?.midpoint || 1750;
    totalManMinutes += Math.ceil(sqftMidpoint / 1000) * times.sqftPer1000;
    
    // Rooms to clean with fallbacks
    const bedsToClean = formData.hourlyBedsToClean ?? 2;
    const bathsToClean = formData.hourlyBathsToClean ?? 2;
    totalManMinutes += bedsToClean * times.bedroom[intensity];
    
    // Bathrooms - assume mix of types (simplified: use standard rate)
    totalManMinutes += bathsToClean * times.bathroom.standard[intensity];
    
    // Common areas with fallbacks
    const includeKitchen = formData.hourlyIncludeKitchen ?? true;
    const includeLiving = formData.hourlyIncludeLivingAreas ?? true;
    
    if (includeKitchen) {
      totalManMinutes += times.kitchen[intensity];
    }
    if (includeLiving) {
      totalManMinutes += times.livingArea[intensity];
    }
    
    // Convert to clock hours (2-person team)
    const clockMinutes = totalManMinutes / HOURLY_CONFIG.TEAM_SIZE;
    const clockHours = Math.ceil(clockMinutes / 60 * 2) / 2; // Round to nearest 0.5
    
    // Return minimum 2 hours
    return Math.max(HOURLY_CONFIG.MIN_CLOCK_HOURS, clockHours);
  }, [
    formData.hourlyIntensity,
    formData.hourlyTotalSqft,
    formData.hourlyBedsToClean,
    formData.hourlyBathsToClean,
    formData.hourlyIncludeKitchen,
    formData.hourlyIncludeLivingAreas
  ]);

  const calculateTotal = useCallback(() => {
    // PRIORITY: Hourly mode bypasses standard matrix pricing
    if (formData.isHourlyMode) {
      return calculateHourlyTotal();
    }
    
    // === SSOT: Derive validated skipped set and included bedroom count ===
    const validSkippedSet = getValidSkippedBedroomSet(
      formData.homeSize, 
      formData.skippedBedrooms || []
    );
    const includedBedroomCount = getIncludedBedroomCount(
      formData.homeSize,
      formData.skippedBedrooms || []
    );
    
    // Use V2 component-based pricing with includedBedroomCount for base calculation
    const componentResult = calculateComponentPrice({
      homeSize: includedBedroomCount, // SSOT: Use derived count, not raw homeSize
      masterBaths: formData.masterBaths,
      fullBaths: formData.fullBaths,
      halfBaths: formData.halfBaths,
      serviceType: formData.serviceType,
      conditionFee: formData.conditionFee,
      includeCabinets: false,
    });
    
    // Calculate Functional Zones (Living Areas) total
    const isDeep = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
    const isMoveInOut = formData.serviceType === 'Move-In/Out' || situation === 'MOVING';
    
    // NEW: Utility Areas from homeMapping (Single Source of Truth)
    // Uses contract-driven pricing engine instead of legacy counters
    const utilityAreasResult = calculateAllUtilityAreasTotal(
      formData.homeMapping?.areas || DEFAULT_HOME_MAPPING_AREAS,
      isDeep
    );
    const utilityAreasTotal = utilityAreasResult.totalPrice;
    
    // Legacy: Only loft remains on old counter system
    const legacyLoftTotal = (formData.loftCount || 0) * (isDeep ? 35 : 25);
    
    // Calculate Vertical Logistics Surcharge (both MOVING and LIVE_HERE modes)
    const vertical = calculateVerticalSurcharge({
      propertyType: formData.propertyType,
      houseLevels: formData.houseLevels || 1,
      apartmentFloor: formData.apartmentFloor || 1,
      hasElevator: formData.hasElevator !== false,
    });
    
    // Calculate Patio total (both MOVING and LIVE_HERE modes)
    const patio = calculatePatioTotal(
      formData.patioCount || 0,
      formData.patioScope || 'sweep'
    );
    
    // Calculate room-based window totals using single source of truth
    // calcWindowMapByRoom handles both PER_ROOM and AGGREGATE policies correctly
    const isIncludedFlow = isWindowIncludedFlow(formData.serviceType, situation || undefined);
    const windowMap = calcWindowMapByRoom(formData.roomWindowSelections || [], isIncludedFlow);
    // Use billable cost only - included windows are already excluded
    const roomWindowTotal = windowMap.totalBillableCost;
    
    // === BEDROOM SKIP CREDIT SYSTEM ===
    // REMOVED: Legacy credit system no longer needed
    // Base pricing now uses HOME_BASE_RATES[includedBedroomCount] directly
    // This eliminates double-discount risk and maintains SSOT
    
    // === PER-BEDROOM ADD-ONS PRICING ===
    // Calculate ceiling fans and light fixtures per bedroom
    // Fresh Sheets and Organization use helper functions for Single Source of Truth
    const bedroomConfigs = formData.bedroomConfigs || {};
    const isLifestyle = isLifestyleFlow(situation, formData.serviceType);
    
    // Use helper functions for Fresh Sheets and Organization calculations
    // SSOT: Pass validated skipped set to gate addons for excluded bedrooms
    const sheetsTotals = calcFreshSheetsTotals(bedroomConfigs, isLifestyle, validSkippedSet);
    const orgTotals = calcOrganizationTotals(bedroomConfigs, validSkippedSet);
    
    const bedroomAddonsTotal = Object.entries(bedroomConfigs).reduce((sum, [bedId, config]) => {
      // SSOT: Skip addons for excluded bedrooms (uses validated set)
      if (validSkippedSet.has(bedId)) return sum;
      
      const fanPrice = (config.ceilingFans || 0) * 10;  // $10 per ceiling fan
      const lightPrice = (config.lightFixtures || 0) * 5; // $5 per light fixture
      // Fresh Sheets and Organization NOT included here - calculated via helpers above
      return sum + fanPrice + lightPrice;
    }, 0);
    
    // Fresh Sheets total from helper (includes courtesy logic)
    const freshSheetsTotalCost = sheetsTotals.totalCost;
    
    // Organization tracked separately as "Extra Service"
    const extraServicesTotal = orgTotals.totalCost;
    
    // Calculate base total before occupancy multiplier (includes vertical + patio + room windows - bedroom credits + bedroom addons + room addons)
    const roomAddonsTotals = getRoomAddonsTotal();
    
    // Calculate Additional Structures total (compound/estate properties)
    const additionalStructures = calculateAdditionalStructuresTotal({
      guestHouseCount: formData.guestHouseCount || 0,
      artStudioCount: formData.studioCount || 0,
      poolHouseCount: formData.poolHouseCount || 0,
      isDeepClean: isDeep,
      guestHouseConfigs: formData.guestHouseConfigs,
      artStudioConfigs: formData.artStudioConfigs,
    });
    
    // === HALLWAY LOGISTICS (Multi-Entry Cabinet/Organization) ===
    // Uses calcHallwaySummary as single source of truth
    // MOVING: +$15 for large hallways with non-empty cabinets
    // LIVE_HERE: +$35/hr for organization service
    const hallwaySummary = calcHallwaySummary(
      formData.hallways || [],
      situation,
      formData.serviceType
    );
    const hallwayTotal = hallwaySummary.totalCost;
    
    let rawTotal = componentResult.finalPrice + utilityAreasTotal + legacyLoftTotal + vertical.surcharge + patio.price + roomWindowTotal + roomAddonsTotals.total + bedroomAddonsTotal + freshSheetsTotalCost + extraServicesTotal + additionalStructures.total + hallwayTotal;
    
    // REMOVED: +25% Move Occupancy Multiplier (legacy - replaced by Move Condition system)
    // Partial Empty now uses granular freeze toggles instead of a flat multiplier
    // REMOVED: - bedroomCredit (legacy - base now uses includedBedroomCount directly)
    
    return Math.max(MIN_TOTAL, rawTotal);
  }, [formData.homeSize, formData.serviceType, formData.conditionFee, formData.masterBaths, formData.fullBaths, formData.halfBaths, formData.isHourlyMode, formData.loftCount, formData.homeMapping, formData.moveCondition, formData.propertyType, formData.houseLevels, formData.apartmentFloor, formData.hasElevator, formData.patioCount, formData.patioScope, formData.roomWindowSelections, formData.skippedBedrooms, formData.bedroomConfigs, formData.guestHouseCount, formData.studioCount, formData.poolHouseCount, formData.guestHouseConfigs, formData.artStudioConfigs, formData.hallways, situation, getRoomAddonsTotal, calculateHourlyTotal]);

  // Get raw total before minimum applied (for display purposes)
  const getRawTotal = useCallback(() => {
    const componentResult = calculateComponentPrice({
      homeSize: formData.homeSize,
      masterBaths: formData.masterBaths,
      fullBaths: formData.fullBaths,
      halfBaths: formData.halfBaths,
      serviceType: formData.serviceType,
      conditionFee: formData.conditionFee,
      includeCabinets: false,
    });
    
    // Include Functional Zones in raw total
    const isDeep = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
    
    // NEW: Utility Areas from homeMapping (Single Source of Truth)
    const utilityAreasResult = calculateAllUtilityAreasTotal(
      formData.homeMapping?.areas || DEFAULT_HOME_MAPPING_AREAS,
      isDeep
    );
    const utilityAreasTotal = utilityAreasResult.totalPrice;
    
    // Legacy: Only loft remains on old counter system
    const legacyLoftTotal = (formData.loftCount || 0) * (isDeep ? 35 : 25);
    
    // Include Vertical Surcharge and Patio in raw total
    const vertical = calculateVerticalSurcharge({
      propertyType: formData.propertyType,
      houseLevels: formData.houseLevels || 1,
      apartmentFloor: formData.apartmentFloor || 1,
      hasElevator: formData.hasElevator !== false,
    });
    
    const patio = calculatePatioTotal(
      formData.patioCount || 0,
      formData.patioScope || 'sweep'
    );
    
    // Include Additional Structures in raw total
    const isDeepForStructures = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
    const additionalStructures = calculateAdditionalStructuresTotal({
      guestHouseCount: formData.guestHouseCount || 0,
      artStudioCount: formData.studioCount || 0,
      poolHouseCount: formData.poolHouseCount || 0,
      isDeepClean: isDeepForStructures,
      guestHouseConfigs: formData.guestHouseConfigs,
      artStudioConfigs: formData.artStudioConfigs,
    });

    return componentResult.finalPrice + utilityAreasTotal + legacyLoftTotal + vertical.surcharge + patio.price + getRoomAddonsTotal().total + additionalStructures.total;
  }, [formData.homeSize, formData.serviceType, formData.conditionFee, formData.masterBaths, formData.fullBaths, formData.halfBaths, formData.loftCount, formData.homeMapping, formData.propertyType, formData.houseLevels, formData.apartmentFloor, formData.hasElevator, formData.patioCount, formData.patioScope, formData.guestHouseCount, formData.studioCount, formData.poolHouseCount, formData.guestHouseConfigs, formData.artStudioConfigs, getRoomAddonsTotal]);

  const getRawCustomTotal = useCallback(() => {
    let total = 0;
    
    if (customZones.bathroom) {
      total += customCounts.masterBaths * 80;
      total += customCounts.fullBaths * 70;
      total += customCounts.halfBaths * 50;
    }
    
    if (customZones.kitchen) {
      total += 165;
    }
    
    if (customZones.living) {
      total += 110;
    }
    
    if (customZones.bedroom) {
      total += Math.max(120, customCounts.bedroomCount * 40);
    }
    
    total += getRoomAddonsTotal().total;
    
    // Add micro-services total (raw, without extra minimum consideration here)
    const microTotal = getMicroServicesTotal();
    total += microTotal.total;
    
    return total;
  }, [customZones, customCounts, getRoomAddonsTotal, getMicroServicesTotal]);

  // Get First Visit price for recurring services
  // If Deep Reset selected → Deep Clean pricing (no frequency discount)
  // If Standard selected → Standard pricing WITH frequency discount applied
  const getFirstVisitPrice = useCallback(() => {
    if (!isRecurringService()) {
      return calculateTotal();
    }
    
    // Calculate Vertical Surcharge and Patio (consistent across all modes)
    const vertical = calculateVerticalSurcharge({
      propertyType: formData.propertyType,
      houseLevels: formData.houseLevels || 1,
      apartmentFloor: formData.apartmentFloor || 1,
      hasElevator: formData.hasElevator !== false,
    });
    
    const patio = calculatePatioTotal(
      formData.patioCount || 0,
      formData.patioScope || 'sweep'
    );
    
    // Calculate Functional Zones total
    const isDeepLevel = formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out';
    const livingAreasTotal = calculateLivingAreasTotal(
      formData.officeCount || 0,
      formData.laundryRoomCount || 0,
      formData.loftCount || 0,
      formData.garageCount || 0,
      isDeepLevel
    );
    
    if (recurringStartMode === 'deep-plus-recurring') {
      // Deep Reset first visit - use Deep Clean pricing (no frequency discount)
      const componentResult = calculateComponentPrice({
        homeSize: formData.homeSize,
        masterBaths: formData.masterBaths,
        fullBaths: formData.fullBaths,
        halfBaths: formData.halfBaths,
        serviceType: 'Deep Clean', // Force Deep Clean rates
        conditionFee: formData.conditionFee,
        includeCabinets: false,
      });
      
      // Include room-based window totals
      const roomWindowTotal = calculateRoomWindowTotal(formData.roomWindowSelections || []).totalPrice;
      const rawTotal = componentResult.finalPrice + livingAreasTotal.price + vertical.surcharge + patio.price + roomWindowTotal + getRoomAddonsTotal().total;
      return Math.max(MIN_TOTAL, rawTotal);
    }
    
    // Standard clean first visit OR 'recurring-only' mode - use future visits pricing (with frequency discount)
    // This ensures Standard pricing + frequency discount is applied correctly
    const isDeepLevelStandard = false; // Standard = not deep
    const livingAreasTotalStandard = calculateLivingAreasTotal(
      formData.officeCount || 0,
      formData.laundryRoomCount || 0,
      formData.loftCount || 0,
      formData.garageCount || 0,
      isDeepLevelStandard
    );
    
    const componentResultStandard = calculateComponentPrice({
      homeSize: formData.homeSize,
      masterBaths: formData.masterBaths,
      fullBaths: formData.fullBaths,
      halfBaths: formData.halfBaths,
      serviceType: formData.serviceType, // Uses recurring frequency with discount
      conditionFee: formData.conditionFee,
      includeCabinets: false,
    });
    
    // Include room-based window totals for standard first visit
    const roomWindowTotalStandard = calculateRoomWindowTotal(formData.roomWindowSelections || []).totalPrice;
    const rawTotalStandard = componentResultStandard.finalPrice + livingAreasTotalStandard.price + vertical.surcharge + patio.price + roomWindowTotalStandard + getRoomAddonsTotal().total;
    return Math.max(MIN_TOTAL, rawTotalStandard);
  }, [isRecurringService, formData.homeSize, formData.masterBaths, formData.fullBaths, formData.halfBaths, formData.baseServiceLevel, formData.serviceType, formData.conditionFee, formData.officeCount, formData.laundryRoomCount, formData.loftCount, formData.garageCount, formData.propertyType, formData.houseLevels, formData.apartmentFloor, formData.hasElevator, formData.patioCount, formData.patioScope, formData.roomWindowSelections, recurringStartMode, getRoomAddonsTotal, calculateTotal]);

  // Get Future Visits price for recurring services
  // Always uses the recurring frequency rate (with discount applied)
  const getFutureVisitsPrice = useCallback(() => {
    if (!isRecurringService()) {
      return null;
    }
    
    // Calculate Vertical Surcharge and Patio (consistent across all modes)
    const vertical = calculateVerticalSurcharge({
      propertyType: formData.propertyType,
      houseLevels: formData.houseLevels || 1,
      apartmentFloor: formData.apartmentFloor || 1,
      hasElevator: formData.hasElevator !== false,
    });
    
    const patio = calculatePatioTotal(
      formData.patioCount || 0,
      formData.patioScope || 'sweep'
    );
    
    // IMPORTANT: Future recurring visits are ALWAYS Standard/Maintenance level pricing
    // Even if first visit is a "Deep Reset", future visits use maintenance rates
    const isDeepLevel = false;
    const livingAreasTotal = calculateLivingAreasTotal(
      formData.officeCount || 0,
      formData.laundryRoomCount || 0,
      formData.loftCount || 0,
      formData.garageCount || 0,
      isDeepLevel
    );
    
    // Future visits always use the recurring serviceType (with frequency discount)
    // and Standard Clean rates (not Deep Clean rates)
    const componentResult = calculateComponentPrice({
      homeSize: formData.homeSize,
      masterBaths: formData.masterBaths,
      fullBaths: formData.fullBaths,
      halfBaths: formData.halfBaths,
      serviceType: formData.serviceType, // Uses Weekly/Bi-Weekly/Monthly rates with Standard pricing
      conditionFee: formData.conditionFee,
      includeCabinets: false,
    });
    
    // Include room-based window totals for future visits
    const roomWindowTotal = calculateRoomWindowTotal(formData.roomWindowSelections || []).totalPrice;
    const rawTotal = componentResult.finalPrice + livingAreasTotal.price + vertical.surcharge + patio.price + roomWindowTotal + getRoomAddonsTotal().total;
    return Math.max(MIN_TOTAL, rawTotal);
  }, [isRecurringService, formData, getRoomAddonsTotal]);

  const calculateCustomTotal = useCallback(() => {
    // PRIORITY: Hourly mode bypasses zone-based pricing
    if (formData.isHourlyMode) {
      return calculateHourlyTotal();
    }

    let total = 0;
    
    if (customZones.bathroom) {
      total += customCounts.masterBaths * 80;
      total += customCounts.fullBaths * 70;
      total += customCounts.halfBaths * 50;
    }
    
    if (customZones.kitchen) {
      total += 165;
    }
    
    if (customZones.living) {
      total += 110;
    }
    
    if (customZones.bedroom) {
      total += Math.max(120, customCounts.bedroomCount * 40);
    }
    
    total += getRoomAddonsTotal().total;
    
    // Add micro-services total
    const microTotal = getMicroServicesTotal();
    total += microTotal.total;
    
    // Apply $165 minimum only if there are area services selected
    // Micro-services-only bookings use $120 minimum (handled in getMicroServicesTotal)
    if (hasAreaZones()) {
      return Math.max(165, total);
    }
    
    // For micro-services-only, the $120 minimum is already applied in getMicroServicesTotal
    return total;
  }, [customZones, customCounts, getRoomAddonsTotal, getMicroServicesTotal, hasAreaZones, formData.isHourlyMode, calculateHourlyTotal]);

  return (
    <BookingContext.Provider
      value={{
        language,
        setLanguage,
        industry,
        setIndustry,
        mode,
        setMode,
        situation,
        setSituation,
        moveContext,
        setMoveContext,
        currentStep,
        setCurrentStep,
        formData,
        updateFormData,
        customZones,
        setCustomZones,
        customCounts,
        setCustomCounts,
        selectedAddons,
        toggleAddon,
        updateAddonQuantity,
        // Per-room addon handlers
        toggleRoomAddon,
        updateRoomAddonQuantity,
        getRoomAddonsTotal,
        // User exclusion handler (Cognitive Mapping)
        toggleUserExclusion,
        // Area-specific hazards & waste handlers (Deep/Move flows)
        updateRoomMessTypes,
        updateRoomTrashBags,
        updateRoomStickySpills,
        showWindowStep,
        setShowWindowStep,
        recurringStartMode,
        setRecurringStartMode,
        // HARD GATE: Services revealed flag
        servicesRevealed,
        setServicesRevealed,
        // Moving add-ons applied flag
        movingAddonsApplied,
        setMovingAddonsApplied,
        // Micro-services
        selectedMicroServices,
        toggleMicroService,
        updateMicroServiceQuantity,
        getMicroServicesTotal,
        hasMicroServicesOnly,
        getMicroServiceLinePrice,
        calculateTotal,
        calculateCustomTotal,
        calculateHourlyTotal,
        getHourlyRate,
        getAddonTotal,
        isRecurringService,
        getRawTotal,
        getRawCustomTotal,
        getFirstVisitPrice,
        getFutureVisitsPrice,
        calculateRecommendedHours,
        // Area-specific condition fee handlers
        setAreaConditionEnabled,
        setGlobalConditionLevel,
        toggleAreaConditionSelection,
        clearAreaConditionSelections,
        MIN_TOTAL,
        MICRO_MIN: MICRO_SERVICES_MINIMUM,
        HOURLY_CONFIG,
        clearPersistedState,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
