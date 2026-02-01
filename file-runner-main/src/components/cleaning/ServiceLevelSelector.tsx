import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Home, Sparkles, ClipboardCheck, Key, Check, Crown, Clock, DollarSign } from 'lucide-react';
import { useMemo } from 'react';
import { pricingData, serviceTypeMap } from '@/lib/pricing';

// Service Level configuration - Service-First Architecture
const serviceLevels = {
  LIVE_HERE: [
    {
      value: 'Standard Clean',
      icon: Home,
      labelKey: 'svc.display_standard',
      subtitleKey: 'svc.standard_sub',
      timeHint: '~2-3 hrs',
      colorClass: 'primary',
    },
    {
      value: 'Deep Clean',
      icon: Sparkles,
      labelKey: 'svc.display_deep',
      subtitleKey: 'svc.deep_sub',
      badgeKey: 'svc.deep_badge',
      isPopular: true,
      timeHint: '~4-5 hrs',
      colorClass: 'primary',
    },
  ],
  MOVING: [
    {
      value: 'Move-In/Out',
      moveContext: 'move_out' as const,
      icon: ClipboardCheck,
      labelKey: 'svc.display_move_out',
      subtitleKey: 'svc.move_out_sub',
      badgeKey: 'svc.move_out_badge',
      timeHint: '~4-6 hrs',
      colorClass: 'amber',
      showFreeBonus: true,
    },
    {
      value: 'Move-In/Out',
      moveContext: 'move_in' as const,
      icon: Key,
      labelKey: 'svc.display_move_in',
      subtitleKey: 'svc.move_in_sub',
      badgeKey: 'svc.move_in_badge',
      timeHint: '~3-5 hrs',
      colorClass: 'emerald',
    },
  ],
};

export function ServiceLevelSelector() {
  const { 
    language, 
    formData, 
    updateFormData, 
    situation, 
    moveContext, 
    setMoveContext,
    toggleAddon,
    selectedAddons,
    movingAddonsApplied,
    setMovingAddonsApplied
  } = useBooking();

  const isMovingScenario = situation === 'MOVING';
  const isLivingScenario = situation === 'LIVE_HERE';

  // Get visible service levels based on situation
  const visibleLevels = isMovingScenario 
    ? serviceLevels.MOVING 
    : serviceLevels.LIVE_HERE;

  // Calculate base prices for display
  const basePrices = useMemo(() => {
    const idx = formData.homeSize ?? 0;
    return {
      standard: pricingData[idx]?.[serviceTypeMap['Standard Clean']] ?? 185,
      deep: pricingData[idx]?.[serviceTypeMap['Deep Clean']] ?? 290,
      moveInOut: pricingData[idx]?.[serviceTypeMap['Move-In/Out']] ?? 295,
    };
  }, [formData.homeSize]);

  // Get current service level
  const getCurrentLevel = () => {
    if (isMovingScenario) return 'Move-In/Out';
    if (['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType)) {
      return formData.baseServiceLevel || 'Standard Clean';
    }
    return formData.serviceType || '';
  };

  const currentLevel = getCurrentLevel();

  const handleLevelSelect = (level: string, serviceMoveContext?: 'move_out' | 'move_in') => {
    // Handle move context for Moving scenario
    if (serviceMoveContext) {
      setMoveContext(serviceMoveContext);
      
      // Auto-pre-select move out add-ons (once per session)
      if (serviceMoveContext === 'move_out' && !movingAddonsApplied) {
        const ovenAddon = selectedAddons.find(a => a.value === 'oven');
        const fridgeAddon = selectedAddons.find(a => a.value === 'fridge_empty');
        const cabinetsAddon = selectedAddons.find(a => a.value === 'cabinets');
        
        if (!ovenAddon) toggleAddon('oven', 1);
        if (!fridgeAddon) toggleAddon('fridge_empty', 1);
        if (!cabinetsAddon) toggleAddon('cabinets', 1);
        
        setMovingAddonsApplied(true);
      }
    } else {
      setMoveContext(null);
    }

    // If currently on recurring, keep the frequency but update the base level
    const isRecurring = ['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType);
    if (isRecurring) {
      updateFormData({ baseServiceLevel: level });
    } else {
      updateFormData({ 
        serviceType: level,
        baseServiceLevel: level
      });
    }
  };

  // Get starting price for display
  const getStartingPrice = (level: string) => {
    if (level === 'Standard Clean') return basePrices.standard;
    if (level === 'Deep Clean') return basePrices.deep;
    if (level === 'Move-In/Out') return basePrices.moveInOut;
    return 185;
  };

  return (
    <div className="space-y-5">
      {/* Premium Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5" />
          {t(language, 'svc.level_title')}
        </div>
        <h3 className="text-lg font-bold text-foreground">
          {isMovingScenario 
            ? t(language, 'svc.level_title_moving')
            : t(language, 'svc.level_title_living')
          }
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t(language, 'svc.level_subtitle')}
        </p>
      </div>

      {/* Service Level Cards - Premium Grid */}
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {visibleLevels.map((service) => {
          const Icon = service.icon;
          const uniqueKey = 'moveContext' in service && service.moveContext 
            ? `${service.value}-${service.moveContext}` 
            : service.value;
          
          // For moving scenario, check moveContext match
          const isSelected = isMovingScenario 
            ? (currentLevel === service.value && moveContext === ('moveContext' in service ? service.moveContext : null))
            : currentLevel === service.value;

          const startingPrice = getStartingPrice(service.value);
          const isPopular = 'isPopular' in service && service.isPopular;
          const showFreeBonus = 'showFreeBonus' in service && service.showFreeBonus;

          return (
            <label
              key={uniqueKey}
              className="relative cursor-pointer touch-manipulation group"
            >
              <input
                type="radio"
                name="service_level_primary"
                value={uniqueKey}
                checked={isSelected}
                onChange={() => handleLevelSelect(
                  service.value, 
                  'moveContext' in service ? service.moveContext : undefined
                )}
                className="absolute opacity-0 w-0 h-0"
              />
              <div
                className={cn(
                  'relative border-2 rounded-2xl p-4 sm:p-5 text-center transition-all duration-200',
                  'flex flex-col items-center gap-2 h-full',
                  'min-h-[160px] sm:min-h-[180px]',
                  'active:scale-[0.97]',
                  // Selected state with glow
                  isSelected && 'border-primary bg-primary/[0.05] shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)] ring-2 ring-primary/20',
                  // Popular card styling
                  isPopular && !isSelected && 'border-primary/40 bg-primary/[0.02]',
                  // Default state
                  !isSelected && !isPopular && 'border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/20'
                )}
              >
                {/* Badge */}
                {('badgeKey' in service && service.badgeKey) && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                    <span className={cn(
                      "text-[9px] px-2.5 py-1 rounded-full font-bold uppercase whitespace-nowrap shadow-md",
                      'moveContext' in service && service.moveContext === 'move_out' 
                        ? "bg-amber-500 text-white" 
                        : 'moveContext' in service && service.moveContext === 'move_in' 
                          ? "bg-emerald-500 text-white" 
                          : "bg-primary text-primary-foreground"
                    )}>
                      {t(language, service.badgeKey)}
                    </span>
                  </div>
                )}

                {/* Selection checkmark */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                  </div>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200',
                    isSelected ? 'bg-primary/15 scale-110' : isPopular ? 'bg-primary/10' : 'bg-muted/50'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6 transition-colors',
                      isSelected || isPopular ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </div>

                {/* Title */}
                <span className={cn(
                  'text-sm sm:text-base font-bold leading-tight',
                  isSelected ? 'text-foreground' : 'text-foreground/90'
                )}>
                  {t(language, service.labelKey)}
                </span>

                {/* Subtitle */}
                <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight text-center px-2">
                  {t(language, service.subtitleKey)}
                </span>

                {/* Price & Time Hint */}
                <div className="mt-auto pt-2 space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="w-3 h-3" />
                    <span className="font-semibold">From ${startingPrice}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/70">
                    <Clock className="w-3 h-3" />
                    <span>{service.timeHint}</span>
                  </div>
                </div>

                {/* Free Bonus indicator for Move Out */}
                {showFreeBonus && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    <span>+ FREE Appliance</span>
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* Visual indicator when selected */}
      {currentLevel && (
        <div className="text-center animate-fade-in">
          <p className="text-xs text-muted-foreground/80 flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            {t(language, 'svc.level_selected_hint')}
          </p>
        </div>
      )}
    </div>
  );
}

