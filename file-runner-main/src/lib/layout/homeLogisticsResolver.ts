/**
 * HomeLogisticsResolver — Single Source of Truth for ALL Logistics Resolution
 * 
 * CRITICAL: ALL outputs (Property Map, Review, PDF) MUST use these resolvers.
 * No component is allowed to compute floors, labels, or access plans independently.
 * 
 * ARCHITECTURE:
 *   formData → HomeLogisticsResolver → HomeLayoutModel → (Map | Review | PDF)
 * 
 * RULE: One brain for property logistics. No duplicate calculations.
 */

import type { BookingFormData, HomeEntryConfig, Situation } from '@/contexts/BookingContext';
import type { BathroomUnit, BathroomLogistics } from '@/lib/bathroomMappingTypes';
import type { FloorId } from '@/lib/floorLocationTypes';
import { numberToFloorId } from '@/lib/floorLocationTypes';
import { getPropertyContext, type PropertyContext } from '@/lib/propertyCategory';
import { LOGISTICS_TIME_DELTAS } from '@/lib/bathroomLogisticsTime';

// ============= TYPES =============

export type FloorSource = 'roomFloorLocations' | 'bedroomConfigs' | 'bathroomInventory' | 'homeMapping' | 'default';

export interface FloorResolution {
  floor: number;
  floorId: FloorId;
  source: FloorSource;
}

export interface AccessPlan {
  propertyType: 'house' | 'apartment' | null;
  unitFloor: number | null;
  hasElevator: boolean;
  isWalkUp: boolean;
  levels: number;
  entryNotes: string | null;
  parkingNotes: string | null;
  arrivalInstructions: string | null;
}

export interface ConnectorPresence {
  hasStairs: boolean;
  stairSteps: number;
  hasHallways: boolean;
  hallwayCount: number;
  hasElevator: boolean;
  elevatorSuppressesStairs: boolean;
}

export interface BathroomOpsNote {
  category: 'toilet' | 'tub' | 'glass' | 'cabinet' | 'manual';
  label: string;
  severity: 'light' | 'medium' | 'heavy';
}

export interface MappingCompleteness {
  bedroomsMapped: number;
  bedroomsExpected: number;
  bathroomsMapped: number;
  bathroomsExpected: number;
  coreRoomsMapped: number;
  coreRoomsExpected: number;
}

// ============= BEDROOM FLOOR RESOLVER =============

/**
 * Bedroom floor SSOT resolver
 * Priority:
 * 1) roomFloorLocations.bedrooms (UI SSOT - what "1/1 mapped" uses)
 * 2) bedroomConfigs floor (legacy fallback)
 * 3) default floor 1
 */
export function resolveBedroomFloorLevel(
  formData: BookingFormData, 
  bedIndex: number
): FloorResolution {
  const bedKey = `bed_${bedIndex}`;

  // 1) SSOT used by UI mapped count (roomFloorLocations.bedrooms)
  const roomFloorLevel = (formData.roomFloorLocations as any)?.bedrooms?.[bedKey];
  if (typeof roomFloorLevel === 'number' && roomFloorLevel >= 1) {
    return { floor: roomFloorLevel, floorId: numberToFloorId(roomFloorLevel), source: 'roomFloorLocations' };
  }

  // 2) Legacy fallback (bedroomConfigs.bed_X.floor.floorLevel)
  const legacy = (formData.bedroomConfigs as any)?.[bedKey];
  const legacyFloor = legacy?.floor?.floorLevel;
  if (typeof legacyFloor === 'number' && legacyFloor >= 1) {
    return { floor: legacyFloor, floorId: numberToFloorId(legacyFloor), source: 'bedroomConfigs' };
  }

  return { floor: 1, floorId: 'FLOOR_1', source: 'default' };
}

/**
 * Bedroom label resolver (avoid confusion with Master Bath)
 * - 1 bedroom: "Bedroom" (not "Master")
 * - 2+ bedrooms: bed_0 = "Primary Bedroom", others = "Bedroom N"
 */
export function resolveBedroomLabel(bedIndex: number, bedroomCount: number): string {
  if (bedroomCount <= 1) return 'Bedroom';
  if (bedIndex === 0) return 'Primary Bedroom';
  return `Bedroom ${bedIndex + 1}`;
}

// ============= BATHROOM FLOOR RESOLVER =============

/**
 * Bathroom floor SSOT resolver
 * Uses bathroomInventory.bathrooms[id].floorId as the canonical source
 */
export function resolveBathroomFloorLevel(
  formData: BookingFormData,
  bathroomId: string
): FloorResolution {
  const bathrooms = formData.bathroomInventory?.bathrooms || [];
  const bathroom = bathrooms.find(b => b.id === bathroomId);
  
  if (bathroom?.floorId) {
    // Extract number from FloorId (e.g., 'FLOOR_2' → 2)
    const match = bathroom.floorId.match(/FLOOR_(\d+)/);
    const floorNum = match ? parseInt(match[1], 10) : 1;
    return { floor: floorNum, floorId: bathroom.floorId, source: 'bathroomInventory' };
  }
  
  return { floor: 1, floorId: 'FLOOR_1', source: 'default' };
}

/**
 * Get bathroom label based on type and index
 */
export function resolveBathroomLabel(type: string, index: number): string {
  const typeLabels: Record<string, string> = {
    master: 'Master Bath',
    full: 'Full Bath',
    half: 'Half Bath',
  };
  
  const baseLabel = typeLabels[type] || 'Bathroom';
  return index > 0 ? `${baseLabel} ${index + 1}` : baseLabel;
}

// ============= CORE ROOM FLOOR RESOLVER =============

/**
 * Core room floor SSOT resolver (kitchen, living, dining)
 * Uses roomFloorLocations as primary source
 */
export function resolveCoreRoomFloorLevel(
  formData: BookingFormData,
  roomKey: 'kitchen' | 'living' | 'dining'
): FloorResolution {
  const floorLevel = (formData.roomFloorLocations as any)?.[roomKey];
  
  if (typeof floorLevel === 'number' && floorLevel >= 1) {
    return { floor: floorLevel, floorId: numberToFloorId(floorLevel), source: 'roomFloorLocations' };
  }
  
  return { floor: 1, floorId: 'FLOOR_1', source: 'default' };
}

// ============= MAPPED AREA FLOOR RESOLVER =============

/**
 * Mapped area floor resolver (office, laundry, garage, patio, mudroom, den)
 * Uses homeMapping.areas[key].floor.floorLevel as source
 */
export function resolveMappedAreaFloorLevel(
  formData: BookingFormData,
  areaKey: string
): FloorResolution {
  const areaConfig = (formData.homeMapping?.areas as any)?.[areaKey];
  const floorLevel = areaConfig?.floor?.floorLevel;
  
  if (typeof floorLevel === 'number' && floorLevel >= 1) {
    return { floor: floorLevel, floorId: numberToFloorId(floorLevel), source: 'homeMapping' };
  }
  
  return { floor: 1, floorId: 'FLOOR_1', source: 'default' };
}

// ============= ACCESS PLAN RESOLVER =============

/**
 * Access plan resolver - builds unified access plan from formData + homeEntry
 */
export function resolveAccessPlan(
  formData: BookingFormData,
  homeEntry?: HomeEntryConfig
): AccessPlan {
  const isApartment = formData.propertyType === 'apartment' || 
    homeEntry?.propertyType === 'APARTMENT_CONDO_STUDIO';
  
  const isHouse = formData.propertyType === 'house' || 
    homeEntry?.propertyType === 'SINGLE_FAMILY_TOWNHOUSE';
  
  // Determine levels based on property type
  let levels = 1;
  if (isApartment) {
    levels = formData.apartmentUnitLevels || 1;
  } else if (isHouse) {
    levels = formData.houseLevels || 1;
  }
  
  // Determine if walk-up (apartment without elevator, above ground floor)
  const unitFloor = isApartment ? (formData.apartmentFloor || 1) : null;
  const hasElevator = formData.hasElevator ?? false;
  const isWalkUp = isApartment && !hasElevator && (unitFloor ?? 1) > 1;
  
  return {
    propertyType: isApartment ? 'apartment' : (isHouse ? 'house' : null),
    unitFloor,
    hasElevator,
    isWalkUp,
    levels,
    entryNotes: homeEntry?.arrivalInstructions || null,
    parkingNotes: homeEntry?.parkingNotes || null,
    arrivalInstructions: homeEntry?.arrivalInstructions || null,
  };
}

// ============= BATHROOM OPS NOTES RESOLVER =============

/**
 * Extract human-readable ops notes from bathroom logistics
 * Used for Review display and Crew PDF
 */
export function resolveBathroomOpsNotes(logistics: BathroomLogistics | undefined): BathroomOpsNote[] {
  if (!logistics) return [];
  
  const notes: BathroomOpsNote[] = [];
  
  // Toilet scale
  if (logistics.toiletScale && logistics.toiletScale !== 'none') {
    const severityMap: Record<string, 'light' | 'medium' | 'heavy'> = {
      light: 'light',
      heavy: 'medium',
      stained: 'heavy',
    };
    notes.push({
      category: 'toilet',
      label: `Toilet: ${logistics.toiletScale}`,
      severity: severityMap[logistics.toiletScale] || 'light',
    });
  }
  
  // Tub scale
  if (logistics.tubScale && logistics.tubScale !== 'none') {
    const severityMap: Record<string, 'light' | 'medium' | 'heavy'> = {
      soap: 'light',
      mineral: 'medium',
      heavy: 'heavy',
    };
    notes.push({
      category: 'tub',
      label: `Tub: ${logistics.tubScale}`,
      severity: severityMap[logistics.tubScale] || 'light',
    });
  }
  
  // Shower door scale
  if (logistics.showerDoorScale && logistics.showerDoorScale !== 'none') {
    const severityMap: Record<string, 'light' | 'medium' | 'heavy'> = {
      water_spots: 'light',
      mineral: 'medium',
      heavy: 'heavy',
    };
    notes.push({
      category: 'glass',
      label: `Glass: ${logistics.showerDoorScale}`,
      severity: severityMap[logistics.showerDoorScale] || 'light',
    });
  }
  
  // Cabinet interior
  if (logistics.cabinetInterior && logistics.cabinetInterior !== 'no') {
    notes.push({
      category: 'cabinet',
      label: logistics.cabinetInterior === 'yes_empty' ? 'Cabinets: empty' : 'Cabinets: with items',
      severity: logistics.cabinetInterior === 'yes_empty' ? 'light' : 'medium',
    });
  }
  
  // Manual override
  if (logistics.extraMinutesManual && logistics.extraMinutesManual > 0) {
    notes.push({
      category: 'manual',
      label: `+${logistics.extraMinutesManual} min manual`,
      severity: 'medium',
    });
  }
  
  return notes;
}

// ============= CONNECTOR PRESENCE RESOLVER =============

/**
 * Resolve connector presence (stairs, hallways, elevator) based on structure
 * Elevator can suppress stairs display for apartments if no internal stairs
 */
export function resolveConnectorPresence(
  formData: BookingFormData,
  ctx: PropertyContext
): ConnectorPresence {
  // SSOT: Use formData.stairs[] (multi-stair array) instead of legacy stairsConfig
  const stairsArray = formData.stairs || [];
  const hasStairs = stairsArray.length > 0;
  // Sum step counts from all stairs, or use average if needed
  const stairSteps = stairsArray.length > 0 
    ? Math.round(stairsArray.reduce((sum, s) => sum + (s.stepCount || 14), 0) / stairsArray.length)
    : 14;
  const hasHallways = (formData.hallways?.length ?? 0) > 0;
  const hallwayCount = formData.hallways?.length ?? 0;
  const hasElevator = formData.hasElevator ?? false;
  
  // For apartments with elevator, internal stairs are unlikely unless it's a loft/duplex
  const elevatorSuppressesStairs = ctx.category === 'APARTMENT_CONDO' && 
    hasElevator && 
    !ctx.isMultiLevel;
  
  return {
    hasStairs: hasStairs && !elevatorSuppressesStairs,
    stairSteps,
    hasHallways,
    hallwayCount,
    hasElevator,
    elevatorSuppressesStairs,
  };
}

// ============= MAPPING COMPLETENESS RESOLVER =============

/**
 * Calculate mapping completeness for validation display
 */
export function resolveMappingCompleteness(
  formData: BookingFormData,
  bedroomCount: number
): MappingCompleteness {
  // Count mapped bedrooms
  const roomFloorBedrooms = (formData.roomFloorLocations as any)?.bedrooms || {};
  const bedroomsMapped = Object.keys(roomFloorBedrooms).filter(
    key => typeof roomFloorBedrooms[key] === 'number' && roomFloorBedrooms[key] >= 1
  ).length;
  
  // Count mapped bathrooms (any with floorId set)
  const bathrooms = formData.bathroomInventory?.bathrooms || [];
  const bathroomsMapped = bathrooms.filter(b => b.floorId).length;
  
  // Count mapped core rooms
  const roomFloors = formData.roomFloorLocations || {};
  let coreRoomsMapped = 0;
  if ((roomFloors as any).kitchen) coreRoomsMapped++;
  if ((roomFloors as any).living) coreRoomsMapped++;
  if ((roomFloors as any).dining) coreRoomsMapped++;
  
  // Expected counts
  const bathroomsExpected = bathrooms.length;
  const coreRoomsExpected = bedroomCount >= 2 ? 3 : 2; // Kitchen, Living, (Dining if 2+ beds)
  
  return {
    bedroomsMapped,
    bedroomsExpected: bedroomCount,
    bathroomsMapped,
    bathroomsExpected,
    coreRoomsMapped,
    coreRoomsExpected,
  };
}

// ============= OPERATIONAL NOTES RESOLVER =============

export interface OperationalNote {
  zone: string;
  floorId: FloorId;
  noteType: 'hazard' | 'access' | 'special';
  message: string;
}

/**
 * Extract operational notes from formData for crew display
 */
export function resolveOperationalNotes(
  formData: BookingFormData,
  situation: Situation
): OperationalNote[] {
  const notes: OperationalNote[] = [];
  
  // ============= KITCHEN HAZARDS & OPERATIONS =============
  
  // Kitchen hazards
  const kitchenHazards = (formData as any).roomMessTypes?.kitchen || [];
  kitchenHazards.forEach((hazard: string) => {
    notes.push({
      zone: 'kitchen',
      floorId: numberToFloorId((formData.roomFloorLocations as any)?.kitchen || 1),
      noteType: 'hazard',
      message: hazard === 'grease' ? 'Kitchen grease buildup' : `Kitchen: ${hazard.replace('_', ' ')}`,
    });
  });
  
  // Kitchen sticky spills
  if ((formData as any).roomStickySpills?.kitchen) {
    notes.push({
      zone: 'kitchen',
      floorId: numberToFloorId((formData.roomFloorLocations as any)?.kitchen || 1),
      noteType: 'hazard',
      message: 'Sticky floor spills in kitchen',
    });
  }
  
  // Kitchen trash bags estimate
  const kitchenTrashBags = (formData as any).roomTrashBags?.kitchen || 0;
  if (kitchenTrashBags > 2) {
    notes.push({
      zone: 'kitchen',
      floorId: numberToFloorId((formData.roomFloorLocations as any)?.kitchen || 1),
      noteType: 'special',
      message: `Kitchen: ~${kitchenTrashBags} trash bags expected`,
    });
  }
  
  // Pull-out appliances (2-person safety) - uses SSOT floor resolver
  if ((formData as any).pullOutAppliances) {
    const kitchenFloor = resolveCoreRoomFloorLevel(formData, 'kitchen');
    notes.push({
      zone: 'kitchen',
      floorId: kitchenFloor.floorId,
      noteType: 'access',
      message: '⚠️ PULL OUT APPLIANCES → 2-PERSON TEAM REQUIRED',
    });
  }
  
  // ============= STAIR HAZARDS (SSOT: formData.stairs[]) =============
  
  const stairsArray = formData.stairs || [];
  stairsArray.forEach((stair) => {
    const stairFloorId = numberToFloorId(stair.fromFloor);
    
    if (stair.cornerBuildup) {
      notes.push({
        zone: stair.id,
        floorId: stairFloorId,
        noteType: 'hazard',
        message: `${stair.label}: Heavy dust in stair corners`,
      });
    }
    if (stair.petHairAccumulation) {
      notes.push({
        zone: stair.id,
        floorId: stairFloorId,
        noteType: 'hazard',
        message: `${stair.label}: Pet hair on stairs`,
      });
    }
    if (stair.slipHazards) {
      notes.push({
        zone: stair.id,
        floorId: stairFloorId,
        noteType: 'hazard',
        message: `${stair.label}: Slip hazards present`,
      });
    }
    if (stair.railingsDetail) {
      notes.push({
        zone: stair.id,
        floorId: stairFloorId,
        noteType: 'hazard',
        message: `${stair.label}: Intricate railings require detail cleaning`,
      });
    }
  });
  
  // ============= HALLWAY HAZARDS =============
  
  const hallways = formData.hallways || [];
  hallways.forEach((hw, i) => {
    if (hw.highTrafficDust) {
      notes.push({
        zone: `hallway_${i}`,
        floorId: numberToFloorId(hw.floorLevel || 1),
        noteType: 'hazard',
        message: 'High traffic dust buildup',
      });
    }
    if (hw.wallScuffs) {
      notes.push({
        zone: `hallway_${i}`,
        floorId: numberToFloorId(hw.floorLevel || 1),
        noteType: 'hazard',
        message: 'Wall scuffs present',
      });
    }
  });
  
  // ============= MAPPED AREA HAZARDS =============
  
  const areas = formData.homeMapping?.areas;
  if (areas?.office?.enabled && areas.office.hazards) {
    if (areas.office.hazards.dustBuildup) {
      notes.push({
        zone: 'office',
        floorId: numberToFloorId(areas.office.floor?.floorLevel || 1),
        noteType: 'hazard',
        message: 'Office dust buildup',
      });
    }
  }
  
  // ============= STUDIO HAZARDS (uses SSOT floor resolver) =============
  
  const studioConfig = formData.homeMapping?.areas?.studioMainSpace;
  if (studioConfig?.enabled) {
    // Get floor from SSOT resolver (studios can be on any floor - condo, penthouse, etc.)
    // Default to FLOOR_1 but use proper resolution when roomFloorLocations supports studio_main
    const studioFloorId: FloorId = ((formData.roomFloorLocations as any)?.studio_main 
      ? numberToFloorId((formData.roomFloorLocations as any).studio_main) 
      : 'FLOOR_1');
    
    // Read from GLOBAL SSOT keys
    const studioHazards = (formData as any).roomMessTypes?.studio_main || [];
    const studioSticky = (formData as any).roomStickySpills?.studio_main || false;
    const studioTrash = (formData as any).roomTrashBags?.studio_main || 0;
    
    // Studio mess types
    studioHazards.forEach((hazard: string) => {
      notes.push({
        zone: 'studio_main',
        floorId: studioFloorId,
        noteType: 'hazard',
        message: `Studio: ${hazard.replace('_', ' ')}`,
      });
    });
    
    // Sticky spills
    if (studioSticky) {
      notes.push({
        zone: 'studio_main',
        floorId: studioFloorId,
        noteType: 'hazard',
        message: 'Sticky floor spills in studio',
      });
    }
    
    // Pet hair from config
    if (studioConfig.petHairRisk) {
      notes.push({
        zone: 'studio_main',
        floorId: studioFloorId,
        noteType: 'hazard',
        message: '🐾 PET HAIR EXPECTED - Bring lint roller',
      });
    }
    
    // Heavy dust (Deep Reset)
    if (studioConfig.dustLevel === 'heavy') {
      notes.push({
        zone: 'studio_main',
        floorId: studioFloorId,
        noteType: 'hazard',
        message: '🌫️ HEAVY DUST BUILDUP - Extended dusting time',
      });
    }
    
    // Trash bags estimate
    if (studioTrash > 2) {
      notes.push({
        zone: 'studio_main',
        floorId: studioFloorId,
        noteType: 'special',
        message: `Studio: ~${studioTrash} trash bags expected`,
      });
    }
    
    // Moving-specific notes
    if (situation === 'MOVING' && studioConfig.movingConfig) {
      const mv = studioConfig.movingConfig;
      if (mv.insideCabinets) {
        notes.push({
          zone: 'studio_main',
          floorId: studioFloorId,
          noteType: 'special',
          message: 'Studio: Inside cabinets requested',
        });
      }
      if (mv.insideClosets) {
        notes.push({
          zone: 'studio_main',
          floorId: studioFloorId,
          noteType: 'special',
          message: 'Studio: Inside closets requested',
        });
      }
      if (mv.insideAppliances) {
        notes.push({
          zone: 'studio_main',
          floorId: studioFloorId,
          noteType: 'special',
          message: 'Studio: Inside appliances requested',
        });
      }
      if (mv.wallMarks) {
        notes.push({
          zone: 'studio_main',
          floorId: studioFloorId,
          noteType: 'hazard',
          message: 'Studio: Wall marks to address',
        });
      }
    }
  }
  
  return notes;
}

// ============= LOGISTICS FINGERPRINT (for useMemo reactivity) =============

/**
 * Generate a stable opsHash from bathroom logistics fields
 * Only includes fields that affect time/ops (avoids JSON.stringify noise)
 */
function getBathroomOpsHash(logistics: import('@/lib/bathroomMappingTypes').BathroomLogistics | undefined): string {
  if (!logistics) return 'none';
  
  return [
    logistics.toiletScale ?? 'none',
    logistics.tubScale ?? 'none',
    logistics.showerDoorScale ?? 'none',
    logistics.cabinetInterior ?? 'no',
    logistics.extraMinutesManual ?? 0,
  ].join(':');
}

/**
 * Generate a stable fingerprint for logistics data
 * Used by useHomeLayoutModel to trigger re-computation
 * 
 * Fingerprint changes when:
 * - Property structure changes (type, levels, elevator)
 * - Bedroom/bathroom floor mappings change
 * - Connectors change (stairs, hallways)
 * - Home size/sqft changes
 * 
 * OPTIMIZATION: Uses stable opsHash instead of JSON.stringify to avoid
 * unnecessary rebuilds from irrelevant field changes or key ordering
 */
export function getLogisticsFingerprint(
  formData: BookingFormData,
  situation: Situation,
  language: string,
  summaryMinutes?: number
): string {
  // Stable bathroom hash: sorted by id for deterministic output
  const bathroomHash = [...(formData.bathroomInventory?.bathrooms || [])]
    .sort((a, b) => a.id.localeCompare(b.id))  // ✅ Stable order
    .map(b => `${b.id}:${b.floorId ?? 'FLOOR_1'}:${b.type}:${getBathroomOpsHash(b.logistics)}`)
    .join(',');
  
  const parts = [
    // Structure
    formData.propertyType ?? '',
    formData.serviceType ?? 'regular',  // ✅ Affects isDeep calculation
    formData.houseLevels ?? 1,
    formData.apartmentUnitLevels ?? 1,
    formData.apartmentFloor ?? 1,
    formData.hasElevator ?? false,
    // Size
    formData.homeSize ?? 0,
    formData.squareFootageRange ?? '',
    // Bedroom floors (SSOT)
    JSON.stringify((formData.roomFloorLocations as any)?.bedrooms ?? {}),
    // Core room floors
    (formData.roomFloorLocations as any)?.kitchen ?? 1,
    (formData.roomFloorLocations as any)?.living ?? 1,
    (formData.roomFloorLocations as any)?.dining ?? 1,
    // Bathroom inventory (stable opsHash)
    bathroomHash,
    // Connectors - MULTI-STAIR SSOT
    // Stable stairsHash sorted by id for deterministic output
    [...(formData.stairs || [])]
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map(s => {
        const hazards = [
          s.cornerBuildup ? 'CB' : '',
          s.petHairAccumulation ? 'PH' : '',
          s.slipHazards ? 'SL' : '',
          s.railingsDetail ? 'RL' : '',
        ].filter(Boolean).join('');
        return `${s.id}:${s.fromFloor}->${s.toFloor}:${s.surfaceType}:${s.stepCount}:${hazards}`;
      })
      .join(','),
    // SSOT: Stable hallway hash that includes floorLevel + connectsTo for reactivity
    // Changing floor or connections now triggers layout model rebuild
    [...(formData.hallways || [])]
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map(h => {
        const id = String(h.id);
        const floor = String(h.floorLevel ?? 1);
        const size = String(h.sizeTier ?? '');
        const connects = (h.connectsTo || []).slice().sort().join('-');
        return `${id}:${floor}:${size}:${connects}`;
      })
      .join(','),
    // Context
    situation,
    language,
    summaryMinutes ?? 0,
    // Home Entry
    formData.homeEntry?.propertyType ?? '',
    formData.homeEntry?.arrivalInstructions ?? '',
  ];
  
  return parts.join('|');
}
