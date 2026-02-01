/**
 * Home Structure IDs - Stable Unique Tracking Codes
 * 
 * This module provides deterministic tracking codes for all mapped areas
 * in the home structure model. These codes are:
 * - Stable: Never change once generated
 * - Deterministic: Same input always produces same output
 * - Human-readable: Used in PDF, UI chips, and payload
 * 
 * Format: {PREFIX}-{PADDED_NUMBER}
 * Examples: HW-001, BR-002, BA-003
 */

export type AreaType = 
  | 'hallway'
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'living'
  | 'dining'
  | 'stairs'
  | 'guest_house'
  | 'art_studio'
  | 'pool_house'
  | 'patio';

// Prefix mapping for each area type
const AREA_PREFIXES: Record<AreaType, string> = {
  hallway: 'HW',
  bedroom: 'BR',
  bathroom: 'BA',
  kitchen: 'KT',
  living: 'LV',
  dining: 'DN',
  stairs: 'ST',
  guest_house: 'GH',
  art_studio: 'AS',
  pool_house: 'PH',
  patio: 'PT',
};

/**
 * Extract numeric index from a stable ID like "hallway_0" or "bedroom_2"
 * Returns the number + 1 (so hallway_0 becomes 001)
 */
function extractNumericIndex(stableId: string): number {
  const match = stableId.match(/_(\d+)$/);
  if (match) {
    return parseInt(match[1], 10) + 1;
  }
  // Fallback: try to parse any trailing number
  const numMatch = stableId.match(/(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  return 1;
}

/**
 * Generate a human-readable tracking code from area type and stable ID
 * 
 * @param areaType - The type of area (hallway, bedroom, etc.)
 * @param stableId - The internal stable ID (e.g., "hallway_0", "bedroom_1")
 * @returns A formatted tracking code (e.g., "HW-001", "BR-002")
 * 
 * @example
 * getAreaTrackingCode('hallway', 'hallway_0') // => "HW-001"
 * getAreaTrackingCode('hallway', 'hallway_1') // => "HW-002"
 * getAreaTrackingCode('bedroom', 'bedroom_2') // => "BR-003"
 */
export function getAreaTrackingCode(areaType: AreaType, stableId: string): string {
  const prefix = AREA_PREFIXES[areaType] || 'XX';
  const index = extractNumericIndex(stableId);
  const paddedIndex = String(index).padStart(3, '0');
  return `${prefix}-${paddedIndex}`;
}

/**
 * Format a full area label with tracking code for PDF/display
 * 
 * @example
 * formatAreaWithCode('Hallway 1', 'hallway', 'hallway_0')
 * // => "Hallway 1 (HW-001)"
 */
export function formatAreaWithCode(
  label: string, 
  areaType: AreaType, 
  stableId: string
): string {
  const code = getAreaTrackingCode(areaType, stableId);
  return `${label} (${code})`;
}

/**
 * Build a home structure area entry for normalized payload
 * Used for the home_structure.areas[] field
 */
export interface HomeStructureArea {
  area_type: AreaType;
  stable_id: string;
  tracking_code: string;
  label: string;
  floor_level?: string;
  floor_type?: string;
  size_tier?: string;
  cabinet_count?: number;
  cabinets_empty?: boolean;
  organization_hours?: number;
  fee_applied?: number;
  windows?: {
    count: number;
    glass_mode: string;
    blinds_count: number;
  };
}

/**
 * Build a home structure entry from a hallway config
 */
export function buildHallwayStructureEntry(
  hallway: {
    id: string;
    label: string;
    sizeTier: string;
    cabinetCount: number;
    cabinetsEmpty: boolean;
    organizationHours: number;
    floorLevel?: string;
    floorType?: string;
  },
  feeApplied: number = 0,
  windowConfig?: { count: number; glassMode: string; blindsCount: number }
): HomeStructureArea {
  return {
    area_type: 'hallway',
    stable_id: hallway.id,
    tracking_code: getAreaTrackingCode('hallway', hallway.id),
    label: hallway.label,
    floor_level: hallway.floorLevel,
    floor_type: hallway.floorType,
    size_tier: hallway.sizeTier,
    cabinet_count: hallway.cabinetCount,
    cabinets_empty: hallway.cabinetsEmpty,
    organization_hours: hallway.organizationHours,
    fee_applied: feeApplied,
    windows: windowConfig ? {
      count: windowConfig.count,
      glass_mode: windowConfig.glassMode,
      blinds_count: windowConfig.blindsCount,
    } : undefined,
  };
}
