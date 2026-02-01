import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, AlertTriangle, Trash2, Droplets } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface KitchenHazardsSectionProps {
  language: Language;
  messTypes: string[];
  onMessTypesChange: (types: string[]) => void;
  trashBags: number;
  onTrashBagsChange: (count: number) => void;
  hasStickySpills: boolean;
  onStickySpillsChange: (value: boolean) => void;
}

// Kitchen-specific hazard types
const KITCHEN_HAZARDS = [
  { id: 'food_spills', labelKey: 'mess.food_spills', descKey: 'mess.food_spills_desc' },
  { id: 'grease', labelKey: 'mess.grease', descKey: 'mess.grease_desc' },
];

export function KitchenHazardsSection({
  language,
  messTypes,
  onMessTypesChange,
  trashBags,
  onTrashBagsChange,
  hasStickySpills,
  onStickySpillsChange,
}: KitchenHazardsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate if any hazards are selected (for badge)
  const hasActiveHazards = messTypes.length > 0 || trashBags > 0 || hasStickySpills;
  
  const toggleMessType = (typeId: string) => {
    if (messTypes.includes(typeId)) {
      onMessTypesChange(messTypes.filter(t => t !== typeId));
    } else {
      onMessTypesChange([...messTypes, typeId]);
    }
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors border border-amber-200/50 dark:border-amber-800/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">
              {t(language, 'kitchen.hazards.title')}
            </span>
            {hasActiveHazards && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-white rounded-full">
                {messTypes.length + (trashBags > 5 ? 1 : 0) + (hasStickySpills ? 1 : 0)}
              </span>
            )}
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-amber-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-3 space-y-4 border-x border-b border-amber-200/50 dark:border-amber-800/30 rounded-b-xl bg-card">
          {/* Hazard Type Selector */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t(language, 'kitchen.hazards.what_to_expect')}
            </span>
            
            <div className="grid grid-cols-2 gap-2">
              {KITCHEN_HAZARDS.map(hazard => {
                const isSelected = messTypes.includes(hazard.id);
                return (
                  <button
                    key={hazard.id}
                    type="button"
                    onClick={() => toggleMessType(hazard.id)}
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
                        {t(language, hazard.labelKey)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 pl-6">
                      {t(language, hazard.descKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Trash Bag Estimate Slider */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                {t(language, 'kitchen.hazards.trash_title')}
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
                  {t(language, 'kitchen.hazards.sticky_spills')}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t(language, 'kitchen.hazards.sticky_desc')}
                </span>
              </div>
            </div>
            <Switch
              checked={hasStickySpills}
              onCheckedChange={onStickySpillsChange}
            />
          </div>
          
          {/* Impact Note */}
          <p className="text-[10px] text-muted-foreground italic text-center pt-2 border-t border-border/50">
            {t(language, 'kitchen.hazards.impact_note')}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
