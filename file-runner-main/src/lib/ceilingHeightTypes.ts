/**
 * Residential Ceiling Height Types & Helpers
 * ⚠️ Different from Commercial CeilingHeight (standard_10ft | high_12_15ft | warehouse_20ft_plus)
 * This is for Detailed Home Mapping residential logistics
 */

import { Language, t } from '@/lib/translations';

// Residential ceiling height options
export type ResidentialCeilingHeight = 'LOW' | 'MEDIUM' | 'HIGH';

export const CEILING_HEIGHT_OPTIONS: ResidentialCeilingHeight[] = ['LOW', 'MEDIUM', 'HIGH'];

// Get translated label (e.g., "Low Ceiling" / "Techo Bajo" / "低天花板")
export function getCeilingLabel(
  height: ResidentialCeilingHeight | null, 
  language: Language
): string {
  if (!height) return t(language, 'ceiling.not_set');
  return t(language, `ceiling.${height.toLowerCase()}`);
}

// Badge label (shorter for header display)
export function getCeilingBadgeLabel(
  height: ResidentialCeilingHeight, 
  language: Language
): string {
  return t(language, `ceiling.badge.${height.toLowerCase()}`);
}

// Premium badge classes - violet to distinguish from floor badges (primary red)
export const CEILING_BADGE_CLASS = 
  "px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/90 text-white shadow-sm whitespace-nowrap";

// Time buffer for future pricing (ladder work for high ceilings)
// Default 0 for now — reserved for operational enhancement
export function getCeilingTimeBuffer(height: ResidentialCeilingHeight | null): number {
  switch (height) {
    case 'HIGH': return 0; // Future: +15 min for ladder work
    case 'MEDIUM': return 0;
    case 'LOW': return 0;
    default: return 0;
  }
}
