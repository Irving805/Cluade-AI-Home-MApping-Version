import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Check, Sparkles, AlertCircle, Crown } from 'lucide-react';

/**
 * Context-Aware Recurring Pricing Block
 * 
 * CONFIRMATION MODE: If user already chose Deep Reset → no decision cards
 * DECISION MODE: If user chose Standard Clean → show upgrade cards (upsell)
 * 
 * NOTE: Price displays removed to avoid discrepancies with LivePriceSummary
 */
export function RecurringPricingBlock() {
  const { 
    language, 
    situation, 
    formData, 
    updateFormData, 
    recurringStartMode, 
    setRecurringStartMode
  } = useBooking();

  // Only show for LIVE_HERE with recurring frequency
  const isLivingScenario = situation === 'LIVE_HERE';
  const isRecurringFrequency = ['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType);
  
  if (!isLivingScenario || !isRecurringFrequency) {
    return null;
  }

  // Determine current service level
  const isDeepSelected = formData.baseServiceLevel === 'Deep Clean';
  const isStandardSelected = formData.baseServiceLevel === 'Standard Clean';
  
  // Get frequency label
  const getFrequencyLabel = () => {
    switch (formData.serviceType) {
      case 'Weekly Price': return t(language, 'recurring.weekly');
      case 'Bi-Weekly Price': return t(language, 'recurring.biweekly');
      case 'Monthly Price': return t(language, 'recurring.monthly');
      default: return '';
    }
  };
  
  // Get frequency title
  const getFrequencyTitle = () => {
    switch (formData.serviceType) {
      case 'Weekly Price': return t(language, 'recurring.title_weekly');
      case 'Bi-Weekly Price': return t(language, 'recurring.title_biweekly');
      case 'Monthly Price': return t(language, 'recurring.title_monthly');
      default: return '';
    }
  };

  // Handle upgrade selection (Standard → Deep + Recurring)
  const handleSelectDeepKickoff = () => {
    updateFormData({ baseServiceLevel: 'Deep Clean' });
    setRecurringStartMode('deep-plus-recurring');
  };

  // Handle already clean selection (stay Standard)
  const handleSelectAlreadyClean = () => {
    setRecurringStartMode('recurring-only');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Section Header */}
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-foreground">{getFrequencyTitle()}</h3>
        <p className="text-sm text-muted-foreground">{t(language, 'recurring.helper')}</p>
      </div>

      {/* === CONFIRMATION MODE: Deep Reset Already Selected === */}
      {isDeepSelected && (
        <div className="bg-gradient-to-br from-success/5 to-success/10 rounded-2xl p-5 border-2 border-success/30 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-success" />
            </div>
            <div>
              <h4 className="font-bold text-foreground">{t(language, 'recurring.deep_confirmed_title')}</h4>
              <p className="text-sm text-muted-foreground mt-1">{t(language, 'recurring.deep_confirmed_desc')}</p>
              
              {/* Flow indicator without prices */}
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-success" />
                <span>{t(language, 'recurring.first_visit_deep')}</span>
                <span>→</span>
                <Check className="w-4 h-4 text-muted-foreground" />
                <span>{getFrequencyLabel()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === DECISION MODE: Standard Clean Selected → Show Upsell Cards === */}
      {isStandardSelected && (
        <div className="space-y-3">
          {/* Card A: Recommended - Deep Kickoff */}
          <button
            type="button"
            onClick={handleSelectDeepKickoff}
            className={cn(
              "w-full text-left rounded-xl p-4 border-2 transition-all duration-200 touch-manipulation active:scale-[0.98]",
              recurringStartMode === 'deep-plus-recurring'
                ? "border-primary bg-primary/5 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                    {t(language, 'recurring.recommended')}
                  </span>
                  <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase">
                    {t(language, 'recurring.best_results')}
                  </span>
                </div>
                <h4 className="font-bold text-foreground">{t(language, 'recurring.deep_kickoff_title')}</h4>
                <p className="text-sm text-muted-foreground mt-1">{t(language, 'recurring.deep_kickoff_desc')}</p>
              </div>
              
              {/* Selection Indicator */}
              {recurringStartMode === 'deep-plus-recurring' && (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                </div>
              )}
            </div>
          </button>

          {/* Card B: Already Clean - Basic Maintenance Rate */}
          <button
            type="button"
            onClick={handleSelectAlreadyClean}
            className={cn(
              "w-full text-left rounded-xl p-4 border-2 transition-all duration-200 touch-manipulation active:scale-[0.98]",
              recurringStartMode === 'recurring-only'
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
                : "border-border bg-card hover:border-amber-400/50 hover:bg-muted/30"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-bold text-foreground">{t(language, 'recurring.already_clean_title')}</h4>
                <p className="text-sm text-muted-foreground mt-1">{t(language, 'recurring.already_clean_desc')}</p>
                
                {/* Maintenance Clarification */}
                <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{t(language, 'recurring.basic_maintenance_label')}</span>{' '}
                    {t(language, 'recurring.basic_maintenance_desc')}
                  </p>
                </div>
                
                {/* Warning */}
                <div className="mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs text-amber-600 font-medium">{t(language, 'recurring.subject_to_verification')}</span>
                </div>
              </div>
              
              {/* Selection Indicator */}
              {recurringStartMode === 'recurring-only' && (
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
