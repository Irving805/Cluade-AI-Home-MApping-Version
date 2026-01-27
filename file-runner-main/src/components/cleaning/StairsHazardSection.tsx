import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { StairsConfig } from '@/contexts/BookingContext';
import { AlertTriangle, CornerDownRight, Dog, Droplets, Columns3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface StairsHazardSectionProps {
  language: Language;
  stairsConfig: StairsConfig;
  onStairsConfigChange: (updates: Partial<StairsConfig>) => void;
}

const STAIR_HAZARDS = [
  { 
    id: 'cornerBuildup' as const, 
    icon: CornerDownRight, 
    labelKey: 'stairs.corner_buildup', 
    descKey: 'stairs.corner_buildup_desc',
    timeImpact: '+12 min'
  },
  { 
    id: 'petHairAccumulation' as const, 
    icon: Dog, 
    labelKey: 'stairs.pet_hair', 
    descKey: 'stairs.pet_hair_desc',
    timeImpact: '+10 min'
  },
  { 
    id: 'slipHazards' as const, 
    icon: Droplets, 
    labelKey: 'stairs.slip_hazards', 
    descKey: 'stairs.slip_hazards_desc',
    timeImpact: '+5 min'
  },
  { 
    id: 'railingsDetail' as const, 
    icon: Columns3, 
    labelKey: 'stairs.railings_detail', 
    descKey: 'stairs.railings_detail_desc',
    timeImpact: '+18 min'
  },
];

export function StairsHazardSection({
  language,
  stairsConfig,
  onStairsConfigChange,
}: StairsHazardSectionProps) {
  return (
    <div className="space-y-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {t(language, 'stairs.hazard.title')}
        </span>
      </div>
      
      {/* Hazard Toggles */}
      <div className="space-y-2">
        {STAIR_HAZARDS.map((hazard) => {
          const Icon = hazard.icon;
          const isActive = stairsConfig[hazard.id] || false;
          
          return (
            <div
              key={hazard.id}
              className={cn(
                "flex items-center justify-between gap-3 p-2 rounded-lg border transition-all duration-200",
                isActive
                  ? "border-amber-400/50 bg-amber-100/50 dark:bg-amber-900/30"
                  : "border-border/30 bg-card hover:border-border/50"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Icon className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )} />
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    "text-xs font-medium truncate",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {t(language, hazard.labelKey)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 truncate">
                    {t(language, hazard.descKey)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {isActive && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    {hazard.timeImpact}
                  </span>
                )}
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => onStairsConfigChange({ [hazard.id]: checked })}
                  className="scale-90"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
