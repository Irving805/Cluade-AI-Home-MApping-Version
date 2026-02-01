import { useBooking, Situation } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Home, Truck, Check, Clock, Grid3X3, ArrowRight, HardHat, Gift, Star } from 'lucide-react';

// Situation cards for triage step - RESIDENTIAL ONLY (Commercial is filtered at Industry step)
// Order: LIVE_HERE → MOVING → HOURLY (NEW) → SPECIFIC_AREAS (By Area only) → RENOVATION
const situationCards: Array<{
  value: Situation;
  icon: typeof Home;
  titleKey: string;
  subtitleKey: string;
  badge?: string;
  gradient: string;
  iconColor: string;
}> = [
  {
    value: 'LIVE_HERE',
    icon: Home,
    titleKey: 'triage.live_here',
    subtitleKey: 'triage.live_here_sub',
    badge: 'triage.live_here_badge',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'MOVING',
    icon: Truck,
    titleKey: 'triage.moving',
    subtitleKey: 'triage.moving_sub',
    badge: 'triage.moving_bonus',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  // NEW: HOURLY as primary option (previously nested under SPECIFIC_AREAS)
  {
    value: 'HOURLY',
    icon: Clock,
    titleKey: 'triage.hourly',
    subtitleKey: 'triage.hourly_sub',
    badge: 'triage.premium',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  // SPECIFIC_AREAS now means "By Area" ONLY (no hourly toggle)
  {
    value: 'SPECIFIC_AREAS',
    icon: Grid3X3,
    titleKey: 'triage.specific_areas',
    subtitleKey: 'triage.specific_areas_sub',
    badge: 'triage.custom',
    gradient: 'from-primary/20 to-primary/10',
    iconColor: 'text-primary',
  },
  {
    value: 'RENOVATION',
    icon: HardHat,
    titleKey: 'triage.renovation',
    subtitleKey: 'triage.renovation_sub',
    badge: 'triage.specialized',
    gradient: 'from-slate-500/20 to-zinc-500/20',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
];

export function StepTriage() {
  const { language, situation, setSituation, setMode, setCurrentStep, updateFormData, formData, setIndustry } = useBooking();

  // Back to industry selection (FROZEN: hidden but kept for future use)
  const handleBackToIndustry = () => {
    setIndustry(null);
    setSituation(null);
    setCurrentStep(0);
  };

  const handleSelect = (value: Situation) => {
    if (!value) return;
    setSituation(value);
    
    // === INVARIANT RESET: Clear ALL conflicting state on every selection ===
    // This prevents "ghost state" from previous flow visits from hijacking routing
    updateFormData({ 
      isHourlyMode: false,
      // Clear hourly-specific state completely
      hourlyHours: undefined,
      hourlyFrequency: undefined,
      hourlyIntent: undefined,
      hourlyPriorityNotes: '',
    });
    
    // RENOVATION flow: Full mode, advance to Step 1 (RenovationStart)
    if (value === 'RENOVATION') {
      setMode('full');
      setTimeout(() => {
        setCurrentStep(1);
      }, 150);
      return;
    }
    
    // NEW: HOURLY flow - Direct to hourly config, no sub-step needed
    if (value === 'HOURLY') {
      setMode('custom');
      updateFormData({ isHourlyMode: true }); // Force hourly mode ON
      setTimeout(() => {
        setCurrentStep(1); // Step 1 = HourlyConfig
      }, 150);
      return;
    }
    
    // SPECIFIC_AREAS flow: Now ONLY "By Area" (no hourly choice sub-step)
    if (value === 'SPECIFIC_AREAS') {
      setMode('custom');
      updateFormData({ isHourlyMode: false }); // Force hourly mode OFF
      setTimeout(() => {
        setCurrentStep(1); // Step 1 = CustomStart (By Area)
      }, 150);
      return;
    }
    
    // LIVE_HERE / MOVING: Force full mode, advance to Step 1 (StepStart)
    setMode('full');
    setTimeout(() => {
      setCurrentStep(1);
    }, 150);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* FROZEN: Back button to Industry selection hidden
      <button
        type="button"
        onClick={handleBackToIndustry}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        ← {t(language, 'btn.back')}
      </button>
      */}

      {/* Section Header */}
      <div className="text-center space-y-2 pb-2">
        <h2 className="text-2xl font-black text-foreground tracking-tight">
          {t(language, 'triage.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(language, 'triage.subtitle')}
        </p>
      </div>

      {/* Situation Selection Cards - Horizontal Action Cards */}
      <div className="space-y-3">
        {situationCards.map((card) => {
          const Icon = card.icon;
          const isSelected = situation === card.value;

          return (
            <button
              key={card.value}
              type="button"
              onClick={() => handleSelect(card.value)}
              className={cn(
                'relative w-full border-2 rounded-2xl p-5 text-left transition-all duration-200',
                'flex items-center gap-4',
                'touch-manipulation active:scale-[0.99]',
                'group hover:shadow-lg',
                isSelected && 'border-primary bg-primary/[0.05] shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]',
                !isSelected && 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              {/* Selection checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm animate-fade-in">
                  <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                </div>
              )}

              {/* Large Icon */}
              <div
                className={cn(
                  'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-200 flex-shrink-0',
                  `bg-gradient-to-br ${card.gradient}`
                )}
              >
                <Icon
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 transition-colors',
                    card.iconColor
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    'text-lg sm:text-xl font-black leading-tight',
                    isSelected ? 'text-foreground' : 'text-foreground/90'
                  )}>
                    {t(language, card.titleKey)}
                  </span>
                {card.badge && (
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide",
                      card.value === 'MOVING' 
                        ? "bg-emerald-500 text-white animate-pulse" 
                        : card.value === 'LIVE_HERE'
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : card.value === 'HOURLY'
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {t(language, card.badge)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {t(language, card.subtitleKey)}
                </p>
                
                {/* HIGH-ENGAGEMENT INCENTIVE for LIVE_HERE */}
                {card.value === 'LIVE_HERE' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Star className="w-3.5 h-3.5" />
                    <span>{t(language, 'triage.live_here_incentive')}</span>
                  </div>
                )}
                
                {/* HIGH-ENGAGEMENT INCENTIVE for MOVING */}
                {card.value === 'MOVING' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Gift className="w-3.5 h-3.5" />
                    <span>{t(language, 'triage.moving_incentive')}</span>
                  </div>
                )}
                
                {/* INCENTIVE for HOURLY */}
                {card.value === 'HOURLY' && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t(language, 'triage.hourly_incentive')}</span>
                  </div>
                )}
              </div>

              {/* Arrow indicator */}
              <ArrowRight className={cn(
                'w-5 h-5 flex-shrink-0 transition-all',
                isSelected ? 'text-primary translate-x-1' : 'text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1'
              )} />
            </button>
          );
        })}
      </div>

      {/* Bottom Note */}
      <div className="pt-2 text-center">
        <p className="text-xs text-muted-foreground/80 italic">
          {t(language, 'triage.note')}
        </p>
      </div>
    </div>
  );
}