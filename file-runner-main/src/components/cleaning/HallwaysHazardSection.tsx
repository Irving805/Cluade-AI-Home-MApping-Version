import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { HallwaysConfig } from '@/contexts/BookingContext';
import { AlertTriangle, Footprints, Layers, PenTool, Frame, DoorOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface HallwaysHazardSectionProps {
  language: Language;
  hallwaysConfig: HallwaysConfig;
  onHallwaysConfigChange: (updates: Partial<HallwaysConfig>) => void;
}

const HALLWAY_HAZARDS = [
  { 
    id: 'highTrafficDust' as const, 
    icon: Footprints, 
    labelKey: 'hallways.high_traffic_dust', 
    descKey: 'hallways.high_traffic_dust_desc',
    timeImpact: '+8 min'
  },
  { 
    id: 'runnerOrRug' as const, 
    icon: Layers, 
    labelKey: 'hallways.runner_rug', 
    descKey: 'hallways.runner_rug_desc',
    timeImpact: '+10 min'
  },
  { 
    id: 'wallScuffs' as const, 
    icon: PenTool, 
    labelKey: 'hallways.wall_scuffs', 
    descKey: 'hallways.wall_scuffs_desc',
    timeImpact: '+12 min'
  },
  { 
    id: 'galleryWall' as const, 
    icon: Frame, 
    labelKey: 'hallways.gallery_wall', 
    descKey: 'hallways.gallery_wall_desc',
    timeImpact: '+15 min'
  },
  { 
    id: 'entryDebris' as const, 
    icon: DoorOpen, 
    labelKey: 'hallways.entry_debris', 
    descKey: 'hallways.entry_debris_desc',
    timeImpact: '+8 min'
  },
];

export function HallwaysHazardSection({
  language,
  hallwaysConfig,
  onHallwaysConfigChange,
}: HallwaysHazardSectionProps) {
  return (
    <div className="space-y-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {t(language, 'hallways.hazard.title')}
        </span>
      </div>
      
      {/* Hazard Toggles */}
      <div className="space-y-2">
        {HALLWAY_HAZARDS.map((hazard) => {
          const Icon = hazard.icon;
          const isActive = hallwaysConfig[hazard.id] || false;
          
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
                  onCheckedChange={(checked) => onHallwaysConfigChange({ [hazard.id]: checked })}
                  className="scale-90"
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Info footer */}
      <p className="text-[10px] text-muted-foreground/70 italic">
        Tasks add time + cost to your cleaning
      </p>
    </div>
  );
}
