import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Trash2, Droplets, Sparkles, Dog, Bed, Shirt, Package } from 'lucide-react';
import { RoomFloorType } from '@/contexts/BookingContext';

// Floor-type-aware sticky spill times
export const BEDROOM_STICKY_TIMES = {
  hardwood_tile: 5,  // Quick enzymatic mop
  carpet: 12,        // Deep extraction treatment
  mixed: 8,          // Average of both
};

// Bedroom-specific hazard definitions with time impacts
export const BEDROOM_HAZARD_CONFIG = {
  dustBuildup: { 
    id: 'dustBuildup', 
    labelKey: 'bedroom.dust_buildup', 
    descKey: 'bedroom.dust_buildup_desc',
    icon: Sparkles,
    emoji: '✨',
    time: 8,
    moveOnly: false,
  },
  petHair: { 
    id: 'petHair', 
    labelKey: 'bedroom.pet_hair', 
    descKey: 'bedroom.pet_hair_desc',
    icon: Dog,
    emoji: '🐾',
    time: 10,
    moveOnly: false,
  },
  underBedDebris: { 
    id: 'underBedDebris', 
    labelKey: 'bedroom.under_bed_debris', 
    descKey: 'bedroom.under_bed_debris_desc',
    icon: Bed,
    emoji: '🛏️',
    time: 6,
    moveOnly: false,
  },
  closetClutter: { 
    id: 'closetClutter', 
    labelKey: 'bedroom.closet_clutter', 
    descKey: 'bedroom.closet_clutter_desc',
    icon: Shirt,
    emoji: '👔',
    time: 12,
    moveOnly: true, // Only for Move-Out
  },
  textileAccumulation: { 
    id: 'textileAccumulation', 
    labelKey: 'bedroom.textile_accumulation', 
    descKey: 'bedroom.textile_accumulation_desc',
    icon: Package,
    emoji: '📦',
    time: 15,
    moveOnly: true, // Only for Move-Out
  },
} as const;

// Interface for bedroom hazards state
export interface BedroomHazards {
  dustBuildup: boolean;
  petHair: boolean;
  underBedDebris: boolean;
  closetClutter: boolean;        // Move-Out only
  textileAccumulation: boolean;  // Move-Out only
  trashBags: number;             // 0-15 bags
  stickySpills: boolean;
}

// Default bedroom hazards
export const defaultBedroomHazards: BedroomHazards = {
  dustBuildup: false,
  petHair: false,
  underBedDebris: false,
  closetClutter: false,
  textileAccumulation: false,
  trashBags: 0,
  stickySpills: false,
};

interface BedroomsHazardSectionProps {
  roomId: string;
  roomLabel: string;
  language: Language;
  hazards: BedroomHazards;
  onHazardsChange: (hazards: BedroomHazards) => void;
  isMoveOut?: boolean; // Show Move-Out specific hazards
  floorType?: RoomFloorType; // NEW: For floor-type-reactive sticky spills
}

export function BedroomsHazardSection({
  roomId,
  roomLabel,
  language,
  hazards,
  onHazardsChange,
  isMoveOut = false,
  floorType = 'hardwood_tile',
}: BedroomsHazardSectionProps) {
  // Get sticky spill time based on floor type
  const stickySpillTime = BEDROOM_STICKY_TIMES[floorType] || BEDROOM_STICKY_TIMES.mixed;
  // Get hazard options based on flow type
  const hazardOptions = Object.values(BEDROOM_HAZARD_CONFIG).filter(
    h => !h.moveOnly || (h.moveOnly && isMoveOut)
  );

  const toggleHazard = (hazardId: keyof BedroomHazards) => {
    if (typeof hazards[hazardId] === 'boolean') {
      onHazardsChange({
        ...hazards,
        [hazardId]: !hazards[hazardId],
      });
    }
  };

  // Calculate total time from selected hazards
  const totalHazardTime = Object.entries(hazards).reduce((sum, [key, value]) => {
    if (value === true && BEDROOM_HAZARD_CONFIG[key as keyof typeof BEDROOM_HAZARD_CONFIG]) {
      return sum + BEDROOM_HAZARD_CONFIG[key as keyof typeof BEDROOM_HAZARD_CONFIG].time;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-4 pt-3 border-t border-dashed border-purple-200 dark:border-purple-800/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
            {t(language, 'bedroom.hazard.title')}
          </span>
        </div>
        {totalHazardTime > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
            +{totalHazardTime} min
          </span>
        )}
      </div>

      {/* Hazard Type Selector */}
      <div className="grid grid-cols-2 gap-2">
        {hazardOptions.map(option => {
          const isSelected = hazards[option.id as keyof BedroomHazards] === true;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleHazard(option.id as keyof BedroomHazards)}
              className={cn(
                "flex flex-col items-start p-2.5 rounded-lg border-2 transition-all duration-200 text-left",
                isSelected
                  ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20 shadow-sm"
                  : "border-border bg-card hover:border-purple-200 dark:hover:border-purple-700"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Checkbox
                  checked={isSelected}
                  className={cn(
                    "h-4 w-4",
                    isSelected && "border-purple-500 data-[state=checked]:bg-purple-500"
                  )}
                />
                <span className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  isSelected ? "text-purple-700 dark:text-purple-300" : "text-foreground"
                )}>
                  <span>{option.emoji}</span>
                  {t(language, option.labelKey)}
                </span>
              </div>
              <div className="flex items-center justify-between w-full mt-1 pl-6">
                <span className="text-[10px] text-muted-foreground">
                  {t(language, option.descKey)}
                </span>
                <span className={cn(
                  "text-[10px] font-medium ml-1 whitespace-nowrap",
                  isSelected ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground/70"
                )}>
                  +{option.time}m
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Trash Bag Estimate Slider - Critical for Move-Out */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-medium text-foreground">
            {t(language, 'bedroom.trash_title')}
          </span>
        </div>
        
        <div className="px-1">
          <Slider
            value={[hazards.trashBags]}
            onValueChange={(value) => onHazardsChange({ ...hazards, trashBags: value[0] })}
            min={0}
            max={15}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">0</span>
            <span className={cn(
              "text-xs font-medium",
              hazards.trashBags > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            )}>
              {t(language, 'bedroom.bags_estimated').replace('{count}', hazards.trashBags.toString())}
            </span>
            <span className="text-[10px] text-muted-foreground">15+</span>
          </div>
          
          {/* Warning for high trash estimate */}
          {hazards.trashBags >= 8 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 italic">
              {t(language, 'bedroom.bags_warning')}
            </p>
          )}
        </div>
      </div>

      {/* Sticky Spills Toggle - Floor Type Reactive */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {t(language, 'bedroom.sticky_spills')}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {/* Dynamic description based on floor type */}
              {floorType === 'carpet' 
                ? t(language, 'bedroom.sticky_carpet_desc')
                : t(language, 'bedroom.sticky_hard_desc')
              }
            </span>
            {hazards.stickySpills && (
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">
                +{stickySpillTime} min ({floorType === 'carpet' ? 'extraction' : 'enzymatic'})
              </span>
            )}
          </div>
        </div>
        <Switch
          checked={hazards.stickySpills}
          onCheckedChange={(checked) => onHazardsChange({ ...hazards, stickySpills: checked })}
        />
      </div>
    </div>
  );
}
