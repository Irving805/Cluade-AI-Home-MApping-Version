/**
 * Home Mapping Floor Helpers - Single Source of Truth
 * 
 * Utility functions for extracting unique floor levels from multi-entry sections
 * (Bedrooms, Hallways) for display in toggle headers.
 * 
 * Design Principles:
 * - No new state - derives from existing data
 * - Zero pricing/payload impact - display only
 * - Reusable across components
 */

/**
 * Extract unique floor levels from an array of items with floorLevel property.
 * Used for Hallways which store floorLevel directly on each entry.
 * 
 * @param items - Array of objects with optional floorLevel property
 * @returns Sorted array of unique positive floor numbers
 */
export function extractUniqueFloors(
  items: { floorLevel?: number | null }[]
): number[] {
  return Array.from(
    new Set(
      items
        .map(i => i.floorLevel)
        .filter((f): f is number => typeof f === 'number' && f > 0)
    )
  ).sort((a, b) => a - b);
}

/**
 * Extract unique floors from bedroom floor locations record.
 * Bedrooms use roomFloorLocations.bedrooms which is Record<string, number>.
 * 
 * @param bedroomFloorLocations - Record mapping bedroom IDs to floor numbers
 * @returns Sorted array of unique positive floor numbers
 */
export function extractBedroomFloors(
  bedroomFloorLocations: Record<string, number> | undefined
): number[] {
  if (!bedroomFloorLocations) return [];
  return Array.from(
    new Set(
      Object.values(bedroomFloorLocations).filter(f => typeof f === 'number' && f > 0)
    )
  ).sort((a, b) => a - b);
}

/**
 * Check if any floors are configured for bedrooms
 * Useful for determining lock state
 */
export function hasBedroomFloors(
  bedroomFloorLocations: Record<string, number> | undefined
): boolean {
  return extractBedroomFloors(bedroomFloorLocations).length > 0;
}

/**
 * Check if any floors are configured for hallways
 */
export function hasHallwayFloors(
  hallways: { floorLevel?: number | null }[]
): boolean {
  return extractUniqueFloors(hallways).length > 0;
}
