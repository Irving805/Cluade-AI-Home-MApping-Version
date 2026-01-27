/**
 * Normalized Quote Payload for Zapier / Housecall Pro Integration
 * 
 * This module provides a canonical data structure that is:
 * 1. Ready for direct mapping to Housecall Pro APIs (/customers, /leads)
 * 2. Consistent across all webhooks (partial + completed)
 * 3. Self-documenting with stable field names
 */

import { 
  ServiceMode, 
  BookingFormData, 
  CustomZones, 
  CustomCounts, 
  Addon, 
  MicroServiceSelection,
  RecurringStartMode 
} from '@/contexts/BookingContext';
import { 
  microServices, 
  microServiceEnglishLabels, 
  calculateMicroServicePrice,
  addonPrices,
  homeSizeOptions,
  isHeavyCondition,
  MICRO_SERVICES_MINIMUM
} from '@/lib/pricing';
import { calculateRoomWindowTotal, calcWindowMapByRoom, isWindowIncludedFlow, WINDOW_TYPES, BLINDS_CONFIG, INCLUDED_WINDOW_LIMITS } from '@/lib/roomWindowConfig';
import { getAreaTrackingCode } from '@/lib/homeStructureIds';
import { HALLWAY_RATES } from '@/lib/pricing_hallways';

// ============ TYPE DEFINITIONS ============

export interface NormalizedQuotePayload {
  quote_id: string;
  lead_status: 'partial' | 'completed';

  // Service info
  service_type: string;
  service_mode: string;
  service_flow: string;
  move_context: 'move_out' | 'move_in' | null;

  // Pricing
  estimated_total: number;
  estimated_total_display: string;

  // Customer contact
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_mobile: string;
  customer_home_phone: string;
  customer_work_phone: string;

  // Address
  customer_street: string;
  customer_street_line_2: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  customer_country: string;

  // Home info
  home_type: string;
  approx_sqft: string;
  bedrooms_count: number;
  full_bath_count: number;
  half_bath_count: number;
  home_condition: string;
  
  // Area-Specific Condition Fees (Deep Clean / Move-In-Out)
  condition_fee: number;
  condition_fee_type: 'area_specific' | 'blanket';
  condition_fee_level: 'normal' | 'above_average' | 'heavy_severe' | null;
  condition_fee_breakdown: Array<{
    room_id: string;
    category: 'kitchen' | 'bathroom' | 'bedroom' | 'living';
    display_name: string;
    fee: number;
  }> | null;
  condition_fee_cap_applied: boolean;
  condition_fee_floor_applied: boolean;
  // Scheduling
  preferred_date: string;
  access_notes: string;
  customer_message: string;

  // Selections
  addons_selected: string;
  windows_selected: string;
  micro_services_selected: string;

  // Source
  lead_source: string;

  // Hourly Priority Service fields
  is_hourly_mode: boolean;
  hourly_clock_hours: number;
  hourly_man_hours: number;
  hourly_intensity: 'basic' | 'deep' | null;
  hourly_supplies: 'client' | 'company' | null;
  hourly_rate_applied: number;
  hourly_priority_notes: string;
  hourly_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'onetime' | null;
  days_per_week: number; // For daily frequency: 2-5 days
  
  // Logistics fields
  has_vacuum: boolean;
  has_parking: boolean;
  vacuum_note: string; // Internal note if no vacuum
  supplies_note: string; // Internal note for recurring supplies

  // Move-In/Out Empty Shell Audit fields
  move_occupancy: 'vacant' | 'furnished';
  move_occupancy_multiplier: number;
  // Floor Composition (legacy percentages)
  floor_hardwood_percent: number;
  floor_carpet_percent: number;
  floor_is_focus: boolean;
  floor_focus_notes: string;
  // Per-Space Floor Types (detailed room mapping)
  space_floor_types?: {
    kitchen: string;
    living: string;
    dining: string;
    hallways: string;
    bedrooms: Record<string, string>;
  };
  // Vertical Logistics (MOVING mode)
  property_type: 'house' | 'apartment' | null;
  house_levels: number;
  apartment_floor: number;
  has_elevator: boolean;
  vertical_surcharge: number;
  vertical_reason: string;
  // Patio (MOVING mode)
  patio_count: number;
  patio_scope: 'sweep' | 'scrub';
  patio_price: number;

  // === SOUTH COAST CONCIERGE HOURLY FIELDS ===
  hourly_access_type: 'standard' | 'hillside' | 'estate_gated' | null;
  hourly_has_delicate_surfaces: boolean;
  hourly_delicate_surface_types: string;
  hourly_home_condition: 'tidy' | 'lived_in' | 'cluttered' | 'deep_recovery' | null;
  hourly_must_haves: string;
  hourly_nice_to_haves: string;
  hourly_overtime_protocol: 'strict' | 'flex' | null;
  hourly_intent: string;
  hourly_team_size: number;
  hourly_access_friction_minutes: number;
  hourly_effective_cleaning_minutes: number;
  hourly_condition_efficiency: number;
  // === HIGH-PERCEPTION LOGISTIC ENGINEERING FIELDS ===
  hourly_is_property_occupied: boolean;
  hourly_has_pets_to_secure: boolean;
  hourly_vertical_logistics: 'ground' | 'elevator' | 'walkup' | null;
  hourly_scope_exclusions_confirmed: boolean;
  hourly_gate_code: string;
  hourly_alarm_code: string;
  hourly_key_location: string;
  hourly_occupancy_multiplier: number;
  hourly_vertical_friction_minutes: number;

  // === V3: AI TIME RECEIPT (Transparency Data) ===
  hourly_time_receipt: {
    logistics_minutes: number;
    active_cleaning_minutes: number;
    unified_spaces_minutes: number;
    task_minutes: number;
    total_man_minutes: number;
    suggested_clock_hours: number;
    suggested_team_size: number;
    team_rationale: string;
    // V4: Frequency Adjustment Data
    frequency_adjustment?: {
      frequency: string;
      labor_multiplier: number;
      deep_maintenance_buffer: number;
      adjustment_label: string;
      is_efficiency_mode: boolean;
    } | null;
    // V5: Additional Structures breakdown
    structure_breakdown?: {
      guest_house: { count: number; setup: number; cleaning: number; total: number };
      studio: { count: number; setup: number; cleaning: number; total: number };
      pool_house: { count: number; setup: number; cleaning: number; total: number };
      total_structure_minutes: number;
    } | null;
    large_estate_traversal_minutes?: number;
  } | null;

  // Renovation mode fields
  is_renovation_mode: boolean;
  renovation_phase: string | null;
  renovation_sqft: number;
  renovation_occupancy: string | null;
  renovation_debris_level: string | null;
  renovation_surface_risk: string | null;
  renovation_contractors_done: boolean;
  renovation_dumpster_on_site: boolean;
  // Renovation Property Composition
  renovation_bedrooms: number;
  renovation_bathrooms_master: number;
  renovation_bathrooms_full: number;
  renovation_bathrooms_half: number;
  renovation_has_new_kitchen: boolean;
  renovation_kitchen_size: string | null;
  // Renovation Quote Summary
  renovation_addons_applied: string;
  renovation_quote_total: number;
  renovation_quote_hours: number;

  // Room-based window selections (LIVE_HERE/MOVING mode)
  room_window_selections?: {
    room_id: string;
    room_label: string;
    window_count: number;
    glass_mode: string;
    blinds_count: number;
    blinds_type: string | null;
  }[];
  room_window_totals?: {
    window_price: number;
    blinds_price: number;
    total_price: number;
    labor_minutes: number;
    total_windows_inside: number;
    total_windows_outside: number;
    total_blinds: number;
  };
  
  // Granular window inventory (individual window types per room for Zapier/HCP itemization)
  window_inventory_detailed?: {
    room_id: string;
    room_label: string;
    is_structure: boolean; // true if guest_house, studio, pool_house
    items: {
      window_type_id: string;
      window_type_name: string;
      quantity: number;
      glass_mode: 'interior' | 'exterior' | 'both' | null;
      price_per_side: number;
      line_total: number;
      is_included: boolean; // NEW: true if this window is covered by the included discount
      included_value: number; // NEW: dollar value of discount for this window
    }[];
    blinds_count: number;
    blinds_type: string | null;
    sills_tracks_included: boolean;
    room_total: number;
    included_windows_count: number; // NEW: limit of included windows for this room type
  }[];

  // NEW: Baseboard configuration per room
  baseboard_config?: {
    kitchen: boolean;
    living: boolean;
    dining: boolean;
    hallways: boolean;
    bedrooms: Record<string, boolean>;
  };

  // NEW: Surface notes per room for cleaning team
  surface_notes?: {
    kitchen: string;
    living: string;
    dining: string;
    hallways: string;
    bedrooms: Record<string, string>;
  };

  // NEW: Bedroom identity profiles with add-ons
  bedroom_profiles?: {
    id: string;
    profile: string;
    ceiling_fans: number;
    light_fixtures: number;
    closet_cabinets: number;
  }[];

  // NEW: Closet inventory summary for CRM/work order (grouped by room, $0 in Deep/Move)
  closet_inventory?: {
    items: {
      room_id: string;
      room_label: string;
      closet_count: number;
      is_included: boolean; // true for Deep/Move flows
      price: number; // 0 for Deep/Move, $20 for Standard
    }[];
    total_closets: number;
    total_price: number; // 0 for Deep/Move
    is_deep_move_flow: boolean;
  };

  // NEW: Deep/Move flow inclusions (for work order confirmation)
  deep_move_inclusions?: {
    vent_surfaces: boolean;
    closet_doors: boolean;
    window_tracks: boolean;
    baseboards: boolean;
    closet_interiors: boolean; // NEW: explicitly tracks closet interior inclusion
  };

  // NEW: Room floor locations for work order routing (multi-floor properties)
  room_locations?: {
    max_floors: number;
    kitchen: number;
    living: number;
    dining: number;
    hallways: number;
    bedrooms: Record<string, number>;
    bathrooms: {
      master: number[];
      full: number[];
      half: number[];
    };
    optional_spaces: Record<string, number[]>;
  };

  // SSOT: Multi-stair array (formData.stairs[])
  stairs?: Array<{
    id: string;
    label: string;
    from_floor: number;
    to_floor: number;
    surface_type: string;
    step_count: number;
    corner_buildup: boolean;
    pet_hair: boolean;
    slip_hazards: boolean;
    railings_detail: boolean;
  }>;
  
  // Legacy: Stairs configuration (backward compatibility)
  stairs_config?: {
    surface_type: string;
    step_count: number;
    corner_buildup: boolean;
    pet_hair_accumulation: boolean;
    slip_hazards: boolean;
    railings_detail: boolean;
  };

  // NEW: Hallway windows (if any)
  hallway_windows?: {
    inventory: any[];
    blinds_count: number;
    blinds_type: string | null;
  };

  // NEW: Room hazards for Deep/Move flows (waste & safety tracking)
  room_hazards?: {
    [roomId: string]: {
      mess_types: string[];
      trash_bags: number;
      sticky_spills: boolean;
    };
  };
  total_trash_bags?: number;
  rooms_with_sticky_spills?: string[];

  // NEW: Additional Structures (Compound/Estate Properties)
  additional_structures?: {
    guest_houses: Array<{
      id: string;
      layout: 'studio' | '1br_1ba';
      kitchen_type: 'none' | 'kitchenette' | 'full';
      floor_type: string;
      attachment: 'attached' | 'detached';
      floor_location: number;
      window_count: number;
      trash_bags: number;
      sticky_spills: boolean;
      mess_types: string[];
      price: number;
    }>;
    art_studios: Array<{
      id: string;
      studio_type: string;
      has_bathroom: boolean;
      floor_type: string;
      surface_sensitivity: 'standard' | 'delicate';
      attachment: 'attached' | 'detached';
      floor_location: number;
      special_notes: string;
      trash_bags: number;
      sticky_spills: boolean;
      mess_types: string[];
      price: number;
    }>;
    pool_houses: number;
    total_structures: number;
    structures_total_price: number;
    total_structure_trash_bags: number;
    detached_transit_buffer_minutes: number;
  };

  // NEW: Premium Window Cleaning Map (Single Source of Truth)
  // Uses calcWindowMapByRoom with PER_ROOM and AGGREGATE policies
  window_cleaning_map?: {
    is_included_flow: boolean;
    rooms: Array<{
      room_id: string;
      room_type: string;
      room_label: string;
      policy: 'PER_ROOM' | 'AGGREGATE';
      scope_type: 'interior' | 'both';
      included_limit: number;
      included_count: number;
      included_value: number;
      billable_count: number;
      billable_cost: number;
      total_windows: number;
    }>;
    totals: {
      total_windows: number;
      total_included_windows: number;
      total_included_value: number;
      total_billable_cost: number;
    };
  };

  // NEW: Home Structure Model (Stable IDs for all mapped areas)
  home_structure?: {
    areas: Array<{
      area_type: 'hallway' | 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'stairs' | 'guest_house' | 'art_studio' | 'pool_house' | 'patio';
      stable_id: string;
      tracking_code: string;
      label: string;
      floor_level?: string;
      floor_type?: string;
      size_tier?: string;
      cabinet_count?: number;
      cabinets_empty?: boolean;
      organization_hours?: number;
      fee_applied?: number;
      windows?: {
        count: number;
        glass_mode: string;
        blinds_count: number;
      };
    }>;
    total_areas: number;
  };

  // UTM / tracking context
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
}

export interface HousecallCustomerAddress {
  street: string;
  street_line_2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface HousecallCustomer {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  home_number: string;
  work_number: string;
  lead_source: string;
  addresses: HousecallCustomerAddress[];
  tags: string[];
  notes: string;
}

export interface HousecallLineItem {
  name: string;
  description: string;
  kind: 'labor';
  quantity: number;
  unit_price: number; // in cents
}

export interface HousecallLead {
  line_items: HousecallLineItem[];
  lead_source: string;
  note: string;
  tags: string[];
  estimated_total_cents: number;
}

export interface HousecallSuggestion {
  customer: HousecallCustomer;
  lead: HousecallLead;
}

// ============ HCP API-READY BODY TEMPLATES ============

/**
 * Ready-to-use body for POST /customers in Housecall Pro
 */
export interface HcpCustomerBody {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  notifications_enabled: boolean;
  mobile_number: string | null;
  home_number: string | null;
  work_number: string | null;
  tags: string[];
  lead_source: string | null;
  notes: string;
  addresses: Array<{
    street: string;
    street_line_2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  }>;
}

/**
 * Template for POST /leads in Housecall Pro
 * Zapier will insert customer_id after finding/creating customer
 */
export interface HcpLeadBodyTemplate {
  address: {
    city: string;
    state: string;
    street: string;
    street_line_2: string;
    zip: string;
  };
  lead_source: string;
  line_items: Array<{
    description: string;
    kind: 'labor';
    name: string;
    quantity: number;
    unit_cost: number;  // in CENTS
    unit_price: number; // in CENTS
  }>;
  note: string;
  tags: string[];
  tax_name: string;
  tax_rate: number;
}

/**
 * Template for POST /estimates in Housecall Pro
 * Zapier will insert customer_id after finding/creating customer
 */
export interface HcpEstimateBodyTemplate {
  note: string;
  message: string;
  address: {
    street: string;
    street_line_2: string;
    city: string;
    state: string;
    zip: string;
  };
  lead_source: string;
  options: Array<{
    name: string;
    tags: string[];
    line_items: Array<{
      name: string;
      description: string;
      unit_price: number; // in CENTS
      quantity: number;
      unit_cost: number;  // 0 for now
    }>;
  }>;
  estimate_fields: {
    job_type_id?: string;
    business_unit_id?: string;
  };
}

/**
 * Helper for GET /customers?q=... and deduplication in Zapier
 */
export interface HcpCustomerLookup {
  primary_q: string;      // Best single query string for Housecall q param
  secondary_qs: string[]; // Alternative queries (email, phone, name+city, etc.)
  composite_key: string;  // Stable key for Storage by Zapier deduplication
}

// ============ TRACKING CONTEXT ============

export interface GlobalTrackingContext {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
}

// Capture UTM params on module load
const trackingContext: GlobalTrackingContext = {};

if (typeof window !== 'undefined') {
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const utmTerm = params.get('utm_term');
    const utmContent = params.get('utm_content');
    const gclid = params.get('gclid');
    const fbclid = params.get('fbclid');
    
    if (utmSource) trackingContext.utm_source = utmSource;
    if (utmMedium) trackingContext.utm_medium = utmMedium;
    if (utmCampaign) trackingContext.utm_campaign = utmCampaign;
    if (utmTerm) trackingContext.utm_term = utmTerm;
    if (utmContent) trackingContext.utm_content = utmContent;
    if (gclid) trackingContext.gclid = gclid;
    if (fbclid) trackingContext.fbclid = fbclid;
    
    if (document.referrer) {
      trackingContext.referrer = document.referrer;
    }
  } catch (e) {
    // Silent fail
  }
}

export function getTrackingContext(): GlobalTrackingContext {
  return { ...trackingContext };
}

// ============ HELPER FUNCTIONS ============

function getConditionLabel(conditionFee: number): string {
  if (conditionFee === 0) return 'Light';
  if (conditionFee === 120) return 'Heavy';
  if (conditionFee === 180) return 'Extra Heavy';
  return 'Light';
}

function getBedroomCount(homeSize: number): number {
  // homeSize index maps roughly to bedrooms
  // 0-2 = 1bed, 3-6 = 2bed, 7-10 = 3bed, 11-13 = 4bed, 14 = 5bed
  if (homeSize <= 2) return 1;
  if (homeSize <= 6) return 2;
  if (homeSize <= 10) return 3;
  if (homeSize <= 13) return 4;
  return 5;
}

function getSqftLabel(sqft: string, homeSize?: number): string {
  // If we have a sqft value, use it
  if (sqft) {
    // Return as-is if it's already a descriptive label
    if (sqft.includes('sqft') || sqft.includes('Bed')) return sqft;
    
    // Map short keys to labels
    const sqftMap: Record<string, string> = {
      'studio': 'Studio (350-650 sqft)',
      '1bed': '1 Bed (650-1,100 sqft)',
      '2bed': '2 Bed (1,100-1,700 sqft)',
      '3bed': '3 Bed (1,600-2,400 sqft)',
      '4bed': '4 Bed (2,400-3,000 sqft)',
      '5bed': '5+ Bed (3,500+ sqft)',
    };
    return sqftMap[sqft] || sqft;
  }
  
  // Fallback: derive from homeSize (bedroom count)
  if (homeSize !== undefined && homeSize >= 0) {
    const homeSizeToSqft: Record<number, string> = {
      0: 'Studio (350-650 sqft)',
      1: '1 Bed (650-1,100 sqft)',
      2: '2 Bed (1,100-1,700 sqft)',
      3: '3 Bed (1,600-2,400 sqft)',
      4: '4 Bed (2,400-3,000 sqft)',
      5: '5+ Bed (3,500+ sqft)',
    };
    return homeSizeToSqft[Math.min(homeSize, 5)] || `${homeSize} Bed`;
  }
  
  return '';  // Empty string for cleaner formatting
}

// ============ BUILDER PARAMS ============

export interface BuildNormalizedPayloadParams {
  quoteId: string;
  leadStatus: 'partial' | 'completed';
  mode: ServiceMode;
  formData: BookingFormData;
  customZones: CustomZones;
  customCounts: CustomCounts;
  selectedAddons: Addon[];
  selectedMicroServices: MicroServiceSelection[];
  estimatedTotal: number;
  cityKey?: string;
  moveContext?: 'move_out' | 'move_in' | null;
}

// ============ BUILD NORMALIZED PAYLOAD ============

export function buildNormalizedQuotePayload(
  params: BuildNormalizedPayloadParams
): NormalizedQuotePayload {
  const {
    quoteId,
    leadStatus,
    mode,
    formData,
    customZones,
    customCounts,
    selectedAddons,
    selectedMicroServices,
    estimatedTotal,
    moveContext,
  } = params;

  const tracking = getTrackingContext();

  // Service type (English)
  const serviceType = mode === 'custom' ? 'Custom / Specific Areas' : (formData.serviceType || 'Deep Clean');
  const serviceMode = mode === 'full' ? 'Full Home' : 'Specific Areas';
  const serviceFlow = mode === 'full' ? 'full-home' : 'custom-areas';

  // Bedroom/bath counts
  let bedroomsCount = 0;
  let fullBathCount = 0;
  let halfBathCount = 0;

  if (mode === 'full') {
    bedroomsCount = getBedroomCount(formData.homeSize);
    fullBathCount = (formData.masterBaths || 0) + (formData.fullBaths || 0);
    halfBathCount = formData.halfBaths || 0;
  } else {
    bedroomsCount = customCounts.bedroomCount || 0;
    fullBathCount = (customCounts.masterBaths || 0) + (customCounts.fullBaths || 0);
    halfBathCount = customCounts.halfBaths || 0;
  }

  // Addons (non-window)
  const nonWindowAddons = selectedAddons.filter(a => 
    !a.value.toLowerCase().includes('window') && 
    !a.value.toLowerCase().includes('blind') &&
    !a.value.toLowerCase().includes('shutter')
  );
  const addonsSelected = nonWindowAddons
    .map(a => a.quantity > 1 ? `${a.value}:${a.quantity}` : a.value)
    .join(',');

  // Windows/blinds
  const windowAddons = selectedAddons.filter(a => 
    a.value.toLowerCase().includes('window') || 
    a.value.toLowerCase().includes('blind') ||
    a.value.toLowerCase().includes('shutter')
  );
  const windowsSelected = windowAddons
    .map(a => a.quantity > 1 ? `${a.value}:${a.quantity}` : a.value)
    .join(',');

  // Micro-services
  const microServicesSelected = selectedMicroServices
    .map(sel => {
      const label = microServiceEnglishLabels[sel.id] || sel.id;
      return sel.quantity > 1 ? `${label}:${sel.quantity}` : label;
    })
    .join(',');

  // Access notes
  const accessParts: string[] = [];
  if (formData.gatedCommunity) accessParts.push('Gated community');
  if (formData.apartmentComplex) accessParts.push('Apartment/Condo complex');
  if (formData.upperFloorNoElevator) accessParts.push('Upper floor without elevator');
  if (formData.accessNotes) accessParts.push(formData.accessNotes);

  const payload: NormalizedQuotePayload = {
    quote_id: quoteId || '',
    lead_status: leadStatus,

    service_type: serviceType,
    service_mode: serviceMode,
    service_flow: serviceFlow,
    move_context: moveContext || null,

    estimated_total: estimatedTotal,
    estimated_total_display: `$${estimatedTotal}`,

    customer_first_name: formData.firstName || '',
    customer_last_name: formData.lastName || '',
    customer_email: formData.email || '',
    customer_mobile: formData.phone || '',
    customer_home_phone: formData.phone || '',
    customer_work_phone: '',

    customer_street: formData.address || '',
    customer_street_line_2: '',
    customer_city: formData.city || '',
    customer_state: 'CA',
    customer_zip: '',
    customer_country: 'USA',

    home_type: formData.homeType || 'Single-Family Home',
    approx_sqft: getSqftLabel(formData.sqft || '', formData.homeSize),
    bedrooms_count: bedroomsCount,
    full_bath_count: fullBathCount,
    half_bath_count: halfBathCount,
    home_condition: getConditionLabel(formData.conditionFee),
    
    // Area-Specific Condition Fees (populated from summary.totals when available)
    condition_fee: formData.conditionFee || 0,
    condition_fee_type: formData.areaConditionEnabled ? 'area_specific' : 'blanket',
    condition_fee_level: formData.areaConditionEnabled 
      ? (formData.globalConditionLevel || 'normal') 
      : null,
    condition_fee_breakdown: formData.areaConditionEnabled && formData.areaConditionSelections?.length > 0
      ? formData.areaConditionSelections.map(sel => ({
          room_id: sel.roomId,
          category: sel.category,
          display_name: sel.roomId, // Will be enriched by caller with proper display name
          fee: 0, // Will be enriched by caller with calculated fee
        }))
      : null,
    condition_fee_cap_applied: false, // Will be enriched by caller
    condition_fee_floor_applied: false, // Will be enriched by caller

    preferred_date: formData.date || 'Flexible',
    access_notes: accessParts.join('; ') || '',
    customer_message: formData.notes || '',

    addons_selected: addonsSelected,
    windows_selected: windowsSelected,
    micro_services_selected: microServicesSelected,

    lead_source: 'Website Pricing Form',

    // Hourly Priority Service fields
    is_hourly_mode: formData.isHourlyMode || false,
    hourly_clock_hours: formData.isHourlyMode ? formData.hourlyHours : 0,
    hourly_man_hours: formData.isHourlyMode ? formData.hourlyHours * 2 : 0,
    hourly_intensity: formData.isHourlyMode ? formData.hourlyIntensity : null,
    hourly_supplies: formData.isHourlyMode ? formData.hourlySupplies : null,
    hourly_rate_applied: formData.isHourlyMode ? estimatedTotal / (formData.hourlyHours * 2) : 0,
    hourly_priority_notes: formData.hourlyPriorityNotes || '',
    hourly_frequency: formData.isHourlyMode ? (formData.hourlyFrequency || 'onetime') : null,
    days_per_week: formData.isHourlyMode && formData.hourlyFrequency === 'daily' ? formData.daysPerWeek : 0,
    
    // Logistics fields
    has_vacuum: formData.hasVacuum ?? true,
    has_parking: formData.hasParking ?? true,
    vacuum_note: !formData.hasVacuum ? 'REQUERIMIENTO: Llevar aspiradora industrial' : '',
    supplies_note: (formData.isHourlyMode && formData.hourlyFrequency && formData.hourlyFrequency !== 'onetime') 
      ? "Nancy's Supplies Included (Recurring Maintenance)" 
      : '',
    
    // Move-In/Out Empty Shell Audit fields
    move_occupancy: formData.moveOccupancy || 'vacant',
    move_occupancy_multiplier: formData.moveOccupancy === 'furnished' ? 1.25 : 1.0,
    // Floor Composition (legacy)
    floor_hardwood_percent: formData.floorHardwoodPercent ?? 50,
    floor_carpet_percent: formData.floorCarpetPercent ?? 50,
    floor_is_focus: formData.floorIsFocus ?? false,
    floor_focus_notes: formData.floorFocusNotes || '',
    // Per-Space Floor Types (NEW - detailed room mapping)
    space_floor_types: formData.spaceFloorTypes ? {
      kitchen: formData.spaceFloorTypes.kitchen || 'hardwood_tile',
      living: formData.spaceFloorTypes.living || 'hardwood_tile',
      dining: formData.spaceFloorTypes.dining || 'hardwood_tile',
      hallways: formData.spaceFloorTypes.hallways || 'hardwood_tile',
      bedrooms: formData.spaceFloorTypes.bedrooms || {},
    } : undefined,
    // Vertical Logistics
    property_type: formData.propertyType || null,
    house_levels: formData.houseLevels || 1,
    apartment_floor: formData.apartmentFloor || 1,
    has_elevator: formData.hasElevator !== false,
    vertical_surcharge: 0, // Will be calculated by caller if needed
    vertical_reason: '',
    // Patio
    patio_count: formData.patioCount || 0,
    patio_scope: formData.patioScope || 'sweep',
    patio_price: 0, // Will be calculated by caller if needed

    // === SOUTH COAST CONCIERGE HOURLY FIELDS ===
    hourly_access_type: formData.isHourlyMode ? (formData.accessType || 'standard') : null,
    hourly_has_delicate_surfaces: formData.hasDelicateSurfaces || false,
    hourly_delicate_surface_types: (formData.delicateSurfaceTypes || []).join(', '),
    hourly_home_condition: formData.isHourlyMode ? (formData.homeConditionLevel || 'lived_in') : null,
    hourly_must_haves: (formData.hourlyMustHaves || []).join(', '),
    hourly_nice_to_haves: formData.hourlyNiceToHaves || '',
    hourly_overtime_protocol: formData.isHourlyMode ? (formData.overtimeProtocol || 'strict') : null,
    hourly_intent: formData.hourlyIntent || 'priority_focus',
    hourly_team_size: formData.hourlyTeamSize || 2,
    hourly_access_friction_minutes: 0, // Will be calculated by caller if needed
    hourly_effective_cleaning_minutes: 0, // Will be calculated by caller if needed
    hourly_condition_efficiency: 1.0, // Will be calculated by caller if needed
    // === HIGH-PERCEPTION LOGISTIC ENGINEERING FIELDS ===
    hourly_is_property_occupied: formData.isPropertyOccupied ?? true,
    hourly_has_pets_to_secure: formData.hasPetsToSecure ?? false,
    hourly_vertical_logistics: formData.isHourlyMode ? (formData.verticalLogistics || 'ground') : null,
    hourly_scope_exclusions_confirmed: formData.scopeExclusionsConfirmed ?? false,
    hourly_gate_code: formData.gateCode ? '••••••' : '', // Masked for logs
    hourly_alarm_code: formData.alarmCode ? '••••••' : '', // Masked for logs
    hourly_key_location: formData.keyLocation || '',
    hourly_occupancy_multiplier: formData.isPropertyOccupied ? 1.15 : 1.0,
    hourly_vertical_friction_minutes: 0, // Will be calculated by caller if needed

    // === V3: AI TIME RECEIPT (Transparency Data) ===
    hourly_time_receipt: formData.hourlyTimeReceipt ? {
      logistics_minutes: formData.hourlyTimeReceipt.logistics.totalLogistics,
      active_cleaning_minutes: formData.hourlyTimeReceipt.activeArea.subtotalMinutes,
      unified_spaces_minutes: formData.hourlyTimeReceipt.unifiedSpaces.totalMinutes,
      task_minutes: formData.hourlyTimeReceipt.tasks.totalMinutes,
      total_man_minutes: formData.hourlyTimeReceipt.summary.totalManMinutes,
      suggested_clock_hours: formData.hourlyTimeReceipt.summary.suggestedClockHours,
      suggested_team_size: formData.hourlyTimeReceipt.teamSizing.recommendedTeamSize,
      team_rationale: formData.hourlyTimeReceipt.teamSizing.rationale,
      // V4: Frequency Adjustment Data
      frequency_adjustment: formData.hourlyTimeReceipt.frequencyAdjustment ? {
        frequency: formData.hourlyTimeReceipt.frequencyAdjustment.frequency,
        labor_multiplier: formData.hourlyTimeReceipt.frequencyAdjustment.laborMultiplier,
        deep_maintenance_buffer: formData.hourlyTimeReceipt.frequencyAdjustment.deepMaintenanceBuffer,
        adjustment_label: formData.hourlyTimeReceipt.frequencyAdjustment.adjustmentLabel,
        is_efficiency_mode: formData.hourlyTimeReceipt.frequencyAdjustment.isEfficiencyMode,
      } : null,
      // V5: Additional Structures breakdown
      structure_breakdown: formData.hourlyTimeReceipt.additionalStructures ? {
        guest_house: {
          count: formData.hourlyTimeReceipt.additionalStructures.guestHouse.count,
          setup: formData.hourlyTimeReceipt.additionalStructures.guestHouse.setupMinutes,
          cleaning: formData.hourlyTimeReceipt.additionalStructures.guestHouse.cleaningMinutes,
          total: formData.hourlyTimeReceipt.additionalStructures.guestHouse.total,
        },
        studio: {
          count: formData.hourlyTimeReceipt.additionalStructures.studio.count,
          setup: formData.hourlyTimeReceipt.additionalStructures.studio.setupMinutes,
          cleaning: formData.hourlyTimeReceipt.additionalStructures.studio.cleaningMinutes,
          total: formData.hourlyTimeReceipt.additionalStructures.studio.total,
        },
        pool_house: {
          count: formData.hourlyTimeReceipt.additionalStructures.poolHouse.count,
          setup: formData.hourlyTimeReceipt.additionalStructures.poolHouse.setupMinutes,
          cleaning: formData.hourlyTimeReceipt.additionalStructures.poolHouse.cleaningMinutes,
          total: formData.hourlyTimeReceipt.additionalStructures.poolHouse.total,
        },
        total_structure_minutes: formData.hourlyTimeReceipt.additionalStructures.totalMinutes,
      } : null,
      large_estate_traversal_minutes: formData.hourlyTimeReceipt.logistics.largeEstateTraversal || 0,
    } : null,

    // Renovation mode fields
    is_renovation_mode: !!formData.renovationScope?.sqft && formData.renovationScope.sqft > 0,
    renovation_phase: formData.renovationScope?.phase || null,
    renovation_sqft: formData.renovationScope?.sqft || 0,
    renovation_occupancy: formData.renovationScope?.occupancy || null,
    renovation_debris_level: formData.renovationScope?.debrisLevel || null,
    renovation_surface_risk: formData.renovationScope?.surfaceRisk || null,
    renovation_contractors_done: formData.renovationScope?.contractorsFinished ?? false,
    renovation_dumpster_on_site: formData.renovationScope?.dumpsterOnSite ?? false,
    // Renovation Property Composition
    renovation_bedrooms: formData.renovationScope?.bedrooms || 0,
    renovation_bathrooms_master: formData.renovationScope?.bathrooms?.master || 0,
    renovation_bathrooms_full: formData.renovationScope?.bathrooms?.full || 0,
    renovation_bathrooms_half: formData.renovationScope?.bathrooms?.half || 0,
    renovation_has_new_kitchen: formData.renovationScope?.hasNewKitchen ?? false,
    renovation_kitchen_size: formData.renovationScope?.hasNewKitchen ? formData.renovationScope?.kitchenSize : null,
    // Renovation Quote Summary (will be populated by caller if available)
    renovation_addons_applied: '',
    renovation_quote_total: 0,
    renovation_quote_hours: 0,

    // Room-based window selections (LIVE_HERE/MOVING mode)
    room_window_selections: formData.roomWindowSelections?.filter(r => 
      r.glassMode !== 'none' || r.blindsCount > 0
    ).map(room => ({
      room_id: room.roomId,
      room_label: room.roomLabel,
      window_count: room.windowCount,
      glass_mode: room.glassMode,
      blinds_count: room.blindsCount,
      blinds_type: room.blindsType,
    })) || [],
    room_window_totals: formData.roomWindowSelections && formData.roomWindowSelections.length > 0 
      ? (() => {
          const totals = calculateRoomWindowTotal(formData.roomWindowSelections);
          return {
            window_price: totals.windowPrice,
            blinds_price: totals.blindsPrice,
            total_price: totals.totalPrice,
            labor_minutes: totals.laborMinutes,
            total_windows_inside: totals.totalWindowsInside,
            total_windows_outside: totals.totalWindowsOutside,
            total_blinds: totals.totalBlinds,
          };
        })()
      : undefined,
    
    // Granular window inventory with individual window types per room
    window_inventory_detailed: formData.roomWindowSelections?.filter(r => 
      (r.windowInventory && r.windowInventory.length > 0) || r.glassMode !== 'none' || r.blindsCount > 0
    ).map(room => {
      const isStructure = room.roomId.startsWith('guest_') || room.roomId.startsWith('studio_') || room.roomId.startsWith('pool_');
      const isDeepOrMove = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
      const limit = INCLUDED_WINDOW_LIMITS[room.roomType]?.count || 0;
      let remainingIncluded = isDeepOrMove ? limit : 0;
      
      // Build granular window items from inventory with inclusion tracking
      const items = room.windowInventory?.filter(item => item.glassMode !== null).map(item => {
        const windowType = WINDOW_TYPES[item.typeId];
        const sideMultiplier = item.glassMode === 'both' ? 2 : 1;
        const lineTotal = item.quantity * (windowType?.pricePerSide || 5) * sideMultiplier;
        const typeName = windowType?.id?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || item.typeId;
        
        // Check if this window qualifies for inclusion (interior only for Deep/Move)
        const isInteriorOnly = item.glassMode === 'interior';
        const qualifiesForInclusion = isDeepOrMove && isInteriorOnly && remainingIncluded > 0;
        const includedQty = qualifiesForInclusion ? Math.min(item.quantity, remainingIncluded) : 0;
        remainingIncluded -= includedQty;
        
        return {
          window_type_id: item.typeId,
          window_type_name: typeName,
          quantity: item.quantity,
          glass_mode: item.glassMode,
          price_per_side: windowType?.pricePerSide || 5,
          line_total: lineTotal,
          is_included: includedQty > 0,
          included_value: includedQty * (windowType?.pricePerSide || 5),
        };
      }) || [];
      
      // Calculate room total from items + blinds
      const windowsTotal = items.reduce((sum, item) => sum + item.line_total, 0);
      const blindsTotal = room.blindsCount * (room.blindsType === 'shutters' ? BLINDS_CONFIG.shutters.price : BLINDS_CONFIG.standard.price);
      
      return {
        room_id: room.roomId,
        room_label: room.roomLabel,
        is_structure: isStructure,
        items,
        blinds_count: room.blindsCount,
        blinds_type: room.blindsType,
        sills_tracks_included: room.includeSillsTracks || false,
        room_total: windowsTotal + blindsTotal,
        included_windows_count: limit,
      };
    }) || [],

    // NEW: Baseboard configuration per room for work order
    baseboard_config: formData.baseboardSelections ? {
      kitchen: formData.baseboardSelections.kitchen ?? true,
      living: formData.baseboardSelections.living ?? true,
      dining: (formData.baseboardSelections as any).dining ?? true,
      hallways: formData.baseboardSelections.hallways ?? true,
      bedrooms: formData.baseboardSelections.bedrooms || {},
    } : undefined,

    // NEW: Surface notes per room for cleaning team
    surface_notes: formData.surfaceNotes ? {
      kitchen: formData.surfaceNotes.kitchen || '',
      living: formData.surfaceNotes.living || '',
      dining: (formData.surfaceNotes as any).dining || '',
      hallways: formData.surfaceNotes.hallways || '',
      bedrooms: formData.surfaceNotes.bedrooms || {},
    } : undefined,

    // NEW: Bedroom profiles with add-ons
    bedroom_profiles: formData.bedroomConfigs 
      ? Object.entries(formData.bedroomConfigs).map(([id, config]) => ({
          id,
          profile: config.profile || 'standard',
          ceiling_fans: config.ceilingFans || 0,
          light_fixtures: config.lightFixtures || 0,
          closet_cabinets: config.closetCabinets || 0,
        }))
      : undefined,

    // NEW: Deep/Move flow standard inclusions (for work order confirmation)
    deep_move_inclusions: (formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out') ? {
      vent_surfaces: true,
      closet_doors: true,
      window_tracks: true,
      baseboards: true,
      closet_interiors: true,
    } : undefined,

    // NEW: Closet inventory summary for CRM/Zapier
    closet_inventory: (() => {
      const isDeepMove = formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out';
      const items: { room_id: string; room_label: string; closet_count: number; is_included: boolean; price: number }[] = [];
      
      // Collect from bedroom configs
      if (formData.bedroomConfigs) {
        Object.entries(formData.bedroomConfigs).forEach(([id, config]) => {
          if (config.closetCabinets && config.closetCabinets > 0) {
            const bedNum = parseInt(id.replace('bed_', '')) + 1;
            items.push({
              room_id: id,
              room_label: bedNum === 1 ? 'Master Bedroom' : `Bedroom ${bedNum}`,
              closet_count: config.closetCabinets,
              is_included: isDeepMove,
              price: isDeepMove ? 0 : config.closetCabinets * 20,
            });
          }
        });
      }
      
      // Collect from hallway cabinets addon
      const hallwayCabinets = formData.roomAddons?.hallways?.filter(a => a.addonId === 'hallway_cabinets');
      if (hallwayCabinets && hallwayCabinets.length > 0) {
        hallwayCabinets.forEach(addon => {
          items.push({
            room_id: 'hallways',
            room_label: 'Hallway Linen Cabinet',
            closet_count: addon.quantity,
            is_included: false, // Hallway cabinets are always extra
            price: addon.quantity * 25,
          });
        });
      }
      
      const totalClosets = items.reduce((sum, i) => sum + i.closet_count, 0);
      const totalPrice = items.reduce((sum, i) => sum + i.price, 0);
      
      return totalClosets > 0 ? {
        items,
        total_closets: totalClosets,
        total_price: totalPrice,
        is_deep_move_flow: isDeepMove,
      } : undefined;
    })(),

    // === ROOM FLOOR LOCATIONS (Multi-Floor Work Order Routing) ===
    room_locations: formData.roomFloorLocations ? {
      max_floors: (() => {
        if (formData.propertyType === 'apartment') {
          return formData.apartmentUnitLevels || 1;
        }
        return formData.houseLevels || 1;
      })(),
      kitchen: formData.roomFloorLocations.kitchen || 1,
      living: formData.roomFloorLocations.living || 1,
      dining: formData.roomFloorLocations.dining || 1,
      hallways: formData.roomFloorLocations.hallways || 1,
      bedrooms: formData.roomFloorLocations.bedrooms || {},
      bathrooms: formData.roomFloorLocations.bathrooms || { master: [], full: [], half: [] },
      optional_spaces: formData.roomFloorLocations.optionalSpaces || {},
    } : undefined,

    // SSOT: Stairs configuration from formData.stairs[] (multi-stair array)
    stairs: (formData.stairs || []).map((stair) => ({
      id: stair.id,
      label: stair.label,
      from_floor: stair.fromFloor,
      to_floor: stair.toFloor,
      surface_type: stair.surfaceType || 'carpet',
      step_count: stair.stepCount || 14,
      corner_buildup: stair.cornerBuildup || false,
      pet_hair: stair.petHairAccumulation || false,
      slip_hazards: stair.slipHazards || false,
      railings_detail: stair.railingsDetail || false,
    })),
    
    // Legacy stairs_config kept for backward compatibility (reads from first stair)
    stairs_config: (() => {
      const stairsArray = formData.stairs || [];
      if (stairsArray.length === 0) return undefined;
      
      const firstStair = stairsArray[0];
      return {
        surface_type: firstStair.surfaceType || 'carpet',
        step_count: firstStair.stepCount || 14,
        corner_buildup: firstStair.cornerBuildup || false,
        pet_hair_accumulation: firstStair.petHairAccumulation || false,
        slip_hazards: firstStair.slipHazards || false,
        railings_detail: firstStair.railingsDetail || false,
      };
    })(),

    // NEW: Room hazards for Deep/Move flows (waste & safety tracking) - includes bedrooms
    room_hazards: (() => {
      const isDeepMove = formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out';
      if (!isDeepMove) return undefined;
      
      const coreRooms = ['kitchen', 'living', 'dining', 'hallways', 'stairs'];
      const hazards: Record<string, { mess_types: string[]; trash_bags: number; sticky_spills: boolean }> = {};
      
      // Core rooms
      coreRooms.forEach(room => {
        const messTypes = (formData.roomMessTypes as any)?.[room] || [];
        const bags = (formData.roomTrashBags as any)?.[room] || 0;
        const sticky = (formData.roomStickySpills as any)?.[room] || false;
        
        if (messTypes.length > 0 || bags > 0 || sticky) {
          hazards[room] = {
            mess_types: messTypes,
            trash_bags: bags,
            sticky_spills: sticky,
          };
        }
      });
      
      // Bedrooms
      const bedroomIds = Object.keys(formData.bedroomConfigs || {});
      bedroomIds.forEach(bedId => {
        const messTypes = (formData.roomMessTypes as any)?.bedrooms?.[bedId] || [];
        const bags = (formData.roomTrashBags as any)?.bedrooms?.[bedId] || 0;
        const sticky = (formData.roomStickySpills as any)?.bedrooms?.[bedId] || false;
        
        if (messTypes.length > 0 || bags > 0 || sticky) {
          hazards[bedId] = {
            mess_types: messTypes,
            trash_bags: bags,
            sticky_spills: sticky,
          };
        }
      });
      
      return Object.keys(hazards).length > 0 ? hazards : undefined;
    })(),
    total_trash_bags: (() => {
      const coreRooms = ['kitchen', 'living', 'dining', 'hallways', 'stairs'];
      let total = coreRooms.reduce((sum, r) => sum + ((formData.roomTrashBags as any)?.[r] || 0), 0);
      
      // Add bedroom bags
      const bedroomIds = Object.keys(formData.bedroomConfigs || {});
      bedroomIds.forEach(bedId => {
        total += (formData.roomTrashBags as any)?.bedrooms?.[bedId] || 0;
      });
      
      return total > 0 ? total : undefined;
    })(),
    rooms_with_sticky_spills: (() => {
      const coreRooms = ['kitchen', 'living', 'dining', 'hallways', 'stairs'];
      const stickyRooms = coreRooms.filter(r => (formData.roomStickySpills as any)?.[r]);
      
      // Add sticky bedrooms
      const bedroomIds = Object.keys(formData.bedroomConfigs || {});
      bedroomIds.forEach(bedId => {
        if ((formData.roomStickySpills as any)?.bedrooms?.[bedId]) {
          stickyRooms.push(bedId);
        }
      });
      
      return stickyRooms.length > 0 ? stickyRooms : undefined;
    })(),

    // === ADDITIONAL STRUCTURES (Compound/Estate Properties) ===
    additional_structures: (() => {
      const guestHouseCount = formData.guestHouseCount || 0;
      const studioCount = formData.studioCount || 0;
      const poolHouseCount = formData.poolHouseCount || 0;
      
      if (guestHouseCount === 0 && studioCount === 0 && poolHouseCount === 0) {
        return undefined;
      }
      
      const isDeep = formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out';
      
      // Build guest houses array with full config
      const guestHouses: NormalizedQuotePayload['additional_structures']['guest_houses'] = [];
      for (let i = 0; i < guestHouseCount; i++) {
        const id = `guest_house_${i}`;
        const config = formData.guestHouseConfigs?.[id];
        if (config) {
          guestHouses.push({
            id: config.id,
            layout: config.layout,
            kitchen_type: config.kitchenType,
            floor_type: config.floorType,
            attachment: config.attachment,
            floor_location: config.floorLocation,
            window_count: config.windowCount,
            trash_bags: config.trashBags,
            sticky_spills: config.stickySpills,
            mess_types: config.messTypes || [],
            price: (() => {
              // Calculate price based on config
              let price = 120;
              if (config.kitchenType === 'none') price -= 15;
              if (config.kitchenType === 'full') price += 20;
              if (config.layout === 'studio') price -= 10;
              if (isDeep) price = Math.round(price * 1.25);
              return price;
            })(),
          });
        }
      }
      
      // Build art studios array with full config
      const artStudios: NormalizedQuotePayload['additional_structures']['art_studios'] = [];
      for (let i = 0; i < studioCount; i++) {
        const id = `art_studio_${i}`;
        const config = formData.artStudioConfigs?.[id];
        if (config) {
          artStudios.push({
            id: config.id,
            studio_type: config.studioType,
            has_bathroom: config.hasBathroom,
            floor_type: config.floorType,
            surface_sensitivity: config.surfaceSensitivity,
            attachment: config.attachment,
            floor_location: config.floorLocation,
            special_notes: config.specialNotes || '',
            trash_bags: config.trashBags,
            sticky_spills: config.stickySpills,
            mess_types: config.messTypes || [],
            price: (() => {
              let price = 85;
              if (config.hasBathroom) price += 25;
              if (config.surfaceSensitivity === 'delicate') price += 15;
              if (isDeep) price = Math.round(price * 1.25);
              return price;
            })(),
          });
        }
      }
      
      // Calculate totals
      const structuresTotal = guestHouses.reduce((sum, g) => sum + g.price, 0) +
                             artStudios.reduce((sum, s) => sum + s.price, 0) +
                             poolHouseCount * Math.round(65 * (isDeep ? 1.25 : 1));
      const totalTrashBags = guestHouses.reduce((sum, g) => sum + g.trash_bags, 0) +
                            artStudios.reduce((sum, s) => sum + s.trash_bags, 0);
      const detachedCount = guestHouses.filter(g => g.attachment === 'detached').length +
                           artStudios.filter(s => s.attachment === 'detached').length +
                           poolHouseCount; // Pool houses assumed detached
      
      return {
        guest_houses: guestHouses,
        art_studios: artStudios,
        pool_houses: poolHouseCount,
        total_structures: guestHouseCount + studioCount + poolHouseCount,
        structures_total_price: structuresTotal,
        total_structure_trash_bags: totalTrashBags,
        detached_transit_buffer_minutes: detachedCount * 10,
      };
    })(),

    // === WINDOW CLEANING MAP (Premium Logistics) ===
    // Single source of truth using calcWindowMapByRoom with PER_ROOM and AGGREGATE policies
    window_cleaning_map: (() => {
      if (!formData.roomWindowSelections || formData.roomWindowSelections.length === 0) {
        return undefined;
      }
      
      const isIncludedFlow = isWindowIncludedFlow(formData.serviceType, formData.baseServiceLevel);
      const windowMap = calcWindowMapByRoom(formData.roomWindowSelections, isIncludedFlow);
      
      if (windowMap.rooms.length === 0) {
        return undefined;
      }
      
      return {
        is_included_flow: isIncludedFlow,
        rooms: windowMap.rooms.map(room => {
          const limit = INCLUDED_WINDOW_LIMITS[room.roomType];
          return {
            room_id: room.roomId,
            room_type: room.roomType,
            room_label: room.roomLabel,
            policy: limit?.policy || 'PER_ROOM',
            scope_type: room.scopeType,
            included_limit: room.includedLimit,
            included_count: room.includedCount,
            included_value: room.includedValue,
            billable_count: room.billableCount,
            billable_cost: room.billableCost,
            total_windows: room.totalWindows,
          };
        }),
        totals: {
          total_windows: windowMap.totalWindows,
          total_included_windows: windowMap.totalIncludedWindows,
          total_included_value: windowMap.totalIncludedValue,
          total_billable_cost: windowMap.totalBillableCost,
        },
      };
    })(),

    // Tracking context
    ...(tracking.utm_source && { utm_source: tracking.utm_source }),
    ...(tracking.utm_medium && { utm_medium: tracking.utm_medium }),
    ...(tracking.utm_campaign && { utm_campaign: tracking.utm_campaign }),
    ...(tracking.utm_term && { utm_term: tracking.utm_term }),
    ...(tracking.utm_content && { utm_content: tracking.utm_content }),
    ...(tracking.gclid && { gclid: tracking.gclid }),
    ...(tracking.fbclid && { fbclid: tracking.fbclid }),
    ...(tracking.referrer && { referrer: tracking.referrer }),
    
    // === HOME STRUCTURE MODEL ===
    home_structure: (() => {
      const areas: NormalizedQuotePayload['home_structure']['areas'] = [];
      
      // Build hallway entries
      const hallways = formData.hallways || [];
      // Determine if MOVING flow via moveContext or serviceType
      const isMovingFlow = moveContext === 'move_out' || moveContext === 'move_in' || 
                           formData.serviceType === 'move';
      
      hallways.forEach((hallway) => {
        // Calculate fee for this hallway (MOVING only)
        let feeApplied = 0;
        if (isMovingFlow && 
            hallway.sizeTier === 'LARGE' && 
            hallway.cabinetCount >= HALLWAY_RATES.CABINET_THRESHOLD && 
            !hallway.cabinetsEmpty) {
          feeApplied = HALLWAY_RATES.MOVING_LARGE_CABINET_FEE;
        }
        
        // For LIVE_HERE, organization hours are the "fee"
        if (!isMovingFlow && hallway.organizationHours > 0) {
          feeApplied = hallway.organizationHours * HALLWAY_RATES.ORGANIZATION_RATE;
        }
        
        // Get window config if available
        const windowSelection = formData.roomWindowSelections?.[hallway.id];
        const windowConfig = windowSelection ? {
          count: windowSelection.windowCount || 0,
          glass_mode: windowSelection.glassMode || 'interior',
          blinds_count: windowSelection.blindsCount || 0,
        } : undefined;
        
        areas.push({
          area_type: 'hallway',
          stable_id: hallway.id,
          tracking_code: getAreaTrackingCode('hallway', hallway.id),
          label: hallway.label,
          // Use per-hallway floor data instead of global
          floor_level: hallway.floorLevel ? `F${hallway.floorLevel}` : 'F1',
          floor_type: hallway.floorType || 'hardwood_tile',
          size_tier: hallway.sizeTier,
          cabinet_count: hallway.cabinetCount,
          cabinets_empty: hallway.cabinetsEmpty,
          organization_hours: hallway.organizationHours,
          fee_applied: feeApplied,
          windows: windowConfig,
        });
      });
      
      // Return undefined if no areas mapped
      if (areas.length === 0) return undefined;
      
      return {
        areas,
        total_areas: areas.length,
      };
    })(),
  };

  return payload;
}

// ============ BUILD HOUSECALL SUGGESTION ============

export function buildHousecallSuggestion(
  params: BuildNormalizedPayloadParams
): HousecallSuggestion {
  const {
    quoteId,
    mode,
    formData,
    customZones,
    customCounts,
    selectedAddons,
    selectedMicroServices,
    estimatedTotal,
    moveContext,
  } = params;

  const serviceType = mode === 'custom' ? 'Custom / Specific Areas' : (formData.serviceType || 'Deep Clean');
  const serviceMode = mode === 'full' ? 'Full Home' : 'Specific Areas';
  const conditionLabel = getConditionLabel(formData.conditionFee);

  // Bedroom/bath counts for notes
  let bedroomsCount = mode === 'full' ? getBedroomCount(formData.homeSize) : customCounts.bedroomCount;
  let fullBathCount = mode === 'full' 
    ? (formData.masterBaths || 0) + (formData.fullBaths || 0)
    : (customCounts.masterBaths || 0) + (customCounts.fullBaths || 0);
  let halfBathCount = mode === 'full' ? (formData.halfBaths || 0) : (customCounts.halfBaths || 0);

  // Build customer notes
  const notesParts: string[] = [
    `Quote ID: ${quoteId}`,
    `Service: ${serviceType} (${serviceMode})`,
    `Home: ${bedroomsCount} bed / ${fullBathCount} full bath / ${halfBathCount} half bath`,
    `Condition: ${conditionLabel}`,
    `SqFt: ${getSqftLabel(formData.sqft || '', formData.homeSize)}`,
  ];

  if (selectedAddons.length > 0) {
    const addonsList = selectedAddons.map(a => 
      a.quantity > 1 ? `${a.quantity}x ${a.value}` : a.value
    ).join(', ');
    notesParts.push(`Add-ons: ${addonsList}`);
  }

  if (selectedMicroServices.length > 0) {
    const microList = selectedMicroServices.map(sel => {
      const label = microServiceEnglishLabels[sel.id] || sel.id;
      return sel.quantity > 1 ? `${sel.quantity}x ${label}` : label;
    }).join(', ');
    notesParts.push(`Micro-services: ${microList}`);
  }

  if (formData.notes) {
    notesParts.push(`Notes: ${formData.notes}`);
  }

  const customerNotes = notesParts.join('\n');

  // Build line items for Housecall Pro
  const lineItems: HousecallLineItem[] = [];

  // Main service line item
  const mainServicePrice = calculateMainServicePrice(params);
  lineItems.push({
    name: `${serviceType} – ${serviceMode}`,
    description: `${bedroomsCount} bed / ${fullBathCount + halfBathCount} bath | ${conditionLabel} condition`,
    kind: 'labor',
    quantity: 1,
    unit_price: Math.round(mainServicePrice * 100), // cents
  });

  // Add-on line items
  for (const addon of selectedAddons) {
    const price = addonPrices[addon.value] || 0;
    if (price > 0) {
      lineItems.push({
        name: formatAddonName(addon.value),
        description: '',
        kind: 'labor',
        quantity: addon.quantity,
        unit_price: Math.round(price * 100),
      });
    }
  }

  // Micro-service line items
  const isHeavy = isHeavyCondition(formData.conditionFee);
  for (const sel of selectedMicroServices) {
    const ms = microServices.find(m => m.id === sel.id);
    if (ms) {
      const label = microServiceEnglishLabels[sel.id] || sel.id;
      const basePrice = calculateMicroServicePrice(ms, sel.quantity, formData.sqft);
      
      // Apply condition factor
      let conditionFactor = 1.0;
      if (formData.conditionFee === 120) conditionFactor = 1.25;
      else if (formData.conditionFee === 180) conditionFactor = 1.5;
      
      let finalPrice = Math.round(basePrice * conditionFactor);
      
      // Apply heavy surcharge
      if (isHeavy && ms.heavySurchargePercent) {
        finalPrice = Math.round(finalPrice * (1 + ms.heavySurchargePercent / 100));
      }

      lineItems.push({
        name: label,
        description: `Micro-service${sel.quantity > 1 ? ` x${sel.quantity}` : ''}`,
        kind: 'labor',
        quantity: 1, // Already calculated for quantity
        unit_price: Math.round(finalPrice * 100),
      });
    }
  }

  // Condition fee line item (if applicable)
  if (formData.conditionFee > 0) {
    lineItems.push({
      name: `${conditionLabel} Condition Fee`,
      description: 'Additional cleaning required due to home condition',
      kind: 'labor',
      quantity: 1,
      unit_price: Math.round(formData.conditionFee * 100),
    });
  }

  // Tags - include move context for CRM routing
  const tags = [
    'Website Lead',
    serviceType,
    serviceMode,
    quoteId,
    // Move context tags for Zapier routing
    moveContext === 'move_out' ? 'moving_away' : null,
    moveContext === 'move_in' ? 'new_resident' : null,
  ].filter(Boolean) as string[];

  return {
    customer: {
      first_name: formData.firstName || '',
      last_name: formData.lastName || '',
      email: formData.email || '',
      mobile_number: formData.phone || '',
      home_number: formData.phone || '',
      work_number: '',
      lead_source: 'Website Pricing Form',
      addresses: [{
        street: formData.address || '',
        street_line_2: '',
        city: formData.city || '',
        state: 'CA',
        zip: '',
        country: 'USA',
      }],
      tags,
      notes: customerNotes,
    },
    lead: {
      line_items: lineItems,
      lead_source: 'Website Pricing Form',
      note: customerNotes,
      tags,
      estimated_total_cents: Math.round(estimatedTotal * 100),
    },
  };
}

// ============ HELPER: Calculate main service price ============

function calculateMainServicePrice(params: BuildNormalizedPayloadParams): number {
  const { mode, formData, customZones, customCounts, estimatedTotal, selectedAddons, selectedMicroServices } = params;

  // For line item purposes, we want the base service price WITHOUT addons
  // This is estimated total minus addons and micro-services
  
  let addonsTotal = 0;
  for (const addon of selectedAddons) {
    const price = addonPrices[addon.value] || 0;
    addonsTotal += price * addon.quantity;
  }

  // Micro-services total
  let microTotal = 0;
  const isHeavy = isHeavyCondition(formData.conditionFee);
  let conditionFactor = 1.0;
  if (formData.conditionFee === 120) conditionFactor = 1.25;
  else if (formData.conditionFee === 180) conditionFactor = 1.5;

  for (const sel of selectedMicroServices) {
    const ms = microServices.find(m => m.id === sel.id);
    if (ms) {
      const basePrice = calculateMicroServicePrice(ms, sel.quantity, formData.sqft);
      let finalPrice = Math.round(basePrice * conditionFactor);
      if (isHeavy && ms.heavySurchargePercent) {
        finalPrice = Math.round(finalPrice * (1 + ms.heavySurchargePercent / 100));
      }
      microTotal += finalPrice;
    }
  }

  // Main service = total - addons - micro - condition fee
  // But condition fee is already in the line items, so we subtract it here
  const mainServicePrice = estimatedTotal - addonsTotal - microTotal - formData.conditionFee;
  
  return Math.max(0, mainServicePrice);
}

// ============ HELPER: Format addon name ============

function formatAddonName(addonKey: string): string {
  // Convert snake_case to Title Case
  return addonKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============ BUILD HCP CUSTOMER LOOKUP ============

/**
 * Build lookup helpers for GET /customers?q=... and deduplication
 */
export function buildHcpCustomerLookup(params: BuildNormalizedPayloadParams): HcpCustomerLookup {
  const { formData } = params;
  
  const email = (formData.email || '').trim().toLowerCase();
  const mobile = (formData.phone || '').trim().replace(/\D/g, ''); // digits only
  const firstName = (formData.firstName || '').trim();
  const lastName = (formData.lastName || '').trim();
  const name = `${firstName} ${lastName}`.trim();
  const city = (formData.city || '').trim();
  const zip = ''; // We don't collect zip yet
  const street = (formData.address || '').trim();
  
  const name_city = `${name} ${city}`.trim();
  const address_combo = `${street} ${city}`.trim();
  
  // Primary query: prefer mobile (best match), then email, then name+city
  let primary_q = '';
  if (mobile.length >= 7) {
    primary_q = mobile;
  } else if (email) {
    primary_q = email;
  } else if (name_city) {
    primary_q = name_city;
  }
  
  // Secondary queries: all unique non-empty alternatives
  const secondarySet = new Set<string>();
  if (email) secondarySet.add(email);
  if (mobile.length >= 7) secondarySet.add(mobile);
  if (name_city) secondarySet.add(name_city);
  if (address_combo) secondarySet.add(address_combo);
  if (name) secondarySet.add(name);
  
  // Remove primary from secondary list
  secondarySet.delete(primary_q);
  const secondary_qs = Array.from(secondarySet);
  
  // Composite key for Storage by Zapier deduplication
  const emailPart = email || 'no-email';
  const mobilePart = mobile || 'no-mobile';
  const zipPart = zip || 'no-zip';
  const composite_key = `${emailPart}|${mobilePart}|${zipPart}`.toLowerCase();
  
  return {
    primary_q,
    secondary_qs,
    composite_key,
  };
}

// ============ BUILD HCP CUSTOMER BODY ============

/**
 * Build ready-to-use body for POST /customers
 */
export function buildHcpCustomerBody(params: BuildNormalizedPayloadParams): HcpCustomerBody {
  const { quoteId, mode, formData, customCounts, selectedAddons, selectedMicroServices, estimatedTotal } = params;
  
  const serviceType = mode === 'custom' ? 'Custom / Specific Areas' : (formData.serviceType || 'Deep Clean');
  const serviceMode = mode === 'full' ? 'Full Home' : 'Specific Areas';
  const conditionLabel = getConditionLabel(formData.conditionFee);
  
  // Bedroom/bath counts
  let bedroomsCount = mode === 'full' ? getBedroomCount(formData.homeSize) : customCounts.bedroomCount;
  let fullBathCount = mode === 'full' 
    ? (formData.masterBaths || 0) + (formData.fullBaths || 0)
    : (customCounts.masterBaths || 0) + (customCounts.fullBaths || 0);
  let halfBathCount = mode === 'full' ? (formData.halfBaths || 0) : (customCounts.halfBaths || 0);
  
  // Build notes
  const notesParts: string[] = [
    `Quote ID: ${quoteId}`,
    `Service: ${serviceType} (${serviceMode})`,
    `Home Type: ${formData.homeType || 'Not specified'}`,
    `Home: ${bedroomsCount} bed / ${fullBathCount} full bath / ${halfBathCount} half bath`,
    `Condition: ${conditionLabel}`,
    `SqFt: ${getSqftLabel(formData.sqft || '', formData.homeSize)}`,
    `Estimated Total: $${estimatedTotal}`,
  ];
  
  if (selectedAddons.length > 0) {
    const addonsList = selectedAddons.map(a => 
      a.quantity > 1 ? `${a.quantity}x ${a.value}` : a.value
    ).join(', ');
    notesParts.push(`Add-ons: ${addonsList}`);
  }
  
  if (selectedMicroServices.length > 0) {
    const microList = selectedMicroServices.map(sel => {
      const label = microServiceEnglishLabels[sel.id] || sel.id;
      return sel.quantity > 1 ? `${sel.quantity}x ${label}` : label;
    }).join(', ');
    notesParts.push(`Micro-services: ${microList}`);
  }
  
  if (formData.date) {
    notesParts.push(`Preferred Date: ${formData.date}`);
  }
  
  // Access notes
  const accessParts: string[] = [];
  if (formData.gatedCommunity) accessParts.push('Gated community');
  if (formData.apartmentComplex) accessParts.push('Apartment/Condo complex');
  if (formData.upperFloorNoElevator) accessParts.push('Upper floor without elevator');
  if (formData.accessNotes) accessParts.push(formData.accessNotes);
  if (accessParts.length > 0) {
    notesParts.push(`Access: ${accessParts.join('; ')}`);
  }
  
  if (formData.notes) {
    notesParts.push(`Customer Notes: ${formData.notes}`);
  }
  
  const customerNotes = notesParts.join('\n');
  
  // Tags
  const tags = [
    'Website Lead',
    serviceType,
    serviceMode,
    quoteId,
  ].filter(Boolean);
  
  return {
    // Use empty string as fallback - null causes HCP validation errors
    first_name: formData.firstName?.trim() || '',
    last_name: formData.lastName?.trim() || '',
    email: formData.email?.trim() || '',
    company: null,
    notifications_enabled: true,
    mobile_number: formData.phone?.trim() || '',
    home_number: formData.phone?.trim() || '',
    work_number: null,
    tags,
    lead_source: 'Website Pricing Form',
    notes: customerNotes,
    addresses: [{
      street: formData.address || '',
      street_line_2: '',
      city: formData.city || '',
      state: 'CA',
      zip: '',
      country: 'USA',
    }],
  };
}

// ============ BUILD HCP LEAD BODY TEMPLATE ============

/**
 * Build template for POST /leads (Zapier inserts customer_id)
 */
export function buildHcpLeadBodyTemplate(params: BuildNormalizedPayloadParams): HcpLeadBodyTemplate {
  const { quoteId, mode, formData, customCounts, selectedAddons, selectedMicroServices, estimatedTotal } = params;
  
  const serviceType = mode === 'custom' ? 'Custom / Specific Areas' : (formData.serviceType || 'Deep Clean');
  const serviceMode = mode === 'full' ? 'Full Home' : 'Specific Areas';
  const conditionLabel = getConditionLabel(formData.conditionFee);
  
  // Bedroom/bath counts
  let bedroomsCount = mode === 'full' ? getBedroomCount(formData.homeSize) : customCounts.bedroomCount;
  let fullBathCount = mode === 'full' 
    ? (formData.masterBaths || 0) + (formData.fullBaths || 0)
    : (customCounts.masterBaths || 0) + (customCounts.fullBaths || 0);
  let halfBathCount = mode === 'full' ? (formData.halfBaths || 0) : (customCounts.halfBaths || 0);
  
  // Build line items
  const lineItems: HcpLeadBodyTemplate['line_items'] = [];
  
  // Main service line item
  const mainServicePrice = calculateMainServicePrice(params);
  const sqftLabel = getSqftLabel(formData.sqft || '', formData.homeSize);
  const mainServiceName = [
    `${serviceType} – ${serviceMode}`,
    formData.homeType || 'Home',
    sqftLabel
  ].filter(Boolean).join(' | ');
  const mainServiceDesc = [
    `${bedroomsCount} bed / ${fullBathCount} full bath / ${halfBathCount} half bath`,
    `Condition: ${conditionLabel}`,
    formData.notes ? `Notes: ${formData.notes}` : '',
  ].filter(Boolean).join('\n');
  
  lineItems.push({
    name: mainServiceName,
    description: mainServiceDesc,
    kind: 'labor',
    quantity: 1,
    unit_cost: 0,
    unit_price: Math.round(mainServicePrice * 100),
  });
  
  // Add-on line items
  for (const addon of selectedAddons) {
    const price = addonPrices[addon.value] || 0;
    if (price > 0) {
      lineItems.push({
        name: formatAddonName(addon.value),
        description: '',
        kind: 'labor',
        quantity: addon.quantity,
        unit_cost: 0,
        unit_price: Math.round(price * 100),
      });
    }
  }
  
  // Micro-service line items
  const isHeavy = isHeavyCondition(formData.conditionFee);
  let conditionFactor = 1.0;
  if (formData.conditionFee === 120) conditionFactor = 1.25;
  else if (formData.conditionFee === 180) conditionFactor = 1.5;
  
  for (const sel of selectedMicroServices) {
    const ms = microServices.find(m => m.id === sel.id);
    if (ms) {
      const label = microServiceEnglishLabels[sel.id] || sel.id;
      const basePrice = calculateMicroServicePrice(ms, sel.quantity, formData.sqft);
      let finalPrice = Math.round(basePrice * conditionFactor);
      if (isHeavy && ms.heavySurchargePercent) {
        finalPrice = Math.round(finalPrice * (1 + ms.heavySurchargePercent / 100));
      }
      lineItems.push({
        name: label,
        description: `Micro-service${sel.quantity > 1 ? ` x${sel.quantity}` : ''}`,
        kind: 'labor',
        quantity: 1,
        unit_cost: 0,
        unit_price: Math.round(finalPrice * 100),
      });
    }
  }
  
  // Condition fee line item (if applicable)
  if (formData.conditionFee > 0) {
    lineItems.push({
      name: `${conditionLabel} Condition Fee`,
      description: 'Additional cleaning required due to home condition',
      kind: 'labor',
      quantity: 1,
      unit_cost: 0,
      unit_price: Math.round(formData.conditionFee * 100),
    });
  }
  
  // Build note
  const noteParts: string[] = [
    `Quote ID: ${quoteId}`,
    `Service: ${serviceType} (${serviceMode})`,
    `Home: ${bedroomsCount} bed / ${fullBathCount + halfBathCount} bath`,
    `Condition: ${conditionLabel}`,
  ];
  if (formData.notes) noteParts.push(`Notes: ${formData.notes}`);
  
  // Tags
  const tags = ['Pricing Widget', serviceType, serviceMode, quoteId].filter(Boolean);
  
  return {
    address: {
      street: formData.address || '',
      street_line_2: '',
      city: formData.city || '',
      state: 'CA',
      zip: '',
    },
    lead_source: 'Website Pricing Form',
    line_items: lineItems,
    note: noteParts.join('\n'),
    tags,
    tax_name: 'Tax',
    tax_rate: 0,
  };
}

// ============ BUILD HCP ESTIMATE BODY TEMPLATE ============

/**
 * Build template for POST /estimates (Zapier inserts customer_id)
 */
export function buildHcpEstimateBodyTemplate(params: BuildNormalizedPayloadParams): HcpEstimateBodyTemplate {
  const { quoteId, mode, formData, customCounts, selectedAddons, selectedMicroServices, estimatedTotal } = params;
  
  const serviceType = mode === 'custom' ? 'Custom / Specific Areas' : (formData.serviceType || 'Deep Clean');
  const serviceMode = mode === 'full' ? 'Full Home' : 'Specific Areas';
  const serviceFlow = mode === 'full' ? 'full-home' : 'custom-areas';
  const conditionLabel = getConditionLabel(formData.conditionFee);
  
  // Bedroom/bath counts
  let bedroomsCount = mode === 'full' ? getBedroomCount(formData.homeSize) : customCounts.bedroomCount;
  let fullBathCount = mode === 'full' 
    ? (formData.masterBaths || 0) + (formData.fullBaths || 0)
    : (customCounts.masterBaths || 0) + (customCounts.fullBaths || 0);
  let halfBathCount = mode === 'full' ? (formData.halfBaths || 0) : (customCounts.halfBaths || 0);
  
  // Build detailed description for estimate line item
  const descParts: string[] = [
    `Service: ${serviceType} (${serviceMode})`,
    `Home Type: ${formData.homeType || 'Not specified'}`,
    `Size: ${getSqftLabel(formData.sqft || '', formData.homeSize)}`,
    `Layout: ${bedroomsCount} bed / ${fullBathCount} full bath / ${halfBathCount} half bath`,
    `Condition: ${conditionLabel}`,
  ];
  
  if (selectedAddons.length > 0) {
    const addonsList = selectedAddons.map(a => 
      a.quantity > 1 ? `${a.quantity}x ${formatAddonName(a.value)}` : formatAddonName(a.value)
    ).join(', ');
    descParts.push(`Add-ons: ${addonsList}`);
  }
  
  if (selectedMicroServices.length > 0) {
    const microList = selectedMicroServices.map(sel => {
      const label = microServiceEnglishLabels[sel.id] || sel.id;
      return sel.quantity > 1 ? `${sel.quantity}x ${label}` : label;
    }).join(', ');
    descParts.push(`Micro-services: ${microList}`);
  }
  
  // Access notes
  const accessParts: string[] = [];
  if (formData.gatedCommunity) accessParts.push('Gated community');
  if (formData.apartmentComplex) accessParts.push('Apartment/Condo complex');
  if (formData.upperFloorNoElevator) accessParts.push('Upper floor without elevator');
  if (formData.accessNotes) accessParts.push(formData.accessNotes);
  if (accessParts.length > 0) {
    descParts.push(`Access: ${accessParts.join('; ')}`);
  }
  
  if (formData.notes) {
    descParts.push(`Customer Notes: ${formData.notes}`);
  }
  
  const fullDescription = descParts.join('\n');
  
  // Main line item name
  const estimateSqftLabel = getSqftLabel(formData.sqft || '', formData.homeSize);
  const mainServiceName = [
    `${serviceType} – ${serviceMode}`,
    formData.homeType || 'Home',
    estimateSqftLabel
  ].filter(Boolean).join(' | ');
  
  return {
    note: `New lead from website pricing form. Quote ID: ${quoteId}. ${serviceType} service for ${formData.city || 'customer'}.`,
    message: 'Online estimate generated automatically from the instant pricing form. Please review details and confirm with customer.',
    address: {
      street: formData.address || '',
      street_line_2: '',
      city: formData.city || '',
      state: 'CA',
      zip: '',
    },
    lead_source: 'Website Pricing Form',
    options: [{
      name: `Online Quote – ${serviceType}`,
      tags: ['Online Quote', serviceType, serviceMode, serviceFlow],
      line_items: [{
        name: mainServiceName,
        description: fullDescription,
        unit_price: Math.round(estimatedTotal * 100),
        quantity: 1,
        unit_cost: 0,
      }],
    }],
    estimate_fields: {
      // Leave undefined - Zapier will inject if needed
      job_type_id: undefined,
      business_unit_id: undefined,
    },
  };
}
