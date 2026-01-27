import { useState, useCallback, useMemo } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from '@/hooks/useBookingSummary';
import { t } from '@/lib/translations';
import { homeSizeOptions, sqftOptions, serviceTypes, addonPrices, oneTimeAddons, recurringAddons, windowAddons, blindAddons, livingAddons, pricingData, serviceTypeMap, microServices, isHeavyCondition, HOURLY_CONFIG, HOURLY_FREQUENCY_RATES, HOURLY_SQFT_OPTIONS, CLEANING_DENSITY_OPTIONS, ESTATE_SQFT_THRESHOLD, getAspirationTitle, getPromise, getSpecialistProfile } from '@/lib/pricing';
import { CheckCircle, Lock, Home, Gift, Sparkles, ShieldCheck, Star, MapPin, Check, Users, Clock, Package, Calendar, Car, Zap, Building2, Layers, HardHat, Calculator, DollarSign, FileText, AlertTriangle, Wrench, Ruler, Bed, Bath, Target, Timer, Gem, Mountain, ListOrdered, X, DoorOpen, Download, Loader2 } from 'lucide-react';
import { getAreaTrackingCode } from '@/lib/homeStructureIds';
import { HALLWAY_RATES, HALLWAY_SIZE_INFO } from '@/lib/pricing_hallways';
import { BonusOfferBox } from '../BonusOfferBox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateEstateHours, getTaskTimeEstimate } from '@/lib/hourlyLogic';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RecurringReviewSection } from './RecurringReviewSection';
import { WindowCleaningMapDisplay } from '../WindowCleaningMapDisplay';
import { 
  calculateCommercialQuote, 
  getProjectTypeLabel, 
  getCleanPhaseLabel,
  formatSqft,
} from '@/lib/pricing_commercial';
import {
  calculateRenovationQuote,
  getPhaseLabel,
  getOccupancyLabel,
  getDebrisLabel,
  getSurfaceRiskLabel,
} from '@/lib/pricing_renovation';
import { generateQuotePDFBlob, downloadPdfBlob, buildPdfFilename } from '@/lib/pdfGenerator';
import { generateSsotPdfBlob, downloadSsotPdf, type SsotPdfParams } from '@/lib/pdf';
import { assertPdfParity } from '@/lib/pdf/pdfParityValidator';
import { useCityConfig } from '@/hooks/useCityConfig';
// calculateAllUtilityAreasTotal removed - now using SSOT from summary.sectionBlocks.utilityAreas
import { DEFAULT_HOME_MAPPING_AREAS } from '@/lib/homeMappingTypes';
import { Briefcase } from 'lucide-react';
import { useHomeLayoutModel } from '@/hooks/useHomeLayoutModel';
import { ReviewPropertyLogisticsSummary } from '../ReviewPropertyLogisticsSummary';

// Get addon label key from value
const getAddonLabelKey = (value: string): string => {
  const allAddons = [...oneTimeAddons, ...recurringAddons, ...windowAddons, ...blindAddons, ...livingAddons];
  const addon = allAddons.find((a) => a.value === value);
  return addon?.labelKey || value;
};

export function StepReview() {
  const {
    language,
    mode,
    formData,
    updateFormData,
    situation,
    moveContext,
    customZones,
    customCounts,
    selectedAddons,
    selectedMicroServices,
    getMicroServicesTotal,
    hasMicroServicesOnly,
    getMicroServiceLinePrice,
    calculateHourlyTotal,
    getHourlyRate,
    isRecurringService,
    recurringStartMode,
    MICRO_MIN,
  } = useBooking();

  // === SINGLE SOURCE OF TRUTH: Use summary hook for pricing ===
  const summary = useBookingSummary();
  const total = summary.totals.grandTotal;
  const MIN_TOTAL = 165;
  // For minimum check, use base components
  const rawTotal = summary.totals.basePrice + summary.totals.bathroomTotal;
  const minimumApplied = total === MIN_TOTAL && rawTotal < MIN_TOTAL;

  // === SINGLE BUILD POINT: Property Logistics Model ===
  // Same instance as LivePriceSummary and YourCleaningTotalPanel
  const layoutModel = useHomeLayoutModel();

  // SMART TRACKS: Dynamic title based on situation and moveContext
  const isMovingScenario = situation === 'MOVING';
  const isRecurring = isRecurringService();
  
  let reviewTitle: string;
  if (isRecurring && mode === 'full') {
    // Recurring service has its own title
    reviewTitle = t(language, 'recurring.review_title');
  } else if (moveContext === 'move_in') {
    reviewTitle = t(language, 'review.title_move_in');
  } else if (isMovingScenario) {
    reviewTitle = t(language, 'review.title_moving');
  } else {
    reviewTitle = t(language, 'review.title_living');
  }

  // Track deadline from countdown for PDF generation
  const [offerDeadline, setOfferDeadline] = useState<Date | null>(null);
  
  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // City config for filename
  const cityConfig = useCityConfig();

  
  // Preferred Code state - prefill with 35BONUS but require activation
  const [promoCode, setPromoCode] = useState('35BONUS');
  const [codeApplied, setCodeApplied] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  
  const VALID_CODE = '35BONUS';
  const BONUS_VALUE = 35;

  // Calculate "anchor price" (25% higher for psychological effect)
  const anchorPrice = Math.round(total * 1.25);
  const savings = anchorPrice - total;
  
  // Get recurring price info for display
  const serviceIdx = serviceTypeMap[formData.serviceType];
  const recurringPrice = pricingData[formData.homeSize]?.[serviceIdx] || 0;

  // Get labels
  const homeSizeLabel = homeSizeOptions.find((opt) => opt.value === formData.homeSize);
  const sqftLabel = sqftOptions.find((opt) => opt.value === formData.sqft);
  const serviceLabel = serviceTypes.find((s) => s.value === formData.serviceType);

  // Handle deadline computed from BonusOfferBox countdown
  const handleDeadlineComputed = useCallback((deadline: Date) => {
    setOfferDeadline(deadline);
  }, []);
  
  // Handle preferred code activation
  const handleApplyCode = () => {
    const trimmedCode = promoCode.trim().toUpperCase();
    if (trimmedCode === VALID_CODE) {
      setCodeApplied(true);
      setCodeInvalid(false);
      toast.success(t(language, 'code.success_applied') || '✅ Code Applied: 35BONUS');
    } else {
      setCodeInvalid(true);
      setTimeout(() => setCodeInvalid(false), 3000);
    }
  };

  // Build SSOT PDF params (single source of truth - consumes summary object)
  const buildSsotPdfParams = useCallback((): SsotPdfParams => {
    return {
      mode,
      formData,
      summary, // SSOT: Pass the entire summary object
      selectedAddons,
      selectedMicroServices,
      recurringStartMode,
      isRecurring,
      layoutModel: layoutModel,
      preferredRateWindow: offerDeadline 
        ? offerDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
        : undefined,
      preferredCode: codeApplied ? VALID_CODE : undefined,
      preferredValue: codeApplied ? BONUS_VALUE : undefined,
    };
  }, [
    mode, formData, summary, selectedAddons, selectedMicroServices,
    recurringStartMode, isRecurring, offerDeadline, codeApplied,
    VALID_CODE, BONUS_VALUE, layoutModel
  ]);

  // Legacy PDF params for backward compatibility (used by BookingWidget zapier)
  const buildQuotePdfParams = useCallback(() => {
    const hourlyRate = getHourlyRate();
    const hourlyTeamSize = HOURLY_CONFIG.TEAM_SIZE;
    const hourlyLaborHours = calculateHourlyTotal() / hourlyRate;
    
    return {
      mode,
      formData,
      customZones,
      customCounts,
      selectedAddons,
      selectedMicroServices,
      microServicesMinimumApplied: minimumApplied,
      microServicesHeavyApplied: isHeavyCondition(formData.conditionFee),
      total, // Uses summary.totals.grandTotal via closure
      recurringStartMode,
      isRecurring,
      preferredRateWindow: offerDeadline 
        ? offerDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
        : undefined,
      preferredCode: codeApplied ? VALID_CODE : undefined,
      preferredValue: codeApplied ? BONUS_VALUE : undefined,
      // Hourly mode params
      isHourlyMode: formData.isHourlyMode,
      hourlyRate: hourlyRate,
      hourlyTeamSize: hourlyTeamSize,
      hourlyLaborHours: hourlyLaborHours,
      // Recurring pricing
      firstVisitPrice: isRecurring ? total : undefined,
      futureVisitsPrice: isRecurring ? recurringPrice : undefined,
      // Property logistics model (for PDF rendering)
      layoutModel: layoutModel,
    };
  }, [
    mode, formData, customZones, customCounts, selectedAddons, selectedMicroServices,
    minimumApplied, recurringStartMode, isRecurring, offerDeadline, codeApplied,
    VALID_CODE, BONUS_VALUE, getHourlyRate, calculateHourlyTotal, total, recurringPrice, layoutModel
  ]);

  // Handle PDF download (SSOT-compliant flow)
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Dev-only parity validation
      assertPdfParity(summary);
      
      // Generate SSOT-compliant PDF
      const params = buildSsotPdfParams();
      const { blob, fileName } = generateSsotPdfBlob(params);
      downloadSsotPdf(blob, fileName);
      toast.success(t(language, 'pdf.download_success') || '✅ PDF Downloaded');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error(t(language, 'pdf.download_error') || 'Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // NOTE: Email Quote button REMOVED - only one Web3Forms notification on final "Send Request"

  // Get move-context-specific translations
  const getMoveContextCopy = () => {
    if (moveContext === 'move_out') {
      return {
        serviceType: t(language, 'review.move_out.service_type'),
        frequencyNote: t(language, 'review.move_out.frequency_note'),
        badge: t(language, 'review.move_out.badge'),
        applianceNote: t(language, 'review.move_out.appliance_note'),
        descTitle: t(language, 'review.move_out.description_title'),
        descSubtitle: t(language, 'review.move_out.description_subtitle'),
        includesTitle: t(language, 'review.move_out.includes_title'),
        includes: [
          t(language, 'review.move_out.includes_1'),
          t(language, 'review.move_out.includes_2'),
          t(language, 'review.move_out.includes_3'),
          t(language, 'review.move_out.includes_4'),
        ],
        optionalTitle: t(language, 'review.move_out.optional_title'),
        optionalItems: [
          t(language, 'review.move_out.optional_1'),
        ],
        badgeColor: 'bg-amber-500 text-white',
      };
    } else if (moveContext === 'move_in') {
      return {
        serviceType: t(language, 'review.move_in.service_type'),
        frequencyNote: t(language, 'review.move_in.frequency_note'),
        badge: t(language, 'review.move_in.badge'),
        applianceNote: t(language, 'review.move_in.appliance_note'),
        descTitle: t(language, 'review.move_in.description_title'),
        descSubtitle: t(language, 'review.move_in.description_subtitle'),
        includesTitle: t(language, 'review.move_in.includes_title'),
        includes: [
          t(language, 'review.move_in.includes_1'),
          t(language, 'review.move_in.includes_2'),
          t(language, 'review.move_in.includes_3'),
          t(language, 'review.move_in.includes_4'),
        ],
        optionalTitle: null,
        optionalItems: [],
        badgeColor: 'bg-emerald-500 text-white',
      };
    }
    return null;
  };

  const moveContextCopy = getMoveContextCopy();

  // Hourly mode calculations - use dynamic team size from formData
  const hourlyTeamSize = formData.hourlyTeamSize || HOURLY_CONFIG.TEAM_SIZE;
  const hourlyRate = formData.isHourlyMode ? getHourlyRate() : 0;
  const hourlyTotal = formData.isHourlyMode ? calculateHourlyTotal() : 0;
  const hourlyLaborHours = formData.hourlyHours * hourlyTeamSize;

  // Estate calculations for hourly mode
  const estateCalc = useMemo(() => {
    if (!formData.isHourlyMode) return null;
    return calculateEstateHours(formData);
  }, [formData]);
  
  const isEstate = estateCalc?.isEstate || false;
  const hasAdditionalStructures = (formData.guestHouseCount || 0) > 0 || (formData.studioCount || 0) > 0 || (formData.poolHouseCount || 0) > 0;
  const hasConciergeTasks = (formData.hourlyTasks || []).length > 0;
  
  // Get density label for display
  const getDensityLabel = () => {
    const opt = CLEANING_DENSITY_OPTIONS.find(o => o.value === formData.cleaningDensity);
    return opt?.label || 'Entire Estate';
  };
  
  // Get sqft label for display
  const getSqftLabel = () => {
    const opt = HOURLY_SQFT_OPTIONS.find(o => o.value === formData.hourlyTotalSqft);
    return opt?.label || formData.hourlyTotalSqft || 'Not specified';
  };

  // === COMMERCIAL MODE CALCULATIONS ===
  const commercialScope = formData.commercialScope;
  // Commercial Quote calculation (with frequency support)
  const commercialSqft = parseInt(commercialScope?.sqft || '0', 10);
  const commercialQuote = useMemo(() => {
    if (situation !== 'COMMERCIAL' || commercialSqft <= 0) return null;
    return calculateCommercialQuote(
      commercialSqft,
      commercialScope?.projectType || 'post_construction_final',
      commercialScope?.cleanPhase || 'final',
      commercialScope?.frequency || 'one_time'
    );
  }, [situation, commercialSqft, commercialScope?.projectType, commercialScope?.cleanPhase, commercialScope?.frequency]);

  // === COMMERCIAL MODE: Professional B2B Quote layout ===
  if (situation === 'COMMERCIAL' && commercialQuote) {
    const projectTypeLabel = getProjectTypeLabel(commercialScope?.projectType || 'post_construction_final');
    const cleanPhaseLabel = getCleanPhaseLabel(commercialScope?.cleanPhase || 'final');
    const isConstruction = commercialScope?.projectType?.includes('post_construction');
    const isRecurringCommercial = commercialScope?.frequency && commercialScope.frequency !== 'one_time';
    
    // Frequency display label
    const getFrequencyLabel = () => {
      const freq = commercialScope?.frequency || 'one_time';
      const labels: Record<string, string> = {
        one_time: t(language, 'commercial.freq_one_time'),
        daily: t(language, 'commercial.freq_daily'),
        weekly: t(language, 'commercial.freq_weekly'),
        biweekly: t(language, 'commercial.freq_biweekly'),
        monthly: t(language, 'commercial.freq_monthly'),
      };
      return labels[freq] || freq;
    };

    return (
      <div className="animate-fade-in space-y-5">
        {/* Header */}
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-500/10 rounded-full text-slate-600 dark:text-slate-400 text-sm font-medium mb-2">
            <HardHat className="w-4 h-4" />
            {t(language, 'commercial.badge')}
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {t(language, 'commercial.review_title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(language, 'commercial.review_subtitle')}
          </p>
        </div>

        {/* Project Name (if provided) */}
        {commercialScope?.projectName && (
          <div className="text-center">
            <span className="text-lg font-bold text-foreground">
              "{commercialScope.projectName}"
            </span>
          </div>
        )}

        {/* Main Quote Card - Premium Design */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 text-white shadow-xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)'
            }} />
          </div>
          
          <div className="relative z-10 space-y-5">
            {/* Frequency Badge (if recurring) */}
            {isRecurringCommercial && (
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-full">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-blue-300">{getFrequencyLabel()}</span>
                  {commercialQuote.frequencyDiscount > 0 && (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                      -{commercialQuote.frequencyDiscount}%
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Price Display */}
            <div className="text-center">
              <div className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-1">
                {isRecurringCommercial ? t(language, 'commercial.per_visit') : t(language, 'commercial.final_quote')}
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-black tracking-tight">
                  ${commercialQuote.total.toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-slate-400 mt-1">
                ${commercialQuote.ratePerSqft.toFixed(2)}/sq ft
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <Building2 className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                <div className="text-lg font-bold">{formatSqft(commercialSqft)}</div>
                <div className="text-xs text-slate-400">{t(language, 'commercial.project_area')}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <Users className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                <div className="text-lg font-bold">{commercialQuote.teamSize}</div>
                <div className="text-xs text-slate-400">{t(language, 'commercial.team_size')}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <Clock className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                <div className="text-lg font-bold">{commercialQuote.estimatedHours}h</div>
                <div className="text-xs text-slate-400">{t(language, 'commercial.est_duration')}</div>
              </div>
            </div>

            {/* Pricing Method Badge */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/10">
              <Calculator className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">
                {t(language, 'commercial.pricing_method')}: 
              </span>
              <span className="text-sm font-semibold text-white">
                {commercialQuote.methodLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Intelligent Scope of Work Card */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-foreground">{t(language, 'commercial.scope_of_work')}</span>
          </div>
          
          {/* Intention */}
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="text-xs font-bold uppercase text-primary tracking-wide mb-1">
              {t(language, 'commercial.scope_intention')}
            </div>
            <p className="text-sm font-medium text-foreground">
              {commercialQuote.scope.intention}
            </p>
          </div>

          {/* Logistics */}
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{t(language, 'commercial.scope_logistics')}: </span>
            {commercialQuote.scope.logistics}
          </div>

          {/* Tasks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {commercialQuote.scope.tasks.map((task, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground py-1">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{task}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Details Card */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'commercial.project_details')}</span>
          </div>
          
          <div className="grid gap-3">
            <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">{t(language, 'commercial.service_type_label')}</span>
              <span className="font-semibold text-foreground">{projectTypeLabel}</span>
            </div>
            {isConstruction && (
              <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">{t(language, 'commercial.clean_phase_label')}</span>
                <span className="font-semibold text-foreground">{cleanPhaseLabel}</span>
              </div>
            )}
            {!isConstruction && (
              <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">{t(language, 'commercial.frequency')}</span>
                <span className="font-semibold text-foreground">{getFrequencyLabel()}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">{t(language, 'commercial.labor_hours')}</span>
              <span className="font-semibold text-foreground">{commercialQuote.totalLaborHours} hours</span>
            </div>
            {commercialScope?.floors > 1 && (
              <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">{t(language, 'commercial.floors')}</span>
                <span className="font-semibold text-foreground">{commercialScope.floors} floors</span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Breakdown (Transparency Card) */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'commercial.pricing_breakdown')}</span>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t(language, 'commercial.market_rate')} (Table D)</span>
              <span className="font-medium text-foreground">${commercialQuote.marketPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t(language, 'commercial.production_floor')} ($55/hr)</span>
              <span className="font-medium text-foreground">${commercialQuote.floorPrice.toLocaleString()}</span>
            </div>
            {commercialQuote.frequencyDiscount > 0 && (
              <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                <span>{t(language, 'commercial.recurring_discount')} ({commercialQuote.frequencyDiscount}%)</span>
                <span className="font-medium">-${Math.round(commercialQuote.floorPrice * commercialQuote.frequencyDiscount / 100).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-primary/20">
              <span className="font-bold text-foreground">{t(language, 'commercial.final_quote')}</span>
              <span className="text-xl font-black text-primary">${commercialQuote.total.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">
            {t(language, 'commercial.pricing_transparency')}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-300 text-sm">
              {t(language, 'commercial.disclaimer')}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {t(language, 'commercial.disclaimer_text')}
            </p>
          </div>
        </div>

        {/* Special Notes (if any) */}
        {commercialScope?.notes && (
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="font-bold text-foreground">{t(language, 'commercial.notes')}</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {commercialScope.notes}
            </p>
          </div>
        )}

        {/* Access & Entry Section */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'details.access_section')}</span>
          </div>
          
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="gatedCommunity"
                checked={formData.gatedCommunity}
                onCheckedChange={(checked) => updateFormData({ gatedCommunity: checked as boolean })}
              />
              <Label htmlFor="gatedCommunity" className="text-sm cursor-pointer">
                {t(language, 'details.gated')}
              </Label>
            </div>
            
            <Textarea
              value={formData.accessNotes}
              onChange={(e) => updateFormData({ accessNotes: e.target.value })}
              placeholder={t(language, 'details.access_notes_placeholder')}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        {/* Safety Confirmation */}
        <div className={cn(
          "p-4 rounded-xl border-2 transition-all duration-200",
          formData.safetyConfirmed 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-amber-500/10 border-amber-500/30"
        )}>
          <div className="flex items-start gap-3">
            <Checkbox
              id="safetyConfirmed"
              checked={formData.safetyConfirmed}
              onCheckedChange={(checked) => updateFormData({ safetyConfirmed: checked as boolean })}
              className="mt-0.5"
            />
            <Label htmlFor="safetyConfirmed" className="text-sm cursor-pointer leading-relaxed">
              {t(language, 'details.safety_confirm')}
            </Label>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Licensed & Insured</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
            <Star className="w-3.5 h-3.5" />
            <span>Commercial Grade</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
            <Building2 className="w-3.5 h-3.5" />
            <span>B2B Specialists</span>
          </div>
        </div>
      </div>
    );
  }

  // === RENOVATION MODE: Post-Renovation Quote layout ===
  if (situation === 'RENOVATION' && formData.renovationScope?.sqft > 0) {
    const renovationQuote = calculateRenovationQuote(formData.renovationScope);
    const scope = formData.renovationScope;
    const isFinalPhase = scope.phase === 'final_punch_list';
    const totalBaths = (scope.bathrooms?.master || 0) + (scope.bathrooms?.full || 0) + (scope.bathrooms?.half || 0);
    
    // Kitchen size label
    const getKitchenSizeLabel = (size: string) => {
      const labels: Record<string, string> = {
        galley: t(language, 'reno.kitchen_galley'),
        standard: t(language, 'reno.kitchen_standard'),
        open_concept: t(language, 'reno.kitchen_open_concept'),
        chef: t(language, 'reno.kitchen_chef'),
      };
      return labels[size] || size;
    };

    return (
      <div className="animate-fade-in space-y-5">
        {/* Header */}
        <div className="text-center pb-2">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-2",
            isFinalPhase 
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}>
            <Wrench className="w-4 h-4" />
            {t(language, 'reno.osha_badge')}
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {t(language, 'reno.review_title') || 'Your Renovation Quote'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(language, 'reno.review_subtitle') || 'Post-construction cleaning estimate'}
          </p>
        </div>

        {/* Main Quote Card */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl p-6 text-white shadow-xl",
          isFinalPhase 
            ? "bg-gradient-to-br from-blue-800 to-blue-900 dark:from-blue-900 dark:to-slate-900"
            : "bg-gradient-to-br from-amber-700 to-amber-900 dark:from-amber-900 dark:to-slate-900"
        )}>
          <div className="relative z-10 space-y-5">
            {/* Phase Badge */}
            <div className="flex justify-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
                isFinalPhase ? "bg-blue-500/20" : "bg-amber-500/20"
              )}>
                <HardHat className="w-4 h-4" />
                <span className="text-sm font-bold">{getPhaseLabel(scope.phase)}</span>
              </div>
            </div>

            {/* Price Display */}
            <div className="text-center">
              <div className="text-sm font-medium uppercase tracking-wider mb-1 opacity-80">
                {t(language, 'reno.total_label')}
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-black tracking-tight">
                  ${renovationQuote.total.toLocaleString()}
                </span>
              </div>
              <div className="text-sm opacity-70 mt-1">
                ${renovationQuote.rateApplied.toFixed(2)}/sq ft applied
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <Ruler className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <div className="text-lg font-bold">{scope.sqft.toLocaleString()}</div>
                <div className="text-xs opacity-70">{t(language, 'reno.sqft_label')}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <Users className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <div className="text-lg font-bold">{renovationQuote.teamSize}</div>
                <div className="text-xs opacity-70">{t(language, 'reno.team_label')}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <Clock className="w-5 h-5 mx-auto mb-1 opacity-80" />
                <div className="text-lg font-bold">{renovationQuote.hours}h</div>
                <div className="text-xs opacity-70">{t(language, 'reno.duration_label')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Property Composition Card */}
        {(scope.bedrooms > 0 || totalBaths > 0 || scope.hasNewKitchen) && (
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Home className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">{t(language, 'reno.composition_title')}</span>
              <span className="text-xs text-muted-foreground ml-auto">{t(language, 'reno.composition_info')}</span>
            </div>
            
            <div className="grid gap-3">
              {scope.bedrooms > 0 && (
                <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Bed className="w-4 h-4" />
                    {t(language, 'reno.bedrooms')}
                  </span>
                  <span className="font-semibold text-foreground">{scope.bedrooms}</span>
                </div>
              )}
              {totalBaths > 0 && (
                <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Bath className="w-4 h-4" />
                    {t(language, 'reno.bathrooms')}
                  </span>
                  <span className="font-semibold text-foreground">
                    {scope.bathrooms.master > 0 && `${scope.bathrooms.master}M`}
                    {scope.bathrooms.master > 0 && scope.bathrooms.full > 0 && ' / '}
                    {scope.bathrooms.full > 0 && `${scope.bathrooms.full}F`}
                    {(scope.bathrooms.master > 0 || scope.bathrooms.full > 0) && scope.bathrooms.half > 0 && ' / '}
                    {scope.bathrooms.half > 0 && `${scope.bathrooms.half}H`}
                  </span>
                </div>
              )}
              {scope.hasNewKitchen && (
                <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t(language, 'reno.new_kitchen')}
                  </span>
                  <span className="font-semibold text-foreground">{getKitchenSizeLabel(scope.kitchenSize)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Scope Card */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'reno.project_scope') || 'Project Scope'}</span>
          </div>
          
          <div className="grid gap-3">
            <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">{t(language, 'reno.occupancy_label') || 'Occupancy'}</span>
              <span className="font-semibold text-foreground">{getOccupancyLabel(scope.occupancy)}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">{t(language, 'reno.debris_label')}</span>
              <span className="font-semibold text-foreground">{getDebrisLabel(scope.debrisLevel)}</span>
            </div>
            {scope.surfaceRisk === 'delicate_stone_wood' && (
              <div className="flex justify-between items-center py-2 px-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <span className="text-sm text-purple-700 dark:text-purple-300">{t(language, 'reno.delicate_materials')}</span>
                <span className="font-semibold text-purple-700 dark:text-purple-300">{getSurfaceRiskLabel(scope.surfaceRisk)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">{t(language, 'reno.construction_status')}</span>
              <span className={cn(
                "font-semibold",
                scope.contractorsFinished ? "text-emerald-600" : "text-amber-600"
              )}>
                {scope.contractorsFinished 
                  ? t(language, 'reno.contractors_done') 
                  : t(language, 'reno.contractors_active')
                }
              </span>
            </div>
          </div>
        </div>

        {/* Selected Add-ons */}
        {renovationQuote.addonsApplied.length > 0 && (
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-foreground">{t(language, 'reno.addons_included') || 'Add-ons Included'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {renovationQuote.addonsApplied.map((addon, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground py-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{addon}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bonus Offer */}
        <BonusOfferBox compact showCountdown onDeadlineComputed={handleDeadlineComputed} />

        {/* Access & Entry Details */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'review.access_title')}</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.home_type_label')}</Label>
              <Select
                value={formData.homeType}
                onValueChange={(value) => updateFormData({ homeType: value })}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder={t(language, 'review.select_home_type')} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="Single-Family Home">{t(language, 'review.home_type.single_family')}</SelectItem>
                  <SelectItem value="Apartment / Condo">{t(language, 'review.home_type.apartment_condo')}</SelectItem>
                  <SelectItem value="Townhouse">{t(language, 'review.home_type.townhouse')}</SelectItem>
                  <SelectItem value="Duplex / Multi-unit">{t(language, 'review.home_type.duplex')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.access_notes_label') || 'Access Notes'}</Label>
              <Textarea
                placeholder={t(language, 'review.access_notes_placeholder') || 'Gate codes, parking instructions, etc.'}
                value={formData.accessNotes || ''}
                onChange={(e) => updateFormData({ accessNotes: e.target.value })}
                className="min-h-[80px] bg-background"
              />
            </div>
          </div>
        </div>

        {/* Safety Confirmation */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-start gap-3">
            <Checkbox
              id="safetyConfirmed"
              checked={formData.safetyConfirmed}
              onCheckedChange={(checked) => updateFormData({ safetyConfirmed: !!checked })}
              className="mt-1"
            />
            <Label htmlFor="safetyConfirmed" className="text-sm cursor-pointer leading-relaxed">
              {t(language, 'details.safety_confirm')}
            </Label>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Licensed & Insured</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
            <Star className="w-3.5 h-3.5" />
            <span>OSHA Protocols</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
            <HardHat className="w-3.5 h-3.5" />
            <span>Construction Specialists</span>
          </div>
        </div>
      </div>
    );
  }

  // === HOURLY MODE: Premium Team Session layout ===
  if (formData.isHourlyMode) {
    return (
      <div className="animate-fade-in space-y-5">
        {/* Header */}
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">
            <Sparkles className="w-4 h-4" />
            {t(language, 'hourly.badge')}
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {t(language, 'review.hourly_session_title')}
          </h2>
        </div>

        {/* Team Math Summary Card */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide">
            <Users className="w-4 h-4" />
            {t(language, 'hourly.team_math')}
          </div>
          
          <div className="flex items-center justify-center gap-3 text-center">
            <div className="bg-background rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-black text-primary">{hourlyTeamSize}</div>
              <div className="text-xs text-muted-foreground">{t(language, 'hourly.cleaners')}</div>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">×</span>
            <div className="bg-background rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-black text-primary">{formData.hourlyHours}</div>
              <div className="text-xs text-muted-foreground">{t(language, 'hourly.hours')}</div>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">=</span>
            <div className="bg-primary rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-black text-primary-foreground">{hourlyLaborHours}</div>
              <div className="text-xs text-primary-foreground/80">{t(language, 'hourly.total_labor')}</div>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-primary/20 space-y-1">
            <div className="text-xs text-muted-foreground">
              ${hourlyRate}/hr × {hourlyTeamSize} cleaners = ${hourlyRate * hourlyTeamSize}/hr session rate
            </div>
            <div className="text-xl font-black text-primary">${hourlyTotal}</div>
          </div>
        </div>

        {/* Priority Scope Card */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'review.hourly_scope')}</span>
          </div>
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{formData.hourlyPriorityNotes}</p>
          </div>
        </div>

        {/* Supplies Info - Enhanced for recurring */}
        {(() => {
          const isHourlyRecurring = formData.hourlyFrequency && formData.hourlyFrequency !== 'onetime';
          return (
            <div className={cn(
              "rounded-xl p-4 flex items-center gap-3",
              isHourlyRecurring || formData.hourlySupplies === 'company'
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            )}>
              <Package className={cn(
                "w-5 h-5 flex-shrink-0",
                isHourlyRecurring || formData.hourlySupplies === 'company' 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-amber-600 dark:text-amber-400"
              )} />
              <div>
                <span className={cn(
                  "font-medium",
                  isHourlyRecurring || formData.hourlySupplies === 'company' 
                    ? "text-emerald-700 dark:text-emerald-300" 
                    : "text-amber-700 dark:text-amber-300"
                )}>
                  {isHourlyRecurring 
                    ? t(language, 'review.hourly_supplies_included')
                    : formData.hourlySupplies === 'client' 
                      ? t(language, 'review.hourly_supplies_client')
                      : t(language, 'review.hourly_supplies_company')
                  }
                </span>
                {isHourlyRecurring && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    {t(language, 'review.hourly_supplies_included_note')}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Your Specialist Card (Agency Model) */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200">Your Specialist</span>
          </div>
          <div className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
            {getAspirationTitle(formData.hourlyIntent)}
          </div>
          <div className="text-sm font-medium text-indigo-600 dark:text-indigo-300 mt-1">
            {getPromise(formData.hourlyIntent)}
          </div>
          <div className="text-xs text-indigo-500/80 mt-2 italic">
            {getSpecialistProfile(formData.hourlyIntent)}
          </div>
          <div className="text-xs text-indigo-500/80 mt-2">
            Session: {formData.hourlyHours} hrs × {hourlyTeamSize} cleaners at ${hourlyRate}/hr
          </div>
        </div>

        {/* Service Intent & Frequency Badges */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2",
            formData.hourlyIntent === 'move_in_out'
              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : formData.hourlyIntent === 'deep_scrub'
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                : formData.hourlyIntent === 'organization'
                  ? "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                  : formData.hourlyIntent === 'post_event'
                    ? "bg-pink-500/20 text-pink-700 dark:text-pink-300"
                    : formData.hourlyIntent === 'routine_maintenance'
                      ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                      : "bg-muted text-muted-foreground"
          )}>
            {formData.hourlyIntent === 'move_in_out' ? '🔑 Move-In / Move-Out' :
             formData.hourlyIntent === 'deep_scrub' ? '✨ Deep Scrub / Spring Clean' :
             formData.hourlyIntent === 'organization' ? '📦 Lifestyle & Organization' :
             formData.hourlyIntent === 'post_event' ? '🎉 Post-Event Cleanup' :
             formData.hourlyIntent === 'routine_maintenance' ? '🛡️ Routine Lifestyle Support' :
             '🎯 Priority Focus'}
            {formData.hourlyIntent === 'move_in_out' && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded font-bold">$64/hr</span>
            )}
            {formData.hourlyIntent === 'deep_scrub' && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-600 text-white rounded font-bold">+30%</span>
            )}
          </span>
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-primary/10 text-primary flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {t(language, `hourly.freq_${formData.hourlyFrequency || 'onetime'}`)}
          </span>
        </div>

        {/* Dynamic Disclaimer for Move-In/Out */}
        {formData.hourlyIntent === 'move_in_out' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Deposit Protection Guarantee
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  The Finisher specialist will focus on <strong>inside cabinets, appliances, baseboards, and tracks</strong> to ensure your property meets vacancy inspection standards.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Disclaimer for Deep Scrub */}
        {formData.hourlyIntent === 'deep_scrub' && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Please Note: You have selected Deep Scrub
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  This is a labor-intensive service. If the booked time expires before the home is finished, 
                  our team will prioritize the completion of <strong>Kitchen and Bathrooms</strong> unless instructed otherwise.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Days Per Week - Show for daily frequency */}
        {formData.hourlyFrequency === 'daily' && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center animate-fade-in">
            <p className="text-sm font-medium text-primary">
              {t(language, 'review.hourly_days_per_week', { days: String(formData.daysPerWeek) })}
            </p>
          </div>
        )}

        {/* === PROPERTY TYPE & AREAS SUMMARY (NEW) === */}
        {(formData.hourlyPropertyType || (formData.hourlyAreasToInclude?.length > 0) || (formData.hourlyAreasToSkip?.length > 0)) && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-5 border border-blue-200 dark:border-blue-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-foreground">Property & Scope</span>
            </div>
            
            <div className="space-y-4">
              {/* Property Type */}
              {formData.hourlyPropertyType && (
                <div className="bg-background rounded-xl p-3 border border-border">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Property Type</div>
                  <div className="text-sm font-bold text-foreground">
                    {(() => {
                      const propertyLabels: Record<string, string> = {
                        'studio_loft': 'Studio/Loft',
                        'apartment_condo': 'Apartment/Condo',
                        'townhouse': 'Townhouse',
                        'single_family': 'Single-Family Home',
                        'spanish_mediterranean': 'Spanish/Mediterranean',
                        'craftsman_bungalow': 'Craftsman/Bungalow',
                        'ranch': 'Ranch Home',
                        'modern_contemporary': 'Modern/Contemporary',
                        'guest_house_adu': 'Guest House/ADU',
                        'estate_mansion': 'Estate/Mansion',
                      };
                      return propertyLabels[formData.hourlyPropertyType] || formData.hourlyPropertyType;
                    })()}
                  </div>
                </div>
              )}
              
              {/* Areas to Include */}
              {(formData.hourlyAreasToInclude?.length > 0) && (
                <div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase mb-2 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Areas to Clean
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(formData.hourlyAreasToInclude || []).map((areaId: string) => {
                      const areaLabels: Record<string, string> = {
                        'kitchen': 'Kitchen',
                        'living_room': 'Living Room',
                        'dining_room': 'Dining Room',
                        'home_office': 'Home Office',
                        'laundry_room': 'Laundry',
                        'mudroom': 'Mudroom',
                        'garage': 'Garage',
                        'patio': 'Patio',
                        'wine_cellar': 'Wine Cellar',
                        'butlers_pantry': "Butler's Pantry",
                        'media_room': 'Media Room',
                        'gym': 'Home Gym',
                      };
                      return (
                        <span key={areaId} className="text-xs px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
                          {areaLabels[areaId] || areaId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Areas to Skip */}
              {(formData.hourlyAreasToSkip?.length > 0) && (
                <div>
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2 flex items-center gap-1">
                    <X className="w-3 h-3" /> Skipping
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(formData.hourlyAreasToSkip || []).map((areaId: string) => {
                      const skipLabels: Record<string, string> = {
                        'skip_master': 'Master Bedroom',
                        'skip_kids': "Kids' Rooms",
                        'skip_office': 'Home Office',
                        'skip_basement': 'Basement',
                        'skip_attic': 'Attic',
                        'skip_garage': 'Garage',
                        'skip_outdoor': 'Outdoor',
                      };
                      return (
                        <span key={areaId} className="text-xs px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full font-medium">
                          {skipLabels[areaId] || areaId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === ESTATE PROPERTY SUMMARY (only for estates or with structures) === */}
        {(isEstate || hasAdditionalStructures) && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">{t(language, 'review.estate_summary') || 'Estate Property Summary'}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Total Property Size */}
              <div className="bg-background rounded-xl p-3 border border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Total Property</div>
                <div className="text-sm font-bold text-foreground">{getSqftLabel()}</div>
              </div>
              
              {/* Cleaning Density / Active Area */}
              <div className="bg-background rounded-xl p-3 border border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cleaning Scope</div>
                <div className="text-sm font-bold text-foreground">{getDensityLabel()}</div>
                {formData.cleaningDensity !== 'entire' && estateCalc && (
                  <div className="text-xs text-muted-foreground">~{estateCalc.activeSqft.toLocaleString()} sq ft active</div>
                )}
              </div>
            </div>
            
            {/* Additional Structures - Enhanced with Config Details */}
            {hasAdditionalStructures && (
              <div className="space-y-2 mb-3">
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase mb-2">
                  Additional Structures
                </div>
                
                {/* Guest Houses */}
                {Array.from({ length: formData.guestHouseCount || 0 }).map((_, i) => {
                  const config = formData.guestHouseConfigs?.[`guest_house_${i}`];
                  return (
                    <div key={`gh_${i}`} className="bg-amber-50/50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200/50">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">🏡 Guest House {i + 1}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {config ? `${config.layout === '1br_1ba' ? '1BR/1BA' : 'Studio'} • ${config.kitchenType === 'full' ? 'Full Kitchen' : config.kitchenType === 'kitchenette' ? 'Kitchenette' : 'No Kitchen'} • ${config.attachment === 'detached' ? 'Detached' : 'Attached'}` : '1BR/1BA, Kitchenette'}
                      </div>
                      {config?.trashBags > 0 && (
                        <div className="text-xs text-orange-600 mt-1">🗑️ {config.trashBags} bag(s) estimated</div>
                      )}
                    </div>
                  );
                })}
                
                {/* Art Studios */}
                {Array.from({ length: formData.studioCount || 0 }).map((_, i) => {
                  const config = formData.artStudioConfigs?.[`art_studio_${i}`];
                  const typeLabel = config?.studioType === 'art_studio' ? 'Art Studio' :
                                   config?.studioType === 'home_office' ? 'Home Office' :
                                   config?.studioType === 'workshop' ? 'Workshop' : 'ADU';
                  return (
                    <div key={`as_${i}`} className="bg-purple-50/50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200/50">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">🎨 {typeLabel} {i + 1}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {config ? `${config.hasBathroom ? 'w/ Bath' : 'No Bath'} • ${config.surfaceSensitivity === 'delicate' ? '⚠️ Delicate' : 'Standard'} • ${config.attachment === 'detached' ? 'Detached' : 'Attached'}` : 'Standard'}
                      </div>
                      {config?.specialNotes && (
                        <div className="text-xs text-muted-foreground mt-1 italic">"{config.specialNotes}"</div>
                      )}
                    </div>
                  );
                })}
                
                {/* Pool Houses */}
                {(formData.poolHouseCount || 0) > 0 && (
                  <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                    <Sparkles className="w-3 h-3" />
                    {formData.poolHouseCount} Pool House{(formData.poolHouseCount || 0) > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
            
            {/* Move-In/Out Badge */}
            {formData.isMovingHourly && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {t(language, 'review.move_in_hourly_badge') || 'Move-In/Out Service'}
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t(language, 'review.move_in_hourly_desc') || 'Includes detailed work: cabinets, baseboards, inside drawers'}
                </p>
              </div>
            )}
            
            {/* Estate Logistics Breakdown (for large estates) */}
            {isEstate && estateCalc && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">AI Time Breakdown</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background rounded-lg p-2">
                    <div className="text-lg font-bold text-primary">{estateCalc.logisticsMinutes}</div>
                    <div className="text-[10px] text-muted-foreground">Logistics min</div>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <div className="text-lg font-bold text-primary">{estateCalc.cleaningMinutes}</div>
                    <div className="text-[10px] text-muted-foreground">Cleaning min</div>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <div className="text-lg font-bold text-primary">{estateCalc.taskMinutes}</div>
                    <div className="text-[10px] text-muted-foreground">Tasks min</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === CONCIERGE TASKS (Hourly Add-ons as TIME) === */}
        {hasConciergeTasks && (
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">{t(language, 'review.concierge_tasks') || 'Concierge Tasks'}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t(language, 'review.concierge_tasks_note') || 'These tasks add time to your session, not extra fees.'}
            </p>
            <div className="space-y-2">
              {(formData.hourlyTasks || []).map((taskId: string) => {
                const timeEstimate = getTaskTimeEstimate(
                  taskId, 
                  estateCalc?.activeSqft || 2000, 
                  formData.isMovingHourly || formData.hourlyIntent === 'move_in_out'
                );
                const taskLabels: Record<string, string> = {
                  'oven': 'Inside Oven',
                  'fridge_empty': 'Inside Fridge',
                  'cabinets': 'All Cabinets',
                  'interior_windows': 'Interior Windows',
                  'hood': 'Range Hood',
                  'ceiling_fan': 'Ceiling Fans',
                  'baseboards': 'Baseboards (Full)',
                };
                return (
                  <div key={taskId} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-foreground">{taskLabels[taskId] || taskId}</span>
                    <span className="text-xs font-semibold text-primary px-2 py-1 bg-primary/10 rounded-full">
                      +{timeEstimate} min
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === INTENT-SPECIFIC SUMMARY SECTIONS === */}
        {/* The Keeper (Routine Maintenance) Summary */}
        {formData.hourlyIntent === 'routine_maintenance' && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-xs font-semibold text-blue-600 uppercase mb-2">Lifestyle Support Details</div>
            <div className="space-y-2">
              {(formData.lifestyleAddons?.laundryLoads || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Laundry (Wash/Fold)</span>
                  <span className="font-medium">{formData.lifestyleAddons?.laundryLoads} loads</span>
                </div>
              )}
              {formData.lifestyleAddons?.dishwasher && (
                <div className="text-sm text-blue-700 dark:text-blue-300">✓ Dishwasher Loading/Unloading</div>
              )}
              {formData.lifestyleAddons?.bedMaking && (
                <div className="text-sm text-blue-700 dark:text-blue-300">✓ Bed Making (Linens Change)</div>
              )}
              {formData.hasSheddingPets && (
                <div className="text-sm text-amber-700 dark:text-amber-300">🐕 HEPA vacuum equipped (shedding pets)</div>
              )}
            </div>
          </div>
        )}

        {/* Efficiency Expert (Priority Focus) Summary */}
        {formData.hourlyIntent === 'priority_focus' && formData.budgetHours && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <div className="text-xs font-semibold text-amber-600 uppercase mb-2">Priority Budget Session</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Time Budget</span>
                <span className="font-bold text-lg">{formData.budgetHours} Hours</span>
              </div>
              {formData.scopeExclusionConfirmed && (
                <div className="text-xs text-amber-700 bg-amber-100 dark:bg-amber-900/30 p-2 rounded">
                  ⚠️ Secondary rooms may not be touched within budget
                </div>
              )}
            </div>
          </div>
        )}

        {/* Heavy-Lifter (Deep Scrub) Summary */}
        {formData.hourlyIntent === 'deep_scrub' && (
          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
            <div className="text-xs font-semibold text-orange-600 uppercase mb-2">Deep Scrub Assessment</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Grime Level</span>
                <span className={cn(
                  "font-medium px-2 py-0.5 rounded",
                  formData.grimeLevel === 'recovery' 
                    ? "bg-orange-200 text-orange-800" 
                    : "bg-orange-100 text-orange-700"
                )}>
                  {formData.grimeLevel === 'recovery' ? 'Recovery Mode (+30%)' : 'Standard Deep'}
                </span>
              </div>
              {formData.hasNaturalStone && (
                <div className="text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2">
                  <span>💎 Natural Stone Surfaces</span>
                  <span className="text-xs bg-orange-200 dark:bg-orange-800 px-2 py-0.5 rounded">NO ACIDIC CLEANERS</span>
                </div>
              )}
              {formData.pullOutAppliances && (
                <div className="text-sm text-orange-700 dark:text-orange-300">✓ Pull out fridge/oven (2-person safety)</div>
              )}
            </div>
          </div>
        )}

        {/* Recovery Team (Post-Event) Summary - EXPANDED */}
        {formData.hourlyIntent === 'post_event' && (
          <div className="bg-pink-50 dark:bg-pink-950/30 rounded-xl p-4 border border-pink-200 dark:border-pink-800 space-y-3">
            <div className="text-xs font-semibold text-pink-600 uppercase mb-2">Post-Event Recovery Details</div>
            
            {/* Event Info Row */}
            <div className="grid grid-cols-2 gap-3">
              {formData.eventType && (
                <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-pink-100 dark:border-pink-800">
                  <div className="text-xs text-muted-foreground">Event Type</div>
                  <div className="text-sm font-medium capitalize">
                    {(() => {
                      const eventLabels: Record<string, string> = {
                        party: 'House Party',
                        wedding: 'Wedding/Reception',
                        corporate: 'Corporate Event',
                        family: 'Family Gathering',
                        holiday: 'Holiday Party',
                        other: 'Other Event',
                      };
                      return eventLabels[formData.eventType] || formData.eventType;
                    })()}
                  </div>
                </div>
              )}
              {formData.eventGuestCount && (
                <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-pink-100 dark:border-pink-800">
                  <div className="text-xs text-muted-foreground">Guest Count</div>
                  <div className="text-sm font-medium">{formData.eventGuestCount} guests</div>
                </div>
              )}
            </div>
            
            {/* Affected Areas */}
            {((formData.affectedAreas || []).length > 0) && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Affected Areas</div>
                <div className="flex flex-wrap gap-1">
                  {(formData.affectedAreas || []).map((area: string) => {
                    const areaLabels: Record<string, string> = {
                      kitchen: 'Kitchen',
                      living: 'Living/Dining',
                      bathrooms: 'Bathrooms',
                      outdoor: 'Outdoor/Patio',
                      garage: 'Garage',
                      bedrooms: 'Bedrooms',
                    };
                    return (
                      <span key={area} className="text-xs px-2 py-0.5 bg-pink-200 dark:bg-pink-800 text-pink-800 dark:text-pink-200 rounded-full">
                        {areaLabels[area] || area}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Mess Types */}
            {((formData.messTypes || []).length > 0) && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Mess Types</div>
                <div className="flex flex-wrap gap-1">
                  {(formData.messTypes || []).map((mess: string) => {
                    const messLabels: Record<string, string> = {
                      food_spills: 'Food Spills',
                      drink_stains: 'Drink Stains',
                      grease: 'Grease/Oil',
                      confetti: 'Confetti/Decorations',
                      candle_wax: 'Candle Wax',
                      broken_items: 'Broken Items',
                    };
                    return (
                      <span key={mess} className="text-xs px-2 py-0.5 bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 rounded-full">
                        {messLabels[mess] || mess}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Stats Row */}
            <div className="flex items-center justify-between pt-2 border-t border-pink-200 dark:border-pink-700">
              <span className="text-sm">Debris Volume</span>
              <span className="font-bold text-pink-600 dark:text-pink-400">{formData.debrisBags || 3} bags</span>
            </div>
            
            {/* Flags */}
            <div className="space-y-1">
              {formData.hasStickySpills && (
                <div className="text-sm text-pink-700 dark:text-pink-300">🧹 Sticky spills (priority mopping)</div>
              )}
              {formData.furnitureNeedsResetting && (
                <div className="text-sm text-pink-700 dark:text-pink-300">🪑 Furniture resetting required</div>
              )}
              {formData.hasBiohazard && (
                <div className="text-sm text-red-700 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                  ⚠️ Biohazard - specialized team assigned
                </div>
              )}
              {formData.mustFinishBy && (
                <div className="text-sm text-pink-700 dark:text-pink-300">⏰ Must finish by: {formData.mustFinishBy}</div>
              )}
            </div>
          </div>
        )}

        {/* Home Assistant (Organization) Summary */}
        {formData.hourlyIntent === 'organization' && (
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="text-xs font-semibold text-purple-600 uppercase mb-2">Organization Focus</div>
            <div className="space-y-2">
              {(formData.organizationTasks || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(formData.organizationTasks || []).map((task: string) => {
                    const labels: Record<string, string> = {
                      closet: '👕 Closet Organization',
                      pantry: '🥫 Pantry Reset',
                      toys: '🧸 Toy Taming',
                      packing: '📦 Packing/Unpacking',
                    };
                    return (
                      <span key={task} className="text-xs px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                        {labels[task] || task}
                      </span>
                    );
                  })}
                </div>
              )}
              {formData.noScrubAcknowledged && (
                <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 p-2 rounded">
                  ✓ Confirmed: Organization only, no cleaning
                </div>
              )}
            </div>
          </div>
        )}

        {/* The Finisher (Move-In/Out) Summary */}
        {formData.hourlyIntent === 'move_in_out' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="text-xs font-semibold text-emerald-600 uppercase mb-2">Move-In/Out Inspection</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Property Status</span>
                <span className={cn(
                  "font-medium px-2 py-0.5 rounded",
                  formData.isHome100Empty 
                    ? "bg-emerald-200 text-emerald-800" 
                    : "bg-amber-200 text-amber-800"
                )}>
                  {formData.isHome100Empty ? '100% Vacant' : 'Furniture Present'}
                </span>
              </div>
              {formData.pullOutAppliances && (
                <div className="text-sm text-emerald-700 dark:text-emerald-300">✓ Pull out fridge/oven (2-person safety)</div>
              )}
              {formData.needsLandlordReceipt && (
                <div className="text-sm text-emerald-700 dark:text-emerald-300">📄 Landlord receipt for deposit documentation</div>
              )}
            </div>
          </div>
        )}

        {/* === SOUTH COAST LOGISTICS PROFILE === */}
        {(formData.accessType !== 'standard' || formData.hasDelicateSurfaces || (formData.homeConditionLevel && formData.homeConditionLevel !== 'tidy')) && (
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Mountain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="font-bold text-foreground">South Coast Logistics Profile</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Access Type */}
              {formData.accessType && formData.accessType !== 'standard' && (
                <div className="bg-background rounded-xl p-3 border border-border">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Access</div>
                  <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {formData.accessType === 'hillside' ? 'Hillside / Stairs' : 'Gated Estate'}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    +{formData.accessType === 'hillside' ? '15' : '20'} min setup
                  </div>
                </div>
              )}
              
              {/* Surface Accessibility (renamed from Condition) */}
              {formData.homeConditionLevel && formData.homeConditionLevel !== 'tidy' && (
                <div className="bg-background rounded-xl p-3 border border-border">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Surface Accessibility</div>
                  <div className={cn(
                    "text-sm font-bold",
                    formData.homeConditionLevel === 'deep_recovery' ? "text-red-600 dark:text-red-400" :
                    formData.homeConditionLevel === 'cluttered' ? "text-amber-600 dark:text-amber-400" :
                    "text-foreground"
                  )}>
                    {formData.homeConditionLevel === 'deep_recovery' ? 'Heavy Buildup (40%)' :
                     formData.homeConditionLevel === 'cluttered' ? 'Heavy Clutter (60%)' :
                     'Light Clutter (80%)'}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Efficiency factor</div>
                </div>
              )}
              
              {/* Delicate Surfaces */}
              {formData.hasDelicateSurfaces && (
                <div className="col-span-2 bg-background rounded-xl p-3 border border-border">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Gem className="w-3 h-3" /> Delicate Surfaces
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(formData.delicateSurfaceTypes || []).map((surface: string) => (
                      <span key={surface} className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                        {surface === 'stone' ? 'Natural Stone' : surface === 'clay' ? 'Saltillo Tile' : 'High Beams'}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">pH-neutral care • +10% buffer</div>
                </div>
              )}
              
              {/* Occupancy Status */}
              {formData.isPropertyOccupied !== undefined && (
                <div className="bg-background rounded-xl p-3 border border-border">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Occupancy</div>
                  <div className="text-sm font-bold text-foreground">
                    {formData.isPropertyOccupied ? 'Occupied (+15%)' : 'Vacant'}
                  </div>
                </div>
              )}
              
              {/* Vertical Logistics */}
              {formData.verticalLogistics && formData.verticalLogistics !== 'ground' && (
                <div className="bg-background rounded-xl p-3 border border-border">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Vertical Access</div>
                  <div className="text-sm font-bold text-foreground">
                    {formData.verticalLogistics === 'elevator' ? 'Elevator (+5 min)' : 'Walk-Up (+15 min)'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === PRIORITY TRIAGE DISPLAY === */}
        {((formData.hourlyMustHaves?.length || 0) > 0 || formData.hourlyNiceToHaves) && (
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ListOrdered className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">Priority Triage</span>
            </div>
            
            {/* Must-Haves */}
            {(formData.hourlyMustHaves?.length || 0) > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase mb-2">Must-Haves (In Order)</div>
                <div className="flex flex-wrap gap-2">
                  {(formData.hourlyMustHaves || []).map((priority: string, idx: number) => {
                    const labels: Record<string, string> = {
                      kitchen_deep: 'Kitchen Deep',
                      master_bath: 'Master Bath',
                      floors: 'Floors',
                      patio_furniture: 'Patio',
                      guest_house: 'Guest House',
                      living_areas: 'Living Areas',
                      all_bathrooms: 'All Baths',
                      bedrooms: 'Bedrooms',
                    };
                    return (
                      <span key={priority} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                        {labels[priority] || priority}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Nice-to-Haves */}
            {formData.hourlyNiceToHaves && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">If Time Permits</div>
                <p className="text-sm text-muted-foreground italic">{formData.hourlyNiceToHaves}</p>
              </div>
            )}
          </div>
        )}

        {/* === OVERTIME PROTOCOL BADGE === */}
        {formData.overtimeProtocol && (
          <div className={cn(
            "rounded-xl p-4 flex items-center justify-between",
            formData.overtimeProtocol === 'strict'
              ? "bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
              : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
          )}>
            <div className="flex items-center gap-3">
              <Timer className={cn(
                "w-5 h-5",
                formData.overtimeProtocol === 'strict' ? "text-slate-600 dark:text-slate-400" : "text-blue-600 dark:text-blue-400"
              )} />
              <div>
                <div className={cn(
                  "font-semibold text-sm",
                  formData.overtimeProtocol === 'strict' ? "text-slate-700 dark:text-slate-300" : "text-blue-700 dark:text-blue-300"
                )}>
                  {formData.overtimeProtocol === 'strict' ? '⏱ Hard Stop Protocol' : '✓ Flexible Finish'}
                </div>
                <div className={cn(
                  "text-xs",
                  formData.overtimeProtocol === 'strict' ? "text-slate-500" : "text-blue-600/80 dark:text-blue-400/80"
                )}>
                  {formData.overtimeProtocol === 'strict' 
                    ? 'Stops exactly when booked time ends' 
                    : 'May authorize up to 1hr overtime for priorities'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === SCOPE EXCLUSIONS CONFIRMATION === */}
        {formData.scopeExclusionsConfirmed && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                Safety Exclusions Confirmed
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">✓ No Bio-Hazards</span>
              <span className="text-[10px] px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">✓ Height Limit (2 steps)</span>
              <span className="text-[10px] px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">✓ No Heavy Lifting (25lbs)</span>
            </div>
          </div>
        )}

        {/* Logistics Summary */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'review.hourly_logistics')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              "p-3 rounded-xl flex items-center gap-2",
              formData.hasVacuum 
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
            )}>
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">
                {formData.hasVacuum ? t(language, 'review.vacuum_yes') : t(language, 'review.vacuum_no')}
              </span>
            </div>
            <div className={cn(
              "p-3 rounded-xl flex items-center gap-2",
              formData.hasParking 
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
            )}>
              <Car className="w-4 h-4" />
              <span className="text-sm font-medium">
                {formData.hasParking ? t(language, 'review.parking_yes') : t(language, 'review.parking_no')}
              </span>
            </div>
          </div>
          
          {/* Pets to Secure */}
          {formData.hasPetsToSecure && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400">🐾</span>
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Pets will be secured by client
              </span>
            </div>
          )}
        </div>

        {/* Bonus Offer */}
        <BonusOfferBox compact showCountdown onDeadlineComputed={handleDeadlineComputed} />

        {/* === ACCESS & ENTRY DETAILS === */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'review.access_title')}</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.home_type_label')}</Label>
              <Select
                value={formData.homeType}
                onValueChange={(value) => updateFormData({ homeType: value })}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder={t(language, 'review.select_home_type')} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="Single-Family Home">{t(language, 'review.home_type.single_family')}</SelectItem>
                  <SelectItem value="Apartment / Condo">{t(language, 'review.home_type.apartment_condo')}</SelectItem>
                  <SelectItem value="Townhouse">{t(language, 'review.home_type.townhouse')}</SelectItem>
                  <SelectItem value="Duplex / Multi-unit">{t(language, 'review.home_type.duplex')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.access_details_label')}</Label>
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="gated-hourly"
                    checked={formData.gatedCommunity}
                    onCheckedChange={(checked) => updateFormData({ gatedCommunity: !!checked })}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="gated-hourly" className="text-sm text-muted-foreground cursor-pointer">
                    {t(language, 'review.access_gated')}
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="apartment-hourly"
                    checked={formData.apartmentComplex}
                    onCheckedChange={(checked) => updateFormData({ apartmentComplex: !!checked })}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="apartment-hourly" className="text-sm text-muted-foreground cursor-pointer">
                    {t(language, 'review.access_apartment')}
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.access_instructions_label')}</Label>
              <Textarea
                value={formData.accessNotes}
                onChange={(e) => updateFormData({ accessNotes: e.target.value })}
                placeholder={t(language, 'review.access_instructions_placeholder')}
                className="min-h-[80px] bg-background resize-none"
              />
            </div>
          </div>
        </div>

        {/* === SAFETY CONFIRMATION === */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="safety-hourly"
              checked={formData.safetyConfirmed}
              onCheckedChange={(checked) => updateFormData({ safetyConfirmed: !!checked })}
              className="h-5 w-5 mt-0.5"
            />
            <Label htmlFor="safety-hourly" className="text-sm text-amber-800 dark:text-amber-200 cursor-pointer leading-relaxed">
              {t(language, 'review.safety_confirmation')}
            </Label>
          </div>
        </div>

        {/* Premium Trust Badges */}
        <div className="grid grid-cols-2 gap-3">
          {/* Insured & Bonded */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {t(language, 'review.trust_insured_bonded')}
              </div>
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                {t(language, 'review.trust_insured_bonded_sub')}
              </div>
            </div>
          </div>
          
          {/* W2 Professional Team */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary">
                {t(language, 'review.trust_w2_team')}
              </div>
              <div className="text-[10px] text-primary/70">
                {t(language, 'review.trust_w2_team_sub')}
              </div>
            </div>
          </div>
        </div>

        {/* Trust Signals Bar */}
        <div className="flex flex-wrap justify-center gap-4 py-3 bg-muted/30 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-success" />
            <span>SSL Secure</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>$2M Liability</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 text-success" />
            <span>5-Star Rated</span>
          </div>
        </div>
      </div>
    );
  }

  // === RECURRING SERVICES: Use dedicated layout ===
  if (isRecurring && mode === 'full') {
    return (
      <div className="animate-fade-in space-y-5">
        {/* RECURRING: Dynamic Title */}
        <div className="text-center pb-2">
          <h2 className="text-xl font-bold text-foreground">{reviewTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(language, 'recurring.helper')}
          </p>
        </div>

        {/* === RECURRING REVIEW BLOCKS === */}
        <RecurringReviewSection onDeadlineComputed={handleDeadlineComputed} />

        {/* Bonus Offer */}
        <BonusOfferBox compact showCountdown onDeadlineComputed={handleDeadlineComputed} />

        {/* === PREFERRED CLIENT CODE === */}
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 space-y-3">
          {codeApplied ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-foreground">{t(language, 'code.applied_label')}</span>
                <span className="text-sm font-mono text-success">{VALID_CODE}</span>
              </div>
              <span className="text-success font-bold">{t(language, 'review.you_save')} ${savings}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{t(language, 'code.preferred_label')}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className={cn(
                    "flex-1 font-mono uppercase bg-background",
                    codeInvalid && "border-destructive"
                  )}
                  maxLength={20}
                />
                <Button
                  type="button"
                  onClick={handleApplyCode}
                  disabled={!promoCode.trim()}
                  variant="default"
                  className="px-6"
                >
                  {t(language, 'code.activate')}
                </Button>
              </div>
              {codeInvalid && (
                <p className="text-xs text-destructive">{t(language, 'code.invalid_message')}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t(language, 'code.tip_message')}
              </p>
            </>
          )}
        </div>

        {/* === ACCESS & ENTRY DETAILS === */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{t(language, 'review.access_title')}</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.home_type_label')}</Label>
              <Select
                value={formData.homeType}
                onValueChange={(value) => updateFormData({ homeType: value })}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder={t(language, 'review.select_home_type')} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="Single-Family Home">{t(language, 'review.home_type.single_family')}</SelectItem>
                  <SelectItem value="Apartment / Condo">{t(language, 'review.home_type.apartment_condo')}</SelectItem>
                  <SelectItem value="Townhouse">{t(language, 'review.home_type.townhouse')}</SelectItem>
                  <SelectItem value="Duplex / Multi-unit">{t(language, 'review.home_type.duplex')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.access_details_label')}</Label>
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="gated-community-recurring"
                    checked={formData.gatedCommunity}
                    onCheckedChange={(checked) => updateFormData({ gatedCommunity: !!checked })}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="gated-community-recurring" className="text-sm text-muted-foreground cursor-pointer">
                    {t(language, 'review.access_gated')}
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="apartment-complex-recurring"
                    checked={formData.apartmentComplex}
                    onCheckedChange={(checked) => updateFormData({ apartmentComplex: !!checked })}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="apartment-complex-recurring" className="text-sm text-muted-foreground cursor-pointer">
                    {t(language, 'review.access_apartment')}
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="upper-floor-recurring"
                    checked={formData.upperFloorNoElevator}
                    onCheckedChange={(checked) => updateFormData({ upperFloorNoElevator: !!checked })}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="upper-floor-recurring" className="text-sm text-muted-foreground cursor-pointer">
                    {t(language, 'review.access_upper_floor')}
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.access_instructions_label')}</Label>
              <Textarea
                value={formData.accessNotes}
                onChange={(e) => updateFormData({ accessNotes: e.target.value })}
                placeholder={t(language, 'review.access_instructions_placeholder')}
                className="min-h-[80px] bg-background resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.notes_label')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateFormData({ notes: e.target.value })}
                placeholder={t(language, 'review.notes_placeholder')}
                className="min-h-[80px] bg-background resize-none"
              />
            </div>
          </div>
        </div>

        {/* === SAFETY CONFIRMATION === */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="safety-confirmation-recurring"
              checked={formData.safetyConfirmed}
              onCheckedChange={(checked) => updateFormData({ safetyConfirmed: !!checked })}
              className="h-5 w-5 mt-0.5"
            />
            <Label htmlFor="safety-confirmation-recurring" className="text-sm text-amber-800 dark:text-amber-200 cursor-pointer leading-relaxed">
              {t(language, 'review.safety_confirmation')}
            </Label>
          </div>
        </div>

        {/* === ZERO-RISK BOOKING === */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-success" />
            <span className="font-semibold text-foreground">{t(language, 'review.zero_risk_title')}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(language, 'review.zero_risk_description')}
          </p>
        </div>

        {/* === TRUST SIGNALS === */}
        <div className="flex flex-wrap justify-center gap-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-success" />
            <span>SSL Secure</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>$2M Liability Insurance</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 text-success" />
            <span>5-Star Rated</span>
          </div>
        </div>

      </div>
    );
  }

  // === ONE-TIME / CUSTOM / MOVE SERVICES: Original layout ===
  return (
    <div className="animate-fade-in space-y-5">
      {/* SMART TRACKS: Dynamic Title */}
      <div className="text-center pb-2">
        <h2 className="text-xl font-bold text-foreground">{reviewTitle}</h2>
        {moveContextCopy && (
          <p className="text-sm text-muted-foreground mt-1">{moveContextCopy.descSubtitle}</p>
        )}
      </div>

      {/* === MOVE CONTEXT: Service Description Box === */}
      {moveContextCopy && (
        <div className={cn(
          "rounded-2xl p-5 border",
          moveContext === 'move_out' 
            ? "bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50" 
            : "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50"
        )}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className={cn("px-2.5 py-1 text-xs font-bold rounded-full", moveContextCopy.badgeColor)}>
                {moveContextCopy.badge}
              </span>
            </div>
          </div>
          <h3 className="font-bold text-foreground mb-1">{moveContextCopy.descTitle}</h3>
          <p className="text-sm text-muted-foreground mb-4">{moveContextCopy.frequencyNote}</p>
          
          {/* Appliance Note */}
          <div className={cn(
            "p-3 rounded-lg text-sm mb-4",
            moveContext === 'move_out' ? "bg-amber-200/30 dark:bg-amber-900/30" : "bg-emerald-200/30 dark:bg-emerald-900/30"
          )}>
            <div className="flex items-start gap-2">
              <Sparkles className={cn("w-4 h-4 flex-shrink-0 mt-0.5", moveContext === 'move_out' ? "text-amber-600" : "text-emerald-600")} />
              <span className="text-foreground">{moveContextCopy.applianceNote}</span>
            </div>
          </div>
          
          {/* Includes List */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">{moveContextCopy.includesTitle}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {moveContextCopy.includes.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className={cn("w-4 h-4 flex-shrink-0", moveContext === 'move_out' ? "text-amber-600" : "text-emerald-600")} />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Optional Items (Move Out only) */}
          {moveContextCopy.optionalTitle && moveContextCopy.optionalItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-700/50">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-2 block">{moveContextCopy.optionalTitle}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {moveContextCopy.optionalItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-4 h-4 flex-shrink-0 rounded border border-amber-400 dark:border-amber-600" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === VALUE STACK === Premium benefits at top (hide when moveContext to avoid redundancy) */}
      {!moveContextCopy && (
        <div className="bg-gradient-to-br from-success/5 to-success/10 rounded-2xl p-5 border border-success/20">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-success" />
            <span className="font-bold text-foreground">{t(language, 'review.included_title')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-sm text-foreground">{t(language, 'review.benefit1')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-sm text-foreground">{t(language, 'review.benefit2')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-sm text-foreground">{t(language, 'review.benefit3')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-sm text-foreground">{t(language, 'review.benefit4')}</span>
            </div>
          </div>
        </div>
      )}

      {/* === PRICE DISPLAY === Context-aware for recurring vs one-time */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-success/10 text-success text-xs font-bold rounded-full">
              {t(language, 'review.new_client_offer')}
            </span>
          </div>
        </div>
        
        {/* === RECURRING: First Visit + Future Rate Breakdown === */}
        {isRecurring && mode === 'full' ? (
          <div className="space-y-4">
            {/* First Visit Total */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-4 border-b border-border/50">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold">{t(language, 'review.first_visit_total')}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold text-primary">${total}</span>
                </div>
              </div>
              <div className="bg-success/10 px-3 py-1.5 rounded-lg">
                <span className="text-success font-semibold text-sm">{t(language, 'review.you_save')} ${savings}</span>
              </div>
            </div>
            
            {/* Future Recurring Rate */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold">{t(language, 'review.future_rate')}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-foreground">${recurringPrice}</span>
                  <span className="text-sm text-muted-foreground">{t(language, 'review.per_visit')}</span>
                </div>
              </div>
            </div>
            
            {/* Context note for recurring */}
            <div className={cn(
              "p-3 rounded-lg text-xs",
              recurringStartMode === 'deep-plus-recurring' 
                ? "bg-success/10 text-success" 
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}>
              {recurringStartMode === 'deep-plus-recurring' 
                ? t(language, 'review.first_visit_deep_note')
                : t(language, 'review.first_visit_recurring_note')
              }
            </div>
          </div>
        ) : (
          /* === ONE-TIME: Standard Price Anchoring === */
          <>
            {/* Price comparison */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-muted-foreground line-through text-lg">${anchorPrice}</span>
                  <span className="text-xs text-muted-foreground">{t(language, 'review.original_price')}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">${total}</span>
                  <span className="text-sm text-muted-foreground">{t(language, 'review.new_client_price')}</span>
                </div>
              </div>
              <div className="bg-success/10 px-4 py-2 rounded-xl">
                <span className="text-success font-bold">{t(language, 'review.you_save')} ${savings}</span>
              </div>
            </div>
          </>
        )}
        
        {/* Minimum Applied Note */}
        {minimumApplied && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <span dangerouslySetInnerHTML={{ __html: t(language, 'summ.min_applied', { raw: rawTotal.toString(), min: MIN_TOTAL.toString() }) }} />
          </div>
        )}
        
        {/* === OPERATIONAL SAFEGUARD: First Visit Rate Expectation === */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          {t(language, 'review.first_visit_rate_note', { recurring_price: recurringPrice.toString() })}
        </p>
      </div>

      {/* === SERVICE DETAILS === Auto-expanded for value perception */}
      <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
        <details className="group" open>
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t(language, 'review.deep_clean_plan')}</span>
            </div>
            <span className="text-xs text-muted-foreground group-open:hidden">{t(language, 'review.tap_expand')}</span>
            <span className="text-xs text-muted-foreground hidden group-open:inline">{t(language, 'review.tap_collapse')}</span>
          </summary>
          
          <div className="mt-4 space-y-3 animate-fade-in">
            {mode === 'full' ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t(language, 'label.home_size')}</span>
                  <span className="font-medium">{homeSizeLabel ? t(language, homeSizeLabel.labelKey) : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t(language, 'label.approx_sqft')}</span>
                  <span className="font-medium">{sqftLabel ? t(language, sqftLabel.labelKey) : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t(language, 'label.select_clean_type')}</span>
                  <span className="font-medium">{serviceLabel ? t(language, serviceLabel.labelKey) : ''}</span>
                </div>
                {/* Bathrooms - SSOT from summary.lineItems */}
                {(() => {
                  // Find bathrooms lineItem from SSOT
                  const bathroomsItem = summary.lineItems.find(item => item.id === 'bathrooms');
                  const bathroomsCount = bathroomsItem?.titleParams?.count ?? 0;
                  
                  return (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t(language, 'label.bathrooms_breakdown')}</span>
                      <span className="font-medium">
                        {bathroomsCount} {t(language, 'review.total')}
                      </span>
                    </div>
                  );
                })()}
                {/* Move Condition Status (MOVING mode only) - SSOT: formData.moveCondition */}
                {isMovingScenario && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t(language, 'move.occupancy_title')}</span>
                    <span className={cn(
                      "font-medium",
                      formData.moveCondition === 'partial_empty' ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                    )}>
                      {formData.moveCondition === 'partial_empty' 
                        ? t(language, 'move.condition_partial') 
                        : t(language, 'move.condition_vacant')}
                    </span>
                  </div>
                )}
                {/* Property Levels (Multi-Floor properties) */}
                {(() => {
                  const maxFloors = formData.propertyType === 'apartment' 
                    ? (formData.apartmentUnitLevels || 1) 
                    : (formData.houseLevels || 1);
                  if (maxFloors < 2) return null;
                  return (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        Property Levels
                      </span>
                      <span className="font-medium">{maxFloors} Floors</span>
                    </div>
                  );
                })()}
                
                {/* === STAIR LOGISTICS (SSOT: layoutModel.stairOperations) === */}
                {layoutModel?.stairOperations && layoutModel.stairOperations.stairs.length > 0 && (() => {
                  const stairOps = layoutModel.stairOperations;
                  
                  return (
                    <div className="pt-3 border-t border-dashed border-amber-200/50 dark:border-amber-800/50 mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🪜</span>
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          {t(language, 'stairs.section_title')} ({stairOps.totalCount})
                        </span>
                      </div>
                      
                      {/* Each stair from SSOT */}
                      {stairOps.stairs.map((stair) => {
                        const fromFloor = stair.fromFloor.replace('FLOOR_', 'F');
                        const toFloor = stair.toFloor.replace('FLOOR_', 'F');
                        
                        const getSurfaceIcon = (type: string) => {
                          switch (type) {
                            case 'hardwood': return '🪵';
                            case 'carpet': return '🪨';
                            case 'mixed_runner': return '🔀';
                            default: return '🪵';
                          }
                        };
                        
                        return (
                          <div key={stair.id} className="space-y-1 p-2 bg-amber-50/30 dark:bg-amber-950/20 rounded-lg">
                            {/* Stair header with connection */}
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-foreground">{stair.label}</span>
                              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                {fromFloor} → {toFloor}
                              </span>
                            </div>
                            
                            {/* Surface + Steps */}
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{t(language, 'stairs.surface')}</span>
                              <span className="font-medium text-foreground flex items-center gap-1">
                                <span>{getSurfaceIcon(stair.surfaceType)}</span>
                                {t(language, `stairs.${stair.surfaceType}`) || stair.surfaceType}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{t(language, 'stairs.step_count')}</span>
                              <span className="font-medium text-foreground">{stair.stepCount} steps</span>
                            </div>
                            
                            {/* Hazards for this stair */}
                            {stair.hazardLabels.length > 0 && (
                              <div className="space-y-1 mt-1">
                                {stair.hazardLabels.map(hazard => (
                                  <div key={hazard} className="flex justify-between items-center text-sm py-0.5 px-1.5 bg-amber-100/50 dark:bg-amber-900/30 rounded">
                                    <span className="text-foreground text-xs">⚠️ {hazard}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Time for this stair */}
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-amber-200/30">
                              <span className="text-muted-foreground">Est. Time</span>
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                ~{stair.totalMinutes} min
                                {stair.hazardMinutes > 0 && ` (+${stair.hazardMinutes} hazards)`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Total stair time */}
                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-amber-200/30 text-sm">
                        <span className="font-semibold text-foreground">{t(language, 'stairs.total_buffer')}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">~{stairOps.totalMinutes} min</span>
                      </div>
                    </div>
                  );
                })()}
                
                {/* === MULTI-ENTRY HALLWAY LOGISTICS (NEW) === */}
                {(() => {
                  const hallways = formData.hallways;
                  if (!hallways || hallways.length === 0) return null;
                  
                  const isMoving = isMovingScenario || formData.serviceType === 'move';
                  
                  const getFloorIcon = (type: string | null) => {
                    switch (type) {
                      case 'hardwood_tile': return '🪵';
                      case 'carpet': return '🪨';
                      case 'mixed': return '🔀';
                      default: return '🪵';
                    }
                  };
                  
                  const getFloorLabel = (type: string | null) => {
                    if (!type) return 'Hard Floor';
                    return t(language, `surface.floor_type.${type}`) || type;
                  };
                  
                  // Calculate totals
                  const totalFee = hallways.reduce((sum, h) => {
                    if (isMoving && h.sizeTier === 'LARGE' && h.cabinetCount >= HALLWAY_RATES.CABINET_THRESHOLD && !h.cabinetsEmpty) {
                      return sum + HALLWAY_RATES.MOVING_LARGE_CABINET_FEE;
                    }
                    if (!isMoving && h.organizationHours > 0) {
                      return sum + (h.organizationHours * HALLWAY_RATES.ORGANIZATION_RATE);
                    }
                    return sum;
                  }, 0);
                  
                  return (
                    <div className="pt-3 border-t border-dashed border-border/50 mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          {t(language, 'hallway.logistics_title') || 'Hallway Logistics'}
                        </span>
                        {totalFee > 0 && (
                          <span className="ml-auto px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold rounded">
                            +${totalFee}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        {hallways.map((hallway) => {
                          const trackingCode = getAreaTrackingCode('hallway', hallway.id);
                          const floorLevel = hallway.floorLevel ? `F${hallway.floorLevel}` : 'F1';
                          const sizeInfo = HALLWAY_SIZE_INFO[hallway.sizeTier];
                          
                          // Calculate per-hallway fee
                          let feeLabel = 'Included';
                          let hasFee = false;
                          if (isMoving && 
                              hallway.sizeTier === 'LARGE' && 
                              hallway.cabinetCount >= HALLWAY_RATES.CABINET_THRESHOLD && 
                              !hallway.cabinetsEmpty) {
                            feeLabel = `+$${HALLWAY_RATES.MOVING_LARGE_CABINET_FEE}`;
                            hasFee = true;
                          }
                          if (!isMoving && hallway.organizationHours > 0) {
                            const orgCost = hallway.organizationHours * HALLWAY_RATES.ORGANIZATION_RATE;
                            feeLabel = `+$${orgCost}`;
                            hasFee = true;
                          }
                          
                          // Count active hazards
                          let hazardCount = 0;
                          if (hallway.highTrafficDust) hazardCount++;
                          if (hallway.runnerOrRug) hazardCount++;
                          if (hallway.wallScuffs) hazardCount++;
                          if (hallway.galleryWall) hazardCount++;
                          if (hallway.entryDebris) hazardCount++;
                          
                          return (
                            <div 
                              key={hallway.id} 
                              className={cn(
                                "p-2.5 rounded-lg border",
                                hasFee 
                                  ? "border-amber-200/50 bg-amber-50/30 dark:bg-amber-900/10"
                                  : "border-border/50 bg-muted/20"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {trackingCode}
                                  </span>
                                  <span className="text-sm font-medium text-foreground">{hallway.label}</span>
                                </div>
                                <span className={cn(
                                  "text-xs font-bold",
                                  hasFee ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                                )}>
                                  {feeLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {floorLevel}
                                </span>
                                <span className="flex items-center gap-1">
                                  {getFloorIcon(hallway.floorType)}
                                  {getFloorLabel(hallway.floorType)}
                                </span>
                                <span>•</span>
                                <span>{hallway.sizeTier} ({sizeInfo.ftRange})</span>
                                {hallway.cabinetCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{hallway.cabinetCount} cabinets</span>
                                  </>
                                )}
                                {hazardCount > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                    <AlertTriangle className="w-3 h-3" />
                                    {hazardCount} hazard{hazardCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                
                {/* === HALLWAY CONDITIONS (legacy - if hallwaysConfig enabled) === */}
                {(() => {
                  if (!formData.hallwaysConfig?.enabled) return null;
                  const hallwayConditions: { label: string; time: number }[] = [];
                  if (formData.hallwaysConfig.highTrafficDust) hallwayConditions.push({ label: t(language, 'hallways.high_traffic_dust'), time: 8 });
                  if (formData.hallwaysConfig.runnerOrRug) hallwayConditions.push({ label: t(language, 'hallways.runner_rug'), time: 10 });
                  if (formData.hallwaysConfig.wallScuffs) hallwayConditions.push({ label: t(language, 'hallways.wall_scuffs'), time: 12 });
                  if (formData.hallwaysConfig.galleryWall) hallwayConditions.push({ label: t(language, 'hallways.gallery_wall'), time: 15 });
                  if (formData.hallwaysConfig.entryDebris) hallwayConditions.push({ label: t(language, 'hallways.entry_debris'), time: 8 });
                  
                  if (hallwayConditions.length === 0) return null;
                  
                  const totalExtraMinutes = hallwayConditions.reduce((sum, h) => sum + h.time, 0);
                  
                  return (
                    <div className="pt-3 border-t border-dashed border-amber-200/50 dark:border-amber-800/50 mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🚶</span>
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          {t(language, 'hallways.hazard.title')}
                        </span>
                      </div>
                      
                      {/* Floor Type if set */}
                      {formData.spaceFloorTypes?.hallways && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{t(language, 'hallways.floor_type')}</span>
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <span>{formData.spaceFloorTypes.hallways === 'carpet' ? '🪨' : formData.spaceFloorTypes.hallways === 'mixed' ? '🔀' : '🪵'}</span>
                            {t(language, `surface.floor_type.${formData.spaceFloorTypes.hallways}`)}
                          </span>
                        </div>
                      )}
                      
                      {/* Conditions */}
                      <div className="space-y-1 mt-2">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
                          Traffic Conditions
                        </span>
                        {hallwayConditions.map(h => (
                          <div key={h.label} className="flex justify-between items-center text-sm py-1 px-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
                            <span className="text-foreground">{h.label}</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">+{h.time} min</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-1 border-t border-dashed border-amber-200/30 text-sm">
                          <span className="font-semibold text-foreground">{t(language, 'hallways.total_buffer')}</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">+{totalExtraMinutes} min</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* Floor Types Summary - SSOT from detailedMapping */}
                {(() => {
                  const spaces = summary.sectionBlocks.detailedMapping.spaces;
                  if (!spaces || spaces.length === 0) return null;
                  
                  // Calculate floor type distribution from per-space data (SSOT)
                  let hardCount = 0;
                  let carpetCount = 0;
                  spaces.forEach(s => {
                    if (s.floorType?.toLowerCase().includes('carpet')) carpetCount++;
                    else if (s.floorType?.toLowerCase().includes('hardwood') || s.floorType?.toLowerCase().includes('tile')) hardCount++;
                    else if (s.floorType?.toLowerCase().includes('mixed')) { carpetCount += 0.5; hardCount += 0.5; }
                    else hardCount++; // Default to hard floor
                  });
                  const total = hardCount + carpetCount || 1;
                  const hardPercent = Math.round((hardCount / total) * 100);
                  const carpetPercent = 100 - hardPercent;
                  
                  return (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t(language, 'move.floor_title')}</span>
                      <span className="font-medium">
                        {t(language, 'move.floor_hardwood')}: {hardPercent}% / {t(language, 'move.floor_carpet')}: {carpetPercent}%
                      </span>
                    </div>
                  );
                })()}
                {/* Floor Focus Note (if selected) */}
                {formData.floorIsFocus && (
                  <div className="flex items-center gap-2 text-sm bg-primary/5 rounded-lg p-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-primary font-medium">{t(language, 'move.floor_focus')}</span>
                  </div>
                )}
                
                {/* === WASTE & HAZARDS BY AREA (Deep/Move flows) === */}
                {(() => {
                  const isDeepOrMove = formData.baseServiceLevel === 'Deep Clean' || 
                                       formData.baseServiceLevel === 'Move-In/Out' ||
                                       isMovingScenario;
                  if (!isDeepOrMove) return null;
                  
                  const coreRooms = ['kitchen', 'living', 'dining', 'hallways', 'stairs'] as const;
                  const roomLabels: Record<string, string> = {
                    kitchen: 'Kitchen',
                    living: 'Living Room',
                    dining: 'Dining Room',
                    hallways: 'Hallways',
                    stairs: 'Stairs',
                  };
                  
                  // Get bedroom IDs from config
                  const bedroomIds = Object.keys(formData.bedroomConfigs || {});
                  const allRooms = [...coreRooms, ...bedroomIds];
                  
                  const roomsWithHazards = allRooms.filter(r => {
                    if (coreRooms.includes(r as any)) {
                      const bags = (formData.roomTrashBags as any)?.[r] || 0;
                      const messTypes = (formData.roomMessTypes as any)?.[r] || [];
                      const sticky = (formData.roomStickySpills as any)?.[r] || false;
                      return bags > 0 || messTypes.length > 0 || sticky;
                    }
                    // Bedrooms
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
                    <div className="pt-3 border-t border-dashed border-amber-200/50 dark:border-amber-800/50 mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                          Waste & Hazards by Area
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        {roomsWithHazards.map(room => {
                          // Determine if bedroom or core room
                          const isBedroom = room.startsWith('bed_');
                          let bags: number, messTypes: string[], sticky: boolean, roomLabel: string;
                          
                          if (isBedroom) {
                            bags = (formData.roomTrashBags as any)?.bedrooms?.[room] || 0;
                            messTypes = (formData.roomMessTypes as any)?.bedrooms?.[room] || [];
                            sticky = (formData.roomStickySpills as any)?.bedrooms?.[room] || false;
                            const bedNum = parseInt(room.replace('bed_', '')) + 1;
                            roomLabel = bedNum === 1 ? 'Master Bedroom' : `Bedroom ${bedNum}`;
                          } else {
                            bags = (formData.roomTrashBags as any)?.[room] || 0;
                            messTypes = (formData.roomMessTypes as any)?.[room] || [];
                            sticky = (formData.roomStickySpills as any)?.[room] || false;
                            roomLabel = roomLabels[room] || room;
                          }
                          
                          return (
                            <div key={room} className="flex justify-between items-center py-1.5 px-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg text-sm">
                              <span className="font-medium text-foreground">{roomLabel}</span>
                              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs">
                                {bags > 0 && <span>{bags} bags</span>}
                                {messTypes.length > 0 && (
                                  <span className="text-amber-500/80">
                                    {messTypes.map((t: string) => t.replace(/_/g, ' ')).join(', ')}
                                  </span>
                                )}
                                {sticky && <span className="text-blue-500">💧 Sticky</span>}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Total Bags */}
                        {totalBags > 0 && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-amber-200/30 text-sm">
                            <span className="font-semibold text-foreground">Total Trash Bags</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{totalBags}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                {customZones.bathroom && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t(language, 'summ.zones_bath')}</span>
                    <span className="font-medium">
                      ${(customCounts.masterBaths * 80) + (customCounts.fullBaths * 70) + (customCounts.halfBaths * 50)}
                    </span>
                  </div>
                )}
                {customZones.kitchen && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t(language, 'summ.zones_kitchen')}</span>
                    <span className="font-medium">$165</span>
                  </div>
                )}
                {customZones.living && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t(language, 'summ.zones_living')}</span>
                    <span className="font-medium">$110</span>
                  </div>
                )}
                {customZones.bedroom && customCounts.bedroomCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t(language, 'summ.zones_bed')}</span>
                    <span className="font-medium">${Math.max(120, customCounts.bedroomCount * 40)}</span>
                  </div>
                )}
              </>
            )}
            
            {/* === WINDOW CLEANING MAP (Premium Logistics) === */}
            {formData.roomWindowSelections && formData.roomWindowSelections.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <WindowCleaningMapDisplay
                  roomWindowSelections={formData.roomWindowSelections}
                  serviceType={formData.serviceType}
                  situation={situation || undefined}
                  language={language}
                  variant="review"
                />
              </div>
            )}
            
            {/* === UTILITY AREAS (SSOT from summary.sectionBlocks.utilityAreas) === */}
            {(() => {
              const utilityAreas = summary.sectionBlocks.utilityAreas;
              const enabledAreas: Array<{ key: string; label: string; price: number; time: number }> = [];
              
              if (utilityAreas.office) {
                enabledAreas.push({ key: 'office', label: t(language, 'spaces.office'), price: utilityAreas.office.price, time: utilityAreas.office.time });
              }
              if (utilityAreas.laundry) {
                enabledAreas.push({ key: 'laundry', label: t(language, 'spaces.laundry'), price: utilityAreas.laundry.price, time: utilityAreas.laundry.time });
              }
              if (utilityAreas.garage) {
                enabledAreas.push({ key: 'garage', label: t(language, 'spaces.garage'), price: utilityAreas.garage.price, time: utilityAreas.garage.time });
              }
              if (utilityAreas.patio) {
                enabledAreas.push({ key: 'patio', label: t(language, 'spaces.patio'), price: utilityAreas.patio.price, time: utilityAreas.patio.time });
              }
              
              if (enabledAreas.length === 0) return null;
              
              const areaEmoji: Record<string, string> = {
                office: '💼',
                laundry: '🧺',
                garage: '🚗',
                patio: '🌿',
              };
              
              const areas = formData.homeMapping?.areas || DEFAULT_HOME_MAPPING_AREAS;
              
              const getAreaSummary = (key: string) => {
                if (key === 'office') {
                  const cfg = areas.office;
                  return `${cfg.size} • ${cfg.desks} desk(s)${cfg.hasShelving ? ' • Shelving' : ''}`;
                }
                if (key === 'laundry') {
                  const cfg = areas.laundry;
                  return `${cfg.size} ${cfg.type}${cfg.hasSink ? ' • Sink' : ''}${cfg.hasCabinets ? ' • Cabinets' : ''}`;
                }
                if (key === 'garage') {
                  const cfg = areas.garage;
                  return `${cfg.capacity}-car • ${cfg.storageLevel} storage${cfg.hasOilStains ? ' • Oil stains' : ''}`;
                }
                if (key === 'patio') {
                  const cfg = areas.patio;
                  return `${cfg.size} ${cfg.type}${cfg.hasFurniture ? ' • Furniture' : ''}${cfg.hasGlassRailing ? ' • Glass railing' : ''}`;
                }
                return '';
              };
              
              return (
                <div className="pt-3 border-t border-blue-200/50 dark:border-blue-800/50 mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                      {t(language, 'spaces.utility_title')}
                    </span>
                    {utilityAreas.totalPrice > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded">
                        +${utilityAreas.totalPrice}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    {enabledAreas.map((area) => (
                      <div 
                        key={area.key} 
                        className="p-2.5 rounded-lg border border-blue-100/50 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-900/10"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{areaEmoji[area.key]}</span>
                            <span className="text-sm font-medium text-foreground">{area.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">~{area.time} min</span>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              +${area.price}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {getAreaSummary(area.key)}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total Time */}
                  {utilityAreas.totalTime > 0 && (
                    <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-blue-200/30 text-sm">
                      <span className="text-muted-foreground">Est. time for utility areas</span>
                      <span className="font-medium text-foreground">~{utilityAreas.totalTime} min</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Addons summary - SSOT from summary.lineItems (no fallbacks) */}
            {(() => {
              // Get addons from summary lineItems (SSOT) - no fallback to local calculation
              const addonLineItems = summary.lineItems.filter(item => item.section === 'addons');
              
              if (addonLineItems.length === 0) return null;
              
              // Use lineItems directly - SSOT enforced
              const addonsToShow = addonLineItems.slice(0, 3).map(item => ({
                key: item.id,
                label: t(language, getAddonLabelKey(item.id.replace('addon_', ''))),
                qty: item.titleParams?.qty || 1,
                price: item.price
              }));
              
              const totalCount = addonLineItems.length;
              
              if (addonsToShow.length === 0) return null;
              
              return (
                <div className="pt-2 border-t border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{t(language, 'summ.addons')}</span>
                  <div className="mt-1 space-y-1">
                    {addonsToShow.map((addon) => (
                      <div key={addon.key} className="flex justify-between text-sm text-muted-foreground">
                        <span>{addon.qty}x {addon.label}</span>
                        <span>${addon.price.toFixed(0)}</span>
                      </div>
                    ))}
                    {totalCount > 3 && (
                      <span className="text-xs text-muted-foreground">+{totalCount - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Micro-Services (Custom mode) */}
            {mode === 'custom' && selectedMicroServices.length > 0 && (() => {
              const microTotal = getMicroServicesTotal();
              const isHeavy = isHeavyCondition(formData.conditionFee);
              return (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{t(language, 'summ.micro_services')}</span>
                  </div>
                  {selectedMicroServices.slice(0, 3).map((selection) => {
                    const microService = microServices.find((m) => m.id === selection.id);
                    if (!microService) return null;
                    const linePrice = getMicroServiceLinePrice(selection.id, selection.quantity);
                    return (
                      <div key={selection.id} className="flex justify-between text-sm text-muted-foreground">
                        <span>{selection.quantity > 1 ? `${selection.quantity}× ` : ''}{t(language, microService.labelKey)}</span>
                        <span>${linePrice.withHeavy}</span>
                      </div>
                    );
                  })}
                  {selectedMicroServices.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{selectedMicroServices.length - 3} more</span>
                  )}
                  {microTotal.minimumApplied && hasMicroServicesOnly() && (
                    <p className="text-xs text-amber-600 mt-2">
                      {t(language, 'summ.micro_min_note', { min: MICRO_MIN.toString() })}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Condition Fee - SSOT from summary.totals.conditionFee */}
            {mode === 'full' && summary.totals.conditionFee > 0 && (
              <div className="flex justify-between text-sm text-destructive pt-2 border-t border-border/50">
                <span>{t(language, 'label.condition')}</span>
                <span>+${summary.totals.conditionFee}</span>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Contextual Service Note - CRO Psychology (Non-recurring only) */}
      {mode === 'full' && (
        <>
          {/* Move In/Out + Recurring: Welcome Bundle confirmation */}
          {isRecurring && formData.baseServiceLevel === 'Move-In/Out' && (
            <div className="p-4 rounded-xl text-sm bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-300/50">
              <div className="flex items-start gap-2">
                <Gift className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    {t(language, 'review.move_bundle_title')}
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                    {t(language, 'review.move_bundle_desc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Standard Clean: One-time confirmation */}
          {!isRecurring && formData.serviceType === 'Standard Clean' && (
            <div className="p-4 rounded-xl text-sm bg-muted/40 border border-border/50">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  {t(language, 'review.standard_note')}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bonus Offer - only show when there's an offer */}
      {mode === 'full' && serviceTypeMap[formData.serviceType] !== 2 && (
        <BonusOfferBox compact showCountdown onDeadlineComputed={handleDeadlineComputed} />
      )}

      {/* === PREFERRED CLIENT CODE === Input with prefill + activation */}
      <div className="bg-success/5 border border-success/20 rounded-xl p-4 space-y-3">
        {codeApplied ? (
          // Success state
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-foreground">{t(language, 'code.applied_label')}</span>
              <span className="text-sm font-mono text-success">{VALID_CODE}</span>
            </div>
            <span className="text-success font-bold">{t(language, 'review.you_save')} ${savings}</span>
          </div>
        ) : (
          // Input state
          <>
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t(language, 'code.preferred_label')}</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className={cn(
                  "flex-1 font-mono uppercase bg-background",
                  codeInvalid && "border-destructive"
                )}
                maxLength={20}
              />
              <Button
                type="button"
                onClick={handleApplyCode}
                disabled={!promoCode.trim()}
                variant="default"
                className="px-6"
              >
                {t(language, 'code.activate')}
              </Button>
            </div>
            {codeInvalid && (
              <p className="text-xs text-destructive">{t(language, 'code.invalid_message')}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t(language, 'code.tip_message')}
            </p>
          </>
        )}
      </div>

      {/* === DOWNLOAD PDF PROPOSAL === */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">
            {t(language, 'pdf.download_title') || 'Download PDF Proposal'}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {t(language, 'pdf.download_description') || 
            'Get a professional PDF copy of your personalized cleaning estimate to review or share.'}
        </p>
        
        <Button
          type="button"
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          variant="outline"
          className="w-full sm:w-auto gap-2 border-primary/30 hover:bg-primary/5"
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t(language, 'pdf.generating') || 'Generating...'}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {t(language, 'pdf.download_button') || 'Download PDF'}
            </>
          )}
        </Button>
      </div>

      {/* === ACCESS & ENTRY DETAILS === */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">{t(language, 'review.access_title')}</span>
        </div>

        {/* Home Type Dropdown - Hide for MOVING mode since property type captured in StepStart */}
        <div className="space-y-4">
          {!isMovingScenario && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t(language, 'review.home_type_label')}</Label>
              <Select
                value={formData.homeType}
                onValueChange={(value) => updateFormData({ homeType: value })}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder={t(language, 'review.select_home_type')} />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="Single-Family Home">{t(language, 'review.home_type.single_family')}</SelectItem>
                  <SelectItem value="Apartment / Condo">{t(language, 'review.home_type.apartment_condo')}</SelectItem>
                  <SelectItem value="Townhouse">{t(language, 'review.home_type.townhouse')}</SelectItem>
                  <SelectItem value="Duplex / Multi-unit">{t(language, 'review.home_type.duplex')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Access Details - CHECKBOXES (multi-select) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t(language, 'review.access_details_label')}</Label>
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="gated-community"
                  checked={formData.gatedCommunity}
                  onCheckedChange={(checked) => updateFormData({ gatedCommunity: !!checked })}
                  className="h-5 w-5"
                />
                <Label htmlFor="gated-community" className="text-sm text-muted-foreground cursor-pointer">
                  {t(language, 'review.access_gated')}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="apartment-complex"
                  checked={formData.apartmentComplex}
                  onCheckedChange={(checked) => updateFormData({ apartmentComplex: !!checked })}
                  className="h-5 w-5"
                />
                <Label htmlFor="apartment-complex" className="text-sm text-muted-foreground cursor-pointer">
                  {t(language, 'review.access_apartment')}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="upper-floor"
                  checked={formData.upperFloorNoElevator}
                  onCheckedChange={(checked) => updateFormData({ upperFloorNoElevator: !!checked })}
                  className="h-5 w-5"
                />
                <Label htmlFor="upper-floor" className="text-sm text-muted-foreground cursor-pointer">
                  {t(language, 'review.access_upper_floor')}
                </Label>
              </div>
            </div>
          </div>

          {/* Access Instructions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t(language, 'review.access_instructions_label')}</Label>
            <Textarea
              value={formData.accessNotes}
              onChange={(e) => updateFormData({ accessNotes: e.target.value })}
              placeholder={t(language, 'review.access_instructions_placeholder')}
              className="min-h-[80px] bg-background resize-none"
            />
          </div>

          {/* Anything We Should Know */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t(language, 'review.notes_label')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateFormData({ notes: e.target.value })}
              placeholder={t(language, 'review.notes_placeholder')}
              className="min-h-[80px] bg-background resize-none"
            />
          </div>
        </div>
      </div>

      {/* === SAFETY CONFIRMATION CHECKBOX === */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="safety-confirmation"
            checked={formData.safetyConfirmed}
            onCheckedChange={(checked) => updateFormData({ safetyConfirmed: !!checked })}
            className="h-5 w-5 mt-0.5"
          />
          <Label htmlFor="safety-confirmation" className="text-sm text-amber-800 dark:text-amber-200 cursor-pointer leading-relaxed">
            {t(language, 'review.safety_confirmation')}
          </Label>
        </div>
      </div>

      {/* === ZERO-RISK BOOKING === Professional payment explanation */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-success" />
          <span className="font-semibold text-foreground">{t(language, 'review.zero_risk_title')}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(language, 'review.zero_risk_description')}
        </p>
      </div>

      {/* === TRUST SIGNALS === */}
      <div className="flex flex-wrap justify-center gap-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 text-success" />
          <span>SSL Secure</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>$2M Liability Insurance</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="w-3.5 h-3.5 text-success" />
          <span>5-Star Rated</span>
        </div>
      </div>

    </div>
  );
}
