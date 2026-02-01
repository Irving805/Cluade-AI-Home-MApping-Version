import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { RoomAddonSelection, Situation } from '@/contexts/BookingContext';
import { Flame, Snowflake, LayoutGrid, Wind, AlertTriangle, Users, Check, ChevronUp, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { 
  calculateKitchenCabinetsPrice,
  calculateUpperCabinetsPrice,
  calculateKitchenCabinetsDegreasePrice,
  KITCHEN_ADDON_PRICES, 
  KITCHEN_ADDON_MINUTES,
  CabinetSizeOverride,
  DegreaseLevel,
  CabinetComplexity
} from '@/lib/pricing_kitchen';
import type { PropertyCategory } from '@/lib/pricing';

interface KitchenAddon {
  id: string;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
  price: number;
  minutes: number;
  essentialForMoving?: boolean;
  isInsideAppliance?: boolean;
  isDynamic?: boolean;
  isPremium?: boolean;
}

interface KitchenAddonsGridProps {
  language: Language;
  situation: Situation;
  roomAddons: RoomAddonSelection[];
  onAddonToggle: (addonId: string) => void;
  // Access & Safety props
  pullOutAppliances: boolean;
  onPullOutAppliancesChange: (enabled: boolean) => void;
  pullOutAppliancesPrice: number;
  // Multi-factor cabinet pricing (SSOT)
  bedrooms?: number;
  propertyType?: PropertyCategory | string;
  sqftRange?: string;
  cabinetOverride?: CabinetSizeOverride;
  onCabinetOverrideChange?: (override: CabinetSizeOverride) => void;
  // Degrease mode
  degreaseLevel?: DegreaseLevel;
  onDegreaseLevelChange?: (level: DegreaseLevel) => void;
  // Cabinet complexity (Phase 2)
  cabinetComplexity?: CabinetComplexity;
  onCabinetComplexityChange?: (complexity: CabinetComplexity) => void;
}

// Inside Appliances add-ons (EXTRAS)
const INSIDE_APPLIANCE_ADDONS: KitchenAddon[] = [
  {
    id: 'oven',
    labelKey: 'addon.oven',
    descKey: 'addon.oven.desc',
    icon: <Flame className="w-4 h-4" />,
    price: KITCHEN_ADDON_PRICES.oven,
    minutes: KITCHEN_ADDON_MINUTES.oven,
    essentialForMoving: true,
    isInsideAppliance: true,
  },
  {
    id: 'fridge_empty',
    labelKey: 'addon.fridge_empty',
    descKey: 'addon.fridge_empty.desc',
    icon: <Snowflake className="w-4 h-4" />,
    price: KITCHEN_ADDON_PRICES.fridge_empty,
    minutes: KITCHEN_ADDON_MINUTES.fridge_empty,
    essentialForMoving: true,
    isInsideAppliance: true,
  },
  {
    id: 'cabinets',
    labelKey: 'addon.kitchen_cabinets',
    descKey: 'addon.kitchen_cabinets.desc',
    icon: <LayoutGrid className="w-4 h-4" />,
    price: 0,
    minutes: 0,
    isInsideAppliance: true,
    isDynamic: true,
  },
  {
    id: 'upper_cabinets',
    labelKey: 'addon.upper_cabinets',
    descKey: 'addon.upper_cabinets.desc',
    icon: <ChevronUp className="w-4 h-4" />,
    price: 0,
    minutes: 0,
    isInsideAppliance: true,
    isDynamic: true,
    isPremium: true,
  },
  {
    id: 'hood',
    labelKey: 'addon.hood',
    descKey: 'addon.hood.desc',
    icon: <Wind className="w-4 h-4" />,
    price: KITCHEN_ADDON_PRICES.hood,
    minutes: KITCHEN_ADDON_MINUTES.hood,
    isInsideAppliance: true,
  },
];

// Cabinet size override options
const CABINET_SIZE_OPTIONS: { value: CabinetSizeOverride; labelKey: string }[] = [
  { value: 'small', labelKey: 'kitchen.cabinet_size.small' },
  { value: 'typical', labelKey: 'kitchen.cabinet_size.typical' },
  { value: 'large', labelKey: 'kitchen.cabinet_size.large' },
];

// Degrease severity options
const DEGREASE_SEVERITY_OPTIONS: { value: DegreaseLevel; labelKey: string }[] = [
  { value: 'light', labelKey: 'kitchen.degrease.light' },
  { value: 'medium', labelKey: 'kitchen.degrease.medium' },
  { value: 'heavy', labelKey: 'kitchen.degrease.heavy' },
];

export function KitchenAddonsGrid({
  language,
  situation,
  roomAddons,
  onAddonToggle,
  pullOutAppliances,
  onPullOutAppliancesChange,
  pullOutAppliancesPrice,
  bedrooms = 2,
  propertyType = 'single_family',
  sqftRange,
  cabinetOverride = 'typical',
  onCabinetOverrideChange,
  degreaseLevel = 'light',
  onDegreaseLevelChange,
  cabinetComplexity = 'standard',
  onCabinetComplexityChange,
}: KitchenAddonsGridProps) {
  const isMoving = situation === 'MOVING';
  
  // Calculate dynamic cabinet pricing using multi-factor SSOT
  const lowerCabinetPricing = calculateKitchenCabinetsPrice({ 
    bedrooms, 
    propertyType,
    sqftRange,
    cabinetOverride,
    cabinetComplexity,
  });
  
  const upperCabinetPricing = calculateUpperCabinetsPrice({ 
    bedrooms, 
    propertyType,
    sqftRange,
    cabinetOverride,
    cabinetComplexity,
  });
  
  const degreasePricing = calculateKitchenCabinetsDegreasePrice({
    degreaseLevel,
    propertyType,
    sqftRange,
  });
  
  const isAddonSelected = (addonId: string) =>
    roomAddons.some(a => a.addonId === addonId);
  
  // Check if any cabinet addon is selected (for degrease dependency)
  const isCabinetsSelected = isAddonSelected('cabinets') || isAddonSelected('upper_cabinets');
  
  // Get actual price/minutes for an addon (dynamic for cabinets/upper/degrease)
  const getAddonPrice = (addon: KitchenAddon) => {
    if (addon.id === 'cabinets') return lowerCabinetPricing.price;
    if (addon.id === 'upper_cabinets') return upperCabinetPricing.price;
    return addon.price;
  };
  
  const getAddonMinutes = (addon: KitchenAddon) => {
    if (addon.id === 'cabinets') return lowerCabinetPricing.minutes;
    if (addon.id === 'upper_cabinets') return upperCabinetPricing.minutes;
    return addon.minutes;
  };
  
  return (
    <div className="space-y-4">
      {/* ═══ INSIDE APPLIANCES — EXTRAS ═══ */}
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-foreground">
              {t(language, 'kitchen.addons.inside_appliances')}
            </h4>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">
            {t(language, 'kitchen.addons.extra_badge')}
          </span>
        </div>
        
        {/* Note */}
        <p className="text-xs text-muted-foreground">
          {t(language, 'kitchen.addons.inside_appliances_note')}
        </p>
        
        {/* Add-on Cards Grid */}
        <div className="grid grid-cols-2 gap-2">
          {INSIDE_APPLIANCE_ADDONS.map(addon => {
            const isSelected = isAddonSelected(addon.id);
            const showEssential = addon.essentialForMoving && isMoving;
            
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => onAddonToggle(addon.id)}
                className={cn(
                  "flex flex-col p-3 rounded-xl border-2 transition-all duration-200 text-left relative",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                {/* Essential Badge */}
                {showEssential && !isSelected && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-500 text-white rounded-full shadow-sm">
                    {t(language, 'kitchen.addons.essential')}
                  </span>
                )}
                
                {/* Premium Badge for upper cabinets */}
                {addon.isPremium && !isSelected && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-sm flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    Premium
                  </span>
                )}
                
                {/* Selected Check */}
                {isSelected && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                
                {/* Icon + Title */}
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "p-1.5 rounded-lg",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {addon.icon}
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {t(language, addon.labelKey)}
                  </span>
                </div>
                
                {/* Cabinets Subtitle (scope) */}
                {addon.id === 'cabinets' && (
                  <p className="text-[9px] font-medium text-primary/80 mb-1">
                    {t(language, 'addon.kitchen_cabinets.subtitle')}
                  </p>
                )}
                
                {/* Upper Cabinets Subtitle + Virtual Units Count */}
                {addon.id === 'upper_cabinets' && (
                  <>
                    <p className="text-[9px] font-medium text-amber-600 dark:text-amber-400 mb-0.5">
                      {t(language, 'addon.upper_cabinets.subtitle')}
                    </p>
                    <p className="text-[9px] text-muted-foreground mb-1">
                      Est. {upperCabinetPricing?.units || 0} cabinet units
                    </p>
                  </>
                )}
                
                {/* Description */}
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">
                  {t(language, addon.descKey)}
                </p>
                
                {/* Cabinets Scope: Includes / Excludes */}
                {addon.id === 'cabinets' && (
                  <div className="space-y-0.5 mb-2">
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 truncate">
                      ✓ {t(language, 'addon.kitchen_cabinets.includes')}
                    </p>
                    <p className="text-[9px] text-muted-foreground/70 truncate">
                      ✗ {t(language, 'addon.kitchen_cabinets.excludes')}
                    </p>
                  </div>
                )}
                
                {/* Price + Time - Use dynamic helpers */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span className="text-xs font-bold text-primary">
                    +${getAddonPrice(addon)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    / +{getAddonMinutes(addon)}min
                  </span>
                </div>
                
                {/* Cabinet Size Override Selector - Only for cabinets addon when selected */}
                {addon.id === 'cabinets' && isSelected && onCabinetOverrideChange && (
                  <div 
                    className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {CABINET_SIZE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCabinetOverrideChange(option.value);
                        }}
                        className={cn(
                          "flex-1 px-1.5 py-1 text-[9px] font-medium rounded-md transition-all",
                          cabinetOverride === option.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {t(language, option.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* ═══ KITCHEN CONDITION — Heavy Degrease Mode ═══ */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-foreground">
              {t(language, 'kitchen.condition.section_title')}
            </h4>
          </div>
        </div>
        
        {/* Degrease Mode Card */}
        <div className={cn(
          "p-3 rounded-xl border-2 transition-all duration-200 relative",
          !isCabinetsSelected
            ? "border-border/50 bg-muted/50 opacity-60"
            : isAddonSelected('kitchen_cabinets_degrease')
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
              : "border-border bg-card hover:border-amber-400/60"
        )}>
          {/* Disabled overlay with helper text */}
          {!isCabinetsSelected && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl z-10">
              <span className="text-xs font-medium text-muted-foreground px-3 py-1.5 bg-background rounded-full border">
                {t(language, 'addon.kitchen_cabinets_degrease.requires')}
              </span>
            </div>
          )}
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Flame className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-sm font-semibold text-foreground block">
                    {t(language, 'addon.kitchen_cabinets_degrease')}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    {t(language, 'addon.kitchen_cabinets_degrease.subtitle')}
                  </span>
                </div>
              </div>
              
              <p className="text-[10px] text-muted-foreground mb-2">
                {t(language, 'addon.kitchen_cabinets_degrease.desc')}
              </p>
              
              {/* Scope hints */}
              <div className="space-y-0.5 mb-2">
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 truncate">
                  ✓ {t(language, 'addon.kitchen_cabinets_degrease.includes')}
                </p>
                <p className="text-[9px] text-muted-foreground/70 truncate">
                  ✗ {t(language, 'addon.kitchen_cabinets_degrease.excludes')}
                </p>
              </div>
              
              {/* Price display */}
              {isAddonSelected('kitchen_cabinets_degrease') && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    +${degreasePricing.price}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    / +{degreasePricing.minutes}min
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({degreasePricing.severityLabel})
                  </span>
                </div>
              )}
              
              {/* Severity Selector Pills - only when addon is selected */}
              {isAddonSelected('kitchen_cabinets_degrease') && onDegreaseLevelChange && (
                <div className="flex items-center gap-1 pt-2 border-t border-amber-200 dark:border-amber-800/50">
                  {DEGREASE_SEVERITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDegreaseLevelChange(option.value);
                      }}
                      className={cn(
                        "flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-all",
                        degreaseLevel === option.value
                          ? "bg-amber-500 text-white"
                          : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                      )}
                    >
                      {t(language, option.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <Switch
              checked={isAddonSelected('kitchen_cabinets_degrease')}
              onCheckedChange={() => {
                if (isCabinetsSelected) {
                  onAddonToggle('kitchen_cabinets_degrease');
                }
              }}
              disabled={!isCabinetsSelected}
            />
          </div>
        </div>
      </div>
      
      {/* ═══ ACCESS & SAFETY ═══ */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <h4 className="text-sm font-semibold text-foreground">
            {t(language, 'kitchen.addons.access_safety')}
          </h4>
        </div>
        
        {/* Pull Out Appliances Card */}
        <div className={cn(
          "p-3 rounded-xl border-2 transition-all duration-200",
          pullOutAppliances
            ? "border-primary bg-primary/5"
            : "border-border bg-card"
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {t(language, 'kitchen.access.pull_out_title')}
                </span>
                {pullOutAppliancesPrice === 0 ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
                    {t(language, 'kitchen.access.included')}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-primary">
                    +${pullOutAppliancesPrice}
                  </span>
                )}
              </div>
              
              <p className="text-[10px] text-muted-foreground mb-2">
                {t(language, 'kitchen.access.pull_out_desc')}
              </p>
              
              {/* Safety Warning - Always visible when enabled */}
              {pullOutAppliances && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    {t(language, 'kitchen.access.safety_warning')}
                  </span>
                </div>
              )}
            </div>
            
            <Switch
              checked={pullOutAppliances}
              onCheckedChange={onPullOutAppliancesChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
