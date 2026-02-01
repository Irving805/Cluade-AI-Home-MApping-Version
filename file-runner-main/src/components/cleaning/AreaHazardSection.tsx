import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Trash2, Droplets } from 'lucide-react';

// Mess type definitions per room
const MESS_TYPE_CONFIG: Record<string, { id: string; labelKey: string; descKey: string }[]> = {
  kitchen: [
    { id: 'food_spills', labelKey: 'mess.food_spills', descKey: 'mess.food_spills_desc' },
    { id: 'grease', labelKey: 'mess.grease', descKey: 'mess.grease_desc' },
  ],
  living: [
    { id: 'drink_stains', labelKey: 'mess.drink_stains', descKey: 'mess.drink_stains_desc' },
    { id: 'confetti', labelKey: 'mess.confetti', descKey: 'mess.confetti_desc' },
  ],
  dining: [
    { id: 'drink_stains', labelKey: 'mess.drink_stains', descKey: 'mess.drink_stains_desc' },
    { id: 'food_spills', labelKey: 'mess.food_spills', descKey: 'mess.food_spills_desc' },
  ],
  hallways: [
    { id: 'candle_wax', labelKey: 'mess.candle_wax', descKey: 'mess.candle_wax_desc' },
    { id: 'dust_buildup', labelKey: 'mess.dust_buildup', descKey: 'mess.dust_buildup_desc' },
  ],
  // Note: Stairs have their own dedicated StairsHazardSection component
  // This generic config is kept as fallback but should not be used for stairs
};

// Default mess types for bedrooms
const BEDROOM_MESS_TYPES = [
  { id: 'dust_buildup', labelKey: 'mess.dust_buildup', descKey: 'mess.dust_buildup_desc' },
  { id: 'pet_hair', labelKey: 'mess.pet_hair', descKey: 'mess.pet_hair_desc' },
];

interface AreaHazardSectionProps {
  roomId: string;
  roomLabel: string;
  language: Language;
  messTypes: string[];
  onMessTypesChange: (types: string[]) => void;
  trashBags: number;
  onTrashBagsChange: (count: number) => void;
  hasStickySpills: boolean;
  onStickySpillsChange: (value: boolean) => void;
}

export function AreaHazardSection({
  roomId,
  roomLabel,
  language,
  messTypes,
  onMessTypesChange,
  trashBags,
  onTrashBagsChange,
  hasStickySpills,
  onStickySpillsChange,
}: AreaHazardSectionProps) {
  // Get mess type options for this room
  const isBedroom = roomId.startsWith('bed_');
  const messTypeOptions = isBedroom 
    ? BEDROOM_MESS_TYPES 
    : MESS_TYPE_CONFIG[roomId] || BEDROOM_MESS_TYPES;

  const toggleMessType = (typeId: string) => {
    if (messTypes.includes(typeId)) {
      onMessTypesChange(messTypes.filter(t => t !== typeId));
    } else {
      onMessTypesChange([...messTypes, typeId]);
    }
  };

  return (
    <div className="space-y-4 pt-3 border-t border-dashed border-amber-200 dark:border-amber-800/50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          {t(language, 'hazard.title')}
        </span>
      </div>

      {/* Mess Type Selector */}
      <div className="grid grid-cols-2 gap-2">
        {messTypeOptions.map(option => {
          const isSelected = messTypes.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleMessType(option.id)}
              className={cn(
                "flex flex-col items-start p-2.5 rounded-lg border-2 transition-all duration-200 text-left",
                isSelected
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-sm"
                  : "border-border bg-card hover:border-amber-200 dark:hover:border-amber-700"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Checkbox
                  checked={isSelected}
                  className={cn(
                    "h-4 w-4",
                    isSelected && "border-amber-500 data-[state=checked]:bg-amber-500"
                  )}
                />
                <span className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-amber-700 dark:text-amber-300" : "text-foreground"
                )}>
                  {t(language, option.labelKey)}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 pl-6">
                {t(language, option.descKey)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Trash Bag Estimate Slider */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {t(language, 'hazard.trash_title')}
          </span>
        </div>
        
        <div className="px-1">
          <Slider
            value={[trashBags]}
            onValueChange={(value) => onTrashBagsChange(value[0])}
            min={0}
            max={15}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">0</span>
            <span className="text-xs font-medium text-foreground">
              {t(language, 'hazard.bags_estimated').replace('{count}', trashBags.toString())}
            </span>
            <span className="text-[10px] text-muted-foreground">15+</span>
          </div>
          
          {/* Warning for high trash estimate */}
          {trashBags >= 8 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 italic">
              {t(language, 'hazard.bags_warning')}
            </p>
          )}
        </div>
      </div>

      {/* Sticky Spills Toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {t(language, 'hazard.sticky_spills')}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t(language, 'hazard.sticky_desc')}
            </span>
          </div>
        </div>
        <Switch
          checked={hasStickySpills}
          onCheckedChange={onStickySpillsChange}
        />
      </div>
    </div>
  );
}
