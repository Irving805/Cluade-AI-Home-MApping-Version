import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { RoomAddonSelection, Situation } from '@/contexts/BookingContext';
import { RoomFloorType } from '../FloorTypeSelector';
import { ResidentialCeilingHeight } from '@/lib/ceilingHeightTypes';
import { RoomWindowSelection } from '@/lib/roomWindowConfig';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Lock, Info, Flame, Sparkles } from 'lucide-react';

import { KitchenSnapshotHeader } from './KitchenSnapshotHeader';
import { KitchenIncludedChecklist } from './KitchenIncludedChecklist';
import { KitchenAddonsGrid } from './KitchenAddonsGrid';
import { KitchenHazardsSection } from './KitchenHazardsSection';
import { KitchenToggleSection } from './KitchenToggleSection';
import { WindowBreakdownSummary } from './WindowBreakdownSummary';
import { RoomWindowSectionCompact } from '../RoomWindowSectionCompact';
import { FloorLocationSelector } from '../FloorLocationSelector';

import { CabinetSizeOverride } from '@/lib/pricing_kitchen';

interface KitchenMappingCardProps {
  language: Language;
  situation: Situation;
  serviceType: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // Floor & Ceiling
  floorType: RoomFloorType;
  onFloorTypeChange?: (type: RoomFloorType) => void;
  ceilingHeight: ResidentialCeilingHeight | null;
  onCeilingHeightChange?: (height: ResidentialCeilingHeight) => void;
  // Floor Location (multi-floor)
  floorLocation: number | null;
  maxFloors: number;
  onFloorLocationChange?: (floor: number) => void;
  // Add-ons
  roomAddons: RoomAddonSelection[];
  onRoomAddonToggle: (addonId: string) => void;
  // Access & Safety
  pullOutAppliances: boolean;
  onPullOutAppliancesChange?: (enabled: boolean) => void;
  pullOutAppliancesPrice: number;
  // Windows
  showWindowSection?: boolean;
  roomWindowSelection?: RoomWindowSelection;
  onRoomWindowUpdate?: (updates: Partial<RoomWindowSelection>) => void;
  // Hazards (Deep/Move flows only)
  showAreaHazards?: boolean;
  roomMessTypes?: string[];
  onRoomMessTypesChange?: (types: string[]) => void;
  roomTrashBags?: number;
  onRoomTrashBagsChange?: (count: number) => void;
  roomStickySpills?: boolean;
  onRoomStickySpillsChange?: (value: boolean) => void;
  // Dynamic cabinet pricing (multi-factor SSOT)
  bedrooms?: number;
  propertyType?: string;
  sqftRange?: string;
  cabinetOverride?: CabinetSizeOverride;
  onCabinetOverrideChange?: (override: CabinetSizeOverride) => void;
  // Degrease mode (SSOT for greasy kitchens)
  degreaseLevel?: 'light' | 'medium' | 'heavy';
  onDegreaseLevelChange?: (level: 'light' | 'medium' | 'heavy') => void;
  // Section toggles (SSOT - opt-in sections)
  insideAppliancesEnabled?: boolean;
  onInsideAppliancesToggle?: (enabled: boolean) => void;
  windowInventoryEnabled?: boolean;
  onWindowInventoryToggle?: (enabled: boolean) => void;
}

export function KitchenMappingCard({
  language,
  situation,
  serviceType,
  isExpanded,
  onToggleExpand,
  // Floor & Ceiling
  floorType,
  onFloorTypeChange,
  ceilingHeight,
  onCeilingHeightChange,
  // Floor Location
  floorLocation,
  maxFloors,
  onFloorLocationChange,
  // Add-ons
  roomAddons,
  onRoomAddonToggle,
  // Access & Safety
  pullOutAppliances,
  onPullOutAppliancesChange,
  pullOutAppliancesPrice,
  // Windows
  showWindowSection = false,
  roomWindowSelection,
  onRoomWindowUpdate,
  // Hazards
  showAreaHazards = false,
  roomMessTypes = [],
  onRoomMessTypesChange,
  roomTrashBags = 0,
  onRoomTrashBagsChange,
  roomStickySpills = false,
  onRoomStickySpillsChange,
  // Dynamic cabinet pricing (multi-factor SSOT)
  bedrooms = 2,
  propertyType = 'single_family',
  sqftRange,
  cabinetOverride = 'typical',
  onCabinetOverrideChange,
  // Degrease mode
  degreaseLevel = 'light',
  onDegreaseLevelChange,
  // Section toggles (SSOT - default true for backward compat)
  insideAppliancesEnabled = true,
  onInsideAppliancesToggle,
  windowInventoryEnabled = true,
  onWindowInventoryToggle,
}: KitchenMappingCardProps) {
  // Badge counts (SSOT: 0 when toggle OFF)
  const applianceBadgeCount = insideAppliancesEnabled ? roomAddons.length : 0;
  const windowBadgeCount = windowInventoryEnabled 
    ? ((roomWindowSelection?.windowInventory?.length || 0) + (roomWindowSelection?.blindsCount || 0))
    : 0;
  
  // Calculate summary stats for header
  const stats = useMemo(() => {
    // Count included items (standard inclusions shown)
    const isDeepOrMoving = situation === 'MOVING' || serviceType === 'Deep Clean';
    const includedItemsCount = isDeepOrMoving ? 9 : 6; // More items in Deep/Moving
    
    // Count selected add-ons
    const addonsSelectedCount = roomAddons.length;
    
    // Estimate extra time from add-ons and hazards
    const addonMinutes = roomAddons.reduce((sum, addon) => {
      // Use addon-specific times or default
      const addonTimes: Record<string, number> = {
        oven: 25,
        fridge_empty: 20,
        cabinets: 30,
        hood: 15,
      };
      return sum + (addonTimes[addon.addonId] || 15);
    }, 0);
    
    const hazardMinutes = 
      (roomMessTypes.length > 0 ? roomMessTypes.length * 5 : 0) +
      (roomStickySpills ? 10 : 0) +
      (roomTrashBags > 5 ? 10 : 0);
    
    return {
      includedItemsCount,
      addonsSelectedCount,
      extraTimeMinutes: addonMinutes + hazardMinutes,
    };
  }, [situation, serviceType, roomAddons, roomMessTypes, roomStickySpills, roomTrashBags]);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        id="area-kitchen"
        className={cn(
          "rounded-2xl border transition-all duration-200 overflow-hidden",
          isExpanded
            ? "border-primary/30 bg-gradient-to-br from-primary/[0.02] to-primary/[0.06] shadow-md"
            : roomAddons.length > 0
              ? "border-primary/40 bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] shadow-sm"
              : "border-border/60 bg-card hover:bg-muted/30"
        )}
      >
        {/* Collapsed Header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg flex-shrink-0">🍳</span>
              
              {/* Title and floor pills - stacked on mobile, row on sm+ */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                {/* Title row */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {t(language, 'core.kitchen')}
                  </span>
                  <Lock className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                </div>
                
                {/* Inline Floor Location Pills (same pattern as CoreSpaceCardCompact) */}
                {maxFloors >= 1 && onFloorLocationChange && (
                  <div 
                    className="flex items-center gap-1 min-w-0 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FloorLocationSelector
                      language={language}
                      value={floorLocation}
                      onChange={onFloorLocationChange}
                      maxFloors={maxFloors}
                      inline
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {roomAddons.length > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  +{roomAddons.length}
                </span>
              )}
              {!isExpanded && (
                <span className="text-[10px] font-medium text-primary/70 hidden sm:inline">
                  {t(language, 'core.tap_to_upgrade')}
                </span>
              )}
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        {/* Expanded Content - 5 Blocks */}
        <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-5">
            {/* ═══ BLOCK 1: KITCHEN SNAPSHOT ═══ */}
            <KitchenSnapshotHeader
              language={language}
              floorType={floorType}
              onFloorTypeChange={onFloorTypeChange}
              ceilingHeight={ceilingHeight}
              onCeilingHeightChange={onCeilingHeightChange}
              floorLocation={floorLocation}
              maxFloors={maxFloors}
              onFloorLocationChange={onFloorLocationChange}
              includedItemsCount={stats.includedItemsCount}
              addonsSelectedCount={stats.addonsSelectedCount}
              extraTimeMinutes={stats.extraTimeMinutes}
            />
            
            {/* ═══ BLOCK 2: WHAT'S INCLUDED ═══ */}
            <KitchenIncludedChecklist
              language={language}
              situation={
                situation === 'HOURLY' || situation === 'SPECIFIC_AREAS' || situation === 'COMMERCIAL' || situation === 'RENOVATION'
                  ? null 
                  : situation
              }
              serviceType={serviceType}
            />
            
            {/* ═══ BLOCK 3: INSIDE APPLIANCES (Toggleable Section) ═══ */}
            <KitchenToggleSection
              language={language}
              titleKey="kitchen.section.inside_appliances"
              icon={<Flame className="w-4 h-4" />}
              isEnabled={insideAppliancesEnabled}
              onToggle={onInsideAppliancesToggle || (() => {})}
              badgeCount={applianceBadgeCount}
              colorScheme="amber"
              disabledHintKey="kitchen.section.inside_appliances_hint"
            >
              <KitchenAddonsGrid
                language={language}
                situation={situation}
                roomAddons={insideAppliancesEnabled ? roomAddons : []}
                onAddonToggle={(addonId) => onRoomAddonToggle(addonId)}
                pullOutAppliances={pullOutAppliances}
                onPullOutAppliancesChange={onPullOutAppliancesChange}
                pullOutAppliancesPrice={pullOutAppliancesPrice}
                bedrooms={bedrooms}
                propertyType={propertyType}
                sqftRange={sqftRange}
                cabinetOverride={cabinetOverride}
                onCabinetOverrideChange={onCabinetOverrideChange}
                degreaseLevel={degreaseLevel}
                onDegreaseLevelChange={onDegreaseLevelChange}
              />
            </KitchenToggleSection>
            
            {/* ═══ BLOCK 4: WINDOW INVENTORY (Toggleable Section) ═══ */}
            {showWindowSection && onRoomWindowUpdate && (
              <KitchenToggleSection
                language={language}
                titleKey="kitchen.section.window_inventory"
                icon={<Sparkles className="w-4 h-4" />}
                isEnabled={windowInventoryEnabled}
                onToggle={onWindowInventoryToggle || (() => {})}
                badgeCount={windowBadgeCount}
                colorScheme="blue"
                disabledHintKey="kitchen.section.window_inventory_hint"
              >
                <div className="space-y-3">
                  {/* Rule Banner - Kitchen-only pricing rule */}
                  <div className="p-3 rounded-lg bg-accent/50 border border-border/50">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t(language, 'kitchen.windows.rule')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Original Window Selector (same component as other rooms) */}
                  <RoomWindowSectionCompact
                    roomId="kitchen"
                    roomType="kitchen"
                    roomLabel={t(language, 'core.kitchen')}
                    language={language}
                    roomWindowSelection={windowInventoryEnabled ? roomWindowSelection : undefined}
                    onUpdate={onRoomWindowUpdate}
                    showSillsTracks={situation === 'MOVING'}
                    tracksIncludedByDefault={situation === 'MOVING' || serviceType === 'Deep Clean'}
                    includedWindowsEnabled={true}
                    includedWindowsLimit={1}
                  />
                  
                  {/* Breakdown Summary */}
                  <WindowBreakdownSummary
                    roomWindowSelection={windowInventoryEnabled ? roomWindowSelection : undefined}
                    language={language}
                  />
                </div>
              </KitchenToggleSection>
            )}
            
            {/* ═══ BLOCK 5: HAZARDS & WASTE (Collapsible) ═══ */}
            {showAreaHazards && onRoomMessTypesChange && onRoomTrashBagsChange && onRoomStickySpillsChange && (
              <KitchenHazardsSection
                language={language}
                messTypes={roomMessTypes}
                onMessTypesChange={onRoomMessTypesChange}
                trashBags={roomTrashBags}
                onTrashBagsChange={onRoomTrashBagsChange}
                hasStickySpills={roomStickySpills}
                onStickySpillsChange={onRoomStickySpillsChange}
              />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
