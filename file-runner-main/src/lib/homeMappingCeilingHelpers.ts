/**
 * Home Mapping Ceiling Helpers
 * Extract unique ceiling heights for header badges (same pattern as floor helpers)
 */

import { ResidentialCeilingHeight } from './ceilingHeightTypes';

// Sort order for ceiling badges (LOW → MEDIUM → HIGH)
const CEILING_ORDER: Record<ResidentialCeilingHeight, number> = {
  'LOW': 1,
  'MEDIUM': 2,
  'HIGH': 3,
};

/**
 * Extract unique ceiling heights from a record (bedrooms/hallways)
 * Returns sorted array for consistent badge display
 */
export function extractUniqueCeilings(
  record: Record<string, ResidentialCeilingHeight | null> | undefined
): ResidentialCeilingHeight[] {
  if (!record) return [];
  return Array.from(
    new Set(
      Object.values(record).filter((c): c is ResidentialCeilingHeight => c !== null)
    )
  ).sort((a, b) => CEILING_ORDER[a] - CEILING_ORDER[b]);
}

/**
 * Check if any ceiling heights are configured in a record
 */
export function hasCeilingHeights(
  record: Record<string, ResidentialCeilingHeight | null> | undefined
): boolean {
  return extractUniqueCeilings(record).length > 0;
}
