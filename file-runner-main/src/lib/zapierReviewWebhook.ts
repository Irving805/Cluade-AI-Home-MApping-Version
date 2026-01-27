/**
 * Zapier Review/Abandoned-Cart Webhook Integration
 * 
 * This webhook is triggered when a user FIRST reaches the Review step,
 * allowing for abandoned-cart style follow-up emails with the quote PDF attached.
 * 
 * PDF ATTACHMENT: Zapier receives the file as FormData with field name "attachment".
 * In Zapier, use this field directly in "Email by Zapier" → Attachments.
 * 
 * This is SEPARATE from:
 * - Web3Forms submission (final booking request)
 * - Housecall Pro webhook (completed leads only)
 */

import { 
  buildNormalizedQuotePayload, 
  buildHousecallSuggestion,
  buildHcpCustomerLookup,
  buildHcpCustomerBody,
  buildHcpLeadBodyTemplate,
  buildHcpEstimateBodyTemplate,
  NormalizedQuotePayload,
  HousecallSuggestion,
  HcpCustomerLookup,
  HcpCustomerBody,
  HcpLeadBodyTemplate,
  HcpEstimateBodyTemplate,
  BuildNormalizedPayloadParams 
} from '@/lib/normalizedPayload';

// Zapier webhook URL for BOTH partial (review reached) and completed leads
// Single webhook handles both - differentiated by lead_status field
export const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/5572721/usc71p6/';

export interface ReviewLeadData {
  quoteId: string;
  customerName: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  serviceMode: 'full' | 'custom';
  serviceType: string;
  homeType: string;
  totalEstimate: number;
  language: string;
  // Additional context
  homeSize?: string;
  bedrooms?: string;
  bathrooms?: string;
  selectedAddons?: string;
  selectedMicroServices?: string;
  customZones?: string;
  conditionLevel?: string;
  preferredDate?: string;
  accessNotes?: string;
  // Hourly mode fields
  hourlyMode?: boolean;
  hourlyHours?: number;
  hourlyFrequency?: string;
  hourlyIntensity?: string;
  hourlySupplies?: string;
  hourlyPriorityNotes?: string;
  hourlyTotalBeds?: number;
  hourlyTotalBaths?: number;
  hourlyBedsToClean?: number;
  hourlyBathsToClean?: number;
  hourlyIncludeKitchen?: boolean;
  hourlyIncludeLiving?: boolean;
  hourlyDaysPerWeek?: number;
  // Estate & Compound fields (Hourly mode)
  hourlyTotalSqft?: string;
  guestHouseCount?: number;
  studioCount?: number;
  poolHouseCount?: number;
  cleaningDensity?: string;
  customActiveSqft?: string;
  isMovingHourly?: boolean;
  hourlyTasks?: string[];
  // === PROPERTY TYPE & AREAS (NEW) ===
  hourlyPropertyType?: string;
  hourlyAreasToInclude?: string[];
  hourlyAreasToSkip?: string[];
  // === SOUTH COAST HOURLY FIELDS ===
  hourlyAccessType?: 'standard' | 'hillside' | 'estate_gated';
  hourlyHasDelicateSurfaces?: boolean;
  hourlyDelicateSurfaceTypes?: string[];
  hourlyHomeCondition?: 'tidy' | 'lived_in' | 'cluttered' | 'deep_recovery';
  hourlyMustHaves?: string[];
  hourlyNiceToHaves?: string;
  hourlyOvertimeProtocol?: 'strict' | 'flex';
  hourlyIntent?: string;
  hourlyTeamSize?: number;
  // High-Perception Logistic Engineering fields
  hourlyIsPropertyOccupied?: boolean;
  hourlyHasPetsToSecure?: boolean;
  hourlyVerticalLogistics?: 'ground' | 'elevator' | 'walkup';
  hourlyScopeExclusionsConfirmed?: boolean;
  hourlyGateCode?: string;
  hourlyAlarmCode?: string;
  hourlyKeyLocation?: string;
  // Equipment & Supplies
  hourlyHasVacuum?: boolean;
  hourlyHasParking?: boolean;
  // === INTENT-SPECIFIC FIELDS ===
  // The Keeper (Routine Maintenance)
  lifestyleAddons?: {
    laundryLoads: number;
    dishwasher: boolean;
    bedMaking: boolean;
    plantCare: boolean;
    trashOut: boolean;
    mailSort: boolean;
    petBowls: boolean;
  };
  hasSheddingPets?: boolean;
  equipmentPreference?: 'client_provides' | 'we_bring' | 'hybrid' | null;
  clientSuppliesNotes?: string;
  routinePriorities?: string[];
  preferredDay?: string | null;
  // Efficiency Expert (Priority Focus)
  budgetHours?: 2 | 3 | 4;
  priorityRanking?: string[];
  priorityAreas?: string[];
  scopeExclusionConfirmed?: boolean;
  // Heavy-Lifter (Deep Scrub)
  grimeLevel?: 'standard' | 'recovery';
  hasNaturalStone?: boolean;
  pullOutAppliances?: boolean;
  // Recovery Team (Post-Event)
  eventType?: 'party' | 'wedding' | 'corporate' | 'family' | 'holiday' | 'other';
  eventGuestCount?: '1-10' | '10-25' | '25-50' | '50-100' | '100+';
  affectedAreas?: string[];
  messTypes?: string[];
  debrisBags?: number;
  hasStickySpills?: boolean;
  furnitureNeedsResetting?: boolean;
  hasBiohazard?: boolean;
  mustFinishBy?: string;
  // Home Assistant (Organization)
  organizationTasks?: string[];
  noScrubAcknowledged?: boolean;
  clutterLevel?: 'minimal' | 'moderate' | 'significant' | 'overwhelming' | null;
  // The Finisher (Move-In/Out)
  isHome100Empty?: boolean | null;
  needsLandlordReceipt?: boolean;
  // Renovation fields
  renovationPhase?: string;
  renovationSqft?: number;
  renovationOccupancy?: string;
  renovationDebrisLevel?: string;
  renovationSurfaceRisk?: string;
  renovationContractorsDone?: boolean;
  renovationDumpster?: boolean;
  renovationWindowCount?: number;
  renovationHvacFilters?: boolean;
  // Renovation Property Composition
  renovationBedrooms?: number;
  renovationBathroomsMaster?: number;
  renovationBathroomsFull?: number;
  renovationBathroomsHalf?: number;
  renovationHasNewKitchen?: boolean;
  renovationKitchenSize?: string;
  renovationAddonsApplied?: string;
  renovationTotal?: number;
  renovationHours?: number;
  // Move-In/Out Empty Shell Audit fields
  moveOccupancy?: 'vacant' | 'furnished';
  // Floor Composition (MOVING mode)
  floorHardwoodPercent?: number;
  floorCarpetPercent?: number;
  floorIsFocus?: boolean;
  floorFocusNotes?: string;
  // Per-Space Floor Types (MOVING mode - per-room mapping)
  spaceFloorTypes?: {
    kitchen: 'hardwood_tile' | 'carpet' | 'mixed';
    living: 'hardwood_tile' | 'carpet' | 'mixed';
    hallways: 'hardwood_tile' | 'carpet' | 'mixed';
    bedrooms: Record<string, 'hardwood_tile' | 'carpet' | 'mixed'>;
  };
  // Vertical Logistics (MOVING mode)
  propertyType?: 'house' | 'apartment' | null;
  houseLevels?: number;
  apartmentFloor?: number;
  hasElevator?: boolean;
  verticalSurcharge?: number;
  // Patio (MOVING mode)
  patioCount?: number;
  patioScope?: 'sweep' | 'scrub';
  patioPrice?: number;
  // === V3: AI TIME RECEIPT ===
  hourlyTimeReceipt?: {
    logistics: { totalLogistics: number };
    activeArea: { subtotalMinutes: number };
    unifiedSpaces: { totalMinutes: number };
    tasks: { totalMinutes: number };
    summary: { totalManMinutes: number; suggestedClockHours: number };
    teamSizing: { recommendedTeamSize: number; rationale: string };
  } | null;
  // For normalized payload
  normalizedPayloadParams?: BuildNormalizedPayloadParams;
}

/**
 * Payload JSON structure sent to Zapier alongside the PDF attachment.
 * This is a single JSON object that contains all lead data for easy Zapier mapping.
 */
export interface ZapierPayloadJSON {
  // Lead identification
  quote_id: string;
  lead_status: 'partial' | 'completed';
  lead_type: string; // 'review_reached' or 'booking_submitted'
  lead_source: string;
  source: string; // 'review_webhook' or 'completed_webhook'
  timestamp: string;
  
  // Customer info
  customer_name: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  
  // Service details
  service_mode: string;
  service_type: string;
  home_type: string;
  total_estimate: number;
  total_estimate_display: string;
  language: string;
  
  // Additional context
  home_size?: string;
  bedrooms?: string;
  bathrooms?: string;
  addons_selected?: string;
  micro_services_selected?: string;
  custom_zones?: string;
  condition_level?: string;
  preferred_date?: string;
  access_notes?: string;
  
  // Hourly mode fields
  is_hourly_mode?: boolean;
  hourly_hours?: number;
  hourly_frequency?: string;
  hourly_intensity?: string;
  hourly_supplies?: string;
  hourly_priority_notes?: string;
  hourly_total_beds?: number;
  hourly_total_baths?: number;
  hourly_beds_to_clean?: number;
  hourly_baths_to_clean?: number;
  hourly_include_kitchen?: boolean;
  hourly_include_living?: boolean;
  hourly_days_per_week?: number;
  // Estate & Compound fields
  hourly_total_sqft?: string;
  guest_house_count?: number;
  studio_count?: number;
  pool_house_count?: number;
  cleaning_density?: string;
  custom_active_sqft?: string;
  is_moving_hourly?: boolean;
  concierge_tasks?: string[];
  // === PROPERTY TYPE & AREAS (NEW) ===
  hourly_property_type?: string;
  hourly_areas_to_include?: string;
  hourly_areas_to_skip?: string;
  // === SOUTH COAST HOURLY FIELDS ===
  hourly_access_type?: 'standard' | 'hillside' | 'estate_gated';
  hourly_has_delicate_surfaces?: boolean;
  hourly_delicate_surface_types?: string;
  hourly_home_condition?: 'tidy' | 'lived_in' | 'cluttered' | 'deep_recovery';
  hourly_must_haves?: string[];
  hourly_nice_to_haves?: string;
  hourly_overtime_protocol?: 'strict' | 'flex';
  hourly_intent?: string;
  hourly_team_size?: number;
  // High-Perception Logistic Engineering fields
  hourly_is_property_occupied?: boolean;
  hourly_has_pets_to_secure?: boolean;
  hourly_vertical_logistics?: 'ground' | 'elevator' | 'walkup';
  hourly_scope_exclusions_confirmed?: boolean;
  hourly_gate_code?: string;
  hourly_alarm_code?: string;
  hourly_key_location?: string;
  // Equipment & Supplies
  hourly_has_vacuum?: boolean;
  hourly_has_parking?: boolean;
  // === INTENT-SPECIFIC FIELDS ===
  // Routine Maintenance (extended)
  lifestyle_laundry_loads?: number;
  lifestyle_dishwasher?: boolean;
  lifestyle_bed_making?: boolean;
  lifestyle_plant_care?: boolean;
  lifestyle_trash_out?: boolean;
  lifestyle_mail_sort?: boolean;
  lifestyle_pet_bowls?: boolean;
  has_shedding_pets?: boolean;
  equipment_preference?: string;
  client_supplies_notes?: string;
  routine_priorities?: string;
  preferred_day?: string;
  // Priority Focus
  budget_hours?: number;
  priority_ranking?: string;
  priority_areas?: string;
  scope_exclusion_confirmed?: boolean;
  // Deep Scrub
  grime_level?: string;
  has_natural_stone?: boolean;
  pull_out_appliances?: boolean;
  // Post-Event
  event_type?: string;
  event_guest_count?: string;
  affected_areas?: string;
  mess_types?: string;
  debris_bags?: number;
  has_sticky_spills?: boolean;
  furniture_needs_resetting?: boolean;
  has_biohazard?: boolean;
  must_finish_by?: string;
  // Organization
  organization_tasks?: string;
  no_scrub_acknowledged?: boolean;
  clutter_level?: string;
  // Move-In/Out
  is_home_100_empty?: boolean | null;
  needs_landlord_receipt?: boolean;
  
  // Renovation fields
  renovation_phase?: string;
  renovation_sqft?: number;
  renovation_occupancy?: string;
  renovation_debris_level?: string;
  renovation_surface_risk?: string;
  renovation_contractors_done?: boolean;
  renovation_dumpster?: boolean;
  renovation_window_count?: number;
  renovation_hvac_filters?: boolean;
  // Renovation Property Composition
  renovation_bedrooms?: number;
  renovation_bathrooms_master?: number;
  renovation_bathrooms_full?: number;
  renovation_bathrooms_half?: number;
  renovation_has_new_kitchen?: boolean;
  renovation_kitchen_size?: string;
  renovation_addons_applied?: string;
  renovation_total?: number;
  renovation_hours?: number;
  
  // Move-In/Out Empty Shell Audit fields
  move_occupancy?: 'vacant' | 'furnished';
  // Floor Composition (MOVING mode)
  floor_hardwood_percent?: number;
  floor_carpet_percent?: number;
  floor_is_focus?: boolean;
  floor_focus_notes?: string;
  // Per-Space Floor Types (MOVING mode - per-room mapping)
  space_floor_types?: {
    kitchen: 'hardwood_tile' | 'carpet' | 'mixed';
    living: 'hardwood_tile' | 'carpet' | 'mixed';
    hallways: 'hardwood_tile' | 'carpet' | 'mixed';
    bedrooms: Record<string, 'hardwood_tile' | 'carpet' | 'mixed'>;
  };
  // Vertical Logistics (MOVING mode)
  property_type?: 'house' | 'apartment' | null;
  house_levels?: number;
  apartment_floor?: number;
  has_elevator?: boolean;
  vertical_surcharge?: number;
  // Patio (MOVING mode)
  patio_count?: number;
  patio_scope?: 'sweep' | 'scrub';
  patio_price?: number;
  
  // === V3: AI TIME RECEIPT ===
  hourly_time_receipt?: {
    logistics_minutes: number;
    active_cleaning_minutes: number;
    unified_spaces_minutes: number;
    task_minutes: number;
    total_man_minutes: number;
    suggested_clock_hours: number;
    suggested_team_size: number;
    team_rationale: string;
  } | null;
  
  // Summary for quick reading
  summary: string;
  
  // Normalized payloads for Housecall Pro integration
  normalized_quote: NormalizedQuotePayload | null;
  housecall_suggestion: HousecallSuggestion | null;
  
  // HCP API-ready bodies (for direct Zapier mapping)
  hcp_customer_body: HcpCustomerBody | null;
  hcp_lead_body_template: HcpLeadBodyTemplate | null;
  hcp_estimate_body_template: HcpEstimateBodyTemplate | null;
  hcp_customer_lookup: HcpCustomerLookup | null;
  
  // Error flag (set to true if PDF generation failed)
  pdf_error?: boolean;
  pdf_error_message?: string;
}

/**
 * Reusable helper to send lead data + PDF to any Zapier Catch Hook.
 * 
 * FormData structure:
 * - attachment: PDF Blob file (field name "attachment" for Zapier compatibility)
 * - payload_json: JSON string with all lead data
 * 
 * In Zapier:
 * - Use "attachment" field directly in Email by Zapier → Attachments
 * - Parse "payload_json" with Formatter → Utilities → JSON Parse if needed
 * 
 * @param webhookUrl - Zapier Catch Hook URL
 * @param payloadJSON - Lead data object
 * @param pdfBlob - Generated PDF blob (optional - will set pdf_error if missing)
 * @param pdfFileName - PDF filename
 */
export async function sendLeadToZapierWithAttachment(
  webhookUrl: string,
  payloadJSON: ZapierPayloadJSON,
  pdfBlob: Blob | null,
  pdfFileName: string
): Promise<void> {
  try {
    const formData = new FormData();
    
    // Attach the PDF file with field name "attachment"
    // This is the standard field name Zapier recognizes for file attachments
    if (pdfBlob) {
      formData.append('attachment', pdfBlob, pdfFileName);
    } else {
      // Mark that PDF was not available
      payloadJSON.pdf_error = true;
      payloadJSON.pdf_error_message = 'PDF generation failed or blob was null';
    }
    
    // Attach all lead data as a single JSON string
    // Zapier can parse this with Formatter → Utilities → JSON Parse
    formData.append('payload_json', JSON.stringify(payloadJSON));
    
    // Also append key fields at top level for easier Zapier access without parsing
    formData.append('quote_id', payloadJSON.quote_id);
    formData.append('lead_status', payloadJSON.lead_status);
    formData.append('customer_email', payloadJSON.customer_email);
    formData.append('customer_name', payloadJSON.customer_name);
    formData.append('total_estimate', String(payloadJSON.total_estimate));
    formData.append('summary', payloadJSON.summary);
    
    // Fire-and-forget POST
    // Note: mode: 'no-cors' means we can't read the response, but Zapier will receive the data
    await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
      mode: 'no-cors',
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Zapier Webhook] FormData payload built', {
        hasPdf: !!pdfBlob,
        quoteId: payloadJSON.quote_id,
        leadStatus: payloadJSON.lead_status,
        webhookUrl: webhookUrl.substring(0, 50) + '...',
      });
    }
    
    console.log(`[Zapier Webhook] ${payloadJSON.lead_status} lead sent:`, payloadJSON.quote_id);
  } catch (error) {
    // Fail silently - user experience must NOT be affected
    console.error('[Zapier Webhook] Failed to send (non-blocking):', error);
  }
}

/**
 * Build the ZapierPayloadJSON object from ReviewLeadData.
 */
function buildZapierPayload(
  leadData: ReviewLeadData,
  leadStatus: 'partial' | 'completed',
  source: string
): ZapierPayloadJSON {
  // Build normalized payloads if params are available
  let normalizedQuote: NormalizedQuotePayload | null = null;
  let housecallSuggestion: HousecallSuggestion | null = null;
  let hcpCustomerBody: HcpCustomerBody | null = null;
  let hcpLeadBodyTemplate: HcpLeadBodyTemplate | null = null;
  let hcpEstimateBodyTemplate: HcpEstimateBodyTemplate | null = null;
  let hcpCustomerLookup: HcpCustomerLookup | null = null;
  
  if (leadData.normalizedPayloadParams) {
    try {
      normalizedQuote = buildNormalizedQuotePayload(leadData.normalizedPayloadParams);
      housecallSuggestion = buildHousecallSuggestion(leadData.normalizedPayloadParams);
      hcpCustomerBody = buildHcpCustomerBody(leadData.normalizedPayloadParams);
      hcpLeadBodyTemplate = buildHcpLeadBodyTemplate(leadData.normalizedPayloadParams);
      hcpEstimateBodyTemplate = buildHcpEstimateBodyTemplate(leadData.normalizedPayloadParams);
      hcpCustomerLookup = buildHcpCustomerLookup(leadData.normalizedPayloadParams);
    } catch (err) {
      console.warn('[Zapier Webhook] Failed to build normalized payload:', err);
    }
  }
  
  return {
    // Lead identification
    quote_id: leadData.quoteId || '',
    lead_status: leadStatus,
    lead_type: leadStatus === 'partial' ? 'review_reached' : 'booking_submitted',
    lead_source: 'Website Pricing Widget',
    source: source,
    timestamp: new Date().toISOString(),
    
    // Customer info
    customer_name: leadData.customerName || '',
    customer_first_name: leadData.customerFirstName || '',
    customer_last_name: leadData.customerLastName || '',
    customer_email: leadData.customerEmail || '',
    customer_phone: leadData.customerPhone || '',
    customer_city: leadData.customerCity || '',
    customer_address: leadData.customerAddress || '',
    
    // Service details
    service_mode: leadData.serviceMode || '',
    service_type: leadData.serviceType || '',
    home_type: leadData.homeType || '',
    total_estimate: leadData.totalEstimate || 0,
    total_estimate_display: `$${leadData.totalEstimate || 0}`,
    language: leadData.language || 'EN',
    
    // Additional context
    home_size: leadData.homeSize,
    bedrooms: leadData.bedrooms,
    bathrooms: leadData.bathrooms,
    addons_selected: leadData.selectedAddons,
    micro_services_selected: leadData.selectedMicroServices,
    custom_zones: leadData.customZones,
    condition_level: leadData.conditionLevel,
    preferred_date: leadData.preferredDate,
    access_notes: leadData.accessNotes,
    
    // Hourly mode fields
    is_hourly_mode: leadData.hourlyMode,
    hourly_hours: leadData.hourlyHours,
    hourly_frequency: leadData.hourlyFrequency,
    hourly_intensity: leadData.hourlyIntensity,
    hourly_supplies: leadData.hourlySupplies,
    hourly_priority_notes: leadData.hourlyPriorityNotes,
    hourly_total_beds: leadData.hourlyTotalBeds,
    hourly_total_baths: leadData.hourlyTotalBaths,
    hourly_beds_to_clean: leadData.hourlyBedsToClean,
    hourly_baths_to_clean: leadData.hourlyBathsToClean,
    hourly_include_kitchen: leadData.hourlyIncludeKitchen,
    hourly_include_living: leadData.hourlyIncludeLiving,
    hourly_days_per_week: leadData.hourlyDaysPerWeek,
    // Estate & Compound fields
    hourly_total_sqft: leadData.hourlyTotalSqft,
    guest_house_count: leadData.guestHouseCount,
    studio_count: leadData.studioCount,
    pool_house_count: leadData.poolHouseCount,
    cleaning_density: leadData.cleaningDensity,
    custom_active_sqft: leadData.customActiveSqft,
    is_moving_hourly: leadData.isMovingHourly,
    concierge_tasks: leadData.hourlyTasks,
    // === PROPERTY TYPE & AREAS (NEW) ===
    hourly_property_type: leadData.hourlyPropertyType,
    hourly_areas_to_include: leadData.hourlyAreasToInclude?.join(', '),
    hourly_areas_to_skip: leadData.hourlyAreasToSkip?.join(', '),
    // === SOUTH COAST HOURLY FIELDS ===
    hourly_access_type: leadData.hourlyAccessType,
    hourly_has_delicate_surfaces: leadData.hourlyHasDelicateSurfaces,
    hourly_delicate_surface_types: leadData.hourlyDelicateSurfaceTypes?.join(', '),
    hourly_home_condition: leadData.hourlyHomeCondition,
    hourly_must_haves: leadData.hourlyMustHaves,
    hourly_nice_to_haves: leadData.hourlyNiceToHaves,
    hourly_overtime_protocol: leadData.hourlyOvertimeProtocol,
    hourly_intent: leadData.hourlyIntent,
    hourly_team_size: leadData.hourlyTeamSize,
    // High-Perception Logistic Engineering fields
    hourly_is_property_occupied: leadData.hourlyIsPropertyOccupied,
    hourly_has_pets_to_secure: leadData.hourlyHasPetsToSecure,
    hourly_vertical_logistics: leadData.hourlyVerticalLogistics,
    hourly_scope_exclusions_confirmed: leadData.hourlyScopeExclusionsConfirmed,
    hourly_gate_code: leadData.hourlyGateCode,
    hourly_alarm_code: leadData.hourlyAlarmCode,
    hourly_key_location: leadData.hourlyKeyLocation,
    // Equipment & Supplies
    hourly_has_vacuum: leadData.hourlyHasVacuum,
    hourly_has_parking: leadData.hourlyHasParking,
    // === INTENT-SPECIFIC FIELDS ===
    // Routine Maintenance (extended)
    lifestyle_laundry_loads: leadData.lifestyleAddons?.laundryLoads,
    lifestyle_dishwasher: leadData.lifestyleAddons?.dishwasher,
    lifestyle_bed_making: leadData.lifestyleAddons?.bedMaking,
    lifestyle_plant_care: leadData.lifestyleAddons?.plantCare,
    lifestyle_trash_out: leadData.lifestyleAddons?.trashOut,
    lifestyle_mail_sort: leadData.lifestyleAddons?.mailSort,
    lifestyle_pet_bowls: leadData.lifestyleAddons?.petBowls,
    has_shedding_pets: leadData.hasSheddingPets,
    equipment_preference: leadData.equipmentPreference || undefined,
    client_supplies_notes: leadData.clientSuppliesNotes || undefined,
    routine_priorities: leadData.routinePriorities?.join(', '),
    preferred_day: leadData.preferredDay || undefined,
    // Priority Focus
    budget_hours: leadData.budgetHours,
    priority_ranking: leadData.priorityRanking?.join(' → '),
    priority_areas: leadData.priorityAreas?.join(' → '),
    scope_exclusion_confirmed: leadData.scopeExclusionConfirmed,
    // Deep Scrub
    grime_level: leadData.grimeLevel,
    has_natural_stone: leadData.hasNaturalStone,
    pull_out_appliances: leadData.pullOutAppliances,
    // Post-Event
    event_type: leadData.eventType,
    event_guest_count: leadData.eventGuestCount,
    affected_areas: leadData.affectedAreas?.join(', '),
    mess_types: leadData.messTypes?.join(', '),
    debris_bags: leadData.debrisBags,
    has_sticky_spills: leadData.hasStickySpills,
    furniture_needs_resetting: leadData.furnitureNeedsResetting,
    has_biohazard: leadData.hasBiohazard,
    must_finish_by: leadData.mustFinishBy,
    // Organization
    organization_tasks: leadData.organizationTasks?.join(', '),
    no_scrub_acknowledged: leadData.noScrubAcknowledged,
    clutter_level: leadData.clutterLevel || undefined,
    // Move-In/Out
    is_home_100_empty: leadData.isHome100Empty,
    needs_landlord_receipt: leadData.needsLandlordReceipt,
    
    // Renovation fields
    renovation_phase: leadData.renovationPhase,
    renovation_sqft: leadData.renovationSqft,
    renovation_occupancy: leadData.renovationOccupancy,
    renovation_debris_level: leadData.renovationDebrisLevel,
    renovation_surface_risk: leadData.renovationSurfaceRisk,
    renovation_contractors_done: leadData.renovationContractorsDone,
    renovation_dumpster: leadData.renovationDumpster,
    renovation_window_count: leadData.renovationWindowCount,
    renovation_hvac_filters: leadData.renovationHvacFilters,
    // Renovation Property Composition
    renovation_bedrooms: leadData.renovationBedrooms,
    renovation_bathrooms_master: leadData.renovationBathroomsMaster,
    renovation_bathrooms_full: leadData.renovationBathroomsFull,
    renovation_bathrooms_half: leadData.renovationBathroomsHalf,
    renovation_has_new_kitchen: leadData.renovationHasNewKitchen,
    renovation_kitchen_size: leadData.renovationKitchenSize,
    renovation_addons_applied: leadData.renovationAddonsApplied,
    renovation_total: leadData.renovationTotal,
    renovation_hours: leadData.renovationHours,
    
    // Move-In/Out Empty Shell Audit fields
    move_occupancy: leadData.moveOccupancy,
    // Floor Composition (MOVING mode)
    floor_hardwood_percent: leadData.floorHardwoodPercent,
    floor_carpet_percent: leadData.floorCarpetPercent,
    floor_is_focus: leadData.floorIsFocus,
    floor_focus_notes: leadData.floorFocusNotes,
    // Per-Space Floor Types (per-room mapping)
    space_floor_types: leadData.spaceFloorTypes,
    // Vertical Logistics (MOVING mode)
    property_type: leadData.propertyType,
    house_levels: leadData.houseLevels,
    apartment_floor: leadData.apartmentFloor,
    has_elevator: leadData.hasElevator,
    vertical_surcharge: leadData.verticalSurcharge,
    // Patio (MOVING mode)
    patio_count: leadData.patioCount,
    patio_scope: leadData.patioScope,
    patio_price: leadData.patioPrice,
    
    // === V3: AI TIME RECEIPT ===
    hourly_time_receipt: leadData.hourlyTimeReceipt ? {
      logistics_minutes: leadData.hourlyTimeReceipt.logistics.totalLogistics,
      active_cleaning_minutes: leadData.hourlyTimeReceipt.activeArea.subtotalMinutes,
      unified_spaces_minutes: leadData.hourlyTimeReceipt.unifiedSpaces.totalMinutes,
      task_minutes: leadData.hourlyTimeReceipt.tasks.totalMinutes,
      total_man_minutes: leadData.hourlyTimeReceipt.summary.totalManMinutes,
      suggested_clock_hours: leadData.hourlyTimeReceipt.summary.suggestedClockHours,
      suggested_team_size: leadData.hourlyTimeReceipt.teamSizing.recommendedTeamSize,
      team_rationale: leadData.hourlyTimeReceipt.teamSizing.rationale,
    } : null,
    
    // Summary
    summary: `Estimate for ${leadData.customerName || 'Client'} - ${leadData.serviceType || 'Service'} - Total: $${leadData.totalEstimate || 0}`,
    
    // Normalized payloads
    normalized_quote: normalizedQuote,
    housecall_suggestion: housecallSuggestion,
    
    // HCP API-ready bodies
    hcp_customer_body: hcpCustomerBody,
    hcp_lead_body_template: hcpLeadBodyTemplate,
    hcp_estimate_body_template: hcpEstimateBodyTemplate,
    hcp_customer_lookup: hcpCustomerLookup,
  };
}

/**
 * Send review lead data + PDF to Zapier webhook for abandoned-cart tracking.
 * This is fire-and-forget - errors are logged but never block the UI.
 * 
 * PDF is sent as FormData field "attachment" - use this in Zapier Email attachments.
 */
export async function sendReviewLeadToZapier(
  leadData: ReviewLeadData,
  pdfBlob: Blob,
  pdfFileName: string
): Promise<void> {
  const payloadJSON = buildZapierPayload(leadData, 'partial', 'review_webhook');
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Lead Payload] partial (Zapier Review)', payloadJSON.normalized_quote, payloadJSON.housecall_suggestion);
  }
  
  // Generate proper filename with quote ID
  const fileName = leadData.quoteId 
    ? `NCS-${leadData.quoteId}-estimate.pdf`
    : pdfFileName || 'quote-estimate.pdf';
  
  await sendLeadToZapierWithAttachment(
    ZAPIER_WEBHOOK_URL,
    payloadJSON,
    pdfBlob,
    fileName
  );
  
  console.log('[Zapier Webhook] Partial lead fired:', leadData.quoteId);
}

/**
 * Send completed lead data + PDF to Zapier webhook.
 * Called from handleSubmit after successful form submission.
 * Uses SAME webhook as partial - differentiated by lead_status field.
 */
export async function sendCompletedLeadToZapier(
  leadData: ReviewLeadData,
  pdfBlob: Blob | null,
  pdfFileName: string
): Promise<void> {
  const payloadJSON = buildZapierPayload(leadData, 'completed', 'completed_webhook');
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Lead Payload] completed (Zapier Direct)', payloadJSON.normalized_quote, payloadJSON.housecall_suggestion);
  }
  
  // Generate proper filename with quote ID
  const fileName = leadData.quoteId 
    ? `NCS-${leadData.quoteId}-estimate.pdf`
    : pdfFileName || 'quote-estimate.pdf';
  
  await sendLeadToZapierWithAttachment(
    ZAPIER_WEBHOOK_URL,
    payloadJSON,
    pdfBlob,
    fileName
  );
  
  console.log('[Zapier Webhook] Completed lead fired:', leadData.quoteId);
}
