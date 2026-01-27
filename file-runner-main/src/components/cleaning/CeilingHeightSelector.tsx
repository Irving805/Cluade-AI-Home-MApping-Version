/**
 * CeilingHeightSelector — Premium 3-pill selector for residential ceiling height
 * Matches FloorLocationSelector pattern with distinct violet styling
 */

import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { ResidentialCeilingHeight, CEILING_HEIGHT_OPTIONS, getCeilingBadgeLabel } from '@/lib/ceilingHeightTypes';
import { ArrowDown, Minus, ArrowUp } from 'lucide-react';

interface CeilingHeightSelectorProps {
  language: Language;
  value: ResidentialCeilingHeight | null;
  onChange: (value: ResidentialCeilingHeight) => void;
  disabled?: boolean;
  inline?: boolean; // Compact mode for headers (like FloorLocationSelector)
  showRequired?: boolean;
}

// Map ceiling heights to icons
const CEILING_ICONS: Record<ResidentialCeilingHeight, typeof ArrowDown> = {
  LOW: ArrowDown,
  MEDIUM: Minus,
  HIGH: ArrowUp,
};

export function CeilingHeightSelector({
  language,
  value,
  onChange,
  disabled = false,
  inline = false,
  showRequired = false,
}: CeilingHeightSelectorProps) {
  // Inline mode - compact pills for header display
  if (inline) {
    return (
      <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap min-w-0">
        {CEILING_HEIGHT_OPTIONS.map((height) => {
          const Icon = CEILING_ICONS[height];
          const isSelected = value === height;
          
          return (
            <button
              key={height}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onChange(height);
              }}
              disabled={disabled}
              className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all min-h-[28px]",
                isSelected
                  ? "bg-violet-500/90 text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              title={getCeilingBadgeLabel(height, language)}
            >
              <Icon className="w-3 h-3 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap overflow-hidden text-ellipsis">{getCeilingBadgeLabel(height, language)}</span>
            </button>
          );
        })}
        
        {/* Required hint when no value selected */}
        {showRequired && !value && (
          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium animate-pulse whitespace-nowrap">
            {t(language, 'ceiling.tap_to_select')}
          </span>
        )}
      </div>
    );
  }

  // Full mode - section selector with 3-column GRID (never overflow)
  return (
    <div className="space-y-2 w-full min-w-0">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Minus className="w-3 h-3 flex-shrink-0" />
          {t(language, 'ceiling.title')}
        </label>
        {showRequired && !value && (
          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded whitespace-nowrap">
            {t(language, 'ceiling.tap_to_select')}
          </span>
        )}
      </div>
      
      {/* Grid layout ensures 3 equal columns, never overflow */}
      <div className="grid grid-cols-3 gap-1.5 w-full min-w-0">
        {CEILING_HEIGHT_OPTIONS.map((height) => {
          const Icon = CEILING_ICONS[height];
          const isSelected = value === height;
          const label = getCeilingBadgeLabel(height, language);
          
          return (
            <button
              key={height}
              type="button"
              onClick={() => !disabled && onChange(height)}
              disabled={disabled}
              className={cn(
                // 44px min height for tap target, grid handles equal widths
                "flex items-center justify-center gap-1 min-h-[44px] py-2 px-2 rounded-lg text-xs font-medium transition-all",
                "min-w-0", // Allow shrinking
                isSelected
                  ? "bg-violet-500 text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {/* Text with overflow protection */}
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CeilingHeightSelector;
