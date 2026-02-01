import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { CoreSpaceDefinition } from '@/lib/coreSpaceConfig';
import { RoomAddonSelection, RoomFloorType, StairsConfig, HallwaysConfig } from '@/contexts/BookingContext';
import { RoomWindowSelection } from '@/lib/roomWindowConfig';
import { 
  Lock, 
  Check,
  Info,
  ChevronDown,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FloorTypeSelector } from './FloorTypeSelector';
import { SurfaceNotesInput } from './SurfaceNotesInput';
import { AddonGridSection } from './AddonGridSection';
import { RoomWindowSectionCompact } from './RoomWindowSectionCompact';
import { BaseboardToggle } from './BaseboardToggle';
import { FloorLocationSelector } from './FloorLocationSelector';
import { KitchenLogisticsSection } from './KitchenLogisticsSection';
import { InteractiveInclusionsGrid } from './InteractiveInclusionsGrid';
import { CeilingHeightSelector } from './CeilingHeightSelector';
import { ResidentialCeilingHeight, getCeilingBadgeLabel, CEILING_BADGE_CLASS } from '@/lib/ceilingHeightTypes';
import { StairsConfigSection } from './StairsConfigSection';
import { StairsHazardSection } from './StairsHazardSection';
import { HallwaysHazardSection } from './HallwaysHazardSection';
import { AreaHazardSection } from './AreaHazardSection';

interface CoreSpaceCardCompactProps {
  space: CoreSpaceDefinition;
  language: Language;
  isDeep: boolean;
  isMoveOut: boolean;
  // Room-specific addon props (NEW - replaces global selectedAddons)
  roomId: string;
  roomAddons: RoomAddonSelection[];
  onRoomAddonToggle: (roomId: string, addonId: string) => void;
  onRoomAddonQuantityChange?: (roomId: string, addonId: string, quantity: number) => void;
  propertyFloors?: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // Floor type props (MOVING mode)
  floorType?: RoomFloorType;
  onFloorTypeChange?: (type: RoomFloorType) => void;
  showFloorSelector?: boolean;
  // Surface Notes props (replaces Floor Focus)
  surfaceNotes?: string;
  onSurfaceNotesChange?: (notes: string) => void;
  showSurfaceNotes?: boolean;
  // Window section props
  showWindowSection?: boolean;
  roomWindowSelection?: RoomWindowSelection;
  onRoomWindowUpdate?: (updates: Partial<RoomWindowSelection>) => void;
  tracksIncludedByDefault?: boolean; // For Deep/Move flows
  includedWindowsEnabled?: boolean; // For Deep/Move flows - show first N windows as included
  includedWindowsLimit?: number; // How many windows are included free
  // Baseboard toggle props (Deep/Move flows)
  showBaseboardToggle?: boolean;
  hasBaseboards?: boolean;
  onBaseboardChange?: (enabled: boolean) => void;
  // Floor location props (multi-floor properties)
  floorLocation?: number | null;
  onFloorLocationChange?: (floor: number) => void;
  maxFloors?: number;
  showFloorRequired?: boolean; // Show required state for floor selection
  // Kitchen logistics props (MOVING and Deep Clean flows)
  showKitchenLogistics?: boolean;
  situation?: 'LIVE_HERE' | 'MOVING' | null;
  serviceType?: string;
  pullOutAppliances?: boolean;
  onPullOutAppliancesChange?: (enabled: boolean) => void;
  pullOutAppliancesPrice?: number;
  // Standard inclusions list (visible inside card)
  showInclusionsList?: boolean;
  // User exclusions (DO NOT TOUCH mapping)
  exclusions?: string[];
  onExclusionToggle?: (inclusionKey: string) => void;
  // Stair configuration props (multi-floor properties)
  showStairsConfig?: boolean;
  stairsConfig?: StairsConfig;
  onStairsConfigChange?: (updates: Partial<StairsConfig>) => void;
  // Hallway configuration props (traffic & detail logistics)
  hallwaysConfig?: HallwaysConfig;
  onHallwaysConfigChange?: (updates: Partial<HallwaysConfig>) => void;
  // Area-specific hazards & waste props (Deep/Move flows only)
  showAreaHazards?: boolean;
  roomMessTypes?: string[];
  onRoomMessTypesChange?: (types: string[]) => void;
  roomTrashBags?: number;
  onRoomTrashBagsChange?: (count: number) => void;
  roomStickySpills?: boolean;
  onRoomStickySpillsChange?: (value: boolean) => void;
  // Ceiling height props (Detailed Home Mapping logistics)
  ceilingHeight?: ResidentialCeilingHeight | null;
  onCeilingHeightChange?: (height: ResidentialCeilingHeight) => void;
  showCeilingSelector?: boolean;
}

export function CoreSpaceCardCompact({
  space,
  language,
  isDeep,
  isMoveOut,
  roomId,
  roomAddons,
  onRoomAddonToggle,
  onRoomAddonQuantityChange,
  propertyFloors = 1,
  isExpanded,
  onToggleExpand,
  floorType,
  onFloorTypeChange,
  showFloorSelector = false,
  surfaceNotes = '',
  onSurfaceNotesChange,
  showSurfaceNotes = false,
  showWindowSection = false,
  roomWindowSelection,
  onRoomWindowUpdate,
  tracksIncludedByDefault = false,
  includedWindowsEnabled = false,
  includedWindowsLimit = 0,
  showBaseboardToggle = false,
  hasBaseboards = true,
  onBaseboardChange,
  floorLocation = null,
  onFloorLocationChange,
  maxFloors = 1,
  showFloorRequired = false,
  // Kitchen logistics
  showKitchenLogistics = false,
  situation,
  serviceType = '',
  pullOutAppliances = false,
  onPullOutAppliancesChange,
  pullOutAppliancesPrice = 30,
  // Standard inclusions list
  showInclusionsList = false,
  // User exclusions (Cognitive Mapping)
  exclusions = [],
  onExclusionToggle,
  // Stair configuration
  showStairsConfig = false,
  stairsConfig,
  onStairsConfigChange,
  // Hallway configuration
  hallwaysConfig,
  onHallwaysConfigChange,
  // Area-specific hazards & waste
  showAreaHazards = false,
  roomMessTypes = [],
  onRoomMessTypesChange,
  roomTrashBags = 0,
  onRoomTrashBagsChange,
  roomStickySpills = false,
  onRoomStickySpillsChange,
  // Ceiling height
  ceilingHeight = null,
  onCeilingHeightChange,
  showCeilingSelector = false,
}: CoreSpaceCardCompactProps) {
  // Filter addons based on property floors (for hallways stair add-ons)
  const visibleAddons = space.contextAddons.filter(addon => {
    if (addon.requiresMultiFloor) {
      return propertyFloors >= 2;
    }
    return true;
  });

  // Check which addons from this space are selected (now room-specific)
  const selectedCount = visibleAddons.filter(addon => 
    roomAddons.some(a => a.addonId === addon.addonId)
  ).length;
  
  const hasSelectedAddons = selectedCount > 0;
  const hasAddons = visibleAddons.length > 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        id={`area-${roomId}`}
        className={cn(
          "rounded-2xl border transition-all duration-200 overflow-hidden",
          isExpanded
            ? "border-primary/30 bg-gradient-to-br from-primary/[0.02] to-primary/[0.06] shadow-md"
            : hasSelectedAddons
              ? "border-primary/40 bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] shadow-sm"
              : "border-border/60 bg-card hover:bg-muted/30"
        )}
      >
        {/* Header - Clickable Accordion Toggle */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors min-w-0"
          >
            {/* Left section: Icon + Title + Badges */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg flex-shrink-0">{space.emoji}</span>
              
              {/* Title and badges - stacked on mobile, row on sm+ */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                {/* Title row */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {t(language, space.labelKey)}
                  </span>
                  <Lock className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                </div>
                
                {/* Badges row - CRITICAL: min-w-0 allows internal scroll in FloorLocationSelector */}
                <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                  {/* Inline Floor Location Pills */}
                  {maxFloors >= 1 && onFloorLocationChange && (
                    <FloorLocationSelector
                      language={language}
                      value={floorLocation}
                      onChange={onFloorLocationChange}
                      maxFloors={maxFloors}
                      inline
                      showRequired={showFloorRequired}
                    />
                  )}
                  
                  {/* Ceiling Height Badge */}
                  {ceilingHeight && (
                    <span className={cn(CEILING_BADGE_CLASS, "whitespace-nowrap")}>
                      {getCeilingBadgeLabel(ceilingHeight, language)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Inclusions Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <span
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Info className="w-3 h-3" />
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <h4 className="font-semibold text-xs mb-2 text-foreground">
                    {t(language, 'core.standard_inclusions')}
                  </h4>
                  <ul className="space-y-1">
                    {space.inclusions.map(inc => (
                      <li key={inc.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span>{t(language, inc.labelKey)}</span>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Right section: Status + Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Micro-badge for selected count */}
              {hasSelectedAddons && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  +{selectedCount}
                </span>
              )}
              
              {/* Status indicator when closed */}
              {!isExpanded && (
                <span className={cn(
                  "text-[10px] font-medium hidden sm:inline whitespace-nowrap",
                  hasSelectedAddons 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-primary/70"
                )}>
                  {hasSelectedAddons 
                    ? "✓ Configured"
                    : t(language, 'core.tap_to_upgrade')}
                </span>
              )}
              
              {/* Chevron indicator - always show for expandable cards */}
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                isExpanded && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        {/* Add-ons Section - Collapsible */}
        {(hasAddons || showFloorSelector || showWindowSection || showSurfaceNotes || showBaseboardToggle || maxFloors >= 2 || showInclusionsList) && (
          <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
            <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
              {/* ═══ BLOCK 1: IDENTITY (Surface & Context) ═══ */}
              
              {/* Floor Type Selector - MOVING mode only */}
              {showFloorSelector && floorType && onFloorTypeChange && (
                <FloorTypeSelector
                  value={floorType}
                  onChange={onFloorTypeChange}
                  language={language}
                  compact
                />
              )}
              
              {/* Ceiling Height Selector - Detailed Home Mapping logistics */}
              {showCeilingSelector && onCeilingHeightChange && (
                <CeilingHeightSelector
                  language={language}
                  value={ceilingHeight}
                  onChange={onCeilingHeightChange}
                />
              )}
              
              {/* Surface Notes Input (replaces Floor Focus) */}
              {showSurfaceNotes && onSurfaceNotesChange && (
                <SurfaceNotesInput
                  roomId={space.id}
                  value={surfaceNotes}
                  onChange={onSurfaceNotesChange}
                  language={language}
                  compact
                />
              )}
              
              {/* ═══ BLOCK 2: VALUE (Interactive Inclusions + Baseboards) ═══ */}
              
              {/* Interactive Standard Inclusions Grid - Cognitive Mapping */}
              {showInclusionsList && onExclusionToggle && (
                <InteractiveInclusionsGrid
                  roomId={space.id}
                  inclusions={space.inclusions}
                  language={language}
                  situation={situation || null}
                  serviceType={serviceType}
                  exclusions={exclusions}
                  onExclusionToggle={onExclusionToggle}
                />
              )}
              
              {/* Baseboard Toggle - Deep/Move flows */}
              {showBaseboardToggle && onBaseboardChange && (
                <BaseboardToggle
                  roomId={space.id}
                  isIncludedByDefault={true}
                  hasBaseboards={hasBaseboards}
                  onToggle={onBaseboardChange}
                  language={language}
                  compact
                />
              )}
              
              {/* ═══ BLOCK 3: CRITICAL LOGISTICS (Appliances & Windows) ═══ */}
              
              {/* Kitchen Logistics Section - MOVING and Deep Clean flows */}
              {showKitchenLogistics && space.id === 'kitchen' && onPullOutAppliancesChange && (
                <KitchenLogisticsSection
                  language={language}
                  situation={situation || null}
                  serviceType={serviceType}
                  pullOutAppliances={pullOutAppliances}
                  onPullOutAppliancesChange={onPullOutAppliancesChange}
                  pullOutAppliancesPrice={pullOutAppliancesPrice}
                />
              )}
              
              {/* Stairs Configuration - Multi-floor properties (inside Stairs card) */}
              {showStairsConfig && stairsConfig && onStairsConfigChange && (
                <StairsConfigSection
                  language={language}
                  stairsConfig={stairsConfig}
                  onStairsConfigChange={onStairsConfigChange}
                />
              )}
              
              {/* Window Section - Integrated per-room window management */}
              {showWindowSection && onRoomWindowUpdate && (
                <RoomWindowSectionCompact
                  roomId={space.id}
                  roomType={space.id === 'living' ? 'living_dining' : space.id}
                  roomLabel={t(language, space.labelKey)}
                  language={language}
                  roomWindowSelection={roomWindowSelection}
                  onUpdate={onRoomWindowUpdate}
                  showSillsTracks={isMoveOut}
                  tracksIncludedByDefault={tracksIncludedByDefault}
                  includedWindowsEnabled={includedWindowsEnabled}
                  includedWindowsLimit={includedWindowsLimit}
                />
              )}
              
              {/* Area-Specific Hazards & Waste - Deep/Move flows only (NOT for stairs or hallways) */}
              {showAreaHazards && space.id !== 'stairs' && space.id !== 'hallways' && onRoomMessTypesChange && onRoomTrashBagsChange && onRoomStickySpillsChange && (
                <AreaHazardSection
                  roomId={space.id}
                  roomLabel={t(language, space.labelKey)}
                  language={language}
                  messTypes={roomMessTypes}
                  onMessTypesChange={onRoomMessTypesChange}
                  trashBags={roomTrashBags}
                  onTrashBagsChange={onRoomTrashBagsChange}
                  hasStickySpills={roomStickySpills}
                  onStickySpillsChange={onRoomStickySpillsChange}
                />
              )}
              
              {/* Stair-Specific Hazards - Only for stairs card (Deep/Move flows) */}
              {showAreaHazards && space.id === 'stairs' && stairsConfig && onStairsConfigChange && (
                <StairsHazardSection
                  language={language}
                  stairsConfig={stairsConfig}
                  onStairsConfigChange={onStairsConfigChange}
                />
              )}
              
              {/* Hallway-Specific Hazards - Only for hallways card (Deep/Move flows) */}
              {showAreaHazards && space.id === 'hallways' && hallwaysConfig && onHallwaysConfigChange && (
                <HallwaysHazardSection
                  language={language}
                  hallwaysConfig={hallwaysConfig}
                  onHallwaysConfigChange={onHallwaysConfigChange}
                />
              )}
              
              {/* ═══ BLOCK 4: COMPLEXITY (Add-ons & Premium Upgrades) ═══ */}
              
              {/* Bento Grid Add-ons */}
              {hasAddons && (
                <AddonGridSection
                  roomId={roomId}
                  addons={visibleAddons}
                  roomAddons={roomAddons}
                  onAddonToggle={onRoomAddonToggle}
                  onAddonQuantityChange={onRoomAddonQuantityChange}
                  language={language}
                  isMoveOut={isMoveOut}
                />
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}