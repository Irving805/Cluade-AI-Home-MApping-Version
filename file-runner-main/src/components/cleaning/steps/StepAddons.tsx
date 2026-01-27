import { useState, useEffect, useMemo } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { extraTouchAddons, windowTypeAddons, blindTypeAddons, recurringOnlyAddons } from '@/lib/pricing';
import { getAllContextualAddonIds, getAddonSourceSpace, CORE_SPACE_CONFIG } from '@/lib/coreSpaceConfig';
import { AddonCard } from '../AddonCard';
import { WindowAddonCard } from '../WindowAddonCard';
import { StepAddonsLite } from './StepAddonsLite';
import { 
  LayoutGrid, 
  ChevronRight, 
  ChevronDown,
  Sparkles,
  Star,
  Wind,
  PawPrint,
  Home,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepAddons() {
  const { language, formData, selectedAddons, toggleAddon, moveContext, situation } = useBooking();
  
  // Local toggle states for sections
  const [showWindows, setShowWindows] = useState(false);
  const [showBlinds, setShowBlinds] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  
  const greeting = t(language, 'greeting.step2', { name: formData.firstName });
  
  // Determine if we're in a move context flow
  const isMoveOut = situation === 'MOVING' && moveContext === 'move_out';
  const isMoveIn = situation === 'MOVING' && moveContext === 'move_in';
  
  // SCOPE PROTECTION: Standard Clean shows ONLY lite add-ons (sheets/beds)
  const isStandardClean = situation === 'LIVE_HERE' && formData.baseServiceLevel === 'Standard Clean';
  
  // If Standard Clean, render the lite version instead
  if (isStandardClean) {
    return <StepAddonsLite />;
  }

  // Get list of addon IDs that can be selected via core space cards
  const contextualAddonIds = useMemo(() => getAllContextualAddonIds(), []);
  
  // Check if an addon was selected in a core space
  const getSelectedInRoom = (addonId: string): string | null => {
    if (!contextualAddonIds.includes(addonId)) return null;
    const isSelected = selectedAddons.some(a => a.value === addonId);
    if (!isSelected) return null;
    return getAddonSourceSpace(addonId);
  };
  
  // Get room label for display
  const getRoomLabel = (spaceId: string | null): string => {
    if (!spaceId) return '';
    const space = CORE_SPACE_CONFIG[spaceId];
    return space ? t(language, space.labelKey) : spaceId;
  };
  
  // Count selected addons per category
  const extrasCount = selectedAddons.filter(a => 
    extraTouchAddons.some(ex => ex.value === a.value)
  ).length;
  
  // Count window selections (including _in/_out variants)
  const windowCount = selectedAddons.filter(a => 
    a.value.startsWith('window_')
  ).reduce((sum, a) => sum + a.quantity, 0);
  
  // Count blinds selections
  const blindsCount = selectedAddons.filter(a => 
    a.value.startsWith('blinds_') || a.value.startsWith('shutter_')
  ).reduce((sum, a) => sum + a.quantity, 0);

  // Count recurring add-ons (pets, etc)
  const recurringCount = selectedAddons.filter(a => 
    recurringOnlyAddons.some(r => r.value === a.value)
  ).length;

  // Determine if Pets should show in Extra Touches
  // RULE: Show for Deep Reset OR Moving flows (both Move Out and Move In)
  const isDeepReset = formData.baseServiceLevel === 'Deep Clean';
  const isMovingFlow = situation === 'MOVING';
  const showPetsInExtras = isDeepReset || isMovingFlow;

  // Determine if recurring add-ons (Pets) should be visible in SEPARATE section
  // RULE: Show ONLY for Standard Clean + Recurring frequency
  const isRecurringService = ['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(formData.serviceType);
  const isStandardRecurring = formData.baseServiceLevel === 'Standard Clean' && isRecurringService;
  const showRecurringAddons = isStandardRecurring && situation !== 'MOVING';

  // Pets is eligible for: Standard+Recurring OR Deep Reset OR Moving
  const petsEligible = showRecurringAddons || showPetsInExtras;

  // AUTO-CLEANUP: Remove pets add-on if user switches to ineligible mode
  useEffect(() => {
    if (!petsEligible) {
      const isPetsSelected = selectedAddons.some(a => a.value === 'pets');
      if (isPetsSelected) {
        toggleAddon('pets');
      }
    }
  }, [petsEligible, selectedAddons, toggleAddon]);

  return (
    <div className="animate-fade-in pb-60 md:pb-0">
      {/* Move Out specific header with preselection explanation */}
      {isMoveOut && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-300/50">
          <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">
            {t(language, 'move_out.upsell_title')}
          </h3>
          <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-1">
            {t(language, 'move_out.preselect_helper')}
          </p>
        </div>
      )}
      
      {/* Move In specific header */}
      {isMoveIn && (
        <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl border border-emerald-300/50">
          <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
            {t(language, 'move_in.upsell_title')}
          </h3>
          <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-1">
            {t(language, 'move_in.fresh_start_helper')}
          </p>
        </div>
      )}
      
      {!isMoveOut && !isMoveIn && (
        <p className="text-center text-primary font-semibold mb-6 text-lg">{greeting}</p>
      )}

      {/* ========== PREMIUM SECTION: SPECIAL ATTENTION AREAS ========== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-foreground">
            {t(language, 'addon.special_attention_title')}
          </h3>
        </div>

        {/* A. WINDOWS - Only show for flows WITHOUT per-room window mapping in Detailed Home Mapping */}
        {/* LIVE_HERE/MOVING flows have windows integrated directly in Step 1 (Detailed Home Mapping) */}
        {situation !== 'LIVE_HERE' && situation !== 'MOVING' && (
          /* Generic Window Type Selection for other flows */
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowWindows(!showWindows)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200',
                'border-2 active:scale-[0.99] touch-manipulation',
                'min-h-[72px]',
                showWindows 
                  ? 'border-primary bg-primary/[0.03] rounded-b-none' 
                  : 'border-border bg-gradient-to-r from-card to-card/80 hover:border-primary/40 hover:from-primary/[0.02] hover:to-primary/[0.01]'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
                  showWindows ? 'bg-primary/15' : 'bg-blue-100 dark:bg-blue-900/30'
                )}>
                  <Wind className={cn("w-5 h-5", showWindows ? "text-primary" : "text-blue-600 dark:text-blue-400")} />
                </div>
                <div className="text-left">
                  <h5 className="font-bold text-foreground text-base">
                    {t(language, 'addon.windows_headline')}
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    {t(language, 'addon.windows_subtext')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {windowCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center">
                    {windowCount}
                  </span>
                )}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  showWindows ? 'bg-primary/10' : 'bg-muted/50'
                )}>
                  {showWindows ? (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>
            
            {showWindows && (
              <div className="border-2 border-t-0 border-primary rounded-b-xl p-4 bg-card animate-fade-in">
                <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground italic">{t(language, 'win.pricing_note')}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {windowTypeAddons.map((addon) => (
                    <WindowAddonCard
                      key={addon.value}
                      value={addon.value}
                      labelKey={addon.labelKey}
                      price={addon.price}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* B. BLINDS & SHUTTERS - Premium Feature Block */}
        {/* HIDDEN for LIVE_HERE/MOVING flows - blinds are now in Room-Based Window Section */}
        {(situation !== 'LIVE_HERE' && situation !== 'MOVING') && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowBlinds(!showBlinds)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200',
                'border-2 active:scale-[0.99] touch-manipulation',
                'min-h-[72px]',
                showBlinds 
                  ? 'border-primary bg-primary/[0.03] rounded-b-none' 
                  : 'border-border bg-gradient-to-r from-card to-card/80 hover:border-primary/40 hover:from-primary/[0.02] hover:to-primary/[0.01]'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
                  showBlinds ? 'bg-primary/15' : 'bg-purple-100 dark:bg-purple-900/30'
                )}>
                  <LayoutGrid className={cn("w-5 h-5", showBlinds ? "text-primary" : "text-purple-600 dark:text-purple-400")} />
                </div>
                <div className="text-left">
                  <h5 className="font-bold text-foreground text-base">
                    {t(language, 'addon.blinds_headline')}
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    {t(language, 'addon.blinds_subtext')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {blindsCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center">
                    {blindsCount}
                  </span>
                )}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  showBlinds ? 'bg-primary/10' : 'bg-muted/50'
                )}>
                  {showBlinds ? (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>
            
            {showBlinds && (
              <div className="border-2 border-t-0 border-primary rounded-b-xl p-4 bg-card animate-fade-in">
                <div className="grid gap-3 sm:grid-cols-2">
                  {blindTypeAddons.map((addon) => (
                    <AddonCard
                      key={addon.value}
                      value={addon.value}
                      labelKey={addon.labelKey}
                      price={addon.price}
                      hasQuantity={addon.hasQuantity}
                      unit={addon.unit}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== SECTION 2: EXTRA TOUCHES ========== */}
      {/* NOTE: Appliance Detailing (Oven, Fridge, Cabinets) now lives in Kitchen CoreSpaceCard (Step 1) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-bold text-foreground">
            {t(language, 'addon.sec_extras')}
          </h3>
        </div>

        {/* Extra Touches Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowExtras(!showExtras)}
            className={cn(
              'w-full flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200',
              'border-2 active:scale-[0.99] touch-manipulation',
              'min-h-[64px]',
              showExtras 
                ? 'border-primary bg-primary/[0.03] rounded-b-none' 
                : 'border-border bg-card hover:border-muted-foreground/40'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                showExtras ? 'bg-primary/10' : 'bg-muted/50'
              )}>
                <Sparkles className={cn("w-5 h-5", showExtras ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="text-left">
                <h5 className="font-bold text-foreground">{t(language, 'addon.sec_extras')}</h5>
                <p className="text-xs text-muted-foreground">{t(language, 'addon.extras_sub')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {extrasCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center">
                  {extrasCount}
                </span>
              )}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                showExtras ? 'bg-primary/10' : 'bg-muted/50'
              )}>
                {showExtras ? (
                  <ChevronDown className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </button>
          
          {showExtras && (
            <div className="border-2 border-t-0 border-primary rounded-b-xl p-4 bg-card animate-fade-in">
              <div className="grid gap-3 sm:grid-cols-2">
                {extraTouchAddons.map((addon) => (
                  <AddonCard
                    key={addon.value}
                    value={addon.value}
                    labelKey={addon.labelKey}
                    price={addon.price}
                    hasQuantity={addon.hasQuantity}
                    unit={addon.unit}
                  />
                ))}
                {/* Pets add-on shown for Deep Reset and Moving flows */}
                {showPetsInExtras && (
                  <AddonCard
                    key="pets"
                    value="pets"
                    labelKey="addon.pets"
                    price={15}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== SECTION 3: HOUSEHOLD PREFERENCES (RECURRING) ========== */}
      {showRecurringAddons && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2 mb-2">
            <PawPrint className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-base font-bold text-foreground">
              {t(language, 'addon.recurring_section_title')}
            </h3>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowRecurring(!showRecurring)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200',
                'border-2 active:scale-[0.99] touch-manipulation',
                'min-h-[64px]',
                showRecurring 
                  ? 'border-primary bg-primary/[0.03] rounded-b-none' 
                  : 'border-border bg-card hover:border-muted-foreground/40'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                  showRecurring ? 'bg-primary/10' : 'bg-muted/50'
                )}>
                  <Home className={cn("w-5 h-5", showRecurring ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="text-left">
                  <h5 className="font-bold text-foreground">{t(language, 'addon.recurring_section_title')}</h5>
                  <p className="text-xs text-muted-foreground">{t(language, 'addon.recurring_section_subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {recurringCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center">
                    {recurringCount}
                  </span>
                )}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  showRecurring ? 'bg-primary/10' : 'bg-muted/50'
                )}>
                  {showRecurring ? (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>
            
            {showRecurring && (
              <div className="border-2 border-t-0 border-primary rounded-b-xl p-4 bg-card animate-fade-in">
                <div className="grid gap-3 sm:grid-cols-2">
                  {recurringOnlyAddons.map((addon) => (
                    <AddonCard
                      key={addon.value}
                      value={addon.value}
                      labelKey={addon.labelKey}
                      price={addon.price}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}