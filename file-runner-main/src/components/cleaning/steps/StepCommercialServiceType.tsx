import { useBooking, initialCommercialScope } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { CommercialProjectType } from '@/lib/pricing_commercial';
import { 
  HardHat, 
  Stethoscope, 
  Briefcase,
  ArrowRight,
  Check
} from 'lucide-react';

// Project type options with icons and descriptions matching StepTriage design
const projectTypeOptions: Array<{
  value: CommercialProjectType;
  icon: typeof HardHat;
  gradient: string;
  iconColor: string;
  category: 'construction' | 'recurring' | 'medical';
  descKey: string;
  priceHint: string;
}> = [
  {
    value: 'post_construction_final',
    icon: HardHat,
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    category: 'construction',
    descKey: 'commercial.service_final_desc',
    priceHint: '$0.25+/sqft',
  },
  {
    value: 'office_standard',
    icon: Briefcase,
    gradient: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    category: 'recurring',
    descKey: 'commercial.service_office_desc',
    priceHint: '$0.15+/sqft',
  },
  {
    value: 'medical_specialized',
    icon: Stethoscope,
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    category: 'medical',
    descKey: 'commercial.service_medical_desc',
    priceHint: '$0.25+/sqft',
  },
];

import { Language } from '@/lib/translations';

// Badge styling by category
const getCategoryBadge = (category: 'construction' | 'recurring' | 'medical', language: Language) => {
  switch (category) {
    case 'construction':
      return {
        text: t(language, 'commercial.one_time'),
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
      };
    case 'recurring':
      return {
        text: t(language, 'commercial.recurring_available'),
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
      };
    case 'medical':
      return {
        text: t(language, 'commercial.certified_badge'),
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
      };
  }
};

export function StepCommercialServiceType() {
  const { language, formData, updateFormData, setCurrentStep } = useBooking();
  
  // Get commercial scope from formData with full defaults
  const commercialScope = {
    ...initialCommercialScope,
    ...formData.commercialScope
  };
  
  // Handle service type selection and auto-advance
  const handleSelectServiceType = (projectType: CommercialProjectType) => {
    updateFormData({
      commercialScope: { 
        ...commercialScope, 
        projectType,
        cleanPhase: projectType.includes('post_construction') ? 'final' : commercialScope.cleanPhase,
        frequency: projectType.includes('post_construction') ? 'one_time' : commercialScope.frequency,
        selectedAddons: [],
      }
    });
    // Auto-advance to next step
    setCurrentStep(2);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Section Header */}
      <div className="text-center space-y-2 pb-2">
        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          {t(language, 'commercial.service_type_title')}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t(language, 'commercial.service_type_subtitle')}
        </p>
      </div>

      {/* Vertical stack of horizontal cards - matching StepTriage design */}
      <div className="space-y-3">
        {projectTypeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = commercialScope.projectType === option.value;
          const label = t(language, `commercial.${option.value}`);
          const description = t(language, option.descKey);
          const badge = getCategoryBadge(option.category, language);
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelectServiceType(option.value)}
              className={cn(
                'relative w-full border-2 rounded-2xl p-4 sm:p-5 text-left transition-all duration-200',
                'flex items-center gap-4',
                'touch-manipulation active:scale-[0.99]',
                'group hover:shadow-lg',
                isSelected && 'border-primary bg-primary/[0.05] shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]',
                !isSelected && 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              {/* Icon - Left */}
              <div className={cn(
                'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0',
                `bg-gradient-to-br ${option.gradient}`
              )}>
                <Icon className={cn('w-7 h-7 sm:w-8 sm:h-8', option.iconColor)} />
              </div>
              
              {/* Content - Center */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base sm:text-lg font-black leading-tight text-foreground">
                    {label}
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wide',
                    badge.className
                  )}>
                    {badge.text}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {description}
                </p>
                <div className="text-[10px] sm:text-xs text-muted-foreground/70 mt-1.5 font-medium">
                  {t(language, 'commercial.from_price')} {option.priceHint}
                </div>
              </div>
              
              {/* Arrow - Right */}
              <ArrowRight className={cn(
                'w-5 h-5 flex-shrink-0 transition-all duration-200',
                isSelected 
                  ? 'text-primary translate-x-1' 
                  : 'text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1'
              )} />
              
              {/* Selection checkmark - Top Right */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Instruction text */}
      <p className="text-center text-xs sm:text-sm text-muted-foreground">
        {t(language, 'commercial.select_service_hint')}
      </p>
    </div>
  );
}
