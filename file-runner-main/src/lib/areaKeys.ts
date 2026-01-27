/**
 * Area Keys — Single Source of Truth for ID Mapping
 * 
 * Registry uses snake_case: studio_main_space
 * Context uses camelCase: studioMainSpace
 * 
 * This module provides explicit mappings — NO regex heuristics.
 */

// Canonical registry keys (snake_case)
export const AREA = {
  STUDIO_MAIN_SPACE: 'studio_main_space',
  LIVING: 'living',
  DINING: 'dining',
  BEDROOMS: 'bedrooms',
  HALLWAYS: 'hallways',
  STAIRS: 'stairs',
  OFFICE: 'office',
  LAUNDRY: 'laundry',
  GARAGE: 'garage',
  PATIO: 'patio',
  MUDROOM: 'mudroom',
  DEN: 'den',
  KITCHEN: 'kitchen',
  HOME_ENTRY: 'home_entry',
} as const;

export type AreaRegistryKey = typeof AREA[keyof typeof AREA];

// Registry key → Context key (for accessing HomeMappingAreas)
export const REGISTRY_TO_CONTEXT: Record<string, string> = {
  'studio_main_space': 'studioMainSpace',
  'living': 'living',
  'dining': 'dining',
  'bedrooms': 'bedrooms',
  'hallways': 'hallways',
  'stairs': 'stairs',
  'office': 'office',
  'laundry': 'laundry',
  'garage': 'garage',
  'patio': 'patio',
  'mudroom': 'mudroom',
  'den': 'den',
  'kitchen': 'kitchen',
  'home_entry': 'homeEntry',
};

// Context key → Registry key (for visibility checks)
export const CONTEXT_TO_REGISTRY: Record<string, string> = {
  'studioMainSpace': 'studio_main_space',
  'living': 'living',
  'dining': 'dining',
  'bedrooms': 'bedrooms',
  'hallways': 'hallways',
  'stairs': 'stairs',
  'office': 'office',
  'laundry': 'laundry',
  'garage': 'garage',
  'patio': 'patio',
  'mudroom': 'mudroom',
  'den': 'den',
  'kitchen': 'kitchen',
  'homeEntry': 'home_entry',
};

/**
 * Convert registry key (snake_case) to context key (camelCase)
 * Example: 'studio_main_space' → 'studioMainSpace'
 */
export function toContextKey(registryKey: string): string {
  return REGISTRY_TO_CONTEXT[registryKey] ?? registryKey;
}

/**
 * Convert context key (camelCase) to registry key (snake_case)
 * Example: 'studioMainSpace' → 'studio_main_space'
 */
export function toRegistryKey(contextKey: string): string {
  return CONTEXT_TO_REGISTRY[contextKey] ?? contextKey;
}
