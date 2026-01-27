import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { 
  Users, Clock, Sparkles, ShieldCheck, Package, Calendar, Car, Zap, Check, Star, 
  DollarSign, CalendarDays, Home, AlertTriangle, Bath, Bed, ChefHat, 
  Sofa, Ruler, Building2, Layers, AlertCircle, Waves, Mountain, 
  Gem, Footprints, Target, ListOrdered, Timer, Hand, Dog, Key, Lock, ShieldAlert,
  Castle, Sun, Crown, Briefcase, Utensils, Shirt, X, Plus, ChevronDown,
  Trash2, AlertOctagon, PartyPopper, FolderOpen, Boxes
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  HOURLY_FREQUENCY_RATES, HourlyFrequency, HOURLY_CONFIG, HOURLY_SQFT_OPTIONS, 
  CLEANING_DENSITY_OPTIONS, ESTATE_SQFT_THRESHOLD, CleaningDensity, ADDON_TIMES,
  ACCESS_TYPE_OPTIONS, DELICATE_SURFACE_OPTIONS, HOME_CONDITION_OPTIONS,
  HOURLY_INTENT_OPTIONS, OVERTIME_PROTOCOL_OPTIONS, HOURLY_MUST_HAVE_OPTIONS,
  OCCUPANCY_OPTIONS,
  PROPERTY_CATEGORY_OPTIONS, HOME_STORIES_OPTIONS, ELEVATOR_ACCESS_OPTIONS,
  getRelevantAreasToInclude, getRelevantAreasToSkip, getRelevantPriorityOptions, PropertyCategoryType,
  getAspirationTitle, getPromise, getClientPitch, getSpecialistProfile,
  getIntentFieldConfig
} from '@/lib/pricing';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateEstateHours, getSqftMidpoint, getTaskTimeEstimate } from '@/lib/hourlyLogic';
import { useMemo, useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LevelPickerSheet, LevelOption } from '@/components/cleaning/LevelPickerSheet';

const HOUR_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12];
const DAYS_OPTIONS = [2, 3, 4, 5];

const FREQUENCY_OPTIONS: { value: HourlyFrequency; badge?: string }[] = [
  { value: 'daily', badge: 'best_value' },
  { value: 'weekly' },
  { value: 'biweekly' },
  { value: 'monthly' },
  { value: 'onetime' },
];

// Monthly multipliers for investment summary
const FREQUENCY_MONTHLY_MULTIPLIERS: Record<HourlyFrequency, (daysPerWeek: number) => number> = {
  daily: (days) => days * 4.3,
  weekly: () => 4.3,
  biweekly: () => 2.15,
  monthly: () => 1,
  onetime: () => 1,
};

// Concierge tasks available for Move-In hourly mode
const HOURLY_TASK_OPTIONS = [
  { id: 'oven', label: 'Inside Oven', icon: ChefHat },
  { id: 'fridge_empty', label: 'Inside Fridge', icon: Package },
  { id: 'cabinets', label: 'Inside Cabinets', icon: Layers },
  { id: 'interior_windows', label: 'Interior Windows', icon: Sparkles },
];

// Deep Scrub Extras - Time injectors (same UX as Move-In/Out)
const DEEP_SCRUB_TASK_OPTIONS = [
  { id: 'oven', label: 'Inside Oven', icon: ChefHat, baseMinutes: 45 },
  { id: 'fridge_empty', label: 'Inside Fridge', icon: Package, baseMinutes: 36 },
  { id: 'hood', label: 'Range Hood', icon: Zap, baseMinutes: 30 },
  { id: 'cabinets', label: 'Inside Cabinets', icon: Layers, baseMinutes: 60 },
  { id: 'ceiling_fan', label: 'Ceiling Fans', icon: Sun, baseMinutes: 10 },
  { id: 'baseboards', label: 'Baseboards (Full)', icon: Footprints, baseMinutes: 45 },
];

// Access type icons mapping
const ACCESS_ICONS: Record<string, React.ReactNode> = {
  car: <Car className="w-5 h-5" />,
  stairs: <Mountain className="w-5 h-5" />,
  gate: <Home className="w-5 h-5" />,
};

// Property type icons mapping
const PROPERTY_TYPE_ICONS: Record<string, React.ReactNode> = {
  building: <Building2 className="w-5 h-5" />,
  building2: <Building2 className="w-5 h-5" />,
  home: <Home className="w-5 h-5" />,
  castle: <Castle className="w-5 h-5" />,
  sun: <Sun className="w-5 h-5" />,
  gem: <Gem className="w-5 h-5" />,
  crown: <Crown className="w-5 h-5" />,
};

// Area icons mapping
const AREA_ICONS: Record<string, React.ReactNode> = {
  'chef-hat': <ChefHat className="w-4 h-4" />,
  'sofa': <Sofa className="w-4 h-4" />,
  'utensils': <Utensils className="w-4 h-4" />,
  'briefcase': <Briefcase className="w-4 h-4" />,
  'shirt': <Shirt className="w-4 h-4" />,
  'door-open': <Home className="w-4 h-4" />,
  'car': <Car className="w-4 h-4" />,
  'sun': <Sun className="w-4 h-4" />,
  'wine': <Gem className="w-4 h-4" />,
  'tv': <Layers className="w-4 h-4" />,
  'dumbbell': <Zap className="w-4 h-4" />,
};

export function StepHourlyConfig() {
  const { 
    language, 
    formData, 
    updateFormData,
    calculateHourlyTotal,
    getHourlyRate,
  } = useBooking();

  // Calculate estate-aware recommendation
  const estateCalculation = useMemo(() => calculateEstateHours(formData), [formData]);
  const recommendedHours = estateCalculation.minHours;
  
  // Track whether user has manually overridden the recommendation
  const [hasManuallySelectedHours, setHasManuallySelectedHours] = useState(false);
  const initialLoadRef = useRef(true);
  
  // Effect: Auto-select recommended hours on initial load
  useEffect(() => {
    if (initialLoadRef.current && recommendedHours >= 2) {
      // Only auto-set if hours are at default (2) and recommendation is valid
      if (formData.hourlyHours === 2 && recommendedHours > 2) {
        updateFormData({ hourlyHours: recommendedHours });
      }
      initialLoadRef.current = false;
    }
  }, [recommendedHours]);
  
  // Effect: Re-sync to recommended when key inputs change (if not manually overridden)
  useEffect(() => {
    // Skip initial render
    if (initialLoadRef.current) return;
    
    // Only auto-update if user hasn't manually selected hours
    if (!hasManuallySelectedHours && recommendedHours !== formData.hourlyHours) {
      updateFormData({ hourlyHours: recommendedHours });
    }
  }, [
    recommendedHours,
    formData.hourlyTotalSqft,
    formData.hourlyIntent,
    formData.hourlyTotalBeds,
    formData.hourlyTotalBaths,
    formData.accessType,
    formData.homeConditionLevel,
  ]);
  
  // Effect: Persist AITimeReceipt to formData whenever calculation updates
  useEffect(() => {
    if (estateCalculation?.aiTimeReceipt) {
      updateFormData({ 
        hourlyTimeReceipt: estateCalculation.aiTimeReceipt,
        hourlyRecommendedTeamSize: estateCalculation.recommendedTeamSize,
        hourlyClockHours: estateCalculation.clockHours,
        hourlyLaborHours: estateCalculation.laborHours,
        hourlyTeamRationale: estateCalculation.aiTimeReceipt.teamSizing.rationale,
      });
    }
  }, [estateCalculation]);
  
  // Detect if this is an estate property
  const totalSqft = getSqftMidpoint(formData.hourlyTotalSqft);
  const isEstate = totalSqft > ESTATE_SQFT_THRESHOLD;

  // Use dynamic team size for hourly total
  const teamSize = formData.hourlyTeamSize || HOURLY_CONFIG.TEAM_SIZE;
  const totalLaborHours = Math.max(formData.hourlyHours, HOURLY_CONFIG.MIN_CLOCK_HOURS) * teamSize;
  const rate = getHourlyRate();
  const total = calculateHourlyTotal();

  // Calculate weekly labor hours for daily frequency
  const weeklyLaborHours = formData.hourlyFrequency === 'daily' 
    ? formData.hourlyHours * teamSize * formData.daysPerWeek
    : totalLaborHours;

  // Calculate monthly estimate
  const getMonthlyEstimate = () => {
    const multiplier = FREQUENCY_MONTHLY_MULTIPLIERS[formData.hourlyFrequency || 'onetime'](formData.daysPerWeek);
    return Math.round(total * multiplier);
  };

  // Dynamic Maintenance Summary based on Intent × Frequency intersection
  const getMaintenanceSummary = useMemo(() => {
    const freq = formData.hourlyFrequency || 'onetime';
    const intent = formData.hourlyIntent || 'priority_focus';
    
    // === DAILY: Labor Only Mode (The Keeper special case) ===
    if (freq === 'daily') {
      return {
        focus: t(language, 'hourly.summary_daily_focus'),
        description: t(language, 'hourly.summary_daily_desc'),
        badge: t(language, 'hourly.badge_labor_only'),
        badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        isLaborOnly: true,
      };
    }
    
    // Weekly/Bi-Weekly: Consistency Mode
    if (freq === 'weekly' || freq === 'biweekly') {
      if (intent === 'routine_maintenance') {
        // The Keeper + High Frequency = Pure Maintenance
        return {
          focus: t(language, 'hourly.summary_keeper_weekly_focus'),
          description: t(language, 'hourly.summary_keeper_weekly_desc'),
          badge: t(language, 'hourly.badge_consistency'),
          badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        };
      }
      // Other intents + High Frequency
      return {
        focus: t(language, 'hourly.summary_weekly_focus'),
        description: t(language, 'hourly.summary_weekly_desc'),
        badge: t(language, 'hourly.badge_high_freq'),
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      };
    }
    
    // Monthly: Deep Maintenance Mode
    if (freq === 'monthly') {
      if (intent === 'routine_maintenance') {
        // The Keeper + Monthly = Deep Reset
        return {
          focus: t(language, 'hourly.summary_keeper_monthly_focus'),
          description: t(language, 'hourly.summary_keeper_monthly_desc'),
          badge: t(language, 'hourly.badge_deep_reset'),
          badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        };
      }
      // Other intents + Monthly
      return {
        focus: t(language, 'hourly.summary_monthly_focus'),
        description: t(language, 'hourly.summary_monthly_desc'),
        badge: t(language, 'hourly.badge_monthly'),
        badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
      };
    }
    
    // One-Time: Priority Focus
    return {
      focus: t(language, 'hourly.summary_onetime_focus'),
      description: t(language, 'hourly.summary_onetime_desc'),
      badge: t(language, 'hourly.badge_single'),
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
  }, [formData.hourlyFrequency, formData.hourlyIntent, language]);
  
  // Legacy function for backward compatibility
  const getFrequencyDescription = () => getMaintenanceSummary.description;

  // Note: Intensity is now auto-synced from Service Intent selection

  const handleFrequencyChange = (frequency: HourlyFrequency) => {
    if (frequency !== 'onetime') {
      updateFormData({ hourlyFrequency: frequency, hourlySupplies: 'company' });
    } else {
      updateFormData({ hourlyFrequency: frequency });
    }
  };

  // Safe values with fallbacks to prevent NaN
  const totalBeds = formData.hourlyTotalBeds ?? 3;
  const totalBaths = formData.hourlyTotalBaths ?? 2;
  const bedsToClean = formData.hourlyBedsToClean ?? 2;
  const bathsToClean = formData.hourlyBathsToClean ?? 2;
  
  // Estate fields
  const guestHouseCount = formData.guestHouseCount ?? 0;
  const studioCount = (formData as any).studioCount ?? 0;
  const poolHouseCount = formData.poolHouseCount ?? 0;
  const cleaningDensity = formData.cleaningDensity ?? 'entire';
  const isMovingHourly = formData.isMovingHourly ?? false;
  const hourlyTasks = formData.hourlyTasks ?? [];

  // New fields - Property Category (compact 2-option)
  const propertyCategory = (formData.propertyCategory ?? 'single_family') as PropertyCategoryType;
  const homeStories = formData.homeStories ?? 1;
  const unitFloorLevel = formData.unitFloorLevel ?? 1;
  const hasElevatorAccess = formData.hasElevatorAccess ?? true;
  
  // Areas - now dynamically filtered
  const hourlyAreasToInclude = formData.hourlyAreasToInclude ?? ['kitchen', 'living_room'];
  const hourlyAreasToSkip = formData.hourlyAreasToSkip ?? [];
  
  // Get dynamically filtered areas based on property context
  const relevantAreasToInclude = useMemo(() => 
    getRelevantAreasToInclude(propertyCategory, formData.hourlyTotalSqft, totalBeds),
    [propertyCategory, formData.hourlyTotalSqft, totalBeds]
  );
  
  const relevantAreasToSkip = useMemo(() => 
    getRelevantAreasToSkip(propertyCategory, formData.hourlyTotalSqft, totalBeds),
    [propertyCategory, formData.hourlyTotalSqft, totalBeds]
  );
  
  // Get dynamically filtered priority options based on property context
  const relevantPriorityOptions = useMemo(() => 
    getRelevantPriorityOptions(propertyCategory, formData.hourlyTotalSqft, totalBeds, totalBaths, hourlyAreasToInclude),
    [propertyCategory, formData.hourlyTotalSqft, totalBeds, totalBaths, hourlyAreasToInclude]
  );

  // South Coast fields
  const accessType = formData.accessType ?? 'standard';
  const hasDelicateSurfaces = formData.hasDelicateSurfaces ?? false;
  const delicateSurfaceTypes = formData.delicateSurfaceTypes ?? [];
  const homeConditionLevel = formData.homeConditionLevel ?? 'lived_in';
  const hourlyMustHaves = formData.hourlyMustHaves ?? [];
  const hourlyNiceToHaves = formData.hourlyNiceToHaves ?? '';
  const overtimeProtocol = formData.overtimeProtocol ?? 'strict';
  const hourlyIntent = formData.hourlyIntent ?? 'priority_focus';
  const hourlyTeamSize = formData.hourlyTeamSize ?? 2;
  
  // Get dynamic field configuration for current intent
  const intentConfig = useMemo(() => getIntentFieldConfig(hourlyIntent), [hourlyIntent]);

  // High-Perception Logistic Engineering fields
  const isPropertyOccupied = formData.isPropertyOccupied ?? true;
  const hasPetsToSecure = formData.hasPetsToSecure ?? false;
  const scopeExclusionsConfirmed = formData.scopeExclusionsConfirmed ?? false;
  
  // === INTENT-SPECIFIC FIELD VALUES ===
  // The Keeper (Routine Maintenance)
  const lifestyleAddons = formData.lifestyleAddons ?? { 
    laundryLoads: 0, 
    dishwasher: false, 
    bedMaking: false,
    plantCare: false,
    trashOut: false,
    mailSort: false,
    petBowls: false,
  };
  const hasSheddingPets = formData.hasSheddingPets ?? false;
  
  // Efficiency Expert (Priority Focus)
  const budgetHours = formData.budgetHours ?? 3;
  const priorityRanking = formData.priorityRanking ?? [];
  const priorityAreas = formData.priorityAreas ?? [];
  const scopeExclusionConfirmed = formData.scopeExclusionConfirmed ?? false;
  
  // Heavy-Lifter (Deep Scrub)
  const grimeLevel = formData.grimeLevel ?? 'standard';
  const hasNaturalStone = formData.hasNaturalStone ?? false;
  const pullOutAppliances = formData.pullOutAppliances ?? false;
  
  // Recovery Team (Post-Event)
  const debrisBags = formData.debrisBags ?? 3;
  const hasStickySpills = formData.hasStickySpills ?? false;
  const hasBiohazard = formData.hasBiohazard ?? false;
  const mustFinishBy = formData.mustFinishBy ?? '';
  
  // Home Assistant (Organization)
  const organizationTasks = formData.organizationTasks ?? [];
  const noScrubAcknowledged = formData.noScrubAcknowledged ?? false;
  
  // The Finisher (Move-In/Out)
  const isHome100Empty = formData.isHome100Empty ?? null;
  const needsLandlordReceipt = formData.needsLandlordReceipt ?? false;
  
  const { toast } = useToast();

  // Effect: Auto-set frequency when intent changes to a locked intent
  useEffect(() => {
    const config = getIntentFieldConfig(hourlyIntent);
    const allowedFreqs = config.allowedFrequencies as readonly HourlyFrequency[];
    const currentFreq = (formData.hourlyFrequency || 'onetime') as HourlyFrequency;
    
    // If current frequency is not allowed for this intent, switch to first allowed
    if (!allowedFreqs.includes(currentFreq)) {
      const newFrequency = allowedFreqs[0];
      updateFormData({ hourlyFrequency: newFrequency });
      
      // Show toast for user awareness
      const intentLabels: Record<string, string> = {
        move_in_out: 'Move-In/Out',
        post_event: 'Post-Event Cleanup',
        routine_maintenance: 'Routine Maintenance',
      };
      const freqLabels: Record<HourlyFrequency, string> = {
        onetime: 'One-Time',
        weekly: 'Weekly',
        biweekly: 'Bi-Weekly',
        daily: 'Daily',
        monthly: 'Monthly',
      };
      toast({
        title: "Frequency Updated",
        description: `${intentLabels[hourlyIntent] || 'This service'} is set to ${freqLabels[newFrequency]}.`,
      });
    }
  }, [hourlyIntent]);

  // Auto-derive vertical logistics from Structure section
  const verticalLogistics = useMemo(() => {
    if (propertyCategory === 'apartment_condo') {
      if (unitFloorLevel === 1) {
        return 'ground';
      } else if (hasElevatorAccess) {
        return 'elevator';
      } else {
        return 'walkup';
      }
    }
    // Single family homes = ground level
    return 'ground';
  }, [propertyCategory, unitFloorLevel, hasElevatorAccess]);

  // Helper to update scope counts ensuring they don't exceed totals
  const updateBedsToClean = (value: number) => {
    updateFormData({ hourlyBedsToClean: Math.min(value, totalBeds) });
  };

  const updateBathsToClean = (value: number) => {
    updateFormData({ hourlyBathsToClean: Math.min(value, totalBaths) });
  };

  // When total beds/baths change, adjust scope if needed
  const handleTotalBedsChange = (value: number) => {
    updateFormData({ 
      hourlyTotalBeds: value,
      hourlyBedsToClean: Math.min(bedsToClean, value)
    });
  };

  const handleTotalBathsChange = (value: number) => {
    updateFormData({ 
      hourlyTotalBaths: value,
      hourlyBathsToClean: Math.min(bathsToClean, value)
    });
  };

  // Toggle hourly task
  const toggleHourlyTask = (taskId: string) => {
    const newTasks = hourlyTasks.includes(taskId)
      ? hourlyTasks.filter(t => t !== taskId)
      : [...hourlyTasks, taskId];
    updateFormData({ hourlyTasks: newTasks });
  };

  // Toggle delicate surface type
  const toggleDelicateSurface = (surfaceType: 'stone' | 'clay' | 'beams') => {
    const newTypes = delicateSurfaceTypes.includes(surfaceType)
      ? delicateSurfaceTypes.filter(t => t !== surfaceType)
      : [...delicateSurfaceTypes, surfaceType];
    updateFormData({ 
      delicateSurfaceTypes: newTypes,
      hasDelicateSurfaces: newTypes.length > 0
    });
  };

  // Toggle must-have priority (max 3)
  const toggleMustHave = (priorityId: string) => {
    if (hourlyMustHaves.includes(priorityId)) {
      updateFormData({ hourlyMustHaves: hourlyMustHaves.filter(p => p !== priorityId) });
    } else if (hourlyMustHaves.length < 3) {
      updateFormData({ hourlyMustHaves: [...hourlyMustHaves, priorityId] });
    }
  };

  // Toggle area to include
  const toggleAreaToInclude = (areaId: string) => {
    const newAreas = hourlyAreasToInclude.includes(areaId)
      ? hourlyAreasToInclude.filter((a: string) => a !== areaId)
      : [...hourlyAreasToInclude, areaId];
    updateFormData({ hourlyAreasToInclude: newAreas } as any);
  };

  // Toggle area to skip
  const toggleAreaToSkip = (areaId: string) => {
    const newAreas = hourlyAreasToSkip.includes(areaId)
      ? hourlyAreasToSkip.filter((a: string) => a !== areaId)
      : [...hourlyAreasToSkip, areaId];
    updateFormData({ hourlyAreasToSkip: newAreas } as any);
  };
  
  // Toggle organization task (for Home Assistant intent - legacy flat-rate tasks)
  const toggleOrganizationTask = (taskId: string) => {
    const newTasks = organizationTasks.includes(taskId)
      ? organizationTasks.filter(t => t !== taskId)
      : [...organizationTasks, taskId];
    updateFormData({ organizationTasks: newTasks });
  };
  
  // Get organization task counts with fallback
  const organizationTaskCounts = formData.organizationTaskCounts || {
    laundry_loads: 0, closets: 0, toy_rooms: 0,
    desk_areas: 0, linen_closets: 0, bathroom_drawers: 0
  };
  
  // Update organization per-unit task count
  const updateOrgTaskCount = (key: keyof typeof organizationTaskCounts, delta: number, max: number) => {
    const currentValue = organizationTaskCounts[key] || 0;
    const newValue = Math.max(0, Math.min(max, currentValue + delta));
    updateFormData({
      organizationTaskCounts: { ...organizationTaskCounts, [key]: newValue }
    });
  };
  
  // Adjust laundry loads helper
  const adjustLaundryLoads = (delta: number) => {
    const newLoads = Math.max(0, Math.min(10, lifestyleAddons.laundryLoads + delta));
    updateFormData({ 
      lifestyleAddons: { ...lifestyleAddons, laundryLoads: newLoads }
    });
  };
  
  // Note: The Keeper now supports all frequencies - no blocking required
  // Daily = Labor Only ($35/hr), Weekly/Bi-Weekly = $45/hr, Monthly = $50/hr with deep buffer

  const isRecurring = formData.hourlyFrequency && formData.hourlyFrequency !== 'onetime';
  const isDaily = formData.hourlyFrequency === 'daily';
  const monthlyEstimate = getMonthlyEstimate();
  
  // Check if selected hours are less than recommended
  const hoursShortfall = recommendedHours - formData.hourlyHours;
  const isUnderRecommended = hoursShortfall > 0;

  // Calculate effective cleaning time after friction
  const effectiveCleaningPercent = Math.round(estateCalculation.conditionEfficiency * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Header with Dynamic Maintenance Summary */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          {t(language, 'hourly.badge')}
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {t(language, 'hourly.title')}
        </h2>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          🦎 REPTILE BRAIN: Safety & Basics (What is this? How often?)
          ═══════════════════════════════════════════════════════════════════════════ */}

      {/* SECTION 1: UNIFIED SERVICE INTENT (Agency Model - Specialist Matching) */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-2xl p-5 space-y-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
          <Target className="w-4 h-4 text-primary" />
          Service Intent
        </div>
        <p className="text-xs text-muted-foreground">
          We match you with the right specialist profile for your needs.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HOURLY_INTENT_OPTIONS.map((option) => {
            const isSelected = hourlyIntent === option.value;
            const IconComponent = option.icon === 'target' ? Target : 
                                  option.icon === 'sparkles' ? Sparkles :
                                  option.icon === 'shield' ? ShieldCheck :
                                  option.icon === 'key' ? Key :
                                  option.icon === 'party' ? Zap : Package;
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  updateFormData({ 
                    hourlyIntent: option.value,
                    // Only set intensity for valid HourlyIntensity types
                    ...(option.intensity !== 'moveInOut' ? { hourlyIntensity: option.intensity as 'basic' | 'deep' } : { hourlyIntensity: 'deep' }),
                    ...(option.value === 'deep_scrub' || option.value === 'move_in_out' ? { hourlySupplies: 'company' } : {}),
                  });
                }}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all relative",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary"
                    : "border-border hover:border-primary/50 bg-background"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isSelected ? "bg-primary/20" : "bg-muted"
                  )}>
                    <IconComponent className={cn(
                      "w-5 h-5",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    {/* Aspirational Title Badge */}
                    <div className="text-[10px] uppercase tracking-widest text-primary/70 font-medium mb-0.5">
                      {option.aspirationalTitle}
                    </div>
                    
                    {/* Main Label + Time Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-semibold text-sm",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {option.label}
                      </span>
                      {'badge' in option && option.badge && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded uppercase">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    
                    {/* Promise Statement */}
                    <div className="text-xs font-medium text-primary/80 mt-1">
                      {option.promise}
                    </div>
                    
                    {/* Description */}
                    <div className="text-xs text-muted-foreground mt-1.5">{option.description}</div>
                    
                    {/* Specialist Profile (shown when selected) */}
                    {isSelected && (
                      <div className="mt-3 pt-2 border-t border-primary/20 text-[10px] text-primary/70">
                        <strong>Specialist:</strong> {option.specialistProfile}
                      </div>
                    )}
                    
                    {/* Scope Warning for Organization */}
                    {'scopeWarning' in option && option.scopeWarning && isSelected && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg text-[10px] text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {option.scopeWarning}
                      </div>
                    )}
                    
                    {'note' in option && option.note && isSelected && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-medium">
                        ⚠️ {option.note}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Move-In/Out premium display removed - content now in Deposit Guarantee Checklist after Areas section */}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          INTENT-SPECIFIC CONDITIONAL FIELD SECTIONS
          Each intent displays ONLY relevant fields to reduce decision fatigue
          ═══════════════════════════════════════════════════════════════════════════ */}

      {/* THE KEEPER - Uses shared sections below (Property Structure, Composition, Areas, Logistics, Priority Triage) */}

      {/* EFFICIENCY EXPERT - Uses shared sections only (Property Structure, Composition, Areas, Logistics, Priority Triage) */}

      {/* HEAVY-LIFTER - Grime Level Selector Only (Extras moved after Areas) */}
      {hourlyIntent === 'deep_scrub' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-2xl p-4 sm:p-6 space-y-4 border border-orange-200 dark:border-orange-800 shadow-sm">
            {/* Premium Section Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span className="text-xs uppercase tracking-widest text-orange-700 dark:text-orange-300 font-semibold">
                  The Heavy-Lifter
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Grime Assessment</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Help us understand the level of buildup so we can allocate time properly.
              </p>
            </div>
            
            {/* Grime Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateFormData({ grimeLevel: 'standard' })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  grimeLevel === 'standard' 
                    ? "border-orange-500 bg-orange-100 dark:bg-orange-900/40 shadow-md" 
                    : "border-border bg-background hover:border-orange-300"
                )}
              >
                <div className="font-semibold text-sm text-foreground">Standard Deep Clean</div>
                <div className="text-xs text-muted-foreground mt-1">Baseboards, fans, light switches</div>
              </button>
              <button
                type="button"
                onClick={() => updateFormData({ grimeLevel: 'recovery' })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  grimeLevel === 'recovery' 
                    ? "border-orange-500 bg-orange-100 dark:bg-orange-900/40 shadow-md" 
                    : "border-border bg-background hover:border-orange-300"
                )}
              >
                <div className="font-semibold text-sm text-foreground">Recovery Mode</div>
                <div className="text-xs text-muted-foreground mt-1">Heavy grease, soap scum buildup</div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">+30% time</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECOVERY TEAM - Post-Event / Party Cleanup Section */}
      {hourlyIntent === 'post_event' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-2xl p-4 sm:p-6 space-y-5 border border-pink-200 dark:border-pink-800 shadow-sm">
            
            {/* Premium Section Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 dark:bg-pink-900/50 rounded-full">
                <PartyPopper className="w-4 h-4 text-pink-600" />
                <span className="text-xs uppercase tracking-widest text-pink-700 dark:text-pink-300 font-semibold">
                  The Recovery Team
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Post-Event Assessment</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Help us understand the scope so we can send the right team and supplies.
              </p>
            </div>
            
            {/* 1. Event Type Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                What type of event?
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'party', label: 'House Party', icon: '🎉' },
                  { id: 'wedding', label: 'Wedding/Reception', icon: '💒' },
                  { id: 'corporate', label: 'Corporate Event', icon: '🏢' },
                  { id: 'family', label: 'Family Gathering', icon: '👨‍👩‍👧‍👦' },
                  { id: 'holiday', label: 'Holiday Party', icon: '🎄' },
                  { id: 'other', label: 'Other Event', icon: '📅' },
                ].map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => updateFormData({ eventType: event.id as any })}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all min-h-[70px]",
                      formData.eventType === event.id
                        ? "border-pink-500 bg-pink-100 dark:bg-pink-900/40 shadow-md"
                        : "border-border bg-background hover:border-pink-300"
                    )}
                  >
                    <div className="text-xl mb-1">{event.icon}</div>
                    <div className="text-xs font-medium">{event.label}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 2. Guest Count */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-500" />
                Approximate guest count?
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: '1-10', label: '1-10' },
                  { id: '10-25', label: '10-25' },
                  { id: '25-50', label: '25-50' },
                  { id: '50-100', label: '50-100' },
                  { id: '100+', label: '100+' },
                ].map((count) => (
                  <button
                    key={count.id}
                    type="button"
                    onClick={() => updateFormData({ eventGuestCount: count.id as any })}
                    className={cn(
                      "py-3 rounded-lg border-2 text-center font-bold transition-all",
                      formData.eventGuestCount === count.id
                        ? "border-pink-500 bg-pink-100 dark:bg-pink-900/40"
                        : "border-border hover:border-pink-300"
                    )}
                  >
                    {count.label}
                  </button>
                ))}
              </div>
              {formData.eventGuestCount === '100+' && (
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-xs text-pink-800 dark:text-pink-200">
                  Large event detected. Additional team members may be recommended.
                </div>
              )}
            </div>
            
            {/* 3. Affected Areas (Multi-select) */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Home className="w-4 h-4 text-pink-500" />
                Which areas need attention?
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
                  { id: 'living', label: 'Living/Dining', icon: '🛋️' },
                  { id: 'bathrooms', label: 'Bathrooms', icon: '🚿' },
                  { id: 'outdoor', label: 'Outdoor/Patio', icon: '☀️' },
                  { id: 'garage', label: 'Garage', icon: '🚗' },
                  { id: 'bedrooms', label: 'Bedrooms', icon: '🛏️' },
                ].map((area) => {
                  const isSelected = (formData.affectedAreas || []).includes(area.id);
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => {
                        const current = formData.affectedAreas || [];
                        const newAreas = isSelected 
                          ? current.filter(a => a !== area.id)
                          : [...current, area.id];
                        updateFormData({ affectedAreas: newAreas });
                      }}
                      className={cn(
                        "p-3 rounded-xl border-2 flex items-center gap-2 transition-all min-h-[48px]",
                        isSelected
                          ? "border-pink-500 bg-pink-100 dark:bg-pink-900/40"
                          : "border-border bg-background hover:border-pink-300"
                      )}
                    >
                      <span className="text-lg">{area.icon}</span>
                      <span className="text-sm font-medium">{area.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* 4. Mess Types (Multi-select) */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-pink-500" />
                What types of mess?
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'food_spills', label: 'Food Spills', desc: 'Dropped food, crumbs, plates' },
                  { id: 'drink_stains', label: 'Drink Stains', desc: 'Wine, beer, cocktails' },
                  { id: 'grease', label: 'Grease/Oil', desc: 'Kitchen cooking residue' },
                  { id: 'confetti', label: 'Confetti/Decorations', desc: 'Party decorations, balloons' },
                  { id: 'candle_wax', label: 'Candle Wax', desc: 'Dripped wax on surfaces' },
                  { id: 'broken_items', label: 'Broken Items', desc: 'Glass, ceramics to dispose' },
                ].map((mess) => {
                  const isSelected = (formData.messTypes || []).includes(mess.id);
                  return (
                    <button
                      key={mess.id}
                      type="button"
                      onClick={() => {
                        const current = formData.messTypes || [];
                        const newTypes = isSelected 
                          ? current.filter(m => m !== mess.id)
                          : [...current, mess.id];
                        updateFormData({ messTypes: newTypes });
                      }}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        isSelected
                          ? "border-pink-500 bg-pink-100 dark:bg-pink-900/40"
                          : "border-border bg-background hover:border-pink-300"
                      )}
                    >
                      <div className="text-sm font-medium">{mess.label}</div>
                      <div className="text-xs text-muted-foreground">{mess.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* 5. Debris Volume Slider */}
            <div className="space-y-4 p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-pink-200 dark:border-pink-700">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-pink-500" />
                Trash Bag Estimate
              </Label>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">1 bag</span>
                <Slider 
                  value={[debrisBags]}
                  min={1} 
                  max={15}
                  step={1}
                  onValueChange={([val]) => updateFormData({ debrisBags: val })}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">15+</span>
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold text-pink-600 dark:text-pink-400">{debrisBags}</span>
                <span className="text-sm text-muted-foreground ml-2">bags estimated</span>
              </div>
              {debrisBags >= 5 && (
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-xs text-pink-800 dark:text-pink-200 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Contractor bags + haul-away service may be recommended
                </div>
              )}
            </div>
            
            {/* 6. Safety & Hazard Toggles */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Safety & Hazard Check</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-pink-200 dark:border-pink-700">
                  <div>
                    <span className="text-sm font-medium">Sticky spills on floors?</span>
                    <p className="text-xs text-muted-foreground">Alcohol, soda, sugary drinks</p>
                  </div>
                  <Switch 
                    checked={hasStickySpills}
                    onCheckedChange={(checked) => updateFormData({ hasStickySpills: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-pink-200 dark:border-pink-700">
                  <div>
                    <span className="text-sm font-medium">Furniture needs resetting?</span>
                    <p className="text-xs text-muted-foreground">Tables, chairs moved for event</p>
                  </div>
                  <Switch 
                    checked={formData.furnitureNeedsResetting || false}
                    onCheckedChange={(checked) => updateFormData({ furnitureNeedsResetting: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-pink-200 dark:border-pink-700">
                  <div>
                    <span className="text-sm font-medium">Biological hazards?</span>
                    <p className="text-xs text-red-500">Requires specialized handling</p>
                  </div>
                  <Switch 
                    checked={hasBiohazard}
                    onCheckedChange={(checked) => updateFormData({ hasBiohazard: checked })}
                  />
                </div>
              </div>
              {hasBiohazard && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  Biohazard surcharge applies. Specialized team will be assigned.
                </div>
              )}
            </div>
            
            {/* 7. Time Sensitivity */}
            <div className="space-y-2 p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-pink-200 dark:border-pink-700">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-500" />
                Must be finished by:
              </Label>
              <p className="text-xs text-muted-foreground">If you have a hard deadline for this cleanup</p>
              <Input 
                type="time"
                value={mustFinishBy}
                onChange={(e) => updateFormData({ mustFinishBy: e.target.value })}
                className="w-full"
              />
            </div>
            
          </div>
        </div>
      )}

      {/* HOME ASSISTANT - Organization Section - MOVED to after Areas to SKIP section below */}

      {/* THE FINISHER - Critical Occupancy Check Only (Deposit Checklist moved after Areas) */}
      {hourlyIntent === 'move_in_out' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-4 sm:p-6 space-y-4 border border-emerald-200 dark:border-emerald-800 shadow-sm">
            {/* Premium Section Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                <Key className="w-4 h-4 text-emerald-600" />
                <span className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-semibold">
                  The Finisher
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Critical Check</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Move-In/Out cleaning is designed for completely vacant properties.
              </p>
            </div>
            
            {/* Occupancy Question */}
            <div className="space-y-3">
              <Label className="flex items-center justify-center gap-2 text-sm font-medium">
                Is the home 100% empty of furniture and trash?
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData({ isHome100Empty: true })}
                  className={cn(
                    "p-4 rounded-xl border-2 font-bold transition-all",
                    isHome100Empty === true 
                      ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 shadow-lg" 
                      : "border-border bg-background hover:border-emerald-300"
                  )}
                >
                  Yes, Completely Empty
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ isHome100Empty: false })}
                  className={cn(
                    "p-4 rounded-xl border-2 font-bold transition-all",
                    isHome100Empty === false 
                      ? "border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 shadow-lg" 
                      : "border-border bg-background hover:border-amber-300"
                  )}
                >
                  No, Furniture Remains
                </button>
              </div>
              
              {/* Redirect Warning */}
              {isHome100Empty === false && (
                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-xl border border-amber-300 dark:border-amber-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Move-In/Out service is designed for empty properties.
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => updateFormData({ hourlyIntent: 'deep_scrub', hourlyIntensity: 'deep' })}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Switch to The Heavy-Lifter (Deep Scrub)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: FREQUENCY (How often?) */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {t(language, 'hourly.frequency_label')}
        </Label>
        
        {/* Show restriction notice for locked intents */}
        {intentConfig.allowedFrequencies.length === 1 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-700 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>
              {hourlyIntent === 'move_in_out' && 'Move-In/Out services are one-time only (deposit/inspection focused).'}
              {hourlyIntent === 'post_event' && 'Post-Event cleanup is typically a one-time service.'}
            </span>
          </div>
        )}
        
        {/* Show restriction notice for recurring-only intents */}
        {hourlyIntent === 'routine_maintenance' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-700 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Routine Maintenance requires recurring visits for consistency and familiarity.</span>
          </div>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FREQUENCY_OPTIONS.map((option) => {
            const freqRate = HOURLY_FREQUENCY_RATES[option.value].basic;
            const isSelected = formData.hourlyFrequency === option.value;
            const isBestValue = option.badge === 'best_value';
            const isOnetime = option.value === 'onetime';
            
            // Check if this frequency is allowed for current intent
            const allowedFreqs = intentConfig.allowedFrequencies as readonly HourlyFrequency[];
            const isAllowed = allowedFreqs.includes(option.value);
            
            // Hide disallowed frequencies
            if (!isAllowed) return null;
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFrequencyChange(option.value)}
                className={cn(
                  "relative p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:shadow-md",
                  isBestValue && !isSelected && "border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20"
                )}
              >
                {isBestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3" />
                    {t(language, 'hourly.best_value')}
                  </div>
                )}
                <div className="font-semibold text-sm pt-1">
                  {t(language, `hourly.freq_${option.value}`)}
                </div>
                {!isOnetime && (
                  <div className="text-lg text-primary font-bold">
                    ${freqRate}<span className="text-xs font-normal text-muted-foreground">/hr</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Days Per Week Selector - Only for Daily frequency */}
      {isDaily && (
        <div className="space-y-3 animate-fade-in">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            {t(language, 'hourly.days_per_week_label')}
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {DAYS_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => updateFormData({ daysPerWeek: days })}
                className={cn(
                  "py-3 rounded-xl font-bold text-lg transition-all border-2",
                  formData.daysPerWeek === days
                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                    : "bg-card border-border hover:border-primary/50"
                )}
              >
                {days}
              </button>
            ))}
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
            <p className="text-sm text-primary font-medium">
              {t(language, 'hourly.weekly_hours_note', { hours: String(weeklyLaborHours) })}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🧠 LIMBIC BRAIN: Context & Feeling (What do I have? What matters?)
          ═══════════════════════════════════════════════════════════════════════════ */}

      {/* SECTION 3: PROPERTY TYPE (Premium Card Design) - Only for intents that need structure */}
      {intentConfig.showPropertyStructure && (
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 border border-slate-200 dark:border-slate-700 shadow-lg">
          {/* Section Header with Icon Badge */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Home className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t(language, 'structure.title')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t(language, 'structure.subtitle')}</p>
          </div>
          
          {/* Property Type Cards - Premium app-like rows with large touch targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {PROPERTY_CATEGORY_OPTIONS.map((option) => {
              const isSelected = propertyCategory === option.value;
              const isHouse = option.value === 'single_family';
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    updateFormData({ propertyCategory: option.value } as any);
                    // Reset sub-options when changing category
                    if (option.value === 'apartment_condo') {
                      updateFormData({ homeStories: 1, hasElevatorAccess: true, unitFloorLevel: 1 } as any);
                    } else {
                      updateFormData({ homeStories: 1 } as any);
                    }
                  }}
                  className={cn(
                    "relative flex items-start gap-3 sm:gap-4",
                    "p-4 sm:p-5 rounded-xl border-2 text-left",
                    "min-h-[80px]", // Ensure adequate touch area for mobile
                    "transition-all duration-200",
                    "active:scale-[0.98]", // Premium press feedback
                    isSelected
                      ? "border-primary bg-red-50 dark:bg-primary/10 shadow-lg ring-1 ring-primary/20"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/40 hover:shadow-md"
                  )}
                >
                  {/* Icon Circle */}
                  <div className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isSelected 
                      ? "bg-red-100 dark:bg-primary/20" 
                      : "bg-slate-100 dark:bg-slate-800"
                  )}>
                    {isHouse 
                      ? <Home className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-colors", isSelected ? "text-primary" : "text-slate-500 dark:text-slate-400")} />
                      : <Building2 className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-colors", isSelected ? "text-primary" : "text-slate-500 dark:text-slate-400")} />
                    }
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-semibold text-sm transition-colors",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {option.shortLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{option.description}</div>
                  </div>
                  
                  {/* Checkmark Badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Conditional Sub-Options: House Levels - Premium iOS Picker */}
          {propertyCategory === 'single_family' && (
            <div className="animate-fade-in pt-4 border-t border-slate-200/70 dark:border-slate-700">
              <LevelPickerSheet
                title={t(language, 'structure.levels.title')}
                subtitle={homeStories > 1 ? t(language, 'structure.levels.subtitle') : undefined}
                icon={Layers}
                pickerTitle={t(language, 'structure.levels.picker_title')}
                options={HOME_STORIES_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(language, `structure.levels.${option.value}`),
                  sublabel: option.surcharge > 0 ? `+$${option.surcharge}` : undefined,
                }))}
                value={homeStories}
                onChange={(value) => updateFormData({ homeStories: value } as any)}
              />
            </div>
          )}
          
          {/* Conditional Sub-Options: Apartment Access - Premium iOS Pickers */}
          {propertyCategory === 'apartment_condo' && (
            <div className="animate-fade-in pt-4 border-t border-slate-200/70 dark:border-slate-700 space-y-3">
              {/* Unit Floor Level - iOS Picker */}
              <LevelPickerSheet
                title={t(language, 'structure.floor.title')}
                subtitle={hasElevatorAccess 
                  ? t(language, 'structure.floor.subtitle_elevator')
                  : t(language, 'structure.floor.subtitle_walkup')
                }
                icon={Building2}
                pickerTitle={t(language, 'structure.floor.picker_title')}
                options={[
                  { value: 1, label: t(language, 'structure.floor.ground'), sublabel: t(language, 'structure.floor.sublabel.ground') },
                  { value: 2, label: language === 'zh' ? '2楼' : 'Floor 2' },
                  { value: 3, label: language === 'zh' ? '3楼' : 'Floor 3' },
                  { value: 4, label: language === 'zh' ? '4楼' : 'Floor 4' },
                  { value: 5, label: language === 'zh' ? '5楼' : 'Floor 5' },
                  { value: 6, label: t(language, 'structure.floor.6plus'), sublabel: t(language, 'structure.floor.sublabel.upper') },
                ]}
                value={unitFloorLevel > 6 ? 6 : unitFloorLevel}
                onChange={(value) => updateFormData({ unitFloorLevel: value } as any)}
              />
              
              {/* Is your unit multi-level? - iOS Picker */}
              <LevelPickerSheet
                title={t(language, 'structure.unit_levels.title')}
                subtitle={(formData.apartmentUnitLevels ?? 1) > 1 ? t(language, 'structure.unit_levels.subtitle') : undefined}
                icon={Layers}
                pickerTitle={t(language, 'structure.unit_levels.picker_title')}
                options={[
                  { value: 1, label: t(language, 'structure.unit_levels.1'), sublabel: t(language, 'structure.unit_levels.sublabel.standard') },
                  { value: 2, label: t(language, 'structure.unit_levels.2'), sublabel: t(language, 'structure.unit_levels.sublabel.loft') },
                  { value: 3, label: t(language, 'structure.unit_levels.3'), sublabel: t(language, 'structure.unit_levels.sublabel.triplex') },
                  { value: 4, label: t(language, 'structure.unit_levels.4'), sublabel: t(language, 'structure.unit_levels.sublabel.penthouse') },
                  { value: 5, label: t(language, 'structure.unit_levels.5'), sublabel: t(language, 'structure.unit_levels.sublabel.penthouse') },
                  { value: 6, label: t(language, 'structure.unit_levels.6'), sublabel: t(language, 'structure.unit_levels.sublabel.penthouse') },
                ]}
                value={formData.apartmentUnitLevels ?? 1}
                onChange={(value) => updateFormData({ apartmentUnitLevels: value } as any)}
              />
              
              {/* Elevator Access - Toggle Pills (simpler UX for binary choice) */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t(language, 'structure.access.title')}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {ELEVATOR_ACCESS_OPTIONS.map((option) => {
                    const isSelected = hasElevatorAccess === option.value;
                    const isYes = option.value === true;
                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        onClick={() => updateFormData({ hasElevatorAccess: option.value } as any)}
                        className={cn(
                          "py-3 px-3 rounded-xl border-2 text-center transition-all duration-200 text-sm font-medium",
                          "min-h-[52px]", // Touch target
                          "active:scale-[0.97]", // Press feedback
                          isSelected && isYes
                            ? "border-primary bg-primary text-primary-foreground shadow-md"
                            : isSelected && !isYes
                            ? "border-amber-500 bg-amber-500 text-white shadow-md"
                            : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-foreground hover:border-primary/40"
                        )}
                      >
                        {isYes 
                          ? t(language, 'structure.access.elevator')
                          : t(language, 'structure.access.walkup')
                        }
                        {option.surcharge > 0 && !isSelected && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
                            +${option.surcharge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* SECTION 4: PROPERTY COMPOSITION (What I have) - Only for intents that need composition */}
      {intentConfig.showPropertyComposition && (
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 space-y-5 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
          <Building2 className="w-4 h-4 text-primary" />
          Property Composition
        </div>
        
        {/* Square Footage */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            Total Property Size
          </Label>
          <Select 
            value={formData.hourlyTotalSqft} 
            onValueChange={(value) => updateFormData({ hourlyTotalSqft: value })}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Select square footage" />
            </SelectTrigger>
            <SelectContent>
              {HOURLY_SQFT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEstate && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3"/> Estate logistics overhead applied
            </p>
          )}
        </div>

        {/* Total Beds & Baths */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Bedrooms */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Bed className="w-4 h-4 text-muted-foreground" />
              Total Bedrooms
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTotalBedsChange(Math.max(0, totalBeds - 1))}
                className="w-10 h-10 rounded-lg border-2 border-border bg-background flex items-center justify-center font-bold text-lg hover:border-primary/50 transition-colors"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="font-bold text-xl">{totalBeds}</span>
                {totalBeds === 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    Studio
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleTotalBedsChange(Math.min(12, totalBeds + 1))}
                className="w-10 h-10 rounded-lg border-2 border-border bg-background flex items-center justify-center font-bold text-lg hover:border-primary/50 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Total Bathrooms */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Bath className="w-4 h-4 text-muted-foreground" />
              Total Bathrooms
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTotalBathsChange(Math.max(0, totalBaths - 1))}
                className="w-10 h-10 rounded-lg border-2 border-border bg-background flex items-center justify-center font-bold text-lg hover:border-primary/50 transition-colors"
              >
                −
              </button>
              <div className="flex-1 text-center font-bold text-xl">
                {totalBaths}
              </div>
              <button
                type="button"
                onClick={() => handleTotalBathsChange(Math.min(12, totalBaths + 1))}
                className="w-10 h-10 rounded-lg border-2 border-border bg-background flex items-center justify-center font-bold text-lg hover:border-primary/50 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Additional Structures (Estate Mode) - ENHANCED */}
        {isEstate && (
          <div className="space-y-4 animate-fade-in pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Home className="w-4 h-4 text-primary" />
                {t(language, 'structures.additional_title')}
              </Label>
              <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">
                {t(language, 'structures.premium_estate')}
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Guest House (Detached) */}
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏡</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                          {t(language, 'structures.guest_house')}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-700 text-emerald-700 dark:text-emerald-200 font-medium">
                          {t(language, 'structures.detached_badge')}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {t(language, 'structures.guest_house_info')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateFormData({ guestHouseCount: Math.max(0, guestHouseCount - 1) })}
                      className="w-8 h-8 flex items-center justify-center bg-emerald-200 dark:bg-emerald-700 rounded-lg hover:bg-emerald-300 dark:hover:bg-emerald-600 transition-colors font-bold text-emerald-800 dark:text-emerald-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-lg font-bold text-emerald-800 dark:text-emerald-200">{guestHouseCount}</span>
                    <button
                      type="button"
                      onClick={() => updateFormData({ guestHouseCount: Math.min(3, guestHouseCount + 1) })}
                      className="w-8 h-8 flex items-center justify-center bg-emerald-200 dark:bg-emerald-700 rounded-lg hover:bg-emerald-300 dark:hover:bg-emerald-600 transition-colors font-bold text-emerald-800 dark:text-emerald-100"
                    >
                      +
                    </button>
                  </div>
                </div>
                {guestHouseCount > 0 && (
                  <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 flex gap-3">
                    <span>⏱️ +25 min setup</span>
                    <span>🧹 +90 min cleaning ea</span>
                  </div>
                )}
              </div>

              {/* Studio / ADU (Attached) */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏠</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                          {t(language, 'structures.studio')}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-200 font-medium">
                          {t(language, 'structures.attached_badge')}
                        </span>
                      </div>
                      <div className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                        {t(language, 'structures.studio_info')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateFormData({ studioCount: Math.max(0, studioCount - 1) } as any)}
                      className="w-8 h-8 flex items-center justify-center bg-blue-200 dark:bg-blue-700 rounded-lg hover:bg-blue-300 dark:hover:bg-blue-600 transition-colors font-bold text-blue-800 dark:text-blue-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-lg font-bold text-blue-800 dark:text-blue-200">{studioCount}</span>
                    <button
                      type="button"
                      onClick={() => updateFormData({ studioCount: Math.min(2, studioCount + 1) } as any)}
                      className="w-8 h-8 flex items-center justify-center bg-blue-200 dark:bg-blue-700 rounded-lg hover:bg-blue-300 dark:hover:bg-blue-600 transition-colors font-bold text-blue-800 dark:text-blue-100"
                    >
                      +
                    </button>
                  </div>
                </div>
                {studioCount > 0 && (
                  <div className="mt-2 text-[10px] text-blue-600 dark:text-blue-400 flex gap-3">
                    <span>⏱️ +10 min setup</span>
                    <span>🧹 +60 min cleaning ea</span>
                  </div>
                )}
              </div>

              {/* Pool House (Detached) */}
              <div className="bg-gradient-to-r from-cyan-50 to-cyan-100/50 dark:from-cyan-900/20 dark:to-cyan-800/10 p-4 rounded-xl border border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏊</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">
                          {t(language, 'structures.pool_house')}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-200 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-200 font-medium">
                          {t(language, 'structures.detached_badge')}
                        </span>
                      </div>
                      <div className="text-[11px] text-cyan-700 dark:text-cyan-400 mt-0.5">
                        {t(language, 'structures.pool_house_info')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateFormData({ poolHouseCount: Math.max(0, poolHouseCount - 1) })}
                      className="w-8 h-8 flex items-center justify-center bg-cyan-200 dark:bg-cyan-700 rounded-lg hover:bg-cyan-300 dark:hover:bg-cyan-600 transition-colors font-bold text-cyan-800 dark:text-cyan-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-lg font-bold text-cyan-800 dark:text-cyan-200">{poolHouseCount}</span>
                    <button
                      type="button"
                      onClick={() => updateFormData({ poolHouseCount: Math.min(2, poolHouseCount + 1) })}
                      className="w-8 h-8 flex items-center justify-center bg-cyan-200 dark:bg-cyan-700 rounded-lg hover:bg-cyan-300 dark:hover:bg-cyan-600 transition-colors font-bold text-cyan-800 dark:text-cyan-100"
                    >
                      +
                    </button>
                  </div>
                </div>
                {poolHouseCount > 0 && (
                  <div className="mt-2 text-[10px] text-cyan-600 dark:text-cyan-400 flex gap-3">
                    <span>⏱️ +15 min setup</span>
                    <span>🧹 +45 min cleaning ea</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Structure Labor Summary */}
            {(guestHouseCount + studioCount + poolHouseCount) > 0 && (
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t(language, 'structures.labor_total')}:</span>
                  <span className="font-bold text-primary">
                    +{(guestHouseCount * 115) + (studioCount * 70) + (poolHouseCount * 60)} min
                  </span>
                </div>
              </div>
            )}

            {/* Team Size for Estates */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <Label className="flex items-center gap-2 text-sm font-medium mb-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                Team Size
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData({ hourlyTeamSize: 2 })}
                  className={cn(
                    "p-4 rounded-xl border-2 text-center transition-all",
                    hourlyTeamSize === 2
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 bg-background"
                  )}
                >
                  <div className="text-2xl font-black text-primary">2</div>
                  <div className="text-xs font-medium">Cleaners (Standard)</div>
                  <div className="text-[10px] text-muted-foreground">Most efficient for &gt;1500 sqft</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ hourlyTeamSize: 3 })}
                  className={cn(
                    "p-4 rounded-xl border-2 text-center transition-all",
                    hourlyTeamSize === 3
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 bg-background"
                  )}
                >
                  <div className="text-2xl font-black text-primary">3</div>
                  <div className="text-xs font-medium">Cleaners (Speed)</div>
                  <div className="text-[10px] text-muted-foreground">Best for large estates</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cleaning Density Selector (Estate Mode) */}
        {isEstate && (
          <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Layers className="w-4 h-4 text-primary" />
              Cleaning Scope (Density)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CLEANING_DENSITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFormData({ cleaningDensity: option.value })}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    cleaningDensity === option.value
                      ? "bg-primary/10 border-primary shadow-md ring-1 ring-primary"
                      : "bg-transparent border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                >
                  <div className={cn(
                    "text-xs font-bold",
                    cleaningDensity === option.value ? "text-primary" : "text-foreground"
                  )}>
                    {option.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{option.description}</div>
                </button>
              ))}
            </div>
            
            {/* Custom Sqft Input */}
            {cleaningDensity === 'custom' && (
              <div className="flex items-center gap-2 animate-fade-in">
                <input
                  type="number"
                  placeholder="Enter active sq ft"
                  className="flex-1 p-2 border rounded-lg text-sm bg-background"
                  value={formData.customActiveSqft}
                  onChange={(e) => updateFormData({ customActiveSqft: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">sq ft</span>
              </div>
            )}
            
            {/* Active Area Display */}
            <div className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground">Active Cleaning Area:</span>
              <span className="text-sm font-bold text-primary">
                {estateCalculation.activeSqft.toLocaleString()} sq ft
              </span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* SECTION 5: AREAS TO CLEAN (INCLUDE + SKIP) - Only for intents that need area selection */}
      {intentConfig.showAreasSelector && (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Part A: Rooms to INCLUDE - Premium Design */}
        <div className="bg-gradient-to-br from-emerald-50 via-green-50/50 to-teal-50/80 dark:from-emerald-950/40 dark:via-green-950/30 dark:to-teal-950/40 rounded-3xl p-6 sm:p-8 space-y-6 border-2 border-emerald-200 dark:border-emerald-800/60 shadow-xl shadow-emerald-100/50 dark:shadow-emerald-950/30">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Rooms to INCLUDE This Session
              </span>
            </div>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 max-w-md mx-auto">
              Select which areas to clean during your visit
            </p>
          </div>
          
          {/* Hero Bed/Bath Counters - Centered */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pb-6 border-b border-emerald-200 dark:border-emerald-700/50">
            {/* Bedrooms Counter */}
            <div className="w-full sm:w-auto bg-white dark:bg-slate-800/60 p-5 sm:p-6 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 shadow-lg shadow-emerald-100/30 dark:shadow-emerald-950/30">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <Bed className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Bedrooms</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => updateBedsToClean(Math.max(0, bedsToClean - 1))}
                  className="w-12 h-12 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-xl text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-all active:scale-95"
                >
                  −
                </button>
                <div className="text-center min-w-[80px]">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-700 dark:to-teal-700 rounded-full blur-md opacity-50"></div>
                    <span className="relative font-bold text-4xl text-emerald-600 dark:text-emerald-300">{bedsToClean}</span>
                  </div>
                  <span className="block text-xs text-emerald-500/70 dark:text-emerald-400/70 mt-1">of {totalBeds} total</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateBedsToClean(Math.min(totalBeds, bedsToClean + 1))}
                  className="w-12 h-12 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-xl text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Bathrooms Counter */}
            <div className="w-full sm:w-auto bg-white dark:bg-slate-800/60 p-5 sm:p-6 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 shadow-lg shadow-emerald-100/30 dark:shadow-emerald-950/30">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <Bath className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Bathrooms</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => updateBathsToClean(Math.max(0, bathsToClean - 1))}
                  className="w-12 h-12 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-xl text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-all active:scale-95"
                >
                  −
                </button>
                <div className="text-center min-w-[80px]">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-700 dark:to-teal-700 rounded-full blur-md opacity-50"></div>
                    <span className="relative font-bold text-4xl text-emerald-600 dark:text-emerald-300">{bathsToClean}</span>
                  </div>
                  <span className="block text-xs text-emerald-500/70 dark:text-emerald-400/70 mt-1">of {totalBaths} total</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateBathsToClean(Math.min(totalBaths, bathsToClean + 1))}
                  className="w-12 h-12 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-xl text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Other Areas - Premium Pills */}
          <div className="space-y-3">
            <p className="text-center text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wide">
              Additional Areas
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {relevantAreasToInclude.map((area) => {
                const isActive = hourlyAreasToInclude.includes(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleAreaToInclude(area.id)}
                    className={cn(
                      "group px-4 py-2.5 sm:px-5 sm:py-3 rounded-full border-2 transition-all duration-200 flex items-center gap-2 sm:gap-2.5 min-h-[44px]",
                      isActive
                        ? "border-emerald-500 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50 scale-[1.02]"
                        : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:scale-[1.01]"
                    )}
                  >
                    <span className={cn(
                      "transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-500"
                    )}>
                      {AREA_ICONS[area.icon] || <Home className="w-4 h-4" />}
                    </span>
                    <span className={cn(
                      "font-medium text-sm",
                      isActive ? "text-white" : "text-slate-700 dark:text-slate-200"
                    )}>
                      {area.label}
                    </span>
                    {isActive && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Part B: Areas to SKIP - Refined */}
        <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-700">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <X className="w-4 h-4" />
              Areas to SKIP (Optional)
            </div>
            <p className="text-xs text-muted-foreground">
              Tell us what to avoid so we can focus time where it matters
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            {relevantAreasToSkip.length > 0 ? relevantAreasToSkip.map((area) => {
              const isActive = hourlyAreasToSkip.includes(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => toggleAreaToSkip(area.id)}
                  className={cn(
                    "px-4 py-2 rounded-full border-2 text-sm font-medium transition-all flex items-center gap-2 min-h-[40px]",
                    isActive
                      ? "border-red-400 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 shadow-sm"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-400 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {isActive && <X className="w-3.5 h-3.5" />}
                  {area.label}
                  {isActive && <span className="text-xs text-red-500 dark:text-red-400">({area.reason})</span>}
                </button>
              );
            }) : (
              <p className="text-xs text-muted-foreground italic">No skip options available for this property configuration</p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* HOME ASSISTANT - Organization Section (Enhanced Per-Unit Task Engine) */}
      {hourlyIntent === 'organization' && (
        <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
          
          {/* Premium Section Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/50 rounded-full">
              <FolderOpen className="w-4 h-4 text-purple-600" />
              <span className="text-xs uppercase tracking-widest text-purple-700 dark:text-purple-300 font-semibold">
                {t(language, 'org.header_badge')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground">{t(language, 'org.title')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t(language, 'org.subtitle')}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-full text-sm font-semibold">
              <DollarSign className="w-4 h-4" />
              {t(language, 'org.rate_badge')}
            </div>
          </div>
          
          {/* Aesthetic Assessment Protocol - 30 min */}
          <div className="bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 rounded-xl p-4 border border-purple-300 dark:border-purple-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{t(language, 'org.aesthetic_assessment')}</div>
                  <div className="text-xs text-muted-foreground">{t(language, 'org.aesthetic_assessment_desc')}</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-purple-700 dark:text-purple-300">30 min</span>
                <div className="text-[10px] text-muted-foreground">{t(language, 'org.included')}</div>
              </div>
            </div>
          </div>
          
          {/* 1. Clutter Assessment */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-2xl p-4 sm:p-6 space-y-4 border border-purple-200 dark:border-purple-800 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Boxes className="w-4 h-4 text-purple-500" />
              {t(language, 'org.clutter_title')}
            </div>
            <p className="text-xs text-muted-foreground">{t(language, 'org.clutter_desc')}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'minimal', label: t(language, 'org.clutter_minimal'), desc: t(language, 'org.clutter_minimal_desc'), icon: '✨', mult: '0.8×' },
                { id: 'moderate', label: t(language, 'org.clutter_moderate'), desc: t(language, 'org.clutter_moderate_desc'), icon: '🏠', mult: '1.0×' },
                { id: 'significant', label: t(language, 'org.clutter_significant'), desc: t(language, 'org.clutter_significant_desc'), icon: '📦', mult: '1.3×' },
                { id: 'overwhelming', label: t(language, 'org.clutter_overwhelming'), desc: t(language, 'org.clutter_overwhelming_desc'), icon: '🔧', mult: '1.6×' },
              ].map((level) => {
                const isSelected = formData.clutterLevel === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => updateFormData({ clutterLevel: level.id as any })}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all relative",
                      isSelected
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/40 shadow-md"
                        : "border-border bg-background hover:border-purple-300"
                    )}
                  >
                    <div className="text-lg mb-1">{level.icon}</div>
                    <div className="font-semibold text-xs">{level.label}</div>
                    <div className="text-[10px] text-muted-foreground">{level.desc}</div>
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-purple-600 text-white text-[9px] rounded-full font-bold">
                      {level.mult}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {formData.clutterLevel === 'overwhelming' && (
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t(language, 'org.clutter_warning')}
              </div>
            )}
          </div>
          
          {/* 2. Per-Unit Task Menu (Motor de Tareas por Unidad) */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-2xl p-4 sm:p-6 space-y-4 border border-purple-200 dark:border-purple-800 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FolderOpen className="w-4 h-4 text-purple-500" />
              {t(language, 'org.task_menu_title')}
            </div>
            <p className="text-xs text-muted-foreground">{t(language, 'org.task_menu_desc')}</p>
            
            {/* Per-Unit Counter Tasks */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">{t(language, 'org.per_unit_tasks')}</div>
              
              {/* Laundry Management */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800/50">
                <div className="flex-1">
                  <div className="font-medium text-sm">{t(language, 'org.task_laundry')}</div>
                  <div className="text-xs text-muted-foreground">{t(language, 'org.task_laundry_desc')}</div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">~20 min/{t(language, 'org.unit_load')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateOrgTaskCount('laundry_loads', -1, 5)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.laundry_loads <= 0}>-</button>
                  <span className="w-8 text-center font-bold">{organizationTaskCounts.laundry_loads}</span>
                  <button type="button" onClick={() => updateOrgTaskCount('laundry_loads', 1, 5)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.laundry_loads >= 5}>+</button>
                </div>
              </div>
              
              {/* Closet Curation */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800/50">
                <div className="flex-1">
                  <div className="font-medium text-sm">{t(language, 'org.task_closet')}</div>
                  <div className="text-xs text-muted-foreground">{t(language, 'org.task_closet_desc')}</div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">~45 min/{t(language, 'org.unit_closet')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateOrgTaskCount('closets', -1, 6)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.closets <= 0}>-</button>
                  <span className="w-8 text-center font-bold">{organizationTaskCounts.closets}</span>
                  <button type="button" onClick={() => updateOrgTaskCount('closets', 1, 6)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.closets >= 6}>+</button>
                </div>
              </div>
              
              {/* Toy/Nursery Reset */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800/50">
                <div className="flex-1">
                  <div className="font-medium text-sm">{t(language, 'org.task_toys')}</div>
                  <div className="text-xs text-muted-foreground">{t(language, 'org.task_toys_desc')}</div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">~30 min/{t(language, 'org.unit_room')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateOrgTaskCount('toy_rooms', -1, 3)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.toy_rooms <= 0}>-</button>
                  <span className="w-8 text-center font-bold">{organizationTaskCounts.toy_rooms}</span>
                  <button type="button" onClick={() => updateOrgTaskCount('toy_rooms', 1, 3)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.toy_rooms >= 3}>+</button>
                </div>
              </div>
              
              {/* Desk/Office Reset */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800/50">
                <div className="flex-1">
                  <div className="font-medium text-sm">{t(language, 'org.task_desk')}</div>
                  <div className="text-xs text-muted-foreground">{t(language, 'org.task_desk_desc')}</div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">~45 min/{t(language, 'org.unit_workspace')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateOrgTaskCount('desk_areas', -1, 3)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.desk_areas <= 0}>-</button>
                  <span className="w-8 text-center font-bold">{organizationTaskCounts.desk_areas}</span>
                  <button type="button" onClick={() => updateOrgTaskCount('desk_areas', 1, 3)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.desk_areas >= 3}>+</button>
                </div>
              </div>
              
              {/* Linen Closet */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800/50">
                <div className="flex-1">
                  <div className="font-medium text-sm">{t(language, 'org.task_linen')}</div>
                  <div className="text-xs text-muted-foreground">{t(language, 'org.task_linen_desc')}</div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">~30 min/{t(language, 'org.unit_closet')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateOrgTaskCount('linen_closets', -1, 3)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.linen_closets <= 0}>-</button>
                  <span className="w-8 text-center font-bold">{organizationTaskCounts.linen_closets}</span>
                  <button type="button" onClick={() => updateOrgTaskCount('linen_closets', 1, 3)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.linen_closets >= 3}>+</button>
                </div>
              </div>
              
              {/* Bathroom Drawers */}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800/50">
                <div className="flex-1">
                  <div className="font-medium text-sm">{t(language, 'org.task_bathroom')}</div>
                  <div className="text-xs text-muted-foreground">{t(language, 'org.task_bathroom_desc')}</div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">~30 min/{t(language, 'org.unit_bathroom')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateOrgTaskCount('bathroom_drawers', -1, 4)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.bathroom_drawers <= 0}>-</button>
                  <span className="w-8 text-center font-bold">{organizationTaskCounts.bathroom_drawers}</span>
                  <button type="button" onClick={() => updateOrgTaskCount('bathroom_drawers', 1, 4)} className="w-8 h-8 rounded-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-100 disabled:opacity-50" disabled={organizationTaskCounts.bathroom_drawers >= 4}>+</button>
                </div>
              </div>
            </div>
            
            {/* Flat-Rate Tasks */}
            <div className="space-y-3 pt-4 border-t border-purple-200 dark:border-purple-700">
              <div className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">{t(language, 'org.flat_rate_tasks')}</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'pantry', label: t(language, 'org.task_pantry'), desc: t(language, 'org.task_pantry_desc'), time: 40 },
                  { id: 'entryway', label: t(language, 'org.task_entryway'), desc: t(language, 'org.task_entryway_desc'), time: 20 },
                  { id: 'garage', label: t(language, 'org.task_garage'), desc: t(language, 'org.task_garage_desc'), time: 90 },
                  { id: 'packing', label: t(language, 'org.task_packing'), desc: t(language, 'org.task_packing_desc'), time: 90 },
                ].map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleOrganizationTask(task.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all",
                      organizationTasks.includes(task.id) 
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/40 shadow-md" 
                        : "border-border bg-background hover:border-purple-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{task.label}</div>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                        ~{task.time}min
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{task.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Time Estimate Summary - from AI calculation */}
            {estateCalculation && estateCalculation.aiTimeReceipt && (
              <div className="p-4 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-purple-800 dark:text-purple-200">{t(language, 'org.estimate_title')}</div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                      {estateCalculation.aiTimeReceipt.summary.totalManMinutes} min
                    </span>
                    <div className="text-[10px] text-muted-foreground">
                      ~{estateCalculation.clockHours} hr{estateCalculation.clockHours !== 1 ? 's' : ''} session
                    </div>
                  </div>
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                  <div className="flex justify-between"><span>{t(language, 'org.breakdown_setup')}</span><span>{estateCalculation.aiTimeReceipt.logistics.totalLogistics} min</span></div>
                  <div className="flex justify-between"><span>{t(language, 'org.breakdown_tasks')}</span><span>{estateCalculation.aiTimeReceipt.tasks.totalMinutes} min</span></div>
                  {estateCalculation.aiTimeReceipt.activeArea.sqftAdjustment > 0 && (
                    <div className="flex justify-between"><span>{t(language, 'org.breakdown_buffer')}</span><span>+{estateCalculation.aiTimeReceipt.activeArea.sqftAdjustment} min</span></div>
                  )}
                </div>
                <div className="pt-2 border-t border-purple-300 dark:border-purple-600 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">{estateCalculation.recommendedTeamSize} {t(language, 'org.specialist')}</span>
                  </div>
                  <span className="text-muted-foreground">{estateCalculation.aiTimeReceipt.teamSizing.rationale}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* 3. No-Scrub Disclaimer (REQUIRED - Blindaje de Expectativas) */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-2xl p-4 sm:p-6 border border-purple-200 dark:border-purple-800 shadow-sm">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl border border-purple-300 dark:border-purple-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    {t(language, 'org.disclaimer_title')}
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    {t(language, 'org.disclaimer_desc')}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox 
                      checked={noScrubAcknowledged}
                      onCheckedChange={(checked) => updateFormData({ noScrubAcknowledged: !!checked })}
                    />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">{t(language, 'org.disclaimer_accept')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* INTENT-SPECIFIC EXTRAS - After Areas Selector                               */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      {/* DEEP SCRUB EXTRAS - Natural Stone, Pull Out, Task Grid */}
      {hourlyIntent === 'deep_scrub' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-2xl p-4 sm:p-6 space-y-5 border border-orange-200 dark:border-orange-800 shadow-sm">
            {/* Premium Section Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="text-xs uppercase tracking-widest text-orange-700 dark:text-orange-300 font-semibold">
                  Deep Clean Extras
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Selecting tasks adds <strong>Time</strong> to your estimate, not extra fees.
              </p>
            </div>
            
            {/* Material Safety - Natural Stone */}
            <div className="space-y-3 p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-orange-200 dark:border-orange-700">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Gem className="w-4 h-4 text-orange-500" />
                Natural Stone Surfaces?
              </Label>
              <p className="text-xs text-muted-foreground">Marble, Travertine, etc.</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => updateFormData({ hasNaturalStone: false })}
                  className={cn(
                    "py-3 rounded-lg border-2 font-medium transition-all",
                    !hasNaturalStone ? "border-orange-500 bg-orange-100 dark:bg-orange-900/40" : "border-border"
                  )}
                >No</button>
                <button 
                  type="button"
                  onClick={() => updateFormData({ hasNaturalStone: true })}
                  className={cn(
                    "py-3 rounded-lg border-2 font-medium transition-all",
                    hasNaturalStone ? "border-orange-500 bg-orange-100 dark:bg-orange-900/40" : "border-border"
                  )}
                >Yes</button>
              </div>
              {hasNaturalStone && (
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-xs text-orange-800 dark:text-orange-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Work order flagged: NO ACIDIC CLEANERS
                </div>
              )}
            </div>
            
            {/* Hidden Areas - Pull Out Appliances */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-orange-200 dark:border-orange-700">
              <div>
                <Label className="text-sm font-medium">Pull out fridge/oven to clean behind?</Label>
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Requires 2 people for safety
                </p>
              </div>
              <Switch 
                checked={pullOutAppliances}
                onCheckedChange={(checked) => updateFormData({ pullOutAppliances: checked })}
              />
            </div>
            
            {/* Deep Clean Task Grid */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {DEEP_SCRUB_TASK_OPTIONS.map((task) => {
                  const isActive = hourlyTasks.includes(task.id);
                  const timeEstimate = getTaskTimeEstimate(task.id, estateCalculation.activeSqft, false);
                  const TaskIcon = task.icon;
                  
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleHourlyTask(task.id)}
                      className={cn(
                        "p-3 text-xs font-medium rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 min-h-[80px]",
                        isActive
                          ? "bg-orange-600 text-white border-orange-600 shadow-md"
                          : "bg-white dark:bg-slate-800 text-foreground border-orange-200 dark:border-orange-700 hover:border-orange-400"
                      )}
                    >
                      <TaskIcon className={cn("w-4 h-4", isActive ? "text-white" : "text-orange-600")} />
                      <span className="text-center">{task.label}</span>
                      <span className={cn(
                        "text-[10px]",
                        isActive ? "text-orange-100" : "text-muted-foreground"
                      )}>
                        +{timeEstimate} min
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOVE-IN/OUT DEPOSIT GUARANTEE CHECKLIST - After Areas Selector */}
      {hourlyIntent === 'move_in_out' && isHome100Empty === true && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-4 sm:p-6 space-y-5 border border-emerald-200 dark:border-emerald-800 shadow-sm">
            {/* Premium Section Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-semibold">
                  Deposit Guarantee Checklist
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Priority areas landlords inspect for deposit return.
              </p>
            </div>
            
            {/* Priority Focus Areas Description */}
            <div className="p-4 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-xl text-sm">
              <ul className="space-y-2 text-emerald-800 dark:text-emerald-200">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Interior of oven and refrigerator
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Inside all cabinets and drawers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Baseboards and door frames
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Window tracks and sills
                </li>
              </ul>
            </div>
            
            {/* Landlord Receipt Toggle */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-emerald-200 dark:border-emerald-700">
              <div>
                <Label className="text-sm font-medium">Need a receipt for landlord/property manager?</Label>
                <p className="text-xs text-muted-foreground">For deposit documentation</p>
              </div>
              <Switch 
                checked={needsLandlordReceipt}
                onCheckedChange={(checked) => updateFormData({ needsLandlordReceipt: checked })}
              />
            </div>
            
            {/* Pull out fridge/oven */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-emerald-200 dark:border-emerald-700">
              <div>
                <Label className="text-sm font-medium">Pull out fridge/oven to clean behind?</Label>
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Requires 2 people for safety
                </p>
              </div>
              <Switch 
                checked={pullOutAppliances}
                onCheckedChange={(checked) => updateFormData({ pullOutAppliances: checked })}
              />
            </div>
            
            {/* Time-Injector Task Grid */}
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Selecting tasks adds <strong>Time</strong> to your estimate, not extra fees.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {HOURLY_TASK_OPTIONS.map((task) => {
                  const isActive = hourlyTasks.includes(task.id);
                  const timeEstimate = getTaskTimeEstimate(task.id, estateCalculation.activeSqft, true);
                  const TaskIcon = task.icon;
                  
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleHourlyTask(task.id)}
                      className={cn(
                        "p-3 text-xs font-medium rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 min-h-[80px]",
                        isActive
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "bg-white dark:bg-slate-800 text-foreground border-emerald-200 dark:border-emerald-700 hover:border-emerald-400"
                      )}
                    >
                      <TaskIcon className={cn("w-4 h-4", isActive ? "text-white" : "text-emerald-600")} />
                      <span className="text-center">{task.label}</span>
                      <span className={cn(
                        "text-[10px]",
                        isActive ? "text-emerald-100" : "text-muted-foreground"
                      )}>
                        +{timeEstimate} min
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: PROPERTY LOGISTICS (Access challenges) - Only for intents that need logistics */}
      {intentConfig.showLogistics && (
      <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-5 space-y-5 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
          <Zap className="w-4 h-4 text-amber-600" />
          Property Logistics (Efficiency)
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Critical for accurate estimates in SB & Ventura County. Clock time ≠ effective cleaning time.
        </p>

        {/* Parking & Entry Access */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Car className="w-4 h-4 text-muted-foreground" />
            Parking & Entry Access
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ACCESS_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateFormData({ accessType: option.value })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  accessType === option.value
                    ? "border-amber-500 bg-amber-100/50 dark:bg-amber-900/30 shadow-md"
                    : "border-border hover:border-amber-300 bg-background"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {ACCESS_ICONS[option.icon]}
                  <span className={cn(
                    "font-semibold text-sm",
                    accessType === option.value ? "text-amber-700 dark:text-amber-300" : "text-foreground"
                  )}>
                    {option.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{option.detail}</p>
                {option.deductMinutes > 0 && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    +{option.deductMinutes} min logistics
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Delicate Surfaces - Only show for priority_focus and deep_scrub */}
        {['priority_focus', 'deep_scrub'].includes(hourlyIntent) && (
          <div className="space-y-3 pt-3 border-t border-amber-200 dark:border-amber-700">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Gem className="w-4 h-4 text-muted-foreground" />
              Specialized Surfaces?
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DELICATE_SURFACE_OPTIONS.map((surface) => {
                const isActive = delicateSurfaceTypes.includes(surface.value);
                return (
                  <button
                    key={surface.value}
                    type="button"
                    onClick={() => toggleDelicateSurface(surface.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left text-xs transition-all",
                      isActive
                        ? "border-amber-500 bg-amber-100/50 dark:bg-amber-900/30"
                        : "border-border hover:border-amber-300 bg-background"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isActive && <Check className="w-3 h-3 text-amber-600" />}
                      <span className={cn(
                        "font-medium",
                        isActive ? "text-amber-700 dark:text-amber-300" : "text-foreground"
                      )}>
                        {surface.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {delicateSurfaceTypes.length > 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                💎 Special care protocols applied (+10% time buffer)
              </p>
            )}
          </div>
        )}

        {/* Surface Accessibility - Hide for Organization (clutter is the whole point) */}
        {hourlyIntent !== 'organization' && (
          <div className="space-y-3 pt-3 border-t border-amber-200 dark:border-amber-700">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Footprints className="w-4 h-4 text-muted-foreground" />
              Surface Accessibility
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              How easy is it to reach surfaces for cleaning?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HOME_CONDITION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFormData({ homeConditionLevel: option.value })}
                  className={cn(
                    "p-3 rounded-xl border-2 text-center transition-all",
                    homeConditionLevel === option.value
                      ? "border-amber-500 bg-amber-100/50 dark:bg-amber-900/30 shadow-md"
                      : "border-border hover:border-amber-300 bg-background"
                  )}
                >
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className={cn(
                    "font-semibold text-xs",
                    homeConditionLevel === option.value ? "text-amber-700 dark:text-amber-300" : "text-foreground"
                  )}>
                    {option.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Organization-specific note - Show when Organization intent is selected */}
        {hourlyIntent === 'organization' && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Organization & Declutter Focus
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  This session focuses on tidying, sorting, and organizing spaces — not surface cleaning. 
                  Clutter level determines how much we can accomplish.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* People Present During Cleaning */}
        <div className="space-y-3 pt-3 border-t border-amber-200 dark:border-amber-700">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Users className="w-4 h-4 text-muted-foreground" />
            People Present During Cleaning
          </Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Will anyone be home while we clean? (Not about furniture)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {OCCUPANCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateFormData({ isPropertyOccupied: option.value === 'occupied' } as any)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  (isPropertyOccupied && option.value === 'occupied') || (!isPropertyOccupied && option.value === 'vacant')
                    ? "border-amber-500 bg-amber-100/50 dark:bg-amber-900/30 shadow-md"
                    : "border-border hover:border-amber-300 bg-background"
                )}
              >
                <div className={cn(
                  "font-semibold text-sm",
                  (isPropertyOccupied && option.value === 'occupied') || (!isPropertyOccupied && option.value === 'vacant')
                    ? "text-amber-700 dark:text-amber-300" : "text-foreground"
                )}>
                  {option.label}
                </div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </button>
            ))}
          </div>
          
          {/* Pets question - only if occupied */}
          {isPropertyOccupied && (
            <div className="space-y-2 animate-fade-in pt-3 border-t border-amber-200 dark:border-amber-700">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Dog className="w-4 h-4 text-muted-foreground" />
                Any pets that need to be secured?
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData({ hasPetsToSecure: false } as any)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-center transition-all",
                    !hasPetsToSecure
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                      : "border-border hover:border-amber-300 bg-background"
                  )}
                >
                  <span className="font-medium">No Pets</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ hasPetsToSecure: true } as any)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-center transition-all",
                    hasPetsToSecure
                      ? "border-amber-500 bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      : "border-border hover:border-amber-300 bg-background"
                  )}
                >
                  <span className="font-medium">Yes, Will Secure Pets</span>
                </button>
              </div>
              {hasPetsToSecure && (
                <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Please ensure pets are secured in a separate room or area before the team arrives. This is for safety.</p>
                </div>
              )}
            </div>
          )}

          {/* Auto-derive vertical logistics from Structure section */}
          {/* For apartments: derived from unitFloorLevel + hasElevatorAccess */}
          {/* For single family: always 'ground' */}

          {/* Equipment & Supplies - Integrated into Property Logistics */}
          <div className="space-y-4 pt-4 border-t border-amber-200 dark:border-amber-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Zap className="w-4 h-4 text-amber-600" />
              Equipment & Supplies
            </div>
            
            {/* Vacuum Question */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'hourly.vacuum_question')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData({ hasVacuum: true })}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                    formData.hasVacuum
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                      : "border-border hover:border-amber-300 bg-background"
                  )}
                >
                  {formData.hasVacuum && <Check className="w-4 h-4" />}
                  <span className="font-medium">{t(language, 'hourly.yes')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ hasVacuum: false })}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                    !formData.hasVacuum
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                      : "border-border hover:border-amber-300 bg-background"
                  )}
                >
                  {!formData.hasVacuum && <AlertCircle className="w-4 h-4" />}
                  <span className="font-medium">{t(language, 'hourly.no')}</span>
                </button>
              </div>
              {!formData.hasVacuum && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
                  {t(language, 'hourly.vacuum_note')}
                </p>
              )}
            </div>

            {/* Parking Available */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Car className="w-4 h-4 text-muted-foreground" />
                {t(language, 'hourly.parking_question')}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData({ hasParking: true })}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                    formData.hasParking
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                      : "border-border hover:border-amber-300 bg-background"
                  )}
                >
                  {formData.hasParking && <Check className="w-4 h-4" />}
                  <span className="font-medium">{t(language, 'hourly.yes')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ hasParking: false })}
                  className={cn(
                    "p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                    !formData.hasParking
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                      : "border-border hover:border-amber-300 bg-background"
                  )}
                >
                  {!formData.hasParking && <AlertCircle className="w-4 h-4" />}
                  <span className="font-medium">{t(language, 'hourly.no')}</span>
                </button>
              </div>
              {!formData.hasParking && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
                  {t(language, 'hourly.parking_note')}
                </p>
              )}
            </div>

            {/* Supplies Selection - Only show for One-Time bookings with basic intensity */}
            {formData.hourlyIntensity === 'basic' && !isRecurring && (
              <div className="space-y-2 animate-fade-in">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  {t(language, 'hourly.supplies')}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateFormData({ hourlySupplies: 'client' })}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all",
                      formData.hourlySupplies === 'client'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-amber-300 bg-background"
                    )}
                  >
                    <div className="font-semibold text-sm">{t(language, 'hourly.client_supplies')}</div>
                    <div className="text-xs text-muted-foreground">{t(language, 'hourly.client_supplies_desc')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData({ hourlySupplies: 'company' })}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all",
                      formData.hourlySupplies === 'company'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-amber-300 bg-background"
                    )}
                  >
                    <div className="font-semibold text-sm">{t(language, 'hourly.company_supplies')}</div>
                    <div className="text-xs text-muted-foreground">{t(language, 'hourly.company_supplies_desc')}</div>
                  </button>
                </div>
              </div>
            )}

            {/* Supplies Included Note - Show for recurring services */}
            {isRecurring && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-start gap-3 animate-fade-in">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {t(language, 'hourly.supplies_included_title')}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {t(language, 'hourly.supplies_included_desc')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* THE EFFICIENCY EXPERT - Priority Focus Space (Custom Section) */}
      {hourlyIntent === 'priority_focus' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-4 sm:p-6 space-y-5 border border-blue-200 dark:border-blue-800 shadow-sm">
            {/* Premium Section Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-xs uppercase tracking-widest text-blue-700 dark:text-blue-300 font-semibold">
                  The Efficiency Expert
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Priority Focus Space</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Select the spaces that MUST be completed. Unselected areas may not be touched.
              </p>
            </div>

            {/* Primary Focus Areas */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Target className="w-4 h-4 text-blue-600" />
                Primary Focus Areas (select in order of priority)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
                  { id: 'bathrooms', label: 'Bathrooms', icon: Bath },
                  { id: 'floors', label: 'Floors Only', icon: Layers },
                  { id: 'living', label: 'Living Areas', icon: Sofa },
                  { id: 'bedrooms', label: 'Bedrooms', icon: Bed },
                  { id: 'surfaces', label: 'All Surfaces', icon: Sparkles },
                ].map((area) => {
                  const isActive = (priorityAreas || []).includes(area.id);
                  const priorityIndex = (priorityAreas || []).indexOf(area.id);
                  const AreaIcon = area.icon;
                  
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => {
                        const current = priorityAreas || [];
                        if (isActive) {
                          updateFormData({ priorityAreas: current.filter(a => a !== area.id) });
                        } else {
                          updateFormData({ priorityAreas: [...current, area.id] });
                        }
                      }}
                      className={cn(
                        "relative p-3 text-xs font-medium rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 min-h-[70px]",
                        isActive
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-white dark:bg-slate-800 text-foreground border-blue-200 dark:border-blue-700 hover:border-blue-400"
                      )}
                    >
                      {isActive && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                          {priorityIndex + 1}
                        </div>
                      )}
                      <AreaIcon className={cn("w-4 h-4", isActive ? "text-white" : "text-blue-600")} />
                      <span className="text-center">{area.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Selected Priority Display */}
              {(priorityAreas || []).length > 0 && (
                <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                    Focus Priority: {(priorityAreas || []).map((area, idx) => (
                      <span key={area}>
                        {idx > 0 && ' → '}
                        <span className="font-bold">{idx + 1}. {area.charAt(0).toUpperCase() + area.slice(1)}</span>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>

            {/* Scope Understanding Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-700">
              <Checkbox 
                id="efficiency-scope-understood"
                checked={scopeExclusionConfirmed}
                onCheckedChange={(checked) => updateFormData({ scopeExclusionConfirmed: checked === true })}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="efficiency-scope-understood" className="text-sm font-medium text-amber-800 dark:text-amber-200 cursor-pointer">
                  I understand unselected areas may not be touched
                </Label>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Team will focus on your must-have priorities within the session time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: PRIORITY TRIAGE (What matters most) - Only for intents that need it */}
      {intentConfig.showPriorityTriage && (
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-5 space-y-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
          <ListOrdered className="w-4 h-4 text-blue-600" />
          Priority Triage
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          If time runs short, what MUST be done first? Select up to 3 priorities.
        </p>

        {/* Must-Haves (max 3) - Now Dynamic */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Target className="w-4 h-4 text-blue-600" />
            Must-Complete Areas (Select up to 3)
          </Label>
          {relevantPriorityOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {relevantPriorityOptions.map((option) => {
                const isActive = hourlyMustHaves.includes(option.id);
                const isDisabled = !isActive && hourlyMustHaves.length >= 3;
                
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !isDisabled && toggleMustHave(option.id)}
                    disabled={isDisabled}
                    className={cn(
                      "px-3 py-2 rounded-full border-2 text-xs font-medium transition-all",
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : isDisabled
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                          : "border-blue-200 hover:border-blue-400 bg-background text-foreground"
                    )}
                  >
                    {isActive && <span className="mr-1">✓</span>}
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Select rooms to include above to see priority options.
            </p>
          )}
          {hourlyMustHaves.length > 0 && (
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Selected: {hourlyMustHaves.map(id => relevantPriorityOptions.find(o => o.id === id)?.label || HOURLY_MUST_HAVE_OPTIONS.find(o => o.id === id)?.label).join(' → ')}
            </div>
          )}
        </div>

        {/* Nice-to-Haves */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-blue-400" />
            If Time Permits (Bonus)
          </Label>
          <Textarea
            value={hourlyNiceToHaves}
            onChange={(e) => updateFormData({ hourlyNiceToHaves: e.target.value })}
            placeholder="e.g., Dust blinds, sweep garage, inside windows..."
            className="min-h-[60px] resize-none bg-background"
          />
        </div>
      </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          🧬 CORTEX BRAIN: Logic & Decision (How much time do I need?)
          ═══════════════════════════════════════════════════════════════════════════ */}

      {/* SECTION 9: UNIFIED SESSION SELECTOR - Premium Integrated Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-primary/90 rounded-3xl shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)'
          }} />
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-white/90 text-sm font-semibold">
              <Clock className="w-4 h-4" />
              SELECT YOUR SESSION
            </div>
          </div>

          {/* AI Recommendation Panel - Agency Model Design */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-5 mb-6">
            {/* Header: Specialist Match */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Based on your needs, we found your match
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Specialist Profile */}
              <div className="space-y-2">
                <div className="text-2xl font-black text-white">
                  {getAspirationTitle(hourlyIntent)}
                </div>
                <div className="text-sm font-medium text-emerald-300">
                  {getPromise(hourlyIntent)}
                </div>
                <div className="text-xs text-white/60 mt-2">
                  {estateCalculation.matchingNote}
                </div>
                
                {/* Access/Surface/Intent Modifier Badges */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {/* Access modifiers */}
                  {accessType !== 'standard' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {accessType === 'hillside' ? '⛰️ Hillside +15min' : '🚪 Gated +20min'}
                    </span>
                  )}
                  {estateCalculation.surfaceBufferApplied && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      💎 Delicate +10%
                    </span>
                  )}
                  {estateCalculation.verticalFrictionMinutes > 0 && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      🏢 Walk-up +{estateCalculation.verticalFrictionMinutes}min
                    </span>
                  )}
                  {/* Intent-specific modifiers */}
                  {grimeLevel === 'recovery' && (
                    <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      🔥 Recovery +30%
                    </span>
                  )}
                  {pullOutAppliances && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      👥 2-Person Safety
                    </span>
                  )}
                  {hasNaturalStone && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      💎 Stone-Safe
                    </span>
                  )}
                  {hasBiohazard && (
                    <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      ⚠️ Biohazard
                    </span>
                  )}
                  {formData.furnitureNeedsResetting && (
                    <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      🪑 Furniture Reset
                    </span>
                  )}
                  {formData.eventType && hourlyIntent === 'post_event' && (
                    <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      🎉 {formData.eventType === 'party' ? 'Party' : formData.eventType === 'wedding' ? 'Wedding' : 'Event'}
                    </span>
                  )}
                  {needsLandlordReceipt && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      📄 Deposit Receipt
                    </span>
                  )}
                </div>
              </div>
              
              {/* Right: Session Recommendation */}
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="text-xs text-white/50 uppercase tracking-wide">
                  Recommended Session
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">
                    {estateCalculation.minHours}
                  </span>
                  <span className="text-xl text-white/60">-</span>
                  <span className="text-4xl font-black text-white">
                    {estateCalculation.maxHours}
                  </span>
                  <span className="text-sm text-white/50">hours</span>
                </div>
                
                {/* Clock vs Labor Display */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-white/50" />
                    <span className="text-white/70">
                      {estateCalculation.minHours} hrs on-site
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">
                      {estateCalculation.minHours * teamSize} labor hrs
                    </span>
                  </div>
                </div>
                
                {/* Rate Display */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Session Rate</span>
                    <span className="text-sm font-bold text-white">
                      ${rate}/hr × {teamSize} = <span className="text-emerald-300">${rate * teamSize}/hr</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Collapsible Time Breakdown */}
            <details className="mt-4 group">
              <summary className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 uppercase tracking-wide">
                <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                View time calculation breakdown
              </summary>
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3 text-xs">
                {/* Room-Based Time Components */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-white/50">Bathrooms ({bathsToClean})</span>
                  <span className="text-white font-mono">{estateCalculation.roomMinutes.bathrooms} min</span>
                  
                  <span className="text-white/50">Bedrooms ({bedsToClean})</span>
                  <span className="text-white font-mono">{estateCalculation.roomMinutes.bedrooms} min</span>
                  
                  <span className="text-white/50">Kitchen</span>
                  <span className="text-white font-mono">{estateCalculation.roomMinutes.kitchen} min</span>
                  
                  <span className="text-white/50">Living Areas</span>
                  <span className="text-white font-mono">{estateCalculation.roomMinutes.living} min</span>
                  
                  {estateCalculation.sqftAdjustmentMinutes > 0 && (
                    <>
                      <span className="text-white/50">Sqft Adjustment (&gt;2,500)</span>
                      <span className="text-amber-300 font-mono">+{estateCalculation.sqftAdjustmentMinutes} min</span>
                    </>
                  )}
                </div>
                
                {/* Multipliers */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex justify-between">
                    <span className="text-white/50">Intent Multiplier ({hourlyIntent.replace('_', ' ')})</span>
                    <span className={cn(
                      "font-mono",
                      estateCalculation.intentMultiplierApplied > 1 ? "text-amber-300" : "text-emerald-300"
                    )}>
                      ×{estateCalculation.intentMultiplierApplied}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-white/50">Condition Efficiency</span>
                    <span className={cn(
                      "font-mono",
                      effectiveCleaningPercent < 100 ? "text-amber-300" : "text-emerald-300"
                    )}>
                      {effectiveCleaningPercent}%
                    </span>
                  </div>
                  {estateCalculation.occupancyMultiplier > 1 && (
                    <div className="flex justify-between mt-1">
                      <span className="text-white/50">Occupied Home</span>
                      <span className="text-amber-300 font-mono">×{estateCalculation.occupancyMultiplier}</span>
                    </div>
                  )}
                </div>
                
                {/* Logistics Buffer */}
                {estateCalculation.logisticsMinutes > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-white/50 text-[10px] uppercase tracking-wide">Logistics Buffer</span>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {accessType !== 'standard' && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px]">
                          {accessType === 'hillside' ? '⛰️ +15min' : '🚪 +20min'}
                        </span>
                      )}
                      {estateCalculation.verticalFrictionMinutes > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px]">
                          🏢 +{estateCalculation.verticalFrictionMinutes}min
                        </span>
                      )}
                      {estateCalculation.taskMinutes > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px]">
                          ✨ Tasks +{estateCalculation.taskMinutes}min
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Total Formula */}
                <div className="pt-3 border-t border-white/10 bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/50 mb-1">TOTAL CALCULATION</div>
                  <div className="text-white/80 font-mono text-xs">
                    ({estateCalculation.totalManMinutes} man-min ÷ {teamSize} cleaners) ÷ 60 = <span className="text-emerald-400 font-bold">{estateCalculation.minHours} hrs</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
          
          {/* Minimum Charge Notice */}
          {total < 250 && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-3 flex items-start gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-300">
                  Session minimum of $250 applied
                </p>
                <p className="text-xs text-blue-200/70 mt-0.5">
                  Calculated total (${Math.round(formData.hourlyHours * teamSize * rate)}) is below deployment minimum.
                </p>
              </div>
            </div>
          )}

          {/* Section Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Choose Duration</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* Quick Select Shortcuts - Mobile responsive */}
          <div className="flex flex-wrap justify-center gap-2 mb-5">
            <button
              type="button"
              onClick={() => {
                updateFormData({ hourlyHours: HOURLY_CONFIG.MIN_CLOCK_HOURS });
                setHasManuallySelectedHours(true);
              }}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-bold transition-all touch-manipulation",
                formData.hourlyHours === HOURLY_CONFIG.MIN_CLOCK_HOURS
                  ? "bg-white text-slate-900 shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20 active:bg-white/30"
              )}
            >
              Minimum
            </button>
            <button
              type="button"
              onClick={() => {
                updateFormData({ hourlyHours: recommendedHours });
                setHasManuallySelectedHours(false); // User is accepting AI recommendation
              }}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 touch-manipulation",
                formData.hourlyHours === recommendedHours
                  ? "bg-amber-400 text-amber-900 shadow-lg ring-2 ring-amber-300"
                  : "bg-amber-400/80 text-amber-900 hover:bg-amber-400"
              )}
            >
              <Star className="w-4 h-4" />
              Recommended
            </button>
            <button
              type="button"
              onClick={() => {
                updateFormData({ hourlyHours: Math.min(12, recommendedHours + 1) });
                setHasManuallySelectedHours(true);
              }}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 touch-manipulation",
                formData.hourlyHours === Math.min(12, recommendedHours + 1)
                  ? "bg-white text-slate-900 shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20 active:bg-white/30"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              +1hr Buffer
            </button>
          </div>

          {/* Hour Cards Grid - Premium Design - Mobile First */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 md:grid-cols-8">
            {HOUR_OPTIONS.map((hours) => {
              const isRecommended = hours === recommendedHours;
              const isSelected = formData.hourlyHours === hours;
              const isBelowRecommended = hours < recommendedHours;
              
              return (
                <button
                  key={hours}
                  type="button"
                  onClick={() => {
                    updateFormData({ hourlyHours: hours });
                    // Mark as manual selection unless user clicked on the recommended option
                    setHasManuallySelectedHours(hours !== recommendedHours);
                  }}
                  className={cn(
                    "relative p-3 sm:p-5 rounded-2xl font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1 min-h-[80px] sm:min-h-[100px] touch-manipulation",
                    isSelected
                      ? "bg-white text-slate-900 shadow-2xl scale-105 ring-4 ring-white/30 z-10"
                      : isRecommended
                        ? "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-900 hover:from-amber-300 hover:to-amber-400 ring-2 ring-amber-300/50 shadow-lg shadow-amber-500/20"
                        : isBelowRecommended
                          ? "bg-white/5 text-white/30 hover:bg-white/10"
                          : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {/* Recommended Star Badge */}
                  {isRecommended && !isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  )}
                  
                  {/* Hour Number */}
                  <span className="text-3xl sm:text-4xl font-black tracking-tight">{hours}</span>
                  <span className="text-xs font-medium opacity-70 uppercase tracking-wider">hours</span>
                </button>
              );
            })}
          </div>

          {/* Premium Session Rate Summary */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex flex-col items-center gap-4">
              {/* Team Math Visual - Desktop */}
              <div className="hidden sm:flex items-center justify-center gap-4 text-white">
                <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl min-w-[70px]">
                  <Users className="w-5 h-5 mb-1 opacity-70" />
                  <span className="text-2xl font-black">{teamSize}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-50">cleaners</span>
                </div>
                <span className="text-3xl font-light text-white/30">×</span>
                <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl min-w-[70px]">
                  <Clock className="w-5 h-5 mb-1 opacity-70" />
                  <span className="text-2xl font-black">{formData.hourlyHours}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-50">hours</span>
                </div>
                <span className="text-3xl font-light text-white/30">=</span>
                <div className="flex flex-col items-center p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl border border-emerald-400/30 min-w-[90px]">
                  <span className="text-3xl font-black text-emerald-400">{totalLaborHours}</span>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300/70">labor hours</span>
                </div>
              </div>
              
              {/* Team Math Visual - Mobile Compact */}
              <div className="flex sm:hidden items-center justify-center gap-2 text-white">
                <div className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-lg">
                  <Users className="w-4 h-4 opacity-70" />
                  <span className="text-lg font-bold">{teamSize}</span>
                </div>
                <span className="text-xl font-light text-white/30">×</span>
                <div className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-lg">
                  <Clock className="w-4 h-4 opacity-70" />
                  <span className="text-lg font-bold">{formData.hourlyHours}h</span>
                </div>
                <span className="text-xl font-light text-white/30">=</span>
                <div className="px-4 py-2 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-lg border border-emerald-400/30">
                  <span className="text-xl font-black text-emerald-400">{totalLaborHours}h</span>
                </div>
              </div>
              
              {/* Rate Display */}
              <div className="text-center">
                <div className="text-sm text-white/50 mb-1">Priority Session Rate</div>
                <div className="text-xl sm:text-2xl font-black text-white">
                  ${rate}<span className="text-white/40 font-normal text-sm">/hr</span>
                  <span className="text-white/30 mx-2">×</span>
                  <span className="text-emerald-400">{teamSize}</span>
                  <span className="text-white/40 font-normal text-sm"> = </span>
                  <span className="text-emerald-400">${rate * teamSize}</span>
                  <span className="text-white/40 font-normal text-sm">/hr total</span>
                </div>
              </div>
              
              <p className="text-center text-white/30 text-[10px]">
                {t(language, 'hourly.min_hours_note', { min: String(HOURLY_CONFIG.MIN_CLOCK_HOURS) })}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Warning if selected < recommended (enhanced for strict overtime) */}
      {isUnderRecommended && (
        <div className={cn(
          "rounded-xl p-3 flex items-start gap-2 animate-fade-in",
          overtimeProtocol === 'strict'
            ? "bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-700"
            : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
        )}>
          <AlertTriangle className={cn(
            "w-4 h-4 flex-shrink-0 mt-0.5",
            overtimeProtocol === 'strict' ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
          )} />
          <div>
            <p className={cn(
              "text-sm",
              overtimeProtocol === 'strict' ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
            )}>
              The selected time ({formData.hourlyHours} hrs) may not complete all priority areas. 
              Consider adding {hoursShortfall} more hour{hoursShortfall !== 1 ? 's' : ''}.
            </p>
            {overtimeProtocol === 'strict' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                ⚠️ With "Hard Stop" selected, team will stop exactly when time ends.
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 12: OVERTIME PROTOCOL (The Hard Stop Rule) */}
      <div className="bg-card rounded-2xl p-5 space-y-4 border-2 border-border">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
          <Timer className="w-4 h-4 text-muted-foreground" />
          When Time Is Up...
        </div>
        <p className="text-xs text-muted-foreground">
          What should we do if we're close to finishing but time runs out?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {OVERTIME_PROTOCOL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFormData({ overtimeProtocol: option.value })}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all",
                overtimeProtocol === option.value
                  ? option.value === 'strict'
                    ? "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 shadow-md"
                    : "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 shadow-md"
                  : "border-border hover:border-primary/50 bg-background"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {option.value === 'strict' ? (
                  <Hand className="w-4 h-4 text-red-500" />
                ) : (
                  <Clock className="w-4 h-4 text-emerald-500" />
                )}
                <span className={cn(
                  "font-semibold text-sm",
                  overtimeProtocol === option.value
                    ? option.value === 'strict' ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"
                    : "text-foreground"
                )}>
                  {option.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </div>


      {/* SECTION 14: INVESTMENT SUMMARY - Financial Breakdown */}
      {isRecurring && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            {t(language, 'hourly.investment_summary')}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-muted-foreground">Recommended Time</span>
              <span className="font-mono font-semibold text-amber-600">{recommendedHours} hrs</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-muted-foreground">Selected Time</span>
              <span className={cn(
                "font-mono font-semibold",
                isUnderRecommended ? "text-red-600" : "text-foreground"
              )}>{formData.hourlyHours} hrs</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-muted-foreground">{t(language, 'hourly.rate_applied')}</span>
              <span className="font-mono font-semibold text-foreground">${rate}/hr</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-muted-foreground">{t(language, 'hourly.investment_per_session')}</span>
              <span className="font-mono font-semibold text-foreground">${total}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 -mx-1">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {t(language, 'hourly.monthly_estimated')}
              </span>
              <span className="font-mono font-bold text-lg text-emerald-700 dark:text-emerald-300">
                ${monthlyEstimate}
              </span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            {t(language, 'hourly.monthly_note')}
          </p>
        </div>
      )}


      {/* Priority Notes */}
      <div className="space-y-3">
        <Label htmlFor="priority-notes" className="text-sm font-semibold">
          {t(language, 'hourly.priority_label')} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="priority-notes"
          value={formData.hourlyPriorityNotes}
          onChange={(e) => updateFormData({ hourlyPriorityNotes: e.target.value })}
          placeholder={t(language, 'hourly.priority_placeholder')}
          className="min-h-[100px] resize-none"
          required
        />
        {!formData.hourlyPriorityNotes && (
          <p className="text-xs text-destructive">{t(language, 'hourly.priority_required')}</p>
        )}
      </div>

      {/* Trust badges shown in Review step */}
    </div>
  );
}
