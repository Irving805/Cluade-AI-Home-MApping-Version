import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from '@/hooks/useBookingSummary';
import { t } from '@/lib/translations';
import { pricingData, serviceTypeMap, serviceTypes } from '@/lib/pricing';
import { CheckCircle, Shield, Users, FileText, Home, AlertTriangle, Sparkles, Calendar, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface RecurringReviewSectionProps {
  onDeadlineComputed?: (deadline: Date) => void;
}

export function RecurringReviewSection({ onDeadlineComputed }: RecurringReviewSectionProps) {
  const {
    language,
    formData,
    updateFormData,
    recurringStartMode,
  } = useBooking();

  // Use Single Source of Truth for pricing
  const summary = useBookingSummary();
  const total = summary.totals.grandTotal;
  
  // For minimum check, compare against raw base components
  const MIN_TOTAL = 165;
  const rawTotal = summary.totals.basePrice + summary.totals.bathroomTotal;
  const minimumApplied = rawTotal < MIN_TOTAL;

  // Get recurring price for ongoing visits
  const serviceIdx = serviceTypeMap[formData.serviceType];
  const recurringPrice = pricingData[formData.homeSize]?.[serviceIdx] || 0;
  
  // Get frequency label
  const serviceLabel = serviceTypes.find((s) => s.value === formData.serviceType);
  const frequencyLabel = serviceLabel ? t(language, serviceLabel.labelKey) : formData.serviceType;

  // Calculate anchor price (25% higher for first visit)
  const anchorPrice = Math.round(total * 1.25);
  const savings = anchorPrice - total;

  return (
    <div className="space-y-5">
      {/* === BLOCK 1: ACTIVATION (FIRST VISIT) === */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 border border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wide">
            {t(language, 'recurring.visit_one_label')}
          </span>
        </div>
        
        <h3 className="text-lg font-bold text-foreground mb-2">
          {t(language, 'recurring.initial_reset_title')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t(language, 'recurring.initial_reset_description')}
        </p>

        {/* First Visit Pricing */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-1 bg-success/10 text-success text-xs font-bold rounded-full">
              {t(language, 'recurring.new_client_badge')}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-muted-foreground line-through text-lg">${anchorPrice}</span>
                <span className="text-xs text-muted-foreground">{t(language, 'review.original_price')}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">${total}</span>
                <span className="text-sm text-muted-foreground">{t(language, 'recurring.first_visit_only')}</span>
              </div>
            </div>
            <div className="bg-success/10 px-3 py-1.5 rounded-lg">
              <span className="text-success font-semibold text-sm">{t(language, 'review.you_save')} ${savings}</span>
            </div>
          </div>
          
          {/* Minimum Applied Note */}
          {minimumApplied && (
            <p className="mt-3 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
              <span dangerouslySetInnerHTML={{ __html: t(language, 'summ.min_applied', { raw: rawTotal.toString(), min: MIN_TOTAL.toString() }) }} />
            </p>
          )}
        </div>
      </div>

      {/* === BLOCK 2: ONGOING MAINTENANCE PLAN === */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-success" />
          <span className="text-xs font-bold text-success uppercase tracking-wide">
            {t(language, 'recurring.ongoing_plan_label')}
          </span>
        </div>
        
        <h3 className="text-lg font-bold text-foreground mb-2">
          {t(language, 'recurring.maintenance_plan_title')}
        </h3>

        {/* Frequency + Locked Rate */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-4 bg-success/5 rounded-xl border border-success/20">
          <div>
            <span className="text-sm text-muted-foreground">{t(language, 'recurring.frequency_label')}</span>
            <p className="text-lg font-bold text-foreground">{frequencyLabel}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <Lock className="w-4 h-4 text-success" />
              <span className="text-xs font-semibold text-success uppercase">{t(language, 'recurring.rate_locked')}</span>
            </div>
            <span className="text-2xl font-bold text-foreground">${recurringPrice}</span>
            <span className="text-sm text-muted-foreground ml-1">{t(language, 'review.per_visit')}</span>
          </div>
        </div>

        {/* Rate Condition Note */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{t(language, 'recurring.rate_based_on')}</span>
            <br />
            <span className="text-xs">{t(language, 'recurring.rate_condition_note')}</span>
          </p>
        </div>
      </div>

      {/* === BLOCK 3: CONSISTENCY PROTOCOL === */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
            {t(language, 'recurring.consistency_title')}
          </span>
        </div>

        <div className="space-y-4">
          {/* Primary Team */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{t(language, 'recurring.primary_team_title')}</p>
              <p className="text-xs text-muted-foreground">{t(language, 'recurring.primary_team_description')}</p>
            </div>
          </div>

          {/* Digital Home Profile */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{t(language, 'recurring.digital_profile_title')}</p>
              <p className="text-xs text-muted-foreground">{t(language, 'recurring.digital_profile_description')}</p>
            </div>
          </div>

          {/* Backup Coverage */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{t(language, 'recurring.backup_coverage_title')}</p>
              <p className="text-xs text-muted-foreground">{t(language, 'recurring.backup_coverage_description')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* === BLOCK 4: OPERATIONAL SAFEGUARDS === */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-5 border border-amber-200/50 dark:border-amber-800/50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-bold text-amber-800 dark:text-amber-200">
            {t(language, 'recurring.acknowledgments_title')}
          </span>
        </div>

        <div className="space-y-4">
          {/* Tidy-Up Policy */}
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-xl border transition-colors",
            formData.tidyUpPolicyConfirmed 
              ? "bg-success/5 border-success/30" 
              : "bg-white dark:bg-background border-border"
          )}>
            <Checkbox
              id="tidy-up-policy"
              checked={formData.tidyUpPolicyConfirmed}
              onCheckedChange={(checked) => updateFormData({ tidyUpPolicyConfirmed: !!checked })}
              className="h-5 w-5 mt-0.5"
            />
            <Label htmlFor="tidy-up-policy" className="text-sm text-foreground cursor-pointer leading-relaxed">
              <span className="font-semibold">{t(language, 'recurring.tidy_policy_title')}</span>
              <br />
              <span className="text-muted-foreground text-xs">{t(language, 'recurring.tidy_policy_description')}</span>
            </Label>
          </div>

          {/* Team Continuity */}
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-xl border transition-colors",
            formData.teamContinuityConfirmed 
              ? "bg-success/5 border-success/30" 
              : "bg-white dark:bg-background border-border"
          )}>
            <Checkbox
              id="team-continuity"
              checked={formData.teamContinuityConfirmed}
              onCheckedChange={(checked) => updateFormData({ teamContinuityConfirmed: !!checked })}
              className="h-5 w-5 mt-0.5"
            />
            <Label htmlFor="team-continuity" className="text-sm text-foreground cursor-pointer leading-relaxed">
              <span className="font-semibold">{t(language, 'recurring.team_continuity_title')}</span>
              <br />
              <span className="text-muted-foreground text-xs">{t(language, 'recurring.team_continuity_description')}</span>
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
