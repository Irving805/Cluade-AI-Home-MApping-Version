/**
 * KitchenCabinetVisualMapper - Enhanced Visual Kitchen Cabinet Section
 *
 * Beautifully designed cabinet mapping component that:
 * - Displays visual representation of kitchen layout
 * - Shows estimated cabinet counts based on home size (beds, sqft, property type)
 * - Provides interactive selection for cabinet cleaning services
 * - Displays dynamic pricing with transparent breakdowns
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import {
  LayoutGrid,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Info,
  Check,
  Home,
  Building2,
  Building,
  Flame,
  Clock,
  DollarSign,
  Layers,
  Grid3X3,
  ArrowUpDown
} from 'lucide-react';
import {
  calculateKitchenCabinetsPrice,
  calculateUpperCabinetsPrice,
  estimateUpperCabinetUnits,
  estimateLowerCabinetUnits,
  CabinetSizeOverride,
  CabinetComplexity,
  KitchenCabinetPricing
} from '@/lib/pricing_kitchen';
import type { PropertyCategory } from '@/lib/pricing';

// ============= TYPES =============

interface KitchenCabinetVisualMapperProps {
  language: Language;
  // Home logistics (determines cabinet count/pricing)
  bedrooms: number;
  propertyType: PropertyCategory | string;
  sqftRange?: string;
  // Cabinet selections
  lowerCabinetsSelected: boolean;
  upperCabinetsSelected: boolean;
  onLowerCabinetsToggle: () => void;
  onUpperCabinetsToggle: () => void;
  // Override options
  cabinetOverride: CabinetSizeOverride;
  onCabinetOverrideChange: (override: CabinetSizeOverride) => void;
  cabinetComplexity?: CabinetComplexity;
  onCabinetComplexityChange?: (complexity: CabinetComplexity) => void;
}

// ============= VISUAL COMPONENTS =============

// Cabinet unit visual block
function CabinetUnit({
  type,
  isHighlighted,
  zone
}: {
  type: 'upper' | 'lower';
  isHighlighted: boolean;
  zone?: 'prep' | 'cooking' | 'cleaning';
}) {
  const zoneColors = {
    prep: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300',
    cooking: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300',
    cleaning: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300',
  };

  return (
    <div
      className={cn(
        "rounded transition-all duration-300",
        type === 'upper'
          ? "h-4 w-6"
          : "h-6 w-8",
        isHighlighted
          ? zone
            ? zoneColors[zone]
            : "bg-primary/20 border-primary/40"
          : "bg-muted/50 border-muted-foreground/20",
        "border"
      )}
    />
  );
}

// Kitchen visual layout
function KitchenLayoutVisual({
  lowerCount,
  upperCount,
  lowerSelected,
  upperSelected,
}: {
  lowerCount: number;
  upperCount: number;
  lowerSelected: boolean;
  upperSelected: boolean;
}) {
  // Distribute cabinets across zones
  const upperPrep = Math.round(upperCount * 0.35);
  const upperCooking = Math.round(upperCount * 0.40);
  const upperCleaning = upperCount - upperPrep - upperCooking;

  const lowerPrep = Math.round(lowerCount * 0.35);
  const lowerCooking = Math.round(lowerCount * 0.40);
  const lowerCleaning = lowerCount - lowerPrep - lowerCooking;

  return (
    <div className="relative p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900/50 dark:to-stone-800/50 border border-stone-200 dark:border-stone-700">
      {/* Kitchen layout label */}
      <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-background text-[10px] font-semibold text-muted-foreground rounded-full border">
        Kitchen Layout Preview
      </div>

      {/* Upper cabinets row */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1.5">
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Upper Cabinets</span>
          <span className="ml-auto text-[9px] text-muted-foreground bg-muted px-1.5 rounded">
            {upperCount} units
          </span>
        </div>
        <div className="flex flex-wrap gap-0.5 justify-center">
          {/* Prep zone */}
          {Array.from({ length: upperPrep }).map((_, i) => (
            <CabinetUnit
              key={`upper-prep-${i}`}
              type="upper"
              isHighlighted={upperSelected}
              zone={upperSelected ? 'prep' : undefined}
            />
          ))}
          {/* Cooking zone (above range) */}
          <div className="w-8 h-4 rounded bg-stone-300 dark:bg-stone-600 border border-stone-400 flex items-center justify-center">
            <span className="text-[6px] text-stone-600 dark:text-stone-300">HOOD</span>
          </div>
          {Array.from({ length: upperCooking }).map((_, i) => (
            <CabinetUnit
              key={`upper-cooking-${i}`}
              type="upper"
              isHighlighted={upperSelected}
              zone={upperSelected ? 'cooking' : undefined}
            />
          ))}
          {/* Cleaning zone */}
          {Array.from({ length: upperCleaning }).map((_, i) => (
            <CabinetUnit
              key={`upper-cleaning-${i}`}
              type="upper"
              isHighlighted={upperSelected}
              zone={upperSelected ? 'cleaning' : undefined}
            />
          ))}
        </div>
      </div>

      {/* Counter surface */}
      <div className="h-2 bg-gradient-to-r from-stone-200 via-stone-300 to-stone-200 dark:from-stone-600 dark:via-stone-500 dark:to-stone-600 rounded-sm mb-2" />

      {/* Lower cabinets row */}
      <div>
        <div className="flex flex-wrap gap-0.5 justify-center">
          {/* Prep zone */}
          {Array.from({ length: lowerPrep }).map((_, i) => (
            <CabinetUnit
              key={`lower-prep-${i}`}
              type="lower"
              isHighlighted={lowerSelected}
              zone={lowerSelected ? 'prep' : undefined}
            />
          ))}
          {/* Cooking zone (range area) */}
          <div className="w-10 h-6 rounded bg-stone-400 dark:bg-stone-500 border border-stone-500 flex items-center justify-center">
            <Flame className="w-3 h-3 text-stone-600 dark:text-stone-300" />
          </div>
          {Array.from({ length: lowerCooking }).map((_, i) => (
            <CabinetUnit
              key={`lower-cooking-${i}`}
              type="lower"
              isHighlighted={lowerSelected}
              zone={lowerSelected ? 'cooking' : undefined}
            />
          ))}
          {/* Sink area */}
          <div className="w-10 h-6 rounded bg-sky-200 dark:bg-sky-900/50 border border-sky-300 dark:border-sky-700 flex items-center justify-center">
            <span className="text-[6px] text-sky-600 dark:text-sky-300">SINK</span>
          </div>
          {/* Cleaning zone */}
          {Array.from({ length: lowerCleaning }).map((_, i) => (
            <CabinetUnit
              key={`lower-cleaning-${i}`}
              type="lower"
              isHighlighted={lowerSelected}
              zone={lowerSelected ? 'cleaning' : undefined}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Lower/Base Cabinets</span>
          <span className="ml-auto text-[9px] text-muted-foreground bg-muted px-1.5 rounded">
            {lowerCount} units
          </span>
        </div>
      </div>

      {/* Zone legend */}
      {(lowerSelected || upperSelected) && (
        <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[9px] text-muted-foreground">Prep</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[9px] text-muted-foreground">Cooking</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-muted-foreground">Cleaning</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Home size indicator badge
function HomeSizeIndicator({
  bedrooms,
  sqftRange,
  propertyType,
  language,
}: {
  bedrooms: number;
  sqftRange?: string;
  propertyType: string;
  language: Language;
}) {
  const propertyIcons: Record<string, React.ReactNode> = {
    apartment: <Building2 className="w-3.5 h-3.5" />,
    apartment_condo: <Building2 className="w-3.5 h-3.5" />,
    condo: <Building className="w-3.5 h-3.5" />,
    townhouse: <Home className="w-3.5 h-3.5" />,
    single_family: <Home className="w-3.5 h-3.5" />,
    house: <Home className="w-3.5 h-3.5" />,
  };

  const bedLabel = bedrooms === 0 ? 'Studio' : `${bedrooms} Bed`;

  // Format sqft range
  const sqftLabel = sqftRange?.replace('SF_', '').replace('_', '-').replace('<', '< ').replace('+', '+ ') || '';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
        {propertyIcons[propertyType.toLowerCase()] || <Home className="w-3.5 h-3.5" />}
        <span className="capitalize">{propertyType.replace('_', ' ')}</span>
      </div>
      <div className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
        {bedLabel}
      </div>
      {sqftLabel && (
        <div className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
          {sqftLabel} sqft
        </div>
      )}
    </div>
  );
}

// Cabinet service card
function CabinetServiceCard({
  type,
  language,
  isSelected,
  onToggle,
  pricing,
  unitCount,
  cabinetOverride,
  onCabinetOverrideChange,
}: {
  type: 'lower' | 'upper';
  language: Language;
  isSelected: boolean;
  onToggle: () => void;
  pricing: KitchenCabinetPricing;
  unitCount: number;
  cabinetOverride?: CabinetSizeOverride;
  onCabinetOverrideChange?: (override: CabinetSizeOverride) => void;
}) {
  const isLower = type === 'lower';

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all duration-300",
        isSelected
          ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Premium badge for upper cabinets */}
      {!isLower && !isSelected && (
        <div className="absolute -top-2 left-3 px-2 py-0.5 text-[9px] font-bold uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-sm flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          Premium
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            isSelected
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          )}>
            {isLower ? (
              <LayoutGrid className="w-5 h-5" />
            ) : (
              <Layers className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {isLower ? t(language, 'addon.kitchen_cabinets') : t(language, 'addon.upper_cabinets')}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {isLower
                ? t(language, 'addon.kitchen_cabinets.subtitle')
                : t(language, 'addon.upper_cabinets.subtitle')
              }
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {isSelected ? 'Selected' : 'Add'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Grid3X3 className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-sm font-bold text-foreground">{unitCount}</span>
          <span className="text-[9px] text-muted-foreground">Est. Units</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Clock className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-sm font-bold text-foreground">{pricing.minutes}</span>
          <span className="text-[9px] text-muted-foreground">Minutes</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-primary/10">
          <DollarSign className="w-4 h-4 text-primary mb-1" />
          <span className="text-sm font-bold text-primary">${pricing.price}</span>
          <span className="text-[9px] text-muted-foreground">Price</span>
        </div>
      </div>

      {/* Breakdown text */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
        <Info className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{pricing.breakdownText}</span>
      </div>

      {/* Cabinet size selector (only for lower cabinets when selected) */}
      {isLower && isSelected && onCabinetOverrideChange && (
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center gap-1 mb-2">
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              Adjust Cabinet Count
            </span>
          </div>
          <div className="flex gap-1">
            {(['small', 'typical', 'large'] as CabinetSizeOverride[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCabinetOverrideChange(size);
                }}
                className={cn(
                  "flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-all capitalize",
                  cabinetOverride === size
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= MAIN COMPONENT =============

export function KitchenCabinetVisualMapper({
  language,
  bedrooms,
  propertyType,
  sqftRange,
  lowerCabinetsSelected,
  upperCabinetsSelected,
  onLowerCabinetsToggle,
  onUpperCabinetsToggle,
  cabinetOverride,
  onCabinetOverrideChange,
  cabinetComplexity = 'standard',
  onCabinetComplexityChange,
}: KitchenCabinetVisualMapperProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate cabinet counts based on home size using SSOT pricing functions
  const cabinetCounts = useMemo(() => {
    // Get lower cabinet count from pricing engine (includes override factor)
    const lowerCount = estimateLowerCabinetUnits({
      bedrooms,
      sqftRange,
      propertyType,
      cabinetOverride,
    });

    // Get upper count from pricing engine
    const upperCount = estimateUpperCabinetUnits({
      bedrooms,
      sqftRange,
      propertyType
    });

    return { lower: lowerCount, upper: upperCount };
  }, [bedrooms, sqftRange, propertyType, cabinetOverride]);

  // Calculate pricing
  const lowerPricing = useMemo(() =>
    calculateKitchenCabinetsPrice({
      bedrooms,
      propertyType,
      sqftRange,
      cabinetOverride,
      cabinetComplexity,
    }),
    [bedrooms, propertyType, sqftRange, cabinetOverride, cabinetComplexity]
  );

  const upperPricing = useMemo(() =>
    calculateUpperCabinetsPrice({
      bedrooms,
      propertyType,
      sqftRange,
      cabinetOverride,
      cabinetComplexity,
    }),
    [bedrooms, propertyType, sqftRange, cabinetOverride, cabinetComplexity]
  );

  // Calculate total if both selected
  const totalPrice = (lowerCabinetsSelected ? lowerPricing.price : 0) +
                     (upperCabinetsSelected ? upperPricing.price : 0);
  const totalMinutes = (lowerCabinetsSelected ? lowerPricing.minutes : 0) +
                       (upperCabinetsSelected ? upperPricing.minutes : 0);

  return (
    <div className="space-y-4">
      {/* Header with home size context */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Kitchen Cabinets
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Inside cabinet wipe-down & organization
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[10px] text-primary font-medium"
          >
            {showDetails ? 'Hide details' : 'Show pricing details'}
          </button>
        </div>

        {/* Home logistics badge row */}
        <HomeSizeIndicator
          bedrooms={bedrooms}
          sqftRange={sqftRange}
          propertyType={String(propertyType)}
          language={language}
        />
      </div>

      {/* Visual kitchen layout */}
      <KitchenLayoutVisual
        lowerCount={cabinetCounts.lower}
        upperCount={cabinetCounts.upper}
        lowerSelected={lowerCabinetsSelected}
        upperSelected={upperCabinetsSelected}
      />

      {/* Cabinet service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CabinetServiceCard
          type="lower"
          language={language}
          isSelected={lowerCabinetsSelected}
          onToggle={onLowerCabinetsToggle}
          pricing={lowerPricing}
          unitCount={cabinetCounts.lower}
          cabinetOverride={cabinetOverride}
          onCabinetOverrideChange={onCabinetOverrideChange}
        />
        <CabinetServiceCard
          type="upper"
          language={language}
          isSelected={upperCabinetsSelected}
          onToggle={onUpperCabinetsToggle}
          pricing={upperPricing}
          unitCount={cabinetCounts.upper}
        />
      </div>

      {/* Total summary (when at least one selected) */}
      {(lowerCabinetsSelected || upperCabinetsSelected) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-foreground">Cabinet Cleaning Total</span>
              <p className="text-[10px] text-muted-foreground">
                {lowerCabinetsSelected && upperCabinetsSelected
                  ? 'Lower + Upper cabinets'
                  : lowerCabinetsSelected
                    ? 'Lower/Base cabinets only'
                    : 'Upper cabinets only'
                }
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-primary">${totalPrice}</span>
              <p className="text-[10px] text-muted-foreground">~{totalMinutes} min</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed pricing breakdown (collapsible) */}
      {showDetails && (
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Info className="w-4 h-4" />
            How we calculate cabinet pricing
          </h4>

          <div className="space-y-2 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Base time ({bedrooms === 0 ? 'Studio' : `${bedrooms} bed`}):</span>
              <span className="font-medium">{lowerPricing.factors.baseMinutes} min</span>
            </div>
            <div className="flex justify-between">
              <span>Square footage factor:</span>
              <span className="font-medium">×{lowerPricing.factors.sqftFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Property type factor:</span>
              <span className="font-medium">×{lowerPricing.factors.structureFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cabinet size ({cabinetOverride}):</span>
              <span className="font-medium">×{lowerPricing.factors.overrideFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span>Rate per minute:</span>
              <span className="font-medium">${lowerPricing.factors.ratePerMin.toFixed(2)}/min</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/70 italic">
            Pricing adapts to your home size for fair, accurate quotes.
          </p>
        </div>
      )}

      {/* Complexity selector (optional - Phase 2 feature) */}
      {onCabinetComplexityChange && (lowerCabinetsSelected || upperCabinetsSelected) && (
        <div className="p-3 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-foreground">Cabinet Interior Complexity</span>
          </div>
          <div className="flex gap-2">
            {(['standard', 'organized', 'high'] as CabinetComplexity[]).map((complexity) => (
              <button
                key={complexity}
                type="button"
                onClick={() => onCabinetComplexityChange(complexity)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-[10px] font-medium transition-all capitalize",
                  cabinetComplexity === complexity
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {complexity}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-2">
            {cabinetComplexity === 'standard' && 'Basic single/double wall cabinets'}
            {cabinetComplexity === 'organized' && 'Pull-outs, dividers, tiered shelves (+12%)'}
            {cabinetComplexity === 'high' && 'Lazy susans, complex organizers (+25%)'}
          </p>
        </div>
      )}
    </div>
  );
}

export default KitchenCabinetVisualMapper;
