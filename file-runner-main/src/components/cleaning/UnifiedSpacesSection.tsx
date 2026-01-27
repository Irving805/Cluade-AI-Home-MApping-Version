import { useMemo, useState, useEffect } from 'react';
import { 
  CONDITIONAL_SPACES, 
  ADDON_SPACES,
  getAvailableConditionalSpaces 
} from '@/lib/pricing';
import { CORE_SPACE_CONFIG } from '@/lib/coreSpaceConfig';
import { BEDROOM_SKIP_RATES } from '@/lib/pricing_v2';
import { shouldShowHallwaysSection } from '@/lib/pricing_hallways';
import { RoomWindowSelection } from '@/lib/roomWindowConfig';
import { 
  HOME_MAPPING_REGISTRY, 
  getVisibleAreas, 
  AreaGatingContext,
  validateRegistry,
  getAreaDefinition
} from '@/lib/homeMappingRegistry';
import { normalizePropertyType, StudioMainSpaceConfig } from '@/lib/homeMappingTypes';
import { getCanonicalPropertyFloors } from '@/lib/propertyCategory';
import { getBathroomPricingTier } from '@/lib/pricingTier';
import type { 
  HomeMappingAreas, 
  OfficeAreaConfig, 
  LaundryAreaConfig, 
  GarageAreaConfig, 
  PatioAreaConfig,
  MudroomAreaConfig,
  DenAreaConfig
} from '@/lib/homeMappingTypes';
import { getSqftMidpoint } from '@/lib/hourlyLogic';
import { extractBedroomFloors, extractUniqueFloors } from '@/lib/homeMappingFloorHelpers';
import { extractUniqueCeilings } from '@/lib/homeMappingCeilingHelpers';
import { getFloorLabel } from '@/lib/floorLocationTypes';
import { getCeilingBadgeLabel, CEILING_BADGE_CLASS, ResidentialCeilingHeight } from '@/lib/ceilingHeightTypes';
import { CeilingHeights } from '@/contexts/BookingContext';
import { GenericAreaCard } from './GenericAreaCard';
import { CoreSpaceCardCompact } from './CoreSpaceCardCompact';
import { BedroomCard } from './BedroomCard';
import { BathroomMappingSection } from './BathroomMappingSection';
import type { BathroomInventory } from '@/lib/bathroomMappingTypes';
import { FloorTypeSelector, RoomFloorType } from './FloorTypeSelector';
import { FloorLocationSelector } from './FloorLocationSelector';
import { StudioMainSpaceCard } from './StudioMainSpaceCard';
import { KitchenMappingCard } from './kitchen';
import { FreezeToggleWrapper } from './FreezeToggleWrapper';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Addon, SpaceFloorComposition, RoomAddons, StairsConfig, HallwaysConfig, RoomMessTypes, RoomTrashBags, RoomStickySpills, BedroomHazards, Situation } from '@/contexts/BookingContext';
import { 
  Lock, 
  Check, 
  ChefHat, 
  Sofa, 
  Utensils, 
  DoorOpen,
  DoorClosed,
  Briefcase, 
  Shirt, 
  Layers, 
  Car, 
  Sun,
  Minus,
  Plus,
  Sparkles,
  DollarSign,
  Footprints,
  Armchair,
  Bed,
  Home,
  ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerFooter, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerClose 
} from '@/components/ui/drawer';

// Map space icons to Lucide components
const spaceIconMap: Record<string, React.ElementType> = {
  'chef-hat': ChefHat,
  'sofa': Sofa,
  'utensils': Utensils,
  'door-open': DoorOpen,
  'door-closed': DoorClosed,
  'briefcase': Briefcase,
  'shirt': Shirt,
  'layers': Layers,
  'car': Car,
  'sun': Sun,
  'footprints': Footprints,
  'armchair': Armchair,
};

// Import types from BedroomCard components
import { BedroomProfile } from './BedroomProfileSelector';
import { BedroomAddonCounts } from './BedroomAddonsCompact';
import { RoomSurfaceNotes, BedroomConfig, RoomBaseboardConfig } from '@/contexts/BookingContext';
import { BaseboardToggle } from './BaseboardToggle';
import { HallwaysSection } from './HallwaysSection';
import { StairsSection } from './StairsSection';
import { HallwayConfig, HomeEntryConfig } from '@/contexts/BookingContext';
import type { StairConfig } from '@/lib/stairs/stairsModel';
import { HomeEntrySection } from './HomeEntrySection';

/**
 * Helper: Check if Home Entry has ANY structured mapping configured
 * Used for "configured" indicator (SSOT: checks all structured signals, not free-text)
 * Note: entryPathType = 'NONE' counts as configured (explicit user choice = "no obstacles")
 * Using != null to cover both null and undefined from localStorage persistence
 */
const isHomeEntryConfigured = (homeEntry: HomeEntryConfig): boolean => {
  return (
    homeEntry.entryPathType != null ||
    homeEntry.entryZoneStyle != null ||
    homeEntry.entryZoneFloor != null ||
    homeEntry.hasEntryRugMat === true ||
    homeEntry.hasCoatCloset === true ||
    homeEntry.hasGlassAtEntry === true
  );
};

interface UnifiedSpacesSectionProps {
  sqftRange: string;
  beds: number;
  language: Language;
  isDeep: boolean;
  isMoveOut?: boolean;
  includedSpaces: string[];
  excludedSpaces: string[];
  skippedBedrooms: string[];
  officeCount: number;
  laundryRoomCount: number;
  loftCount: number;
  garageCount: number;
  patioCount: number;
  patioScope: 'sweep' | 'scrub';
  selectedAddons: Addon[];
  // Room-specific addon props (NEW - for per-room independence)
  roomAddons?: RoomAddons;
  onRoomAddonToggle?: (roomId: string, addonId: string) => void;
  onRoomAddonQuantityChange?: (roomId: string, addonId: string, quantity: number) => void;
  onToggleSpace: (spaceId: string) => void;
  onToggleBedroom: (bedroomId: string) => void;
  onAddonChange: (spaceId: string, count: number) => void;
  onPatioScopeChange: (scope: 'sweep' | 'scrub') => void;
  onContextAddonToggle: (addonId: string) => void;
  onContextAddonQuantityChange?: (addonId: string, quantity: number) => void;
  propertyFloors?: number; // Number of floors (1 = single story, 2+ = multi-story)
  // Floor type props (MOVING mode)
  spaceFloorTypes?: SpaceFloorComposition;
  onSpaceFloorTypeChange?: (spaceId: string, type: RoomFloorType) => void;
  onBedroomFloorTypeChange?: (bedroomId: string, type: RoomFloorType) => void;
  showFloorSelector?: boolean;
  // Window section props
  showWindowSection?: boolean;
  roomWindowSelections?: RoomWindowSelection[];
  onRoomWindowUpdate?: (roomId: string, updates: Partial<RoomWindowSelection>) => void;
  tracksIncludedByDefault?: boolean; // For Deep/Move flows - show tracks as included benefit
  includedWindowsEnabled?: boolean; // For Deep/Move flows - show first N windows as included
  // Surface Notes & Bedroom Profiles props (NEW)
  surfaceNotes?: RoomSurfaceNotes;
  onSurfaceNotesChange?: (roomId: string, notes: string) => void;
  bedroomConfigs?: Record<string, BedroomConfig>;
  onBedroomProfileChange?: (bedroomId: string, profile: BedroomProfile) => void;
  onBedroomAddonsChange?: (bedroomId: string, addons: BedroomAddonCounts) => void;
  showSurfaceNotes?: boolean;
  showBedroomProfiles?: boolean;
  showBedroomAddons?: boolean;
  // Baseboard selections props (NEW)
  baseboardSelections?: RoomBaseboardConfig;
  onBaseboardChange?: (roomId: string, enabled: boolean) => void;
  showBaseboardToggle?: boolean; // True for Deep/Move flows
  // Bathroom Mapping props (Premium Inventory System)
  masterBaths?: number;
  fullBaths?: number;
  halfBaths?: number;
  onBathroomChange?: (type: 'master' | 'full' | 'half', count: number) => void;
  showBathroomModules?: boolean;
  // Bathroom Inventory (for premium mapping)
  bathroomInventory?: BathroomInventory;
  onBathroomInventoryChange?: (inventory: BathroomInventory) => void;
  // Floor LOCATION props (multi-floor property room assignment)
  maxFloors?: number;
  roomFloorLocations?: {
    kitchen?: number;
    living?: number;
    dining?: number;
    hallways?: number;
    bedrooms?: Record<string, number>;
  };
  onRoomFloorLocationChange?: (roomId: string, floor: number) => void;
  // Kitchen logistics props (MOVING and Deep Clean flows)
  situation?: 'LIVE_HERE' | 'MOVING' | null;
  serviceType?: string;
  pullOutAppliances?: boolean;
  onPullOutAppliancesChange?: (enabled: boolean) => void;
  // Kitchen cabinet override (multi-factor SSOT pricing)
  kitchenCabinetOverride?: 'small' | 'typical' | 'large';
  onKitchenCabinetOverrideChange?: (override: 'small' | 'typical' | 'large') => void;
  // Kitchen degrease level (Heavy Degrease Mode)
  kitchenDegreaseLevel?: 'light' | 'medium' | 'heavy';
  onKitchenDegreaseLevelChange?: (level: 'light' | 'medium' | 'heavy') => void;
  // Stair configuration props (multi-floor properties)
  stairsConfig?: StairsConfig;
  onStairsConfigChange?: (updates: Partial<StairsConfig>) => void;
  // Hallway configuration props (traffic & detail logistics) - LEGACY
  hallwaysConfig?: HallwaysConfig;
  onHallwaysConfigChange?: (updates: Partial<HallwaysConfig>) => void;
  // Multi-entry hallways props (NEW)
  hallways?: HallwayConfig[];
  onHallwaysChange?: (hallways: HallwayConfig[]) => void;
  // Multi-entry stairs props (NEW - SSOT for multi-stair logistics)
  stairs?: StairConfig[];
  onStairsChange?: (stairs: StairConfig[]) => void;
  // SSOT: baseServiceLevel for Deep Clean detection in HallwayCard
  baseServiceLevel?: string;
  // User exclusions props (Cognitive Mapping)
  userExclusions?: {
    kitchen: string[];
    living: string[];
    dining: string[];
    hallways: string[];
    stairs: string[];
    bedrooms: Record<string, string[]>;
  };
  onExclusionToggle?: (roomId: string, inclusionKey: string) => void;
  // Area-specific hazards & waste props (Deep/Move flows) - for core rooms only
  roomMessTypes?: RoomMessTypes;
  roomTrashBags?: RoomTrashBags;
  roomStickySpills?: RoomStickySpills;
  onRoomMessTypesChange?: (roomId: string, types: string[]) => void;
  onRoomTrashBagsChange?: (roomId: string, count: number) => void;
  onRoomStickySpillsChange?: (roomId: string, value: boolean) => void;
  // Bedroom hazards props (Deep/Move flows) - NEW
  bedroomHazards?: Record<string, BedroomHazards>;
  onBedroomHazardsChange?: (bedroomId: string, hazards: BedroomHazards) => void;
  // Home Entry props (Arrival & Access Plan)
  homeEntry?: HomeEntryConfig;
  onHomeEntryChange?: (updates: Partial<HomeEntryConfig>) => void;
  // Ceiling height props (Residential Detailed Home Mapping)
  ceilingHeights?: CeilingHeights;
  onCeilingHeightChange?: (areaKey: string, height: ResidentialCeilingHeight) => void;
  onBedroomCeilingChange?: (bedroomId: string, height: ResidentialCeilingHeight) => void;
  onHallwayCeilingChange?: (hallwayId: string, height: ResidentialCeilingHeight) => void;
  // === HOME MAPPING UTILITY AREAS (Single Source of Truth) ===
  homeMapping?: {
    areas: HomeMappingAreas;
  };
  onHomeMappingAreaChange?: (
    areaKey: 'office' | 'laundry' | 'garage' | 'patio' | 'mudroom' | 'den' | 'studioMainSpace',
    updates: Partial<OfficeAreaConfig | LaundryAreaConfig | GarageAreaConfig | PatioAreaConfig | MudroomAreaConfig | DenAreaConfig | StudioMainSpaceConfig>
  ) => void;
  propertyType?: string; // For garage gating
  formData?: { squareFootageRange?: string; kitchenCabinetOverride?: 'small' | 'typical' | 'large' }; // For premium spaces gating + cabinet override
  // Move context for Move-In vs Move-Out distinction
  moveContext?: 'move_in' | 'move_out' | null;
  // Kitchen section toggles (SSOT)
  roomSectionToggles?: {
    kitchen?: { insideAppliances: boolean; windowInventory: boolean };
  };
  onRoomSectionToggle?: (roomId: string, sectionKey: string, enabled: boolean) => void;
  // === MOVE CONDITION FREEZE TOGGLES (Partial Empty) ===
  moveCondition?: 'vacant' | 'partial_empty';
  hallwaysEnabled?: boolean;
  stairsEnabled?: boolean;
  onHallwaysEnabledChange?: (enabled: boolean) => void;
  onStairsEnabledChange?: (enabled: boolean) => void;
}

export function UnifiedSpacesSection({
  sqftRange,
  beds,
  isDeep,
  isMoveOut = false,
  language,
  includedSpaces,
  excludedSpaces,
  skippedBedrooms,
  officeCount,
  laundryRoomCount,
  loftCount,
  garageCount,
  patioCount,
  patioScope,
  selectedAddons,
  roomAddons,
  onRoomAddonToggle,
  onRoomAddonQuantityChange,
  onToggleSpace,
  onToggleBedroom,
  onAddonChange,
  onPatioScopeChange,
  onContextAddonToggle,
  onContextAddonQuantityChange,
  propertyFloors = 1,
  spaceFloorTypes,
  onSpaceFloorTypeChange,
  onBedroomFloorTypeChange,
  showFloorSelector = false,
  showWindowSection = false,
  roomWindowSelections,
  onRoomWindowUpdate,
  tracksIncludedByDefault = false,
  includedWindowsEnabled = false,
  // New Surface Notes & Bedroom Profiles props
  surfaceNotes,
  onSurfaceNotesChange,
  bedroomConfigs,
  onBedroomProfileChange,
  onBedroomAddonsChange,
  showSurfaceNotes = true,
  showBedroomProfiles = true,
  showBedroomAddons = true,
  // Baseboard selections
  baseboardSelections,
  onBaseboardChange,
  showBaseboardToggle = false,
  // Bathroom Mapping (Premium Inventory System)
  masterBaths = 0,
  fullBaths = 0,
  halfBaths = 0,
  onBathroomChange,
  showBathroomModules = false,
  bathroomInventory,
  onBathroomInventoryChange,
  // Floor LOCATION props
  maxFloors = 1,
  roomFloorLocations,
  onRoomFloorLocationChange,
  // Kitchen logistics props
  situation,
  serviceType = '',
  pullOutAppliances = false,
  onPullOutAppliancesChange,
  // Kitchen cabinet override (multi-factor SSOT pricing)
  kitchenCabinetOverride = 'typical',
  onKitchenCabinetOverrideChange,
  // Kitchen degrease level (Heavy Degrease Mode)
  kitchenDegreaseLevel = 'light',
  onKitchenDegreaseLevelChange,
  // Stair configuration props
  stairsConfig,
  onStairsConfigChange,
  // Hallway configuration props - LEGACY
  hallwaysConfig,
  onHallwaysConfigChange,
  // Multi-entry hallways (NEW)
  hallways = [],
  onHallwaysChange,
  // Multi-entry stairs (NEW - SSOT)
  stairs = [],
  onStairsChange,
  // SSOT: baseServiceLevel for Deep Clean detection
  baseServiceLevel = '',
  // User exclusions (Cognitive Mapping)
  userExclusions,
  onExclusionToggle,
  // Area-specific hazards & waste (core rooms only)
  roomMessTypes,
  roomTrashBags,
  roomStickySpills,
  onRoomMessTypesChange,
  onRoomTrashBagsChange,
  onRoomStickySpillsChange,
  // Bedroom hazards (Deep/Move flows) - NEW
  bedroomHazards,
  onBedroomHazardsChange,
  // Home Entry (Arrival & Access Plan)
  homeEntry,
  onHomeEntryChange,
  // Ceiling heights (Residential Detailed Home Mapping)
  ceilingHeights,
  onCeilingHeightChange,
  onBedroomCeilingChange,
  onHallwayCeilingChange,
  // === HOME MAPPING UTILITY AREAS (Single Source of Truth) ===
  homeMapping,
  onHomeMappingAreaChange,
  propertyType,
  // Move context for Move-In vs Move-Out
  moveContext = null,
  // Kitchen section toggles (SSOT)
  roomSectionToggles,
  onRoomSectionToggle,
  // === MOVE CONDITION FREEZE TOGGLES (Partial Empty) ===
  moveCondition = 'vacant',
  hallwaysEnabled = true,
  stairsEnabled = true,
  onHallwaysEnabledChange,
  onStairsEnabledChange,
}: UnifiedSpacesSectionProps) {
  // ============= REGISTRY INTEGRATION =============
  // Build gating context for registry-based visibility decisions
  const gatingContext: AreaGatingContext = useMemo(() => ({
    situation: situation || null,
    serviceType: serviceType || '',
    sqftRange: sqftRange,  // THE source of truth for premium spaces gating
    homeSizeLabel: sqftRange,
    bedroomCount: beds,
    propertyFloors: propertyFloors || 1,
    propertyType: propertyType || null,
    normalizedPropertyType: normalizePropertyType(propertyType),
  }), [situation, serviceType, sqftRange, beds, propertyFloors, propertyType]);

  // SSOT: Canonical property floors for bathroom mapping
  // Uses getCanonicalPropertyFloors to ensure consistency across all components
  const canonicalFloors = useMemo(() => getCanonicalPropertyFloors({
    homeSize: beds,
    propertyType: propertyType || undefined,
    houseLevels: propertyFloors || 1,
    apartmentUnitLevels: propertyFloors || 1,
  }), [beds, propertyType, propertyFloors]);

  // Get visible areas from registry (sorted by order)
  const visibleAreas = useMemo(() => getVisibleAreas(gatingContext), [gatingContext]);

  // DEV-only validation and debug logging on mount
  useEffect(() => {
    validateRegistry();
    
    // Debug logging for utility areas visibility
    console.log('[UnifiedSpaces] Utility Areas Debug:', {
      situation,
      propertyType,
      normalizedPropertyType: normalizePropertyType(propertyType),
      homeMappingPresent: !!homeMapping?.areas,
      visibleAreaKeys: visibleAreas.map(a => a.key),
      garageVisible: visibleAreas.some(a => a.key === 'garage'),
    });
  }, [situation, propertyType, homeMapping, visibleAreas]);

  // Determine if hazards section should show (Deep/Move flows only)
  const showAreaHazards = (situation === 'MOVING') || 
                          (situation === 'LIVE_HERE' && serviceType === 'Deep Clean');
  
  // === FREEZE GATE for Partial Empty mode ===
  const isMovingScenario = situation === 'MOVING';
  const isPartialEmpty = isMovingScenario && moveCondition === 'partial_empty';
  
  // Helper: Check if kitchen/living/dining are excluded
  const isKitchenExcluded = excludedSpaces.includes('kitchen');
  const isLivingExcluded = excludedSpaces.includes('living');
  const isDiningExcluded = excludedSpaces.includes('dining');
  // Get available conditional spaces for this property size
  // Filter out 'dining' since it's now a core space with full detail block
  const availableConditional = useMemo(
    () => getAvailableConditionalSpaces(sqftRange, beds).filter(space => space.id !== 'dining'),
    [sqftRange, beds]
  );

  // Get addon counts map
  const addonCounts: Record<string, number> = {
    office: officeCount,
    laundry: laundryRoomCount,
    loft: loftCount,
    garage: garageCount,
    patio: patioCount,
  };

  // Calculate if conditional space is included (not in excludedSpaces)
  const isConditionalIncluded = (spaceId: string) => 
    !excludedSpaces.includes(spaceId);

  // Generate bedroom array based on home size (beds = bedroom count from homeSize)
  // beds=0 is Studio (no bedrooms), beds=1+ has bedrooms
  const bedroomCount = beds; // beds directly maps to bedroom count
  const bedrooms = useMemo(() => {
    if (bedroomCount <= 0) return []; // Studio has no bedrooms section
    return Array.from({ length: bedroomCount }, (_, i) => ({
      index: i,
      id: `bed_${i}`,
      isMaster: i === 0,
    }));
  }, [bedroomCount]);

  // Calculate bedroom skip credit amounts
  const getBedroomCredit = (isMaster: boolean) => {
    const rate = isMaster ? BEDROOM_SKIP_RATES.master : BEDROOM_SKIP_RATES.standard;
    return {
      amount: isDeep ? rate.deep : rate.std,
      minutes: isDeep ? rate.timeDeep : rate.timeStd,
    };
  };

  // Count included bedrooms for display
  const includedBedroomCount = bedroomCount - skippedBedrooms.length;

  // Get core spaces as array for grid layout
  const coreSpaces = Object.values(CORE_SPACE_CONFIG);

  // Accordion state - ALL collapsed by default for guided UX
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null);
  
  // Batch floor apply state for bedrooms
  const [batchFloorDrawerOpen, setBatchFloorDrawerOpen] = useState(false);
  const [selectedBatchFloor, setSelectedBatchFloor] = useState<number | null>(null);

  // Smooth scroll-into-view when opening a card
  const handleToggleSpace = (spaceId: string) => {
    const newExpanded = expandedSpace === spaceId ? null : spaceId;
    setExpandedSpace(newExpanded);
    
    // Smooth scroll into view when opening
    if (newExpanded) {
      setTimeout(() => {
        document.getElementById(`area-${spaceId}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 150);
    }
  };

  // Helper to check if area is visible via registry
  const isAreaVisible = (key: string) => visibleAreas.some(a => a.key === key);
  
  // ============= BEDROOM BATCH APPLY LOGIC =============
  // Compute mapping stats for bedrooms
  const bedroomMappingStats = useMemo(() => {
    const total = bedrooms.length;
    const mapped = bedrooms.filter(b => 
      roomFloorLocations?.bedrooms?.[b.id] != null
    ).length;
    return { total, mapped, unmapped: total - mapped };
  }, [bedrooms, roomFloorLocations?.bedrooms]);
  
  // Batch apply floor to all bedrooms
  const applyFloorToAllBedrooms = (floor: number) => {
    if (!onRoomFloorLocationChange) return;
    bedrooms.forEach(b => {
      onRoomFloorLocationChange(b.id, floor);
    });
    setBatchFloorDrawerOpen(false);
    setSelectedBatchFloor(null);
  };
  
  // Batch apply floor to unassigned bedrooms only
  const applyFloorToUnassigned = (floor: number) => {
    if (!onRoomFloorLocationChange) return;
    bedrooms.forEach(b => {
      if (roomFloorLocations?.bedrooms?.[b.id] == null) {
        onRoomFloorLocationChange(b.id, floor);
      }
    });
    setBatchFloorDrawerOpen(false);
    setSelectedBatchFloor(null);
  };

  // ============= FLOOR BADGES FOR MULTI-ENTRY SECTIONS =============
  // Derive unique floors from bedroom floor locations (display only - no new state)
  const bedroomFloors = useMemo(() => 
    extractBedroomFloors(roomFloorLocations?.bedrooms),
    [roomFloorLocations?.bedrooms]
  );
  const bedroomsHaveFloors = bedroomFloors.length > 0;

  // Derive unique floors from hallway entries (display only - no new state)
  const hallwayFloors = useMemo(() => 
    extractUniqueFloors(hallways || []),
    [hallways]
  );
  const hallwaysHaveFloors = hallwayFloors.length > 0;

  // ============= CEILING HEIGHT BADGES FOR MULTI-ENTRY SECTIONS =============
  // Derive unique ceiling heights from bedroom selections (display only)
  const bedroomCeilings = useMemo(() => 
    extractUniqueCeilings(ceilingHeights?.bedrooms),
    [ceilingHeights?.bedrooms]
  );
  const bedroomsHaveCeilings = bedroomCeilings.length > 0;

  // Derive unique ceiling heights from hallway selections (display only)
  const hallwayCeilings = useMemo(() => 
    extractUniqueCeilings(ceilingHeights?.hallways),
    [ceilingHeights?.hallways]
  );
  const hallwaysHaveCeilings = hallwayCeilings.length > 0;

  return (
    <div className="space-y-6">
      {/* === PREMIUM SECTION HEADER: DETAILED HOME MAPPING === */}
      <div className="space-y-3 pb-4">
        {/* Premium Title Row */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm ring-1 ring-primary/10">
            <Home className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {t(language, 'spaces.core_title')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(language, 'spaces.core_subtitle')}
            </p>
          </div>
        </div>
        
        {/* Helper Text - Contextual by Situation */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {situation === 'MOVING' 
            ? t(language, 'mapping.helper_moving')
            : t(language, 'mapping.helper_living')}
        </p>
        
        {/* Intelligence Message */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {t(language, 'mapping.intelligence_hint')}
          </span>
        </div>
        
        {/* Micro-Guide */}
        <p className="text-xs text-primary/70 font-medium">
          {t(language, 'mapping.tap_guide')}
        </p>
      </div>

      {/* === VERTICAL ACCORDION: UNIFIED BLOCKS === */}
      <div className="flex flex-col gap-3">
        {/* Block 0: Home Entry (visibility via registry - FIRST in order) */}
        {isAreaVisible('home_entry') && homeEntry && onHomeEntryChange && (
          <Collapsible 
            open={expandedSpace === 'home_entry'} 
            onOpenChange={() => handleToggleSpace('home_entry')}
          >
            <div 
              id="area-home_entry"
              className={cn(
                "rounded-2xl border transition-all duration-200 overflow-hidden",
                expandedSpace === 'home_entry'
                  ? "border-primary/30 bg-gradient-to-br from-primary/[0.02] to-primary/[0.06] shadow-md"
                              : isHomeEntryConfigured(homeEntry)
                                  ? "border-emerald-400/40 bg-card shadow-sm"
                                  : "border-border/60 bg-card hover:bg-muted/30"
              )}
            >
              {/* Home Entry Header - Clickable (header lives here, not in component) */}
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🚪</span>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold text-foreground">
                        {t(language, 'homeEntry.title')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t(language, 'homeEntry.subtitle')}
                      </span>
                    </div>
                            {/* Configured indicator (green check) - show when any structured field is set */}
                            {isHomeEntryConfigured(homeEntry) && (
                              <Check className="w-3 h-3 text-emerald-500" />
                            )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Optional: show configured text when collapsed and has instructions */}
                    {expandedSpace !== 'home_entry' && isHomeEntryConfigured(homeEntry) && (
                      <span className="text-[10px] text-emerald-600 font-medium hidden sm:inline">
                        {t(language, 'homeEntry.configured')}
                      </span>
                    )}
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      expandedSpace === 'home_entry' && "rotate-180"
                    )} />
                  </div>
                </button>
              </CollapsibleTrigger>
              
              {/* Home Entry Content - Collapsible */}
              <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
                <HomeEntrySection
                  language={language}
                  situation={situation || null}
                  homeEntry={homeEntry}
                  onChange={onHomeEntryChange}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
        
        {/* Block 1: Kitchen - Premium Logistics Redesign */}
        {/* Wrapped in FreezeToggleWrapper when Partial Empty mode is active */}
        {isPartialEmpty ? (
          <FreezeToggleWrapper
            label={t(language, 'move.include_kitchen')}
            enabled={!isKitchenExcluded}
            onToggle={(enabled) => {
              // Correct boolean-to-excludedSpaces mapping (no double toggle)
              if (enabled && isKitchenExcluded) onToggleSpace('kitchen');
              if (!enabled && !isKitchenExcluded) onToggleSpace('kitchen');
            }}
          >
            <KitchenMappingCard
              language={language}
              situation={situation || null}
              serviceType={serviceType}
              isExpanded={expandedSpace === 'kitchen'}
              bedrooms={beds}
              propertyType={propertyType}
              sqftRange={sqftRange}
              cabinetOverride={kitchenCabinetOverride}
              onCabinetOverrideChange={onKitchenCabinetOverrideChange}
              degreaseLevel={kitchenDegreaseLevel}
              onDegreaseLevelChange={onKitchenDegreaseLevelChange}
              onToggleExpand={() => handleToggleSpace('kitchen')}
              floorType={spaceFloorTypes?.kitchen || 'hardwood_tile'}
              onFloorTypeChange={onSpaceFloorTypeChange ? (type) => onSpaceFloorTypeChange('kitchen', type) : undefined}
              ceilingHeight={ceilingHeights?.kitchen || null}
              onCeilingHeightChange={onCeilingHeightChange ? (height) => onCeilingHeightChange('kitchen', height) : undefined}
              floorLocation={roomFloorLocations?.kitchen || 1}
              onFloorLocationChange={onRoomFloorLocationChange ? (floor) => onRoomFloorLocationChange('kitchen', floor) : undefined}
              maxFloors={maxFloors}
              roomAddons={roomAddons?.kitchen || []}
              onRoomAddonToggle={onRoomAddonToggle ? (addonId) => onRoomAddonToggle('kitchen', addonId) : (addonId) => onContextAddonToggle(addonId)}
              pullOutAppliances={pullOutAppliances}
              onPullOutAppliancesChange={onPullOutAppliancesChange}
              pullOutAppliancesPrice={situation === 'MOVING' ? 0 : 30}
              showWindowSection={showWindowSection}
              roomWindowSelection={roomWindowSelections?.find(r => r.roomId === 'kitchen')}
              onRoomWindowUpdate={onRoomWindowUpdate ? (updates) => onRoomWindowUpdate('kitchen', updates) : undefined}
              showAreaHazards={showAreaHazards}
              roomMessTypes={roomMessTypes?.kitchen || []}
              onRoomMessTypesChange={onRoomMessTypesChange ? (types) => onRoomMessTypesChange('kitchen', types) : undefined}
              roomTrashBags={roomTrashBags?.kitchen || 0}
              onRoomTrashBagsChange={onRoomTrashBagsChange ? (count) => onRoomTrashBagsChange('kitchen', count) : undefined}
              roomStickySpills={roomStickySpills?.kitchen || false}
              onRoomStickySpillsChange={onRoomStickySpillsChange ? (value) => onRoomStickySpillsChange('kitchen', value) : undefined}
              insideAppliancesEnabled={roomSectionToggles?.kitchen?.insideAppliances ?? true}
              onInsideAppliancesToggle={onRoomSectionToggle ? (enabled) => onRoomSectionToggle('kitchen', 'insideAppliances', enabled) : undefined}
              windowInventoryEnabled={roomSectionToggles?.kitchen?.windowInventory ?? true}
              onWindowInventoryToggle={onRoomSectionToggle ? (enabled) => onRoomSectionToggle('kitchen', 'windowInventory', enabled) : undefined}
            />
          </FreezeToggleWrapper>
        ) : (
          <KitchenMappingCard
            language={language}
            situation={situation || null}
            serviceType={serviceType}
            isExpanded={expandedSpace === 'kitchen'}
            bedrooms={beds}
            propertyType={propertyType}
            sqftRange={sqftRange}
            cabinetOverride={kitchenCabinetOverride}
            onCabinetOverrideChange={onKitchenCabinetOverrideChange}
            degreaseLevel={kitchenDegreaseLevel}
            onDegreaseLevelChange={onKitchenDegreaseLevelChange}
            onToggleExpand={() => handleToggleSpace('kitchen')}
            floorType={spaceFloorTypes?.kitchen || 'hardwood_tile'}
            onFloorTypeChange={onSpaceFloorTypeChange ? (type) => onSpaceFloorTypeChange('kitchen', type) : undefined}
            ceilingHeight={ceilingHeights?.kitchen || null}
            onCeilingHeightChange={onCeilingHeightChange ? (height) => onCeilingHeightChange('kitchen', height) : undefined}
            floorLocation={roomFloorLocations?.kitchen || 1}
            onFloorLocationChange={onRoomFloorLocationChange ? (floor) => onRoomFloorLocationChange('kitchen', floor) : undefined}
            maxFloors={maxFloors}
            roomAddons={roomAddons?.kitchen || []}
            onRoomAddonToggle={onRoomAddonToggle ? (addonId) => onRoomAddonToggle('kitchen', addonId) : (addonId) => onContextAddonToggle(addonId)}
            pullOutAppliances={pullOutAppliances}
            onPullOutAppliancesChange={onPullOutAppliancesChange}
            pullOutAppliancesPrice={situation === 'MOVING' ? 0 : 30}
            showWindowSection={showWindowSection}
            roomWindowSelection={roomWindowSelections?.find(r => r.roomId === 'kitchen')}
            onRoomWindowUpdate={onRoomWindowUpdate ? (updates) => onRoomWindowUpdate('kitchen', updates) : undefined}
            showAreaHazards={showAreaHazards}
            roomMessTypes={roomMessTypes?.kitchen || []}
            onRoomMessTypesChange={onRoomMessTypesChange ? (types) => onRoomMessTypesChange('kitchen', types) : undefined}
            roomTrashBags={roomTrashBags?.kitchen || 0}
            onRoomTrashBagsChange={onRoomTrashBagsChange ? (count) => onRoomTrashBagsChange('kitchen', count) : undefined}
            roomStickySpills={roomStickySpills?.kitchen || false}
            onRoomStickySpillsChange={onRoomStickySpillsChange ? (value) => onRoomStickySpillsChange('kitchen', value) : undefined}
            insideAppliancesEnabled={roomSectionToggles?.kitchen?.insideAppliances ?? true}
            onInsideAppliancesToggle={onRoomSectionToggle ? (enabled) => onRoomSectionToggle('kitchen', 'insideAppliances', enabled) : undefined}
            windowInventoryEnabled={roomSectionToggles?.kitchen?.windowInventory ?? true}
            onWindowInventoryToggle={onRoomSectionToggle ? (enabled) => onRoomSectionToggle('kitchen', 'windowInventory', enabled) : undefined}
          />
        )}
        
        {/* Block 2a: Studio Main Space (ONLY for studios - replaces Living/Dining/Bedrooms) */}
        {isAreaVisible('studio_main_space') && (
          <StudioMainSpaceCard
            language={language}
            isDeep={isDeep}
            situation={situation as Situation}
            serviceType={serviceType}
            moveContext={moveContext}
            config={homeMapping?.areas?.studioMainSpace}
            onChange={(updates) => {
              onHomeMappingAreaChange?.('studioMainSpace', {
                ...updates,
                isCustomized: true,
              });
            }}
            isExpanded={expandedSpace === 'studio_main_space'}
            onToggleExpand={() => handleToggleSpace('studio_main_space')}
            // Windows (SSOT)
            roomWindowSelection={roomWindowSelections?.find(r => r.roomId === 'studio_main')}
            onRoomWindowUpdate={onRoomWindowUpdate 
              ? (updates) => onRoomWindowUpdate('studio_main', updates) 
              : undefined}
            // Hazards (GLOBAL SSOT keys)
            roomMessTypes={roomMessTypes?.studio_main || []}
            onRoomMessTypesChange={onRoomMessTypesChange 
              ? (types) => onRoomMessTypesChange('studio_main', types) 
              : undefined}
            roomTrashBags={roomTrashBags?.studio_main || 0}
            onRoomTrashBagsChange={onRoomTrashBagsChange 
              ? (count) => onRoomTrashBagsChange('studio_main', count) 
              : undefined}
            roomStickySpills={roomStickySpills?.studio_main || false}
            onRoomStickySpillsChange={onRoomStickySpillsChange 
              ? (value) => onRoomStickySpillsChange('studio_main', value) 
              : undefined}
            showAreaHazards={showAreaHazards}
          />
        )}
        
        {/* Block 2: Living Room (visibility gated - hidden for studios) */}
        {/* Wrapped in FreezeToggleWrapper when Partial Empty mode is active */}
        {isAreaVisible('living') && (
          isPartialEmpty ? (
            <FreezeToggleWrapper
              label={t(language, 'move.include_living')}
              enabled={!isLivingExcluded}
              onToggle={(enabled) => {
                // Correct boolean-to-excludedSpaces mapping (no double toggle)
                if (enabled && isLivingExcluded) onToggleSpace('living');
                if (!enabled && !isLivingExcluded) onToggleSpace('living');
              }}
            >
              <CoreSpaceCardCompact
                space={coreSpaces.find(s => s.id === 'living')!}
                language={language}
                isDeep={isDeep}
                isMoveOut={isMoveOut}
                roomId="living"
                roomAddons={roomAddons?.living || []}
                onRoomAddonToggle={onRoomAddonToggle || ((roomId, addonId) => onContextAddonToggle(addonId))}
                onRoomAddonQuantityChange={onRoomAddonQuantityChange}
                propertyFloors={propertyFloors}
                isExpanded={expandedSpace === 'living'}
                onToggleExpand={() => handleToggleSpace('living')}
                floorType={spaceFloorTypes?.living}
                onFloorTypeChange={onSpaceFloorTypeChange ? (type) => onSpaceFloorTypeChange('living', type) : undefined}
                showFloorSelector={showFloorSelector}
                showWindowSection={showWindowSection}
                roomWindowSelection={roomWindowSelections?.find(r => r.roomId === 'living_dining')}
                onRoomWindowUpdate={onRoomWindowUpdate ? (updates) => onRoomWindowUpdate('living_dining', updates) : undefined}
                tracksIncludedByDefault={tracksIncludedByDefault}
                includedWindowsEnabled={includedWindowsEnabled}
                includedWindowsLimit={1}
                surfaceNotes={surfaceNotes?.living || ''}
                onSurfaceNotesChange={onSurfaceNotesChange ? (notes) => onSurfaceNotesChange('living', notes) : undefined}
                showSurfaceNotes={showSurfaceNotes}
                showBaseboardToggle={showBaseboardToggle}
                hasBaseboards={baseboardSelections?.living ?? true}
                onBaseboardChange={onBaseboardChange ? (enabled) => onBaseboardChange('living', enabled) : undefined}
                floorLocation={roomFloorLocations?.living || 1}
                onFloorLocationChange={onRoomFloorLocationChange ? (floor) => onRoomFloorLocationChange('living', floor) : undefined}
                maxFloors={maxFloors}
                showInclusionsList={true}
                situation={situation}
                serviceType={serviceType}
                exclusions={userExclusions?.living || []}
                onExclusionToggle={onExclusionToggle ? (key) => onExclusionToggle('living', key) : undefined}
                showAreaHazards={showAreaHazards}
                roomMessTypes={roomMessTypes?.living || []}
                onRoomMessTypesChange={onRoomMessTypesChange ? (types) => onRoomMessTypesChange('living', types) : undefined}
                roomTrashBags={roomTrashBags?.living || 0}
                onRoomTrashBagsChange={onRoomTrashBagsChange ? (count) => onRoomTrashBagsChange('living', count) : undefined}
                roomStickySpills={roomStickySpills?.living || false}
                onRoomStickySpillsChange={onRoomStickySpillsChange ? (value) => onRoomStickySpillsChange('living', value) : undefined}
                ceilingHeight={ceilingHeights?.living || null}
                onCeilingHeightChange={onCeilingHeightChange ? (height) => onCeilingHeightChange('living', height) : undefined}
                showCeilingSelector={true}
              />
            </FreezeToggleWrapper>
          ) : (
            <CoreSpaceCardCompact
              space={coreSpaces.find(s => s.id === 'living')!}
              language={language}
              isDeep={isDeep}
              isMoveOut={isMoveOut}
              roomId="living"
              roomAddons={roomAddons?.living || []}
              onRoomAddonToggle={onRoomAddonToggle || ((roomId, addonId) => onContextAddonToggle(addonId))}
              onRoomAddonQuantityChange={onRoomAddonQuantityChange}
              propertyFloors={propertyFloors}
              isExpanded={expandedSpace === 'living'}
              onToggleExpand={() => handleToggleSpace('living')}
              floorType={spaceFloorTypes?.living}
              onFloorTypeChange={onSpaceFloorTypeChange ? (type) => onSpaceFloorTypeChange('living', type) : undefined}
              showFloorSelector={showFloorSelector}
              showWindowSection={showWindowSection}
              roomWindowSelection={roomWindowSelections?.find(r => r.roomId === 'living_dining')}
              onRoomWindowUpdate={onRoomWindowUpdate ? (updates) => onRoomWindowUpdate('living_dining', updates) : undefined}
              tracksIncludedByDefault={tracksIncludedByDefault}
              includedWindowsEnabled={includedWindowsEnabled}
              includedWindowsLimit={1}
              surfaceNotes={surfaceNotes?.living || ''}
              onSurfaceNotesChange={onSurfaceNotesChange ? (notes) => onSurfaceNotesChange('living', notes) : undefined}
              showSurfaceNotes={showSurfaceNotes}
              showBaseboardToggle={showBaseboardToggle}
              hasBaseboards={baseboardSelections?.living ?? true}
              onBaseboardChange={onBaseboardChange ? (enabled) => onBaseboardChange('living', enabled) : undefined}
              floorLocation={roomFloorLocations?.living || 1}
              onFloorLocationChange={onRoomFloorLocationChange ? (floor) => onRoomFloorLocationChange('living', floor) : undefined}
              maxFloors={maxFloors}
              showInclusionsList={true}
              situation={situation}
              serviceType={serviceType}
              exclusions={userExclusions?.living || []}
              onExclusionToggle={onExclusionToggle ? (key) => onExclusionToggle('living', key) : undefined}
              showAreaHazards={showAreaHazards}
              roomMessTypes={roomMessTypes?.living || []}
              onRoomMessTypesChange={onRoomMessTypesChange ? (types) => onRoomMessTypesChange('living', types) : undefined}
              roomTrashBags={roomTrashBags?.living || 0}
              onRoomTrashBagsChange={onRoomTrashBagsChange ? (count) => onRoomTrashBagsChange('living', count) : undefined}
              roomStickySpills={roomStickySpills?.living || false}
              onRoomStickySpillsChange={onRoomStickySpillsChange ? (value) => onRoomStickySpillsChange('living', value) : undefined}
              ceilingHeight={ceilingHeights?.living || null}
              onCeilingHeightChange={onCeilingHeightChange ? (height) => onCeilingHeightChange('living', height) : undefined}
              showCeilingSelector={situation === 'LIVE_HERE' || situation === 'MOVING'}
            />
          )
        )}

        {/* Block 3: Dining Room (visibility via registry) */}
        {isAreaVisible('dining') && coreSpaces.find(s => s.id === 'dining') && (
          isPartialEmpty ? (
            <FreezeToggleWrapper
              label={t(language, 'move.include_dining')}
              enabled={!isDiningExcluded}
              onToggle={(enabled) => {
                if (enabled && isDiningExcluded) onToggleSpace('dining');
                if (!enabled && !isDiningExcluded) onToggleSpace('dining');
              }}
            >
              <CoreSpaceCardCompact
                space={coreSpaces.find(s => s.id === 'dining')!}
                language={language}
                isDeep={isDeep}
                isMoveOut={isMoveOut}
                roomId="dining"
                roomAddons={roomAddons?.dining || []}
                onRoomAddonToggle={onRoomAddonToggle || ((roomId, addonId) => onContextAddonToggle(addonId))}
                onRoomAddonQuantityChange={onRoomAddonQuantityChange}
                propertyFloors={propertyFloors}
                isExpanded={expandedSpace === 'dining'}
                onToggleExpand={() => handleToggleSpace('dining')}
                floorType={(spaceFloorTypes as any)?.dining}
                onFloorTypeChange={onSpaceFloorTypeChange ? (type) => onSpaceFloorTypeChange('dining', type) : undefined}
                showFloorSelector={showFloorSelector}
                showWindowSection={showWindowSection}
                roomWindowSelection={roomWindowSelections?.find(r => r.roomId === 'dining')}
                onRoomWindowUpdate={onRoomWindowUpdate ? (updates) => onRoomWindowUpdate('dining', updates) : undefined}
                tracksIncludedByDefault={tracksIncludedByDefault}
                includedWindowsEnabled={includedWindowsEnabled}
                includedWindowsLimit={1}
                surfaceNotes={(surfaceNotes as any)?.dining || ''}
                onSurfaceNotesChange={onSurfaceNotesChange ? (notes) => onSurfaceNotesChange('dining', notes) : undefined}
                showSurfaceNotes={showSurfaceNotes}
                showBaseboardToggle={showBaseboardToggle}
                hasBaseboards={(baseboardSelections as any)?.dining ?? true}
                onBaseboardChange={onBaseboardChange ? (enabled) => onBaseboardChange('dining', enabled) : undefined}
                floorLocation={(roomFloorLocations as any)?.dining || 1}
                onFloorLocationChange={onRoomFloorLocationChange 
                  ? (floor) => onRoomFloorLocationChange('dining', floor) 
                  : undefined}
                maxFloors={maxFloors}
                showInclusionsList={true}
                situation={situation}
                serviceType={serviceType}
                exclusions={userExclusions?.dining || []}
                onExclusionToggle={onExclusionToggle ? (key) => onExclusionToggle('dining', key) : undefined}
                showAreaHazards={showAreaHazards}
                roomMessTypes={(roomMessTypes as any)?.dining || []}
                onRoomMessTypesChange={onRoomMessTypesChange ? (types) => onRoomMessTypesChange('dining', types) : undefined}
                roomTrashBags={(roomTrashBags as any)?.dining || 0}
                onRoomTrashBagsChange={onRoomTrashBagsChange ? (count) => onRoomTrashBagsChange('dining', count) : undefined}
                roomStickySpills={(roomStickySpills as any)?.dining || false}
                onRoomStickySpillsChange={onRoomStickySpillsChange ? (value) => onRoomStickySpillsChange('dining', value) : undefined}
                ceilingHeight={(ceilingHeights as any)?.dining || null}
                onCeilingHeightChange={onCeilingHeightChange 
                  ? (height) => onCeilingHeightChange('dining', height) 
                  : undefined}
                showCeilingSelector={true}
              />
            </FreezeToggleWrapper>
          ) : (
            <CoreSpaceCardCompact
              space={coreSpaces.find(s => s.id === 'dining')!}
              language={language}
              isDeep={isDeep}
              isMoveOut={isMoveOut}
              roomId="dining"
              roomAddons={roomAddons?.dining || []}
              onRoomAddonToggle={onRoomAddonToggle || ((roomId, addonId) => onContextAddonToggle(addonId))}
              onRoomAddonQuantityChange={onRoomAddonQuantityChange}
              propertyFloors={propertyFloors}
              isExpanded={expandedSpace === 'dining'}
              onToggleExpand={() => handleToggleSpace('dining')}
              floorType={(spaceFloorTypes as any)?.dining}
              onFloorTypeChange={onSpaceFloorTypeChange ? (type) => onSpaceFloorTypeChange('dining', type) : undefined}
              showFloorSelector={showFloorSelector}
              showWindowSection={showWindowSection}
              roomWindowSelection={roomWindowSelections?.find(r => r.roomId === 'dining')}
              onRoomWindowUpdate={onRoomWindowUpdate ? (updates) => onRoomWindowUpdate('dining', updates) : undefined}
              tracksIncludedByDefault={tracksIncludedByDefault}
              includedWindowsEnabled={includedWindowsEnabled}
              includedWindowsLimit={1}
              surfaceNotes={(surfaceNotes as any)?.dining || ''}
              onSurfaceNotesChange={onSurfaceNotesChange ? (notes) => onSurfaceNotesChange('dining', notes) : undefined}
              showSurfaceNotes={showSurfaceNotes}
              showBaseboardToggle={showBaseboardToggle}
              hasBaseboards={(baseboardSelections as any)?.dining ?? true}
              onBaseboardChange={onBaseboardChange ? (enabled) => onBaseboardChange('dining', enabled) : undefined}
              floorLocation={(roomFloorLocations as any)?.dining || 1}
              onFloorLocationChange={onRoomFloorLocationChange 
                ? (floor) => onRoomFloorLocationChange('dining', floor) 
                : undefined}
              maxFloors={maxFloors}
              showInclusionsList={true}
              situation={situation}
              serviceType={serviceType}
              exclusions={userExclusions?.dining || []}
              onExclusionToggle={onExclusionToggle ? (key) => onExclusionToggle('dining', key) : undefined}
              showAreaHazards={showAreaHazards}
              roomMessTypes={(roomMessTypes as any)?.dining || []}
              onRoomMessTypesChange={onRoomMessTypesChange ? (types) => onRoomMessTypesChange('dining', types) : undefined}
              roomTrashBags={(roomTrashBags as any)?.dining || 0}
              onRoomTrashBagsChange={onRoomTrashBagsChange ? (count) => onRoomTrashBagsChange('dining', count) : undefined}
              roomStickySpills={(roomStickySpills as any)?.dining || false}
              onRoomStickySpillsChange={onRoomStickySpillsChange ? (value) => onRoomStickySpillsChange('dining', value) : undefined}
              ceilingHeight={(ceilingHeights as any)?.dining || null}
              onCeilingHeightChange={onCeilingHeightChange 
                ? (height) => onCeilingHeightChange('dining', height) 
                : undefined}
              showCeilingSelector={situation === 'LIVE_HERE' || situation === 'MOVING'}
            />
          )
        )}
        
        {/* Block 4: Bedrooms (visibility via registry) */}
        {isAreaVisible('bedrooms') && (
          <Collapsible 
            open={expandedSpace === 'bedrooms'} 
            onOpenChange={() => handleToggleSpace('bedrooms')}
          >
            <div className="rounded-xl border-2 border-border bg-primary/[0.03] dark:bg-primary/[0.05] overflow-hidden">
              {/* Bedroom Header - Entire row is trigger (matches Kitchen/Stairs pattern) */}
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
                >
                  {/* Left area: emoji + label + floor pills */}
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">🛏️</span>
                    <span className="text-sm font-semibold text-foreground">
                      {t(language, 'spaces.bedrooms_title')}
                    </span>
                    <Lock className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    
                    {/* Interactive Floor Pills - stopPropagation prevents header toggle */}
                    {maxFloors >= 1 && (
                      <div 
                        className="flex items-center gap-1.5 min-w-0"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FloorLocationSelector
                          language={language}
                          value={selectedBatchFloor}
                          onChange={(floor) => {
                            setSelectedBatchFloor(floor);
                            setBatchFloorDrawerOpen(true);
                          }}
                          maxFloors={maxFloors}
                          inline={true}
                          compact={true}
                          highlightedFloors={bedroomFloors}
                        />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {bedroomMappingStats.mapped > 0 
                            ? `${bedroomMappingStats.mapped}/${bedroomMappingStats.total} ${t(language, 'floor.mapped')}`
                            : t(language, 'floor.not_set')
                          }
                        </span>
                      </div>
                    )}
                    
                    {/* Ceiling Height Badges - derived from all bedrooms */}
                    {bedroomsHaveCeilings && (
                      <div className="flex flex-wrap items-center gap-1">
                        {bedroomCeilings.map(ceiling => (
                          <span
                            key={ceiling}
                            className={CEILING_BADGE_CLASS}
                          >
                            {getCeilingBadgeLabel(ceiling, language)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Right area: count + CTA + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {includedBedroomCount} of {bedroomCount}
                    </span>
                    {expandedSpace !== 'bedrooms' && (
                      <span className="text-[10px] text-primary/70 font-medium hidden sm:inline">
                        {t(language, 'core.tap_to_upgrade')}
                      </span>
                    )}
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      expandedSpace === 'bedrooms' && "rotate-180"
                    )} />
                  </div>
                </button>
              </CollapsibleTrigger>
              
              {/* Bedroom Cards - Collapsible */}
              <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="px-3 pb-3 space-y-2 border-t border-border/50">
                  {bedrooms.map((bedroom) => {
                    const credit = getBedroomCredit(bedroom.isMaster);
                    const bedroomFloorType = spaceFloorTypes?.bedrooms?.[bedroom.id] || 'carpet';
                      const bedroomConfig = bedroomConfigs?.[bedroom.id];
                      return (
                        <BedroomCard
                          key={bedroom.id}
                          bedroomIndex={bedroom.index}
                          isSkipped={skippedBedrooms.includes(bedroom.id)}
                          isDeep={isDeep}
                          isMoveOut={isMoveOut}
                          language={language}
                          isPartialEmptyMoving={isPartialEmpty}
                          onToggle={onToggleBedroom}
                          creditAmount={credit.amount}
                          creditMinutes={credit.minutes}
                          floorType={bedroomFloorType}
                          onFloorTypeChange={onBedroomFloorTypeChange}
                          showFloorSelector={showFloorSelector}
                          showWindowSection={showWindowSection}
                          roomWindowSelection={roomWindowSelections?.find(r => 
                            r.roomId === (bedroom.isMaster ? 'master_bedroom' : `bedroom_${bedroom.index + 1}`)
                          )}
                          onRoomWindowUpdate={onRoomWindowUpdate ? (bedroomId, updates) => {
                            const roomId = bedroom.isMaster ? 'master_bedroom' : `bedroom_${bedroom.index + 1}`;
                            onRoomWindowUpdate(roomId, updates);
                          } : undefined}
                          tracksIncludedByDefault={tracksIncludedByDefault}
                          // Included windows props for Deep/Move flows
                          includedWindowsEnabled={includedWindowsEnabled}
                          includedWindowsLimit={2} // Each bedroom: 2 windows included
                          // NEW: Surface Notes & Bedroom Profiles
                          surfaceNotes={surfaceNotes?.bedrooms?.[bedroom.id] || ''}
                          onSurfaceNotesChange={onSurfaceNotesChange}
                          showSurfaceNotes={showSurfaceNotes}
                          bedroomProfile={bedroomConfig?.profile || 'standard'}
                          onBedroomProfileChange={onBedroomProfileChange}
                          showBedroomProfile={showBedroomProfiles && !bedroom.isMaster}
                          bedroomAddons={{ 
                            ceilingFans: bedroomConfig?.ceilingFans || 0, 
                            lightFixtures: bedroomConfig?.lightFixtures || 0,
                            closetCabinets: bedroomConfig?.closetCabinets || 0,
                            freshSheets: (bedroomConfig as any)?.freshSheets || 0,
                            organizationHours: (bedroomConfig as any)?.organizationHours || 0
                          }}
                          onBedroomAddonsChange={onBedroomAddonsChange}
                          showBedroomAddons={showBedroomAddons}
                          // Lifestyle addons (Fresh Sheets, Organization) - "I live here" Deep/Basic only
                          showLifestyleAddons={situation === 'LIVE_HERE' && (serviceType === 'Deep Clean' || serviceType === 'Standard Clean')}
                          // Floor LOCATION (multi-floor property - user must select)
                          floorLocation={roomFloorLocations?.bedrooms?.[bedroom.id]}
                          onFloorLocationChange={onRoomFloorLocationChange}
                          maxFloors={maxFloors}
                          // Bedroom hazards (Deep/Move flows) - NEW
                          showBedroomHazards={showAreaHazards}
                          bedroomHazards={bedroomHazards?.[bedroom.id]}
                          onBedroomHazardsChange={onBedroomHazardsChange}
                          // Ceiling height (Detailed Home Mapping)
                          ceilingHeight={ceilingHeights?.bedrooms?.[bedroom.id] || null}
                          onCeilingHeightChange={onBedroomCeilingChange}
                          showCeilingSelector={situation === 'LIVE_HERE' || situation === 'MOVING'}
                        />
                      );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
        
        {/* Block 5: Hallways - Wrapped in FreezeToggleWrapper when Partial Empty mode is active */}
        {isAreaVisible('hallways') && (
          isPartialEmpty ? (
            <FreezeToggleWrapper
              label={t(language, 'move.include_hallways')}
              enabled={hallwaysEnabled ?? true}
              onToggle={(enabled) => onHallwaysEnabledChange?.(enabled)}
            >
              <Collapsible 
                open={expandedSpace === 'hallways'} 
                onOpenChange={() => handleToggleSpace('hallways')}
              >
                <div className="rounded-xl border-2 border-border bg-primary/[0.03] dark:bg-primary/[0.05] overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-lg">🚶</span>
                        <span className="text-sm font-semibold text-foreground">
                          {t(language, 'hallway.section_title')}
                        </span>
                        {(hallways?.length || 0) > 0 && (
                          <Lock className="w-3 h-3 text-emerald-500" />
                        )}
                        {maxFloors >= 2 && (hallways?.length || 0) > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {hallwaysHaveFloors ? (
                              hallwayFloors.map(floor => (
                                <span key={floor} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary text-primary-foreground shadow-sm whitespace-nowrap">
                                  {getFloorLabel(floor, language)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">{t(language, 'floor.not_set')}</span>
                            )}
                          </div>
                        )}
                        {hallwaysHaveCeilings && (
                          <div className="flex flex-wrap items-center gap-1">
                            {hallwayCeilings.map(ceiling => (
                              <span key={ceiling} className={CEILING_BADGE_CLASS}>{getCeilingBadgeLabel(ceiling, language)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {(hallways?.length || 0) === 0 ? t(language, 'hallway.optional') : `${hallways?.length} ${t(language, 'hallway.mapped')}`}
                        </span>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", expandedSpace === 'hallways' && "rotate-180")} />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="px-3 pb-3 border-t border-border/50">
                      <HallwaysSection
                        language={language}
                        hallways={hallways || []}
                        onHallwaysChange={(newHallways) => { onHallwaysChange?.(newHallways); if ((hallways?.length || 0) === 0 && newHallways.length > 0) setExpandedSpace('hallways'); }}
                        situation={situation || null}
                        serviceType={serviceType}
                        maxFloors={propertyFloors || 1}
                        roomWindowSelections={roomWindowSelections}
                        onRoomWindowUpdate={onRoomWindowUpdate}
                        tracksIncludedByDefault={tracksIncludedByDefault}
                        includedWindowsEnabled={includedWindowsEnabled}
                        showWindowSection={showWindowSection}
                        ceilingHeights={ceilingHeights?.hallways}
                        onCeilingHeightChange={onHallwayCeilingChange}
                        showCeilingSelector={true}
                        baseServiceLevel={baseServiceLevel}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </FreezeToggleWrapper>
          ) : (
            <Collapsible 
              open={expandedSpace === 'hallways'} 
              onOpenChange={() => handleToggleSpace('hallways')}
            >
              <div className="rounded-xl border-2 border-border bg-primary/[0.03] dark:bg-primary/[0.05] overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-lg">🚶</span>
                      <span className="text-sm font-semibold text-foreground">
                        {t(language, 'hallway.section_title')}
                      </span>
                      {(hallways?.length || 0) > 0 && (
                        <Lock className="w-3 h-3 text-emerald-500" />
                      )}
                      {maxFloors >= 2 && (hallways?.length || 0) > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {hallwaysHaveFloors ? (
                            hallwayFloors.map(floor => (
                              <span key={floor} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary text-primary-foreground shadow-sm whitespace-nowrap">
                                {getFloorLabel(floor, language)}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">{t(language, 'floor.not_set')}</span>
                          )}
                        </div>
                      )}
                      {hallwaysHaveCeilings && (
                        <div className="flex flex-wrap items-center gap-1">
                          {hallwayCeilings.map(ceiling => (
                            <span key={ceiling} className={CEILING_BADGE_CLASS}>{getCeilingBadgeLabel(ceiling, language)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {(hallways?.length || 0) === 0 ? t(language, 'hallway.optional') : `${hallways?.length} ${t(language, 'hallway.mapped')}`}
                      </span>
                      {expandedSpace !== 'hallways' && (hallways?.length || 0) === 0 && (
                        <span className="text-[10px] text-primary/70 font-medium hidden sm:inline">{t(language, 'hallway.tap_to_add')}</span>
                      )}
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", expandedSpace === 'hallways' && "rotate-180")} />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="px-3 pb-3 border-t border-border/50">
                    <HallwaysSection
                      language={language}
                      hallways={hallways || []}
                      onHallwaysChange={(newHallways) => { onHallwaysChange?.(newHallways); if ((hallways?.length || 0) === 0 && newHallways.length > 0) setExpandedSpace('hallways'); }}
                      situation={situation || null}
                      serviceType={serviceType}
                      maxFloors={propertyFloors || 1}
                      roomWindowSelections={roomWindowSelections}
                      onRoomWindowUpdate={onRoomWindowUpdate}
                      tracksIncludedByDefault={tracksIncludedByDefault}
                      includedWindowsEnabled={includedWindowsEnabled}
                      showWindowSection={showWindowSection}
                      ceilingHeights={ceilingHeights?.hallways}
                      onCeilingHeightChange={onHallwayCeilingChange}
                      showCeilingSelector={situation === 'LIVE_HERE' || situation === 'MOVING'}
                      baseServiceLevel={baseServiceLevel}
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        )}
        
        {/* Block 6: Stairs - Wrapped in FreezeToggleWrapper when Partial Empty mode is active */}
        {maxFloors >= 2 && onStairsChange && (
          isPartialEmpty ? (
            <FreezeToggleWrapper
              label={t(language, 'move.include_stairs')}
              enabled={stairsEnabled ?? true}
              onToggle={(enabled) => onStairsEnabledChange?.(enabled)}
            >
              <StairsSection
                language={language}
                stairs={stairs}
                onStairsChange={onStairsChange}
                situation={situation || 'LIVE_HERE'}
                maxFloors={maxFloors}
              />
            </FreezeToggleWrapper>
          ) : (
            <StairsSection
              language={language}
              stairs={stairs}
              onStairsChange={onStairsChange}
              situation={situation || 'LIVE_HERE'}
              maxFloors={maxFloors}
            />
          )
        )}
      </div>

      {/* === PREMIUM SPACES (Mudroom, Den only - Entryway absorbed into Home Entry) === */}
      {homeMapping?.areas && onHomeMappingAreaChange && (isAreaVisible('mudroom') || isAreaVisible('den')) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
              {t(language, 'spaces.premium_title')}
            </span>
          </div>
          
          {/* Mudroom */}
          {isAreaVisible('mudroom') && homeMapping.areas.mudroom && (
            <GenericAreaCard
              areaKey="mudroom"
              areaDefinition={getAreaDefinition('mudroom')!}
              config={homeMapping.areas.mudroom}
              onConfigChange={(updates) => onHomeMappingAreaChange('mudroom', updates)}
              language={language}
              isDeep={isDeep}
              isMoveOut={isMoveOut}
              maxFloors={1}
              isExpanded={expandedSpace === 'mudroom'}
              onToggleExpand={() => handleToggleSpace('mudroom')}
              showFloorSelector={false}
              showCeilingSelector={false}
            />
          )}
          
          {/* Den */}
          {isAreaVisible('den') && homeMapping.areas.den && (
            <GenericAreaCard
              areaKey="den"
              areaDefinition={getAreaDefinition('den')!}
              config={homeMapping.areas.den}
              onConfigChange={(updates) => onHomeMappingAreaChange('den', updates)}
              language={language}
              isDeep={isDeep}
              isMoveOut={isMoveOut}
              maxFloors={maxFloors}
              isExpanded={expandedSpace === 'den'}
              onToggleExpand={() => handleToggleSpace('den')}
              showFloorSelector={showFloorSelector}
              showCeilingSelector={false}
            />
          )}
        </div>
      )}

      {/* === UTILITY AREAS (Moved UP - above Bathroom Modules) === */}
      {homeMapping?.areas && onHomeMappingAreaChange && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
              {t(language, 'spaces.utility_title')}
            </span>
          </div>
          
          {/* Office */}
          {isAreaVisible('office') && (
            <GenericAreaCard
              areaKey="office"
              areaDefinition={HOME_MAPPING_REGISTRY.find(a => a.key === 'office')!}
              config={homeMapping.areas.office}
              onConfigChange={(updates) => onHomeMappingAreaChange('office', updates)}
              language={language}
              isDeep={isDeep}
              isMoveOut={isMoveOut}
              maxFloors={maxFloors}
              isExpanded={expandedSpace === 'office'}
              onToggleExpand={() => handleToggleSpace('office')}
              showFloorSelector={showFloorSelector}
              showCeilingSelector={situation === 'LIVE_HERE' || situation === 'MOVING'}
            />
          )}
          
          {/* Laundry */}
          {isAreaVisible('laundry') && (
            <GenericAreaCard
              areaKey="laundry"
              areaDefinition={HOME_MAPPING_REGISTRY.find(a => a.key === 'laundry')!}
              config={homeMapping.areas.laundry}
              onConfigChange={(updates) => onHomeMappingAreaChange('laundry', updates)}
              language={language}
              isDeep={isDeep}
              isMoveOut={isMoveOut}
              maxFloors={maxFloors}
              isExpanded={expandedSpace === 'laundry'}
              onToggleExpand={() => handleToggleSpace('laundry')}
              showFloorSelector={showFloorSelector}
              showCeilingSelector={situation === 'LIVE_HERE' || situation === 'MOVING'}
            />
          )}
          
          {/* Garage (SFH/Townhouse only) */}
          {isAreaVisible('garage') && (
            <GenericAreaCard
              areaKey="garage"
              areaDefinition={HOME_MAPPING_REGISTRY.find(a => a.key === 'garage')!}
              config={homeMapping.areas.garage}
              onConfigChange={(updates) => onHomeMappingAreaChange('garage', updates)}
              language={language}
              isDeep={isDeep}
              isMoveOut={isMoveOut}
              maxFloors={1}
              isExpanded={expandedSpace === 'garage'}
              onToggleExpand={() => handleToggleSpace('garage')}
              showFloorSelector={false}
              showCeilingSelector={false}
            />
          )}
          
          {/* Patio/Balcony */}
          {isAreaVisible('patio') && (
            <GenericAreaCard
              areaKey="patio"
              areaDefinition={HOME_MAPPING_REGISTRY.find(a => a.key === 'patio')!}
              config={homeMapping.areas.patio}
              onConfigChange={(updates) => onHomeMappingAreaChange('patio', updates)}
              language={language}
              isDeep={isDeep}
              isMoveOut={isMoveOut}
              maxFloors={maxFloors}
              isExpanded={expandedSpace === 'patio'}
              onToggleExpand={() => handleToggleSpace('patio')}
              showFloorSelector={showFloorSelector}
              showCeilingSelector={false}
            />
          )}
        </div>
      )}

      {/* === BATHROOM MAPPING (Premium Inventory System) === */}
      {showBathroomModules && onBathroomChange && (
        <BathroomMappingSection
          language={language}
          tier={getBathroomPricingTier(serviceType, situation)}  // Using SSOT tier helper
          situation={situation || 'LIVE_HERE'}
          masterBaths={masterBaths}
          fullBaths={fullBaths}
          halfBaths={halfBaths}
          onMasterChange={(count) => onBathroomChange('master', count)}
          onFullChange={(count) => onBathroomChange('full', count)}
          onHalfChange={(count) => onBathroomChange('half', count)}
          inventory={bathroomInventory}
          onInventoryChange={onBathroomInventoryChange || (() => {})}
          propertyFloors={canonicalFloors}
        />
      )}

      {/* === TIER 2: CONDITIONAL SPACES (Toggleable) === */}
      {availableConditional.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                {t(language, 'spaces.conditional_title')}
              </span>
              <span className="text-xs text-muted-foreground">
                — {t(language, 'spaces.conditional_subtitle')}
              </span>
            </div>
            <span className="text-xs text-muted-foreground italic">
              {t(language, 'spaces.tap_to_exclude')}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {availableConditional.map((space) => {
              const isIncluded = isConditionalIncluded(space.id);
              const IconComponent = spaceIconMap[space.icon] || Sparkles;
              
              return (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => onToggleSpace(space.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200",
                    isIncluded
                      ? "bg-primary/5 border-primary/30 hover:border-primary"
                      : "bg-muted/50 border-dashed border-muted-foreground/30 opacity-60"
                  )}
                >
                  <span className={cn("text-base", !isIncluded && "grayscale")}>{space.emoji}</span>
                  <span className={cn(
                    "text-sm font-medium",
                    isIncluded ? "text-foreground" : "line-through text-muted-foreground"
                  )}>
                    {space.label}
                  </span>
                  {isIncluded && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === TIER 3 LEGACY: PAID ADD-ONS (Hide if homeMapping.areas active) === */}
      {!homeMapping?.areas && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              {t(language, 'spaces.addons_title')}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-500">
              {t(language, 'spaces.extra_cost')}
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {ADDON_SPACES.map((space) => {
              const count = addonCounts[space.id] || 0;
              const price = isDeep ? space.deepPrice : space.stdPrice;
              const IconComponent = spaceIconMap[space.icon] || Sparkles;
              const hasSelection = count > 0;
              
              return (
                <div
                  key={space.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                    hasSelection
                      ? "border-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  )}
                >
                  {/* Left: Icon, Label, Price */}
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{space.emoji}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{space.label}</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        +${price}{space.maxQty > 1 ? '/each' : ''}
                      </span>
                    </div>
                  </div>
                  
                  {/* Right: Counter */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => count > 0 && onAddonChange(space.id, count - 1)}
                      disabled={count <= 0}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-foreground tabular-nums">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => count < space.maxQty && onAddonChange(space.id, count + 1)}
                      disabled={count >= space.maxQty}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Patio Scope Selector (if patio selected) */}
          {patioCount > 0 && (
            <div className="flex gap-2 pl-4 mt-2">
              <button
                type="button"
                onClick={() => onPatioScopeChange('sweep')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all",
                  patioScope === 'sweep'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                )}
              >
                Sweep Only <span className="font-bold">+$15</span>
              </button>
              <button
                type="button"
                onClick={() => onPatioScopeChange('scrub')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all",
                  patioScope === 'scrub'
                    ? "border-amber-500 bg-amber-50/10 text-amber-600 dark:text-amber-400"
                    : "border-border bg-card text-muted-foreground hover:border-amber-500/50"
                )}
              >
                Deep Scrub <span className="font-bold">+$25</span>
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Batch Floor Apply Drawer for Bedrooms */}
      <Drawer open={batchFloorDrawerOpen} onOpenChange={setBatchFloorDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {t(language, 'bedroom.batch_floor_title')}
              {selectedBatchFloor && ` — ${getFloorLabel(selectedBatchFloor, language)}`}
            </DrawerTitle>
            <DrawerDescription>
              {t(language, 'bedroom.batch_floor_description')}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button 
              onClick={() => selectedBatchFloor && applyFloorToAllBedrooms(selectedBatchFloor)}
              className="w-full"
            >
              {t(language, 'bedroom.apply_to_all')} ({bedroomMappingStats.total})
            </Button>
            {bedroomMappingStats.unmapped > 0 && (
              <Button 
                variant="outline"
                onClick={() => selectedBatchFloor && applyFloorToUnassigned(selectedBatchFloor)}
                className="w-full"
              >
                {t(language, 'bedroom.apply_to_unassigned')} ({bedroomMappingStats.unmapped})
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full">
                {t(language, 'common.cancel')}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
