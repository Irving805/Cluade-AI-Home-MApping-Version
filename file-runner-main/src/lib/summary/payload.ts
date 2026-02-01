/**
 * Payload Builder — Formats Summary Data for Zapier/HCP
 * 
 * NO calculations here - only formatting from summary data.
 * This ensures payload always matches what's displayed in UI.
 */

import type { 
  BookingFormData, 
  ServiceMode, 
  Situation,
  MoveContext,
  HomeEntryConfig 
} from '@/contexts/BookingContext';
import type { 
  VisibilityResult, 
  PricingTotals, 
  TimeMetrics,
  SummaryLineItem,
  HomeEntrySummary,
  PremiumSpacesSummary,
  UtilityAreasSummary,
  StructuredPayload,
  FlattenedPayload 
} from './types';
import { buildBathroomsByFloorSummary } from '@/lib/bathroomPresets';
import { calculateBathroomLogisticsTime, calculateTotalBathroomLogisticsTime } from '@/lib/bathroomLogisticsTime';

// ============= STRUCTURED PAYLOAD =============

export function buildStructuredPayload(
  formData: BookingFormData,
  mode: ServiceMode,
  situation: Situation,
  totals: PricingTotals,
  timeMetrics: TimeMetrics,
  homeEntry: HomeEntrySummary,
  premiumSpaces: PremiumSpacesSummary,
  utilityAreas: UtilityAreasSummary
): StructuredPayload {
  return {
    quoteId: `Q-${Date.now()}`,
    leadStatus: 'completed',
    
    serviceType: formData.serviceType || 'one_time',
    serviceMode: mode,
    situation,
    moveContext: (formData as any).moveContext || null,
    
    estimatedTotal: totals.grandTotal,
    estimatedTotalDisplay: `$${totals.grandTotal}`,
    
    homeEntry,
    premiumSpaces,
    utilityAreas,
    timeMetrics,
  };
}

// ============= FLATTENED PAYLOAD =============

export function buildFlattenedPayload(
  formData: BookingFormData,
  mode: ServiceMode,
  situation: Situation,
  totals: PricingTotals,
  timeMetrics: TimeMetrics,
  visibility: VisibilityResult,
  lineItems: SummaryLineItem[],
  homeEntryConfig: HomeEntryConfig | undefined
): FlattenedPayload {
  const flattened: FlattenedPayload = {};
  
  // === CORE FIELDS ===
  flattened.quote_id = `Q-${Date.now()}`;
  flattened.lead_status = 'completed';
  flattened.service_type = formData.serviceType || 'one_time';
  flattened.service_mode = mode;
  flattened.situation = situation;
  flattened.move_context = (formData as any).moveContext || null;
  
  // === PRICING ===
  flattened.estimated_total = totals.grandTotal;
  flattened.estimated_total_display = `$${totals.grandTotal}`;
  flattened.base_price = totals.basePrice;
  flattened.bathroom_total = totals.bathroomTotal;
  flattened.master_baths = formData.masterBaths;
  flattened.full_baths = formData.fullBaths;
  flattened.half_baths = formData.halfBaths;
  
  // === BATHROOM INVENTORY (Premium Mapping) ===
  if (formData.bathroomInventory?.bathrooms && formData.bathroomInventory.bathrooms.length > 0) {
    flattened.bathroom_inventory_json = JSON.stringify(formData.bathroomInventory);
    flattened.bathroom_inventory_count = formData.bathroomInventory.bathrooms.length;
    
    // Build floor-grouped summary for crew (language-neutral)
    flattened.bathrooms_by_floor_summary = buildBathroomsByFloorSummary(formData.bathroomInventory);
    
    // Flatten first 3 units for quick crew access
    formData.bathroomInventory.bathrooms.slice(0, 3).forEach((unit, idx) => {
      flattened[`bath_${idx}_type`] = unit.type;
      flattened[`bath_${idx}_floor`] = unit.floorId;
      flattened[`bath_${idx}_fixtures`] = unit.fixtures;
      flattened[`bath_${idx}_glass`] = unit.glass;
      flattened[`bath_${idx}_condition`] = unit.condition;
      flattened[`bath_${idx}_customized`] = unit.isCustomized;
      
      // === BATHROOM LOGISTICS V1 (Crew operational fields) ===
      if (unit.logistics) {
        const logisticsTime = calculateBathroomLogisticsTime(unit.logistics);
        flattened[`bath_${idx}_logistics_toilet`] = unit.logistics.toiletScale;
        flattened[`bath_${idx}_logistics_tub`] = unit.logistics.tubScale;
        flattened[`bath_${idx}_logistics_shower_door`] = unit.logistics.showerDoorScale;
        flattened[`bath_${idx}_logistics_cabinet`] = unit.logistics.cabinetInterior;
        flattened[`bath_${idx}_logistics_mirrors`] = unit.logistics.mirrorCount;
        flattened[`bath_${idx}_logistics_extra_minutes`] = logisticsTime;
        if (unit.logistics.notes) {
          flattened[`bath_${idx}_logistics_notes`] = unit.logistics.notes;
        }
      }
    });
    
    // === TOTAL BATHROOM LOGISTICS TIME ===
    const bathroomLogisticsTotal = calculateTotalBathroomLogisticsTime(
      formData.bathroomInventory.bathrooms
    );
    if (bathroomLogisticsTotal > 0) {
      flattened.bathroom_logistics_minutes_total = bathroomLogisticsTotal;
    }
  }
  
  flattened.condition_fee = totals.conditionFee;
  flattened.addons_total = totals.addonsTotal;
  flattened.micro_services_total = totals.microServicesTotal;
  flattened.windows_total = totals.windowsTotal;
  flattened.hallways_total = totals.hallwaysTotal;
  flattened.vertical_surcharge = totals.verticalSurcharge;
  flattened.structures_total = totals.structuresTotal;
  flattened.utility_areas_total = totals.utilityAreasTotal;
  flattened.premium_spaces_total = totals.premiumSpacesTotal;
  
  // === FREQUENCY DISCOUNT ===
  if (totals.frequencyDiscount) {
    flattened.frequency_discount_label = totals.frequencyDiscount.label;
    flattened.frequency_discount_percent = totals.frequencyDiscount.percent;
    flattened.frequency_discount_amount = totals.frequencyDiscount.amount;
  }
  
  // === TIME METRICS ===
  flattened.time_man_hours = timeMetrics.manHours;
  flattened.time_clock_hours = timeMetrics.clockHours;
  flattened.time_team_size = timeMetrics.teamSize;
  flattened.time_estimate_min = timeMetrics.estimateMin;
  flattened.time_estimate_max = timeMetrics.estimateMax;
  
  // === HOME ENTRY ===
  if (homeEntryConfig) {
    flattened.homeEntry_propertyType = homeEntryConfig.propertyType;
    flattened.homeEntry_accessMethod = homeEntryConfig.accessMethod;
    flattened.homeEntry_entryZoneStyle = homeEntryConfig.entryZoneStyle;
    flattened.homeEntry_entryZoneFloor = homeEntryConfig.entryZoneFloor;
    flattened.homeEntry_hasEntryRugMat = homeEntryConfig.hasEntryRugMat;
    flattened.homeEntry_hasCoatCloset = homeEntryConfig.hasCoatCloset;
    flattened.homeEntry_hasGlassAtEntry = homeEntryConfig.hasGlassAtEntry;
    flattened.homeEntry_arrivalInstructions = ''; // TODO: Remove after Zapier migration verified
    flattened.homeEntry_parkingNotes = ''; // TODO: Remove after Zapier migration verified
    // Property Logistics Metadata
    flattened.homeEntry_studioSubtype = homeEntryConfig.studioSubtype || '';
    flattened.homeEntry_propertyStyle = homeEntryConfig.propertyStyle || '';
    flattened.homeEntry_unitPosition = homeEntryConfig.unitPosition || '';
  }
  
  // === PREMIUM SPACES ===
  if (formData.homeMapping?.areas) {
    const mudroom = formData.homeMapping.areas.mudroom;
    flattened.mudroom_enabled = mudroom.enabled;
    flattened.mudroom_size = mudroom.size;
    flattened.mudroom_heavySoil = mudroom.heavySoil;
    
    const den = formData.homeMapping.areas.den;
    flattened.den_enabled = den.enabled;
    flattened.den_size = den.size;
    flattened.den_primaryUse = den.primaryUse;
    flattened.den_clutterLevel = den.clutterLevel;
  }
  
  // === UTILITY AREAS ===
  if (formData.homeMapping?.areas) {
    // Office: Only include if NOT a studio AND NOT 1BR (workspace is in main living area)
    if (!visibility.isStudio && !visibility.isOneBedroom) {
      const office = formData.homeMapping.areas.office;
      flattened.office_enabled = office.enabled;
      flattened.office_size = office.size;
    } else {
      // Explicitly set to false for studios/1BR (prevents leakage to PDF/notifications)
      flattened.office_enabled = false;
    }
    
    const laundry = formData.homeMapping.areas.laundry;
    flattened.laundry_enabled = laundry.enabled;
    flattened.laundry_type = laundry.type;
    flattened.laundry_size = laundry.size;
    
    const garage = formData.homeMapping.areas.garage;
    flattened.garage_enabled = garage.enabled;
    flattened.garage_capacity = garage.capacity;
    
    const patio = formData.homeMapping.areas.patio;
    flattened.patio_enabled = patio.enabled;
    flattened.patio_type = patio.type;
    flattened.patio_size = patio.size;
    
    // === STUDIO MAIN SPACE ===
    const studioConfig = formData.homeMapping.areas.studioMainSpace;
    if (studioConfig?.enabled) {
      flattened.studio_main_space_enabled = true;
      flattened.studio_structure_type = studioConfig.structureType ?? 'apartment_unit';
      flattened.studio_size = studioConfig.studioSize ?? '400_600';
      flattened.studio_furniture_density = studioConfig.furnitureDensity;
      flattened.studio_clutter_level = studioConfig.clutterLevel;
      flattened.studio_pet_hair = studioConfig.petHairRisk;
    }
  }
  
  // === VISIBILITY FLAGS ===
  flattened.visibility_isStudio = visibility.isStudio;
  flattened.visibility_isOneBedroom = visibility.isOneBedroom;
  flattened.visibility_isMultiFloor = visibility.isMultiFloor;
  flattened.visibility_showStructures = visibility.showStructures;
  flattened.visibility_showPremiumSpaces = visibility.showPremiumSpaces;
  flattened.visibility_showUtilityAreas = visibility.showUtilityAreas;
  
  // === LINE ITEMS SUMMARY ===
  flattened.line_items_count = lineItems.length;
  flattened.line_items_total_price = lineItems.reduce((sum, i) => sum + i.price, 0);
  
  return flattened;
}

// ============= COMBINED PAYLOAD BUILDER =============

export function buildPayloads(
  formData: BookingFormData,
  mode: ServiceMode,
  situation: Situation,
  totals: PricingTotals,
  timeMetrics: TimeMetrics,
  visibility: VisibilityResult,
  lineItems: SummaryLineItem[],
  homeEntryConfig: HomeEntryConfig | undefined,
  homeEntrySummary: HomeEntrySummary,
  premiumSpacesSummary: PremiumSpacesSummary,
  utilityAreasSummary: UtilityAreasSummary
): {
  structured: StructuredPayload;
  flattened: FlattenedPayload;
} {
  return {
    structured: buildStructuredPayload(
      formData,
      mode,
      situation,
      totals,
      timeMetrics,
      homeEntrySummary,
      premiumSpacesSummary,
      utilityAreasSummary
    ),
    flattened: buildFlattenedPayload(
      formData,
      mode,
      situation,
      totals,
      timeMetrics,
      visibility,
      lineItems,
      homeEntryConfig
    ),
  };
}
