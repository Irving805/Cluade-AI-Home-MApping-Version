/**
 * useBookingSummary — React Hook for Single Source of Truth
 * 
 * This hook provides memoized access to the complete booking summary.
 * All UI components should use this instead of calculating independently.
 * 
 * USAGE:
 * const summary = useBookingSummary();
 * // Access: summary.totals, summary.timeMetrics, summary.lineItems, etc.
 */

import { useMemo } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { buildBookingSummary, type BookingSummary } from '@/lib/summary/summaryBuilder';

export function useBookingSummary(): BookingSummary {
  const {
    formData,
    mode,
    situation,
    selectedAddons,
    selectedMicroServices,
    recurringStartMode,
  } = useBooking();
  
  // Get homeEntry from formData
  const homeEntry = formData.homeEntry;
  const isHourlyMode = formData.isHourlyMode || false;
  
  // Memoize the summary - only recalculates when dependencies change
  const summary = useMemo(() => 
    buildBookingSummary(
      formData,
      mode,
      situation,
      selectedAddons,
      selectedMicroServices,
      recurringStartMode,
      homeEntry,
      isHourlyMode
    ),
    [
      formData,
      mode,
      situation,
      selectedAddons,
      selectedMicroServices,
      recurringStartMode,
      homeEntry,
      isHourlyMode,
    ]
  );
  
  return summary;
}

// Export types for consumers
export type { BookingSummary } from '@/lib/summary/summaryBuilder';
export type { 
  PricingTotals, 
  TimeMetrics, 
  VisibilityResult,
  SummaryLineItem,
  ReviewSectionBlock,
  HomeEntrySummary,
  PremiumSpacesSummary,
  UtilityAreasSummary,
} from '@/lib/summary/types';
