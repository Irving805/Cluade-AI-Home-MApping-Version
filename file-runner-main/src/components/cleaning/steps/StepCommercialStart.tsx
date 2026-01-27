import { useState, useMemo, useCallback } from 'react';
import { useBooking, CommercialFrequency, DebrisLevel, CeilingHeight, initialCommercialScope, CommercialAddon } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { 
  calculateCommercialQuote, 
  calculateConstructionQuote,
  CommercialProjectType,
  CommercialCleanPhase,
  FRICTION_MULTIPLIERS,
  HARD_COSTS,
  getCommercialAddons,
  calculateCommercialAddonsTotal,
} from '@/lib/pricing_commercial';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CommercialAddonCard } from '@/components/cleaning/CommercialAddonCard';
import { 
  Building2, 
  HardHat, 
  Stethoscope, 
  Sparkles, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronUp,
  ShieldCheck,
  DollarSign,
  Info,
  CalendarClock,
  CheckCircle2,
  Briefcase,
  Percent,
  Truck,
  Square,
  Package,
  Shield,
  Award,
  Check,
  AlertCircle
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Clean phase options (for construction only)
const cleanPhaseOptions: Array<{
  value: CommercialCleanPhase;
  labelKey: string;
}> = [
  { value: 'rough', labelKey: 'commercial.phase_rough' },
  { value: 'final', labelKey: 'commercial.phase_final' },
  { value: 'fluff', labelKey: 'commercial.phase_fluff' },
];

// Frequency options for recurring services
const frequencyOptions: Array<{
  value: CommercialFrequency;
  labelKey: string;
  discount: number;
}> = [
  { value: 'one_time', labelKey: 'commercial.freq_one_time', discount: 0 },
  { value: 'daily', labelKey: 'commercial.freq_daily', discount: 20 },
  { value: 'weekly', labelKey: 'commercial.freq_weekly', discount: 10 },
  { value: 'biweekly', labelKey: 'commercial.freq_biweekly', discount: 5 },
  { value: 'monthly', labelKey: 'commercial.freq_monthly', discount: 0 },
];

// Get icon and color for project type
const getProjectTypeVisuals = (projectType: CommercialProjectType) => {
  const visuals: Partial<Record<CommercialProjectType, { icon: typeof Building2; gradient: string; iconColor: string }>> = {
    'post_construction_final': {
      icon: HardHat,
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    'office_standard': {
      icon: Briefcase,
      gradient: 'from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    'medical_specialized': {
      icon: Stethoscope,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  };
  return visuals[projectType] || visuals['office_standard']!;
};

export function StepCommercialStart() {
  const { language, formData, updateFormData } = useBooking();
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [addonsOpen, setAddonsOpen] = useState(true);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  
  // Get commercial scope from formData with full defaults
  const commercialScope = {
    ...initialCommercialScope,
    ...formData.commercialScope
  };
  
  // Parse sqft for calculations
  const sqftNum = parseInt(commercialScope.sqft, 10) || 0;
  
  // Check if this is a construction project
  const isConstruction = commercialScope.projectType.includes('post_construction');
  const isRough = commercialScope.projectType === 'post_construction_rough';
  const isFinal = commercialScope.projectType === 'post_construction_final';
  
  // Get available addons for current project type
  const availableAddons = useMemo(() => getCommercialAddons(commercialScope.projectType), [commercialScope.projectType]);
  
  // Calculate quote in real-time
  const quote = useMemo(() => {
    if (sqftNum <= 0) return null;
    
    if (isConstruction) {
      return calculateConstructionQuote(commercialScope);
    } else {
      return calculateCommercialQuote(
        sqftNum,
        commercialScope.projectType,
        commercialScope.cleanPhase,
        commercialScope.frequency
      );
    }
  }, [sqftNum, commercialScope, isConstruction]);
  
  // Calculate addons total
  const addonsTotal = useMemo(() => {
    if (!commercialScope.selectedAddons?.length) return 0;
    return calculateCommercialAddonsTotal(
      commercialScope.selectedAddons,
      commercialScope.projectType,
      sqftNum
    );
  }, [commercialScope.selectedAddons, commercialScope.projectType, sqftNum]);
  
  // Grand total
  const grandTotal = quote ? quote.total + addonsTotal : 0;
  
  // Update commercial scope helper
  const updateScope = useCallback((updates: Partial<typeof commercialScope>) => {
    updateFormData({
      commercialScope: { ...commercialScope, ...updates }
    });
  }, [commercialScope, updateFormData]);
  
  // Toggle addon selection
  const toggleAddon = useCallback((addonId: string) => {
    const currentAddons = commercialScope.selectedAddons || [];
    const existingIndex = currentAddons.findIndex(a => a.id === addonId);
    
    if (existingIndex >= 0) {
      const newAddons = currentAddons.filter(a => a.id !== addonId);
      updateScope({ selectedAddons: newAddons });
    } else {
      updateScope({ selectedAddons: [...currentAddons, { id: addonId, quantity: 1 }] });
    }
  }, [commercialScope.selectedAddons, updateScope]);
  
  // Update addon quantity
  const updateAddonQuantity = useCallback((addonId: string, quantity: number) => {
    const currentAddons = commercialScope.selectedAddons || [];
    const existingIndex = currentAddons.findIndex(a => a.id === addonId);
    
    if (existingIndex >= 0) {
      if (quantity <= 0) {
        updateScope({ selectedAddons: currentAddons.filter(a => a.id !== addonId) });
      } else {
        const newAddons = [...currentAddons];
        newAddons[existingIndex] = { ...newAddons[existingIndex], quantity };
        updateScope({ selectedAddons: newAddons });
      }
    } else if (quantity > 0) {
      updateScope({ selectedAddons: [...currentAddons, { id: addonId, quantity }] });
    }
  }, [commercialScope.selectedAddons, updateScope]);
  
  // Get complexity level for visual indicator
  const getComplexityColor = () => {
    if (!quote || !('frictionApplied' in quote)) return 'bg-emerald-500';
    const friction = quote.frictionApplied;
    let total = friction.height;
    if (friction.noElevator) total *= FRICTION_MULTIPLIERS.no_elevator;
    if (friction.activeTrades) total *= FRICTION_MULTIPLIERS.active_trades;
    if (friction.debrisLevel === 'heavy_haul') total *= 1.2;
    
    if (total >= 1.6) return 'bg-red-500';
    if (total >= 1.2) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Calculate window price
  const windowPrice = commercialScope.windowStickerRemoval 
    ? HARD_COSTS.window_razor_scrape 
    : HARD_COSTS.window_standard;

  // Get visuals for selected project type
  const selectedVisuals = getProjectTypeVisuals(commercialScope.projectType);
  const SelectedIcon = selectedVisuals.icon;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Section Header with Selected Service Badge */}
      <div className="text-center space-y-2 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">
          <HardHat className="w-4 h-4" />
          {t(language, 'commercial.badge')}
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">
          {t(language, 'commercial.step_2_project_details')}
        </h2>
        
        {/* Selected Service Badge */}
        {commercialScope.projectType && (
          <div className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-primary/30',
            `bg-gradient-to-br ${selectedVisuals.gradient}`
          )}>
            <SelectedIcon className={cn('w-4 h-4', selectedVisuals.iconColor)} />
            <span className="text-sm font-semibold text-foreground">
              {t(language, `commercial.${commercialScope.projectType}`)}
            </span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>

      {/* Project Details Section */}
      <div className="space-y-6">
        {/* Project Name Input */}
        <div className="space-y-2">
          <Label htmlFor="projectName" className="text-sm font-semibold">
            {t(language, 'commercial.project_name')}
          </Label>
          <Input
            id="projectName"
            type="text"
            placeholder={t(language, 'commercial.project_name_placeholder')}
            value={commercialScope.projectName}
            onChange={(e) => updateScope({ projectName: e.target.value })}
            className="h-12 text-base"
          />
        </div>

        {/* Square Footage Input */}
        <div className="space-y-2">
          <Label htmlFor="sqft" className="text-sm font-semibold">
            {t(language, 'commercial.project_sqft')} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="sqft"
              type="number"
              inputMode="numeric"
              min="100"
              max="100000"
              placeholder="5,000"
              value={commercialScope.sqft}
              onChange={(e) => updateScope({ sqft: e.target.value })}
              className="h-14 text-2xl font-bold text-center pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              sq ft
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(language, 'commercial.sqft_hint')}
          </p>
        </div>
      </div>

          {/* Sub-options Section */}
          <div className="bg-muted/30 dark:bg-muted/20 p-5 rounded-xl border border-border space-y-5">
        {/* Construction: Phase Selection */}
        {isConstruction && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HardHat className="w-4 h-4 text-amber-600" />
              <Label className="text-sm font-semibold">
                {t(language, 'commercial.clean_phase')}
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {cleanPhaseOptions.map((option) => {
                const isSelected = commercialScope.cleanPhase === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateScope({ cleanPhase: option.value })}
                    className={cn(
                      'flex-1 min-w-[100px] py-3 px-4 rounded-lg border-2 text-sm font-semibold transition-all',
                      isSelected 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' 
                        : 'border-border bg-background text-muted-foreground hover:border-amber-500/50'
                    )}
                  >
                    {t(language, option.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Construction Friction Panel */}
        {isConstruction && sqftNum > 0 && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={cn('w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0', getComplexityColor())} />
              <Label className="text-sm font-semibold">
                {t(language, 'commercial.site_conditions')}
              </Label>
              <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
                {t(language, 'commercial.friction_hint')}
              </span>
            </div>

            {/* Debris Level (Rough Clean Only) - MOBILE FIRST */}
            {isRough && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {t(language, 'commercial.debris_level')}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'broom_swept' as DebrisLevel, labelKey: 'commercial.debris_light', speed: 1500 },
                    { value: 'standard_debris' as DebrisLevel, labelKey: 'commercial.debris_standard', speed: 1000 },
                    { value: 'heavy_haul' as DebrisLevel, labelKey: 'commercial.debris_heavy', speed: 500 },
                  ]).map((option) => {
                    const isSelected = commercialScope.debrisLevel === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateScope({ debrisLevel: option.value })}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all duration-200 min-h-[72px]',
                          'flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1',
                          'touch-manipulation active:scale-[0.98]',
                          isSelected 
                            ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_0_2px_hsl(40,95%,50%,0.15)]' 
                            : 'border-border bg-card hover:border-amber-500/50'
                        )}
                      >
                        <div className={cn(
                          'text-sm font-bold whitespace-normal leading-snug', 
                          isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'
                        )}>
                          {t(language, option.labelKey)}
                        </div>
                        <div className="text-xs text-muted-foreground sm:mt-0.5">
                          {option.speed.toLocaleString()} SF/hr
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ceiling Height (Final Clean) - MOBILE FIRST */}
            {isFinal && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {t(language, 'commercial.ceiling_height')}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'standard_10ft' as CeilingHeight, labelKey: 'commercial.ceiling_standard', multiplier: '1.0x' },
                    { value: 'high_12_15ft' as CeilingHeight, labelKey: 'commercial.ceiling_high', multiplier: '+25%' },
                    { value: 'warehouse_20ft_plus' as CeilingHeight, labelKey: 'commercial.ceiling_warehouse', multiplier: '+60%' },
                  ]).map((option) => {
                    const isSelected = commercialScope.ceilingHeight === option.value;
                    const isHighComplexity = option.value !== 'standard_10ft';
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateScope({ ceilingHeight: option.value })}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all duration-200 min-h-[72px]',
                          'flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1',
                          'touch-manipulation active:scale-[0.98]',
                          isSelected 
                            ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_0_2px_hsl(40,95%,50%,0.15)]' 
                            : 'border-border bg-card hover:border-amber-500/50'
                        )}
                      >
                        <div className={cn(
                          'text-sm font-bold whitespace-normal leading-snug', 
                          isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'
                        )}>
                          {t(language, option.labelKey)}
                        </div>
                        <div className={cn('text-xs sm:mt-0.5', isHighComplexity ? 'text-amber-600' : 'text-muted-foreground')}>
                          {option.multiplier}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* === OPERATIONAL CONSTRAINTS AS TOGGLE CARDS === */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {t(language, 'commercial.operational_constraints')}
              </Label>
              
              <div className="space-y-2">
                {/* Window Sticker Removal Toggle Card */}
                <button
                  type="button"
                  onClick={() => updateScope({ windowStickerRemoval: !commercialScope.windowStickerRemoval })}
                  className={cn(
                    'relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200',
                    'touch-manipulation active:scale-[0.99]',
                    commercialScope.windowStickerRemoval
                      ? 'border-amber-500 bg-amber-500/[0.05] shadow-[0_0_0_2px_hsl(40,95%,50%,0.15)]'
                      : 'border-border bg-card hover:border-amber-500/40'
                  )}
                >
                  {commercialScope.windowStickerRemoval && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                    commercialScope.windowStickerRemoval ? 'bg-amber-500/10 text-amber-600' : 'bg-muted/50 text-muted-foreground'
                  )}>
                    <Square className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground">
                      {t(language, 'commercial.window_stickers')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(language, 'commercial.window_stickers_desc')}
                    </div>
                  </div>
                  <div className={cn(
                    'text-sm font-bold flex-shrink-0',
                    commercialScope.windowStickerRemoval ? 'text-amber-600' : 'text-amber-600/60'
                  )}>
                    ${HARD_COSTS.window_razor_scrape}/panel
                  </div>
                </button>

                {/* Active Trades Toggle Card */}
                <button
                  type="button"
                  onClick={() => updateScope({ activeTrades: !commercialScope.activeTrades })}
                  className={cn(
                    'relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200',
                    'touch-manipulation active:scale-[0.99]',
                    commercialScope.activeTrades
                      ? 'border-amber-500 bg-amber-500/[0.05] shadow-[0_0_0_2px_hsl(40,95%,50%,0.15)]'
                      : 'border-border bg-card hover:border-amber-500/40'
                  )}
                >
                  {commercialScope.activeTrades && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                    commercialScope.activeTrades ? 'bg-amber-500/10 text-amber-600' : 'bg-muted/50 text-muted-foreground'
                  )}>
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground">
                      {t(language, 'commercial.active_trades')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(language, 'commercial.active_trades_desc')}
                    </div>
                  </div>
                  <div className={cn(
                    'text-sm font-bold flex-shrink-0',
                    commercialScope.activeTrades ? 'text-amber-600' : 'text-amber-600/60'
                  )}>
                    +25%
                  </div>
                </button>

                {/* Dumpster On Site (Rough Only) Toggle Card */}
                {isRough && (
                  <button
                    type="button"
                    onClick={() => updateScope({ dumpsterOnSite: !commercialScope.dumpsterOnSite })}
                    className={cn(
                      'relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200',
                      'touch-manipulation active:scale-[0.99]',
                      commercialScope.dumpsterOnSite
                        ? 'border-emerald-500 bg-emerald-500/[0.05] shadow-[0_0_0_2px_hsl(145,80%,40%,0.15)]'
                        : 'border-red-500/50 bg-red-500/[0.03]'
                    )}
                  >
                    {commercialScope.dumpsterOnSite && (
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                    {!commercialScope.dumpsterOnSite && (
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                        <AlertCircle className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      commercialScope.dumpsterOnSite ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                    )}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-foreground">
                        {t(language, 'commercial.dumpster_on_site')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t(language, 'commercial.dumpster_desc')}
                      </div>
                    </div>
                    <div className={cn(
                      'text-sm font-bold flex-shrink-0',
                      commercialScope.dumpsterOnSite ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {commercialScope.dumpsterOnSite 
                        ? t(language, 'commercial.included') 
                        : `+$${HARD_COSTS.dumpster_haul_fee}`}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* === WINDOW COUNT QUANTITY CARD === */}
            <div 
              className={cn(
                'relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200',
                commercialScope.windowCount > 0
                  ? 'border-amber-500 bg-amber-500/[0.05] shadow-[0_0_0_2px_hsl(40,95%,50%,0.15)]'
                  : 'border-border bg-card'
              )}
            >
              {commercialScope.windowCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
              )}
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                commercialScope.windowCount > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted/50 text-muted-foreground'
              )}>
                <Square className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {t(language, 'commercial.window_count')}
                </div>
                <div className={cn(
                  'text-sm font-bold mt-0.5',
                  commercialScope.windowCount > 0 ? 'text-amber-600' : 'text-amber-600/60'
                )}>
                  ${windowPrice}/panel
                  {commercialScope.windowCount > 0 && (
                    <span className="text-muted-foreground font-normal ml-2">
                      = ${(windowPrice * commercialScope.windowCount).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => updateScope({ windowCount: Math.max(0, commercialScope.windowCount - 1) })}
                  className="w-11 h-11 rounded-full border-2 border-border bg-card flex items-center justify-center font-bold text-lg hover:border-amber-500 hover:bg-amber-500/5 transition-all touch-manipulation active:scale-90"
                >
                  −
                </button>
                <span className="w-10 text-center font-bold text-lg tabular-nums">
                  {commercialScope.windowCount}
                </span>
                <button
                  type="button"
                  onClick={() => updateScope({ windowCount: Math.min(200, commercialScope.windowCount + 1) })}
                  className="w-11 h-11 rounded-full border-2 border-border bg-card flex items-center justify-center font-bold text-lg hover:border-amber-500 hover:bg-amber-500/5 transition-all touch-manipulation active:scale-90"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Office/Medical: Frequency Selection */}
        {!isConstruction && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <Label className="text-sm font-semibold">
                {t(language, 'commercial.frequency')}
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {frequencyOptions.map((option) => {
                const isSelected = commercialScope.frequency === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateScope({ frequency: option.value })}
                    className={cn(
                      'relative px-4 py-2 rounded-lg border-2 text-xs font-bold uppercase transition-all',
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300' 
                        : 'border-border bg-background text-muted-foreground hover:border-blue-500/50'
                    )}
                  >
                    {t(language, option.labelKey)}
                    {option.discount > 0 && (
                      <span className={cn(
                        'absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] rounded-full',
                        isSelected ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                      )}>
                        -{option.discount}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {commercialScope.frequency !== 'one_time' && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Percent className="w-3 h-3" />
                {t(language, 'commercial.recurring_discount_note')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* === COMMERCIAL ADD-ONS SECTION === */}
      {isConstruction && sqftNum > 0 && availableAddons.length > 0 && (
        <Collapsible open={addonsOpen} onOpenChange={setAddonsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                addonsOpen 
                  ? 'bg-amber-500/5 border-amber-500/30' 
                  : 'bg-muted/30 border-border hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left min-w-0">
                  <span className="font-semibold text-foreground block">
                    {isFinal 
                      ? t(language, 'commercial.addons_finishing') 
                      : t(language, 'commercial.addons_heavy_duty')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {commercialScope.selectedAddons?.length 
                      ? `${commercialScope.selectedAddons.length} ${t(language, 'commercial.addons_selected')} • +$${addonsTotal.toLocaleString()}` 
                      : t(language, 'commercial.addons_hint')}
                  </span>
                </div>
              </div>
              {addonsOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2 animate-fade-in">
            {availableAddons.map((addon) => {
              const selected = commercialScope.selectedAddons?.find(a => a.id === addon.id);
              return (
                <CommercialAddonCard
                  key={addon.id}
                  addon={addon}
                  isSelected={!!selected}
                  quantity={selected?.quantity || 1}
                  onToggle={toggleAddon}
                  onQuantityChange={updateAddonQuantity}
                  sqft={sqftNum}
                />
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* === INLINE PRICE SUMMARY (Horizontal like residential) === */}
      {quote && sqftNum > 0 && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 text-white space-y-4">
          {/* Top Row: Price + Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                {t(language, 'commercial.your_total')}
              </p>
              <p className="text-3xl sm:text-4xl font-black tracking-tight">
                ${grandTotal.toLocaleString()}
              </p>
              {addonsTotal > 0 && (
                <p className="text-xs text-amber-400 mt-1">
                  {t(language, 'commercial.includes_addons')} +${addonsTotal.toLocaleString()}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Clock className="w-4 h-4" />
                  {'clockHours' in quote ? quote.clockHours : Math.ceil(quote.estimatedHours / quote.teamSize)} {t(language, 'commercial.hours')}
                </div>
                <p className="text-xs text-slate-400">{t(language, 'commercial.duration')}</p>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <Users className="w-4 h-4" />
                  {quote.teamSize}
                </div>
                <p className="text-xs text-slate-400">{t(language, 'commercial.team')}</p>
              </div>
            </div>
          </div>

          {/* Method Badge Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full uppercase tracking-wide">
              {quote.method}
            </span>
            {isConstruction && 'frictionApplied' in quote && (
              <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full">
                {((quote.frictionApplied.height || 1) * 
                  (quote.frictionApplied.noElevator ? FRICTION_MULTIPLIERS.no_elevator : 1) * 
                  (quote.frictionApplied.activeTrades ? FRICTION_MULTIPLIERS.active_trades : 1)).toFixed(2)}x {t(language, 'commercial.complexity')}
              </span>
            )}
          </div>

          {/* Collapsible Breakdown */}
          <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
            <CollapsibleTrigger asChild>
              <button 
                type="button"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full"
              >
                <DollarSign className="w-4 h-4" />
                <span>{t(language, 'live_price.view_breakdown')}</span>
                {breakdownOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 pt-3 border-t border-slate-700 space-y-2 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{t(language, 'commercial.base_quote')}</span>
                <span className="font-semibold">${quote.total.toLocaleString()}</span>
              </div>
              {addonsTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-400">{t(language, 'live_price.addons_label')}</span>
                  <span className="font-semibold text-amber-400">+${addonsTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                <span className="text-white font-bold">{t(language, 'commercial.grand_total')}</span>
                <span className="font-black text-lg">${grandTotal.toLocaleString()}</span>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Trust Footer */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              {t(language, 'commercial.licensed')}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Award className="w-3.5 h-3.5" />
              {t(language, 'commercial.bonded')}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t(language, 'commercial.insured')}
            </div>
          </div>
        </div>
      )}

      {/* Scope of Work Preview (Inline, Horizontal) */}
      {quote && sqftNum > 0 && (
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-foreground text-sm">{t(language, 'commercial.scope_intention')}</h4>
              <p className="text-xs text-primary mt-1 italic">{quote.scope.intention}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quote.scope.tasks.slice(0, 4).map((task, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{task}</span>
              </div>
            ))}
          </div>
          {quote.scope.tasks.length > 4 && (
            <p className="text-xs text-muted-foreground mt-2 pl-5">
              +{quote.scope.tasks.length - 4} {t(language, 'commercial.more_tasks')}...
            </p>
          )}
        </div>
      )}

      {/* Logistics Collapsible */}
      <Collapsible open={logisticsOpen} onOpenChange={setLogisticsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {t(language, 'commercial.logistics')}
              </span>
            </div>
            {logisticsOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4 px-1 animate-fade-in">
          {/* Elevator Access */}
          <div 
            onClick={() => updateScope({ hasElevator: !commercialScope.hasElevator })}
            className={cn(
              'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
              'touch-manipulation active:scale-[0.99]',
              commercialScope.hasElevator
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-border bg-card hover:border-muted-foreground/30'
            )}
          >
            <Label htmlFor="elevator" className="text-sm font-medium cursor-pointer">
              {t(language, 'commercial.has_elevator')}
            </Label>
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
              commercialScope.hasElevator 
                ? 'bg-emerald-500 border-emerald-500' 
                : 'border-muted-foreground/30'
            )}>
              {commercialScope.hasElevator && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
          </div>

          {/* Number of Floors */}
          <div className="space-y-2">
            <Label htmlFor="floors" className="text-sm font-medium">
              {t(language, 'commercial.floors')}
            </Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateScope({ floors: Math.max(1, commercialScope.floors - 1) })}
                className="w-11 h-11 rounded-full border-2 border-border bg-card flex items-center justify-center text-lg font-bold hover:bg-muted transition-colors touch-manipulation active:scale-90"
              >
                −
              </button>
              <span className="w-12 text-center text-xl font-bold tabular-nums">
                {commercialScope.floors}
              </span>
              <button
                type="button"
                onClick={() => updateScope({ floors: Math.min(20, commercialScope.floors + 1) })}
                className="w-11 h-11 rounded-full border-2 border-border bg-card flex items-center justify-center text-lg font-bold hover:bg-muted transition-colors touch-manipulation active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Special Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              {t(language, 'commercial.notes')}
            </Label>
            <Textarea
              id="notes"
              placeholder={t(language, 'commercial.notes_placeholder')}
              value={commercialScope.notes}
              onChange={(e) => updateScope({ notes: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Trust Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <ShieldCheck className="w-4 h-4" />
        <span>{t(language, 'commercial.trust_badge')}</span>
      </div>
    </div>
  );
}
