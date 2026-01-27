import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Fan, Lightbulb, Minus, Plus, Archive, CheckCircle2, Bed, FolderOpen, AlertTriangle, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { FRESH_SHEETS_RATE, FRESH_SHEETS_TIME, ORGANIZATION_RATE, calcFreshSheetsCostPerBedroom } from '@/lib/pricing_v2';

// Per-bedroom addon configuration - uses constants from pricing_v2
export const BEDROOM_ADDON_CONFIG = {
  ceilingFan: {
    maxQty: 2,
    price: 10,
    timeMinutes: 10,
  },
  lightFixture: {
    maxQty: 3,
    price: 5,
    timeMinutes: 5,
  },
  closetCabinets: {
    maxQty: 2,
    price: 20, // Base price for Standard Clean - becomes $0 for Deep/Move
    timeMinutes: 15,
  },
  freshSheets: {
    maxQty: 3,                        // Up to 3 beds per room
    price: FRESH_SHEETS_RATE,         // $5 per EXTRA bed (1st bed FREE in lifestyle flows)
    timeMinutes: FRESH_SHEETS_TIME,   // 10 min per bed (time NOT reduced by courtesy)
  },
  organization: {
    ratePerHour: ORGANIZATION_RATE,   // $35/hour - tracked as Extra Service
    minHours: 0.5,                    // 30 min minimum
    maxHours: 4,                      // 4 hours max per bedroom
    timeMinutes: 30,                  // Per 30-min slot
  },
} as const;

export interface BedroomAddonCounts {
  ceilingFans: number;
  lightFixtures: number;
  closetCabinets: number;
  freshSheets: number;       // NEW: 0 or 1 per bedroom
  organizationHours: number; // NEW: 0-4 hours (0.5 increments)
}

interface BedroomAddonsCompactProps {
  roomId: string;
  value: BedroomAddonCounts;
  onChange: (value: BedroomAddonCounts) => void;
  language: Language;
  compact?: boolean;
  /** When true, closet interior detail shows $0 (Included) - for Deep/Move flows */
  isClosetIncluded?: boolean;
  /** When true, show Fresh Sheets - for "I live here" Deep/Basic flows only */
  showLifestyleAddons?: boolean;
  /** When true, show Organization - for LIVE_HERE + MOVING flows (not Commercial) */
  showOrganization?: boolean;
}

export function BedroomAddonsCompact({
  roomId,
  value,
  onChange,
  language,
  compact = false,
  isClosetIncluded = false,
  showLifestyleAddons = false,
  showOrganization = false,
}: BedroomAddonsCompactProps) {
  // Ensure value has all fields with defaults
  const safeValue = {
    ceilingFans: value.ceilingFans || 0,
    lightFixtures: value.lightFixtures || 0,
    closetCabinets: value.closetCabinets || 0,
    freshSheets: value.freshSheets || 0,
    organizationHours: value.organizationHours || 0,
  };
  
  const { ceilingFans, lightFixtures, closetCabinets, freshSheets, organizationHours } = safeValue;

  const handleFanChange = (delta: number) => {
    const newCount = Math.max(0, Math.min(BEDROOM_ADDON_CONFIG.ceilingFan.maxQty, ceilingFans + delta));
    onChange({ ...safeValue, ceilingFans: newCount });
  };

  const handleLightChange = (delta: number) => {
    const newCount = Math.max(0, Math.min(BEDROOM_ADDON_CONFIG.lightFixture.maxQty, lightFixtures + delta));
    onChange({ ...safeValue, lightFixtures: newCount });
  };

  const handleCabinetChange = (delta: number) => {
    const newCount = Math.max(0, Math.min(BEDROOM_ADDON_CONFIG.closetCabinets.maxQty, closetCabinets + delta));
    onChange({ ...safeValue, closetCabinets: newCount });
  };

  // When isClosetIncluded, closet cabinets are $0 (already in Deep/Move base price)
  const closetPrice = isClosetIncluded ? 0 : BEDROOM_ADDON_CONFIG.closetCabinets.price;
  
  // Calculate organization price using helper
  const organizationPrice = organizationHours * ORGANIZATION_RATE;
  
  // Calculate fresh sheets price using helper (showLifestyleAddons implies courtesy)
  const sheetsCalc = calcFreshSheetsCostPerBedroom(freshSheets, showLifestyleAddons);
  const freshSheetsPrice = sheetsCalc.cost;
  
  // Total price for bedroom extras (Organization excluded - tracked as Extra Service)
  const totalPrice = 
    (ceilingFans * BEDROOM_ADDON_CONFIG.ceilingFan.price) +
    (lightFixtures * BEDROOM_ADDON_CONFIG.lightFixture.price) +
    (closetCabinets * closetPrice) +
    freshSheetsPrice;  // Organization NOT included - displayed separately

  const hasSelections = ceilingFans > 0 || lightFixtures > 0 || closetCabinets > 0 || freshSheets > 0 || organizationHours > 0;

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      hasSelections 
        ? "border-amber-300/50 bg-amber-50/30 dark:bg-amber-900/10" 
        : "border-border/50 bg-muted/20",
      compact ? "p-2" : "p-2.5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "font-medium text-muted-foreground",
          compact ? "text-[9px]" : "text-[10px]"
        )}>
          {t(language, 'room.extras')}
        </span>
        {hasSelections && (
          <span className={cn(
            "font-semibold text-amber-600 dark:text-amber-400",
            compact ? "text-[9px]" : "text-[10px]"
          )}>
            +${totalPrice}
          </span>
        )}
      </div>

      {/* Addon Rows */}
      <div className="flex flex-wrap gap-3">
        {/* Ceiling Fans Counter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Fan className={cn(
              "text-muted-foreground",
              ceilingFans > 0 && "text-amber-600 dark:text-amber-400",
              compact ? "w-3 h-3" : "w-3.5 h-3.5"
            )} />
            <span className={cn(
              "font-medium whitespace-nowrap",
              ceilingFans > 0 ? "text-foreground" : "text-muted-foreground",
              compact ? "text-[9px]" : "text-[10px]"
            )}>
              {t(language, 'room.addon.fans')}
            </span>
          </div>
          
          {/* Counter */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleFanChange(-1)}
              disabled={ceilingFans === 0}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                ceilingFans > 0
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className={cn(
              "w-4 text-center font-semibold",
              compact ? "text-[10px]" : "text-xs"
            )}>
              {ceilingFans}
            </span>
            <button
              type="button"
              onClick={() => handleFanChange(1)}
              disabled={ceilingFans >= BEDROOM_ADDON_CONFIG.ceilingFan.maxQty}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                ceilingFans < BEDROOM_ADDON_CONFIG.ceilingFan.maxQty
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
          
          {ceilingFans > 0 && (
            <span className={cn("text-amber-600 dark:text-amber-400", compact ? "text-[8px]" : "text-[9px]")}>
              ${ceilingFans * BEDROOM_ADDON_CONFIG.ceilingFan.price}
            </span>
          )}
        </div>

        {/* Light Fixtures Counter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lightbulb className={cn(
              "text-muted-foreground",
              lightFixtures > 0 && "text-amber-600 dark:text-amber-400",
              compact ? "w-3 h-3" : "w-3.5 h-3.5"
            )} />
            <span className={cn(
              "font-medium whitespace-nowrap",
              lightFixtures > 0 ? "text-foreground" : "text-muted-foreground",
              compact ? "text-[9px]" : "text-[10px]"
            )}>
              {t(language, 'room.addon.lights')}
            </span>
          </div>
          
          {/* Counter */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleLightChange(-1)}
              disabled={lightFixtures === 0}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                lightFixtures > 0
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className={cn(
              "w-4 text-center font-semibold",
              compact ? "text-[10px]" : "text-xs"
            )}>
              {lightFixtures}
            </span>
            <button
              type="button"
              onClick={() => handleLightChange(1)}
              disabled={lightFixtures >= BEDROOM_ADDON_CONFIG.lightFixture.maxQty}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                lightFixtures < BEDROOM_ADDON_CONFIG.lightFixture.maxQty
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
          
          {lightFixtures > 0 && (
            <span className={cn("text-amber-600 dark:text-amber-400", compact ? "text-[8px]" : "text-[9px]")}>
              ${lightFixtures * BEDROOM_ADDON_CONFIG.lightFixture.price}
            </span>
          )}
        </div>

        {/* Closet Cabinet Interior Counter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Archive className={cn(
              "text-muted-foreground",
              closetCabinets > 0 && (isClosetIncluded ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"),
              compact ? "w-3 h-3" : "w-3.5 h-3.5"
            )} />
            <span className={cn(
              "font-medium whitespace-nowrap",
              closetCabinets > 0 ? "text-foreground" : "text-muted-foreground",
              compact ? "text-[9px]" : "text-[10px]"
            )}>
              {t(language, 'addon.bedroom_cabinets')}
            </span>
            {/* Premium "Included" Badge for Deep/Move */}
            {isClosetIncluded && (
              <span className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold",
                "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                compact ? "text-[7px]" : "text-[8px]"
              )}>
                <CheckCircle2 className="w-2 h-2" />
                {t(language, 'live_price.included')}
              </span>
            )}
          </div>
          
          {/* Counter */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleCabinetChange(-1)}
              disabled={closetCabinets === 0}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                closetCabinets > 0
                  ? (isClosetIncluded 
                      ? "border-emerald-300/50 bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200/50 dark:border-emerald-600/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20")
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className={cn(
              "w-4 text-center font-semibold",
              compact ? "text-[10px]" : "text-xs"
            )}>
              {closetCabinets}
            </span>
            <button
              type="button"
              onClick={() => handleCabinetChange(1)}
              disabled={closetCabinets >= BEDROOM_ADDON_CONFIG.closetCabinets.maxQty}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center border transition-colors",
                closetCabinets < BEDROOM_ADDON_CONFIG.closetCabinets.maxQty
                  ? (isClosetIncluded 
                      ? "border-emerald-300/50 bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200/50 dark:border-emerald-600/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20")
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
          
          {/* Show price or "Included" based on flow type */}
          {closetCabinets > 0 && (
            isClosetIncluded ? (
              <span className={cn("text-emerald-600 dark:text-emerald-400 font-medium", compact ? "text-[8px]" : "text-[9px]")}>
                $0
              </span>
            ) : (
              <span className={cn("text-amber-600 dark:text-amber-400", compact ? "text-[8px]" : "text-[9px]")}>
                ${closetCabinets * BEDROOM_ADDON_CONFIG.closetCabinets.price}
              </span>
            )
          )}
        </div>
        
        {/* === 🛏️ FRESH SHEETS & MADE BEDS === */}
        {/* Premium Logistics Module - "I live here" Deep/Basic only */}
        {/* 1st Bed FREE (courtesy), up to 3 beds per room */}
        {showLifestyleAddons && (
          <div className="flex flex-col gap-2 pt-3 border-t border-dashed border-blue-200/50 dark:border-blue-800/30 w-full">
            {/* Premium Header */}
            <div className="flex items-center gap-2">
              <Bed className={cn(
                freshSheets > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground",
                compact ? "w-3 h-3" : "w-3.5 h-3.5"
              )} />
              <span className={cn(
                "font-semibold uppercase tracking-wide",
                freshSheets > 0 ? "text-foreground" : "text-muted-foreground",
                compact ? "text-[9px]" : "text-[10px]"
              )}>
                {t(language, 'bedroom.fresh_sheets')}
              </span>
            </div>
            
            {/* Counter + Pricing Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Bed Counter (0-3) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...safeValue, freshSheets: Math.max(0, freshSheets - 1) })}
                  disabled={freshSheets === 0}
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center border transition-all",
                    freshSheets > 0
                      ? "border-blue-300/60 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-600/40 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className={cn(
                  "w-5 text-center font-bold",
                  freshSheets > 0 ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground",
                  compact ? "text-xs" : "text-sm"
                )}>
                  {freshSheets}
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ ...safeValue, freshSheets: Math.min(BEDROOM_ADDON_CONFIG.freshSheets.maxQty, freshSheets + 1) })}
                  disabled={freshSheets >= BEDROOM_ADDON_CONFIG.freshSheets.maxQty}
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center border transition-all",
                    freshSheets < BEDROOM_ADDON_CONFIG.freshSheets.maxQty
                      ? "border-blue-300/60 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-600/40 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              
              {/* Pricing Display with Courtesy Badge */}
              {freshSheets > 0 && (
                <div className="flex items-center gap-2">
                  {/* "1st Included" emerald badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold",
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                    compact ? "text-[7px]" : "text-[8px]"
                  )}>
                    <Sparkles className="w-2.5 h-2.5" />
                    {t(language, 'bedroom.sheets_included')}
                  </span>
                  {/* Extra beds cost */}
                  {sheetsCalc.chargedBeds > 0 && (
                    <span className={cn("text-amber-600 dark:text-amber-400 font-semibold", compact ? "text-[8px]" : "text-[9px]")}>
                      +${sheetsCalc.cost}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Logistics Requirement Note - Always visible when enabled */}
            {freshSheets > 0 && (
              <div className={cn(
                "text-[9px] p-2 rounded-md flex items-start gap-1.5",
                "bg-amber-50/80 text-amber-700 border border-amber-200/50",
                "dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
              )}>
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>{t(language, 'bedroom.fresh_sheets_note')}</span>
              </div>
            )}
          </div>
        )}
        
        {/* === 📂 ORGANIZATION - Extra Service === */}
        {/* Available in LIVE_HERE + MOVING (not Commercial) */}
        {showOrganization && (
          <div className="flex flex-col gap-2 pt-3 border-t-2 border-purple-200/50 dark:border-purple-800/30">
            {/* Extra Service Label */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider",
                "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
                compact ? "text-[6px]" : "text-[7px]"
              )}>
                {t(language, 'bedroom.extra_service')}
              </span>
            </div>
            
            {/* Organization Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <FolderOpen className={cn(
                organizationHours > 0 ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground",
                compact ? "w-3 h-3" : "w-3.5 h-3.5"
              )} />
              <span className={cn(
                "font-semibold",
                organizationHours > 0 ? "text-foreground" : "text-muted-foreground",
                compact ? "text-[9px]" : "text-[10px]"
              )}>
                {t(language, 'bedroom.organization')}
              </span>
              <span className={cn("text-muted-foreground", compact ? "text-[8px]" : "text-[9px]")}>
                ${ORGANIZATION_RATE}/hr
              </span>
            </div>
            
            {/* Slider + Price Display */}
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-[120px]">
                <Slider
                  value={[organizationHours * 2]} // 0-8 for 0.5 increments (0-4 hrs)
                  onValueChange={(v) => onChange({ ...safeValue, organizationHours: v[0] / 2 })}
                  min={0}
                  max={8}
                  step={1}
                  className="w-full"
                />
              </div>
              {organizationHours > 0 && (
                <span className={cn(
                  "font-bold whitespace-nowrap",
                  "text-purple-600 dark:text-purple-400",
                  compact ? "text-[9px]" : "text-[10px]"
                )}>
                  {organizationHours}hr = +${organizationPrice}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
