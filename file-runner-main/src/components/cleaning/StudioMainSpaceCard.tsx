/**
 * StudioMainSpaceCard — Unified studio living/sleeping/dining zone
 * 
 * SSOT-PERFECT: Uses RoomWindowSectionCompact for windows (not +/- stepper)
 * Hazards write to GLOBAL keys (roomStickySpills, roomTrashBags, roomMessTypes)
 * Review + PDF consume studioOperations from HomeLayoutModel
 * 
 * 5-BLOCK STRUCTURE:
 * 1. Snapshot: Type + Size + Floor + Summary chips
 * 2. What's Included: Service-level checklist
 * 3. Sub-Areas: Toggles for Sleeping/Lounge/Desk/Closet/Entry/Balcony
 * 4. Windows: RoomWindowSectionCompact (inventory-based)
 * 5. Hazards: Pet hair, sticky, dust, trash, moving fields (gated)
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { 
  StudioMainSpaceConfig, 
  DEFAULT_STUDIO_MAIN_SPACE, 
  StudioStructureType, 
  StudioSizeRange,
  StudioDustLevel,
  StudioMovingConfig
} from '@/lib/homeMappingTypes';
import { applyStudioPresetIfFresh } from '@/lib/studioPresets';
import { Situation } from '@/contexts/BookingContext';
import { RoomWindowSelection } from '@/lib/roomWindowConfig';
import { FloorTypeSelector, RoomFloorType } from './FloorTypeSelector';
import { RoomWindowSectionCompact } from './RoomWindowSectionCompact';
import { 
  ChevronDown, 
  Bed, 
  Armchair, 
  Monitor, 
  DoorOpen,
  PawPrint,
  LayoutGrid,
  Shirt,
  Building2,
  Home,
  Ruler,
  Sparkles,
  Check,
  Droplets,
  Trash2,
  Package,
  AlertTriangle,
  CheckCircle2,
  DoorClosed
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface StudioMainSpaceCardProps {
  language: Language;
  isDeep: boolean;
  situation: Situation;
  serviceType?: string;
  moveContext?: 'move_in' | 'move_out' | null;  // NEW: Distinguishes Move-In vs Move-Out
  config: StudioMainSpaceConfig | undefined;
  onChange: (updates: Partial<StudioMainSpaceConfig>) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // Windows (SSOT via roomWindowSelections)
  roomWindowSelection?: RoomWindowSelection;
  onRoomWindowUpdate?: (updates: Partial<RoomWindowSelection>) => void;
  // Hazards (GLOBAL SSOT keys)
  roomMessTypes?: string[];
  onRoomMessTypesChange?: (types: string[]) => void;
  roomTrashBags?: number;
  onRoomTrashBagsChange?: (bags: number) => void;
  roomStickySpills?: boolean;
  onRoomStickySpillsChange?: (sticky: boolean) => void;
  // Gating
  showAreaHazards?: boolean;
}

type DensityLevel = 'light' | 'normal' | 'heavy';
type ClutterLevel = 'light' | 'normal' | 'heavy';

const DENSITY_OPTIONS: { value: DensityLevel; icon: React.ReactNode }[] = [
  { value: 'light', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { value: 'normal', icon: <Armchair className="w-3.5 h-3.5" /> },
  { value: 'heavy', icon: <Bed className="w-3.5 h-3.5" /> },
];

const STRUCTURE_TYPE_OPTIONS: { value: StudioStructureType; icon: React.ReactNode; labelKey: string }[] = [
  { value: 'apartment_unit', icon: <Building2 className="w-3.5 h-3.5" />, labelKey: 'studio.structure.apartment_unit' },
  { value: 'adu_attached', icon: <Home className="w-3.5 h-3.5" />, labelKey: 'studio.structure.adu_attached' },
  { value: 'adu_detached', icon: <Home className="w-3.5 h-3.5" />, labelKey: 'studio.structure.adu_detached' },
];

const STUDIO_SIZE_OPTIONS: { value: StudioSizeRange; labelKey: string }[] = [
  { value: 'under_400', labelKey: 'studio.size.under_400' },
  { value: '400_600', labelKey: 'studio.size.400_600' },
  { value: '600_800', labelKey: 'studio.size.600_800' },
  { value: 'over_800', labelKey: 'studio.size.over_800' },
];

const DUST_LEVEL_OPTIONS: { value: StudioDustLevel; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: 'heavy', label: 'Heavy' },
];

export function StudioMainSpaceCard({
  language,
  isDeep,
  situation,
  serviceType = '',
  moveContext = null,
  config,
  onChange,
  isExpanded,
  onToggleExpand,
  roomWindowSelection,
  onRoomWindowUpdate,
  roomMessTypes = [],
  onRoomMessTypesChange,
  roomTrashBags = 0,
  onRoomTrashBagsChange,
  roomStickySpills = false,
  onRoomStickySpillsChange,
  showAreaHazards = false,
}: StudioMainSpaceCardProps) {
  // Apply preset on mount if config is missing or not customized
  const hasAppliedPreset = useRef(false);
  
  useEffect(() => {
    if (hasAppliedPreset.current) return;
    
    const preset = applyStudioPresetIfFresh(config, situation);
    if (!config || !config.isCustomized) {
      onChange(preset);
      hasAppliedPreset.current = true;
    }
  }, [config, situation, onChange]);

  // Merge config with defaults for safe access
  const safeConfig: StudioMainSpaceConfig = {
    ...DEFAULT_STUDIO_MAIN_SPACE,
    ...config,
  };

  // Gating rules
  const isMoving = situation === 'MOVING';
  const isDeepOrMoving = isDeep || isMoving;
  const showHazardsDeep = isDeepOrMoving;
  const showMovingFields = isMoving;

  // Handle changes - mark as customized
  const handleChange = (updates: Partial<StudioMainSpaceConfig>) => {
    onChange({ ...updates, isCustomized: true });
  };

  const handleDensityChange = (density: DensityLevel) => {
    handleChange({ furnitureDensity: density });
  };

  const handleClutterChange = (clutter: ClutterLevel) => {
    handleChange({ clutterLevel: clutter });
  };

  const handleFloorTypeChange = (type: RoomFloorType) => {
    handleChange({ floorType: type });
  };

  const handleStructureTypeChange = (structureType: StudioStructureType) => {
    handleChange({ structureType });
  };

  const handleSizeChange = (studioSize: StudioSizeRange) => {
    handleChange({ studioSize });
  };

  const handleToggle = (field: keyof StudioMainSpaceConfig) => {
    handleChange({ [field]: !safeConfig[field] });
  };

  const handleDustLevelChange = (dustLevel: StudioDustLevel) => {
    handleChange({ dustLevel });
  };

  const handleMovingConfigChange = (updates: Partial<StudioMovingConfig>) => {
    const currentMovingConfig = safeConfig.movingConfig || {
      isEmptyHome: false,
      insideCabinets: false,
      insideClosets: false,
      insideAppliances: false,
      wallMarks: false,
    };
    handleChange({ movingConfig: { ...currentMovingConfig, ...updates } });
  };

  // Check if any customizations made
  const hasCustomizations = safeConfig.isCustomized;

  // Count active sub-areas
  const activeSubAreas = [
    true, // Sleeping always on
    safeConfig.hasTvArea,
    safeConfig.hasDeskArea,
    safeConfig.hasCloset,
    safeConfig.hasEntryNook,
    safeConfig.hasBalconyDoor,
  ].filter(Boolean).length;

  // Count windows from inventory
  const windowCount = roomWindowSelection?.windowInventory?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        id="area-studio_main_space"
        className={cn(
          "rounded-2xl border transition-all duration-200 overflow-hidden",
          isExpanded
            ? "border-purple-300/60 dark:border-purple-700/40 bg-gradient-to-br from-purple-50/30 to-purple-100/20 dark:from-purple-950/20 dark:to-purple-900/10 shadow-md"
            : hasCustomizations
              ? "border-purple-400/50 dark:border-purple-600/40 bg-gradient-to-br from-purple-50/20 to-purple-100/10 dark:from-purple-950/10 dark:to-purple-900/5 shadow-sm"
              : "border-border/60 bg-card hover:bg-muted/30"
        )}
      >
        {/* ============= BLOCK 1: SNAPSHOT HEADER ============= */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 hover:bg-purple-100/30 dark:hover:bg-purple-900/20 transition-colors min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg flex-shrink-0">🛏️</span>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {t(language, 'spaces.studio_main_space')}
                  </span>
                </div>
                {/* Summary chips */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {t(language, `studio.size.${safeConfig.studioSize}`) || safeConfig.studioSize}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {activeSubAreas} areas
                  </span>
                  {windowCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {windowCount} windows
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right section: Status + Chevron */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasCustomizations && (
                <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ✓
                </span>
              )}
              
              {!isExpanded && (
                <span className="text-[10px] font-medium hidden sm:inline text-purple-600 dark:text-purple-400">
                  {t(language, 'core.tap_to_upgrade')}
                </span>
              )}
              
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                isExpanded && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        {/* ============= EXPANDED CONTENT ============= */}
        <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-4">
            
            {/* ============= BLOCK 2: WHAT'S INCLUDED ============= */}
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
              <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isMoving 
                  ? (moveContext === 'move_in' 
                      ? t(language, 'studio.moving.move_in_restoration') || 'Move-In Restoration'
                      : t(language, 'studio.moving.move_out_restoration') || 'Move-Out Restoration')
                  : isDeep 
                    ? t(language, 'studio.deep_reset_includes') || 'Deep Reset Includes' 
                    : t(language, 'studio.standard_clean_includes') || 'Standard Clean Includes'}
              </h4>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-200">
                <div className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Dust all surfaces</div>
                <div className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Vacuum/mop floors</div>
                <div className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Baseboards wipe</div>
                <div className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Trash removal</div>
                {isDeepOrMoving && (
                  <>
                    <div className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Detail dusting</div>
                    <div className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Tracks & sills</div>
                  </>
                )}
                {isMoving && (
                  <>
                    <div className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Inside cabinets</div>
                    <div className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Appliance wipe</div>
                  </>
                )}
              </div>
            </div>
            
            {/* Structure Type Section */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                {t(language, 'studio.structure_type')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STRUCTURE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStructureTypeChange(option.value)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] font-medium transition-all",
                      safeConfig.structureType === option.value
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {option.icon}
                    <span className="truncate">{t(language, option.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Studio Size Section */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                {t(language, 'studio.size')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STUDIO_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSizeChange(option.value)}
                    className={cn(
                      "px-2 py-2 rounded-lg border text-[11px] font-medium transition-all",
                      safeConfig.studioSize === option.value
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {t(language, option.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Floor Type Selector */}
            <FloorTypeSelector
              value={safeConfig.floorType}
              onChange={handleFloorTypeChange}
              language={language}
              compact
            />
            
            {/* ============= BLOCK 3: SUB-AREAS ============= */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
                Sub-Areas
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Sleeping - Always on */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-700/30">
                  <div className="flex items-center gap-2">
                    <Bed className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs text-purple-700 dark:text-purple-300">Sleeping</span>
                  </div>
                  <Check className="w-3.5 h-3.5 text-purple-600" />
                </div>
                
                {/* Lounge/TV */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">{t(language, 'studio.has_tv')}</span>
                  </div>
                  <Switch
                    checked={safeConfig.hasTvArea}
                    onCheckedChange={() => handleToggle('hasTvArea')}
                    className="scale-75"
                  />
                </div>
                
                {/* Desk/Work */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">{t(language, 'studio.has_desk')}</span>
                  </div>
                  <Switch
                    checked={safeConfig.hasDeskArea}
                    onCheckedChange={() => handleToggle('hasDeskArea')}
                    className="scale-75"
                  />
                </div>
                
                {/* Closet */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">{t(language, 'studio.has_closet')}</span>
                  </div>
                  <Switch
                    checked={safeConfig.hasCloset}
                    onCheckedChange={() => handleToggle('hasCloset')}
                    className="scale-75"
                  />
                </div>
                
                {/* Entry Nook */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <DoorClosed className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">Entry Nook</span>
                  </div>
                  <Switch
                    checked={safeConfig.hasEntryNook}
                    onCheckedChange={() => handleToggle('hasEntryNook')}
                    className="scale-75"
                  />
                </div>
                
                {/* Balcony Door */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">{t(language, 'studio.has_balcony_door')}</span>
                  </div>
                  <Switch
                    checked={safeConfig.hasBalconyDoor}
                    onCheckedChange={() => handleToggle('hasBalconyDoor')}
                    className="scale-75"
                  />
                </div>
              </div>
            </div>
            
            {/* Furniture Density */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                {t(language, 'studio.furniture_density')}
              </label>
              <div className="flex gap-2">
                {DENSITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDensityChange(option.value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                      safeConfig.furnitureDensity === option.value
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {option.icon}
                    <span>{t(language, `studio.density_${option.value}`)}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Clutter Level */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                {t(language, 'studio.clutter_level')}
              </label>
              <div className="flex gap-2">
                {(['light', 'normal', 'heavy'] as ClutterLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleClutterChange(level)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                      safeConfig.clutterLevel === level
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {t(language, `studio.density_${level}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* ============= BLOCK 4: WINDOWS (SSOT) ============= */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
              <RoomWindowSectionCompact
                roomId="studio_main"
                roomType="studio"
                roomLabel={t(language, 'spaces.studio_main_space')}
                language={language}
                roomWindowSelection={roomWindowSelection}
                onUpdate={onRoomWindowUpdate}
                showSillsTracks={isMoving}
                tracksIncludedByDefault={isDeepOrMoving}
                includedWindowsEnabled={isDeepOrMoving}
                includedWindowsLimit={1}
              />
            </div>

            {/* ============= BLOCK 5: HAZARDS & CONDITION ============= */}
            <Collapsible defaultOpen={showAreaHazards}>
              <CollapsibleTrigger asChild>
                <button 
                  type="button"
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Hazards & Condition
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                
                {/* Pet Hair (always visible) */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50">
                  <div className="flex items-center gap-2">
                    <PawPrint className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {t(language, 'studio.pet_hair')}
                    </span>
                  </div>
                  <Switch
                    checked={safeConfig.petHairRisk}
                    onCheckedChange={() => handleToggle('petHairRisk')}
                    className="scale-75"
                  />
                </div>
                
                {/* Sticky Spills (writes to GLOBAL SSOT) */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">Sticky Floor Spills</span>
                  </div>
                  <Switch
                    checked={roomStickySpills}
                    onCheckedChange={(val) => onRoomStickySpillsChange?.(val)}
                    className="scale-75"
                  />
                </div>
                
                {/* Dust Level (Deep/Move only) */}
                {showHazardsDeep && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Dust Level</label>
                    <div className="flex gap-2">
                      {DUST_LEVEL_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleDustLevelChange(option.value)}
                          className={cn(
                            "flex-1 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                            safeConfig.dustLevel === option.value
                              ? "border-amber-500 bg-amber-100 dark:bg-amber-900/30 text-amber-700"
                              : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Trash Bags Estimate (Deep/Move only, writes to GLOBAL SSOT) */}
                {showHazardsDeep && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                        Trash Bags Estimate
                      </label>
                      <span className="text-xs font-semibold text-primary">{roomTrashBags} bags</span>
                    </div>
                    <Slider
                      value={[roomTrashBags]}
                      onValueChange={([val]) => onRoomTrashBagsChange?.(val)}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
                
              </CollapsibleContent>
            </Collapsible>
            
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}