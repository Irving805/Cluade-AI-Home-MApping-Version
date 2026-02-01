/**
 * Time Engine — Single Source of Truth for Time Estimates
 * 
 * Computes man-hours, clock-hours, and team size.
 * All time displays across the app should use these values.
 */

import type { 
  BookingFormData, 
  MicroServiceSelection 
} from '@/contexts/BookingContext';
import type { TimeMetrics, VisibilityResult, PricingTotals } from './types';
import { 
  calculateEstimatedTime,
  getStairHazardBuffer,
  getHallwayHazardBuffer,
  getBedroomHazardBuffer,
  getDiningHazardBuffer,
  getLivingHazardBuffer,
  getIncludedBedroomCount,
  calculateDecomposedBaseTime,
  BATH_TIME,
} from '@/lib/pricing_v2';
import { microServices, ADDON_TIMES } from '@/lib/pricing';
import { HOURLY_CONFIG } from '@/lib/pricing';
import { calculateAllMappedAreas } from '@/lib/homeMappingPricing';
import { calculateTotalBathroomLogisticsTime } from '@/lib/bathroomLogisticsTime';
import { 
  calculateConditionTimeImpact,
  type AreaConditionLevel,
  type AreaConditionSelection,
} from '@/lib/areaConditionFees';

// ============= MAIN TIME FUNCTION =============

export function computeTimeMetrics(
  formData: BookingFormData,
  selectedMicroServices: MicroServiceSelection[],
  visibility: VisibilityResult,
  totals: PricingTotals
): TimeMetrics {
  const isDeep = formData.baseServiceLevel === 'Deep Clean' || 
                 formData.baseServiceLevel === 'Move-In/Out';
  
  // === ADDON LABOR MINUTES ===
  let addonMinutes = 0;
  
  // Room-based addons
  const ra = formData.roomAddons;
  if (ra) {
    (['kitchen', 'living', 'dining', 'hallways'] as const).forEach(roomId => {
      (ra[roomId] || []).forEach(addon => {
        const time = ADDON_TIMES[addon.addonId] || 15;
        addonMinutes += time * addon.quantity;
      });
    });
    Object.values(ra.bedrooms || {}).forEach(addons => {
      addons.forEach(addon => {
        const time = ADDON_TIMES[addon.addonId] || 15;
        addonMinutes += time * addon.quantity;
      });
    });
  }
  
  // Micro-services
  selectedMicroServices.forEach(ms => {
    const service = microServices.find(s => s.id === ms.id);
    if (service) {
      const first = service.estimatedMinutesFirst || 0;
      const add = service.estimatedMinutesAdd || 0;
      addonMinutes += first + (Math.max(0, ms.quantity - 1) * add);
    }
  });
  
  // === HAZARD MINUTES ===
  let hazardMinutes = 0;
  
  // SSOT: Gate stairs by enabled boolean (Partial Empty freeze toggle)
  const stairsEnabled = (formData as any).stairsEnabled !== false;
  
  // SSOT: Stair hazard from formData.stairs[] (multi-stair array)
  const stairsArray = formData.stairs || [];
  if (visibility.showStairs && stairsEnabled && stairsArray.length > 0) {
    stairsArray.forEach((stair) => {
      if (stair.cornerBuildup) hazardMinutes += 12;
      if (stair.petHairAccumulation) hazardMinutes += 10;
      if (stair.slipHazards) hazardMinutes += 5;
      if (stair.railingsDetail) hazardMinutes += 18;
    });
  }
  
  // SSOT: Gate hallways by enabled boolean (Partial Empty freeze toggle)
  const hallwaysEnabled = (formData as any).hallwaysEnabled !== false;
  
  // Hallway hazard
  if (visibility.showHallways && hallwaysEnabled && formData.hallwaysConfig?.enabled) {
    hazardMinutes += getHallwayHazardBuffer(formData.hallwaysConfig);
  }
  
  // Bedroom hazard
  if (formData.bedroomHazards) {
    hazardMinutes += getBedroomHazardBuffer(formData.bedroomHazards);
  }
  
  // PHASE 1B: Gate Dining hazards by excludedSpaces (Partial Empty MOVING)
  // Mirror living room gating pattern for SSOT consistency
  const isDiningExcluded = (formData.excludedSpaces || []).includes('dining');
  if (!isDiningExcluded) {
    const diningMessTypes = (formData.roomMessTypes as any)?.dining || [];
    const diningStickySpills = (formData.roomStickySpills as any)?.dining || false;
    hazardMinutes += getDiningHazardBuffer(diningMessTypes, diningStickySpills);
  }
  
  // SSOT: Gate living hazards by excludedSpaces (Partial Empty)
  const isLivingExcluded = (formData.excludedSpaces || []).includes('living');
  if (!isLivingExcluded) {
    const livingMessTypes = (formData.roomMessTypes as any)?.living || [];
    const livingStickySpills = (formData.roomStickySpills as any)?.living || false;
    hazardMinutes += getLivingHazardBuffer(livingMessTypes, livingStickySpills);
  }
  
  // === STRUCTURE MINUTES ===
  let structureMinutes = 0;
  if (visibility.showStructures) {
    // Guest houses, art studios, pool houses add transit time
    const guestHouseCount = formData.guestHouseCount || 0;
    const studioCount = formData.studioCount || 0;
    const poolHouseCount = formData.poolHouseCount || 0;
    
    // Each detached structure adds ~10 min transit
    const guestConfigs = formData.guestHouseConfigs || [];
    const studioConfigs = formData.artStudioConfigs || [];
    const detachedCount = 
      (Array.isArray(guestConfigs) ? guestConfigs.filter(c => c.attachment === 'detached').length : 0) +
      (Array.isArray(studioConfigs) ? studioConfigs.filter(c => c.attachment === 'detached').length : 0);
    
    structureMinutes += detachedCount * 10;
    
    // Base cleaning time per structure
    structureMinutes += guestHouseCount * 45; // ~45 min per guest house
    structureMinutes += studioCount * 30;     // ~30 min per art studio
    structureMinutes += poolHouseCount * 20;  // ~20 min per pool house
  }
  
  // === UTILITY/PREMIUM AREA MINUTES ===
  let mappedAreaMinutes = 0;
  if (formData.homeMapping?.areas) {
    const mappedResult = calculateAllMappedAreas(
      formData.homeMapping.areas,
      isDeep
    );
    mappedAreaMinutes = mappedResult.totalTimeMinutes;
  }
  
  // === BATHROOM LOGISTICS EXTRA TIME ===
  // This is EXTRA time from operational signals (toiletScale, tubScale, etc.)
  // Base bathroom time comes from calculateEstimatedTime via SSOT
  let bathroomLogisticsMinutes = 0;
  if (formData.bathroomInventory?.bathrooms) {
    bathroomLogisticsMinutes = calculateTotalBathroomLogisticsTime(
      formData.bathroomInventory.bathrooms
    );
  }
  
  // === CONDITION EXTRA MINUTES (PHASE 2) ===
  // Property condition impacts time, not just price
  let conditionExtraMinutes = 0;
  const areaConditionEnabled = (formData as any).areaConditionEnabled === true;
  const globalConditionLevel = (formData as any).globalConditionLevel as AreaConditionLevel | undefined;
  const areaConditionSelections = (formData as any).areaConditionSelections as AreaConditionSelection[] | undefined;

  if (areaConditionEnabled && globalConditionLevel && globalConditionLevel !== 'normal' && areaConditionSelections) {
    conditionExtraMinutes = calculateConditionTimeImpact(areaConditionSelections, globalConditionLevel);
  }
  
  // === BASE TIME ESTIMATE ===
  const totalAddonMinutes = addonMinutes + hazardMinutes + mappedAreaMinutes + bathroomLogisticsMinutes + conditionExtraMinutes;
  
  // === SSOT: Derive included bedroom count for time calculation ===
  const includedBedroomCount = getIncludedBedroomCount(
    formData.homeSize,
    formData.skippedBedrooms || []
  );
  
  // === PHASE 3: Detect MOVING flow with exclusions ===
  const isMovingFlow = formData.baseServiceLevel === 'Move-In/Out';
  const excludedSpaces = formData.excludedSpaces || [];
  const hasExclusions = excludedSpaces.length > 0;
  
  let baseEstimate: { min: number; max: number; display: string } | null = null;
  
  if (isMovingFlow && hasExclusions) {
    // MOVING with exclusions: Use decomposed base time for accurate zone-level subtraction
    const decomposedMinutes = calculateDecomposedBaseTime(
      includedBedroomCount,
      excludedSpaces,
      isDeep
    );
    
    // Add bathroom time separately (bathrooms are NEVER excluded)
    const bathroomMinutes = 
      (formData.masterBaths * (isDeep ? BATH_TIME.master.deep : BATH_TIME.master.std)) +
      (formData.fullBaths * (isDeep ? BATH_TIME.full.deep : BATH_TIME.full.std)) +
      (formData.halfBaths * (isDeep ? BATH_TIME.half.deep : BATH_TIME.half.std));
    
    // Total base hours (decomposed + bathrooms + addons)
    const baseHours = (decomposedMinutes + bathroomMinutes + totalAddonMinutes) / 60;
    
    // Create range (±0.3 hr buffer)
    baseEstimate = {
      min: Math.max(2, baseHours - 0.3),
      max: baseHours + 0.3,
      display: `${Math.round((baseHours - 0.3) * 10) / 10}-${Math.round((baseHours + 0.3) * 10) / 10}`,
    };
  } else {
    // Standard path: Use existing calculateEstimatedTime
    baseEstimate = calculateEstimatedTime({
      homeSize: includedBedroomCount,  // SSOT: Use derived count, not raw homeSize
      masterBaths: formData.masterBaths,
      fullBaths: formData.fullBaths,
      halfBaths: formData.halfBaths,
      isDeep,
      officeCount: formData.officeCount || 0,
      laundryCount: formData.laundryRoomCount || 0,
      loftCount: formData.loftCount || 0,
      garageCount: formData.garageCount || 0,
      addonMinutes: totalAddonMinutes,
      // SSOT: Pass undefined - stair minutes are now calculated directly above
      stairsConfig: undefined,
    });
  }
  
  if (!baseEstimate) {
    return {
      manHours: 0,
      clockHours: 0,
      teamSize: 1,
      estimateMin: 0,
      estimateMax: 0,
      addonMinutes,
      hazardMinutes,
      structureMinutes,
    };
  }
  
  // Add structure minutes to estimate
  const estimateMin = baseEstimate.min + (structureMinutes / 60);
  const estimateMax = baseEstimate.max + (structureMinutes / 60);
  const avgHours = (estimateMin + estimateMax) / 2;
  
  // === TEAM SIZING ===
  // 2 for deep/moving/large jobs, otherwise 1
  const teamSize = (isDeep || avgHours > 3) ? 2 : 1;
  
  return {
    manHours: avgHours,
    clockHours: avgHours / teamSize,
    teamSize,
    estimateMin,
    estimateMax,
    addonMinutes,
    hazardMinutes,
    structureMinutes,
  };
}

/**
 * Compute hourly mode time metrics
 */
export function computeHourlyTimeMetrics(
  formData: BookingFormData
): TimeMetrics {
  const clockHours = Math.max(formData.hourlyHours || 0, HOURLY_CONFIG.MIN_CLOCK_HOURS);
  const teamSize = HOURLY_CONFIG.TEAM_SIZE;
  
  return {
    manHours: clockHours * teamSize,
    clockHours,
    teamSize,
    estimateMin: clockHours,
    estimateMax: clockHours,
    addonMinutes: 0,
    hazardMinutes: 0,
    structureMinutes: 0,
  };
}
