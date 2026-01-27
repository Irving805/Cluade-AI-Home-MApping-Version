/**
 * Summary Types — Single Source of Truth Type Definitions
 * 
 * All derived data flows through these types.
 * UI components, Review, PDF, and Payloads consume these structures.
 * 
 * RULE: Store keys + params, NOT pre-translated strings.
 */

import type { ServiceMode, Situation, RecurringStartMode, MoveContext } from '@/contexts/BookingContext';
import type { ConditionFeeBreakdownItem, AreaConditionLevel } from '@/lib/areaConditionFees';
import type { MappedAreaKey } from '@/lib/homeMappingPricing';

// ============= VISIBILITY =============

export type ServiceAreaKey = 
  | 'homeEntry' 
  | 'kitchen' 
  | 'living' 
  | 'studioMainSpace'  // NEW: Replaces living/dining/bedrooms for studios
  | 'dining' 
  | 'hallways' 
  | 'stairs'
  | 'bedrooms' 
  | 'bathrooms'
  | 'windows'
  | 'addons'
  | 'microServices'
  // Utility Areas
  | 'office' 
  | 'laundry' 
  | 'garage' 
  | 'patio'
  // Premium Spaces
  | 'mudroom' 
  | 'den'
  // Additional Structures
  | 'guestHouses'
  | 'artStudios'
  | 'poolHouses';

export interface AreaVisibility {
  visible: boolean;
  reason: string;
  /** If true, area is shown with "if applicable" note (ambiguous cases) */
  softGate?: boolean;
  /** If true, show toggle "I have this" for user confirmation */
  confirmationNeeded?: boolean;
}

export interface VisibilityResult {
  areas: Record<ServiceAreaKey, AreaVisibility>;
  showStructures: boolean;
  showHallways: boolean;
  showStairs: boolean;
  showPremiumSpaces: boolean;
  showUtilityAreas: boolean;
  showEntryZone: boolean;
  showStudioMainSpace: boolean;  // For studio properties
  isStudio: boolean;
  isOneBedroom: boolean;  // For 1BR property detection (dining/office hidden)
  isMultiFloor: boolean;
}

// ============= TOTALS =============

export interface PricingTotals {
  grandTotal: number;
  basePrice: number;
  bathroomTotal: number;
  conditionFee: number;
  // Area-specific condition fee breakdown (null if using legacy blanket fee)
  conditionFeeBreakdown: ConditionFeeBreakdownItem[] | null;
  conditionFeeCapApplied: boolean;
  conditionFeeFloorApplied: boolean;
  conditionFeeLevel: AreaConditionLevel | null;  // Global level when area-specific
  addonsTotal: number;
  microServicesTotal: number;
  windowsTotal: number;
  hallwaysTotal: number;
  stairsTotal: number;
  verticalSurcharge: number;
  patioTotal: number;
  structuresTotal: number;
  utilityAreasTotal: number;
  premiumSpacesTotal: number;
  livingAreasTotal: number;
  studioMainSpaceTotal: number;  // Studio combined living/sleeping/dining
  kitchenAddonsTotal: number;    // Kitchen room-specific addons (fridge, cabinets, etc.)
  frequencyDiscount: { label: string; percent: number; amount: number } | null;
  // PHASE 4: Partial Empty discount for MOVING flow
  partialEmptyDiscount?: number;
  partialEmptyRemovedZones?: string[];
}

export interface RecurringInfo {
  isRecurring: boolean;
  firstVisitPrice: number | null;
  futureVisitsPrice: number | null;
  startMode: RecurringStartMode;
  frequencyLabel: string | null;
}

// ============= TIME METRICS =============

export interface TimeMetrics {
  manHours: number;
  clockHours: number;
  teamSize: number;
  estimateMin: number;
  estimateMax: number;
  addonMinutes: number;
  hazardMinutes: number;
  structureMinutes: number;
}

// ============= LINE ITEMS =============

export type LineItemSection = 
  | 'core' 
  | 'bathroom' 
  | 'bedroom'
  | 'addons' 
  | 'microServices'
  | 'windows' 
  | 'hallways' 
  | 'stairs'
  | 'premium' 
  | 'utility' 
  | 'structures'
  | 'logistics';

export interface SummaryLineItem {
  id: string;
  section: LineItemSection;
  order: number;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  enabled: boolean;
  price: number;
  timeMinutes: number;
  detailKeys: Array<{ key: string; params?: Record<string, string | number> }>;
  isFree?: boolean;
  // NEW: Scope + Origin for per-space SSOT
  scope?: 'global' | `space:${string}`;
  origin?: 'included' | 'selected';
}

// ============= SECTION BLOCKS =============

export interface ReviewSectionBlock {
  id: string;
  sectionKey: string;
  order: number;
  items: SummaryLineItem[];
  totalPrice: number;
  totalTime: number;
}

export interface PdfSectionBlock {
  id: string;
  title: string;
  items: Array<{ label: string; value: string; price?: number }>;
}

// ============= HOME ENTRY SUMMARY =============

export interface HomeEntrySummary {
  propertyType: string | null;
  accessMethod: string | null;
  entryZoneStyle: string | null;
  entryZoneFloor: string | null;
  features: string[];
  parkingNotes: string;
  arrivalInstructions: string;
}

// ============= PREMIUM SPACES SUMMARY =============

export interface PremiumSpacesSummary {
  mudroom: { enabled: boolean; size: string; price: number; time: number } | null;
  den: { enabled: boolean; size: string; price: number; time: number; primaryUse: string } | null;
  totalPrice: number;
  totalTime: number;
}

// ============= UTILITY AREAS SUMMARY =============

export interface UtilityAreasSummary {
  office: { enabled: boolean; size: string; price: number; time: number } | null;
  laundry: { enabled: boolean; type: string; size: string; price: number; time: number } | null;
  garage: { enabled: boolean; capacity: number; price: number; time: number } | null;
  patio: { enabled: boolean; type: string; size: string; price: number; time: number } | null;
  totalPrice: number;
  totalTime: number;
}

// ============= PAYLOAD =============

export interface StructuredPayload {
  // Core identifiers
  quoteId: string;
  leadStatus: 'partial' | 'completed';
  
  // Service info
  serviceType: string;
  serviceMode: ServiceMode;
  situation: Situation;
  moveContext: MoveContext;
  
  // Totals
  estimatedTotal: number;
  estimatedTotalDisplay: string;
  
  // Home Entry
  homeEntry: HomeEntrySummary;
  
  // Premium Spaces
  premiumSpaces: PremiumSpacesSummary;
  
  // Utility Areas
  utilityAreas: UtilityAreasSummary;
  
  // Time
  timeMetrics: TimeMetrics;
}

export interface FlattenedPayload {
  [key: string]: string | number | boolean | null;
}

// ============= PER-SPACE MAPPING (NEW SSOT BLOCKS) =============

export interface SpaceMappingAddon {
  addonId: string;
  label: string;
  price: number;
  qty: number;
  origin: 'included' | 'selected';
}

export interface SpaceMappingItem {
  spaceKey: string;
  displayName: string;
  floorType: string | null;
  floorLevel: number | null;
  isExcluded: boolean;
  origin: 'included' | 'selected';
  addons: SpaceMappingAddon[];
}

export interface HallwayMappingItem {
  id: string;
  label: string;
  sizeTier: string;
  floorType: string | null;
  floorLevel: number | null;
  cabinetCount: number;
  price: number;
  timeMinutes: number;
}

export interface StairMappingItem {
  id: string;
  label: string;
  surfaceType: string;
  stepCount: number;
  connection: string | null;
  price: number;
  timeMinutes: number;
}

export interface DetailedMappingBlock {
  spaces: SpaceMappingItem[];
  excludedSpaces: string[];
  hallways: HallwayMappingItem[];
  stairs: StairMappingItem[];
  hallwayCount: number;
  stairCount: number;
}

// ============= COMPLETE SUMMARY =============

export interface BookingSummary {
  totals: PricingTotals;
  recurring: RecurringInfo;
  timeMetrics: TimeMetrics;
  visibility: VisibilityResult;
  lineItems: SummaryLineItem[];
  sectionBlocks: {
    review: ReviewSectionBlock[];
    pdf: PdfSectionBlock[];
    homeEntry: HomeEntrySummary;
    premiumSpaces: PremiumSpacesSummary;
    utilityAreas: UtilityAreasSummary;
    detailedMapping: DetailedMappingBlock;  // NEW: SSOT for per-space data
  };
  payload: {
    structured: StructuredPayload;
    flattened: FlattenedPayload;
  };
}
