/**
 * Pricing Engine — Single Source of Truth for All Price Calculations
 * 
 * Computes all pricing breakdowns based on formData and visibility.
 * NO component should calculate prices independently.
 */

import type { 
  BookingFormData, 
  Addon, 
  MicroServiceSelection,
  Situation,
  ServiceMode
} from '@/contexts/BookingContext';
import type { PricingTotals, VisibilityResult } from './types';
import type { ConditionFeeBreakdownItem, AreaConditionLevel } from '@/lib/areaConditionFees';
import { calculateBathroomInventoryTotals } from '@/lib/bathroomPricing';
import { getBathroomPricingTier, isDeepCleanLevel } from '@/lib/pricingTier';
import { 
  calculateComponentPrice, 
  HOME_BASE_RATES,
  calculateLivingAreasTotal,
  calculateVerticalSurcharge,
  calculatePatioTotal,
  calculateAdditionalStructuresTotal,
  getIncludedBedroomCount,
} from '@/lib/pricing_v2';
import { calcHallwaySummary, calculateHallwaysTotalFees } from '@/lib/pricing_hallways';
import { calculateAllMappedAreas, calculateAllUtilityAreasTotal, calculateStudioMainSpaceArea } from '@/lib/homeMappingPricing';
import { calculateRoomWindowTotal } from '@/lib/roomWindowConfig';
import { isHallwayRoomId } from '@/lib/windows/roomIds';
import { 
  addonPrices, 
  microServices, 
  calculateMicroServicePrice,
  FREQUENCY_MULTIPLIERS,
  MICRO_SERVICES_MINIMUM 
} from '@/lib/pricing';
import { calculateKitchenAddonsTotal } from '@/lib/pricing_kitchen';
import { getKitchenSectionToggles } from '@/lib/kitchenSectionToggles';
import { 
  shouldEnableAreaConditionFees, 
  calculateAreaConditionFee 
} from '@/lib/areaConditionFees';
import { getRoomDisplayName } from '@/lib/areaConditionNormalization';
import { calculatePartialEmptyDiscount } from '@/lib/partialEmptyDiscount';

// ============= FREQUENCY DISCOUNT LABELS =============

const FREQUENCY_LABELS: Record<string, { label: string; percent: number }> = {
  weekly: { label: 'Weekly', percent: 20 },
  biweekly: { label: 'Bi-Weekly', percent: 15 },
  monthly: { label: 'Monthly', percent: 10 },
};

// ============= MAIN PRICING FUNCTION =============

export function computePricing(
  formData: BookingFormData,
  mode: ServiceMode,
  situation: Situation,
  selectedAddons: Addon[],
  selectedMicroServices: MicroServiceSelection[],
  visibility: VisibilityResult
): PricingTotals {
  // isDeep is used for NON-BATHROOM pricing (base price, living areas, structures, etc.)
  const isDeep = isDeepCleanLevel(formData.baseServiceLevel);
  
  // BATHROOM TIER uses separate SSOT - "Move-In/Out" does NOT force deep tier for bathrooms
  const bathroomTier = getBathroomPricingTier(formData.baseServiceLevel, situation);
  
  // === SSOT: Derive included bedroom count for base pricing ===
  const includedBedroomCount = getIncludedBedroomCount(
    formData.homeSize,
    formData.skippedBedrooms || []
  );
  
  // === BASE PRICE (without bathrooms - they're calculated separately) ===
  const componentResult = calculateComponentPrice({
    homeSize: includedBedroomCount,  // SSOT: Use derived count, not raw homeSize
    masterBaths: 0,  // Set to 0 - bathroom pricing is done via inventory below
    fullBaths: 0,
    halfBaths: 0,
    serviceType: formData.serviceType,
    conditionFee: formData.conditionFee,
    includeCabinets: false,
  });
  
  const basePrice = componentResult.basePrice;
  
  // === CONDITION FEE (Area-Specific OR Legacy Blanket) ===
  let conditionFee = 0;
  let conditionFeeBreakdown: ConditionFeeBreakdownItem[] | null = null;
  let conditionFeeCapApplied = false;
  let conditionFeeFloorApplied = false;
  let conditionFeeLevel: AreaConditionLevel | null = null;

  const useAreaSpecific = shouldEnableAreaConditionFees(situation, formData.baseServiceLevel)
    && (formData as any).areaConditionEnabled === true
    && (formData as any).globalConditionLevel !== 'normal';

  if (useAreaSpecific) {
    // Area-specific: compute from selections (if empty → $0, NOT fallback to legacy)
    const selections = (formData as any).areaConditionSelections || [];
    const globalLevel = (formData as any).globalConditionLevel as AreaConditionLevel;
    
    if (selections.length > 0) {
      const result = calculateAreaConditionFee(
        selections,
        globalLevel,
        (roomId: string) => getRoomDisplayName(roomId, formData)
      );
      conditionFee = result.totalFee;
      conditionFeeBreakdown = result.breakdown;
      conditionFeeCapApplied = result.capApplied;
      conditionFeeFloorApplied = result.floorApplied;
      conditionFeeLevel = globalLevel;
    }
    // else: conditionFee stays 0 (user enabled but hasn't selected areas yet)
  } else {
    // Legacy blanket fee
    conditionFee = formData.conditionFee || 0;
  }
  
  // === BATHROOM TOTAL (SSOT from inventory) ===
  // Uses bathroomTier which is 'std' for LIVE_HERE and MOVING flows
  const bathroomResult = calculateBathroomInventoryTotals(
    formData.bathroomInventory,
    formData.masterBaths,
    formData.fullBaths,
    formData.halfBaths,
    bathroomTier  // Using tier, not boolean
  );
  const bathroomTotal = bathroomResult.totalPrice;
  
  // === ADDONS TOTAL ===
  let addonsTotal = 0;
  selectedAddons.forEach(addon => {
    const addonId = (addon as any).id || (addon as any).addonId;
    const price = addonPrices[addonId] || 0;
    addonsTotal += price * addon.quantity;
  });
  
  // === MICRO SERVICES TOTAL ===
  let microServicesTotal = 0;
  selectedMicroServices.forEach(ms => {
    const service = microServices.find(s => s.id === ms.id);
    if (service) {
      microServicesTotal += calculateMicroServicePrice(service, ms.quantity);
    }
  });
  // Apply minimum if any micro services selected
  if (selectedMicroServices.length > 0 && microServicesTotal < MICRO_SERVICES_MINIMUM) {
    microServicesTotal = MICRO_SERVICES_MINIMUM;
  }
  
  // === WINDOWS TOTAL (exclude hallway windows to avoid double-counting) ===
  // SSOT: Get kitchen section toggles
  const kitchenToggles = getKitchenSectionToggles(formData);
  
  // SSOT: Derive excludedSpaces ONCE for window gating (Partial Empty MOVING flow)
  const excludedSpaces = formData.excludedSpaces || [];
  const isKitchenExcludedForWindows = excludedSpaces.includes('kitchen');
  const isLivingExcludedForWindows = excludedSpaces.includes('living');
  const isDiningExcludedForWindows = excludedSpaces.includes('dining');
  
  let windowsTotal = 0;
  let hallwayWindowsTotal = 0;
  if (visibility.areas.windows.visible && formData.roomWindowSelections) {
    // Separate hallway windows from other rooms
    // SSOT: Filter out windows for excluded spaces (Partial Empty) + toggle gates
    const nonHallwaySelections = formData.roomWindowSelections.filter(r => {
      // PHASE 1A: Gate by excludedSpaces for Partial Empty (MOVING)
      if (r.roomId === 'kitchen' && isKitchenExcludedForWindows) return false;
      if (r.roomId === 'living' && isLivingExcludedForWindows) return false;
      if (r.roomId === 'dining' && isDiningExcludedForWindows) return false;
      // Handle combined living_dining roomId (exclude if either is excluded)
      if (r.roomId === 'living_dining' && (isLivingExcludedForWindows || isDiningExcludedForWindows)) return false;
      // Existing toggle gate: Exclude kitchen windows if toggle is OFF
      if (r.roomId === 'kitchen' && !kitchenToggles.windowInventory) return false;
      return !isHallwayRoomId(r.roomId);
    });
    const hallwayWindowSelections = formData.roomWindowSelections.filter(
      r => isHallwayRoomId(r.roomId)
    );
    
    // Non-hallway windows go to windowsTotal
    const windowResult = calculateRoomWindowTotal(nonHallwaySelections);
    windowsTotal = windowResult.windowPrice + windowResult.blindsPrice;
    
    // Hallway windows go to hallwaysTotal (calculated below)
    if (hallwayWindowSelections.length > 0) {
      const hallwayWindowResult = calculateRoomWindowTotal(hallwayWindowSelections);
      hallwayWindowsTotal = hallwayWindowResult.windowPrice + hallwayWindowResult.blindsPrice;
    }
  }
  
  // === HALLWAYS TOTAL (cabinets + org + hallway windows/blinds) ===
  // SSOT: Gate hallways by enabled boolean + array length (Partial Empty freeze toggle)
  let hallwaysTotal = 0;
  const hallwaysEnabled = (formData as any).hallwaysEnabled !== false;
  if (visibility.showHallways && hallwaysEnabled && formData.hallways && formData.hallways.length > 0) {
    // SSOT: Use centralized calculation function for cabinet/org fees
    const isDeepClean = isDeepCleanLevel(formData.baseServiceLevel);
    hallwaysTotal = calculateHallwaysTotalFees(formData.hallways, situation, isDeepClean);
    
    // Add hallway windows/blinds to hallwaysTotal
    hallwaysTotal += hallwayWindowsTotal;
  }
  
  // === STAIRS TOTAL (if visible) - SSOT: formData.stairs[] ===
  // SSOT: Gate stairs by enabled boolean + array length (Partial Empty freeze toggle)
  let stairsTotal = 0;
  const stairsEnabled = (formData as any).stairsEnabled !== false;
  const stairsArray = formData.stairs || [];
  if (visibility.showStairs && stairsEnabled && stairsArray.length > 0) {
    // Stairs pricing is typically included in vertical surcharge
    // but we track it separately if needed (logistics-first approach)
    stairsTotal = 0; // Currently no separate stair pricing
  }
  
  // === VERTICAL SURCHARGE ===
  let verticalSurcharge = 0;
  if (formData.propertyType) {
    const vertical = calculateVerticalSurcharge({
      propertyType: formData.propertyType,
      houseLevels: formData.houseLevels || 1,
      apartmentFloor: formData.apartmentFloor || 1,
      hasElevator: formData.hasElevator !== false,
    });
    verticalSurcharge = vertical.surcharge;
  }
  
  // === PATIO TOTAL (if visible) ===
  let patioTotal = 0;
  if (visibility.areas.patio.visible && formData.patioCount) {
    const patio = calculatePatioTotal(
      formData.patioCount,
      formData.patioScope || 'sweep'
    );
    patioTotal = patio.price;
  }
  
  // === ADDITIONAL STRUCTURES (if visible) ===
  let structuresTotal = 0;
  if (visibility.showStructures) {
    const structures = calculateAdditionalStructuresTotal({
      guestHouseCount: formData.guestHouseCount || 0,
      artStudioCount: formData.studioCount || 0,
      poolHouseCount: formData.poolHouseCount || 0,
      isDeepClean: isDeep,
      guestHouseConfigs: formData.guestHouseConfigs,
      artStudioConfigs: formData.artStudioConfigs,
    });
    structuresTotal = structures.total;
  }
  
  // === UTILITY AREAS (if visible) ===
  let utilityAreasTotal = 0;
  if (visibility.showUtilityAreas && formData.homeMapping?.areas) {
    const utilityResult = calculateAllUtilityAreasTotal(
      formData.homeMapping.areas,
      isDeep
    );
    utilityAreasTotal = utilityResult.totalPrice;
  }
  
  // === PREMIUM SPACES (if visible) ===
  let premiumSpacesTotal = 0;
  if (visibility.showPremiumSpaces && formData.homeMapping?.areas) {
    const mappedResult = calculateAllMappedAreas(
      formData.homeMapping.areas,
      isDeep
    );
    // Only mudroom and den are premium
    premiumSpacesTotal = 
      (mappedResult.perArea.mudroom?.price || 0) + 
      (mappedResult.perArea.den?.price || 0);
  }
  
  // === STUDIO MAIN SPACE (if visible - replaces living/dining for studios) ===
  let studioMainSpaceTotal = 0;
  if (visibility.showStudioMainSpace) {
    const studioConfig = formData.homeMapping?.areas?.studioMainSpace;
    if (studioConfig?.enabled) {
      const studioResult = calculateStudioMainSpaceArea(studioConfig, isDeep);
      studioMainSpaceTotal = studioResult.price;
    }
  }
  
  // === LIVING AREAS TOTAL ===
  // NOTE: Office, Laundry, Garage are now calculated via homeMapping.areas (utilityAreasTotal)
  // Only Loft remains on legacy counter to prevent double-counting
  const LOFT_RATE = isDeep ? 35 : 25;
  const livingAreasTotal = (formData.loftCount || 0) * LOFT_RATE;
  
  // === KITCHEN ADDONS TOTAL (room-specific SSOT with multi-factor pricing) ===
  // SSOT: Gate kitchen addons by toggle state AND excludedSpaces (Partial Empty)
  const isKitchenExcluded = (formData.excludedSpaces || []).includes('kitchen');
  const kitchenRoomAddons = (kitchenToggles.insideAppliances && !isKitchenExcluded)
    ? ((formData as any).roomAddons?.kitchen || [])
    : [];
  const kitchenAddonResult = calculateKitchenAddonsTotal(
    kitchenRoomAddons,
    formData.homeSize || 2,
    formData.propertyType,
    formData.squareFootageRange,  // SQFT factor for cabinet pricing
    (formData as any).kitchenCabinetOverride || 'typical',  // Cabinet size override
    (formData as any).kitchenDegreaseLevel || 'light'  // Degrease level for Heavy Degrease Mode
  );
  const kitchenAddonsTotal = kitchenAddonResult.totalPrice;
  
  // === GRAND TOTAL ===
  let grandTotal = 
    basePrice + 
    bathroomTotal + 
    conditionFee +
    addonsTotal + 
    microServicesTotal +
    windowsTotal +
    hallwaysTotal +
    stairsTotal +
    verticalSurcharge +
    patioTotal +
    structuresTotal +
    utilityAreasTotal +
    premiumSpacesTotal +
    livingAreasTotal +
    studioMainSpaceTotal +
    kitchenAddonsTotal;  // NEW: Kitchen room addons
  
  // === FREQUENCY DISCOUNT ===
  let frequencyDiscount: PricingTotals['frequencyDiscount'] = null;
  const serviceType = formData.serviceType;
  if (serviceType && FREQUENCY_LABELS[serviceType]) {
    const freq = FREQUENCY_LABELS[serviceType];
    const discountAmount = Math.round(grandTotal * (freq.percent / 100));
    frequencyDiscount = {
      label: freq.label,
      percent: freq.percent,
      amount: discountAmount,
    };
    grandTotal = grandTotal - discountAmount;
  }
  
  // === PHASE 4: PARTIAL EMPTY DISCOUNT (MOVING only) ===
  let partialEmptyDiscount: number | undefined;
  let partialEmptyRemovedZones: string[] | undefined;
  
  const isMovingFlow = situation === 'MOVING';
  const moveCondition = (formData as any).moveCondition;
  
  if (isMovingFlow && moveCondition === 'partial_empty') {
    const discountResult = calculatePartialEmptyDiscount(formData, isDeep);
    if (discountResult.applied && discountResult.discountAmount > 0) {
      partialEmptyDiscount = discountResult.discountAmount;
      partialEmptyRemovedZones = discountResult.removedZones;
      grandTotal = grandTotal - discountResult.discountAmount;
    }
  }
  
  // Apply minimum (AFTER all discounts — profit protection)
  const MIN_TOTAL = 165;
  grandTotal = Math.max(grandTotal, MIN_TOTAL);
  
  return {
    grandTotal,
    basePrice,
    bathroomTotal,
    conditionFee,
    conditionFeeBreakdown,
    conditionFeeCapApplied,
    conditionFeeFloorApplied,
    conditionFeeLevel,
    addonsTotal,
    microServicesTotal,
    windowsTotal,
    hallwaysTotal,
    stairsTotal,
    verticalSurcharge,
    patioTotal,
    structuresTotal,
    utilityAreasTotal,
    premiumSpacesTotal,
    livingAreasTotal,
    studioMainSpaceTotal,
    kitchenAddonsTotal,
    frequencyDiscount,
    partialEmptyDiscount,
    partialEmptyRemovedZones,
  };
}

/**
 * Compute recurring pricing info
 */
export function computeRecurring(
  formData: BookingFormData,
  totals: PricingTotals,
  recurringStartMode: string | null
): {
  isRecurring: boolean;
  firstVisitPrice: number | null;
  futureVisitsPrice: number | null;
  startMode: string | null;
  frequencyLabel: string | null;
} {
  const serviceType = formData.serviceType;
  const isRecurring = ['weekly', 'biweekly', 'monthly'].includes(serviceType || '');
  
  if (!isRecurring) {
    return {
      isRecurring: false,
      firstVisitPrice: null,
      futureVisitsPrice: null,
      startMode: null,
      frequencyLabel: null,
    };
  }
  
  const frequencyLabel = FREQUENCY_LABELS[serviceType!]?.label || null;
  
  // For recurring, first visit may be at Deep Clean price if kickoff mode
  const isDeepKickoff = recurringStartMode === 'deep_kickoff';
  
  // Calculate future visits price (discounted recurring rate)
  const futureVisitsPrice = totals.grandTotal;
  
  // First visit is either Deep price or same as future
  let firstVisitPrice = futureVisitsPrice;
  if (isDeepKickoff) {
    // First visit at Deep Clean rate (no recurring discount)
    const deepMultiplier = 1.5; // Approximate Deep vs Standard
    firstVisitPrice = Math.round(totals.basePrice * deepMultiplier + totals.bathroomTotal * 1.3);
  }
  
  return {
    isRecurring,
    firstVisitPrice,
    futureVisitsPrice,
    startMode: recurringStartMode,
    frequencyLabel,
  };
}
