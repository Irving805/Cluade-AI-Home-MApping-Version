/**
 * StairConnectionSelector - Premium Floor Connection Selector for Stairs
 * 
 * Stairs connect floors rather than sitting on a single floor.
 * Shows "Connects: Floor 1 → Floor 2" format with premium chip styling.
 */

import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { ArrowRight, AlertCircle } from 'lucide-react';
import {
  StairConnection,
  getStairConnectionOptions,
  getFloorLabel,
  isStairConnectionSelected,
  stairConnectionsEqual,
} from '@/lib/floorLocationTypes';

interface StairConnectionSelectorProps {
  language: Language;
  value: StairConnection | null;
  onChange: (connection: StairConnection) => void;
  maxFloors: number;
  disabled?: boolean;
  showRequired?: boolean;
}

export function StairConnectionSelector({
  language,
  value,
  onChange,
  maxFloors,
  disabled = false,
  showRequired = false,
}: StairConnectionSelectorProps) {
  // Don't show for single-floor properties
  if (maxFloors < 2) return null;

  const options = getStairConnectionOptions(maxFloors);
  const hasSelection = isStairConnectionSelected(value);
  const showRequiredState = showRequired && !hasSelection;

  return (
    <div className="space-y-2">
      {/* Header with label and required badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {t(language, 'stairs.connects_label')}
        </span>
        
        {showRequiredState && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase">
            <AlertCircle className="w-3 h-3" />
            {t(language, 'floor.required')}
          </span>
        )}
      </div>

      {/* Connection Options */}
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const isSelected = value && stairConnectionsEqual(value, option);
          const fromLabel = getFloorLabel(option.from, language);
          const toLabel = getFloorLabel(option.to, language);

          return (
            <button
              key={index}
              type="button"
              onClick={() => !disabled && onChange(option)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : showRequiredState
                    ? "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 hover:border-primary/50"
                    : "border-border bg-card hover:border-primary/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* From Floor */}
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-md",
                isSelected
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                {fromLabel}
              </span>

              {/* Arrow */}
              <ArrowRight className={cn(
                "w-4 h-4",
                isSelected ? "text-primary" : "text-muted-foreground"
              )} />

              {/* To Floor */}
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-md",
                isSelected
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                {toLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hint text when required but not selected */}
      {showRequiredState && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          {t(language, 'floor.tap_to_select')}
        </p>
      )}
    </div>
  );
}
