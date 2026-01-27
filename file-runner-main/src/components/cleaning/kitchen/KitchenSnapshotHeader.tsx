import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { RoomFloorType } from '../FloorTypeSelector';
import { ResidentialCeilingHeight } from '@/lib/ceilingHeightTypes';
import { ChefHat, Lock, Layers } from 'lucide-react';

interface KitchenSnapshotHeaderProps {
  language: Language;
  floorType: RoomFloorType;
  onFloorTypeChange?: (type: RoomFloorType) => void;
  ceilingHeight: ResidentialCeilingHeight | null;
  onCeilingHeightChange?: (height: ResidentialCeilingHeight) => void;
  floorLocation: number | null;
  maxFloors: number;
  onFloorLocationChange?: (floor: number) => void;
  // Summary stats (computed externally)
  includedItemsCount: number;
  addonsSelectedCount: number;
  extraTimeMinutes: number;
}

const FLOOR_OPTIONS: { value: RoomFloorType; labelKey: string }[] = [
  { value: 'hardwood_tile', labelKey: 'kitchen.floor.hard' },
  { value: 'carpet', labelKey: 'kitchen.floor.carpet' },
  { value: 'mixed', labelKey: 'kitchen.floor.mixed' },
];

// Use correct ResidentialCeilingHeight values: 'LOW' | 'MEDIUM' | 'HIGH'
const CEILING_OPTIONS: { value: ResidentialCeilingHeight; labelKey: string }[] = [
  { value: 'LOW', labelKey: 'kitchen.ceiling.low' },
  { value: 'MEDIUM', labelKey: 'kitchen.ceiling.medium' },
  { value: 'HIGH', labelKey: 'kitchen.ceiling.high' },
];

export function KitchenSnapshotHeader({
  language,
  floorType,
  onFloorTypeChange,
  ceilingHeight,
  onCeilingHeightChange,
  floorLocation,
  maxFloors,
  onFloorLocationChange,
  includedItemsCount,
  addonsSelectedCount,
  extraTimeMinutes,
}: KitchenSnapshotHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍳</span>
          <h3 className="text-base font-bold text-foreground">
            {t(language, 'kitchen.snapshot.title')}
          </h3>
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        
        {/* Floor Location Selector (multi-floor properties) */}
        {maxFloors >= 1 && onFloorLocationChange && (
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              {Array.from({ length: maxFloors }, (_, i) => i + 1).map(floor => (
                <button
                  key={floor}
                  type="button"
                  onClick={() => onFloorLocationChange(floor)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-medium rounded-full transition-all",
                    floorLocation === floor
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  F{floor}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Subtitle */}
      <p className="text-xs text-muted-foreground">
        {t(language, 'kitchen.snapshot.subtitle')}
      </p>
      
      {/* Quick Controls Row */}
      <div className="flex flex-wrap gap-4">
        {/* Floor Type Pills */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {t(language, 'kitchen.floor.label')}
          </span>
          <div className="flex gap-1">
            {FLOOR_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => onFloorTypeChange?.(option.value)}
                disabled={!onFloorTypeChange}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                  floorType === option.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                  !onFloorTypeChange && "opacity-60 cursor-default"
                )}
              >
                {t(language, option.labelKey)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Ceiling Height Pills */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {t(language, 'kitchen.ceiling.label')}
          </span>
          <div className="flex gap-1">
            {CEILING_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => onCeilingHeightChange?.(option.value)}
                disabled={!onCeilingHeightChange}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                  ceilingHeight === option.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                  !onCeilingHeightChange && "opacity-60 cursor-default"
                )}
              >
                {t(language, option.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Mini Summary Row */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-[11px] text-muted-foreground">
          {t(language, 'kitchen.summary.included_items').replace('{count}', includedItemsCount.toString())}
        </span>
        <span className="text-muted-foreground">•</span>
        <span className={cn(
          "text-[11px]",
          addonsSelectedCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
        )}>
          {t(language, 'kitchen.summary.addons_selected').replace('{count}', addonsSelectedCount.toString())}
        </span>
        {extraTimeMinutes > 0 && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {t(language, 'kitchen.summary.extra_time').replace('{minutes}', extraTimeMinutes.toString())}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
