import { useBooking, Industry } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Home, Building2, Check, ArrowRight } from 'lucide-react';

// Industry cards for first step - horizontal action card layout
const industryCards: Array<{
  value: Industry;
  icon: typeof Home;
  titleKey: string;
  subtitleKey: string;
  badge?: string;
  gradient: string;
  iconColor: string;
}> = [
  {
    value: 'residential',
    icon: Home,
    titleKey: 'industry.residential',
    subtitleKey: 'industry.residential_sub',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'commercial',
    icon: Building2,
    titleKey: 'industry.commercial',
    subtitleKey: 'industry.commercial_sub',
    badge: 'industry.b2b',
    gradient: 'from-slate-500/20 to-gray-500/20',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
];

export function StepIndustry() {
  const { 
    language, 
    industry, 
    setIndustry, 
    setSituation, 
    setMode, 
    setCurrentStep,
    updateFormData 
  } = useBooking();

  const handleSelect = (value: Industry) => {
    if (!value) return;
    setIndustry(value);
    
    if (value === 'commercial') {
      // Commercial flow: set situation and mode
      setSituation('COMMERCIAL');
      setMode('full');
      updateFormData({ isHourlyMode: false });
    } else if (value === 'residential') {
      // CRITICAL: Reset commercial state when switching to residential
      setSituation(null);
      setMode('full');
      updateFormData({ isHourlyMode: false });
    }
    
    // AUTO-ADVANCE: Move to next step immediately on card selection
    setTimeout(() => {
      setCurrentStep(1);
    }, 150);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Section Header */}
      <div className="text-center space-y-2 pb-2">
        <h2 className="text-2xl font-black text-foreground tracking-tight">
          {t(language, 'industry.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(language, 'industry.subtitle')}
        </p>
      </div>

      {/* Industry Selection Cards - Horizontal Action Cards */}
      <div className="space-y-3">
        {industryCards.map((card) => {
          const Icon = card.icon;
          const isSelected = industry === card.value;
          const isFrozen = card.value === 'commercial';

          return (
            <button
              key={card.value}
              type="button"
              onClick={() => !isFrozen && handleSelect(card.value)}
              disabled={isFrozen}
              className={cn(
                'relative w-full border-2 rounded-2xl p-5 text-left transition-all duration-200',
                'flex items-center gap-4',
                'touch-manipulation active:scale-[0.99]',
                'group hover:shadow-lg',
                isFrozen && 'opacity-50 cursor-not-allowed grayscale',
                isSelected && !isFrozen && 'border-primary bg-primary/[0.05] shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]',
                !isSelected && !isFrozen && 'border-border bg-card hover:border-primary/50 hover:bg-muted/30',
                isFrozen && 'border-border bg-muted/30'
              )}
            >
              {/* Frozen/Coming Soon badge */}
              {isFrozen && (
                <span className="absolute top-3 right-3 px-2 py-1 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full uppercase tracking-wide">
                  {t(language, 'industry.coming_soon')}
                </span>
              )}

              {/* Selection checkmark */}
              {isSelected && !isFrozen && (
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
                  {card.badge && !isFrozen && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full uppercase tracking-wide">
                      {t(language, card.badge)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {t(language, card.subtitleKey)}
                </p>
              </div>

              {/* Arrow indicator */}
              {!isFrozen && (
                <ArrowRight className={cn(
                  'w-5 h-5 flex-shrink-0 transition-all',
                  isSelected ? 'text-primary translate-x-1' : 'text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1'
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Note */}
      <div className="pt-2 text-center">
        <p className="text-xs text-muted-foreground/80 italic">
          {t(language, 'industry.note')}
        </p>
      </div>
    </div>
  );
}
