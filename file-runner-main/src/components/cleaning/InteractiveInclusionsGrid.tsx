import { Check, Sparkles, Info } from 'lucide-react';
import { Language, t } from '@/lib/translations';
import { CoreSpaceInclusion } from '@/lib/coreSpaceConfig';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InteractiveInclusionsGridProps {
  roomId: string;
  inclusions: CoreSpaceInclusion[];
  language: Language;
  situation: 'LIVE_HERE' | 'MOVING' | null;
  serviceType: string;
  exclusions: string[]; // Array of excluded inclusion keys
  onExclusionToggle: (inclusionKey: string) => void;
}

export function InteractiveInclusionsGrid({
  roomId,
  inclusions,
  language,
  situation,
  serviceType,
  exclusions,
  onExclusionToggle,
}: InteractiveInclusionsGridProps) {
  // Filter inclusions based on service level
  const isDeepOrMoving = situation === 'MOVING' || serviceType === 'Deep Clean' || serviceType === 'Move-In/Out';
  
  const visibleInclusions = inclusions.filter(inc => {
    if (inc.requiresDeepOrMoving) {
      return isDeepOrMoving;
    }
    return true;
  });

  if (visibleInclusions.length === 0) return null;

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-muted/30 p-3">
      {/* Header with Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
            {t(language, 'inclusions.header')}
          </span>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
          {t(language, 'inclusions.included_badge')}
        </span>
      </div>
      
      {/* Interactive Grid - 2 columns desktop, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {visibleInclusions.map(inc => {
          const isExcluded = exclusions.includes(inc.key);
          
          return (
            <div 
              key={inc.key} 
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded-md transition-all cursor-pointer",
                "hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
                isExcluded && "opacity-60"
              )}
              onClick={() => onExclusionToggle(inc.key)}
            >
              <Checkbox
                id={`${roomId}-${inc.key}`}
                checked={!isExcluded}
                onCheckedChange={() => onExclusionToggle(inc.key)}
                className={cn(
                  "h-4 w-4 border-emerald-300 dark:border-emerald-700",
                  !isExcluded && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                )}
              />
              <span 
                className={cn(
                  "text-[11px] flex-1",
                  isExcluded 
                    ? "text-muted-foreground line-through" 
                    : "text-foreground"
                )}
              >
                {t(language, inc.labelKey)}
              </span>
              
              {/* Skip hint for excluded items */}
              {isExcluded && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t(language, 'inclusions.unchecked_hint')}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t(language, 'inclusions.no_discount')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
