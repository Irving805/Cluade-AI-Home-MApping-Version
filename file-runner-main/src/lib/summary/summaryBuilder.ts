/**
 * Summary Builder — THE Single Source of Truth
 * 
 * This orchestrator computes ALL derived data ONCE.
 * Every consumer (UI, Review, PDF, Payload) reads from this result.
 * 
 * RULE: No component should calculate totals/time/visibility independently.
 */

import type { 
  BookingFormData, 
  ServiceMode, 
  Situation,
  Addon,
  MicroServiceSelection,
  RecurringStartMode,
  HomeEntryConfig
} from '@/contexts/BookingContext';
import type { BookingSummary } from './types';

import { computeVisibility } from './visibility';
import { computePricing, computeRecurring } from './pricing';
import { computeTimeMetrics, computeHourlyTimeMetrics } from './time';
import { 
  buildLineItems, 
  buildReviewBlocks, 
  buildPdfBlocks,
  buildHomeEntrySummary,
  buildPremiumSpacesSummary,
  buildUtilityAreasSummary,
  buildDetailedMappingBlock
} from './sections';
import { buildPayloads } from './payload';

// ============= MAIN BUILDER =============

export function buildBookingSummary(
  formData: BookingFormData,
  mode: ServiceMode,
  situation: Situation,
  selectedAddons: Addon[],
  selectedMicroServices: MicroServiceSelection[],
  recurringStartMode: RecurringStartMode,
  homeEntry: HomeEntryConfig | undefined,
  isHourlyMode: boolean = false
): BookingSummary {
  // 1. Compute visibility ONCE
  const visibility = computeVisibility(formData, situation, homeEntry);
  
  // 2. Compute pricing ONCE
  const totals = computePricing(
    formData,
    mode,
    situation,
    selectedAddons,
    selectedMicroServices,
    visibility
  );
  
  // 3. Compute time metrics ONCE
  const timeMetrics = isHourlyMode
    ? computeHourlyTimeMetrics(formData)
    : computeTimeMetrics(formData, selectedMicroServices, visibility, totals);
  
  // 4. Compute recurring info
  const recurring = computeRecurring(formData, totals, recurringStartMode);
  
  // 5. Build line items ONCE (pass selectedAddons for SSOT)
  const lineItems = buildLineItems(formData, visibility, totals, homeEntry, selectedAddons);
  
  // 6. Build section summaries
  const homeEntrySummary = buildHomeEntrySummary(homeEntry);
  const premiumSpacesSummary = buildPremiumSpacesSummary(formData, visibility);
  const utilityAreasSummary = buildUtilityAreasSummary(formData, visibility);
  
  // 7. Build detailed mapping block (NEW SSOT for per-space data)
  const detailedMapping = buildDetailedMappingBlock(formData, visibility);
  
  // 8. Build section blocks
  const reviewBlocks = buildReviewBlocks(lineItems);
  const pdfBlocks = buildPdfBlocks(formData, lineItems, homeEntry, totals);
  
  // 9. Build payloads
  const payload = buildPayloads(
    formData,
    mode,
    situation,
    totals,
    timeMetrics,
    visibility,
    lineItems,
    homeEntry,
    homeEntrySummary,
    premiumSpacesSummary,
    utilityAreasSummary
  );
  
  return {
    totals,
    recurring: {
      isRecurring: recurring.isRecurring,
      firstVisitPrice: recurring.firstVisitPrice,
      futureVisitsPrice: recurring.futureVisitsPrice,
      startMode: recurring.startMode as RecurringStartMode,
      frequencyLabel: recurring.frequencyLabel,
    },
    timeMetrics,
    visibility,
    lineItems,
    sectionBlocks: {
      review: reviewBlocks,
      pdf: pdfBlocks,
      homeEntry: homeEntrySummary,
      premiumSpaces: premiumSpacesSummary,
      utilityAreas: utilityAreasSummary,
      detailedMapping,  // NEW: SSOT for per-space floor types and addons
    },
    payload,
  };
}

// Re-export types for convenience
export type { BookingSummary } from './types';
