import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from '@/hooks/useBookingSummary';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { pricingData, serviceTypeMap, addonPrices, HOURLY_CONFIG, FREQUENCY_MULTIPLIERS, ADDON_TIMES, windowTypeAddons, blindTypeAddons, microServices } from '@/lib/pricing';
import { calculateComponentPrice, HOME_BASE_RATES, getBedroomCountFromHomeSize, calculateEstimatedTime, calculateLivingAreasTotal, LIVING_AREA_RATES, calculateProgressiveCabinetPrice, calculateVerticalSurcharge, calculatePatioTotal, calculateAdditionalStructuresTotal, ADDITIONAL_STRUCTURE_RATES, StructureBreakdownItem, getStairHazardBuffer, STAIR_HAZARD_TIMES, getHallwayHazardBuffer, HALLWAY_HAZARD_TIMES, getBedroomHazardBuffer, BEDROOM_HAZARD_TIMES, getDiningHazardBuffer, DINING_HAZARD_TIMES, getLivingHazardBuffer, LIVING_HAZARD_TIMES, isLifestyleFlow, isOrganizationAllowed, calcFreshSheetsTotals, calcOrganizationTotals, FRESH_SHEETS_RATE, ORGANIZATION_RATE, getRoomLabel } from '@/lib/pricing_v2';
import { getBathroomPricingTier } from '@/lib/pricingTier';
import { calculateBathroomInventoryTotals } from '@/lib/bathroomPricing';
import { calculateCommercialQuote, calculateConstructionQuote, getProjectTypeLabel, getCleanPhaseLabel, calculateCommercialAddonsTotal, getComplexityLevel, formatSqft } from '@/lib/pricing_commercial';
import { calculateRenovationQuote, getPhaseLabel, getOccupancyLabel, getDebrisLabel, getSurfaceRiskLabel, RenovationQuote } from '@/lib/pricing_renovation';
import { calculateRoomWindowTotal, calcWindowMapByRoom } from '@/lib/roomWindowConfig';
import { WindowCleaningMapDisplay } from './WindowCleaningMapDisplay';
import { getAreaTrackingCode } from '@/lib/homeStructureIds';
import { HALLWAY_RATES, HALLWAY_SIZE_INFO } from '@/lib/pricing_hallways';
import { calculateTotalBathroomLogisticsTime } from '@/lib/bathroomLogisticsTime';
import { getKitchenAddonPricing, CabinetSizeOverride, DegreaseLevel } from '@/lib/pricing_kitchen';
import { X, Sparkles, Users, Clock, Shield, CheckCircle2, BadgePercent, Home, Bath, Maximize2, TrendingDown, Layers, RefreshCw, Truck, Zap, Building2, HardHat, Ruler, ChevronDown, AlertTriangle, Wrench, Gem, ArrowUp, Sun, MapPin, DoorOpen } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { ValueSlider } from './ValueSlider';
import { SidebarContractSection } from './SidebarContractSection';
import { PropertyLogisticsMapTeaser } from './PropertyLogisticsMapTeaser';
import { useHomeLayoutModel } from '@/hooks/useHomeLayoutModel';
// SSOT: Centralized label normalizers for UI ↔ PDF parity
import { formatSquareFootageLabel, type Language } from '@/lib/pdf/labelNormalizers';

// Feature flag for contract-driven sidebar (enable to use new system)
const USE_CONTRACT_SIDEBAR = true;

export function LivePriceSummary() {
  const { 
    language, 
    formData, 
    selectedAddons, 
    toggleAddon, 
    getRoomAddonsTotal,
    toggleRoomAddon,
    recurringStartMode,
    calculateHourlyTotal,
    getHourlyRate,
    mode,
    isRecurringService,
    getFirstVisitPrice,
    getFutureVisitsPrice,
    customZones,
    situation,
    selectedMicroServices,
    currentStep,
    industry,
  } = useBooking();
  
  // === USE SUMMARY HOOK (Single Source of Truth for standard residential) ===
  const summary = useBookingSummary();
  
  // === SINGLE BUILD POINT: Property Logistics Map model ===
  // Uses fingerprint-based hook for guaranteed sync with Review/PDF
  const homeLayoutModel = useHomeLayoutModel();
  
  // Commercial mode detection
  const isCommercial = situation === 'COMMERCIAL';
  const commercialScope = formData.commercialScope;
  
  // Renovation mode detection
  const isRenovation = situation === 'RENOVATION';
  const renovationScope = formData.renovationScope;
  
  // Animated price state
  const [displayedTotal, setDisplayedTotal] = useState(0);
  const [showCommercialBreakdown, setShowCommercialBreakdown] = useState(false);
  const [showRenovationBreakdown, setShowRenovationBreakdown] = useState(false);
  
  // Commercial quote calculation
  const commercialQuote = useMemo(() => {
    if (!isCommercial) return null;
    
    const sqft = parseInt(commercialScope?.sqft || '0');
    if (sqft <= 0) return null;
    
    const isConstruction = commercialScope.projectType?.includes('post_construction');
    
    if (isConstruction) {
      return calculateConstructionQuote(commercialScope);
    } else {
      return calculateCommercialQuote(
        sqft,
        commercialScope.projectType as any,
        commercialScope.cleanPhase as any,
        commercialScope.frequency as any
      );
    }
  }, [isCommercial, commercialScope]);
  
  // Commercial addons total
  const commercialAddonsTotal = useMemo(() => {
    if (!isCommercial || !commercialScope?.selectedAddons) return 0;
    return calculateCommercialAddonsTotal(
      commercialScope.selectedAddons,
      commercialScope.projectType as any,
      parseInt(commercialScope.sqft || '0')
    );
  }, [isCommercial, commercialScope?.selectedAddons, commercialScope?.projectType, commercialScope?.sqft]);
  
  // Commercial final total
  const commercialFinalTotal = useMemo(() => {
    if (!commercialQuote) return 0;
    return commercialQuote.total + commercialAddonsTotal;
  }, [commercialQuote, commercialAddonsTotal]);
  
  // Renovation quote calculation
  const renovationQuote = useMemo((): RenovationQuote | null => {
    if (!isRenovation || !renovationScope) return null;
    if (!renovationScope.sqft || renovationScope.sqft <= 0) return null;
    return calculateRenovationQuote(renovationScope);
  }, [isRenovation, renovationScope]);
  
  // Hourly mode calculations
  const isHourlyMode = formData.isHourlyMode;
  const hourlyTotal = isHourlyMode ? calculateHourlyTotal() : 0;
  const hourlyRate = isHourlyMode ? getHourlyRate() : 0;
  const totalLaborHours = isHourlyMode 
    ? Math.max(formData.hourlyHours, HOURLY_CONFIG.MIN_CLOCK_HOURS) * HOURLY_CONFIG.TEAM_SIZE 
    : 0;
  
  // Get final total - use summary for standard residential, commercial/renovation keep their calcs
  const finalTotal = isCommercial
    ? commercialFinalTotal
    : isRenovation
      ? (renovationQuote?.total || 0)
      : summary.totals.grandTotal;
  
  // Get time metrics from summary for standard residential
  const summaryTimeMetrics = summary.timeMetrics;
  useEffect(() => {
    if (displayedTotal === finalTotal) return;
    
    const diff = finalTotal - displayedTotal;
    const step = Math.ceil(Math.abs(diff) / 10);
    const increment = diff > 0 ? step : -step;
    
    const timer = setInterval(() => {
      setDisplayedTotal(prev => {
        const next = prev + increment;
        if ((increment > 0 && next >= finalTotal) || (increment < 0 && next <= finalTotal)) {
          clearInterval(timer);
          return finalTotal;
        }
        return next;
      });
    }, 30);
    
    return () => clearInterval(timer);
  }, [finalTotal, displayedTotal]);
  
  // V2 Component-based pricing breakdown
  const pricingBreakdown = useMemo(() => {
    if (isHourlyMode) {
      return { homeBase: 0, bathroomTotal: 0, totalBaths: 0, livingAreasTotal: 0, verticalSurcharge: 0, verticalReason: '', patioTotal: 0, additionalStructuresTotal: 0, additionalStructuresBreakdown: [] as { label: string; count: number; price: number }[] };
    }
    
    const result = calculateComponentPrice({
      homeSize: formData.homeSize,
      masterBaths: formData.masterBaths,
      fullBaths: formData.fullBaths,
      halfBaths: formData.halfBaths,
      serviceType: formData.serviceType,
      conditionFee: formData.conditionFee,
      includeCabinets: false,
    });
    
    // SSOT: Use tier helper for bathroom pricing (Move-In/Out uses standard tier)
    const bathroomTier = getBathroomPricingTier(formData.baseServiceLevel, situation);
    const bathroomResult = calculateBathroomInventoryTotals(
      formData.bathroomInventory,
      formData.masterBaths,
      formData.fullBaths,
      formData.halfBaths,
      bathroomTier
    );
    
    // Calculate Functional Zones total
    const isDeep = formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out';
    const livingAreas = calculateLivingAreasTotal(
      formData.officeCount || 0,
      formData.laundryRoomCount || 0,
      formData.loftCount || 0,
      formData.garageCount || 0,
      isDeep
    );
    
    // Calculate Vertical Surcharge (both MOVING and LIVE_HERE modes)
    const vertical = calculateVerticalSurcharge({
      propertyType: formData.propertyType,
      houseLevels: formData.houseLevels || 1,
      apartmentFloor: formData.apartmentFloor || 1,
      hasElevator: formData.hasElevator !== false,
    });
    
    // Calculate Patio total (both MOVING and LIVE_HERE modes)
    const patio = calculatePatioTotal(
      formData.patioCount || 0,
      formData.patioScope || 'sweep'
    );
    
    // Calculate Additional Structures total (compound/estate properties) with detailed configs
    const additionalStructures = calculateAdditionalStructuresTotal({
      guestHouseCount: formData.guestHouseCount || 0,
      artStudioCount: formData.studioCount || 0,
      poolHouseCount: formData.poolHouseCount || 0,
      isDeepClean: isDeep,
      guestHouseConfigs: formData.guestHouseConfigs,
      artStudioConfigs: formData.artStudioConfigs,
    });
    
    return {
      homeBase: result.basePrice,
      bathroomTotal: Math.round(bathroomResult.totalPrice),
      totalBaths: formData.masterBaths + formData.fullBaths + formData.halfBaths,
      livingAreasTotal: livingAreas.price,
      verticalSurcharge: vertical.surcharge,
      verticalReason: vertical.reason,
      patioTotal: patio.price,
      additionalStructuresTotal: additionalStructures.total,
      additionalStructuresBreakdown: additionalStructures.breakdown,
      additionalStructuresTrashBags: additionalStructures.totalTrashBags,
      additionalStructuresDetachedCount: additionalStructures.detachedCount,
      additionalStructuresTransitMinutes: additionalStructures.transitBufferMinutes,
    };
  }, [formData.homeSize, formData.masterBaths, formData.fullBaths, formData.halfBaths, formData.serviceType, formData.conditionFee, formData.baseServiceLevel, formData.officeCount, formData.laundryRoomCount, formData.loftCount, formData.garageCount, isHourlyMode, situation, formData.propertyType, formData.houseLevels, formData.apartmentFloor, formData.hasElevator, formData.patioCount, formData.patioScope, formData.guestHouseCount, formData.studioCount, formData.poolHouseCount, formData.guestHouseConfigs, formData.artStudioConfigs, formData.bathroomInventory]);

  // Smart Visibility: Additional Structures only for compound-scale properties (2,000+ sqft AND 2+ bedrooms)
  const showStructuresInSidebar = useMemo(() => {
    const STRUCTURES_ELIGIBLE_SQFT = [
      'SF_2000_2500', 'SF_2500_3000', 'SF_3000_3500', 
      'SF_3500_4000', 'SF_4000_5000', 'SF_5000_7000', 'SF_7000+'
    ];
    
    const sqftEligible = STRUCTURES_ELIGIBLE_SQFT.includes(formData.squareFootageRange || '');
    const bedroomsEligible = (formData.homeSize || 0) >= 2;
    
    return sqftEligible && bedroomsEligible;
  }, [formData.squareFootageRange, formData.homeSize]);

  // Calculate addon labor minutes for accurate time display
  const addonLaborMinutes = useMemo(() => {
    let minutes = 0;
    
    // Room-based addons from formData.roomAddons
    const ra = formData.roomAddons;
    if (ra) {
      // Core spaces
      (['kitchen', 'living', 'dining', 'hallways'] as const).forEach(roomId => {
        (ra[roomId] || []).forEach(addon => {
          const time = ADDON_TIMES[addon.addonId] || 15; // Default 15 min
          minutes += time * addon.quantity;
        });
      });
      // Bedrooms
      Object.values(ra.bedrooms || {}).forEach(addons => {
        addons.forEach(addon => {
          const time = ADDON_TIMES[addon.addonId] || 15;
          minutes += time * addon.quantity;
        });
      });
    }
    
    // Micro-services
    selectedMicroServices.forEach(ms => {
      const service = microServices.find(s => s.id === ms.id);
      if (service) {
        const first = service.estimatedMinutesFirst || 0;
        const add = service.estimatedMinutesAdd || 0;
        minutes += first + (Math.max(0, ms.quantity - 1) * add);
      }
    });
    
    return minutes;
  }, [formData.roomAddons, selectedMicroServices]);

  // Check if any room addons are selected
  const hasRoomAddons = useMemo(() => {
    const ra = formData.roomAddons;
    if (!ra) return false;
    const coreCount = (['kitchen', 'living', 'dining', 'hallways'] as const)
      .reduce((sum, key) => sum + (ra[key]?.length || 0), 0);
    const bedroomCount = Object.values(ra.bedrooms || {})
      .reduce((sum, addons) => sum + addons.length, 0);
    return coreCount + bedroomCount > 0;
  }, [formData.roomAddons]);

  // Time estimate calculation with addon labor included
  const isDeep = formData.baseServiceLevel === 'Deep Clean' || 
                 formData.baseServiceLevel === 'Move-In/Out';

  // SSOT: Calculate stair hazard buffer from formData.stairs[] (multi-stair array)
  const stairHazardMinutes = useMemo(() => {
    const stairsArray = formData.stairs || [];
    if (stairsArray.length === 0) return 0;
    
    let totalMinutes = 0;
    stairsArray.forEach((stair) => {
      if (stair.cornerBuildup) totalMinutes += 12;
      if (stair.petHairAccumulation) totalMinutes += 10;
      if (stair.slipHazards) totalMinutes += 5;
      if (stair.railingsDetail) totalMinutes += 18;
    });
    return totalMinutes;
  }, [formData.stairs]);
  
  // Calculate hallway hazard buffer
  const hallwayHazardMinutes = useMemo(() => {
    if (!formData.hallwaysConfig?.enabled) return 0;
    return getHallwayHazardBuffer(formData.hallwaysConfig);
  }, [formData.hallwaysConfig]);
  
  // Calculate bedroom hazard buffer
  const bedroomHazardMinutes = useMemo(() => {
    if (!formData.bedroomHazards) return 0;
    return getBedroomHazardBuffer(formData.bedroomHazards);
  }, [formData.bedroomHazards]);
  
  // Calculate dining room hazard buffer
  const diningHazardMinutes = useMemo(() => {
    const messTypes = (formData.roomMessTypes as any)?.dining || [];
    const stickySpills = (formData.roomStickySpills as any)?.dining || false;
    return getDiningHazardBuffer(messTypes, stickySpills);
  }, [formData.roomMessTypes, formData.roomStickySpills]);
  
  // Calculate living room hazard buffer
  const livingHazardMinutes = useMemo(() => {
    const messTypes = (formData.roomMessTypes as any)?.living || [];
    const stickySpills = (formData.roomStickySpills as any)?.living || false;
    return getLivingHazardBuffer(messTypes, stickySpills);
  }, [formData.roomMessTypes, formData.roomStickySpills]);
  
  // Calculate total trash bags across all rooms (for Move-Out logistics)
  const totalTrashBags = useMemo(() => {
    let total = 0;
    // Core rooms
    if (formData.roomTrashBags) {
      total += formData.roomTrashBags.kitchen || 0;
      total += formData.roomTrashBags.living || 0;
      total += formData.roomTrashBags.dining || 0;
      total += formData.roomTrashBags.hallways || 0;
    }
    // Bedroom hazards
    if (formData.bedroomHazards) {
      Object.values(formData.bedroomHazards).forEach(h => {
        total += h.trashBags || 0;
      });
    }
    return total;
  }, [formData.roomTrashBags, formData.bedroomHazards]);
  
  // === BATHROOM LOGISTICS TIME (SSOT sync with summary/time.ts) ===
  const bathroomLogisticsMinutes = useMemo(() => {
    if (!formData.bathroomInventory?.bathrooms) return 0;
    return calculateTotalBathroomLogisticsTime(formData.bathroomInventory.bathrooms);
  }, [formData.bathroomInventory?.bathrooms]);

  const timeEstimate = useMemo(() => {
    if (isHourlyMode) return null;
    
    return calculateEstimatedTime({
      homeSize: formData.homeSize,
      masterBaths: formData.masterBaths,
      fullBaths: formData.fullBaths,
      halfBaths: formData.halfBaths,
      isDeep,
      officeCount: formData.officeCount || 0,
      laundryCount: formData.laundryRoomCount || 0,
      loftCount: formData.loftCount || 0,
      garageCount: formData.garageCount || 0,
      addonMinutes: addonLaborMinutes + stairHazardMinutes + hallwayHazardMinutes + bedroomHazardMinutes + diningHazardMinutes + livingHazardMinutes + bathroomLogisticsMinutes,
      stairsConfig: formData.stairsConfig,
    });
  }, [formData.homeSize, formData.masterBaths, formData.fullBaths, formData.halfBaths, isDeep, formData.officeCount, formData.laundryRoomCount, formData.loftCount, formData.garageCount, addonLaborMinutes, stairHazardMinutes, hallwayHazardMinutes, bedroomHazardMinutes, diningHazardMinutes, livingHazardMinutes, bathroomLogisticsMinutes, isHourlyMode, formData.stairsConfig]);

  // Context detection for psychology engine
  const timeContext = useMemo((): 'hourly' | 'moving' | 'living' => {
    if (isHourlyMode) return 'hourly';
    if (situation === 'MOVING' || formData.baseServiceLevel === 'Move-In/Out') return 'moving';
    return 'living';
  }, [isHourlyMode, situation, formData.baseServiceLevel]);

  // Time metrics calculation (Man-Hours value vs Clock-Hours logistics)
  const timeMetrics = useMemo(() => {
    // Hourly mode: clockHours × teamSize = manHours (value)
    if (isHourlyMode) {
      const clockHours = Math.max(formData.hourlyHours, HOURLY_CONFIG.MIN_CLOCK_HOURS);
      const teamSize = HOURLY_CONFIG.TEAM_SIZE;
      return {
        manHours: clockHours * teamSize,
        clockHours,
        teamSize,
      };
    }
    
    // Flat rate: calculate from estimated time
    // avgHours from calculateEstimatedTime already represents TOTAL MAN-HOURS
    if (!timeEstimate) return null;
    
    const avgHours = (timeEstimate.min + timeEstimate.max) / 2;
    // Smart team sizing: 2 for deep/moving/large jobs, otherwise 1
    const teamSize = (isDeep || avgHours > 3) ? 2 : 1;
    
    return {
      // Man-Hours = total human labor (value for customer's "Time Back")
      manHours: avgHours,
      // Clock-Hours = actual on-site time (avgHours ÷ team size)
      clockHours: avgHours / teamSize,
      teamSize,
    };
  }, [isHourlyMode, formData.hourlyHours, timeEstimate, isDeep]);

  // Visual context styling for psychology engine
  const timeVisuals = useMemo(() => {
    switch (timeContext) {
      case 'moving':
        return {
          title: t(language, 'time.title_moving'),
          subtitle: t(language, 'time.subtitle_moving'),
          Icon: Truck,
          bgClass: "bg-blue-50/60 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-800",
          iconClass: "text-blue-600 dark:text-blue-400",
          titleClass: "text-blue-600 dark:text-blue-400",
        };
      case 'hourly':
        return {
          title: t(language, 'time.title_hourly'),
          subtitle: t(language, 'time.subtitle_hourly'),
          Icon: Zap,
          bgClass: "bg-amber-50/60 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800",
          iconClass: "text-amber-600 dark:text-amber-400",
          titleClass: "text-amber-600 dark:text-amber-400",
        };
      default: // living
        return {
          title: t(language, 'time.title_living'),
          subtitle: t(language, 'time.subtitle_living'),
          Icon: Sparkles,
          bgClass: "bg-emerald-50/60 border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100 dark:border-emerald-800",
          iconClass: "text-emerald-600 dark:text-emerald-400",
          titleClass: "text-emerald-600 dark:text-emerald-400",
        };
    }
  }, [timeContext, language]);
  
  // SSOT: Use centralized normalizer for UI ↔ PDF parity
  const getSquareFootageLabel = () => {
    if (!formData.squareFootageRange) return 'Home Base';
    return formatSquareFootageLabel(formData.squareFootageRange, language as Language);
  };
  
  // Calculate add-ons total (using room-based addons)
  const addonsTotal = isHourlyMode ? 0 : getRoomAddonsTotal().total;
  
  // Calculate condition fee from SSOT (summary.totals)
  const conditionFee = isHourlyMode ? 0 : (summary.totals?.conditionFee || 0);
  const conditionFeeBreakdown = summary.totals?.conditionFeeBreakdown || null;
  const conditionFeeCapApplied = summary.totals?.conditionFeeCapApplied || false;
  const conditionFeeFloorApplied = summary.totals?.conditionFeeFloorApplied || false;
  
  // Check if recurring service for savings badge
  const isRecurring = isRecurringService();
  
  // Get service display name
  const getServiceName = () => {
    if (isHourlyMode) {
      return t(language, 'hourly.session_label');
    }
    const level = formData.baseServiceLevel || formData.serviceType;
    const isRecurringType = ['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType);
    
    if (isRecurringType) {
      const freqLabel = formData.serviceType === 'Weekly Price' ? 'Weekly' :
                       formData.serviceType === 'Bi-Weekly Price' ? 'Bi-Weekly' : 'Monthly';
      return `${level} (${freqLabel})`;
    }
    return level;
  };

  // Calculate recurring savings estimate (comparing to one-time deep clean)
  const getSavingsEstimate = () => {
    if (!isRecurring || isHourlyMode) return null;
    const oneTimeDeepPrice = pricingData[formData.homeSize]?.[1] || 0;
    const recurringPrice = pricingBreakdown.homeBase + pricingBreakdown.bathroomTotal;
    if (oneTimeDeepPrice > recurringPrice) {
      return Math.round(oneTimeDeepPrice - recurringPrice);
    }
    return null;
  };

  const savings = getSavingsEstimate();

  // Get frequency discount info for display
  const getFrequencyDiscountInfo = () => {
    if (!isRecurring || isHourlyMode) return null;
    
    const serviceType = formData.serviceType;
    let discountLabel = '';
    let discountPercent = 0;
    
    if (serviceType === 'Weekly Price') {
      discountPercent = Math.round((1 - FREQUENCY_MULTIPLIERS.weekly) * 100);
      discountLabel = 'Weekly';
    } else if (serviceType === 'Bi-Weekly Price') {
      discountPercent = Math.round((1 - FREQUENCY_MULTIPLIERS.biweekly) * 100);
      discountLabel = 'Bi-Weekly';
    } else if (serviceType === 'Monthly Price') {
      discountPercent = Math.round((1 - FREQUENCY_MULTIPLIERS.monthly) * 100);
      discountLabel = 'Monthly';
    }
    
    if (discountPercent > 0) {
      return { label: discountLabel, percent: discountPercent };
    }
    return null;
  };

  const frequencyDiscount = getFrequencyDiscountInfo();

  // Get first visit and future visits prices for recurring services
  const firstVisitPrice = isRecurring ? getFirstVisitPrice() : null;
  const futureVisitsPrice = isRecurring ? getFutureVisitsPrice() : null;

  // Check if essential data is filled based on current mode
  const hasEssentialData = useMemo(() => {
    // Commercial mode: check if sqft is provided
    if (isCommercial) {
      const sqft = parseInt(commercialScope?.sqft || '0');
      return sqft > 0;
    }
    
    // Renovation mode: check if sqft is provided
    if (isRenovation) {
      return renovationScope?.sqft > 0;
    }
    
    // Hourly mode: Always show pricing (has sensible defaults)
    if (isHourlyMode) {
      return formData.hourlyHours > 0;
    }
    
    // Custom/By Area mode: Check if at least one zone is selected
    if (mode === 'custom') {
      return customZones.bathroom || customZones.kitchen || 
             customZones.living || customZones.bedroom;
    }
    
    // Full Home mode: Check serviceType and homeSize (squareFootageRange optional)
    return formData.serviceType !== '' && formData.homeSize !== undefined;
  }, [
    isCommercial,
    commercialScope?.sqft,
    isRenovation,
    renovationScope?.sqft,
    isHourlyMode, 
    mode, 
    customZones.bathroom,
    customZones.kitchen,
    customZones.living,
    customZones.bedroom,
    formData.serviceType, 
    formData.homeSize, 
    formData.hourlyHours
  ]);

  // Get pending message based on mode
  const pendingMessage = useMemo(() => {
    if (isCommercial) {
      return t(language, 'commercial.pending_message') || 'Enter project details to see your personalized quote';
    }
    if (isRenovation) {
      return t(language, 'reno.pending_message') || 'Enter project details to see your remediation quote';
    }
    if (mode === 'custom') {
      return t(language, 'live_price.pending_message_area');
    }
    return t(language, 'live_price.pending_message');
  }, [isCommercial, isRenovation, mode, language]);

  // Detect Step 0 (Industry Selection) - no industry selected yet
  const isIndustryStep = currentStep === 0 && !industry;

  // STEP 0: Industry Selection - Special Empty State
  if (isIndustryStep) {
    return (
      <div className="w-full max-w-[300px] lg:max-w-none pointer-events-auto">
        <div className="bg-card border rounded-xl border-border/50 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-3.5 border-b border-dashed border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-sm lg:text-base font-semibold text-foreground">
                {t(language, 'industry_empty.title')}
              </span>
            </div>
          </div>
          
          {/* Step 0 Body - Industry hints */}
          <div className="px-4 lg:px-5 py-5 lg:py-6 text-center space-y-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Layers className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
            </div>
            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
              {t(language, 'industry_empty.message')}
            </p>
            
            {/* Industry preview badges */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/60 text-[11px] text-muted-foreground">
                <Home className="w-3 h-3" />
                <span>{t(language, 'industry_empty.home')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/60 text-[11px] text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span>{t(language, 'industry_empty.commercial')}</span>
              </div>
            </div>
          </div>
          
          {/* Value Slider */}
          <ValueSlider language={language} industry={industry} situation={situation} />
          
          {/* Trust Footer */}
          <div className="px-4 lg:px-5 py-2.5 lg:py-3 bg-muted/30 border-t border-border/40 flex items-center justify-center gap-4 text-[11px] lg:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span>Licensed</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Insured</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Clean pending state when no selections made (after Step 0)
  if (!hasEssentialData) {
    return (
      <div className="w-full max-w-[300px] lg:max-w-none pointer-events-auto">
        <div className="bg-card border rounded-xl border-border/50 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-3.5 border-b border-dashed border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              {isRenovation ? (
                <HardHat className="w-4 h-4 text-amber-600" />
              ) : isCommercial ? (
                <Building2 className="w-4 h-4 text-primary" />
              ) : (
                <Sparkles className="w-4 h-4 text-primary" />
              )}
              <span className="text-sm lg:text-base font-semibold text-foreground">
                {isRenovation
                  ? (t(language, 'reno.sidebar_title') || 'Renovation Quote')
                  : isCommercial 
                    ? (t(language, 'commercial.sidebar_title') || 'Commercial Quote')
                    : t(language, 'live_price.title')}
              </span>
            </div>
          </div>
          
          {/* Empty State Body */}
          <div className="px-4 lg:px-5 py-6 lg:py-7 text-center space-y-3 lg:space-y-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              {isRenovation ? (
                <Wrench className="w-6 h-6 lg:w-7 lg:h-7 text-muted-foreground/50" />
              ) : isCommercial ? (
                <Building2 className="w-6 h-6 lg:w-7 lg:h-7 text-muted-foreground/50" />
              ) : (
                <Home className="w-6 h-6 lg:w-7 lg:h-7 text-muted-foreground/50" />
              )}
            </div>
            <p className="text-sm lg:text-base text-muted-foreground">
              {pendingMessage}
            </p>
          </div>
          
          {/* Value Slider */}
          <ValueSlider language={language} industry={industry} situation={situation} />
          
          {/* Trust Footer - Always visible */}
          <div className="px-4 lg:px-5 py-2.5 lg:py-3 bg-muted/30 border-t border-border/40 flex items-center justify-center gap-4 text-[11px] lg:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span>Licensed</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{isCommercial ? 'Bonded' : 'Insured'}</span>
            </div>
            {isCommercial && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Insured</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // COMMERCIAL MODE RENDER
  if (isCommercial && commercialQuote) {
    const isConstruction = commercialScope.projectType?.includes('post_construction');
    const sqft = parseInt(commercialScope?.sqft || '0');
    const frictionApplied = (commercialQuote as any).frictionApplied;
    const complexity = isConstruction && frictionApplied ? getComplexityLevel(frictionApplied) : null;
    
    return (
      <div className="w-full max-w-[300px] lg:max-w-none pointer-events-auto">
        <div className="bg-card border rounded-xl border-border/50 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-3.5 border-b border-dashed border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              {isConstruction ? (
                <HardHat className="w-4 h-4 text-amber-600" />
              ) : (
                <Building2 className="w-4 h-4 text-primary" />
              )}
              <span className="text-sm lg:text-base font-semibold text-foreground">
                {t(language, 'commercial.sidebar_title') || 'Commercial Quote'}
              </span>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="px-4 lg:px-5 py-3 lg:py-4 space-y-2">
            {/* Project Type */}
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {t(language, 'commercial.project_type_label') || 'Project Type'}
                </span>
                <span className="font-medium text-foreground text-xs">
                  {getProjectTypeLabel(commercialScope.projectType as any)}
                </span>
              </div>
              
              {/* Clean Phase (for construction) */}
              {isConstruction && commercialScope.cleanPhase && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5" />
                    {t(language, 'commercial.phase') || 'Phase'}
                  </span>
                  <span className="font-medium text-foreground text-xs">
                    {getCleanPhaseLabel(commercialScope.cleanPhase as any)}
                  </span>
                </div>
              )}
              
              {/* Square Footage */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5" />
                  {t(language, 'commercial.sqft_label') || 'Square Footage'}
                </span>
                <span className="font-medium font-mono">{formatSqft(sqft)}</span>
              </div>
              
              {/* Duration */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {t(language, 'commercial.duration_label') || 'Est. Duration'}
                </span>
                <span className="font-medium font-mono">{commercialQuote.estimatedHours} hrs</span>
              </div>
              
              {/* Team Size */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {t(language, 'commercial.team_label') || 'Team Size'}
                </span>
                <span className="font-medium font-mono">{commercialQuote.teamSize} specialists</span>
              </div>
            </div>

            {/* Complexity Badge (for construction) */}
            {isConstruction && complexity && (
              <div className="flex items-center justify-center gap-2 py-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                  complexity === 'low' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
                  complexity === 'medium' && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                  complexity === 'high' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                )}>
                  <AlertTriangle className="w-3 h-3" />
                  {complexity === 'low' ? 'Standard' : complexity === 'medium' ? 'Elevated' : 'High Friction'}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(commercialQuote as any).frictionIndex?.toFixed(2)}x
                </span>
              </div>
            )}

            {/* Breakdown Toggle */}
            <button
              type="button"
              onClick={() => setShowCommercialBreakdown(!showCommercialBreakdown)}
              className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                💵 {t(language, 'commercial.view_breakdown') || 'View Breakdown'}
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showCommercialBreakdown && "rotate-180"
              )} />
            </button>
            
            {/* Collapsible Breakdown */}
            {showCommercialBreakdown && (
              <div className="border-t border-dashed border-border/50 pt-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t(language, 'commercial.base_quote') || 'Base Quote'}</span>
                  <span className="font-mono">${commercialQuote.total}</span>
                </div>
                
                {commercialAddonsTotal > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{t(language, 'commercial.addons_total') || 'Add-ons'}</span>
                    <span className="font-mono text-amber-600">+${commercialAddonsTotal}</span>
                  </div>
                )}
                
                {isConstruction && (commercialQuote as any).frictionIndex > 1 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{t(language, 'commercial.friction_applied') || 'Friction Applied'}</span>
                    <span className="font-mono">{((commercialQuote as any).frictionIndex).toFixed(2)}x</span>
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-dashed border-border/60 my-2" />

            {/* Total */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-foreground">
                {t(language, 'commercial.total_label') || 'Estimated Total'}
              </span>
              <span className="text-xl font-black font-mono text-primary tracking-tight transition-all duration-200">
                ${displayedTotal.toLocaleString()}
              </span>
            </div>

            {/* Method Badge */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                {commercialQuote.method}
              </span>
            </div>
          </div>

          {/* Value Slider */}
          <ValueSlider language={language} industry={industry} situation={situation} />

          {/* Trust Footer */}
          <div className="px-4 lg:px-5 py-2.5 lg:py-3 bg-muted/30 border-t border-border/40 flex items-center justify-center gap-4 text-[11px] lg:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span>Licensed</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Bonded</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Insured</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENOVATION MODE RENDER
  if (isRenovation && renovationQuote) {
    const isFinalPhase = renovationScope?.phase === 'final_punch_list';
    
    return (
      <div className="w-full max-w-[300px] lg:max-w-none pointer-events-auto">
        <div className="bg-card border rounded-xl border-border/50 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-3.5 border-b border-dashed border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <Wrench className={cn("w-4 h-4", isFinalPhase ? "text-blue-600" : "text-amber-600")} />
              <span className="text-sm lg:text-base font-semibold text-foreground">
                {t(language, 'reno.sidebar_title') || 'Renovation Quote'}
              </span>
            </div>
            {/* Phase Badge */}
            <span className={cn(
              "text-[10px] lg:text-xs px-2 py-0.5 rounded-full font-medium",
              isFinalPhase 
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            )}>
              {getPhaseLabel(renovationScope?.phase || 'final_punch_list')}
            </span>
          </div>

          {/* Receipt Body */}
          <div className="px-4 lg:px-5 py-3 lg:py-4 space-y-2">
            {/* Project Specs */}
            <div className="space-y-1.5 text-sm">
              {/* Square Footage */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5" />
                  {t(language, 'reno.sqft_label') || 'Renovated Area'}
                </span>
                <span className="font-medium font-mono">{renovationScope?.sqft?.toLocaleString()} sq ft</span>
              </div>
              
              {/* Duration */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {t(language, 'reno.duration_label') || 'Est. Duration'}
                </span>
                <span className="font-medium font-mono">{renovationQuote.hours} hrs</span>
              </div>
              
              {/* Team Size */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {t(language, 'reno.team_label') || 'Team Size'}
                </span>
                <span className="font-medium font-mono">{renovationQuote.teamSize} specialists</span>
              </div>
            </div>

            {/* Property Composition Badges */}
            {(() => {
              const totalBaths = (renovationScope?.bathrooms?.master || 0) + (renovationScope?.bathrooms?.full || 0) + (renovationScope?.bathrooms?.half || 0);
              const hasPropInfo = (renovationScope?.bedrooms || 0) > 0 || totalBaths > 0 || renovationScope?.hasNewKitchen;
              
              return hasPropInfo && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 py-2 border-b border-border/50">
                  {(renovationScope?.bedrooms || 0) > 0 && (
                    <span className="px-2 py-0.5 bg-muted rounded-full text-[10px] font-medium text-muted-foreground">
                      {renovationScope?.bedrooms} Bed
                    </span>
                  )}
                  {totalBaths > 0 && (
                    <span className="px-2 py-0.5 bg-muted rounded-full text-[10px] font-medium text-muted-foreground">
                      {totalBaths} Bath
                    </span>
                  )}
                  {renovationScope?.hasNewKitchen && (
                    <span className="px-2 py-0.5 bg-primary/10 rounded-full text-[10px] font-medium text-primary">
                      New Kitchen
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Condition Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 py-2">
              {renovationScope?.occupancy === 'furnished_lived_in' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Furnished +50%
                </span>
              )}
              {renovationScope?.debrisLevel !== 'broom_swept' && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                  renovationScope?.debrisLevel === 'heavy_haul'
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                )}>
                  {getDebrisLabel(renovationScope?.debrisLevel || 'broom_swept')}
                </span>
              )}
              {renovationScope?.surfaceRisk === 'delicate_stone_wood' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  <Gem className="w-2.5 h-2.5" /> Premium Care
                </span>
              )}
            </div>

            {/* Breakdown Toggle */}
            <button
              type="button"
              onClick={() => setShowRenovationBreakdown(!showRenovationBreakdown)}
              className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                💵 {t(language, 'reno.view_breakdown') || 'View Breakdown'}
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showRenovationBreakdown && "rotate-180"
              )} />
            </button>
            
            {/* Collapsible Breakdown */}
            {showRenovationBreakdown && (
              <div className="border-t border-dashed border-border/50 pt-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Labor Base ({renovationScope?.sqft} × ${renovationQuote.rateApplied.toFixed(2)})</span>
                  <span className="font-mono">${renovationQuote.breakdown.laborBase}</span>
                </div>
                
                
                {renovationQuote.breakdown.windowStickers > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Window Stickers ({renovationScope?.windowCount})</span>
                    <span className="font-mono text-amber-600">+${renovationQuote.breakdown.windowStickers}</span>
                  </div>
                )}
                
                {renovationQuote.breakdown.hvacFilters > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>HVAC Filters</span>
                    <span className="font-mono text-amber-600">+${renovationQuote.breakdown.hvacFilters}</span>
                  </div>
                )}
                
                {renovationQuote.breakdown.baggingFee > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Haul-Away Fee</span>
                    <span className="font-mono text-amber-600">+${renovationQuote.breakdown.baggingFee}</span>
                  </div>
                )}
                
                {/* Premium Add-on Categories */}
                {renovationQuote.breakdown.surfaceRestoration > 0 && (
                  <div className="flex items-center justify-between text-blue-600">
                    <span>Surface Restoration</span>
                    <span className="font-mono">+${renovationQuote.breakdown.surfaceRestoration}</span>
                  </div>
                )}
                
                {renovationQuote.breakdown.hiddenDust > 0 && (
                  <div className="flex items-center justify-between text-amber-600">
                    <span>Hidden Dust Services</span>
                    <span className="font-mono">+${renovationQuote.breakdown.hiddenDust}</span>
                  </div>
                )}
                
                {renovationQuote.breakdown.heightAccess > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span>Height Access (+OSHA)</span>
                    <span className="font-mono">+${renovationQuote.breakdown.heightAccess}</span>
                  </div>
                )}
                
                {renovationQuote.breakdown.exterior > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Exterior & Waste</span>
                    <span className="font-mono">+${renovationQuote.breakdown.exterior}</span>
                  </div>
                )}
                
                {/* NEW Breakdown Categories */}
                {renovationQuote.breakdown.dustSettlement > 0 && (
                  <div className="flex items-center justify-between text-amber-600">
                    <span>Sparkle Clean (Return)</span>
                    <span className="font-mono">+${renovationQuote.breakdown.dustSettlement}</span>
                  </div>
                )}
                
                {renovationQuote.breakdown.airQuality > 0 && (
                  <div className="flex items-center justify-between text-cyan-600">
                    <span>Air Quality Services</span>
                    <span className="font-mono">+${renovationQuote.breakdown.airQuality}</span>
                  </div>
                )}
                
                {renovationQuote.breakdown.upholstery > 0 && (
                  <div className="flex items-center justify-between text-purple-600">
                    <span>Upholstery Extraction</span>
                    <span className="font-mono">+${renovationQuote.breakdown.upholstery}</span>
                  </div>
                )}
                
                {renovationQuote.breakdown.exteriorGlass > 0 && (
                  <div className="flex items-center justify-between text-sky-600">
                    <span>Exterior Glass</span>
                    <span className="font-mono">+${renovationQuote.breakdown.exteriorGlass}</span>
                  </div>
                )}
                
                {renovationQuote.minimumApplied && (
                  <div className="flex items-center justify-between text-amber-600">
                    <span>Minimum Applied</span>
                    <span className="font-mono">$350</span>
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-dashed border-border/60 my-2" />

            {/* Total */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-foreground">
                {t(language, 'reno.total_label') || 'Estimated Total'}
              </span>
              <span className="text-xl font-black font-mono text-primary tracking-tight transition-all duration-200">
                ${displayedTotal.toLocaleString()}
              </span>
            </div>

            {/* Contractor Status */}
            {!renovationScope?.contractorsFinished && (
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  Contractors Active - Standby Mode
                </span>
              </div>
            )}
          </div>

          {/* Value Slider */}
          <ValueSlider language={language} industry={industry} situation={situation} />

          {/* Trust Footer */}
          <div className="px-4 lg:px-5 py-2.5 lg:py-3 bg-muted/30 border-t border-border/40 flex items-center justify-center gap-4 text-[11px] lg:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span>Licensed</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Bonded</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Insured</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[300px] lg:max-w-none pointer-events-auto">
      <div className={cn(
        "bg-card border rounded-xl transition-all duration-300",
        "border-border/50 shadow-lg",
        "overflow-hidden"
      )}>
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-3.5 border-b border-dashed border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            {isHourlyMode ? (
              <Clock className="w-4 h-4 text-primary" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
            <span className="text-sm lg:text-base font-semibold text-foreground">
              {isHourlyMode 
                ? t(language, 'live_price.priority_rate')
                : t(language, 'live_price.title')
              }
            </span>
          </div>
        </div>

        {/* Receipt Body - Compact */}
        <div className="px-4 lg:px-5 py-3 lg:py-4 space-y-2 lg:space-y-3">
          {/* Hourly Mode Display - Enhanced with South Coast Context */}
          {isHourlyMode ? (
            <div className="space-y-1.5 text-sm">
              {/* Team Configuration */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {t(language, 'hourly.team')}
                </span>
                <span className="font-medium font-mono">{formData.hourlyTeamSize || 2} cleaners</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {t(language, 'hourly.duration')}
                </span>
                <span className="font-medium font-mono">{formData.hourlyHours} hrs</span>
              </div>
              <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                <span>Labor hours</span>
                <span className="font-mono">{(formData.hourlyTeamSize || 2) * formData.hourlyHours} hrs</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">{t(language, 'hourly.rate_applied')}</span>
                <span className="font-medium font-mono">${hourlyRate}/hr</span>
              </div>
              
              {/* South Coast Context Badges */}
              {(formData.accessType && formData.accessType !== 'standard') && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-amber-600 dark:text-amber-400 text-xs">Access</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                    {formData.accessType === 'hillside' ? 'Hillside' : 'Gated Estate'}
                  </span>
                </div>
              )}
              
              {/* Condition Efficiency */}
              {formData.homeConditionLevel && formData.homeConditionLevel !== 'tidy' && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground text-xs">Condition</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                    formData.homeConditionLevel === 'cluttered' || formData.homeConditionLevel === 'deep_recovery'
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  )}>
                    {formData.homeConditionLevel === 'deep_recovery' ? 'Deep Recovery' : 
                     formData.homeConditionLevel === 'cluttered' ? 'Cluttered' : 'Lived-In'}
                  </span>
                </div>
              )}
              
              {/* Must-Haves Count */}
              {(formData.hourlyMustHaves?.length || 0) > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs">Priorities</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                    {formData.hourlyMustHaves?.length} Must-Haves
                  </span>
                </div>
              )}
              
              {/* Overtime Protocol Badge */}
              {formData.overtimeProtocol && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground text-xs">Protocol</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                    formData.overtimeProtocol === 'strict'
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  )}>
                    {formData.overtimeProtocol === 'strict' ? '⏱ Hard Stop' : '✓ Flexible'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Standard Mode - V2 Component Breakdown */}
              <div className="space-y-1.5 text-sm">
                {/* Service Level */}
                {formData.baseServiceLevel && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      {t(language, 'live_price.service_level')}
                    </span>
                    <span className="font-medium text-foreground">{formData.baseServiceLevel}</span>
                  </div>
                )}
                
                {/* Move Occupancy Badge - Only visible for Move-In/Out */}
                {(situation === 'MOVING' || formData.baseServiceLevel === 'Move-In/Out') && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5" />
                      {t(language, 'move.occupancy_title')}
                    </span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      formData.moveOccupancy === 'furnished'
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    )}>
                      {formData.moveOccupancy === 'furnished' 
                        ? `${t(language, 'move.occupancy_furnished')} +25%`
                        : t(language, 'move.occupancy_vacant')
                      }
                    </span>
                  </div>
                )}
                {/* Number of Bedrooms */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" />
                    {formData.homeSize === 0 
                      ? t(language, 'live_price.studio') 
                      : `${formData.homeSize} ${t(language, formData.homeSize > 1 ? 'live_price.bedrooms' : 'live_price.bedroom')}`}
                  </span>
                  <span className="text-xs text-muted-foreground/70">{t(language, 'live_price.included')}</span>
                </div>
                {/* Home Base (Sq Ft Range) */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5" />
                    {getSquareFootageLabel()}
                  </span>
                  <span className="font-medium font-mono">${pricingBreakdown.homeBase}</span>
                </div>
                
                {/* Bathrooms Breakdown */}
                {pricingBreakdown.bathroomTotal > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Bath className="w-3.5 h-3.5" />
                      {t(language, 'live_price.bathrooms_breakdown', { 
                        master: String(formData.masterBaths), 
                        full: String(formData.fullBaths), 
                        half: String(formData.halfBaths) 
                      })}
                    </span>
                    <span className="font-medium font-mono">+${pricingBreakdown.bathroomTotal}</span>
                  </div>
                )}
                
                {/* Functional Zones Breakdown - Show specific zones */}
                {pricingBreakdown.livingAreasTotal > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {[
                          formData.officeCount > 0 && `${formData.officeCount}× Office`,
                          formData.laundryRoomCount > 0 && `${formData.laundryRoomCount}× Laundry`,
                          formData.loftCount > 0 && `${formData.loftCount}× Loft`,
                          formData.garageCount > 0 && `${formData.garageCount}× Garage`,
                        ].filter(Boolean).join(', ')}
                      </span>
                    </span>
                    <span className="font-medium font-mono">+${pricingBreakdown.livingAreasTotal}</span>
                  </div>
                )}
                
                {/* Vertical Surcharge (MOVING mode) */}
                {pricingBreakdown.verticalSurcharge > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span className="truncate text-xs">{pricingBreakdown.verticalReason}</span>
                    </span>
                    <span className="font-medium font-mono text-amber-600 dark:text-amber-400">+${pricingBreakdown.verticalSurcharge}</span>
                  </div>
                )}
                
                {/* Patio Scrub (MOVING mode) */}
                {pricingBreakdown.patioTotal > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5" />
                      <span className="truncate">Patio Scrub</span>
                    </span>
                    <span className="font-medium font-mono">+${pricingBreakdown.patioTotal}</span>
                  </div>
                )}
                
                {/* Additional Structures (Compound/Estate Properties) - Smart Visibility */}
                {showStructuresInSidebar && pricingBreakdown.additionalStructuresTotal > 0 && (
                  <div className="pt-2 border-t border-dashed border-amber-200/50 dark:border-amber-700/50 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-amber-500" />
                      <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Additional Structures
                      </p>
                    </div>
                    
                    {pricingBreakdown.additionalStructuresBreakdown.map((structure: StructureBreakdownItem, idx: number) => (
                      <div key={idx} className="bg-amber-50/30 dark:bg-amber-900/10 rounded-lg p-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">
                            {structure.label}
                          </span>
                          <span className="font-bold font-mono text-amber-600 dark:text-amber-400">+${structure.price}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          └── {structure.configSummary}
                        </div>
                        {structure.isDetached && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400">
                            └── ⚠️ Detached (+10min transit)
                          </div>
                        )}
                        {(structure.trashBags > 0 || structure.stickySpills) && (
                          <div className="text-[10px] text-orange-600 dark:text-orange-400">
                            └── 🗑️ {structure.trashBags > 0 ? `${structure.trashBags} bag(s)` : ''}{structure.stickySpills ? ', Sticky spills' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Structures Total */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/30 dark:border-amber-700/30">
                      <span className="text-muted-foreground">Structures Total</span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400">+${pricingBreakdown.additionalStructuresTotal}</span>
                    </div>
                  </div>
                )}
                
                {/* Room-Based Windows & Blinds (LIVE_HERE/MOVING flows) */}
                {(() => {
                  const roomWindowTotals = calculateRoomWindowTotal(formData.roomWindowSelections || []);
                  return roomWindowTotals.totalPrice > 0 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="truncate text-xs">
                          Windows ({roomWindowTotals.totalWindowsInside + roomWindowTotals.totalWindowsOutside})
                          {roomWindowTotals.totalBlinds > 0 && ` + ${roomWindowTotals.totalBlinds} Blinds`}
                        </span>
                      </span>
                      <span className="font-medium font-mono text-blue-600 dark:text-blue-400">+${roomWindowTotals.totalPrice}</span>
                    </div>
                  );
                })()}
                
                {/* Home Entry Summary (logistics info - no pricing) */}
                {formData.homeEntry && (
                  formData.homeEntry.arrivalInstructions || 
                  formData.homeEntry.parkingNotes || 
                  formData.homeEntry.entryPathType
                ) && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5" />
                      <span className="truncate text-xs">
                        {formData.homeEntry.entryPathType && (
                          t(language, `homeEntry.sfh.entryPath.${formData.homeEntry.entryPathType.toLowerCase()}`)
                        )}
                        {/* Instructions check removed per Strategy A - structured mapping only */}
                      </span>
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {t(language, 'homeEntry.configured')}
                    </span>
                  </div>
                )}
                
              {/* Condition Fee with optional breakdown */}
                {conditionFee > 0 && (
                  <div className="py-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t(language, 'live_price.condition_fee')}</span>
                      <span className="font-mono">+${conditionFee}</span>
                    </div>
                    {/* Area-specific breakdown bullets */}
                    {conditionFeeBreakdown && conditionFeeBreakdown.length > 0 && (
                      <div className="pl-4 mt-1 space-y-0.5">
                        {conditionFeeBreakdown.map(item => (
                          <div key={item.roomId} className="flex justify-between text-xs text-muted-foreground">
                            <span>• {item.displayName}</span>
                            <span className="font-mono">+${item.fee}</span>
                          </div>
                        ))}
                        {conditionFeeCapApplied && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Cap applied</span>
                        )}
                        {conditionFeeFloorApplied && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Min applied</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Frequency Schedule Display */}
                {frequencyDiscount && (
                  <div className="flex items-center justify-between py-1 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {frequencyDiscount.label} Schedule
                    </span>
                    <span className="font-medium text-foreground">Active</span>
                  </div>
                )}
              </div>

              {/* Room-based Add-ons Section */}
              {hasRoomAddons && (
                <div className="pt-2 border-t border-dashed border-border/50 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Add-ons by Room
                  </p>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto text-sm">
                    {/* Core rooms: kitchen, living, dining, hallways */}
                    {(['kitchen', 'living', 'dining', 'hallways'] as const).map(roomId => {
                      const roomAddons = formData.roomAddons?.[roomId] || [];
                      if (roomAddons.length === 0) return null;
                      
                      const roomLabel = roomId === 'kitchen' ? 'Kitchen' 
                        : roomId === 'living' ? 'Living' 
                        : roomId === 'dining' ? 'Dining' 
                        : 'Hallways';
                      
                      return roomAddons.map(addon => {
                        // SSOT: Use dynamic pricing for kitchen addons
                        let price = addonPrices[addon.addonId] || 0;
                        let labelKey: string | null = null;  // SSOT: Will hold translation key from pricing
                        
                        if (roomId === 'kitchen') {
                          const dynamicPricing = getKitchenAddonPricing(
                            addon.addonId,
                            formData.homeSize || 2,
                            formData.propertyType,
                            formData.squareFootageRange,
                            ((formData as any).kitchenCabinetOverride || 'typical') as CabinetSizeOverride,
                            ((formData as any).kitchenDegreaseLevel) as DegreaseLevel | undefined
                          );
                          if (dynamicPricing) {
                            price = dynamicPricing.price;
                            labelKey = dynamicPricing.labelKey;  // SSOT: Use labelKey from pricing engine
                          }
                        }
                        const totalPrice = price * addon.quantity;
                        
                        return (
                          <div key={`${roomId}-${addon.addonId}`} className="flex items-center justify-between group">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleRoomAddon(roomId, addon.addonId)}
                                className="w-4 h-4 bg-destructive/10 hover:bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                              >
                                <X className="w-2.5 h-2.5 text-destructive" />
                              </button>
                              <span className="text-muted-foreground truncate text-xs">
                                <span className="text-foreground/70">{roomLabel}:</span>{' '}
                                {addon.quantity > 1 && `${addon.quantity}× `}
                                {/* SSOT: Use labelKey from dynamicPricing when available (kitchen), else fallback */}
                                {/* SSOT: Use labelKey from dynamicPricing when available (kitchen), else fallback */}
                                {labelKey ? t(language, labelKey) : (t(language, `addon.${addon.addonId}`) || addon.addonId)}
                              </span>
                            </div>
                            <span className="font-mono text-xs">+${totalPrice}</span>
                          </div>
                        );
                      });
                    })}
                    
                    {/* Bedroom addons */}
                    {Object.entries(formData.roomAddons?.bedrooms || {}).map(([bedroomId, addons]) => {
                      if (!addons || addons.length === 0) return null;
                      
                      const bedNum = parseInt(bedroomId.replace('bed_', '')) + 1;
                      const bedLabel = bedNum === 1 ? 'Master' : `Bed ${bedNum}`;
                      
                      return addons.map(addon => {
                        const price = addonPrices[addon.addonId] || 0;
                        const totalPrice = price * addon.quantity;
                        
                        return (
                          <div key={`${bedroomId}-${addon.addonId}`} className="flex items-center justify-between group">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleRoomAddon(bedroomId, addon.addonId)}
                                className="w-4 h-4 bg-destructive/10 hover:bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                              >
                                <X className="w-2.5 h-2.5 text-destructive" />
                              </button>
                              <span className="text-muted-foreground truncate text-xs">
                                <span className="text-foreground/70">{bedLabel}:</span>{' '}
                                {addon.quantity > 1 && `${addon.quantity}× `}
                                {t(language, `addon.${addon.addonId}`) || addon.addonId}
                              </span>
                            </div>
                            <span className="font-mono text-xs">+${totalPrice}</span>
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              )}

              {/* === CONTRACT-DRIVEN DETAILED HOME MAPPING === */}
              {USE_CONTRACT_SIDEBAR && (situation === 'LIVE_HERE' || situation === 'MOVING') && (
                <SidebarContractSection
                  formData={formData}
                  situation={situation}
                  language={language}
                  isDeep={isDeep}
                />
              )}

              {/* Legacy sections removed - now handled by SidebarContractSection */}
              
              {/* === CLOSET INVENTORY (Deep/Move flows - $0 Included mapping) === */}
              {(() => {
                const isDeepOrMove = formData.baseServiceLevel === 'Deep Clean' || 
                                     formData.baseServiceLevel === 'Move-In/Out' ||
                                     situation === 'MOVING';
                                     
                if (!isDeepOrMove) return null;
                
                // Collect closet counts from bedroom configs
                const closetData: { room: string; count: number }[] = [];
                
                if (formData.bedroomConfigs) {
                  Object.entries(formData.bedroomConfigs).forEach(([id, config]) => {
                    if (config.closetCabinets && config.closetCabinets > 0) {
                      const bedNum = parseInt(id.replace('bed_', '')) + 1;
                      const label = bedNum === 1 ? 'Master' : `Bedroom ${bedNum}`;
                      closetData.push({ room: label, count: config.closetCabinets });
                    }
                  });
                }
                
                // Check for hallway cabinet add-ons
                const hallwayCabinets = formData.roomAddons?.hallways?.filter(
                  a => a.addonId === 'hallway_cabinets'
                );
                if (hallwayCabinets && hallwayCabinets.length > 0) {
                  hallwayCabinets.forEach(addon => {
                    closetData.push({ room: 'Hallway Linen', count: addon.quantity });
                  });
                }
                
                const totalClosets = closetData.reduce((sum, c) => sum + c.count, 0);
                
                if (totalClosets === 0) return null;
                
                return (
                  <div className="pt-2 border-t border-dashed border-border/50 space-y-1.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🗄️</span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {t(language, 'sidebar.closet_inventory')}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium">
                        {t(language, 'sidebar.closet_included')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {closetData.map(({ room, count }) => (
                        <div key={room} className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">{room}</span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <span>{count}× closet</span>
                            <span className="text-muted-foreground/70">$0</span>
                          </span>
                        </div>
                      ))}
                      {/* Total row */}
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-dashed border-border/30">
                        <span className="font-semibold text-foreground">{t(language, 'sidebar.closet_count')}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalClosets}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Property Logistics Display (MOVING and Deep flows) */}
              {(formData.needsLandlordReceipt || formData.pullOutAppliances) && (
                <div className="pt-2 border-t border-dashed border-border/50 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Property Logistics
                  </p>
                  {formData.needsLandlordReceipt && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Landlord Receipt Requested</span>
                    </div>
                  )}
                  {formData.pullOutAppliances && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Users className="w-3 h-3 text-primary" />
                      <span className={situation === 'MOVING' 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-muted-foreground"
                      }>
                        {situation === 'MOVING' 
                          ? 'Behind Appliances (Included)' 
                          : 'Behind Appliances +$30'}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* === WASTE & HAZARD MAP (Deep/Move flows) === */}
              {(() => {
                const isDeepOrMove = formData.baseServiceLevel === 'Deep Clean' || 
                                     formData.baseServiceLevel === 'Move-In/Out' ||
                                     situation === 'MOVING';
                                     
                if (!isDeepOrMove) return null;
                
                const coreRooms = ['kitchen', 'living', 'dining', 'hallways', 'stairs'] as const;
                const roomLabels: Record<string, string> = {
                  kitchen: 'Kitchen',
                  living: 'Living Room',
                  dining: 'Dining Room',
                  hallways: 'Hallways',
                  stairs: 'Stairs',
                };
                
                // Build bedroom room IDs dynamically
                const bedroomIds = Object.keys(formData.bedroomConfigs || {});
                const allRooms = [...coreRooms, ...bedroomIds];
                
                // Check if any hazards are configured (including bedrooms)
                const roomsWithHazards = allRooms.filter(r => {
                  // Check core rooms
                  if (coreRooms.includes(r as any)) {
                    const bags = (formData.roomTrashBags as any)?.[r] || 0;
                    const messTypes = (formData.roomMessTypes as any)?.[r] || [];
                    const sticky = (formData.roomStickySpills as any)?.[r] || false;
                    return bags > 0 || messTypes.length > 0 || sticky;
                  }
                  // Check bedrooms
                  const bags = (formData.roomTrashBags as any)?.bedrooms?.[r] || 0;
                  const messTypes = (formData.roomMessTypes as any)?.bedrooms?.[r] || [];
                  const sticky = (formData.roomStickySpills as any)?.bedrooms?.[r] || false;
                  return bags > 0 || messTypes.length > 0 || sticky;
                });
                
                if (roomsWithHazards.length === 0) return null;
                
                // Calculate total bags (core + bedrooms)
                let totalBags = coreRooms.reduce((sum, r) => 
                  sum + ((formData.roomTrashBags as any)?.[r] || 0), 0);
                bedroomIds.forEach(bedId => {
                  totalBags += (formData.roomTrashBags as any)?.bedrooms?.[bedId] || 0;
                });
                
                return (
                  <div className="pt-2 border-t border-dashed border-amber-200/50 dark:border-amber-800/50 space-y-1.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Waste & Hazard Map
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {roomsWithHazards.map(room => {
                        // Determine if it's a bedroom or core room
                        const isBedroom = room.startsWith('bed_');
                        let bags: number, messTypes: string[], sticky: boolean, roomLabel: string;
                        
                        if (isBedroom) {
                          bags = (formData.roomTrashBags as any)?.bedrooms?.[room] || 0;
                          messTypes = (formData.roomMessTypes as any)?.bedrooms?.[room] || [];
                          sticky = (formData.roomStickySpills as any)?.bedrooms?.[room] || false;
                          const bedNum = parseInt(room.replace('bed_', '')) + 1;
                          roomLabel = bedNum === 1 ? 'Master Bed' : `Bedroom ${bedNum}`;
                        } else {
                          bags = (formData.roomTrashBags as any)?.[room] || 0;
                          messTypes = (formData.roomMessTypes as any)?.[room] || [];
                          sticky = (formData.roomStickySpills as any)?.[room] || false;
                          roomLabel = roomLabels[room] || room;
                        }
                        
                        return (
                          <div key={room} className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">{roomLabel}</span>
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                              {bags > 0 && <span>{bags} bags</span>}
                              {messTypes.length > 0 && (
                                <span className="text-[9px] text-amber-500/80">
                                  + {messTypes.map((t: string) => t.replace(/_/g, ' ')).join(', ')}
                                </span>
                              )}
                              {sticky && <span className="text-blue-500">💧</span>}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* Total Bags Row */}
                      {totalBags > 0 && (
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-dashed border-amber-200/30 dark:border-amber-800/30">
                          <span className="font-semibold text-foreground">Total Bags</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{totalBags}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* Premium Value Card - Context-aware psychology engine */}
          {timeMetrics && (
            <div className={cn(
              "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
              timeVisuals.bgClass
            )}>
              {/* Header: Icon + Title */}
              <div className="flex items-center gap-2 mb-1.5">
                <timeVisuals.Icon className={cn("w-4 h-4", timeVisuals.iconClass)} />
                <span className={cn("font-bold text-[11px] uppercase tracking-wider", timeVisuals.titleClass)}>
                  {timeVisuals.title}
                </span>
              </div>

              {/* Big Number: Man-Hours (VALUE) */}
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-black tracking-tight">
                  ~{Math.round(timeMetrics.manHours * 10) / 10}
                </span>
                <span className="text-xs font-bold opacity-70 uppercase tracking-wide">
                  {isHourlyMode 
                    ? t(language, 'time.labor_hrs') 
                    : t(language, 'time.hrs_saved')}
                </span>
              </div>

              {/* Emotional Subtitle */}
              <p className="text-xs font-medium opacity-80 mb-3 leading-relaxed">
                {timeVisuals.subtitle}
              </p>

              {/* Team Transparency Badge */}
              <div className="inline-flex items-center gap-1.5 text-[10px] bg-white/60 dark:bg-black/20 px-2.5 py-1.5 rounded-lg border border-black/5 dark:border-white/5 backdrop-blur-sm">
                <Users className="w-3 h-3 opacity-70" />
                <span className="font-semibold opacity-90">
                  {t(language, 'time.team_badge')
                    .replace('{count}', String(timeMetrics.teamSize))
                    .replace('{hours}', String(Math.round(timeMetrics.clockHours * 10) / 10))}
                </span>
              </div>
            </div>
          )}

          {/* Property Logistics Map Teaser (LIVE_HERE/MOVING residential only) */}
          {(situation === 'LIVE_HERE' || situation === 'MOVING') && (
            <div className="mt-3">
              <PropertyLogisticsMapTeaser
                layoutModel={homeLayoutModel}
                language={language}
                variant="default"
              />
            </div>
          )}

          {/* Divider Line */}
          <div className="border-t border-dashed border-border/60 my-2" />

          {/* Frequency Discount Line - Shows the recurring discount applied */}
          {frequencyDiscount && (
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" />
                {frequencyDiscount.label} Discount
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                -{frequencyDiscount.percent}%
              </span>
            </div>
          )}

          {/* Recurring Savings Badge - Compact */}
          {savings && savings > 0 && (
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-xs">
              <BadgePercent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                Save ${savings} vs one-time
              </span>
            </div>
          )}
          
          {/* Total Section - Show dual prices for recurring services */}
          {isRecurring && !isHourlyMode && firstVisitPrice !== null && futureVisitsPrice !== null ? (
            <div className="space-y-2 pt-1">
              {/* First Visit Price */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  First Visit {recurringStartMode === 'deep-plus-recurring' ? '(Deep Reset)' : '(Standard)'}
                </span>
                <span className="font-bold font-mono text-foreground">${firstVisitPrice}</span>
              </div>
              
              {/* Future Visits Price */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  {frequencyDiscount?.label || 'Recurring'} Visits
                </span>
                <span className="text-xl font-black font-mono text-primary tracking-tight">${futureVisitsPrice}</span>
              </div>
            </div>
          ) : (
            /* Single Total for one-time services */
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-foreground">
                {t(language, 'live_price.estimated_total')}
              </span>
              <span className="text-xl font-black font-mono text-primary tracking-tight transition-all duration-200">
                ${displayedTotal}
              </span>
            </div>
          )}
        </div>

        {/* Value Slider */}
        <ValueSlider language={language} industry={industry} situation={situation} />

        {/* Trust Anchors - Ultra Compact Footer */}
        <div className="px-4 py-2.5 bg-muted/30 border-t border-border/40 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span>Licensed</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Insured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
