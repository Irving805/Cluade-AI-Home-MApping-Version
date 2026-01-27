/**
 * Home Layout Model — Property Logistics Map SSOT
 * 
 * Provides a pure builder function that transforms formData + summary
 * into a visualization-ready HomeLayoutModel. VISUALIZATION ONLY.
 * 
 * SCOPE: Only for "I Live Here" (LIVE_HERE) and "I'm Moving" (MOVING) flows.
 * 
 * ARCHITECTURE:
 *   formData → HomeLogisticsResolver → HomeLayoutModel → (Map | Review | PDF)
 * 
 * All floor/label/access resolution MUST use HomeLogisticsResolver.
 */

import type { BookingFormData, Situation, HomeEntryConfig } from '@/contexts/BookingContext';
import type { BookingSummary } from '@/lib/summary/types';
import type { FloorId } from '@/lib/floorLocationTypes';
import { floorIdToNumber, getFloorLabel, numberToFloorId } from '@/lib/floorLocationTypes';
import { Language } from '@/lib/translations';
import { calculateBathroomUnit } from '@/lib/bathroomPricing';
import { calculateBathroomLogisticsTime } from '@/lib/bathroomLogisticsTime';
import { calculateAreaTotal } from '@/lib/homeMappingPricing';
import type { PricingTier } from '@/lib/pricingTier';
import { getStairHazardBuffer, getHallwayHazardBuffer } from '@/lib/pricing_v2';
import { getPropertySizeProfile, PropertySizeProfile } from './propertySizeProfile';

// SSOT Resolver imports
import {
  resolveBedroomFloorLevel,
  resolveBedroomLabel,
  resolveBathroomFloorLevel,
  resolveCoreRoomFloorLevel,
  resolveMappedAreaFloorLevel,
  resolveAccessPlan,
  resolveBathroomOpsNotes,
  resolveConnectorPresence,
  resolveMappingCompleteness,
  resolveOperationalNotes,
  type AccessPlan,
  type BathroomOpsNote,
  type MappingCompleteness,
  type OperationalNote,
  type FloorSource,
} from './homeLogisticsResolver';

// ============= TYPES =============

export type AreaType = 
  | 'bathroom' | 'bedroom' | 'kitchen' | 'living' | 'dining'
  | 'office' | 'laundry' | 'garage' | 'patio' | 'mudroom' | 'den'
  | 'studio_main' | 'hallway' | 'stairs' | 'connector';

export interface LayoutArea {
  id: string;
  type: AreaType;
  subType?: string;
  label: string;
  floorId: FloorId;
  // === TIME LEDGER FIELDS (PHASE 5) ===
  // Decomposed time for accurate Top Time Zones
  minutesBase: number;       // From CORE_ZONE_TIME or bedroom allocation
  minutesAddons: number;     // Room-specific addons
  minutesWindows: number;    // Room-specific windows/blinds
  minutesHazards: number;    // Room-specific hazards
  minutesCondition: number;  // Condition level impact
  minutesOps: number;        // Legacy ops (kept for compat, sum of addons+windows+hazards)
  minutesTotal: number;      // Sum of all above (or 0 if excluded)
  // Exclusion state (PHASE 5)
  isExcluded: boolean;       // True if in excludedSpaces
  excludeReason?: string;    // "Partial Empty" etc.
  // Existing fields
  complexityScore: number;
  tags: string[];
  deepLinkTarget?: string;
  isConnector?: boolean;
}

export interface LayoutFloor {
  floorId: FloorId;
  label: string;
  minutesTotal: number;
  percentOfTotal: number;
  areas: LayoutArea[];
}

/** Bathroom with floor grouping and ops notes */
export interface BathroomFloorGroup {
  floorId: FloorId;
  floorLabel: string;
  bathrooms: Array<{
    id: string;
    type: string;
    label: string;
    isEnsuite: boolean;
    opsNotes: BathroomOpsNote[];
  }>;
}

/** Kitchen operations data for Review + PDF */
export interface KitchenOperations {
  floorType: string | null;
  ceilingHeight: string | null;
  addons: string[];
  windowsInterior: number;
  windowsExterior: number;
  blindsCount: number;
  blindsType: 'standard' | 'shutters' | null;
  hasTracksIncluded: boolean;
  hazards: string[];
  trashBags: number;
  hasStickySpills: boolean;
  pullOutAppliances: boolean;
  requiresTwoPerson: boolean;
  // NEW: SSOT addon pricing details
  addonDetails: Array<{
    id: string;
    labelKey: string;  // SSOT: Translation key (not hardcoded English)
    price: number;
    minutes: number;
    sizeCategory?: string;  // Only for cabinets
    units?: number;  // Virtual units for upper cabinets
  }>;
  totalAddonPrice: number;
  totalAddonMinutes: number;
}

/** Studio operations data for Review + PDF (parallel to KitchenOperations) */
export interface StudioOperations {
  // Structure
  structureType: string;
  studioSize: string;
  floorType: string | null;
  
  // Sub-areas enabled
  subAreas: {
    sleeping: boolean;     // Always true for studio
    lounge: boolean;       // hasTvArea
    deskWork: boolean;     // hasDeskArea
    closet: boolean;       // hasCloset
    entryNook: boolean;    // hasEntryNook
    balconyDoor: boolean;  // hasBalconyDoor
  };
  
  // Windows (from inventory SSOT)
  windowsInterior: number;
  windowsExterior: number;
  blindsCount: number;
  blindsType: 'standard' | 'shutters' | null;
  
  // Hazards (read from GLOBAL SSOT keys where available)
  petHairRisk: boolean;
  stickySpills: boolean;   // From roomStickySpills['studio_main']
  dustLevel: 'light' | 'normal' | 'heavy';
  trashBags: number;       // From roomTrashBags['studio_main']
  hazards: string[];       // From roomMessTypes['studio_main']
  
  
  // Density/clutter
  furnitureDensity: string;
  clutterLevel: string;
}

/** Single hallway operation for Review + PDF (SSOT) */
export interface HallwayOperation {
  id: string;
  label: string;
  trackingCode: string;      // "HW-001"
  sizeTier: string;          // SMALL | MEDIUM | LARGE
  sizeRange: string;         // "12-24 ft"
  floorId: FloorId;
  floorType: string | null;
  
  // Cabinet pricing fields (SSOT)
  cabinetDoorCount: number;   // 0-4 doors
  cabinetsEmpty: boolean;
  cabinetFeePerDoor: number;  // 0 / 10 / 15
  cabinetDetailFee: number;   // cabinetDoorCount × feePerDoor
  
  // Organization (LIVE_HERE only)
  organizationHours: number;
  orgCost: number;            // hours × 35
  
  // Total for this hallway (cabinets + org + windows + blinds)
  hallwayTotalFee: number;    // cabinetDetailFee + orgCost + hallwayWindowsFee + hallwayBlindsFee
  
  // Connection mapping — RAW IDs ONLY (SSOT)
  connectsTo: string[];      // ['bedrooms', 'bathrooms'] — formatting at render
  
  // Hazards
  hazards: string[];
  hazardMinutes: number;
  
  // Windows (from inventory) - counts
  windowsInterior: number;
  windowsExterior: number;
  blindsCount: number;
  
  // Windows/Blinds FEES (SSOT from central helper)
  hallwayWindowsFee: number;
  hallwayBlindsFee: number;
  
  // Legacy compat (will be removed)
  cabinetCount: number;
  hasCabinetFee: boolean;
  cabinetFeeAmount: number;
}

/** Single stair operation for Review + PDF (SSOT) */
export interface StairOperation {
  id: string;                    // STABLE: matches StairConfig.id
  label: string;
  fromFloor: FloorId;
  toFloor: FloorId;
  surfaceType: string;
  stepCount: number;
  minutesBase: number;
  hazardMinutes: number;
  totalMinutes: number;
  hazardLabels: string[];
}

/** All stair operations */
export interface StairOperations {
  stairs: StairOperation[];
  totalCount: number;
  totalMinutes: number;
  totalHazardMinutes: number;
}

/** All hallway operations */
export interface HallwayOperations {
  hallways: HallwayOperation[];
  totalCount: number;
  totalCabinetFees: number;   // Sum of cabinetDetailFee
  totalOrgCosts: number;      // Sum of orgCost
  totalWindowFees: number;    // Sum of hallwayWindowsFee (SSOT)
  totalBlindsFees: number;    // Sum of hallwayBlindsFee (SSOT)
  totalFees: number;          // totalCabinetFees + totalOrgCosts + totalWindowFees + totalBlindsFees
  totalHazardMinutes: number;
}

export interface HomeLayoutModel {
  floors: LayoutFloor[];
  totalMinutes: number;
  opsExtraMinutesTotal: number;
  topTimeZones: LayoutArea[];
  hasMultiFloor: boolean;
  allAreasCount: number;
  isDistributionEstimated: boolean;
  validation: { matchesSidebar: boolean; deviation: number; deviationPercent: number };
  
  /** Fingerprint used to build this model (for QA validation) */
  fingerprint?: string;
  
  /** Property size profile for UI display */
  profile: {
    bedroomCount: number;
    sqftLabel: string | null;
    isStudio: boolean;
  };
  
  // ============= EXTENDED OPERATIONAL FIELDS =============
  
  /** Access & Entry Plan (for Review + PDF) */
  accessPlan: AccessPlan;
  
  /** Bathrooms grouped by floor with ops notes (for Crew PDF) */
  bathroomsByFloor: BathroomFloorGroup[];
  
  /** Operational notes for crew (hazards, special access, etc.) */
  operationalNotes: OperationalNote[];
  
  /** Mapping completeness for validation display */
  mappingCompleteness: MappingCompleteness;
  
  /** Kitchen operations data for Review + PDF */
  kitchenOperations?: KitchenOperations;
  
  /** Studio operations data for Review + PDF (SSOT) */
  studioOperations?: StudioOperations;
  
  /** Hallway operations data for Review + PDF (SSOT) */
  hallwayOperations?: HallwayOperations;
  
  /** Stair operations data for Review + PDF (SSOT) */
  stairOperations?: StairOperations;
  
  /** Debug metadata (DEV only) */
  debugMeta?: {
    profileDetails: {
      baseCoreZonesCount: number;
      showDining: boolean;
      canHaveHallways: boolean;
      canHaveStairs: boolean;
    };
    structureFloorCount: number;
    summaryMinutes: number;
    utilityAreasEnabled: string[];
    /** Bedroom SSOT resolution debug info */
    bedrooms: {
      expectedCount: number;
      resolvedFloors: Array<{ id: string; floor: number; source: FloorSource }>;
    };
  };
}

// ============= CORE ROOM TIME ALLOCATION =============

const CORE_ROOM_ALLOCATION = {
  std: { kitchen: 45, living: 30, dining: 20, masterBedroom: 35, standardBedroom: 25, studioMain: 60 },
  deep: { kitchen: 75, living: 50, dining: 35, masterBedroom: 45, standardBedroom: 35, studioMain: 100 },
} as const;

// ============= HELPERS =============

function calculateComplexityScore(base: number, ops: number): number {
  if (base === 0 && ops === 0) return 0;
  const total = base + ops;
  return Math.round(Math.min(50, total / 2) + Math.min(50, (ops / total) * 100));
}

function getBathroomTags(logistics: any): string[] {
  if (!logistics) return [];
  const tags: string[] = [];
  if (logistics.toiletScale && logistics.toiletScale !== 'none') tags.push(`Toilet: ${logistics.toiletScale}`);
  if (logistics.tubScale && logistics.tubScale !== 'none') tags.push(`Tub: ${logistics.tubScale}`);
  if (logistics.showerDoorScale && logistics.showerDoorScale !== 'none') tags.push(`Glass: ${logistics.showerDoorScale}`);
  return tags;
}

/**
 * PHASE 5: Create default time ledger fields for LayoutArea
 * Used when we don't have detailed breakdown (estimated areas)
 */
function createDefaultTimeLedger(minutesBase: number, minutesOps: number = 0): {
  minutesAddons: number;
  minutesWindows: number;
  minutesHazards: number;
  minutesCondition: number;
  isExcluded: boolean;
} {
  return {
    minutesAddons: 0,
    minutesWindows: 0,
    minutesHazards: minutesOps,  // Legacy: ops is typically hazards
    minutesCondition: 0,
    isExcluded: false,
  };
}

// ============= BEDROOM SSOT RESOLVERS =============
// NOTE: Resolvers now imported from homeLogisticsResolver.ts (SSOT)

// ============= EXTRACTION FUNCTIONS =============

function extractBathroomAreas(formData: BookingFormData, tier: PricingTier, language: Language): LayoutArea[] {
  const areas: LayoutArea[] = [];
  const bathrooms = formData.bathroomInventory?.bathrooms || [];
  
  bathrooms.forEach((unit, index) => {
    const pricingResult = calculateBathroomUnit(unit, tier);
    const logisticsTime = calculateBathroomLogisticsTime(unit.logistics);
    
    areas.push({
      id: `bath_${unit.type}_${index}`,
      type: 'bathroom',
      subType: unit.type,
      label: `${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)} Bath`,
      floorId: unit.floorId || 'FLOOR_1',
      minutesBase: pricingResult.timeMinutes,
      minutesOps: logisticsTime,
      minutesTotal: pricingResult.timeMinutes + logisticsTime,
      ...createDefaultTimeLedger(pricingResult.timeMinutes, logisticsTime),
      complexityScore: calculateComplexityScore(pricingResult.timeMinutes, logisticsTime),
      tags: getBathroomTags(unit.logistics),
      deepLinkTarget: unit.id,
    });
  });
  
  return areas;
}

function extractMappedAreas(formData: BookingFormData, isDeep: boolean): LayoutArea[] {
  const areas: LayoutArea[] = [];
  const mappedAreas = formData.homeMapping?.areas;
  if (!mappedAreas) return areas;
  
  const configs = [
    { key: 'office', label: 'Office', config: mappedAreas.office },
    { key: 'laundry', label: 'Laundry', config: mappedAreas.laundry },
    { key: 'garage', label: 'Garage', config: mappedAreas.garage },
    { key: 'patio', label: 'Patio', config: mappedAreas.patio },
    { key: 'mudroom', label: 'Mudroom', config: mappedAreas.mudroom },
    { key: 'den', label: 'Den', config: mappedAreas.den },
  ];
  
  for (const { key, label, config } of configs) {
    if (!config?.enabled) continue;
    const result = calculateAreaTotal(key as any, config, isDeep);
    if (result.timeMinutes === 0) continue;
    
    const floorLevel = (config as any).floor?.floorLevel;
    areas.push({
      id: key, type: key as AreaType, label,
      floorId: floorLevel ? numberToFloorId(floorLevel) : 'FLOOR_1',
      minutesBase: result.timeMinutes, minutesOps: 0, minutesTotal: result.timeMinutes,
      ...createDefaultTimeLedger(result.timeMinutes, 0),
      complexityScore: calculateComplexityScore(result.timeMinutes, 0),
      tags: [], deepLinkTarget: key,
    });
  }
  
  return areas;
}

/**
 * Extract core room areas based on PropertySizeProfile
 * This ensures only zones that should exist are created
 */
function extractCoreRoomAreas(
  formData: BookingFormData, 
  isDeep: boolean,
  profile: PropertySizeProfile
): { areas: LayoutArea[]; isEstimated: boolean; bedroomDebugInfo: Array<{ id: string; floor: number; source: FloorSource }> } {
  const areas: LayoutArea[] = [];
  const alloc = CORE_ROOM_ALLOCATION[isDeep ? 'deep' : 'std'];
  
  // STUDIO: Single combined zone
  if (profile.isStudio) {
    const studioMinutes = alloc.studioMain;
    areas.push({
      id: 'studio_main',
      type: 'studio_main',
      label: 'Studio Main Space',
      floorId: 'FLOOR_1',
      minutesBase: studioMinutes,
      minutesOps: 0,
      minutesTotal: studioMinutes,
      ...createDefaultTimeLedger(studioMinutes, 0),
      complexityScore: calculateComplexityScore(studioMinutes, 0),
      tags: ['estimated'],
      deepLinkTarget: 'studio_main',
    });
    return { areas, isEstimated: true, bedroomDebugInfo: [] };
  }
  
  // NON-STUDIO: Only create zones that exist per profile
  const coreRoomConfigs: { key: 'kitchen' | 'living' | 'dining'; label: string; minutes: number }[] = [
    { key: 'kitchen', label: 'Kitchen', minutes: alloc.kitchen },
    { key: 'living', label: 'Living Room', minutes: alloc.living },
  ];
  
  // Only add dining if profile says it should exist (2+ bedrooms)
  if (profile.showDining) {
    coreRoomConfigs.push({ key: 'dining', label: 'Dining Room', minutes: alloc.dining });
  }
  
  for (const room of coreRoomConfigs) {
    const floorLevel = (formData.roomFloorLocations as any)?.[room.key];
    areas.push({
      id: room.key, 
      type: room.key as AreaType, 
      label: room.label,
      floorId: typeof floorLevel === 'number' ? numberToFloorId(floorLevel) : 'FLOOR_1',
      minutesBase: room.minutes, 
      minutesOps: 0, 
      minutesTotal: room.minutes,
      ...createDefaultTimeLedger(room.minutes, 0),
      complexityScore: calculateComplexityScore(room.minutes, 0),
      tags: ['estimated'], 
      deepLinkTarget: room.key,
    });
  }
  
  // BEDROOMS: Only create count matching profile, using SSOT resolver for floor
  const bedroomDebugInfo: Array<{ id: string; floor: number; source: FloorSource }> = [];
  
  for (let i = 0; i < profile.bedroomCount; i++) {
    const isMaster = i === 0;
    const mins = isMaster ? alloc.masterBedroom : alloc.standardBedroom;
    const bedKey = `bed_${i}`;
    
    // USE SSOT RESOLVER (reads from roomFloorLocations.bedrooms first)
    const resolved = resolveBedroomFloorLevel(formData, i);
    const label = resolveBedroomLabel(i, profile.bedroomCount);
    
    bedroomDebugInfo.push({ id: bedKey, floor: resolved.floor, source: resolved.source });
    
    areas.push({
      id: bedKey, 
      type: 'bedroom', 
      subType: isMaster ? 'master' : 'standard',
      label: label,  // Uses smart label resolver (no "Master" confusion)
      floorId: numberToFloorId(resolved.floor),  // Uses SSOT resolver
      minutesBase: mins, 
      minutesOps: 0, 
      minutesTotal: mins,
      ...createDefaultTimeLedger(mins, 0),
      complexityScore: calculateComplexityScore(mins, 0), 
      tags: ['estimated'], 
      deepLinkTarget: bedKey,
    });
  }
  
  return { areas, isEstimated: true, bedroomDebugInfo };
}

/**
 * Extract connector areas (hallways, stairs) based on PropertySizeProfile
 */
function extractConnectorAreas(formData: BookingFormData, profile: PropertySizeProfile): LayoutArea[] {
  const areas: LayoutArea[] = [];
  
  // Get SSOT hazard buffers
  const hallwayHazardOps = getHallwayHazardBuffer(formData.hallwaysConfig);
  // SSOT: Stair hazard ops are calculated inline per-stair from formData.stairs[]
  
  // HALLWAYS: Only if property can have them per profile
  if (profile.canHaveHallways) {
    const hallways = formData.hallways || [];
    const perHallwayOps = hallways.length > 0 ? Math.round(hallwayHazardOps / hallways.length) : 0;
    
    hallways.forEach((hw, i) => {
      const sizeTimes: Record<string, number> = { SMALL: 8, MEDIUM: 12, LARGE: 18 };
      const mins = sizeTimes[hw.sizeTier] || 10;
      const opsMinutes = perHallwayOps;
      areas.push({
        id: `hallway_${i}`, type: 'hallway', label: hw.label || `Hallway ${i + 1}`,
        floorId: hw.floorLevel ? numberToFloorId(hw.floorLevel) : 'FLOOR_1',
        minutesBase: mins, minutesOps: opsMinutes, minutesTotal: mins + opsMinutes,
        ...createDefaultTimeLedger(mins, opsMinutes),
        complexityScore: calculateComplexityScore(mins, opsMinutes), 
        tags: opsMinutes > 0 ? ['hazard'] : [],
        deepLinkTarget: `hallway_${i}`, isConnector: true,
      });
    });
  }
  
  // STAIRS: Multi-entity from formData.stairs[] (SSOT)
  const stairsArray = formData.stairs || [];
  if (profile.canHaveStairs && stairsArray.length > 0) {
    stairsArray.forEach((stair) => {
      const steps = stair.stepCount || 14;
      const mins = Math.ceil(steps * 0.8);
      // Calculate hazard ops inline
      let hazardOps = 0;
      if (stair.cornerBuildup) hazardOps += 12;
      if (stair.petHairAccumulation) hazardOps += 10;
      if (stair.slipHazards) hazardOps += 5;
      if (stair.railingsDetail) hazardOps += 18;
      
      areas.push({
        id: stair.id,  // STABLE ID (not 'stairs')
        type: 'stairs',
        label: `${stair.label}: F${stair.fromFloor} → F${stair.toFloor}`,
        floorId: numberToFloorId(stair.fromFloor),  // Groups by "from" floor
        minutesBase: mins, 
        minutesOps: hazardOps, 
        minutesTotal: mins + hazardOps,
        ...createDefaultTimeLedger(mins, hazardOps),
        complexityScore: calculateComplexityScore(mins, hazardOps), 
        tags: hazardOps > 0 ? ['hazard'] : [],
        deepLinkTarget: stair.id, 
        isConnector: true,
      });
    });
  }
  
  // ELEVATOR tag for apartments with elevator access
  const ctx = profile.context;
  if (ctx.category === 'APARTMENT_CONDO' && ctx.hasElevator) {
    areas.push({
      id: 'elevator_access',
      type: 'connector',
      label: 'Elevator Access',
      floorId: 'FLOOR_1',
      minutesBase: 0, minutesOps: 0, minutesTotal: 0,
      ...createDefaultTimeLedger(0, 0),
      complexityScore: 0,
      tags: ['elevator'],
      deepLinkTarget: 'home_entry',
      isConnector: true,
    });
  }
  
  return areas;
}

// ============= MAIN BUILDER =============

export function buildHomeLayoutModel(
  formData: BookingFormData,
  summary: BookingSummary | null | undefined,
  situation: Situation,
  language: Language,
  homeEntry?: HomeEntryConfig,
  fingerprint?: string
): HomeLayoutModel | null {
  // Robust data presence check (homeSize=0 is VALID = Studio)
  const hasBathrooms = (formData.bathroomInventory?.bathrooms?.length ?? 0) > 0;
  const hasMappedAreas = Object.values(formData.homeMapping?.areas || {}).some(a => a?.enabled);
  const hasBedrooms = Array.isArray(formData.bedroomConfigs) && formData.bedroomConfigs.length > 0;
  const hasRoomFloors = !!formData.roomFloorLocations && Object.keys(formData.roomFloorLocations).length > 0;
  const hasHomeSize = formData.homeSize !== null && formData.homeSize !== undefined;

  // Only return null if we truly have NO data signals at all
  if (!hasBathrooms && !hasMappedAreas && !hasBedrooms && !hasRoomFloors && !hasHomeSize) {
    return null;
  }

  const isDeep = formData.serviceType === 'deep' || situation === 'MOVING';
  const tier: PricingTier = 'std';
  
  // NEW: Compute PropertySizeProfile from SSOT
  const profile = getPropertySizeProfile(formData, homeEntry);
  
  // Pass profile to extractCoreRoomAreas
  const coreResult = extractCoreRoomAreas(formData, isDeep, profile);
  
  const allAreas = [
    ...extractBathroomAreas(formData, tier, language),
    ...extractMappedAreas(formData, isDeep),
    ...coreResult.areas,
    ...extractConnectorAreas(formData, profile),
  ];
  
  // === PHASE 5: Mark excluded areas for MOVING flow ===
  // This ensures Top Time Zones correctly excludes areas in Partial Empty mode
  const excludedSpaces = formData.excludedSpaces || [];
  const hallwaysEnabled = (formData as any).hallwaysEnabled !== false;
  const stairsEnabled = (formData as any).stairsEnabled !== false;
  const isMovingFlow = situation === 'MOVING';
  
  allAreas.forEach(area => {
    if (!isMovingFlow) return;  // Only apply exclusions in MOVING flow
    
    // Core zone exclusions (kitchen, living, dining)
    if (excludedSpaces.includes(area.id)) {
      area.isExcluded = true;
      area.excludeReason = 'Partial Empty';
      area.minutesTotal = 0;  // Zero out for ranking
    }
    
    // Hallway exclusions
    if (area.type === 'hallway' && !hallwaysEnabled) {
      area.isExcluded = true;
      area.excludeReason = 'Partial Empty';
      area.minutesTotal = 0;
    }
    
    // Stair exclusions
    if (area.type === 'stairs' && !stairsEnabled) {
      area.isExcluded = true;
      area.excludeReason = 'Partial Empty';
      area.minutesTotal = 0;
    }
  });
  
  // Group by floor
  const floorMap = new Map<FloorId, LayoutArea[]>();
  allAreas.forEach(a => floorMap.set(a.floorId, [...(floorMap.get(a.floorId) || []), a]));
  
  // Total minutes (excluding zeroed-out areas)
  const totalMinutes = allAreas.reduce((s, a) => s + a.minutesTotal, 0);
  const opsExtraMinutesTotal = allAreas.reduce((s, a) => s + a.minutesOps, 0);
  
  // Ensure floor stack reflects structure intent (even if all areas on FLOOR_1)
  const structureFloorCount = profile.context.levels;
  const existingFloorIds = Array.from(floorMap.keys());
  
  // Add empty floors if structure says we have more floors
  for (let i = 1; i <= structureFloorCount; i++) {
    const floorId = numberToFloorId(i);
    if (!floorMap.has(floorId)) {
      floorMap.set(floorId, []);
    }
  }
  
  const floors: LayoutFloor[] = Array.from(floorMap.entries())
    .sort((a, b) => floorIdToNumber(a[0]) - floorIdToNumber(b[0]))
    .map(([floorId, areas]) => ({
      floorId, label: getFloorLabel(floorId, language),
      minutesTotal: areas.reduce((s, a) => s + a.minutesTotal, 0),
      percentOfTotal: totalMinutes > 0 ? Math.round((areas.reduce((s, a) => s + a.minutesTotal, 0) / totalMinutes) * 100) : 0,
      areas: areas.sort((a, b) => b.minutesTotal - a.minutesTotal),
    }));
  
  // PHASE 5: Top Time Zones - filter out connectors AND excluded areas, sort by total
  const topTimeZones = [...allAreas]
    .filter(a => !a.isConnector && !a.isExcluded)
    .sort((a, b) => b.minutesTotal - a.minutesTotal)
    .slice(0, 3);
  const summaryMinutes = summary?.timeMetrics 
    ? Math.round(summary.timeMetrics.estimateMin * 60) 
    : 0;
  
  const deviation = Math.abs(totalMinutes - summaryMinutes);
  const deviationPercent = summaryMinutes > 0 
    ? Math.round((deviation / summaryMinutes) * 100)
    : 0;
  
  // ============= EXTENDED OPERATIONAL FIELDS (using SSOT resolvers) =============
  
  // Access Plan from SSOT resolver
  const accessPlan = resolveAccessPlan(formData, homeEntry);
  
  // Bathrooms grouped by floor with ops notes
  const bathroomsByFloor = buildBathroomsByFloor(formData, floors, language);
  
  // Operational notes from SSOT resolver
  const operationalNotes = resolveOperationalNotes(formData, situation);
  
  // Mapping completeness from SSOT resolver
  const mappingCompleteness = resolveMappingCompleteness(formData, profile.bedroomCount);
  
  // Debug metadata for development validation
  const debugMeta = {
    profileDetails: {
      baseCoreZonesCount: profile.baseCoreZones.length,
      showDining: profile.showDining,
      canHaveHallways: profile.canHaveHallways,
      canHaveStairs: profile.canHaveStairs,
    },
    structureFloorCount,
    summaryMinutes,
    utilityAreasEnabled: Object.entries(formData.homeMapping?.areas || {})
      .filter(([_, config]) => config?.enabled)
      .map(([key]) => key),
    bedrooms: {
      expectedCount: profile.bedroomCount,
      resolvedFloors: coreResult.bedroomDebugInfo,
    },
  };
  
  return {
    floors, 
    totalMinutes, 
    opsExtraMinutesTotal, 
    topTimeZones,
    hasMultiFloor: floors.length > 1,
    allAreasCount: allAreas.length,
    isDistributionEstimated: coreResult.isEstimated,
    validation: { 
      matchesSidebar: deviation <= 30 && deviationPercent <= 3, 
      deviation, 
      deviationPercent 
    },
    profile: {
      bedroomCount: profile.bedroomCount,
      sqftLabel: profile.sqftLabel,
      isStudio: profile.isStudio,
    },
    // Extended operational fields
    accessPlan,
    bathroomsByFloor,
    operationalNotes,
    mappingCompleteness,
    // Kitchen operations
    kitchenOperations: buildKitchenOperations(formData),
    // Studio operations (SSOT - only for studios)
    studioOperations: profile.isStudio ? buildStudioOperations(formData) : undefined,
    // Hallway operations (SSOT)
    hallwayOperations: buildHallwayOperations(formData, situation),
    // Stair operations (SSOT)
    stairOperations: buildStairsOperations(formData),
    debugMeta,
    fingerprint,
  };
}

// ============= HELPER: Build Kitchen Operations =============

import { calculateKitchenAddonsTotal } from '@/lib/pricing_kitchen';
import { getKitchenSectionToggles } from '@/lib/kitchenSectionToggles';

function buildKitchenOperations(formData: BookingFormData): KitchenOperations | undefined {
  // SSOT: Get kitchen section toggles
  const sectionToggles = getKitchenSectionToggles(formData);
  
  // Extract kitchen-specific data from formData (gated by toggles)
  const floorType = (formData as any).spaceFloorTypes?.kitchen || null;
  const ceilingHeight = (formData as any).ceilingHeights?.kitchen || null;
  
  // SSOT: Gate addons by toggle
  const kitchenRoomAddons = sectionToggles.insideAppliances 
    ? ((formData as any).roomAddons?.kitchen || [])
    : [];
  const addons = kitchenRoomAddons.map((a: any) => a.addonId || a);
  
  // SSOT: Gate windows by toggle
  const windowSelection = sectionToggles.windowInventory
    ? ((formData as any).roomWindowSelections || []).find((w: any) => w.roomId === 'kitchen')
    : undefined;
  
  // Calculate windows from inventory with proper glass mode logic (SSOT)
  const inventory = windowSelection?.windowInventory || [];
  let windowsInterior = 0;
  let windowsExterior = 0;
  
  inventory.forEach((item: { glassMode: string | null; quantity: number }) => {
    if (item.glassMode === 'interior') {
      windowsInterior += item.quantity;
    } else if (item.glassMode === 'exterior') {
      windowsExterior += item.quantity;
    } else if (item.glassMode === 'both') {
      // Both sides = count toward both interior AND exterior
      windowsInterior += item.quantity;
      windowsExterior += item.quantity;
    }
  });
  
  // Blinds are separate from windows
  const blindsCount = windowSelection?.blindsCount || 0;
  const blindsType = windowSelection?.blindsType || null;
  
  const hazards = (formData as any).roomMessTypes?.kitchen || [];
  const trashBags = (formData as any).roomTrashBags?.kitchen || 0;
  const hasStickySpills = (formData as any).roomStickySpills?.kitchen || false;
  const pullOutAppliances = (formData as any).pullOutAppliances || false;
  
  // NEW: Calculate addon pricing using SSOT helper with ALL 7 params
  const bedrooms = formData.homeSize || 2;
  const propertyType = formData.propertyType;
  const sqftRange = formData.squareFootageRange;
  const cabinetOverride = (formData as any).kitchenCabinetOverride || 'typical';
  const degreaseLevel = (formData as any).kitchenDegreaseLevel;
  const cabinetComplexity = (formData as any).kitchenCabinetComplexity || 'standard';
  
  const addonPricingResult = calculateKitchenAddonsTotal(
    kitchenRoomAddons, 
    bedrooms, 
    propertyType,
    sqftRange,
    cabinetOverride,
    degreaseLevel,
    cabinetComplexity
  );
  
  // Only return if we have meaningful data
  if (!floorType && !ceilingHeight && addons.length === 0 && hazards.length === 0 && !pullOutAppliances && inventory.length === 0) {
    return undefined;
  }
  
  return {
    floorType,
    ceilingHeight,
    addons,
    windowsInterior,
    windowsExterior,
    blindsCount,
    blindsType,
    hasTracksIncluded: true, // Always included per design
    hazards,
    trashBags,
    hasStickySpills,
    pullOutAppliances,
    requiresTwoPerson: pullOutAppliances,
    // NEW: SSOT addon pricing
    addonDetails: addonPricingResult.details,
    totalAddonPrice: addonPricingResult.totalPrice,
    totalAddonMinutes: addonPricingResult.totalMinutes,
  };
}

// ============= HELPER: Build Studio Operations =============

function buildStudioOperations(formData: BookingFormData): StudioOperations | undefined {
  const studioConfig = formData.homeMapping?.areas?.studioMainSpace;
  if (!studioConfig?.enabled) return undefined;
  
  // Windows: Read from SSOT inventory (not config.windowCount!)
  const windowSelection = ((formData as any).roomWindowSelections || []).find(
    (w: any) => w.roomId === 'studio_main'
  );
  const inventory = windowSelection?.windowInventory || [];
  
  let windowsInterior = 0;
  let windowsExterior = 0;
  
  inventory.forEach((item: { glassMode: string | null; quantity: number }) => {
    if (item.glassMode === 'interior') {
      windowsInterior += item.quantity;
    } else if (item.glassMode === 'exterior') {
      windowsExterior += item.quantity;
    } else if (item.glassMode === 'both') {
      windowsInterior += item.quantity;
      windowsExterior += item.quantity;
    }
  });
  
  // Blinds: Read from RoomWindowSelection (SSOT)
  const blindsCount = windowSelection?.blindsCount || 0;
  const blindsType = windowSelection?.blindsType || null;
  
  // Hazards: Read from GLOBAL SSOT keys (not from StudioMainSpaceConfig!)
  const hazards = (formData as any).roomMessTypes?.studio_main || [];
  const trashBags = (formData as any).roomTrashBags?.studio_main || 0;
  const stickySpills = (formData as any).roomStickySpills?.studio_main || false;
  
  return {
    structureType: studioConfig.structureType,
    studioSize: studioConfig.studioSize,
    floorType: studioConfig.floorType || null,
    subAreas: {
      sleeping: true,  // Always true for studio
      lounge: studioConfig.hasTvArea,
      deskWork: studioConfig.hasDeskArea,
      closet: studioConfig.hasCloset,
      entryNook: studioConfig.hasEntryNook ?? false,
      balconyDoor: studioConfig.hasBalconyDoor,
    },
    windowsInterior,
    windowsExterior,
    blindsCount,
    blindsType,
    petHairRisk: studioConfig.petHairRisk,
    stickySpills,   // From global SSOT
    dustLevel: studioConfig.dustLevel || 'normal',
    trashBags,      // From global SSOT
    hazards,        // From global SSOT
    
    furnitureDensity: studioConfig.furnitureDensity,
    clutterLevel: studioConfig.clutterLevel,
  };
}

// ============= HELPER: Build Bathrooms by Floor =============

function buildBathroomsByFloor(
  formData: BookingFormData,
  floors: LayoutFloor[],
  language: Language
): BathroomFloorGroup[] {
  const bathrooms = formData.bathroomInventory?.bathrooms || [];
  if (bathrooms.length === 0) return [];
  
  // Group bathrooms by floorId
  const byFloor = new Map<FloorId, typeof bathrooms>();
  bathrooms.forEach(bath => {
    const floorId = bath.floorId || 'FLOOR_1';
    if (!byFloor.has(floorId)) {
      byFloor.set(floorId, []);
    }
    byFloor.get(floorId)!.push(bath);
  });
  
  // Build floor groups
  const result: BathroomFloorGroup[] = [];
  
  byFloor.forEach((baths, floorId) => {
    result.push({
      floorId,
      floorLabel: getFloorLabel(floorId, language),
      bathrooms: baths.map(bath => ({
        id: bath.id,
        type: bath.type,
        label: `${bath.type.charAt(0).toUpperCase() + bath.type.slice(1)} Bath`,
        isEnsuite: bath.isEnsuite,
        opsNotes: resolveBathroomOpsNotes(bath.logistics),
      })),
    });
  });
  
  // Sort by floor order
  result.sort((a, b) => floorIdToNumber(a.floorId) - floorIdToNumber(b.floorId));
  
  return result;
}

// ============= HELPER: Build Stair Operations (SSOT) =============

function buildStairsOperations(formData: BookingFormData): StairOperations | undefined {
  const stairs = formData.stairs || [];
  if (stairs.length === 0) return undefined;

  const operations: StairOperation[] = stairs.map((stair) => {
    const baseMin = Math.ceil(stair.stepCount * 0.8);
    let hazardMin = 0;
    const hazardLabels: string[] = [];
    
    if (stair.cornerBuildup) { hazardMin += 12; hazardLabels.push('Corner Buildup'); }
    if (stair.petHairAccumulation) { hazardMin += 10; hazardLabels.push('Pet Hair'); }
    if (stair.slipHazards) { hazardMin += 5; hazardLabels.push('Slip Hazards'); }
    if (stair.railingsDetail) { hazardMin += 18; hazardLabels.push('Intricate Railings'); }

    return {
      id: stair.id,
      label: stair.label,
      fromFloor: numberToFloorId(stair.fromFloor),
      toFloor: numberToFloorId(stair.toFloor),
      surfaceType: stair.surfaceType,
      stepCount: stair.stepCount,
      minutesBase: baseMin,
      hazardMinutes: hazardMin,
      totalMinutes: baseMin + hazardMin,
      hazardLabels,
    };
  });

  return {
    stairs: operations,
    totalCount: operations.length,
    totalMinutes: operations.reduce((s, o) => s + o.totalMinutes, 0),
    totalHazardMinutes: operations.reduce((s, o) => s + o.hazardMinutes, 0),
  };
}

// ============= HELPER: Build Hallway Operations (SSOT) =============

import { HALLWAY_SIZE_INFO, HALLWAY_RATES, calculateHallwayCabinetFee } from '@/lib/pricing_hallways';
import { getAreaTrackingCode } from '@/lib/homeStructureIds';
import { isDeepCleanLevel } from '@/lib/pricingTier';
import { matchHallwayRoomId } from '@/lib/windows/roomIds';
import { calculateHallwayWindowBlindsFees } from '@/lib/pricing_hallways_windows';

function buildHallwayOperations(
  formData: BookingFormData,
  situation: Situation
): HallwayOperations | undefined {
  const hallways = formData.hallways || [];
  if (hallways.length === 0) return undefined;

  // SSOT: Use isDeepCleanLevel for Deep Clean detection
  const isDeepClean = isDeepCleanLevel(formData.baseServiceLevel);
  
  const operations: HallwayOperation[] = hallways.map((hw) => {
    const trackingCode = getAreaTrackingCode('hallway', hw.id);
    const sizeInfo = HALLWAY_SIZE_INFO[hw.sizeTier];
    
    // Hazards
    const hazards: string[] = [];
    let hazardMinutes = 0;
    if (hw.highTrafficDust) { hazards.push('High-Traffic'); hazardMinutes += 8; }
    if (hw.runnerOrRug) { hazards.push('Runner/Rug'); hazardMinutes += 10; }
    if (hw.wallScuffs) { hazards.push('Wall Scuffs'); hazardMinutes += 12; }
    if (hw.galleryWall) { hazards.push('Gallery Wall'); hazardMinutes += 15; }
    if (hw.entryDebris) { hazards.push('Entry Debris'); hazardMinutes += 8; }
    
    // SSOT Pricing: Use shared calculateHallwayCabinetFee function
    const { fee: cabinetDetailFee, feePerDoor: cabinetFeePerDoor } = calculateHallwayCabinetFee(
      hw.cabinetCount,
      hw.cabinetsEmpty,
      situation,
      isDeepClean
    );
    
    // Organization: LIVE_HERE only
    const orgCost = situation === 'LIVE_HERE' 
      ? (hw.organizationHours || 0) * HALLWAY_RATES.ORGANIZATION_RATE 
      : 0;
    
    // SSOT: Use central helper for windows/blinds fees
    const windowBlindsFees = calculateHallwayWindowBlindsFees(
      hw.id,
      formData.roomWindowSelections || []
    );
    
    const hallwayWindowsFee = windowBlindsFees.windowsFee;
    const hallwayBlindsFee = windowBlindsFees.blindsFee;
    
    // Total fee = cabinets + org + windows + blinds
    const hallwayTotalFee = cabinetDetailFee + orgCost + hallwayWindowsFee + hallwayBlindsFee;
    
    return {
      id: hw.id,
      label: hw.label,
      trackingCode,
      sizeTier: hw.sizeTier,
      sizeRange: sizeInfo?.ftRange || '12-24 ft',
      floorId: hw.floorLevel ? numberToFloorId(hw.floorLevel) : 'FLOOR_1',
      floorType: hw.floorType 
        ? (hw.floorType === 'carpet' ? 'Carpet' : hw.floorType === 'mixed' ? 'Mixed' : 'Hard Floor')
        : null,
      // Per-door pricing fields (SSOT)
      cabinetDoorCount: hw.cabinetCount,
      cabinetsEmpty: hw.cabinetsEmpty,
      cabinetFeePerDoor,
      cabinetDetailFee,
      organizationHours: hw.organizationHours || 0,
      orgCost,
      hallwayTotalFee,
      connectsTo: hw.connectsTo || [],  // RAW IDs ONLY (SSOT)
      hazards,
      hazardMinutes,
      // Windows/Blinds counts (from central helper)
      windowsInterior: windowBlindsFees.windowsInterior,
      windowsExterior: windowBlindsFees.windowsExterior,
      blindsCount: windowBlindsFees.blindsCount,
      // Windows/Blinds FEES (SSOT)
      hallwayWindowsFee,
      hallwayBlindsFee,
      // Legacy compat
      cabinetCount: hw.cabinetCount,
      hasCabinetFee: cabinetDetailFee > 0,
      cabinetFeeAmount: cabinetDetailFee,
    };
  });

  const totalCabinetFees = operations.reduce((sum, op) => sum + op.cabinetDetailFee, 0);
  const totalOrgCosts = operations.reduce((sum, op) => sum + op.orgCost, 0);
  const totalWindowFees = operations.reduce((sum, op) => sum + op.hallwayWindowsFee, 0);
  const totalBlindsFees = operations.reduce((sum, op) => sum + op.hallwayBlindsFee, 0);

  return {
    hallways: operations,
    totalCount: operations.length,
    totalCabinetFees,
    totalOrgCosts,
    totalWindowFees,
    totalBlindsFees,
    totalFees: totalCabinetFees + totalOrgCosts + totalWindowFees + totalBlindsFees,
    totalHazardMinutes: operations.reduce((sum, op) => sum + op.hazardMinutes, 0),
  };
}
