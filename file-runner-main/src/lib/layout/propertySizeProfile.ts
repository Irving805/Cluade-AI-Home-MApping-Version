/**
 * Property Size Profile — SSOT for Layout Building
 * 
 * Wraps PropertyContext into a layout-specific profile that determines
 * which baseline zones should exist based on property size and type.
 * 
 * Used by homeLayoutModel.ts to ensure the 2.5D map always reflects
 * the correct zones based on Property Size selections.
 */

import { 
  getPropertyContext, 
  canHaveDining, 
  canHaveBedrooms, 
  shouldShowStudioMainSpace,
  canHaveHallways,
  canHaveStairs,
  PropertyContext,
  PropertyContextInput
} from '@/lib/propertyCategory';
import type { HomeEntryConfig } from '@/contexts/BookingContext';

// ============= TYPES =============

export interface PropertySizeProfile {
  /** True if Studio (homeSize === 0) */
  isStudio: boolean;
  /** Number of bedrooms (0 for studio) */
  bedroomCount: number;
  /** Whether separate dining should exist (2+ bedrooms) */
  showDining: boolean;
  /** Core zones to create: ['kitchen','living','dining'] or ['studio_main'] */
  baseCoreZones: ('kitchen' | 'living' | 'dining' | 'studio_main')[];
  /** Bedroom zone IDs to create: ['bed_0', 'bed_1', ...] */
  baseBedroomZones: string[];
  /** Minimum zones expected for validation */
  expectedMinimumZones: number;
  /** Whether hallways can exist for this property */
  canHaveHallways: boolean;
  /** Whether stairs can exist for this property */
  canHaveStairs: boolean;
  /** Sqft label for display (e.g., "1,200-1,500 sqft") */
  sqftLabel: string | null;
  /** Underlying PropertyContext for debugging */
  context: PropertyContext;
}

// ============= SQFT LABEL MAPPING =============

const SQFT_LABELS: Record<string, string> = {
  'under_800': '< 800',
  '800_1200': '800-1,200',
  '1200_1600': '1,200-1,600',
  '1600_2000': '1,600-2,000',
  '2000_2500': '2,000-2,500',
  '2500_3000': '2,500-3,000',
  '3000_3500': '3,000-3,500',
  '3500_4000': '3,500-4,000',
  '4000_5000': '4,000-5,000',
  'over_5000': '5,000+',
};

function getSqftLabel(sqftRange: string | undefined): string | null {
  if (!sqftRange) return null;
  return SQFT_LABELS[sqftRange] || sqftRange;
}

// ============= MAIN FUNCTION =============

/**
 * Get PropertySizeProfile from form data.
 * This is the SSOT for determining which zones should exist in the layout.
 */
export function getPropertySizeProfile(
  formData: PropertyContextInput,
  homeEntry?: HomeEntryConfig
): PropertySizeProfile {
  const ctx = getPropertyContext(homeEntry, formData);
  
  const isStudio = shouldShowStudioMainSpace(ctx);
  const bedroomCount = ctx.bedroomCount;
  const showDining = canHaveDining(ctx);
  
  // Determine which core zones exist based on SSOT
  let baseCoreZones: PropertySizeProfile['baseCoreZones'];
  if (isStudio) {
    baseCoreZones = ['studio_main'];
  } else {
    baseCoreZones = ['kitchen', 'living'];
    if (showDining) {
      baseCoreZones.push('dining');
    }
  }
  
  // Generate bedroom zone IDs (empty for studio)
  const baseBedroomZones = isStudio 
    ? [] 
    : Array.from({ length: bedroomCount }, (_, i) => `bed_${i}`);
  
  return {
    isStudio,
    bedroomCount,
    showDining,
    baseCoreZones,
    baseBedroomZones,
    expectedMinimumZones: baseCoreZones.length + baseBedroomZones.length,
    canHaveHallways: canHaveHallways(ctx),
    canHaveStairs: canHaveStairs(ctx),
    sqftLabel: getSqftLabel(formData.squareFootageRange),
    context: ctx,
  };
}
