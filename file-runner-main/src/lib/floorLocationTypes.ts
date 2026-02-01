/**
 * Floor Location Types & Helpers - Single Source of Truth
 * 
 * Premium Floor Location Selector System:
 * - Full labels "Floor 1" / "Floor 2" / "Floor 3" (not F1/F2)
 * - Required state validation for multi-floor properties
 * - Special stair connection logic (connects floors, doesn't sit on one)
 */

import { Language, t } from '@/lib/translations';

// ============= FLOOR ID TYPES =============

/**
 * Canonical floor identifiers - used throughout the system
 * for consistent floor references
 */
export type FloorId = 'FLOOR_1' | 'FLOOR_2' | 'FLOOR_3' | 'FLOOR_4' | 'FLOOR_5' | 'FLOOR_6';

/**
 * Stair connection for multi-floor properties
 * Stairs connect floors rather than sitting on a single floor
 */
export interface StairConnection {
  from: FloorId;
  to: FloorId;
}

// ============= CONVERSION HELPERS =============

/**
 * Convert FloorId to numeric floor number (1, 2, 3)
 */
export function floorIdToNumber(id: FloorId): number {
  switch (id) {
    case 'FLOOR_1': return 1;
    case 'FLOOR_2': return 2;
    case 'FLOOR_3': return 3;
    case 'FLOOR_4': return 4;
    case 'FLOOR_5': return 5;
    case 'FLOOR_6': return 6;
    default: return 1;
  }
}

/**
 * Convert numeric floor number to FloorId
 */
export function numberToFloorId(n: number): FloorId {
  switch (n) {
    case 1: return 'FLOOR_1';
    case 2: return 'FLOOR_2';
    case 3: return 'FLOOR_3';
    case 4: return 'FLOOR_4';
    case 5: return 'FLOOR_5';
    case 6: return 'FLOOR_6';
    default: return 'FLOOR_1';
  }
}

// ============= LABEL HELPERS =============

/**
 * Get localized floor label (e.g., "Floor 1", "Piso 1", "1楼")
 * Uses translation system for full labels
 */
export function getFloorLabel(floorIdOrNumber: FloorId | number, language: Language): string {
  const num = typeof floorIdOrNumber === 'number' 
    ? floorIdOrNumber 
    : floorIdToNumber(floorIdOrNumber);
  
  // Clamp to 1-6 and use dynamic key lookup
  const clampedNum = Math.min(Math.max(num, 1), 6);
  switch (clampedNum) {
    case 1: return t(language, 'floor.floor_1');
    case 2: return t(language, 'floor.floor_2');
    case 3: return t(language, 'floor.floor_3');
    case 4: return t(language, 'floor.floor_4');
    case 5: return t(language, 'floor.floor_5');
    case 6: return t(language, 'floor.floor_6');
    default: return t(language, 'floor.floor_1');
  }
}

/**
 * Get short floor label for compact displays (e.g., "F1", "F2")
 * Only use when space is extremely limited
 */
export function getFloorLabelShort(floorIdOrNumber: FloorId | number): string {
  const num = typeof floorIdOrNumber === 'number' 
    ? floorIdOrNumber 
    : floorIdToNumber(floorIdOrNumber);
  return `F${num}`;
}

/**
 * Get all available floor options based on property floor count
 */
export function getFloorOptions(propertyFloors: number): FloorId[] {
  const floors: FloorId[] = [];
  if (propertyFloors >= 1) floors.push('FLOOR_1');
  if (propertyFloors >= 2) floors.push('FLOOR_2');
  if (propertyFloors >= 3) floors.push('FLOOR_3');
  if (propertyFloors >= 4) floors.push('FLOOR_4');
  if (propertyFloors >= 5) floors.push('FLOOR_5');
  if (propertyFloors >= 6) floors.push('FLOOR_6');
  return floors;
}

/**
 * Get numeric floor options (1, 2, 3) based on property floor count
 */
export function getFloorNumberOptions(propertyFloors: number): number[] {
  return Array.from({ length: Math.min(propertyFloors, 6) }, (_, i) => i + 1);
}

// ============= REQUIREMENT HELPERS =============

/**
 * Check if floor selection is required for a property
 * Floor selection is only required for multi-floor properties (2+)
 */
export function isFloorRequired(propertyFloors: number): boolean {
  return propertyFloors >= 2;
}

/**
 * Check if a floor value is valid and selected
 */
export function isFloorSelected(floor: number | null | undefined): boolean {
  return typeof floor === 'number' && floor >= 1;
}

// ============= STAIR CONNECTION HELPERS =============

/**
 * Get localized stair connection label
 * e.g., "Connects: Floor 1 → Floor 2"
 */
export function getStairConnectionLabel(
  connection: StairConnection, 
  language: Language
): string {
  const fromLabel = getFloorLabel(connection.from, language);
  const toLabel = getFloorLabel(connection.to, language);
  const connectsLabel = t(language, 'stairs.connects_label');
  return `${connectsLabel}: ${fromLabel} → ${toLabel}`;
}

/**
 * Get stair connection option label (shorter format for chips)
 * e.g., "Floor 1 → Floor 2"
 */
export function getStairConnectionOptionLabel(
  connection: StairConnection,
  language: Language
): string {
  const fromLabel = getFloorLabel(connection.from, language);
  const toLabel = getFloorLabel(connection.to, language);
  return `${fromLabel} → ${toLabel}`;
}

/**
 * Get all valid stair connection options for a property
 * - 2-floor property: only "Floor 1 → Floor 2"
 * - 3-floor property: "Floor 1 → Floor 2" OR "Floor 2 → Floor 3"
 */
export function getStairConnectionOptions(propertyFloors: number): StairConnection[] {
  if (propertyFloors < 2) return [];
  
  const options: StairConnection[] = [
    { from: 'FLOOR_1', to: 'FLOOR_2' }
  ];
  
  if (propertyFloors >= 3) {
    options.push({ from: 'FLOOR_2', to: 'FLOOR_3' });
  }
  if (propertyFloors >= 4) {
    options.push({ from: 'FLOOR_3', to: 'FLOOR_4' });
  }
  if (propertyFloors >= 5) {
    options.push({ from: 'FLOOR_4', to: 'FLOOR_5' });
  }
  if (propertyFloors >= 6) {
    options.push({ from: 'FLOOR_5', to: 'FLOOR_6' });
  }
  
  return options;
}

/**
 * Check if stair connection is valid and selected
 */
export function isStairConnectionSelected(
  connection: StairConnection | null | undefined
): boolean {
  return connection !== null && connection !== undefined && 
    connection.from !== undefined && connection.to !== undefined;
}

/**
 * Get default stair connection for a property
 * Default to Floor 1 → Floor 2
 */
export function getDefaultStairConnection(): StairConnection {
  return { from: 'FLOOR_1', to: 'FLOOR_2' };
}

/**
 * Compare two stair connections for equality
 */
export function stairConnectionsEqual(
  a: StairConnection | null | undefined,
  b: StairConnection | null | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.from === b.from && a.to === b.to;
}

// ============= DEV-ONLY VALIDATION =============

interface FloorValidationIssue {
  area: string;
  issue: string;
}

/**
 * Validate floor selections for all areas (DEV mode only)
 * Returns array of issues - empty array means all valid
 * 
 * Call this in useEffect when debugging floor selection issues
 */
export function validateFloorSelections(
  propertyFloors: number,
  roomFloorLocations: Record<string, number | null>,
  hallwayFloorLevels: (number | null)[],
  stairConnection: StairConnection | null
): FloorValidationIssue[] {
  // Skip validation for single-floor properties
  if (propertyFloors < 2) return [];

  const issues: FloorValidationIssue[] = [];

  // Validate core room floor locations
  const coreRooms = ['kitchen', 'living', 'dining'];
  for (const room of coreRooms) {
    const floor = roomFloorLocations[room];
    if (!isFloorSelected(floor)) {
      issues.push({
        area: room,
        issue: `Missing floor selection for ${room}`
      });
    }
  }

  // Validate hallway floor levels
  hallwayFloorLevels.forEach((level, index) => {
    if (!isFloorSelected(level)) {
      issues.push({
        area: `hallway_${index}`,
        issue: `Missing floor selection for Hallway ${index + 1}`
      });
    }
  });

  // Validate stair connection (special case)
  if (!isStairConnectionSelected(stairConnection)) {
    issues.push({
      area: 'stairs',
      issue: 'Missing stair connection selection'
    });
  }

  return issues;
}
