import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useCityConfig } from '@/hooks/useCityConfig';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { homeSizeOptions, conditionFees, COMMON_SPACE_OPTIONS, getAvailableSpaces, getDefaultIncludedSpaces } from '@/lib/pricing';
import { getDefaultBathroomCounts, LIVING_AREA_RATES, MOVE_OCCUPANCY_MULTIPLIERS, calculateVerticalSurcharge, VERTICAL_SURCHARGES } from '@/lib/pricing_v2';
import { calculateComponentPrice } from '@/lib/pricing_v2';
import { getKitchenSectionToggles, INSIDE_APPLIANCE_ADDON_IDS } from '@/lib/kitchenSectionToggles';
import { shouldEnableAreaConditionFees } from '@/lib/areaConditionFees';
import { ServiceTypeSelector } from '../ServiceTypeSelector';
import { ServiceLevelSelector } from '../ServiceLevelSelector';
import { UnifiedSpacesSection } from '../UnifiedSpacesSection';
import { AdditionalStructuresSection } from '../AdditionalStructuresSection';
import { AreaConditionSelector } from '../AreaConditionSelector';
import { defaultGuestHouseConfig } from '../GuestHouseCard';
import { defaultArtStudioConfig } from '../ArtStudioCard';
import { Counter } from '../Counter';
import { ServiceInclusions } from '../ServiceInclusions';
import { cn } from '@/lib/utils';
import { sendEarlyLeadCapture } from '@/lib/earlyLeadCapture';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Home, Ruler, Bath, ShieldCheck, MapPin, Star, CheckCircle2, ArrowRight, Sparkles, Minus, Plus, Crown, Clock, Users, Info, DollarSign, Briefcase, Shirt, Layers, Car, AlertTriangle, Package, PackageCheck, Paintbrush, Focus, Building2, ArrowUp, Sun, ChevronDown, X, Utensils, Sofa, ChefHat, DoorOpen, Check, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// Square footage ranges - pure metadata, NOT used for pricing
const squareFootageRanges = [
  { value: 'SF_<600', label: '< 600' },
  { value: 'SF_600_900', label: '600 – 900' },
  { value: 'SF_900_1200', label: '900 – 1,200' },
  { value: 'SF_1200_1500', label: '1,200 – 1,500' },
  { value: 'SF_1500_2000', label: '1,500 – 2,000' },
  { value: 'SF_2000_2500', label: '2,000 – 2,500' },
  { value: 'SF_2500_3000', label: '2,500 – 3,000' },
  { value: 'SF_3000_3500', label: '3,000 – 3,500' },
  { value: 'SF_3500_4000', label: '3,500 – 4,000' },
  { value: 'SF_4000_5000', label: '4,000 – 5,000' },
  { value: 'SF_5000_7000', label: '5,000 – 7,000' },
  { value: 'SF_7000+', label: '7,000+' },
];

// Estate threshold - properties over this sq ft bypass to hourly service
const MAX_FLAT_RATE_SQFT = 3000;

// Large estate sq ft values (3,000+ sq ft - triggers estate options)
const largeSqftValues = ['SF_3000_3500', 'SF_3500_4000', 'SF_4000_5000', 'SF_5000_7000', 'SF_7000+'];

// Smart Visibility Thresholds for Additional Structures
// Only show compound/estate options for larger properties (2,000+ sq ft AND 2+ bedrooms)
const STRUCTURES_MIN_BEDROOMS = 2;
const STRUCTURES_ELIGIBLE_SQFT = [
  'SF_2000_2500', 
  'SF_2500_3000', 
  'SF_3000_3500', 
  'SF_3500_4000', 
  'SF_4000_5000', 
  'SF_5000_7000', 
  'SF_7000+'
];

// WHALE MULTIPLIER for Estate Signature Clean
const WHALE_MULTIPLIER = 2.5;

// PropertySpacesSection has been replaced by UnifiedSpacesSection component
export function StepStart() {
  const { language, formData, updateFormData, situation, setSituation, setCurrentStep, selectedAddons, toggleAddon, updateAddonQuantity, toggleRoomAddon, updateRoomAddonQuantity, moveContext, toggleUserExclusion, updateRoomMessTypes, updateRoomTrashBags, updateRoomStickySpills } = useBooking();
  const cityConfig = useCityConfig();
  const propertyConfigRef = useRef<HTMLDivElement>(null);

  // Calculate total bathrooms from breakdown
  const totalBathrooms = formData.masterBaths + formData.fullBaths + (formData.halfBaths * 0.5);

  // SMART TRACKS: Dynamic headers based on situation
  const isMoving = situation === 'MOVING';
  const headerTitle = isMoving 
    ? t(language, 'step1.title_moving') 
    : t(language, 'step1.title_living');
  const headerSubtitle = isMoving 
    ? t(language, 'step1.subtitle_moving') 
    : t(language, 'step1.subtitle_living');

  // Auto-scroll to property config when service level selected
  useEffect(() => {
    if (formData.serviceType && propertyConfigRef.current) {
      setTimeout(() => {
        propertyConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400); // Slight delay for frequency dock animation
    }
  }, [formData.serviceType]);

  // Auto-fill bathroom counts when home size changes (Smart Defaults)
  const prevHomeSizeRef = useRef<number | null>(null);
  useEffect(() => {
    // Only auto-fill on homeSize change, not on initial mount
    if (prevHomeSizeRef.current !== null && prevHomeSizeRef.current !== formData.homeSize) {
      const defaults = getDefaultBathroomCounts(formData.homeSize);
      updateFormData({
        masterBaths: defaults.masterBaths,
        fullBaths: defaults.fullBaths,
        halfBaths: defaults.halfBaths,
      });
    }
    prevHomeSizeRef.current = formData.homeSize;
  }, [formData.homeSize, updateFormData]);

  // Determine if current service is deep clean (for price badge display)
  const isDeepClean = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';

  // Validate Home Size is selected (required before revealing services)
  // NOTE: homeSize === 0 is "Studio / 1 Bath" which is valid, so we check for undefined/null
  const isHomeSizeValid = formData.homeSize !== undefined && formData.homeSize !== null && formData.homeSize >= 0;

  // Shadow Capture: Track if we've already sent for this session
  const hasSentShadowCapture = useRef(false);

  // Shadow Capture: Send early lead when service level is first selected
  useEffect(() => {
    if (formData.serviceType && !hasSentShadowCapture.current) {
      hasSentShadowCapture.current = true;
      sendEarlyLeadCapture({
        step: 'step1_service_selected',
        homeSize: formData.homeSize,
        city: formData.city || '',
        timestamp: new Date().toISOString(),
        squareFootageRange: formData.squareFootageRange || '',
        masterBaths: formData.masterBaths,
        fullBaths: formData.fullBaths,
        halfBaths: formData.halfBaths,
        serviceType: formData.serviceType,
      });
    }
  }, [formData.serviceType, formData.homeSize, formData.city, formData.squareFootageRange, formData.masterBaths, formData.fullBaths, formData.halfBaths]);

  // Auto-select pullOutAppliances for MOVING flow
  useEffect(() => {
    if (situation === 'MOVING' && formData.pullOutAppliances !== true) {
      updateFormData({ pullOutAppliances: true });
    }
  }, [situation]);

  // Check if user selected a large estate (>3500 sq ft)
  const isLargeEstate = largeSqftValues.includes(formData.squareFootageRange);

  // Smart Visibility: Additional Structures only for compound-scale properties (2,000+ sqft AND 2+ bedrooms)
  const showAdditionalStructures = useMemo(() => {
    // Must have both sq ft and bedrooms selected
    if (!formData.squareFootageRange || formData.homeSize === undefined || formData.homeSize === null) {
      return false;
    }
    
    // Check sqft threshold: 2,000+ sq ft
    const sqftEligible = STRUCTURES_ELIGIBLE_SQFT.includes(formData.squareFootageRange);
    
    // Check bedroom threshold: 2+ bedrooms
    const bedroomsEligible = formData.homeSize >= STRUCTURES_MIN_BEDROOMS;
    
    // Both conditions must be met
    return sqftEligible && bedroomsEligible;
  }, [formData.squareFootageRange, formData.homeSize]);

  // Auto-reset additional structures when property drops below threshold
  useEffect(() => {
    if (!showAdditionalStructures) {
      // Only reset if there are values to clear (avoid infinite loops)
      const hasStructures = (formData.guestHouseCount || 0) > 0 || 
                            (formData.studioCount || 0) > 0 || 
                            (formData.poolHouseCount || 0) > 0;
      
      if (hasStructures) {
        updateFormData({
          guestHouseCount: 0,
          studioCount: 0,
          poolHouseCount: 0,
          guestHouseConfigs: {},
          artStudioConfigs: {},
        });
      }
    }
  }, [showAdditionalStructures, formData.guestHouseCount, formData.studioCount, formData.poolHouseCount, updateFormData]);

  // Calculate max floors based on property type selection (for floor location selectors)
  const maxFloors = useMemo(() => {
    if (formData.propertyType === 'apartment') {
      return formData.apartmentUnitLevels || 1;
    }
    return formData.houseLevels || 1;
  }, [formData.propertyType, formData.apartmentUnitLevels, formData.houseLevels]);


  // Calculate Estate Signature Clean price (2.5x base price)
  const estateSignaturePrice = useMemo(() => {
    const componentResult = calculateComponentPrice({
      homeSize: formData.homeSize,
      masterBaths: formData.masterBaths,
      fullBaths: formData.fullBaths,
      halfBaths: formData.halfBaths,
      serviceType: 'Deep Clean', // Estate uses deep clean as base
      conditionFee: formData.conditionFee,
      includeCabinets: false,
    });
    return Math.round(componentResult.finalPrice * WHALE_MULTIPLIER);
  }, [formData.homeSize, formData.masterBaths, formData.fullBaths, formData.halfBaths, formData.conditionFee]);

  // Handle switch to hourly priority service for large estates
  const handleSwitchToHourly = () => {
    // Set hourly mode and situation FIRST to trigger flow change
    updateFormData({ isHourlyMode: true });
    setSituation('SPECIFIC_AREAS');
    // Navigate to HourlyConfig step (step 1 in the hourly flow: Triage(0) → HourlyConfig(1) → Details(2) → Review(3))
    setCurrentStep(1);
  };

  // Handle Estate Signature Clean selection - pre-select Deep Clean
  const handleEstateSignature = () => {
    updateFormData({ 
      isHourlyMode: false,
      serviceType: 'Deep Clean',
      baseServiceLevel: 'Deep Clean',
    });
  };

  return (
    <div className="animate-fade-in space-y-8">

      {/* ═══════════════════════════════════════════════════════════════════
          SERVICE-FIRST ARCHITECTURE: Service Level at TOP (Root Variable)
          This determines the multiplier for all subsequent calculations
      ═══════════════════════════════════════════════════════════════════ */}
      
      {/* SERVICE LEVEL SELECTOR - Position 1 (Before Property Structure) */}
      {!isLargeEstate && (
        <div className="bg-card rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 p-5 sm:p-6">
          <ServiceLevelSelector />
          
          {/* FREQUENCY DOCK - Appears immediately after service level selected */}
          {situation === 'LIVE_HERE' && formData.serviceType && (
            <div className="pt-6 mt-6 border-t border-border/50 animate-fade-in">
              <ServiceTypeSelector />
            </div>
          )}
          
          {/* MOVE CONDITION SELECTOR - Directly under Service Level for MOVING */}
          {isMoving && formData.serviceType && (
            <div className="pt-6 mt-6 border-t border-border/50 animate-fade-in">
              {/* Header */}
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-foreground uppercase tracking-wide">
                  {t(language, 'move.condition_title')}
                </span>
              </div>
              
              {/* Condition Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vacant (Empty) */}
                <button
                  type="button"
                  onClick={() => updateFormData({ 
                    moveCondition: 'vacant',
                    excludedSpaces: [],
                    hallwaysEnabled: true,
                    stairsEnabled: true,
                  })}
                  className={cn(
                    "flex flex-col p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    formData.moveCondition === 'vacant'
                      ? "border-blue-500 bg-blue-50/10 dark:bg-blue-900/10 shadow-sm"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <PackageCheck className={cn(
                      "w-5 h-5",
                      formData.moveCondition === 'vacant' ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                    )} />
                    <h4 className="font-semibold text-foreground text-sm">
                      {t(language, 'move.condition_vacant')}
                    </h4>
                    {formData.moveCondition === 'vacant' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(language, 'move.condition_vacant_desc')}
                  </p>
                </button>

                {/* Partial Empty */}
                <button
                  type="button"
                  onClick={() => updateFormData({ moveCondition: 'partial_empty' })}
                  className={cn(
                    "flex flex-col p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    formData.moveCondition === 'partial_empty'
                      ? "border-amber-500 bg-amber-50/10 dark:bg-amber-900/10 shadow-sm"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Package className={cn(
                      "w-5 h-5",
                      formData.moveCondition === 'partial_empty' ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )} />
                    <h4 className="font-semibold text-foreground text-sm">
                      {t(language, 'move.condition_partial')}
                    </h4>
                    {formData.moveCondition === 'partial_empty' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(language, 'move.condition_partial_desc')}
                  </p>
                </button>
              </div>
              
              {/* Hint for Partial Empty */}
              {formData.moveCondition === 'partial_empty' && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-700/30">
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {t(language, 'move.condition_partial_hint')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section Header - DYNAMIC based on situation (Smart Tracks) */}
      {/* Only shows after service level is selected */}
      {formData.serviceType && (
        <div ref={propertyConfigRef} className="text-center space-y-3 py-2 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground">
            {headerTitle}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {headerSubtitle}
          </p>
        </div>
      )}

      {/* PREMIUM UNIFIED CARD - Property Configuration */}
      {/* Only shows after service level is selected */}
      {formData.serviceType && (
      <div className="bg-card rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 animate-fade-in">
        
        {/* Property Type & Vertical Logistics Section - Both MOVING and LIVE_HERE modes */}
        <div className="bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-5 sm:p-6 lg:p-8 space-y-5 border border-slate-200 dark:border-slate-700 mx-4 sm:mx-6 lg:mx-8 mt-6">
          {/* Section Header with Icon Badge */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Home className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t(language, 'move.property_type_title')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(language, 'move.property_type_hint')}
            </p>
          </div>

          {/* Property Type Cards - 2 Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* House / Townhouse Card */}
            <button
              type="button"
              onClick={() => updateFormData({ propertyType: 'house' })}
              className={cn(
                "relative flex items-start gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 text-left",
                formData.propertyType === 'house'
                  ? "border-primary bg-red-50 dark:bg-primary/10 shadow-lg ring-1 ring-primary/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/40 hover:shadow-md"
              )}
            >
              {/* Icon Circle */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                formData.propertyType === 'house' 
                  ? "bg-red-100 dark:bg-primary/20" 
                  : "bg-slate-100 dark:bg-slate-800"
              )}>
                <Home className={cn(
                  "w-6 h-6 transition-colors",
                  formData.propertyType === 'house' ? "text-primary" : "text-slate-500 dark:text-slate-400"
                )} />
              </div>
              
              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-semibold text-sm transition-colors",
                  formData.propertyType === 'house' ? "text-primary" : "text-foreground"
                )}>
                  {t(language, 'move.property_house')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t(language, 'move.property_house_subtitle')}
                </div>
              </div>
              
              {/* Checkmark Badge */}
              {formData.propertyType === 'house' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>

            {/* Apartment / Condo Card */}
            <button
              type="button"
              onClick={() => updateFormData({ propertyType: 'apartment' })}
              className={cn(
                "relative flex items-start gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 text-left",
                formData.propertyType === 'apartment'
                  ? "border-primary bg-red-50 dark:bg-primary/10 shadow-lg ring-1 ring-primary/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/40 hover:shadow-md"
              )}
            >
              {/* Icon Circle */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                formData.propertyType === 'apartment' 
                  ? "bg-red-100 dark:bg-primary/20" 
                  : "bg-slate-100 dark:bg-slate-800"
              )}>
                <Building2 className={cn(
                  "w-6 h-6 transition-colors",
                  formData.propertyType === 'apartment' ? "text-primary" : "text-slate-500 dark:text-slate-400"
                )} />
              </div>
              
              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-semibold text-sm transition-colors",
                  formData.propertyType === 'apartment' ? "text-primary" : "text-foreground"
                )}>
                  {t(language, 'move.property_apartment')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t(language, 'move.property_apartment_subtitle')}
                </div>
              </div>
              
              {/* Checkmark Badge */}
              {formData.propertyType === 'apartment' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          </div>

          {/* HOUSE LEVELS (Conditional - if House selected) */}
          {formData.propertyType === 'house' && (
            <div className="animate-fade-in pt-4 border-t border-slate-200/70 dark:border-slate-700 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t(language, 'move.house_levels_title')}
              </p>
              
              {/* 6-level horizontal scroll with snap - NO flex-wrap (Fix #1) */}
              <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
                <div className="flex gap-2 min-w-0 whitespace-nowrap pb-1">
                  {[
                    { level: 1 as const, label: '1 Story' },
                    { level: 2 as const, label: '2 Floors' },
                    { level: 3 as const, label: '3 Floors' },
                    { level: 4 as const, label: '4 Floors' },
                    { level: 5 as const, label: '5 Floors' },
                    { level: 6 as const, label: '6+' },
                  ].map((option) => {
                    const isSelected = formData.houseLevels === option.level;
                    return (
                      <button
                        key={option.level}
                        type="button"
                        onClick={() => updateFormData({ houseLevels: option.level })}
                        className={cn(
                          "py-3 px-4 rounded-xl border-2 text-center transition-all duration-200 min-h-[44px] min-w-[90px] flex-shrink-0 snap-start",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground font-semibold shadow-lg"
                            : "border-amber-200/70 dark:border-slate-600 bg-amber-50/50 dark:bg-slate-800 hover:border-primary/40"
                        )}
                      >
                        <div className={cn(
                          "font-medium text-xs sm:text-sm",
                          isSelected ? "text-primary-foreground" : "text-foreground"
                        )}>
                          {option.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.houseLevels >= 2 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  {t(language, 'move.house_surcharge_note')}
                </p>
              )}
              
              {/* Property Style (Detached vs Attached) */}
              <div className="pt-3 space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t(language, 'homeEntry.propertyStyle.label')}
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'detached' as const, labelKey: 'homeEntry.propertyStyle.detached' },
                    { value: 'attached' as const, labelKey: 'homeEntry.propertyStyle.attached' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateFormData({
                        homeEntry: { ...(formData.homeEntry ?? { propertyType: null, accessMethod: null, arrivalInstructions: '', parkingNotes: '', gateAccessCode: '', entryPathType: null, buildingEntryMethod: null, unitNumber: '', elevatorType: null, parkingRestrictions: '', shoesPolicy: null, dailyTrafficNotes: '', entryClear: null, movingNotes: '', entryZoneStyle: null, entryZoneFloor: null, hasEntryRugMat: false, hasCoatCloset: false, hasGlassAtEntry: false, studioSubtype: null, propertyStyle: null, unitPosition: null }), propertyStyle: opt.value }
                      })}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                        formData.homeEntry?.propertyStyle === opt.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {t(language, opt.labelKey)}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t(language, 'homeEntry.propertyStyle.helper')}
                </p>
              </div>
            </div>
          )}

          {/* APARTMENT ACCESS (Conditional - if Apartment selected) */}
          {formData.propertyType === 'apartment' && (
            <div className="animate-fade-in pt-4 border-t border-slate-200/70 dark:border-slate-700 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t(language, 'move.apartment_access_title')}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Floor Level Dropdown */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {t(language, 'move.apartment_floor_label')}
                  </Label>
                  <Select
                    value={formData.apartmentFloor.toString()}
                    onValueChange={(val) => updateFormData({ apartmentFloor: parseInt(val) })}
                  >
                    <SelectTrigger className="h-12 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:border-primary/40 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2 bg-popover z-50">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((floor) => (
                        <SelectItem key={floor} value={floor.toString()} className="rounded-lg py-2">
                          {floor === 1 ? 'Floor 1 (Ground)' : `Floor ${floor}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Elevator Access */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {t(language, 'move.apartment_elevator')}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateFormData({ hasElevator: true })}
                      className={cn(
                        "py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium",
                        formData.hasElevator
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-foreground hover:border-primary/40"
                      )}
                    >
                      {t(language, 'move.apartment_elevator_yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFormData({ hasElevator: false })}
                      className={cn(
                        "py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium",
                        !formData.hasElevator
                          ? "border-amber-500 bg-amber-500 text-white shadow-md"
                          : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-foreground hover:border-amber-400/50"
                      )}
                    >
                    {t(language, 'move.apartment_elevator_no')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Walk-up info note - no surcharge display */}
              {!formData.hasElevator && formData.apartmentFloor > 1 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t(language, 'move.apartment_walkup_info')}
                  </p>
                </div>
              )}

              {/* APARTMENT UNIT LEVELS - Multi-Level Units (Loft, Duplex, Penthouse) */}
              <div className="pt-4 border-t border-slate-200/70 dark:border-slate-600 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {t(language, 'move.apartment_unit_levels_title')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(language, 'move.apartment_unit_levels_hint')}
                </p>
                
                {/* 6-level horizontal scroll with snap - NO flex-wrap (Fix #1) */}
                <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
                  <div className="flex gap-2 min-w-0 whitespace-nowrap pb-1">
                    {[
                      { level: 1, label: t(language, 'move.unit_level_1') },
                      { level: 2, label: t(language, 'move.unit_level_2') },
                      { level: 3, label: t(language, 'move.unit_level_3') },
                      { level: 4, label: t(language, 'move.unit_level_4') },
                      { level: 5, label: t(language, 'move.unit_level_5') },
                      { level: 6, label: t(language, 'move.unit_level_6') },
                    ].map((option) => {
                      const isSelected = formData.apartmentUnitLevels === option.level;
                      return (
                        <button
                          key={option.level}
                          type="button"
                          onClick={() => updateFormData({ apartmentUnitLevels: option.level })}
                          className={cn(
                            "py-3 px-4 rounded-xl border-2 text-center transition-all min-h-[44px] min-w-[90px] flex-shrink-0 snap-start",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground font-semibold shadow-lg"
                              : "border-amber-200/70 dark:border-slate-600 bg-amber-50/50 dark:bg-slate-800 hover:border-primary/40"
                          )}
                        >
                          <div className={cn(
                            "font-medium text-xs sm:text-sm",
                            isSelected ? "text-primary-foreground" : "text-foreground"
                          )}>
                            {option.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formData.apartmentUnitLevels >= 2 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    {t(language, 'move.multi_level_unit_note')}
                  </p>
                )}
              </div>
              
              {/* Unit Position (Ground/Mid/High) */}
              <div className="pt-3 space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t(language, 'homeEntry.unitPosition.label')}
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'ground_floor' as const, labelKey: 'homeEntry.unitPosition.ground' },
                    { value: 'mid_rise' as const, labelKey: 'homeEntry.unitPosition.midRise' },
                    { value: 'high_rise' as const, labelKey: 'homeEntry.unitPosition.highRise' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateFormData({
                        homeEntry: { ...(formData.homeEntry ?? { propertyType: null, accessMethod: null, arrivalInstructions: '', parkingNotes: '', gateAccessCode: '', entryPathType: null, buildingEntryMethod: null, unitNumber: '', elevatorType: null, parkingRestrictions: '', shoesPolicy: null, dailyTrafficNotes: '', entryClear: null, movingNotes: '', entryZoneStyle: null, entryZoneFloor: null, hasEntryRugMat: false, hasCoatCloset: false, hasGlassAtEntry: false, studioSubtype: null, propertyStyle: null, unitPosition: null }), unitPosition: opt.value }
                      })}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                        formData.homeEntry?.unitPosition === opt.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {t(language, opt.labelKey)}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t(language, 'homeEntry.unitPosition.helper')}
                </p>
              </div>
              </div>
            )}
          </div>

        {/* TOP SECTION: Property Composition - Premium Design - Mobile optimized padding */}
        <div className="p-4 sm:p-6 lg:p-10 space-y-6">
          {/* Section Header */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {t(language, 'label.property_size')}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Includes: Kitchen, Living, Dining & all common areas
              </p>
            </div>
          </div>

          {/* Property Size Selectors - Side-by-side layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            {/* Est. Area (Sq Ft) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5" />
                {t(language, 'label.est_area')}
              </Label>
              <Select
                value={formData.squareFootageRange || ''}
                onValueChange={(val) => {
                  updateFormData({ squareFootageRange: val });
                  // Auto-populate included spaces when sqft changes
                  const newSpaces = getDefaultIncludedSpaces(val, formData.homeSize);
                  updateFormData({ includedSpaces: newSpaces, excludedSpaces: [] });
                }}
              >
                <SelectTrigger className={cn(
                  "h-12 bg-background border-2 border-border rounded-xl px-4 text-sm font-medium",
                  "focus:border-primary focus:ring-4 focus:ring-primary/10",
                  "hover:border-primary/50 transition-all duration-200"
                )}>
                  <SelectValue placeholder={t(language, 'label.sqft_placeholder')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 bg-popover z-50">
                  {squareFootageRanges.map((range) => (
                    <SelectItem 
                      key={range.value} 
                      value={range.value}
                      className="rounded-lg py-3 text-sm"
                    >
                      {range.label} Sq Ft
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Number of Bedrooms */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Home className="w-3.5 h-3.5" />
                {t(language, 'label.home_size')}
              </Label>
              <Select
                value={formData.homeSize.toString()}
                onValueChange={(val) => {
                  const beds = parseInt(val);
                  updateFormData({ homeSize: beds });
                  // Auto-populate included spaces when bedrooms change
                  const newSpaces = getDefaultIncludedSpaces(formData.squareFootageRange, beds);
                  updateFormData({ includedSpaces: newSpaces, excludedSpaces: [] });
                }}
              >
                <SelectTrigger className={cn(
                  "h-12 bg-background border-2 border-border rounded-xl px-4 text-sm font-medium",
                  "focus:border-primary focus:ring-4 focus:ring-primary/10",
                  "hover:border-primary/50 transition-all duration-200"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 bg-popover z-50">
                  {homeSizeOptions.map((opt) => (
                    <SelectItem 
                      key={opt.value} 
                      value={opt.value.toString()}
                      className="rounded-lg py-3 text-sm"
                    >
                      {t(language, opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sq Ft Selection Hint - Shows when not selected */}
          {!formData.squareFootageRange && (
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30">
              <Ruler className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium">
                {t(language, 'sqft.hint_select')}
              </p>
            </div>
          )}

          {/* UNIFIED SPACES SECTION - 3-Tier System */}
          {formData.squareFootageRange && formData.homeSize >= 0 && (
            <div className="space-y-5 pt-4 border-t border-border/30">
              <UnifiedSpacesSection
                sqftRange={formData.squareFootageRange}
                beds={formData.homeSize}
                language={language}
                isDeep={formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out'}
                isMoveOut={situation === 'MOVING' && moveContext === 'move_out'}
                includedSpaces={formData.includedSpaces || []}
                excludedSpaces={formData.excludedSpaces || []}
                skippedBedrooms={formData.skippedBedrooms || []}
                officeCount={formData.officeCount || 0}
                laundryRoomCount={formData.laundryRoomCount || 0}
                loftCount={formData.loftCount || 0}
                garageCount={formData.garageCount || 0}
                patioCount={formData.patioCount || 0}
                patioScope={formData.patioScope || 'sweep'}
                selectedAddons={selectedAddons}
                showFloorSelector={true}
                spaceFloorTypes={formData.spaceFloorTypes}
                onSpaceFloorTypeChange={(spaceId, type) => {
                  updateFormData({
                    spaceFloorTypes: {
                      ...formData.spaceFloorTypes,
                      [spaceId]: type,
                    }
                  });
                }}
                onBedroomFloorTypeChange={(bedroomId, type) => {
                  updateFormData({
                    spaceFloorTypes: {
                      ...formData.spaceFloorTypes,
                      bedrooms: {
                        ...formData.spaceFloorTypes.bedrooms,
                        [bedroomId]: type,
                      }
                    }
                  });
                }}
                // Window section - integrated per-room window management
                showWindowSection={situation === 'LIVE_HERE' || situation === 'MOVING'}
                roomWindowSelections={formData.roomWindowSelections}
                // Window Tracks included by default for Deep/Move flows
                tracksIncludedByDefault={formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out'}
                // Included Windows: 1 for kitchen, 1 for living, 2 per bedroom - Deep/Move flows only
                includedWindowsEnabled={formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out'}
                onRoomWindowUpdate={(roomId, updates) => {
                  const currentSelections = formData.roomWindowSelections || [];
                  const existingIndex = currentSelections.findIndex(r => r.roomId === roomId);
                  
                  if (existingIndex >= 0) {
                    // Update existing selection
                    const updatedSelections = [...currentSelections];
                    updatedSelections[existingIndex] = { ...updatedSelections[existingIndex], ...updates };
                    updateFormData({ roomWindowSelections: updatedSelections });
                  } else {
                    // Add new selection if it doesn't exist
                    const newSelection = {
                      roomId,
                      roomType: roomId,
                      roomLabel: roomId,
                      windowInventory: [],
                      windowCount: 0,
                      glassMode: 'none' as const,
                      blindsCount: 0,
                      blindsType: null,
                      ...updates,
                    };
                    updateFormData({ roomWindowSelections: [...currentSelections, newSelection] });
                  }
                }}
                onToggleSpace={(spaceId) => {
                  const isCurrentlyExcluded = (formData.excludedSpaces || []).includes(spaceId);
                  if (isCurrentlyExcluded) {
                    updateFormData({
                      excludedSpaces: (formData.excludedSpaces || []).filter(s => s !== spaceId),
                    });
                  } else {
                    updateFormData({
                      excludedSpaces: [...(formData.excludedSpaces || []), spaceId],
                    });
                  }
                }}
                onToggleBedroom={(bedroomId) => {
                  const isCurrentlySkipped = (formData.skippedBedrooms || []).includes(bedroomId);
                  if (isCurrentlySkipped) {
                    updateFormData({
                      skippedBedrooms: (formData.skippedBedrooms || []).filter(b => b !== bedroomId),
                    });
                  } else {
                    updateFormData({
                      skippedBedrooms: [...(formData.skippedBedrooms || []), bedroomId],
                    });
                  }
                }}
                onAddonChange={(spaceId, count) => {
                  const fieldMap: Record<string, string> = {
                    office: 'officeCount',
                    laundry: 'laundryRoomCount',
                    loft: 'loftCount',
                    garage: 'garageCount',
                    patio: 'patioCount',
                  };
                  const field = fieldMap[spaceId];
                  if (field) {
                    updateFormData({ [field]: count });
                  }
                }}
                onPatioScopeChange={(scope) => updateFormData({ patioScope: scope })}
                // Per-room addon handlers (NEW - room independence)
                roomAddons={formData.roomAddons}
                onRoomAddonToggle={toggleRoomAddon}
                onRoomAddonQuantityChange={(roomId, addonId, quantity) => {
                  if (quantity === 0) {
                    toggleRoomAddon(roomId, addonId);
                  } else {
                    updateRoomAddonQuantity(roomId, addonId, quantity);
                  }
                }}
                onContextAddonToggle={(addonId) => toggleAddon(addonId)}
                onContextAddonQuantityChange={(addonId, quantity) => {
                  if (quantity === 0) {
                    const isSelected = selectedAddons.some(a => a.value === addonId);
                    if (isSelected) {
                      toggleAddon(addonId);
                    }
                  } else {
                    const isSelected = selectedAddons.some(a => a.value === addonId);
                    if (!isSelected) {
                      toggleAddon(addonId, quantity);
                    } else {
                      updateAddonQuantity(addonId, quantity);
                    }
                  }
                }}
                // NEW: Surface Notes & Bedroom Profiles integration
                surfaceNotes={formData.surfaceNotes}
                onSurfaceNotesChange={(roomId, notes) => {
                  if (roomId.startsWith('bed_')) {
                    updateFormData({
                      surfaceNotes: {
                        ...formData.surfaceNotes,
                        bedrooms: {
                          ...formData.surfaceNotes.bedrooms,
                          [roomId]: notes,
                        }
                      }
                    });
                  } else {
                    updateFormData({
                      surfaceNotes: {
                        ...formData.surfaceNotes,
                        [roomId]: notes,
                      }
                    });
                  }
                }}
                bedroomConfigs={formData.bedroomConfigs}
                onBedroomProfileChange={(bedroomId, profile) => {
                  updateFormData({
                    bedroomConfigs: {
                      ...formData.bedroomConfigs,
                      [bedroomId]: {
                        ...formData.bedroomConfigs?.[bedroomId],
                        profile,
                        ceilingFans: formData.bedroomConfigs?.[bedroomId]?.ceilingFans || 0,
                        lightFixtures: formData.bedroomConfigs?.[bedroomId]?.lightFixtures || 0,
                        closetCabinets: formData.bedroomConfigs?.[bedroomId]?.closetCabinets || 0,
                        freshSheets: formData.bedroomConfigs?.[bedroomId]?.freshSheets || 0,
                        organizationHours: formData.bedroomConfigs?.[bedroomId]?.organizationHours || 0,
                      }
                    }
                  });
                }}
                onBedroomAddonsChange={(bedroomId, addons) => {
                  updateFormData({
                    bedroomConfigs: {
                      ...formData.bedroomConfigs,
                      [bedroomId]: {
                        profile: formData.bedroomConfigs?.[bedroomId]?.profile || 'standard',
                        ceilingFans: addons.ceilingFans,
                        lightFixtures: addons.lightFixtures,
                        closetCabinets: addons.closetCabinets,
                        freshSheets: addons.freshSheets,
                        organizationHours: addons.organizationHours,
                      }
                    }
                  });
                }}
                showSurfaceNotes={true}
                showBedroomProfiles={true}
                showBedroomAddons={true}
                // Baseboard selections - show for Deep/Move flows
                showBaseboardToggle={formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out'}
                baseboardSelections={formData.baseboardSelections}
                onBaseboardChange={(roomId, enabled) => {
                  if (roomId.startsWith('bed_')) {
                    updateFormData({
                      baseboardSelections: {
                        ...formData.baseboardSelections,
                        bedrooms: {
                          ...formData.baseboardSelections.bedrooms,
                          [roomId]: enabled,
                        }
                      }
                    });
                  } else {
                    updateFormData({
                      baseboardSelections: {
                        ...formData.baseboardSelections,
                        [roomId]: enabled,
                      }
                    });
                  }
                }}
                // Bathroom Mapping - Premium Inventory System
                showBathroomModules={true}
                masterBaths={formData.masterBaths}
                fullBaths={formData.fullBaths}
                halfBaths={formData.halfBaths}
                onBathroomChange={(type, count) => {
                  if (type === 'master') updateFormData({ masterBaths: count });
                  else if (type === 'full') updateFormData({ fullBaths: count });
                  else if (type === 'half') updateFormData({ halfBaths: count });
                }}
                bathroomInventory={formData.bathroomInventory}
                onBathroomInventoryChange={(inventory) => updateFormData({ bathroomInventory: inventory })}
                // Floor LOCATION props (multi-floor property room assignment)
                maxFloors={maxFloors}
                roomFloorLocations={formData.roomFloorLocations}
                onRoomFloorLocationChange={(roomId, floor) => {
                  const isBedroom = roomId.startsWith('bed_');
                  if (isBedroom) {
                    updateFormData({
                      roomFloorLocations: {
                        ...formData.roomFloorLocations,
                        bedrooms: {
                          ...formData.roomFloorLocations?.bedrooms,
                          [roomId]: floor,
                        }
                      }
                    });
                  } else {
                    updateFormData({
                      roomFloorLocations: {
                        ...formData.roomFloorLocations,
                        [roomId]: floor,
                      }
                    });
                  }
                }}
                // Kitchen Logistics props (MOVING and Deep Clean flows)
                situation={situation === 'LIVE_HERE' || situation === 'MOVING' ? situation : null}
                serviceType={formData.serviceType}
                pullOutAppliances={formData.pullOutAppliances}
                onPullOutAppliancesChange={(enabled) => updateFormData({ pullOutAppliances: enabled })}
                // User Exclusions (Cognitive Mapping - Standard Inclusions interactive grid)
                userExclusions={formData.userExclusions}
                onExclusionToggle={toggleUserExclusion}
                // Area-specific Hazards & Waste (Deep/Move flows)
                roomMessTypes={formData.roomMessTypes}
                roomTrashBags={formData.roomTrashBags}
                roomStickySpills={formData.roomStickySpills}
                onRoomMessTypesChange={updateRoomMessTypes}
                onRoomTrashBagsChange={updateRoomTrashBags}
                onRoomStickySpillsChange={updateRoomStickySpills}
                // Stairs Configuration - Multi-floor property stair logistics
                propertyFloors={maxFloors}
                stairsConfig={formData.stairsConfig}
                onStairsConfigChange={(updates) => {
                  updateFormData({
                    stairsConfig: {
                      ...formData.stairsConfig,
                      ...updates,
                    }
                  });
                }}
                // Hallways Multi-Entry System (NEW)
                hallways={formData.hallways || []}
                onHallwaysChange={(hallways) => {
                  updateFormData({ hallways });
                }}
                // Stairs Multi-Entry System (NEW - SSOT for multi-stair logistics)
                stairs={formData.stairs || []}
                onStairsChange={(stairs) => {
                  updateFormData({ stairs });
                }}
                // SSOT: Thread baseServiceLevel for Deep Clean detection in HallwayCard
                baseServiceLevel={formData.baseServiceLevel}
                // === MOVE CONDITION FREEZE TOGGLES (Partial Empty) ===
                moveCondition={formData.moveCondition}
                hallwaysEnabled={formData.hallwaysEnabled}
                stairsEnabled={formData.stairsEnabled}
                onHallwaysEnabledChange={(enabled) => updateFormData({ hallwaysEnabled: enabled })}
                onStairsEnabledChange={(enabled) => updateFormData({ stairsEnabled: enabled })}
                // Home Entry Configuration (Arrival & Access Plan)
                homeEntry={formData.homeEntry}
                onHomeEntryChange={(updates) => {
                  updateFormData({
                    homeEntry: {
                      ...formData.homeEntry,
                      ...updates,
                    }
                  });
                }}
                // Ceiling Heights (Residential Detailed Home Mapping)
                ceilingHeights={formData.ceilingHeights}
                onCeilingHeightChange={(areaKey, height) => {
                  updateFormData({
                    ceilingHeights: {
                      ...formData.ceilingHeights,
                      [areaKey]: height,
                    }
                  });
                }}
                onBedroomCeilingChange={(bedroomId, height) => {
                  updateFormData({
                    ceilingHeights: {
                      ...formData.ceilingHeights,
                      bedrooms: {
                        ...(formData.ceilingHeights?.bedrooms || {}),
                        [bedroomId]: height,
                      }
                    }
                  });
                }}
                onHallwayCeilingChange={(hallwayId, height) => {
                  updateFormData({
                    ceilingHeights: {
                      ...formData.ceilingHeights,
                      hallways: {
                        ...(formData.ceilingHeights?.hallways || {}),
                        [hallwayId]: height,
                      }
                    }
                  });
                }}
                // === HOME MAPPING UTILITY AREAS (Single Source of Truth) ===
                homeMapping={formData.homeMapping}
                propertyType={formData.propertyType}
                onHomeMappingAreaChange={(areaKey, updates) => {
                  updateFormData({
                    homeMapping: {
                      ...formData.homeMapping,
                      areas: {
                        ...formData.homeMapping.areas,
                        [areaKey]: {
                          ...formData.homeMapping.areas[areaKey],
                          ...updates,
                        }
                      }
                    }
                  });
                }}
                // === KITCHEN SECTION TOGGLES (SSOT with Data Hygiene) ===
                roomSectionToggles={{
                  kitchen: getKitchenSectionToggles(formData)
                }}
                onRoomSectionToggle={(roomId, sectionKey, enabled) => {
                  if (roomId === 'kitchen') {
                    // Update the toggle state
                    const newToggles = {
                      ...formData.roomSectionToggles,
                      kitchen: {
                        ...formData.roomSectionToggles?.kitchen,
                        [sectionKey]: enabled
                      }
                    };
                    
                    // DATA HYGIENE: When toggling OFF, clear related selections
                    if (!enabled) {
                      if (sectionKey === 'insideAppliances') {
                        // Clear kitchen appliance addons + overrides
                        updateFormData({
                          roomSectionToggles: newToggles,
                          roomAddons: {
                            ...formData.roomAddons,
                            kitchen: [] // Clear all kitchen addons
                          },
                          kitchenDegreaseLevel: undefined,
                          kitchenCabinetOverride: 'typical', // Reset to default
                        });
                      } else if (sectionKey === 'windowInventory') {
                        // Clear kitchen window selections
                        updateFormData({
                          roomSectionToggles: newToggles,
                          roomWindowSelections: (formData.roomWindowSelections || [])
                            .filter(w => w.roomId !== 'kitchen')
                        });
                      }
                    } else {
                      // Just update the toggle
                      updateFormData({ roomSectionToggles: newToggles });
                    }
                  }
                }}
              />
            </div>
          )}

          {/* 6+ Bedroom Notice - Both modes */}
          {formData.homeSize === 6 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Large Home Pricing
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    For 6+ bedroom homes, we recommend our <strong>Hourly Premium Team</strong> service for accurate pricing, or{' '}
                    <a 
                      href={`https://nancyshousekeepingservice.com/contact-us/?city=${cityConfig.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline font-semibold"
                    >
                      contact us
                    </a>{' '}
                    for a custom quote.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bathroom Modules moved to UnifiedSpacesSection above */}

        {/* AREA-SPECIFIC CONDITION SELECTOR - Only for Deep Clean / Move-In-Out */}
        {shouldEnableAreaConditionFees(situation, formData.baseServiceLevel) && (
          <div className="border-t border-border/50 p-6 sm:p-8">
            <AreaConditionSelector />
          </div>
        )}

        {/* Landlord Receipt Toggle moved to StepDetails (MOVING flow) */}

        {/* ADDITIONAL STRUCTURES SECTION - Smart Visibility for Compound Properties */}
        {formData.propertyType && formData.serviceType && showAdditionalStructures && (
          <div className="border-t border-border/50 p-4 sm:p-6 lg:p-8">
            {/* Contextual intro for compound properties */}
            <div className="mb-4 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/30 dark:border-amber-700/30">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  🏛️ Compound Property Detected
                </span>
                {' '}— Properties 2,000+ sq ft with 2+ bedrooms often include detached structures
              </p>
            </div>
            <AdditionalStructuresSection
              language={language}
              isDeep={formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out'}
              isMoveOut={situation === 'MOVING' && moveContext === 'move_out'}
              guestHouseCount={formData.guestHouseCount}
              studioCount={formData.studioCount}
              poolHouseCount={formData.poolHouseCount}
              onGuestHouseCountChange={(count) => updateFormData({ guestHouseCount: count })}
              onStudioCountChange={(count) => updateFormData({ studioCount: count })}
              onPoolHouseCountChange={(count) => updateFormData({ poolHouseCount: count })}
              guestHouseConfigs={formData.guestHouseConfigs}
              artStudioConfigs={formData.artStudioConfigs}
              onGuestHouseConfigChange={(id, config) => {
                updateFormData({
                  guestHouseConfigs: {
                    ...formData.guestHouseConfigs,
                    [id]: { ...(formData.guestHouseConfigs[id] || defaultGuestHouseConfig(parseInt(id.split('_')[2]) || 0)), ...config }
                  }
                });
              }}
              onArtStudioConfigChange={(id, config) => {
                updateFormData({
                  artStudioConfigs: {
                    ...formData.artStudioConfigs,
                    [id]: { ...(formData.artStudioConfigs[id] || defaultArtStudioConfig(parseInt(id.split('_')[2]) || 0)), ...config }
                  }
                });
              }}
              maxFloors={maxFloors}
              showAreaHazards={formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out'}
            />
          </div>
        )}

        {/* ADDITIONAL DETAILS SECTION: Condition - Premium spacing */}
        <div className={cn(
          "border-t border-border/50 p-6 sm:p-8 space-y-10 rounded-b-2xl",
          isLargeEstate && !formData.serviceType ? "hidden" : "block"
        )}>
          {/* Legacy Home Condition - Compact Toggle Group (NON-gated flows ONLY) */}
          {!shouldEnableAreaConditionFees(situation, formData.baseServiceLevel || '') && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                {t(language, 'label.overall_condition')}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="hover:text-foreground transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs">
                      {t(language, 'label.condition_helper')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              
              {/* Segmented Control Row */}
              <div className="flex rounded-xl border-2 border-border overflow-hidden bg-muted/30">
                {conditionFees.map((fee, index) => {
                  const isActive = formData.conditionFee === fee.value;
                  const isHeavy = fee.value > 0;
                  const isLast = index === conditionFees.length - 1;
                  
                  return (
                    <TooltipProvider key={fee.value} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => updateFormData({ conditionFee: fee.value })}
                            className={cn(
                              "flex-1 py-4 px-3 sm:px-5 flex flex-col items-center justify-center gap-1 transition-all duration-200 focus:outline-none relative",
                              !isLast && "border-r border-border/50",
                              isActive
                                ? isHeavy
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "bg-primary/10 text-primary"
                                : "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <span className={cn(
                              "text-xs sm:text-sm font-medium text-center leading-tight",
                              isActive && "font-semibold"
                            )}>
                              {t(language, fee.labelKey)}
                            </span>
                            {fee.value > 0 && (
                              <span className={cn(
                                "text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full mt-0.5",
                                isActive
                                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                +${fee.value}
                              </span>
                            )}
                            {isActive && (
                              <div className={cn(
                                "absolute bottom-0 left-0 right-0 h-0.5",
                                isHeavy ? "bg-amber-500" : "bg-primary"
                              )} />
                            )}
                          </button>
                        </TooltipTrigger>
                        {fee.subKey && (
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                            {t(language, fee.subKey)}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* LUXURY FORK: Two options for large estates (3,000+ sq ft) */}
      {isLargeEstate && (
        <div className="pt-4 animate-fade-in space-y-4">
          {/* Section Header */}
          <div className="text-center space-y-2 pb-2">
            <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Choose Your Estate Service
            </h3>
            <p className="text-sm text-muted-foreground">
              Properties over 3,000 sq ft qualify for premium options
            </p>
          </div>

          {/* Option A: Professional Hourly (Existing) */}
          <Card 
            className={cn(
              "group relative overflow-hidden p-5 cursor-pointer transition-all duration-300",
              "border-2 border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg"
            )}
            onClick={handleSwitchToHourly}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-md flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-bold text-foreground">Professional Hourly</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Flexible
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-snug mb-2">
                  Flexible Priority List • 2-person team at $45/hr each
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    2-person team
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    You set the hours
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </Card>

          {/* Option B: Estate Signature Clean (NEW - Premium Flat Rate) */}
          <Card 
            className={cn(
              "group relative overflow-hidden p-5 cursor-pointer transition-all duration-300",
              "border-2 border-amber-400 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10",
              "hover:border-amber-500 hover:shadow-xl"
            )}
            onClick={handleEstateSignature}
          >
            {/* Premium Badge */}
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md">
                <Crown className="w-3 h-3" />
                {t(language, 'estate.badge')}
              </span>
            </div>

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <DollarSign className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-bold text-foreground">Estate Signature Clean</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-snug mb-2">
                  Premium flat rate • Guaranteed outcome, no surprises
                </p>
                {/* Premium Label - No price shown */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-500">
                    Premium Flat Rate
                  </span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                    Quote on next step
                  </span>
                </div>
                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t(language, 'estate.feature_insured')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Full coverage guaranteed
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Button - visible on mobile */}
            <div className="mt-4 sm:hidden">
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEstateSignature();
                }}
                className={cn(
                  "w-full h-12 rounded-full font-bold text-sm",
                  "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500",
                  "text-white shadow-lg"
                )}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Select Estate Clean
              </Button>
            </div>
          </Card>
        </div>
      )}


      {/* Bottom Reassurance */}
      <div className="pt-2 text-center">
        <p className="text-xs text-muted-foreground/80 italic">
          {t(language, 'step1.reassurance')}
        </p>
      </div>
    </div>
  );
}
