/**
 * SidebarFieldRow — Premium mobile-optimized field display row
 * 
 * Shows:
 * - Field label
 * - Current value (formatted)
 * - Default vs User Selected indicator
 * - Price/Time impact if applicable
 */

import { cn } from '@/lib/utils';
import { FieldContract, formatFieldValue, isFieldChanged } from '@/lib/homeMappingSidebarContract';
import { Language, t } from '@/lib/translations';
import { Check } from 'lucide-react';

interface SidebarFieldRowProps {
  field: FieldContract;
  value: any;
  language: Language;
  priceImpact?: number;
  timeImpact?: number;
  formData?: any; // For computed fields that need full context
}

export function SidebarFieldRow({ 
  field, 
  value, 
  language,
  priceImpact = 0,
  timeImpact = 0,
  formData,
}: SidebarFieldRowProps) {
  const displayValue = formatFieldValue(field, value, language, formData);
  const isDefault = !isFieldChanged(value, field.defaultValue);
  const hasImpact = priceImpact > 0 || timeImpact > 0;
  
  // Skip empty/default fields that have no impact
  if (isDefault && !hasImpact && displayValue === '—') {
    return null;
  }
  
  return (
    <div className={cn(
      // Layout
      "flex items-center justify-between gap-3 sm:gap-2",
      // Mobile-first touch-friendly padding
      "py-2 sm:py-1 px-1",
      // Subtle divider
      "border-b border-border/20 last:border-0",
      // Text sizing
      "text-sm sm:text-xs"
    )}>
      {/* Label */}
      <span className={cn(
        "text-muted-foreground truncate",
        "flex-shrink min-w-0 max-w-[45%]"
      )}>
        {t(language, field.labelKey) || field.key.split('.').pop()}
      </span>
      
      {/* Value + Badges */}
      <div className="flex items-center gap-2 sm:gap-1.5 flex-shrink-0 max-w-[55%]">
        {/* Value with premium styling */}
        <span className={cn(
          "font-medium max-w-[80px] sm:max-w-[100px] truncate",
          isDefault 
            ? "text-muted-foreground/70" 
            : "text-foreground"
        )}>
          {displayValue}
        </span>
        
        {/* Default/Set indicator */}
        {isDefault ? (
          <span className={cn(
            "text-[10px] sm:text-[8px] text-muted-foreground/50",
            "uppercase tracking-wider font-medium",
            "px-1.5 py-0.5 rounded-full bg-muted/50"
          )}>
            {t(language, 'sidebar.default') || 'Default'}
          </span>
        ) : (
          <span className={cn(
            "flex items-center justify-center",
            "w-4 h-4 sm:w-3.5 sm:h-3.5 rounded-full",
            "bg-primary/10 text-primary"
          )}>
            <Check className="w-3 h-3 sm:w-2.5 sm:h-2.5" strokeWidth={3} />
          </span>
        )}
        
        {/* Price impact badge */}
        {priceImpact > 0 && (
          <span className={cn(
            "text-[11px] sm:text-[9px] font-semibold font-mono",
            "px-1.5 py-0.5 rounded-full",
            "bg-emerald-100 dark:bg-emerald-900/40",
            "text-emerald-700 dark:text-emerald-300"
          )}>
            +${priceImpact}
          </span>
        )}
        
        {/* Time impact badge */}
        {timeImpact > 0 && (
          <span className={cn(
            "text-[11px] sm:text-[9px] font-semibold font-mono",
            "px-1.5 py-0.5 rounded-full",
            "bg-blue-100 dark:bg-blue-900/40",
            "text-blue-700 dark:text-blue-300"
          )}>
            +{timeImpact}m
          </span>
        )}
      </div>
    </div>
  );
}

export default SidebarFieldRow;
