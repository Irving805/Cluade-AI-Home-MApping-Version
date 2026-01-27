import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Home, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { RoomFloorType } from '@/contexts/BookingContext';
import { FloorTypeSelector } from './FloorTypeSelector';
import { FloorLocationSelector } from './FloorLocationSelector';
import { AreaHazardSection } from './AreaHazardSection';
import { Counter } from './Counter';
import { useState, useMemo } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { calculateGuestHousePrice } from '@/lib/pricing_v2';

// Guest House configuration types
export type GuestHouseLayout = 'studio' | '1br_1ba';
export type GuestHouseKitchen = 'none' | 'kitchenette' | 'full';
export type StructureAttachment = 'attached' | 'detached';

export interface GuestHouseConfig {
  id: string;
  layout: GuestHouseLayout;
  kitchenType: GuestHouseKitchen;
  floorType: RoomFloorType;
  attachment: StructureAttachment;
  floorLocation: number;
  windowCount: number;
  messTypes: string[];
  trashBags: number;
  stickySpills: boolean;
}

export const defaultGuestHouseConfig = (index: number): GuestHouseConfig => ({
  id: `guest_house_${index}`,
  layout: '1br_1ba',
  kitchenType: 'kitchenette',
  floorType: 'hardwood_tile',
  attachment: 'detached',
  floorLocation: 1,
  windowCount: 2,
  messTypes: [],
  trashBags: 0,
  stickySpills: false,
});

interface GuestHouseCardProps {
  index: number;
  isDeep: boolean;
  language: Language;
  config: GuestHouseConfig;
  onConfigChange: (config: Partial<GuestHouseConfig>) => void;
  showFloorSelector?: boolean;
  maxFloors?: number;
  showWindowSection?: boolean;
  showAreaHazards?: boolean;
}

export function GuestHouseCard({
  index,
  isDeep,
  language,
  config,
  onConfigChange,
  showFloorSelector = true,
  maxFloors = 1,
  showWindowSection = true,
  showAreaHazards = false,
}: GuestHouseCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const label = `${t(language, 'structure.guest_house')} ${index + 1}`;
  
  // Calculate dynamic price based on configuration
  const dynamicPrice = useMemo(() => 
    calculateGuestHousePrice(config, isDeep), 
    [config, isDeep]
  );
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-xl border-2 transition-all duration-200",
        "border-amber-300/70 bg-gradient-to-br from-amber-50/80 to-amber-100/30 dark:from-amber-900/20 dark:to-amber-800/10 dark:border-amber-700/50"
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <span className="text-xl">🏡</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                  {label}
                  {config.attachment === 'detached' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200/70 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300">
                      +10min
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {config.layout === 'studio' ? 'Studio' : '1BR/1BA'} • {
                    config.kitchenType === 'full' ? 'Full Kitchen' : 
                    config.kitchenType === 'kitchenette' ? 'Kitchenette' : 'No Kitchen'
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                ${dynamicPrice}
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-amber-200/50 dark:border-amber-700/50 space-y-4">
            {/* Layout Selection */}
            <div className="space-y-2 pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t(language, 'structure.guest_house_layout')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'studio' as const, label: 'Studio', desc: 'Open layout' },
                  { value: '1br_1ba' as const, label: '1BR/1BA', desc: 'Separate bedroom' },
                ].map((option) => {
                  const isSelected = config.layout === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onConfigChange({ layout: option.value })}
                      className={cn(
                        "py-2 px-3 rounded-lg border-2 text-left transition-all duration-200",
                        isSelected
                          ? "border-amber-500 bg-amber-100/50 dark:bg-amber-900/30"
                          : "border-border bg-background hover:border-amber-300"
                      )}
                    >
                      <div className="text-xs font-medium text-foreground">{option.label}</div>
                      <div className="text-[10px] text-muted-foreground">{option.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Kitchen Type */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t(language, 'structure.kitchen_type')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'none' as const, label: 'None' },
                  { value: 'kitchenette' as const, label: 'Kitchenette' },
                  { value: 'full' as const, label: 'Full Kitchen' },
                ].map((option) => {
                  const isSelected = config.kitchenType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onConfigChange({ kitchenType: option.value })}
                      className={cn(
                        "py-2 px-2 rounded-lg border-2 text-center transition-all duration-200",
                        isSelected
                          ? "border-amber-500 bg-amber-100/50 dark:bg-amber-900/30"
                          : "border-border bg-background hover:border-amber-300"
                      )}
                    >
                      <div className="text-xs font-medium text-foreground">{option.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Floor Type */}
            {showFloorSelector && (
              <FloorTypeSelector
                value={config.floorType}
                onChange={(type) => onConfigChange({ floorType: type })}
                language={language}
                compact
              />
            )}
            
            {/* Attachment Type */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t(language, 'structure.attachment_type')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'attached' as const, label: 'Attached', desc: 'Connected to main house' },
                  { value: 'detached' as const, label: 'Detached', desc: '+10 min transit time' },
                ].map((option) => {
                  const isSelected = config.attachment === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onConfigChange({ attachment: option.value })}
                      className={cn(
                        "py-2 px-3 rounded-lg border-2 text-left transition-all duration-200",
                        isSelected
                          ? "border-amber-500 bg-amber-100/50 dark:bg-amber-900/30"
                          : "border-border bg-background hover:border-amber-300"
                      )}
                    >
                      <div className="text-xs font-medium text-foreground">{option.label}</div>
                      <div className="text-[10px] text-muted-foreground">{option.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Floor Location (if multi-level) */}
            {maxFloors >= 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t(language, 'structure.floor_location')}
                </p>
                <FloorLocationSelector
                  language={language}
                  value={config.floorLocation}
                  onChange={(floor) => onConfigChange({ floorLocation: floor })}
                  maxFloors={maxFloors}
                />
              </div>
            )}
            
            {/* Window Count */}
            {showWindowSection && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🪟</span>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {t(language, 'structure.window_count')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Interior cleaning</p>
                  </div>
                </div>
                <Counter
                  label="Windows"
                  value={config.windowCount}
                  min={0}
                  max={10}
                  onChange={(v) => onConfigChange({ windowCount: v })}
                  compact
                />
              </div>
            )}
            
            {/* Area Hazards (Deep/Move flows) */}
            {showAreaHazards && (
              <AreaHazardSection
                roomId={config.id}
                roomLabel={label}
                language={language}
                messTypes={config.messTypes}
                onMessTypesChange={(types) => onConfigChange({ messTypes: types })}
                trashBags={config.trashBags}
                onTrashBagsChange={(count) => onConfigChange({ trashBags: count })}
                hasStickySpills={config.stickySpills}
                onStickySpillsChange={(value) => onConfigChange({ stickySpills: value })}
              />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
