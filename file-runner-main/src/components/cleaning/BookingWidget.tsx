import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from '@/hooks/useBookingSummary';
import { useCityConfig } from '@/hooks/useCityConfig';
import { t } from '@/lib/translations';
import { trackEvent } from '@/lib/tracking';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ModeToggle } from './ModeToggle';
import { LivePriceSummary } from './LivePriceSummary';
import { StickyActionFooter } from './StickyActionFooter';
import { ProgressBar } from './ProgressBar';
import { CalculatingLoader } from './CalculatingLoader';
import { StepIndustry } from './steps/StepIndustry';
import { StepTriage } from './steps/StepTriage';
import { StepStart } from './steps/StepStart';
import { StepCustomStart } from './steps/StepCustomStart';
import { StepHourlyConfig } from './steps/StepHourlyConfig';
import { StepCommercialStart } from './steps/StepCommercialStart';
import { StepCommercialServiceType } from './steps/StepCommercialServiceType';
import { StepRenovation } from './steps/StepRenovation';
import { StepAddons } from './steps/StepAddons';
import { StepWindows } from './steps/StepWindows';
import { StepDetails } from './steps/StepDetails';
import { StepReview } from './steps/StepReview';
import { DebugPanel } from './DebugPanel';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateQuotePDFBlob } from '@/lib/pdfGenerator';
import { microServices, microServiceEnglishLabels, homeSizeOptions, serviceTypeMap, pricingData } from '@/lib/pricing';
import { sendReviewLeadToZapier, sendCompletedLeadToZapier, ReviewLeadData } from '@/lib/zapierReviewWebhook';
import { serializeUtilityAreasForPayload } from '@/lib/homeMappingPricing';
import { DEFAULT_HOME_MAPPING_AREAS } from '@/lib/homeMappingTypes';
import { 
  buildNormalizedQuotePayload, 
  buildHousecallSuggestion,
  buildHcpCustomerLookup,
  buildHcpCustomerBody,
  buildHcpLeadBodyTemplate,
  buildHcpEstimateBodyTemplate,
  NormalizedQuotePayload,
  HousecallSuggestion 
} from '@/lib/normalizedPayload';
// NOTE: sendInternalReviewEmail is DISABLED - all emails handled via Zapier

// Generate a unique quote ID for this session
const generateQuoteId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NCS-${timestamp}-${random}`;
};

// Map condition fee to English condition label (matches pricing.ts conditionFees)
const getConditionLabel = (conditionFee: number): string => {
  if (conditionFee === 0) return 'Light/Normal';
  if (conditionFee === 120) return 'Heavy';
  if (conditionFee === 180) return 'Extra Heavy';
  return 'Light/Normal';
};

// Map home size index to bedroom count
const getBedroomCount = (homeSize: number): number => {
  // homeSize is 1-based index matching pricingData rows
  // Index 1=1bed, 2=2bed, 3=3bed, etc.
  return Math.max(1, homeSize);
};

// Map sqft key to approximate square footage
const getSqftApprox = (sqft: string): string => {
  const sqftMap: Record<string, string> = {
    '1bed': '600-900',
    '2bed': '900-1200',
    '3bed': '1200-1800',
    '4bed': '1800-2400',
    '5bed': '2400-3000',
    '6bed': '3000+',
  };
  return sqftMap[sqft] || sqft;
};

export function BookingWidget() {
  // === DEV MODE FLAGS: SET TO false BEFORE PRODUCTION DEPLOY ===
  const DEV_BYPASS_VALIDATION = true;  // Skip Details step validation
  const DEV_BYPASS_ZAPIER = true;      // Skip Zapier partial lead webhook
  // ============================================================
  const {
    language,
    mode,
    industry,
    situation,
    currentStep,
    setCurrentStep,
    showWindowStep,
    formData,
    customZones,
    customCounts,
    selectedAddons,
    selectedMicroServices,
    getMicroServicesTotal,
    calculateCustomTotal, // Keep for custom mode fallback
    isRecurringService,
    recurringStartMode,
    getHourlyRate,
    getFirstVisitPrice,
    getFutureVisitsPrice,
    // HARD GATE: Services revealed flag
    servicesRevealed,
    // Persistence cleanup
    clearPersistedState,
  } = useBooking();

  // === SINGLE SOURCE OF TRUTH: Use summary hook for residential pricing ===
  const summary = useBookingSummary();
  // For residential full mode, use summary total; for custom mode, keep legacy for now
  const getResidentialTotal = useCallback(() => {
    if (mode === 'full' && industry === 'residential') {
      return summary.totals.grandTotal;
    }
    // Custom mode still uses legacy calculation
    return calculateCustomTotal();
  }, [mode, industry, summary.totals.grandTotal, calculateCustomTotal]);

  const cityConfig = useCityConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoader, setShowLoader] = useState(false); // Labor Illusion loader
  const [stepKey, setStepKey] = useState(0); // For triggering re-animation
  const [reviewZapSent, setReviewZapSent] = useState(false); // Track if Zapier review webhook was sent
  // NOTE: partialSubmitted & reviewEmailSent removed - partial leads handled only via Zapier webhook
  const widgetRef = useRef<HTMLDivElement>(null);

  // Generate quote ID once per session
  const quoteId = useMemo(() => generateQuoteId(), []);

  // Track widget load (pricing_start) - fires once on mount
  useEffect(() => {
    trackEvent('pricing_start');
  }, []);

  // Smooth scroll to top of widget on step change
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (widgetRef.current) {
        widgetRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 80); // Subtle delay for natural feel

    // Trigger step content re-animation
    setStepKey(prev => prev + 1);

    return () => clearTimeout(scrollTimeout);
  }, [currentStep]);

  // Calculate step sequence based on mode, situation, and options
  // FROZEN: Industry step bypassed - Triage is now Step 0
  const getStepSequence = () => {
    // FROZEN: Commercial flow disabled
    // if (industry === 'commercial' || situation === 'COMMERCIAL') { ... }
    
    // RENOVATION flow: Triage(0) → RenovationStart(1) → Details(2) → Review(3)
    if (situation === 'RENOVATION') {
      return [0, 1, 2, 3]; // 4 steps total
    }
    
    // HOURLY flow (NEW): Triage(0) → HourlyConfig(1) → Details(2) → Review(3)
    // This is now a PRIMARY situation, separate from SPECIFIC_AREAS
    if (situation === 'HOURLY') {
      return [0, 1, 2, 3]; // 4 steps total
    }
    
    // SPECIFIC_AREAS flow — Now ONLY "By Area" (no hourly branch)
    // Legacy fallback: if somehow isHourlyMode=true with SPECIFIC_AREAS, treat as HOURLY
    if (situation === 'SPECIFIC_AREAS') {
      // Legacy compatibility: old sessions with SPECIFIC_AREAS + isHourlyMode
      if (formData.isHourlyMode) {
        return [0, 1, 2, 3]; // Fallback to hourly flow
      }
      
      // AREA MODE: Triage(0) → CustomStart(1) → [Windows(2)] → Details → Review
      const seq = [0, 1]; // Triage + CustomStart
      if (showWindowStep) seq.push(2); // Windows
      seq.push(showWindowStep ? 3 : 2); // Details
      seq.push(showWindowStep ? 4 : 3); // Review
      return seq;
    }
    
    // Full home mode (LIVE_HERE/MOVING): Triage(0) → Start(1) → Addons(2) → [Windows] → Details → Review
    const seq = [0, 1, 2]; // Triage + Start + Addons
    if (showWindowStep) seq.push(3); // Windows
    seq.push(showWindowStep ? 4 : 3); // Details
    seq.push(showWindowStep ? 5 : 4); // Review
    return seq;
  };

  const stepSequence = getStepSequence();
  const totalSteps = stepSequence.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isDetailsStep = currentStep === totalSteps - 2; // Step before Review
  
  // GATING LOGIC (NO-SKIP ENFORCEMENT) — HARD GATE
  // FROZEN: Industry step bypassed - Triage is now Step 0
  const isIndustryStep = false; // FROZEN: Never on industry step
  const hasIndustrySelected = true; // FROZEN: Always residential
  
  // Step 0 (Triage): Auto-advances on card click
  const isTriageStep = currentStep === 0;
  const hasSituationSelected = !!situation;
  
  // Step 1 (Full Home Config + Service Selection for residential): 
  // Continue only shows after service selected
  const isStep1FullHome = currentStep === 1 && mode === 'full' && situation !== 'SPECIFIC_AREAS' && situation !== 'RENOVATION';
  const hasServiceSelected = formData.serviceType && formData.serviceType !== '';
  
  // HARD GATE: User must select a service level
  const isStep1Valid = hasServiceSelected;
  
  // HOURLY MODE GATE: Priority notes required before advancing from StepHourlyConfig
  const isHourlyConfigStep = currentStep === 1 && formData.isHourlyMode;
  const isHourlyPriorityValid = !isHourlyConfigStep || (formData.hourlyPriorityNotes && formData.hourlyPriorityNotes.trim().length > 0);
  
  // RENOVATION STEP GATE: User must enter square footage to proceed
  const isRenovationStep = currentStep === 1 && situation === 'RENOVATION';
  const isRenovationValid = formData.renovationScope?.sqft > 0;
  
  // Hide Continue button completely when:
  // - On Triage step (auto-advances, no button needed)
  // - On Step 1 Full Home without completing the gate (select service)
  // - On Hourly Config step without priority notes filled
  // - On Renovation step without valid sqft
  const shouldHideContinue = isTriageStep || (isStep1FullHome && !isStep1Valid) || (isHourlyConfigStep && !isHourlyPriorityValid) || (isRenovationStep && !isRenovationValid);

  // Fire Zapier review webhook when user FIRST reaches Review step
  useEffect(() => {
    const isReviewStep = currentStep === totalSteps - 1;
    
    // DEV BYPASS: Skip Zapier webhook for testing
    if (DEV_BYPASS_ZAPIER) {
      if (isReviewStep) console.log('[DEV MODE] Zapier webhook skipped');
      return;
    }
    
    if (isReviewStep && !reviewZapSent) {
      // GUARD: Only send if we have minimum customer info (prevents HCP validation errors)
      const hasMinimumCustomerInfo = 
        (formData.firstName?.trim() || formData.lastName?.trim()) ||
        formData.email?.trim() ||
        formData.phone?.trim();
      
      if (!hasMinimumCustomerInfo) {
        console.warn('[Zapier Webhook] Skipping partial lead - no customer info available');
        return; // Don't send partial lead without customer data
      }
      // Build lead data from current state - use SST for residential
      const total = getResidentialTotal();
      const isRecurring = isRecurringService();
      const microTotal = getMicroServicesTotal();
      
      // Get home size label
      const homeSizeOpt = homeSizeOptions.find(opt => opt.value === formData.homeSize);
      const homeSizeLabel = homeSizeOpt?.labelKey || String(formData.homeSize);
      
      // Build addons string
      const addonsStr = selectedAddons.length > 0 
        ? selectedAddons.map(a => a.quantity > 1 ? `${a.quantity}x ${a.value}` : a.value).join(', ')
        : '';
      
      // Build micro-services string (English labels)
      const microServicesStr = mode === 'custom' && selectedMicroServices.length > 0
        ? selectedMicroServices.map(sel => {
            const label = microServiceEnglishLabels[sel.id] || sel.id;
            return sel.quantity > 1 ? `${label} x${sel.quantity}` : label;
          }).join(', ')
        : '';
      
      // Build custom zones string
      const customZonesStr = mode === 'custom' 
        ? Object.entries(customZones).filter(([, v]) => v).map(([k]) => k).join(', ')
        : '';
      
      // Build access notes
      const accessParts: string[] = [];
      if (formData.gatedCommunity) accessParts.push('Gated');
      if (formData.apartmentComplex) accessParts.push('Complex');
      if (formData.upperFloorNoElevator) accessParts.push('Upper Floor');
      if (formData.accessNotes) accessParts.push(formData.accessNotes);
      
      // Condition label
      const conditionLabel = formData.conditionFee === 0 ? 'Light/Normal' 
        : formData.conditionFee === 120 ? 'Heavy' 
        : formData.conditionFee === 180 ? 'Extra Heavy' 
        : 'Light/Normal';
      
      const leadData: ReviewLeadData = {
        quoteId,
        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
        customerFirstName: formData.firstName || '',
        customerLastName: formData.lastName || '',
        customerEmail: formData.email || '',
        customerPhone: formData.phone || '',
        customerCity: formData.city || '',
        customerAddress: formData.address ? `${formData.address}, ${formData.city}` : '',
        serviceMode: mode,
        serviceType: mode === 'custom' ? 'Custom / Specific Areas' : formData.serviceType,
        homeType: formData.homeType || 'Single-Family Home',
        totalEstimate: total,
        language: language,
        homeSize: homeSizeLabel,
        bedrooms: mode === 'full' ? String(getBedroomCount(formData.homeSize)) : String(customCounts.bedroomCount),
        bathrooms: mode === 'full' 
          ? `M${formData.masterBaths}/F${formData.fullBaths}/H${formData.halfBaths}`
          : `M${customCounts.masterBaths}/F${customCounts.fullBaths}/H${customCounts.halfBaths}`,
        selectedAddons: addonsStr,
        selectedMicroServices: microServicesStr,
        customZones: customZonesStr,
        conditionLevel: conditionLabel,
        preferredDate: formData.date || '',
        accessNotes: accessParts.join('; '),
        // Hourly mode fields
        hourlyMode: formData.isHourlyMode,
        hourlyHours: formData.hourlyHours,
        hourlyFrequency: formData.hourlyFrequency,
        hourlyIntensity: formData.hourlyIntensity,
        hourlySupplies: formData.hourlySupplies,
        hourlyPriorityNotes: formData.hourlyPriorityNotes,
        hourlyTotalBeds: formData.hourlyTotalBeds,
        hourlyTotalBaths: formData.hourlyTotalBaths,
        hourlyBedsToClean: formData.hourlyBedsToClean,
        hourlyBathsToClean: formData.hourlyBathsToClean,
        hourlyIncludeKitchen: formData.hourlyIncludeKitchen,
        hourlyIncludeLiving: formData.hourlyIncludeLivingAreas,
        hourlyDaysPerWeek: formData.daysPerWeek,
        // Estate & Compound fields (Hourly mode)
        hourlyTotalSqft: formData.hourlyTotalSqft,
        guestHouseCount: formData.guestHouseCount,
        studioCount: formData.studioCount,
        poolHouseCount: formData.poolHouseCount,
        cleaningDensity: formData.cleaningDensity,
        customActiveSqft: formData.customActiveSqft,
        isMovingHourly: formData.isMovingHourly,
        hourlyTasks: formData.hourlyTasks,
        // === PROPERTY TYPE & AREAS (NEW) ===
        hourlyPropertyType: formData.hourlyPropertyType,
        hourlyAreasToInclude: formData.hourlyAreasToInclude,
        hourlyAreasToSkip: formData.hourlyAreasToSkip,
        // === SOUTH COAST HOURLY FIELDS ===
        hourlyAccessType: formData.accessType,
        hourlyHasDelicateSurfaces: formData.hasDelicateSurfaces,
        hourlyDelicateSurfaceTypes: formData.delicateSurfaceTypes,
        hourlyHomeCondition: formData.homeConditionLevel,
        hourlyMustHaves: formData.hourlyMustHaves,
        hourlyNiceToHaves: formData.hourlyNiceToHaves,
        hourlyOvertimeProtocol: formData.overtimeProtocol,
        hourlyIntent: formData.hourlyIntent,
        hourlyTeamSize: formData.hourlyTeamSize || 2,
        // High-Perception Logistic Engineering fields
        hourlyIsPropertyOccupied: formData.isPropertyOccupied,
        hourlyHasPetsToSecure: formData.hasPetsToSecure,
        hourlyVerticalLogistics: formData.verticalLogistics,
        hourlyScopeExclusionsConfirmed: formData.scopeExclusionsConfirmed,
        hourlyGateCode: formData.gateCode,
        hourlyAlarmCode: formData.alarmCode,
        hourlyKeyLocation: formData.keyLocation,
        hourlyHasVacuum: formData.hasVacuum,
        hourlyHasParking: formData.hasParking,
        // === INTENT-SPECIFIC FIELDS ===
        // Routine Maintenance (extended)
        lifestyleAddons: formData.lifestyleAddons,
        hasSheddingPets: formData.hasSheddingPets,
        equipmentPreference: formData.equipmentPreference,
        clientSuppliesNotes: formData.clientSuppliesNotes,
        routinePriorities: formData.routinePriorities,
        preferredDay: formData.preferredDay,
        // Priority Focus
        budgetHours: formData.budgetHours,
        priorityRanking: formData.priorityRanking,
        priorityAreas: formData.priorityAreas,
        scopeExclusionConfirmed: formData.scopeExclusionConfirmed,
        // Deep Scrub
        grimeLevel: formData.grimeLevel,
        hasNaturalStone: formData.hasNaturalStone,
        pullOutAppliances: formData.pullOutAppliances,
        // Post-Event
        eventType: formData.eventType,
        eventGuestCount: formData.eventGuestCount,
        affectedAreas: formData.affectedAreas,
        messTypes: formData.messTypes,
        debrisBags: formData.debrisBags,
        hasStickySpills: formData.hasStickySpills,
        furnitureNeedsResetting: formData.furnitureNeedsResetting,
        hasBiohazard: formData.hasBiohazard,
        mustFinishBy: formData.mustFinishBy,
        // Organization
        organizationTasks: formData.organizationTasks,
        noScrubAcknowledged: formData.noScrubAcknowledged,
        clutterLevel: formData.clutterLevel,
        // Move-In/Out
        isHome100Empty: formData.isHome100Empty,
        needsLandlordReceipt: formData.needsLandlordReceipt,
        // Move-In/Out Empty Shell Audit
        moveOccupancy: formData.moveOccupancy,
        // Floor Composition (both flows)
        floorHardwoodPercent: formData.floorHardwoodPercent,
        floorCarpetPercent: formData.floorCarpetPercent,
        floorIsFocus: formData.floorIsFocus,
        floorFocusNotes: formData.floorFocusNotes,
        // Vertical Logistics
        propertyType: formData.propertyType,
        houseLevels: formData.houseLevels,
        apartmentFloor: formData.apartmentFloor,
        hasElevator: formData.hasElevator,
        // Patio
        patioCount: formData.patioCount,
        patioScope: formData.patioScope,
        // === V3: AI TIME RECEIPT (for Zapier transparency) ===
        hourlyTimeReceipt: formData.hourlyTimeReceipt,
        // Normalized payload params for Housecall Pro integration
        normalizedPayloadParams: {
          quoteId,
          leadStatus: 'partial',
          mode,
          formData,
          customZones,
          customCounts,
          selectedAddons,
          selectedMicroServices,
          estimatedTotal: total,
          cityKey: cityConfig.key,
        },
      };

      // Track that user reached review step (GA4 + Meta Pixel ViewContent)
      trackEvent('pricing_review_viewed', {
        estimate_total: total,
        mode,
        service_type: mode === 'custom' ? 'Custom / Specific Areas' : formData.serviceType,
        city: formData.city,
        home_type: formData.homeType,
        quote_id: quoteId,
      });

      // Generate PDF and send to Zapier (fire-and-forget)
      const sendToZapier = async () => {
        try {
          const { blob, fileName } = generateQuotePDFBlob({
            mode,
            formData,
            customZones,
            customCounts,
            selectedAddons,
            selectedMicroServices: mode === 'custom' ? selectedMicroServices : undefined,
            microServicesMinimumApplied: mode === 'custom' ? microTotal.minimumApplied : false,
            total,
            recurringStartMode,
            isRecurring,
            // Recurring dual pricing
            firstVisitPrice: isRecurring ? getFirstVisitPrice() : undefined,
            futureVisitsPrice: isRecurring ? getFutureVisitsPrice() : undefined,
            // Hourly mode params
            isHourlyMode: formData.isHourlyMode,
            hourlyRate: formData.isHourlyMode ? getHourlyRate() : undefined,
            hourlyTeamSize: formData.isHourlyMode ? (formData.hourlyTeamSize || 2) : undefined,
            hourlyLaborHours: formData.isHourlyMode ? (formData.hourlyHours * (formData.hourlyTeamSize || 2)) : undefined,
          });
          
          // PRODUCTION: Send review webhook to Zapier
          await sendReviewLeadToZapier(leadData, blob, fileName);
          
          // Track abandoned cart PDF sent (after successful webhook)
          trackEvent('abandoned_pdf_sent', {
            estimate_total: total,
            mode,
            service_type: mode === 'custom' ? 'Custom / Specific Areas' : formData.serviceType,
            quote_id: quoteId,
            city: formData.city,
          });
        } catch (error) {
          console.error('[Review Zap] Error generating PDF or sending webhook:', error);
        }
      };

      // Fire and forget - don't block UI
      sendToZapier();
      setReviewZapSent(true);
    }
  }, [
    currentStep, 
    totalSteps, 
    reviewZapSent, 
    mode, 
    formData, 
    customZones, 
    customCounts, 
    selectedAddons, 
    selectedMicroServices,
    getResidentialTotal,
    isRecurringService,
    getMicroServicesTotal,
    recurringStartMode,
    language,
    quoteId,
    cityConfig,
  ]);

  // NOTE: Web3Forms is used ONLY for final form submission (completed leads).
  // All partial lead / abandoned-cart tracking is handled via Zapier webhook.
  // Data flows:
  // - Partial leads: sendReviewLeadToZapier() → Zapier Catch Hook (with PDF) - triggered on Review step
  // - Complete leads: handleSubmit() → Web3Forms → Zapier + sendCompletedLeadToZapier()

  // Build standardized Zapier/Housecall Pro fields (always English)
  const buildZapierFields = (formDataObj: FormData, status: 'partial' | 'completed') => {
    // === Customer Identity / Contact ===
    formDataObj.append('customer_first_name', formData.firstName || '');
    formDataObj.append('customer_last_name', formData.lastName || '');
    formDataObj.append('customer_email', formData.email || '');
    formDataObj.append('customer_mobile', formData.phone || '');
    formDataObj.append('customer_home_phone', formData.phone || ''); // Same as mobile
    formDataObj.append('customer_work_phone', ''); // Not collected

    // === Address ===
    formDataObj.append('customer_street', formData.address || '');
    formDataObj.append('customer_street_line2', ''); // Unit/apt not collected separately
    formDataObj.append('customer_city', formData.city || '');
    formDataObj.append('customer_state', 'CA'); // California default
    formDataObj.append('customer_zip', ''); // Not collected
    formDataObj.append('customer_country', 'USA');

    // === Service Details ===
    // service_type in English
    const serviceTypeEnglish = mode === 'custom' ? 'Custom / Specific Areas' : formData.serviceType;
    formDataObj.append('service_type', serviceTypeEnglish);
    formDataObj.append('service_flow', mode === 'full' ? 'full-home' : 'custom-areas');
    formDataObj.append('home_type', formData.homeType || 'Single-Family Home');
    formDataObj.append('approx_sqft', getSqftApprox(formData.sqft));
    
    // Bedroom/bathroom counts
    if (mode === 'full') {
      formDataObj.append('bedrooms_count', String(getBedroomCount(formData.homeSize)));
      formDataObj.append('full_bath_count', String(formData.fullBaths + formData.masterBaths));
      formDataObj.append('half_bath_count', String(formData.halfBaths));
    } else {
      // Custom mode uses customCounts
      formDataObj.append('bedrooms_count', String(customCounts.bedroomCount));
      formDataObj.append('full_bath_count', String(customCounts.fullBaths + customCounts.masterBaths));
      formDataObj.append('half_bath_count', String(customCounts.halfBaths));
    }

    // Condition (English label)
    formDataObj.append('home_condition', getConditionLabel(formData.conditionFee));
    formDataObj.append('preferred_date', formData.date || '');

    // Access info (combined into single field)
    const accessParts: string[] = [];
    if (formData.gatedCommunity) accessParts.push('Gated community');
    if (formData.apartmentComplex) accessParts.push('Apartment/Condo complex');
    if (formData.upperFloorNoElevator) accessParts.push('Upper floor without elevator');
    if (formData.accessNotes) accessParts.push(formData.accessNotes);
    formDataObj.append('access_notes', accessParts.join('; ') || '');

    // Pets info (not currently collected, placeholder)
    formDataObj.append('pets_info', '');

    // Add-ons (English names, comma-separated)
    const addonsEnglish = selectedAddons.map(a => 
      a.quantity > 1 ? `${a.quantity}x ${a.value}` : a.value
    ).join(', ');
    formDataObj.append('addons_selected', addonsEnglish || '');

    // Windows summary
    const windowAddons = selectedAddons.filter(a => 
      a.value.toLowerCase().includes('window') || 
      a.value.toLowerCase().includes('blind') ||
      a.value.toLowerCase().includes('shutter')
    );
    const windowsSummary = windowAddons.map(a => 
      a.quantity > 1 ? `${a.quantity}x ${a.value}` : a.value
    ).join(', ');
    formDataObj.append('windows_selected', windowsSummary || '');

    // Customer message / notes
    formDataObj.append('customer_message', formData.notes || '');

    // === MICRO-SERVICES (Custom mode) ===
    if (mode === 'custom' && selectedMicroServices.length > 0) {
      const microServicesEnglish = selectedMicroServices.map(sel => {
        const ms = microServices.find(m => m.id === sel.id);
        const label = microServiceEnglishLabels[sel.id] || sel.id;
        return sel.quantity > 1 ? `${label} x${sel.quantity}` : label;
      }).join('; ');
      formDataObj.append('micro_services_selected', microServicesEnglish);
      formDataObj.append('micro_services_notes', formData.microServicesNotes || '');
    }

    // === Meta / Tracking ===
    formDataObj.append('step_reached', status === 'completed' ? 'submitted' : 'review');
    formDataObj.append('lead_source', 'Website Pricing Form');
    formDataObj.append('city_profile', cityConfig.key);

    // Custom zones for custom mode
    if (mode === 'custom') {
      const selectedZones = Object.entries(customZones)
        .filter(([, v]) => v)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(', ');
      formDataObj.append('custom_zones_selected', selectedZones || '');
    }

    // === HOURLY MODE FIELDS ===
    if (formData.isHourlyMode) {
      formDataObj.append('is_hourly_mode', 'true');
      formDataObj.append('hourly_hours', String(formData.hourlyHours || 3));
      formDataObj.append('hourly_frequency', formData.hourlyFrequency || 'onetime');
      formDataObj.append('hourly_intensity', formData.hourlyIntensity || 'standard');
      formDataObj.append('hourly_supplies', formData.hourlySupplies || 'client');
      formDataObj.append('hourly_priority_notes', formData.hourlyPriorityNotes || '');
      formDataObj.append('hourly_total_sqft', formData.hourlyTotalSqft || '');
      formDataObj.append('hourly_total_beds', String(formData.hourlyTotalBeds || 3));
      formDataObj.append('hourly_total_baths', String(formData.hourlyTotalBaths || 2));
      formDataObj.append('hourly_beds_to_clean', String(formData.hourlyBedsToClean || 2));
      formDataObj.append('hourly_baths_to_clean', String(formData.hourlyBathsToClean || 2));
      formDataObj.append('hourly_include_kitchen', formData.hourlyIncludeKitchen ? 'yes' : 'no');
      formDataObj.append('hourly_include_living', formData.hourlyIncludeLivingAreas ? 'yes' : 'no');
      formDataObj.append('hourly_days_per_week', String(formData.daysPerWeek || 5));
      // === ESTATE & COMPOUND FIELDS ===
      formDataObj.append('guest_house_count', String(formData.guestHouseCount || 0));
      formDataObj.append('pool_house_count', String(formData.poolHouseCount || 0));
      formDataObj.append('cleaning_density', formData.cleaningDensity || 'entire');
      formDataObj.append('custom_active_sqft', formData.customActiveSqft || '');
      formDataObj.append('is_moving_hourly', formData.isMovingHourly ? 'true' : 'false');
      formDataObj.append('concierge_tasks', (formData.hourlyTasks || []).join(', '));
      // === SOUTH COAST LOGISTICS FIELDS ===
      formDataObj.append('hourly_intent', formData.hourlyIntent || 'priority_focus');
      formDataObj.append('hourly_access_type', formData.accessType || 'standard');
      formDataObj.append('hourly_has_delicate_surfaces', formData.hasDelicateSurfaces ? 'true' : 'false');
      formDataObj.append('hourly_delicate_surfaces', (formData.delicateSurfaceTypes || []).join(', '));
      formDataObj.append('hourly_home_condition', formData.homeConditionLevel || 'lived_in');
      formDataObj.append('hourly_is_property_occupied', formData.isPropertyOccupied ? 'true' : 'false');
      formDataObj.append('hourly_has_pets_to_secure', formData.hasPetsToSecure ? 'true' : 'false');
      formDataObj.append('hourly_vertical_logistics', formData.verticalLogistics || 'ground');
      formDataObj.append('hourly_overtime_protocol', formData.overtimeProtocol || 'strict');
      formDataObj.append('hourly_must_haves', (formData.hourlyMustHaves || []).join(', '));
      formDataObj.append('hourly_nice_to_haves', formData.hourlyNiceToHaves || '');
      formDataObj.append('hourly_scope_exclusions_confirmed', formData.scopeExclusionsConfirmed ? 'true' : 'false');
      formDataObj.append('hourly_team_size', String(formData.hourlyTeamSize || 2));
    }

    // === COMMERCIAL MODE FIELDS ===
    if (situation === 'COMMERCIAL') {
      const commercialScope = formData.commercialScope;
      formDataObj.append('is_commercial', 'true');
      formDataObj.append('commercial_project_name', commercialScope?.projectName || '');
      formDataObj.append('commercial_sqft', commercialScope?.sqft || '');
      formDataObj.append('commercial_project_type', commercialScope?.projectType || 'post_construction_final');
      formDataObj.append('commercial_clean_phase', commercialScope?.cleanPhase || 'final');
      formDataObj.append('commercial_floors', String(commercialScope?.floors || 1));
      formDataObj.append('commercial_has_elevator', commercialScope?.hasElevator ? 'yes' : 'no');
      formDataObj.append('commercial_notes', commercialScope?.notes || '');
    }
  };

  // NOTE: submitPartialLead() function REMOVED.
  // Partial lead tracking is now handled ONLY via Zapier webhook (sendReviewLeadToZapier)
  // which fires when user reaches Review step. This eliminates duplicate notifications
  // and keeps Web3Forms reserved for final form submission only.

  // Validation helpers
  const isValidEmail = (email: string) => {
    const trimmed = email.trim();
    return trimmed.length > 0 && trimmed.includes('@') && trimmed.includes('.');
  };

  const isValidPhone = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const isValidCity = (city: string) => {
    return city.trim().length > 0;
  };

  const isValidAddress = (address: string) => {
    return address.trim().length >= 3; // At least 3 characters
  };

  // Name validation removed - names now in StepDetails

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNext = () => {
    // Validate Details step before advancing to Review
    if (isDetailsStep) {
      // DEV BYPASS: Skip all validation for testing
      if (!DEV_BYPASS_VALIDATION) {
        const errors: string[] = [];

        // PRODUCTION: Required fields validation
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
          errors.push(t(language, 'validation.name_required') || 'Please enter your name');
        }

        if (!isValidEmail(formData.email)) {
          errors.push(t(language, 'validation.email_invalid') || 'Please enter a valid email address');
        }

        if (!isValidPhone(formData.phone)) {
          errors.push(t(language, 'validation.phone_invalid') || 'Please enter a valid phone number');
        }

        if (!isValidAddress(formData.address)) {
          errors.push(t(language, 'validation.address_required') || 'Please enter your service address');
        }

        if (!isValidCity(formData.city)) {
          errors.push(t(language, 'validation.city_required') || 'Please enter your city');
        }

        if (errors.length > 0) {
          // Show first error as toast
          toast.error(errors[0]);
          return;
        }

        // Track lead info completed (user filled all required fields)
        trackEvent('lead_info_completed', {
          city: formData.city,
          has_email: !!formData.email,
          has_phone: !!formData.phone,
        });

        // Track details step completed (user is moving to review) - use SST
        const total = getResidentialTotal();
        trackEvent('pricing_details_completed', {
          mode,
          service_type: mode === 'custom' ? 'Custom / Specific Areas' : formData.serviceType,
          estimate_total: total,
        });
      } else {
        console.log('[DEV MODE] Validation bypassed - skipping field checks and analytics');
      }

      // NOTE: Partial lead is now sent ONLY via Zapier webhook (sendReviewLeadToZapier)
      // when the user reaches Review step. Web3Forms partial submission removed.

      // Show Labor Illusion loader before revealing Review step
      setShowLoader(true);
      return; // Don't advance step yet - loader will handle it
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      scrollToTop();
    }
  };

  // Callback when Labor Illusion loader completes
  const handleLoaderComplete = useCallback(() => {
    setShowLoader(false);
    setCurrentStep(currentStep + 1); // Advance to Review step
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollToTop();
    }
  };

  const handleSubmit = async () => {
    // Validate contact info
    if (!formData.phone || !formData.email || !formData.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    // Use SST for residential totals
    const total = getResidentialTotal();
    const isRecurring = isRecurringService();
    const serviceTypeLabel = mode === 'custom' ? 'Custom / Specific Areas' : formData.serviceType;

    // Track quote submission (GA4 + Meta Pixel Lead)
    trackEvent('quote_submitted', {
      estimate_total: total,
      mode,
      service_type: serviceTypeLabel,
      quote_id: quoteId,
      city: formData.city,
    });

    try {
      // Get micro-services total info for PDF
      const microTotal = getMicroServicesTotal();
      
      // Generate PDF Blob for attachment
      const { blob: pdfBlob, fileName: pdfFileName } = generateQuotePDFBlob({
        mode,
        formData,
        customZones,
        customCounts,
        selectedAddons,
        selectedMicroServices: mode === 'custom' ? selectedMicroServices : undefined,
        microServicesMinimumApplied: mode === 'custom' ? microTotal.minimumApplied : false,
        total,
        recurringStartMode,
        isRecurring,
        // Recurring dual pricing
        firstVisitPrice: isRecurring ? getFirstVisitPrice() : undefined,
        futureVisitsPrice: isRecurring ? getFutureVisitsPrice() : undefined,
        // Hourly mode params
        isHourlyMode: formData.isHourlyMode,
        hourlyRate: formData.isHourlyMode ? getHourlyRate() : undefined,
        hourlyTeamSize: formData.isHourlyMode ? 2 : undefined,
        hourlyLaborHours: formData.isHourlyMode ? formData.hourlyHours * 2 : undefined,
      });

      // Build FormData for multipart submission (Web3Forms PRO)
      const formDataObj = new FormData();
      
      // Core Web3Forms fields
      formDataObj.append('access_key', '3d0fda02-f5e1-4159-90e0-5e06bbce3e95');
      formDataObj.append('to', 'housesparkle805@gmail.com');
      formDataObj.append('replyto', formData.email);
      formDataObj.append('subject', `New Lead: ${formData.firstName} ${formData.lastName} - $${total}`);
      formDataObj.append('from_name', "Nancy's Quote Widget");
      
      // === LEAD STATUS FIELDS FOR ZAPIER ===
      formDataObj.append('status', 'completed');
      formDataObj.append('lead_status', 'completed'); // Clear Zapier-friendly status
      formDataObj.append('quote_id', quoteId);
      
      // === CLIENT INFO ===
      formDataObj.append('Client Name', `${formData.firstName} ${formData.lastName}`);
      formDataObj.append('Phone', formData.phone);
      formDataObj.append('Email', formData.email);
      formDataObj.append('Address', `${formData.address}, ${formData.city}`);
      
      // === PROPERTY DETAILS ===
      formDataObj.append('Home Type', formData.homeType);
      formDataObj.append('Bedrooms', formData.homeSize === 0 ? 'Studio' : `${formData.homeSize} Bed`);
      formDataObj.append('Master Baths', String(formData.masterBaths || 0));
      formDataObj.append('Full Baths', String(formData.fullBaths || 0));
      formDataObj.append('Half Baths', String(formData.halfBaths || 0));
      formDataObj.append('Total Bathrooms', String((formData.masterBaths || 0) + (formData.fullBaths || 0) + (formData.halfBaths || 0)));
      formDataObj.append('Square Footage', formData.sqft || 'Not specified');
      formDataObj.append('Condition Level', getConditionLabel(formData.conditionFee));
      formDataObj.append('Gated Community', formData.gatedCommunity ? 'Yes' : 'No');
      formDataObj.append('Apartment Complex', formData.apartmentComplex ? 'Yes' : 'No');
      formDataObj.append('Upper Floor No Elevator', formData.upperFloorNoElevator ? 'Yes' : 'No');
      formDataObj.append('Access Notes', formData.accessNotes || 'None');
      
      // === DETAILED HOME MAPPING (Multi-Floor Properties) ===
      if (formData.roomFloorLocations && formData.houseLevels >= 2) {
        const roomLocs = formData.roomFloorLocations;
        
        // Core spaces
        formDataObj.append('Kitchen Floor', `Floor ${roomLocs.kitchen || 1}`);
        formDataObj.append('Living Room Floor', `Floor ${roomLocs.living || 1}`);
        formDataObj.append('Dining Room Floor', `Floor ${roomLocs.dining || 1}`);
        
        // Bedrooms (mapped individually)
        if (roomLocs.bedrooms && Object.keys(roomLocs.bedrooms).length > 0) {
          const bedroomFloors = Object.entries(roomLocs.bedrooms)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, floor]) => `${id.replace('bed_', 'Bedroom ')}: Floor ${floor}`)
            .join(', ');
          formDataObj.append('Bedroom Locations', bedroomFloors);
        }
        
        // Mapping summary
        const totalMapped = (roomLocs.kitchen ? 1 : 0) + (roomLocs.living ? 1 : 0) + (roomLocs.dining ? 1 : 0) + Object.keys(roomLocs.bedrooms || {}).length;
        formDataObj.append('Rooms Mapped', String(totalMapped));
        formDataObj.append('House Levels', String(formData.houseLevels));
      }
      
      // === SERVICE DETAILS ===
      formDataObj.append('SERVICE MODE', mode === 'full' ? 'Full Home' : 'Custom/Partial');
      formDataObj.append('SERVICE TYPE', serviceTypeLabel);
      formDataObj.append('Frequency', isRecurring ? 'Recurring' : 'One-Time');
      formDataObj.append('ESTIMATED TOTAL', `$${total}`);
      
      // Recurring pricing breakdown
      if (isRecurring) {
        formDataObj.append('First Visit Price', `$${getFirstVisitPrice()}`);
        formDataObj.append('Future Visits Price', `$${getFutureVisitsPrice()}`);
        formDataObj.append('Recurring Start Mode', recurringStartMode === 'deep-plus-recurring' ? 'Start with Deep Clean' : 'Start with Standard');
      }
      
      // === HOURLY MODE DETAILS ===
      if (formData.isHourlyMode) {
        formDataObj.append('Hourly Mode', 'Yes');
        formDataObj.append('Hours Requested', String(formData.hourlyHours || 3));
        formDataObj.append('Hourly Rate', `$${getHourlyRate()}/hr`);
        formDataObj.append('Team Size', `${formData.hourlyTeamSize || 2} cleaners`);
        formDataObj.append('Total Labor Hours', `${(formData.hourlyHours || 3) * (formData.hourlyTeamSize || 2)} hrs`);
        formDataObj.append('Intensity', formData.hourlyIntensity || 'basic');
        formDataObj.append('Client Provides Supplies', formData.hourlySupplies === 'client' ? 'Yes' : 'No');
        formDataObj.append('Beds to Clean', `${formData.hourlyBedsToClean || 0} of ${formData.hourlyTotalBeds || 0}`);
        formDataObj.append('Baths to Clean', `${formData.hourlyBathsToClean || 0} of ${formData.hourlyTotalBaths || 0}`);
        formDataObj.append('Include Kitchen', formData.hourlyIncludeKitchen ? 'Yes' : 'No');
        formDataObj.append('Include Living Areas', formData.hourlyIncludeLivingAreas ? 'Yes' : 'No');
        formDataObj.append('Priority Notes', formData.hourlyPriorityNotes || 'None');
        formDataObj.append('Hourly Frequency', formData.hourlyFrequency || 'one-time');
        // Estate & Compound fields
        formDataObj.append('Total Property SqFt', formData.hourlyTotalSqft || 'Not specified');
        formDataObj.append('Guest Houses', String(formData.guestHouseCount || 0));
        formDataObj.append('Pool Houses', String(formData.poolHouseCount || 0));
        formDataObj.append('Cleaning Density', formData.cleaningDensity || 'entire');
        formDataObj.append('Is Move-In Hourly', formData.isMovingHourly ? 'Yes' : 'No');
        formDataObj.append('Concierge Tasks', (formData.hourlyTasks || []).join(', ') || 'None');
        // === SOUTH COAST LOGISTICS FIELDS ===
        formDataObj.append('Service Intent', formData.hourlyIntent || 'priority_focus');
        formDataObj.append('Access Type', formData.accessType || 'standard');
        formDataObj.append('Delicate Surfaces', formData.hasDelicateSurfaces ? (formData.delicateSurfaceTypes || []).join(', ') : 'None');
        formDataObj.append('Home Condition', formData.homeConditionLevel || 'lived_in');
        formDataObj.append('Property Occupied', formData.isPropertyOccupied ? 'Yes (occupied)' : 'No (vacant)');
        formDataObj.append('Pets To Secure', formData.hasPetsToSecure ? 'Yes' : 'No');
        formDataObj.append('Vertical Access', formData.verticalLogistics || 'ground');
        formDataObj.append('Overtime Protocol', formData.overtimeProtocol || 'strict');
        formDataObj.append('Must-Have Priorities', (formData.hourlyMustHaves || []).join(', ') || 'None');
        formDataObj.append('Nice-to-Haves', formData.hourlyNiceToHaves || 'None');
        formDataObj.append('Scope Exclusions Confirmed', formData.scopeExclusionsConfirmed ? 'Yes' : 'No');
        
        // === INTENT-SPECIFIC FIELDS (Web3Forms) ===
        // Routine Maintenance
        if (formData.hourlyIntent === 'routine_maintenance') {
          const lifestyle = formData.lifestyleAddons;
          if (lifestyle?.laundryLoads) formDataObj.append('Laundry Loads', String(lifestyle.laundryLoads));
          if (lifestyle?.dishwasher) formDataObj.append('Dishwasher', 'Yes');
          if (lifestyle?.bedMaking) formDataObj.append('Bed Making', 'Yes');
          if (lifestyle?.plantCare) formDataObj.append('Plant Care', 'Yes');
          if (lifestyle?.trashOut) formDataObj.append('Trash Out', 'Yes');
          if (lifestyle?.mailSort) formDataObj.append('Mail Sort', 'Yes');
          if (lifestyle?.petBowls) formDataObj.append('Pet Bowls', 'Yes');
          if (formData.hasSheddingPets) formDataObj.append('Shedding Pets', 'Yes (HEPA required)');
          if (formData.equipmentPreference) formDataObj.append('Equipment Preference', formData.equipmentPreference);
          if (formData.preferredDay) formDataObj.append('Preferred Day', formData.preferredDay);
        }
        // Priority Focus
        if (formData.hourlyIntent === 'priority_focus') {
          if (formData.priorityAreas?.length > 0) formDataObj.append('Priority Areas', formData.priorityAreas.join(' → '));
          if (formData.budgetHours) formDataObj.append('Budget Hours', String(formData.budgetHours));
          if (formData.scopeExclusionConfirmed) formDataObj.append('Scope Exclusion Confirmed', 'Yes');
        }
        // Deep Scrub
        if (formData.hourlyIntent === 'deep_scrub') {
          if (formData.grimeLevel) formDataObj.append('Grime Level', formData.grimeLevel);
          if (formData.hasNaturalStone) formDataObj.append('Natural Stone', 'Yes');
          if (formData.pullOutAppliances) formDataObj.append('Pull Out Appliances', 'Yes');
        }
        // Post-Event
        if (formData.hourlyIntent === 'post_event') {
          if (formData.eventType) formDataObj.append('Event Type', formData.eventType);
          if (formData.eventGuestCount) formDataObj.append('Guest Count', formData.eventGuestCount);
          if (formData.affectedAreas?.length > 0) formDataObj.append('Affected Areas', formData.affectedAreas.join(', '));
          if (formData.messTypes?.length > 0) formDataObj.append('Mess Types', formData.messTypes.join(', '));
          if (formData.debrisBags) formDataObj.append('Debris Bags', String(formData.debrisBags));
          if (formData.hasStickySpills) formDataObj.append('Sticky Spills', 'Yes');
          if (formData.furnitureNeedsResetting) formDataObj.append('Furniture Reset', 'Yes');
          if (formData.hasBiohazard) formDataObj.append('Biohazard', 'Yes');
          if (formData.mustFinishBy) formDataObj.append('Must Finish By', formData.mustFinishBy);
        }
        // Organization
        if (formData.hourlyIntent === 'organization') {
          if (formData.organizationTasks?.length > 0) formDataObj.append('Organization Tasks', formData.organizationTasks.join(', '));
          if (formData.clutterLevel) formDataObj.append('Clutter Level', formData.clutterLevel);
          if (formData.noScrubAcknowledged) formDataObj.append('No Scrub Acknowledged', 'Yes');
        }
        // Move-In/Out
        if (formData.hourlyIntent === 'move_in_out') {
          if (formData.isHome100Empty !== null) formDataObj.append('Home 100% Empty', formData.isHome100Empty ? 'Yes' : 'No');
          if (formData.needsLandlordReceipt) formDataObj.append('Landlord Receipt', 'Yes');
        }
      } else {
        formDataObj.append('Hourly Mode', 'No');
      }
      
      // === ADD-ONS ===
      formDataObj.append('Selected Add-ons', selectedAddons.length > 0 
        ? selectedAddons.map((a) => `${a.quantity}x ${a.value}`).join(', ') 
        : 'None');
      
      // === MICRO-SERVICES (Custom mode) ===
      if (mode === 'custom' && selectedMicroServices.length > 0) {
        formDataObj.append('Micro-Services Selected', selectedMicroServices.map(m => m.id).join(', '));
        formDataObj.append('Micro-Services Minimum Applied', microTotal.minimumApplied ? 'Yes ($120 min)' : 'No');
      }
      
      // === CUSTOM MODE ZONES ===
      if (mode === 'custom') {
        formDataObj.append('Selected Zones', Object.entries(customZones)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(', ') || 'None');
      }
      
      // === UTILITY AREAS (Home Mapping - Single Source of Truth) ===
      const isDeepService = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
      const utilityAreasPayload = serializeUtilityAreasForPayload(
        formData.homeMapping?.areas || DEFAULT_HOME_MAPPING_AREAS,
        isDeepService
      );
      
      if (utilityAreasPayload.utilityAreas.length > 0) {
        formDataObj.append('Utility Areas', utilityAreasPayload.utilityAreas.map(a => 
          `${a.areaKey}: ${a.configSummary} (+$${a.price}, ~${a.timeMinutes} min)`
        ).join(' | '));
        formDataObj.append('Utility Areas Total', `$${utilityAreasPayload.totalPrice}`);
        formDataObj.append('Utility Areas Time', `${utilityAreasPayload.totalTimeMinutes} min`);
        
        // Flattened keys for Zapier
        formDataObj.append('office_enabled', String(formData.homeMapping?.areas.office.enabled || false));
        formDataObj.append('laundry_enabled', String(formData.homeMapping?.areas.laundry.enabled || false));
        formDataObj.append('garage_enabled', String(formData.homeMapping?.areas.garage.enabled || false));
        formDataObj.append('patio_enabled', String(formData.homeMapping?.areas.patio.enabled || false));
      }
      
      // === SCHEDULING ===
      formDataObj.append('Desired Date', formData.date || 'Flexible');
      formDataObj.append('Notes', formData.notes || 'None');

      // === ADD STANDARDIZED ZAPIER/HCP FIELDS ===
      buildZapierFields(formDataObj, 'completed');
      
      // === BUILD NORMALIZED PAYLOAD FOR HOUSECALL PRO ===
      const normalizedQuote = buildNormalizedQuotePayload({
        quoteId,
        leadStatus: 'completed',
        mode,
        formData,
        customZones,
        customCounts,
        selectedAddons,
        selectedMicroServices,
        estimatedTotal: total,
        cityKey: cityConfig.key,
      });
      
      const housecallSuggestion = buildHousecallSuggestion({
        quoteId,
        leadStatus: 'completed',
        mode,
        formData,
        customZones,
        customCounts,
        selectedAddons,
        selectedMicroServices,
        estimatedTotal: total,
        cityKey: cityConfig.key,
      });
      
      // Attach normalized payloads as JSON strings
      formDataObj.append('normalized_quote', JSON.stringify(normalizedQuote));
      formDataObj.append('housecall_suggestion', JSON.stringify(housecallSuggestion));
      
      // === BUILD HCP API-READY BODIES ===
      const payloadParams = {
        quoteId,
        leadStatus: 'completed' as const,
        mode,
        formData,
        customZones,
        customCounts,
        selectedAddons,
        selectedMicroServices,
        estimatedTotal: total,
        cityKey: cityConfig.key,
      };
      
      const hcpCustomerBody = buildHcpCustomerBody(payloadParams);
      const hcpLeadBodyTemplate = buildHcpLeadBodyTemplate(payloadParams);
      const hcpEstimateBodyTemplate = buildHcpEstimateBodyTemplate(payloadParams);
      const hcpCustomerLookup = buildHcpCustomerLookup(payloadParams);
      
      // Attach HCP bodies as JSON strings (for Zapier "Find or Create" flows)
      formDataObj.append('hcp_customer_body', JSON.stringify(hcpCustomerBody));
      formDataObj.append('hcp_lead_body_template', JSON.stringify(hcpLeadBodyTemplate));
      formDataObj.append('hcp_estimate_body_template', JSON.stringify(hcpEstimateBodyTemplate));
      formDataObj.append('hcp_customer_lookup', JSON.stringify(hcpCustomerLookup));
      
      // Attach PDF as file (Web3Forms PRO feature)
      formDataObj.append('attachment', pdfBlob, pdfFileName);

      // Submit to Web3Forms (no Content-Type header - let browser set multipart boundary)
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formDataObj,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Lead Payload] completed', normalizedQuote, housecallSuggestion);
          console.log('[HCP Lookup] completed', hcpCustomerLookup);
        }
        console.log('[Web3Forms] Complete lead submitted (lead_status: completed):', quoteId);
        
        // === FIRE ZAPIER COMPLETED WEBHOOK (fire-and-forget, non-blocking) ===
        // This ensures completed lead ALWAYS reaches Zapier even if Web3Forms webhook fails
        const completedLeadData: ReviewLeadData = {
          quoteId,
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          customerFirstName: formData.firstName || '',
          customerLastName: formData.lastName || '',
          customerEmail: formData.email || '',
          customerPhone: formData.phone || '',
          customerCity: formData.city || '',
          customerAddress: formData.address ? `${formData.address}, ${formData.city}` : '',
          serviceMode: mode,
          serviceType: serviceTypeLabel,
          homeType: formData.homeType || 'Single-Family Home',
          totalEstimate: total,
          language: language,
          // Hourly mode fields
          hourlyMode: formData.isHourlyMode,
          hourlyHours: formData.hourlyHours,
          hourlyFrequency: formData.hourlyFrequency,
          hourlyIntensity: formData.hourlyIntensity,
          hourlySupplies: formData.hourlySupplies,
          hourlyPriorityNotes: formData.hourlyPriorityNotes,
          hourlyTotalBeds: formData.hourlyTotalBeds,
          hourlyTotalBaths: formData.hourlyTotalBaths,
          hourlyBedsToClean: formData.hourlyBedsToClean,
          // === SOUTH COAST HOURLY FIELDS ===
          hourlyAccessType: formData.accessType,
          hourlyHasDelicateSurfaces: formData.hasDelicateSurfaces,
          hourlyDelicateSurfaceTypes: formData.delicateSurfaceTypes,
          hourlyHomeCondition: formData.homeConditionLevel,
          hourlyMustHaves: formData.hourlyMustHaves,
          hourlyNiceToHaves: formData.hourlyNiceToHaves,
          hourlyOvertimeProtocol: formData.overtimeProtocol,
          hourlyIntent: formData.hourlyIntent,
          hourlyTeamSize: formData.hourlyTeamSize || 2,
          // High-Perception Logistic Engineering fields
          hourlyIsPropertyOccupied: formData.isPropertyOccupied,
          hourlyHasPetsToSecure: formData.hasPetsToSecure,
          hourlyVerticalLogistics: formData.verticalLogistics,
          hourlyScopeExclusionsConfirmed: formData.scopeExclusionsConfirmed,
          hourlyGateCode: formData.gateCode,
          hourlyAlarmCode: formData.alarmCode,
          hourlyKeyLocation: formData.keyLocation,
          hourlyHasVacuum: formData.hasVacuum,
          hourlyHasParking: formData.hasParking,
          hourlyBathsToClean: formData.hourlyBathsToClean,
          hourlyIncludeKitchen: formData.hourlyIncludeKitchen,
          hourlyIncludeLiving: formData.hourlyIncludeLivingAreas,
          hourlyDaysPerWeek: formData.daysPerWeek,
          // Estate & Compound fields (Hourly mode)
          hourlyTotalSqft: formData.hourlyTotalSqft,
          guestHouseCount: formData.guestHouseCount,
          poolHouseCount: formData.poolHouseCount,
          cleaningDensity: formData.cleaningDensity,
          customActiveSqft: formData.customActiveSqft,
          isMovingHourly: formData.isMovingHourly,
          hourlyTasks: formData.hourlyTasks,
          // === INTENT-SPECIFIC FIELDS ===
          // Routine Maintenance (extended)
          lifestyleAddons: formData.lifestyleAddons,
          hasSheddingPets: formData.hasSheddingPets,
          equipmentPreference: formData.equipmentPreference,
          clientSuppliesNotes: formData.clientSuppliesNotes,
          routinePriorities: formData.routinePriorities,
          preferredDay: formData.preferredDay,
          // Priority Focus
          budgetHours: formData.budgetHours,
          priorityRanking: formData.priorityRanking,
          priorityAreas: formData.priorityAreas,
          scopeExclusionConfirmed: formData.scopeExclusionConfirmed,
          // Deep Scrub
          grimeLevel: formData.grimeLevel,
          hasNaturalStone: formData.hasNaturalStone,
          pullOutAppliances: formData.pullOutAppliances,
          // Post-Event
          eventType: formData.eventType,
          eventGuestCount: formData.eventGuestCount,
          affectedAreas: formData.affectedAreas,
          messTypes: formData.messTypes,
          debrisBags: formData.debrisBags,
          hasStickySpills: formData.hasStickySpills,
          furnitureNeedsResetting: formData.furnitureNeedsResetting,
          hasBiohazard: formData.hasBiohazard,
          mustFinishBy: formData.mustFinishBy,
          // Organization
          organizationTasks: formData.organizationTasks,
          noScrubAcknowledged: formData.noScrubAcknowledged,
          clutterLevel: formData.clutterLevel,
          // Move-In/Out
          isHome100Empty: formData.isHome100Empty,
          needsLandlordReceipt: formData.needsLandlordReceipt,
          // Move-In/Out Empty Shell Audit
          moveOccupancy: formData.moveOccupancy,
          // Floor Composition (both flows)
          floorHardwoodPercent: formData.floorHardwoodPercent,
          floorCarpetPercent: formData.floorCarpetPercent,
          floorIsFocus: formData.floorIsFocus,
          floorFocusNotes: formData.floorFocusNotes,
          // Vertical Logistics
          propertyType: formData.propertyType,
          houseLevels: formData.houseLevels,
          apartmentFloor: formData.apartmentFloor,
          hasElevator: formData.hasElevator,
          // Patio
          patioCount: formData.patioCount,
          patioScope: formData.patioScope,
          // Normalized payload params
          normalizedPayloadParams: payloadParams,
        };
        
        // Fire and forget - don't block redirect
        sendCompletedLeadToZapier(completedLeadData, pdfBlob, pdfFileName).catch((err) => {
          console.error('[Zapier Completed] Error (non-blocking):', err);
        });
        
        // Clear persisted state after successful submission
        clearPersistedState();
        
        toast.success(t(language, 'msg.success'));
        // Redirect to thank-you page on success
        window.location.href = 'https://nancyshousekeepingservice.com/thank-you/';
      } else {
        toast.error(t(language, 'msg.error'));
      }
    } catch (error) {
      toast.error(t(language, 'msg.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step content based on position and situation
  // FROZEN: Industry step bypassed - Triage is now Step 0
  const renderStepContent = () => {
    // FROZEN: Skip Industry, start at Triage
    // Step 0 is now Triage for all residential flows
    if (currentStep === 0) return <StepTriage />;

    // FROZEN: Commercial flow disabled
    // if (industry === 'commercial' || situation === 'COMMERCIAL') { ... }

    // RENOVATION flow: Triage(0) → RenovationStart(1) → Details(2) → Review(3)
    if (situation === 'RENOVATION') {
      if (currentStep === 1) return <StepRenovation />;
      if (currentStep === 2) return <StepDetails />;
      if (currentStep === 3) return <StepReview />;
      return <StepRenovation />;
    }

    // HOURLY flow (NEW): Triage(0) → HourlyConfig(1) → Details(2) → Review(3)
    // This is now a PRIMARY situation, separate from SPECIFIC_AREAS
    if (situation === 'HOURLY') {
      if (currentStep === 1) return <StepHourlyConfig />;
      if (currentStep === 2) return <StepDetails />;
      if (currentStep === 3) return <StepReview />;
      return <StepHourlyConfig />;
    }

    // SPECIFIC_AREAS flow — Now ONLY "By Area" (no hourly branch)
    if (situation === 'SPECIFIC_AREAS') {
      // Legacy compatibility: old sessions with SPECIFIC_AREAS + isHourlyMode
      if (formData.isHourlyMode) {
        if (currentStep === 1) return <StepHourlyConfig />;
        if (currentStep === 2) return <StepDetails />;
        if (currentStep === 3) return <StepReview />;
        return <StepHourlyConfig />;
      }
      
      // AREA MODE: Triage(0) → CustomStart(1) → [Windows(2)] → Details → Review
      if (currentStep === 1) return <StepCustomStart />;
      if (showWindowStep) {
        if (currentStep === 2) return <StepWindows />;
        if (currentStep === 3) return <StepDetails />;
        if (currentStep === 4) return <StepReview />;
      } else {
        if (currentStep === 2) return <StepDetails />;
        if (currentStep === 3) return <StepReview />;
      }
      return <StepCustomStart />;
    }

    // Full home mode (LIVE_HERE/MOVING): Triage(0) → Start(1) → Addons(2) → [Windows] → Details → Review
    if (currentStep === 1) return <StepStart />;
    if (currentStep === 2) return <StepAddons />;
    if (showWindowStep) {
      if (currentStep === 3) return <StepWindows />;
      if (currentStep === 4) return <StepDetails />;
      if (currentStep === 5) return <StepReview />;
    } else {
      if (currentStep === 3) return <StepDetails />;
      if (currentStep === 4) return <StepReview />;
    }
    return <StepStart />;
  };

  // Determine if we should show the price sidebar (desktop) or footer (mobile)
  // Show on steps where pricing is relevant (after industry and triage)
  // SMART VISIBILITY: Only show after user selects sq ft (creates a "reveal" moment)
  const hasSqftSelected = !!formData.squareFootageRange;
  const isStandardFlow = situation === 'LIVE_HERE' || situation === 'MOVING';
  // FROZEN: Triage is now step 0, Start is step 1
  const isStartStep = currentStep === 0;
  const showPricingSidebar = currentStep >= 2 && 
    !isIndustryStep && 
    !isTriageStep && 
    !isStartStep &&
    (isStandardFlow ? hasSqftSelected : true);
  
  // NEW: Mobile footer shows earlier than desktop sidebar
  // Visible from Step 1 (after triage), regardless of sqft selection
  const showPricingFooter = 
    currentStep >= 1 && 
    !isIndustryStep && 
    !isTriageStep;
  
  // Fix #3: Sync sticky visibility to CSS variable for consistent padding
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--show-sticky-footer', 
      showPricingFooter ? '1' : '0'
    );
    return () => {
      document.documentElement.style.removeProperty('--show-sticky-footer');
    };
  }, [showPricingFooter]);

  return (
    <div className="w-full isolate" ref={widgetRef}>
      {/* Labor Illusion Loader - shows before Review step */}
      {showLoader && (
        <CalculatingLoader onComplete={handleLoaderComplete} duration={2000} />
      )}

      {/* Form Container - Isolated stacking context */}
      <div className="w-full">
        {/* Header Controls - Language only */}
        <div className="flex items-center justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Main Card - Full width, isolated z-index */}
        <div className="bg-card rounded-2xl shadow-lg border border-border/50 relative isolate overflow-visible">
          {/* Subtle gradient overlay - pointer-events-none to not block clicks */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-transparent pointer-events-none opacity-50 rounded-2xl" />
          
          {/* Card inner content - relative z-index to stay above overlay */}
          <div className="relative z-10 p-4 sm:p-6">
            <div className="mb-6">
              <ProgressBar />
            </div>

            {/* Step Content - isolate to prevent z-index bleeding */}
            <div 
              key={stepKey}
              className="min-h-[380px] sm:min-h-[400px] pb-36 md:pb-0 step-content-enter isolate"
            >
              {renderStepContent()}
            </div>

              {/* Navigation Footer - Hidden on mobile when StickyActionFooter is shown */}
              <div className="hidden md:flex gap-3 mt-8 pt-5 border-t border-border/50">
                {!isFirstStep && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className={cn(
                      "flex-1 h-14 sm:h-[3.25rem] rounded-full font-semibold text-base",
                      "border-2 hover:bg-muted/50 active:scale-[0.98] transition-all duration-200"
                    )}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t(language, 'btn.back')}
                  </Button>
                )}

                {/* FORWARD BUTTON: Show Continue or Submit based on step */}
                {!isLastStep ? (
                  // NOT on last step: show Continue button (enabled/disabled based on validation)
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={shouldHideContinue}
                    className={cn(
                      "flex-1 h-14 sm:h-[3.25rem] rounded-full font-bold text-base",
                      "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85",
                      "shadow-primary hover:shadow-primary-lg active:scale-[0.98]",
                      "transition-all duration-200",
                      !shouldHideContinue && "animate-pulse-subtle hover:animate-none",
                      shouldHideContinue && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {t(language, 'btn.next')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  // ON last step (Review): show Submit button
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 h-14 sm:h-[3.25rem] rounded-full font-bold text-base",
                      "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85",
                      "shadow-primary hover:shadow-primary-lg active:scale-[0.98]",
                      "transition-all duration-200",
                      !isSubmitting && "animate-pulse-subtle hover:animate-none"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t(language, 'msg.sending')}
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        {t(language, 'btn.secure_booking')}
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Mobile-only Back button */}
              {!isFirstStep && (
                <div className="md:hidden mt-6 pt-4 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="w-full h-12 rounded-full font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t(language, 'btn.back')}
                  </Button>
                </div>
              )}
          </div>
        </div>

        {/* Developer-Only Debug Panel - NEVER shows in production */}
        {import.meta.env.DEV && (
          <>
            {/* Mini debug banner for routing verification */}
            <div className="fixed bottom-2 left-2 bg-yellow-100 dark:bg-yellow-900/50 text-xs p-2 rounded-lg font-mono z-50 shadow-lg border border-yellow-300 dark:border-yellow-700">
              <span className="font-bold text-yellow-800 dark:text-yellow-200">DEV:</span>{' '}
              <span className="text-yellow-700 dark:text-yellow-300">
                sit={situation || 'null'} | mode={mode} | hourly={String(!!formData.isHourlyMode)} | step={currentStep}/{totalSteps}
              </span>
            </div>
            <DebugPanel />
          </>
        )}
      </div>

      {/* Mobile Sticky Footer */}
      {showPricingFooter && (
        <StickyActionFooter
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          shouldDisableContinue={shouldHideContinue}
          onContinue={handleNext}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// NOTE: DebugPanel is now imported from ./DebugPanel.tsx