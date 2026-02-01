import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Sparkles, Truck, Home, Calendar, Check, Percent, Gift, Crown, AlertCircle, Lock, Key, ClipboardCheck, DollarSign, Shield, Star, Clock, Users, Zap } from 'lucide-react';
import { ServiceInfoPanel } from './ServiceInfoPanel';
import { RecurringPricingBlock } from './RecurringPricingBlock';
import { ServiceInclusions } from './ServiceInclusions';
import { pricingData, serviceTypeMap, homeSizeOptions } from '@/lib/pricing';
import { useEffect, useMemo } from 'react';
import { ServiceTier } from '@/lib/serviceScope';

// Service Level Options (Row 1) - matches reference design
// NOTE: Internal values (value field) MUST NOT change - only labelKey for display
// SMART TRACKS: Each service specifies which situations it appears in
type SituationType = 'LIVE_HERE' | 'MOVING' | 'HOURLY' | 'SPECIFIC_AREAS' | 'COMMERCIAL' | 'RENOVATION';

const serviceLevels: Array<{
  value: string;
  icon: typeof Home;
  labelKey: string;
  subtitleKey: string;
  badge?: string;
  badgeKey?: string;
  isPopular?: boolean;
  showWelcomeBundle?: boolean;
  autoSelectForMoving?: boolean;
  depositUpsellKey?: string;
  situations: SituationType[];
  // NEW: For move context separation
  moveContext?: 'move_out' | 'move_in';
}> = [
  { 
    value: 'Standard Clean', 
    icon: Home,
    labelKey: 'svc.display_standard',
    subtitleKey: 'svc.standard_sub',
    situations: ['LIVE_HERE']
  },
  { 
    value: 'Deep Clean', 
    icon: Sparkles,
    labelKey: 'svc.display_deep',
    subtitleKey: 'svc.deep_sub',
    badge: 'svc.deep_badge',
    isPopular: true,
    situations: ['LIVE_HERE']
  },
  // SPLIT: Move Out Cleaning (same pricing as Move-In/Out)
  { 
    value: 'Move-In/Out', 
    icon: ClipboardCheck,
    labelKey: 'svc.display_move_out',
    subtitleKey: 'svc.move_out_sub',
    badgeKey: 'svc.move_out_badge',
    situations: ['MOVING'],
    moveContext: 'move_out'
  },
  // SPLIT: Move In Cleaning (same pricing as Move-In/Out)
  { 
    value: 'Move-In/Out', 
    icon: Key,
    labelKey: 'svc.display_move_in',
    subtitleKey: 'svc.move_in_sub',
    badgeKey: 'svc.move_in_badge',
    situations: ['MOVING'],
    moveContext: 'move_in'
  },
];

// Frequency Options (Row 2)
// Discount percentages align with FREQUENCY_MULTIPLIERS in pricing_v2.ts
const frequencyOptions = [
  { value: 'one-time', labelKey: 'freq.once', lossKey: 'freq.once_loss', discount: 0 },
  { value: 'Monthly Price', labelKey: 'freq.monthly', lossKey: 'freq.monthly_loss', discount: 10, badgeColor: 'bg-blue-500' },
  { value: 'Bi-Weekly Price', labelKey: 'freq.biweekly', lossKey: 'freq.biweekly_loss', discount: 15, badgeColor: 'bg-emerald-500', isBestValue: true },
  { value: 'Weekly Price', labelKey: 'freq.weekly', lossKey: 'freq.weekly_loss', discount: 20, badgeColor: 'bg-green-600' },
];

export function ServiceTypeSelector() {
  const { language, formData, updateFormData, situation, moveContext, setMoveContext, toggleAddon, selectedAddons, movingAddonsApplied, setMovingAddonsApplied, setSituation, setCurrentStep } = useBooking();
  
  // Check if large estate for Whale Intercept
  const largeSqftValues = ['SF_3000_3500', 'SF_3500_4000', 'SF_4000_5000', 'SF_5000_7000', 'SF_7000+'];
  const isLargeEstate = largeSqftValues.includes(formData.squareFootageRange);
  
  // Handle switch to hourly mode for large estates
  const handleSwitchToHourly = () => {
    updateFormData({ isHourlyMode: true });
    setSituation('SPECIFIC_AREAS');
    setCurrentStep(1);
  };

  // SMART TRACKS: Determine which tunnel we're in
  const isMovingScenario = situation === 'MOVING';
  const isLivingScenario = situation === 'LIVE_HERE';

  // Calculate base prices for display (no add-ons)
  const basePrices = useMemo(() => {
    const idx = formData.homeSize ?? 5;
    return {
      standard: pricingData[idx]?.[serviceTypeMap['Standard Clean']] ?? 185,
      deep: pricingData[idx]?.[serviceTypeMap['Deep Clean']] ?? 290,
      moveInOut: pricingData[idx]?.[serviceTypeMap['Move-In/Out']] ?? 295,
      weekly: pricingData[idx]?.[serviceTypeMap['Weekly Price']] ?? 150,
      biWeekly: pricingData[idx]?.[serviceTypeMap['Bi-Weekly Price']] ?? 155,
      monthly: pricingData[idx]?.[serviceTypeMap['Monthly Price']] ?? 165,
    };
  }, [formData.homeSize]);

  // SMART TRACK B: Auto-select Move Out as default when entering MOVING scenario
  useEffect(() => {
    if (isMovingScenario && !moveContext) {
      // Auto-select Move Out as default (most common scenario)
      setMoveContext('move_out');
    }
  }, [isMovingScenario, moveContext, setMoveContext]);

  // SMART TRACK B: Auto-pre-select add-ons for MOVING when moveContext is set (ONCE per session)
  useEffect(() => {
    if (isMovingScenario && moveContext && !movingAddonsApplied) {
      // Force Move-In/Out service
      updateFormData({ 
        serviceType: 'Move-In/Out',
        baseServiceLevel: 'Move-In/Out'
      });
      
      // Pre-select recommended add-ons for deposit return (Oven + Fridge + Cabinets) for move_out ONLY
      if (moveContext === 'move_out') {
        const ovenAddon = selectedAddons.find(a => a.value === 'oven');
        const fridgeAddon = selectedAddons.find(a => a.value === 'fridge_empty');
        const cabinetsAddon = selectedAddons.find(a => a.value === 'cabinets');
        
        if (!ovenAddon) toggleAddon('oven', 1);
        if (!fridgeAddon) toggleAddon('fridge_empty', 1);
        if (!cabinetsAddon) toggleAddon('cabinets', 1);
        
        // Mark as applied to prevent re-triggering
        setMovingAddonsApplied(true);
      }
    }
  }, [isMovingScenario, moveContext, movingAddonsApplied]);

  // Determine current service level and frequency
  const isRecurring = ['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType);
  
  // Get the base service level (not frequency)
  const getCurrentLevel = () => {
    if (isMovingScenario) {
      return 'Move-In/Out';
    }
    if (['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType)) {
      return formData.baseServiceLevel || 'Deep Clean';
    }
    return formData.serviceType;
  };

  const getCurrentFrequency = () => {
    // If moving scenario, frequency is always one-time
    if (isMovingScenario) {
      return 'one-time';
    }
    if (['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType)) {
      return formData.serviceType;
    }
    return 'one-time';
  };

  const currentLevel = getCurrentLevel();
  const currentFrequency = getCurrentFrequency();

  // SMART TRACKS: Filter visible service cards based on situation
  let visibleServiceLevels: typeof serviceLevels;
  
  if (situation) {
    // Filter to services that include this situation
    visibleServiceLevels = serviceLevels.filter(s => s.situations.includes(situation));
  } else {
    // FALLBACK (no situation selected): Show all services (legacy behavior)
    visibleServiceLevels = serviceLevels;
  }

  // Check if frequency row should be hidden - ONLY for Moving scenario now
  // Standard + Deep both show Frequency Dock when selected
  const shouldHideFrequency = isMovingScenario;
  
  // Check if a service level has been selected (for Frequency Dock visibility)
  const isServiceLevelSelected = currentLevel === 'Standard Clean' || currentLevel === 'Deep Clean';
  
  // Determine if we're on Standard or Deep for dynamic copy
  const isStandardSelected = currentLevel === 'Standard Clean';
  const isDeepSelected = currentLevel === 'Deep Clean';
  
  // Get current level config for Welcome Bundle check
  const currentLevelConfig = serviceLevels.find(s => s.value === currentLevel);
  
  // Check if Welcome Bundle should show (Move In/Out + Recurring) - only if not moving scenario
  const showWelcomeBundle = currentLevelConfig?.showWelcomeBundle && isRecurring && !isMovingScenario;

  const handleLevelSelect = (level: string, serviceMoveContext?: 'move_out' | 'move_in') => {
    // Handle move context for Moving scenario
    if (serviceMoveContext) {
      setMoveContext(serviceMoveContext);
    } else {
      setMoveContext(null);
    }

    // If currently on recurring, keep the frequency but update the base level
    if (currentFrequency !== 'one-time') {
      updateFormData({ 
        baseServiceLevel: level,
      });
      // Note: recurringStartMode is auto-synced in BookingContext useEffect
    } else {
      // One-time: set the service type directly
      updateFormData({ 
        serviceType: level,
        baseServiceLevel: level
      });
    }
  };

  const handleFrequencySelect = (freq: string) => {
    if (freq === 'one-time') {
      // Switch to one-time with current level
      updateFormData({ serviceType: currentLevel });
    } else {
      // Switch to recurring frequency
      updateFormData({ 
        serviceType: freq,
        baseServiceLevel: currentLevel
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          FREQUENCY DOCK ONLY - Service Level moved to ServiceLevelSelector
          This component now handles ONLY recurring frequency selection
      ═══════════════════════════════════════════════════════════════════ */}

      {/* ROW 2: UNIVERSAL FREQUENCY DOCK - Shows for Standard + Deep when selected */}
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          (shouldHideFrequency || !isServiceLevelSelected) ? 'hidden' : 'block'
        )}
      >
        <div className="space-y-3">
          {/* Dynamic Header based on service level */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {isDeepSelected 
                ? t(language, 'freq.dock_header_deep')
                : t(language, 'freq.dock_header_standard')
              }
            </p>
            <p className="text-xs text-muted-foreground">
              {isDeepSelected 
                ? t(language, 'freq.dock_helper_deep')
                : t(language, 'freq.dock_helper_standard')
              }
            </p>
          </div>
          
          {/* OPERATIONAL WARNING - Only for Standard Clean */}
          {isStandardSelected && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                  {t(language, 'freq.standard_warning')}
                </p>
              </div>
            </div>
          )}
          
          {/* Welcome Bundle Alert for Move In/Out + Recurring */}
          {showWelcomeBundle && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 border-2 border-amber-400/50 dark:border-amber-600/50 rounded-xl p-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                    {t(language, 'bundle.title')}
                  </p>
                  <p className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                    {t(language, 'bundle.desc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
            {frequencyOptions.map((freq) => {
              const isSelected = currentFrequency === freq.value;

              return (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => handleFrequencySelect(freq.value)}
                  className={cn(
                    'relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border-2 transition-all duration-200',
                    'min-h-[75px] touch-manipulation active:scale-[0.97]',
                    freq.isBestValue && !isSelected && 'border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/20',
                    freq.isBestValue && isSelected && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]',
                    !freq.isBestValue && isSelected && 'border-primary bg-primary/[0.03] shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]',
                    !freq.isBestValue && !isSelected && 'border-border bg-card hover:border-muted-foreground/40'
                  )}
                >
                  {/* Savings Badge */}
                  {freq.discount > 0 && (
                    <div className={cn(
                      'absolute -top-2 left-1/2 -translate-x-1/2 z-10',
                      'text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap shadow-sm flex items-center gap-0.5',
                      freq.badgeColor
                    )}>
                      <Percent className="w-2.5 h-2.5" />
                      {freq.discount}%{freq.isBestValue ? ' ✦' : ''}
                    </div>
                  )}

                  {/* Best Value Badge */}
                  {freq.isBestValue && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-emerald-600 text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap shadow-sm">
                        {t(language, 'freq.best_value')}
                      </span>
                    </div>
                  )}

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}

                  {/* Label */}
                  <span className={cn(
                    'text-xs sm:text-sm font-semibold',
                    isSelected ? 'text-foreground' : 'text-foreground/80'
                  )}>
                    {t(language, freq.labelKey)}
                  </span>

                  {/* Loss-Aversion Microcopy */}
                  <span className={cn(
                    'text-[8px] sm:text-[9px] leading-tight text-center max-w-[70px]',
                    freq.discount === 0 ? 'text-muted-foreground/70' : 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {t(language, freq.lossKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {/* SMART TRACK B: Contextual Upsell - Different for Move Out vs Move In */}
      {isMovingScenario && moveContext === 'move_out' && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl p-4 border border-amber-300/50 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                {t(language, 'svc.move_out_upsell_title')}
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                {t(language, 'svc.move_out_upsell_desc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {isMovingScenario && moveContext === 'move_in' && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl p-4 border border-emerald-300/50 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Key className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                {t(language, 'svc.move_in_upsell_title')}
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                {t(language, 'svc.move_in_upsell_desc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* === CONTEXT-AWARE RECURRING PRICING BLOCK === */}
      <RecurringPricingBlock />

      {/* Service Info Panel - contextual based on selections */}
      {/* Hide for MOVING scenario - already covered by ServiceInclusions */}
      {!isMovingScenario && <ServiceInfoPanel />}
    </div>
  );
}
