/**
 * AreaConditionSelector — Per-Area Condition Fee Selector
 * 
 * UI component for area-specific condition fees.
 * Only visible for Deep Clean + Move-In/Out flows.
 * 
 * Uses SSOT from useBookingSummary for live pricing.
 */

import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from '@/hooks/useBookingSummary';
import { 
  getAvailableConditionRoomIds, 
  groupRoomsByCategory, 
  isRoomSelected 
} from '@/lib/areaConditionNormalization';
import { getConditionLevelLimits } from '@/lib/areaConditionFees';
import type { AreaConditionLevel, ConditionAreaCategory } from '@/lib/areaConditionFees';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Home, Bath, Bed, Sofa, Info } from 'lucide-react';

// Category icons
const CATEGORY_ICONS: Record<ConditionAreaCategory, React.ElementType> = {
  kitchen: Home,
  bathroom: Bath,
  bedroom: Bed,
  living: Sofa,
};

const CATEGORY_LABELS: Record<ConditionAreaCategory, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathrooms',
  bedroom: 'Bedrooms',
  living: 'Living Areas',
};

const LEVEL_OPTIONS: Array<{ value: AreaConditionLevel; label: string; description: string }> = [
  { 
    value: 'normal', 
    label: 'Normal Condition',
    description: 'Well-maintained, regular cleaning'
  },
  { 
    value: 'above_average', 
    label: 'Above Average',
    description: 'Moderate dust, mild buildup'
  },
  { 
    value: 'heavy_severe', 
    label: 'Heavy / Severe',
    description: 'Deep recovery needed'
  },
];

export function AreaConditionSelector() {
  const { 
    formData, 
    setAreaConditionEnabled,
    setGlobalConditionLevel,
    toggleAreaConditionSelection,
  } = useBooking();
  
  // SSOT: Get pricing from summary hook
  const summary = useBookingSummary();
  
  // Get available rooms for selection
  const availableRooms = getAvailableConditionRoomIds(formData);
  const groupedRooms = groupRoomsByCategory(availableRooms);
  
  // Current state from formData
  const isEnabled = formData.areaConditionEnabled;
  const globalLevel = formData.globalConditionLevel;
  const selections = formData.areaConditionSelections || [];
  
  // Get breakdown and totals from SSOT
  const breakdown = summary.totals.conditionFeeBreakdown || [];
  const conditionFee = summary.totals.conditionFee;
  const capApplied = summary.totals.conditionFeeCapApplied;
  const floorApplied = summary.totals.conditionFeeFloorApplied;
  
  // Get limits for current level
  const limits = getConditionLevelLimits(globalLevel);
  
  // Show area selection when enabled and level is not normal
  const showAreaSelection = isEnabled && globalLevel !== 'normal';
  
  // Empty state: enabled but no selections
  const showEmptyState = showAreaSelection && selections.length === 0;
  
  return (
    <Card className={cn(
      "border transition-all duration-200",
      isEnabled 
        ? "border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/20" 
        : "border-muted"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-md",
              isEnabled ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"
            )}>
              <AlertTriangle className={cn(
                "w-4 h-4",
                isEnabled ? "text-amber-600" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <span className="font-medium text-sm">Property Condition</span>
              {!isEnabled && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize if any areas need extra attention
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setAreaConditionEnabled}
          />
        </div>
      </CardHeader>
      
      {isEnabled && (
        <CardContent className="pt-0 space-y-4">
          {/* Global Level Radio */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Condition Level
            </Label>
            <RadioGroup 
              value={globalLevel} 
              onValueChange={(v) => setGlobalConditionLevel(v as AreaConditionLevel)}
              className="space-y-2"
            >
              {LEVEL_OPTIONS.map(option => (
                <div 
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all",
                    globalLevel === option.value 
                      ? option.value === 'normal'
                        ? "border-green-300 bg-green-50/50 dark:bg-green-950/20"
                        : option.value === 'above_average'
                          ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                          : "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                  onClick={() => setGlobalConditionLevel(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label 
                      htmlFor={option.value} 
                      className="font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          {/* Area Selection (only if level !== normal) */}
          {showAreaSelection && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Which areas are affected?
              </Label>
              
              {/* Category Groups */}
              <div className="space-y-3">
                {(Object.keys(groupedRooms) as ConditionAreaCategory[]).map(category => {
                  const rooms = groupedRooms[category];
                  if (rooms.length === 0) return null;
                  
                  const Icon = CATEGORY_ICONS[category];
                  const categoryLabel = CATEGORY_LABELS[category];
                  
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{categoryLabel}</span>
                      </div>
                      <div className="grid gap-1.5 pl-5">
                        {rooms.map(room => {
                          const isSelected = isRoomSelected(selections, room.roomId);
                          const breakdownItem = breakdown.find(b => b.roomId === room.roomId);
                          
                          return (
                            <div 
                              key={room.roomId}
                              className={cn(
                                "flex items-center justify-between rounded-md border p-2 cursor-pointer transition-all",
                                isSelected 
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-transparent hover:border-muted"
                              )}
                              onClick={() => toggleAreaConditionSelection(room.roomId, room.category)}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => toggleAreaConditionSelection(room.roomId, room.category)}
                                />
                                <span className="text-sm">{room.displayName}</span>
                              </div>
                              {breakdownItem && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  +${breakdownItem.fee}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Empty State Message */}
              {showEmptyState && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-dashed">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Select at least one area to apply condition adjustment
                  </p>
                </div>
              )}
              
              {/* Live Total + Breakdown (from SSOT) */}
              {breakdown.length > 0 && (
                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Condition Fee</span>
                    <span className="text-sm font-semibold">${conditionFee}</span>
                  </div>
                  
                  {/* Breakdown bullets */}
                  <div className="pl-2 space-y-1">
                    {breakdown.map(item => (
                      <div 
                        key={item.roomId} 
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>• {item.displayName}</span>
                        <span>+${item.fee}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Cap/Floor messages */}
                  {capApplied && limits && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Cap applied (${limits.cap} max)
                    </p>
                  )}
                  {floorApplied && limits && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Minimum applied (${limits.floor})
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
