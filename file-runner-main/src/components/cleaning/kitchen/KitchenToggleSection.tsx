/**
 * KitchenToggleSection — Reusable Toggle Wrapper Component
 * 
 * Provides a toggleable section header with collapsible content.
 * Pattern: Same UX feel as Hazards & Waste section but with opt-in toggle.
 * 
 * KEY DESIGN DECISIONS:
 * - isEnabled (SSOT state): Controls whether section contributes to pricing/ops
 * - open (local UI state): Controls whether section is expanded/collapsed
 * - Rule: If !isEnabled → always collapsed (open = false)
 * - Toggle ON → auto-expand for premium feel
 * - Toggle OFF → auto-collapse
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface KitchenToggleSectionProps {
  language: Language;
  titleKey: string;
  icon: React.ReactNode;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  badgeCount?: number;
  colorScheme: 'amber' | 'blue' | 'emerald';
  disabledHintKey?: string;
  children: React.ReactNode;
}

// Color scheme mappings
const COLOR_SCHEMES = {
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    headerBg: 'bg-amber-100/50 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500 text-white',
    toggle: 'data-[state=checked]:bg-amber-500',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/50',
    headerBg: 'bg-blue-100/50 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500 text-white',
    toggle: 'data-[state=checked]:bg-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    headerBg: 'bg-emerald-100/50 dark:bg-emerald-900/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500 text-white',
    toggle: 'data-[state=checked]:bg-emerald-500',
  },
};

export function KitchenToggleSection({
  language,
  titleKey,
  icon,
  isEnabled,
  onToggle,
  badgeCount = 0,
  colorScheme,
  disabledHintKey,
  children,
}: KitchenToggleSectionProps) {
  const colors = COLOR_SCHEMES[colorScheme];
  
  // LOCAL UI state: controls Collapsible open/closed (NOT pricing/ops)
  const [open, setOpen] = useState(false);
  
  // RULE: If disabled, force closed
  useEffect(() => {
    if (!isEnabled) {
      setOpen(false);
    }
  }, [isEnabled]);
  
  // Handler: When toggling the enable switch
  const handleToggleEnabled = (next: boolean) => {
    onToggle(next);
    // Auto-expand when enabling, collapse when disabling
    setOpen(next);
  };
  
  // Handler: Collapsible open/close (only works when enabled)
  const handleOpenChange = (newOpen: boolean) => {
    if (isEnabled) {
      setOpen(newOpen);
    } else {
      setOpen(false);
    }
  };
  
  // Display badge count (only when enabled and > 0)
  const displayBadge = isEnabled && badgeCount > 0;
  
  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <div className={cn(
        "rounded-xl border overflow-hidden transition-all duration-200",
        isEnabled ? colors.border : "border-border/40",
        isEnabled ? colors.bg : "bg-muted/20"
      )}>
        {/* Header with Toggle */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-disabled={!isEnabled}
            className={cn(
              "w-full flex items-center justify-between p-3 transition-colors",
              isEnabled && colors.headerBg,
              isEnabled && "hover:opacity-90 cursor-pointer",
              !isEnabled && "cursor-default"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "flex-shrink-0",
                isEnabled ? colors.icon : "text-muted-foreground"
              )}>
                {icon}
              </div>
              <div className="flex flex-col items-start">
                <span className={cn(
                  "text-sm font-semibold",
                  isEnabled ? "text-foreground" : "text-muted-foreground"
                )}>
                  {t(language, titleKey)}
                </span>
                {!isEnabled && disabledHintKey && (
                  <span className="text-[10px] text-muted-foreground">
                    {t(language, disabledHintKey)}
                  </span>
                )}
              </div>
              {displayBadge && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  colors.badge
                )}>
                  +{badgeCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Switch wrapper with stopPropagation to prevent header collapse toggle */}
              <div 
                onClick={(e) => e.stopPropagation()} 
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggleEnabled}
                  className={cn("scale-90", colors.toggle)}
                />
              </div>
              {/* Chevron: only show when enabled, rotate based on OPEN state (not isEnabled) */}
              {isEnabled && (
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )} />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        {/* Collapsible Content */}
        <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-3 pb-3 pt-1">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
