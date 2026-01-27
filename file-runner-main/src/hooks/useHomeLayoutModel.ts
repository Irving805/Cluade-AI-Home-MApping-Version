/**
 * useHomeLayoutModel — Single Build Point for Property Logistics
 * 
 * CRITICAL: This hook provides the ONE AND ONLY instance of HomeLayoutModel.
 * All components (Map, Review, PDF) MUST consume this hook.
 * 
 * Uses fingerprint-based memoization for bulletproof reactivity:
 * - No stale data on rapid floor changes
 * - Single useMemo = single calculation
 * - Same instance = guaranteed sync across Map/Review/PDF
 */

import { useMemo } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from './useBookingSummary';
import { buildHomeLayoutModel, HomeLayoutModel } from '@/lib/layout/homeLayoutModel';
import { getLogisticsFingerprint } from '@/lib/layout/homeLogisticsResolver';

export function useHomeLayoutModel(): HomeLayoutModel | null {
  const { formData, situation, language } = useBooking();
  const summary = useBookingSummary();
  
  // GATING: Only for residential LIVE_HERE/MOVING flows
  const shouldBuild = situation === 'LIVE_HERE' || situation === 'MOVING';
  
  // FINGERPRINT: Changes when any logistics field changes
  // Calculate total minutes from estimateMin/Max average (stable fallback to 0)
  const summaryMinutes = summary?.timeMetrics 
    ? Math.round((summary.timeMetrics.estimateMin + summary.timeMetrics.estimateMax) / 2 * 60)
    : 0; // Stable fallback prevents fingerprint jumps during transitions
  
  const fingerprint = useMemo(() => {
    if (!shouldBuild) return 'skip';
    return getLogisticsFingerprint(
      formData, 
      situation, 
      language, 
      summaryMinutes
    );
  }, [formData, situation, language, summaryMinutes, shouldBuild]);
  
  // SINGLE BUILD POINT: Memoized by fingerprint only
  // Safe because fingerprint captures ALL inputs that affect the model
  const layoutModel = useMemo(() => {
    if (!shouldBuild || fingerprint === 'skip') return null;
    return buildHomeLayoutModel(formData, summary, situation, language, formData.homeEntry, fingerprint);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
  
  return layoutModel;
}

// Export type for consumers
export type { HomeLayoutModel } from '@/lib/layout/homeLayoutModel';
