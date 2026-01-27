import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Check, Sparkles, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface KitchenInclusion {
  key: string;
  labelKey: string;
  requiresDeepOrMoving?: boolean;
}

interface KitchenIncludedChecklistProps {
  language: Language;
  situation: 'LIVE_HERE' | 'MOVING' | null;
  serviceType: string;
}

// Kitchen standard inclusions (matches CORE_SPACE_CONFIG.kitchen.inclusions)
const KITCHEN_INCLUSIONS: KitchenInclusion[] = [
  { key: 'cabinet_surfaces', labelKey: 'core.kitchen.cabinet_surfaces' },
  { key: 'stove_top_front', labelKey: 'core.kitchen.stove_top_front' },
  { key: 'microwave', labelKey: 'core.kitchen.microwave', requiresDeepOrMoving: true },
  { key: 'sink_area', labelKey: 'core.kitchen.sink_area' },
  { key: 'trash_removal', labelKey: 'core.kitchen.trash_removal' },
  { key: 'countertops', labelKey: 'core.kitchen.countertops' },
  { key: 'mopping_vacuuming', labelKey: 'core.kitchen.mopping_vacuuming' },
  { key: 'vent_surfaces', labelKey: 'core.kitchen.vent_surfaces', requiresDeepOrMoving: true },
  { key: 'baseboards', labelKey: 'kitchen.included.baseboards', requiresDeepOrMoving: true },
];

export function KitchenIncludedChecklist({
  language,
  situation,
  serviceType,
}: KitchenIncludedChecklistProps) {
  const isDeepOrMoving = situation === 'MOVING' || serviceType === 'Deep Clean';
  
  // Filter visible inclusions based on service type
  const visibleInclusions = KITCHEN_INCLUSIONS.filter(inc => 
    !inc.requiresDeepOrMoving || isDeepOrMoving
  );
  
  const deepOnlyInclusions = KITCHEN_INCLUSIONS.filter(inc => inc.requiresDeepOrMoving);
  
  return (
    <div className="space-y-3">
      {/* Header with Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h4 className="text-sm font-semibold text-foreground">
            {t(language, 'kitchen.included.header')}
          </h4>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
          {t(language, 'kitchen.included.badge')}
        </span>
      </div>
      
      {/* Checklist Grid - 2 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
        {visibleInclusions.map(inc => (
          <div
            key={inc.key}
            className="flex items-center gap-2 py-1"
          >
            <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="text-xs text-foreground">
              {t(language, inc.labelKey)}
            </span>
            {inc.requiresDeepOrMoving && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400">*</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t(language, 'kitchen.included.deep_only_note')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ))}
      </div>
      
      {/* Deep/Move Only Note */}
      {isDeepOrMoving && deepOnlyInclusions.length > 0 && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic flex items-center gap-1">
          <Info className="w-3 h-3" />
          {t(language, 'kitchen.included.deep_note')}
        </p>
      )}
    </div>
  );
}
