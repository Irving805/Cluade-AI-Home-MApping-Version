/**
 * GenericAreaCard — Contract-Driven Utility Area Renderer
 * 
 * This component renders Office, Laundry, Garage, or Patio areas
 * based on the registry definition and field contracts.
 * 
 * PRINCIPLE: One component, driven by contracts. No 4 separate cards.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Minus, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FloorTypeSelector, RoomFloorType } from './FloorTypeSelector';
import { FloorLocationSelector } from './FloorLocationSelector';
import { CeilingHeightSelector } from './CeilingHeightSelector';
import { ResidentialCeilingHeight } from '@/lib/ceilingHeightTypes';
import { getFloorLabel } from '@/lib/floorLocationTypes';
import { getCeilingBadgeLabel, CEILING_BADGE_CLASS } from '@/lib/ceilingHeightTypes';
import type { ServiceAreaDefinition } from '@/lib/homeMappingRegistry';
import type { 
  OfficeAreaConfig,
  LaundryAreaConfig,
  GarageAreaConfig,
  PatioAreaConfig,
  MudroomAreaConfig,
  DenAreaConfig,
  AreaSizeTier,
  BlindsType,
  DenPrimaryUse,
  MudroomSoilLevel,
  DenClutterLevel,
} from '@/lib/homeMappingTypes';
import { calculateAreaTotal, type MappedAreaKey } from '@/lib/homeMappingPricing';

// ============= PROPS INTERFACE =============

interface GenericAreaCardProps {
  areaKey: MappedAreaKey;
  areaDefinition: ServiceAreaDefinition;
  config: OfficeAreaConfig | LaundryAreaConfig | GarageAreaConfig | PatioAreaConfig | MudroomAreaConfig | DenAreaConfig;
  onConfigChange: (updates: Partial<OfficeAreaConfig | LaundryAreaConfig | GarageAreaConfig | PatioAreaConfig | MudroomAreaConfig | DenAreaConfig>) => void;
  language: Language;
  isDeep: boolean;
  isMoveOut?: boolean;
  maxFloors?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showFloorSelector?: boolean;
  showCeilingSelector?: boolean;
}

// ============= SIZE TIER SELECTOR =============

function SizeTierSelector({
  value,
  onChange,
  language,
  label,
}: {
  value: AreaSizeTier;
  onChange: (size: AreaSizeTier) => void;
  language: Language;
  label?: string;
}) {
  const sizes: AreaSizeTier[] = ['small', 'medium', 'large'];
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      <div className="flex gap-1.5">
        {sizes.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-medium rounded-lg border-2 transition-all",
              value === size
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            )}
          >
            {t(language, `size.${size}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============= BLINDS TYPE SELECTOR =============

function BlindsTypeSelector({
  value,
  onChange,
  language,
  windowCount,
}: {
  value: BlindsType;
  onChange: (blinds: BlindsType) => void;
  language: Language;
  windowCount: number;
}) {
  if (windowCount === 0) return null;
  
  const options: { value: BlindsType; label: string }[] = [
    { value: 'none', label: t(language, 'blinds.none') },
    { value: 'standard', label: t(language, 'blinds.standard') },
    { value: 'plantation', label: t(language, 'blinds.plantation') },
    { value: 'shutters', label: t(language, 'blinds.shutters') },
    { value: 'vertical', label: t(language, 'blinds.vertical') },
  ];
  
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {t(language, 'blinds.title')}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "py-1 px-2 text-xs rounded-md border transition-all",
              value === opt.value
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============= COUNTER COMPONENT =============

function CounterField({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => value > min && onChange(value - 1)}
          disabled={value <= min}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-5 text-center font-bold text-foreground text-sm tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => value < max && onChange(value + 1)}
          disabled={value >= max}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============= TOGGLE FIELD =============

function ToggleField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ============= MAIN COMPONENT =============

export function GenericAreaCard({
  areaKey,
  areaDefinition,
  config,
  onConfigChange,
  language,
  isDeep,
  isMoveOut = false,
  maxFloors = 1,
  isExpanded = false,
  onToggleExpand,
  showFloorSelector = true,
  showCeilingSelector = true,
}: GenericAreaCardProps) {
  // Track previous enabled state to detect enable transitions
  const prevEnabledRef = useRef(config.enabled);
  
  // Auto-expand when user enables the area (disabled → enabled transition)
  useEffect(() => {
    const wasDisabled = !prevEnabledRef.current;
    const isNowEnabled = config.enabled;
    
    // If transitioning from disabled → enabled, auto-expand
    if (wasDisabled && isNowEnabled && onToggleExpand && !isExpanded) {
      onToggleExpand();
    }
    
    prevEnabledRef.current = config.enabled;
  }, [config.enabled, isExpanded, onToggleExpand]);
  
  // Calculate price/time for display
  const pricing = useMemo(() => 
    calculateAreaTotal(areaKey, config, isDeep),
    [areaKey, config, isDeep]
  );
  
  // Helper for deep updates on nested objects
  const updateConfig = <T extends keyof typeof config>(key: T, value: (typeof config)[T]) => {
    onConfigChange({ [key]: value } as any);
  };
  
  // Type-safe config access
  const officeConfig = areaKey === 'office' ? config as OfficeAreaConfig : null;
  const laundryConfig = areaKey === 'laundry' ? config as LaundryAreaConfig : null;
  const garageConfig = areaKey === 'garage' ? config as GarageAreaConfig : null;
  const patioConfig = areaKey === 'patio' ? config as PatioAreaConfig : null;
  const mudroomConfig = areaKey === 'mudroom' ? config as MudroomAreaConfig : null;
  const denConfig = areaKey === 'den' ? config as DenAreaConfig : null;
  
  // Get floor level and ceiling for badge display
  const floorLevel = officeConfig?.floor.floorLevel ?? 
                    laundryConfig?.floor.floorLevel ?? 
                    patioConfig?.floor.floorLevel ?? null;
  const ceilingHeight = officeConfig?.ceiling.ceilingHeight ?? 
                       laundryConfig?.ceiling.ceilingHeight ?? null;
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={cn(
        "rounded-xl border-2 overflow-hidden transition-all duration-200",
        config.enabled
          ? "border-primary/30 bg-primary/[0.03] dark:bg-primary/[0.05]"
          : "border-dashed border-muted-foreground/30 bg-muted/30 opacity-70"
      )}>
        {/* Header - Always Visible */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{areaDefinition.emoji}</span>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t(language, areaDefinition.labelKey)}
                  </span>
                  {config.enabled && pricing.price > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                      +${pricing.price}
                    </Badge>
                  )}
                </div>
                {areaDefinition.subtitleKey && (
                  <span className="text-[10px] text-muted-foreground">
                    {t(language, areaDefinition.subtitleKey)}
                  </span>
                )}
              </div>
              
              {/* Floor + Ceiling badges in header */}
              {config.enabled && (floorLevel || ceilingHeight) && (
                <div className="flex gap-1 ml-2">
                  {floorLevel && maxFloors >= 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {getFloorLabel(floorLevel, language)}
                    </span>
                  )}
                  {ceilingHeight && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded", CEILING_BADGE_CLASS[ceilingHeight])}>
                      {getCeilingBadgeLabel(ceilingHeight, language)}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Enable Toggle - Larger hit area for easy tapping */}
              <div 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()} 
                className="p-2 -m-2 flex items-center"
              >
                <Switch 
                  checked={config.enabled} 
                  onCheckedChange={(enabled) => updateConfig('enabled', enabled)}
                />
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        {/* Content - Collapsible */}
        <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
          {config.enabled && (
            <div className="px-3 pb-3 pt-2 border-t border-border/50 space-y-4">
              
              {/* === OFFICE FIELDS === */}
              {officeConfig && (
                <>
                  <SizeTierSelector
                    value={officeConfig.size}
                    onChange={(size) => updateConfig('size' as any, size)}
                    language={language}
                    label={t(language, 'spaces.office.size')}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <CounterField
                      value={officeConfig.desks}
                      onChange={(v) => updateConfig('desks' as any, v)}
                      min={0}
                      max={5}
                      label={t(language, 'spaces.office.desks')}
                    />
                    <ToggleField
                      checked={officeConfig.hasShelving}
                      onChange={(v) => updateConfig('hasShelving' as any, v)}
                      label={t(language, 'spaces.office.shelving')}
                    />
                  </div>
                  
                  {/* Floor Type */}
                  {showFloorSelector && areaDefinition.supportsFloorType && (
                    <FloorTypeSelector
                      value={officeConfig.floor.floorType}
                      onChange={(type) => onConfigChange({
                        floor: { ...officeConfig.floor, floorType: type }
                      } as any)}
                      language={language}
                    />
                  )}
                  
                  {/* Floor Location (multi-floor) */}
                  {maxFloors >= 1 && areaDefinition.supportsFloorLevel && (
                    <FloorLocationSelector
                      value={officeConfig.floor.floorLevel || 1}
                      onChange={(floor) => onConfigChange({
                        floor: { ...officeConfig.floor, floorLevel: floor }
                      } as any)}
                      maxFloors={maxFloors}
                      language={language}
                    />
                  )}
                  
                  {/* Ceiling Height */}
                  {showCeilingSelector && (
                    <CeilingHeightSelector
                      value={officeConfig.ceiling.ceilingHeight}
                      onChange={(height) => onConfigChange({
                        ceiling: { ceilingHeight: height }
                      } as any)}
                      language={language}
                    />
                  )}
                  
                  {/* Windows + Blinds */}
                  <CounterField
                    value={officeConfig.openings.windowCount}
                    onChange={(v) => onConfigChange({
                      openings: { ...officeConfig.openings, windowCount: v }
                    } as any)}
                    min={0}
                    max={8}
                    label={t(language, 'win.count')}
                  />
                  
                  <BlindsTypeSelector
                    value={officeConfig.openings.blindsType}
                    onChange={(blinds) => onConfigChange({
                      openings: { ...officeConfig.openings, blindsType: blinds }
                    } as any)}
                    language={language}
                    windowCount={officeConfig.openings.windowCount}
                  />
                  
                  {/* Baseboards (Deep/Move only) */}
                  {(isDeep || isMoveOut) && (
                    <ToggleField
                      checked={officeConfig.detail.baseboardsIncluded}
                      onChange={(v) => onConfigChange({
                        detail: { ...officeConfig.detail, baseboardsIncluded: v }
                      } as any)}
                      label={t(language, 'baseboards.included')}
                    />
                  )}
                </>
              )}
              
              {/* === LAUNDRY FIELDS === */}
              {laundryConfig && (
                <>
                  {/* Type: Closet vs Room */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t(language, 'spaces.laundry.type')}
                    </label>
                    <div className="flex gap-2">
                      {(['closet', 'room'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateConfig('type' as any, type)}
                          className={cn(
                            "flex-1 py-1.5 px-3 text-xs font-medium rounded-lg border-2 transition-all",
                            laundryConfig.type === type
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {t(language, `spaces.laundry.${type}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <SizeTierSelector
                    value={laundryConfig.size}
                    onChange={(size) => updateConfig('size' as any, size)}
                    language={language}
                    label={t(language, 'spaces.laundry.size')}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <ToggleField
                      checked={laundryConfig.hasSink}
                      onChange={(v) => updateConfig('hasSink' as any, v)}
                      label={t(language, 'spaces.laundry.sink')}
                    />
                    <ToggleField
                      checked={laundryConfig.hasCabinets}
                      onChange={(v) => updateConfig('hasCabinets' as any, v)}
                      label={t(language, 'spaces.laundry.cabinets')}
                    />
                  </div>
                  
                  {/* Floor Type */}
                  {showFloorSelector && areaDefinition.supportsFloorType && (
                    <FloorTypeSelector
                      value={laundryConfig.floor.floorType}
                      onChange={(type) => onConfigChange({
                        floor: { ...laundryConfig.floor, floorType: type }
                      } as any)}
                      language={language}
                    />
                  )}
                  
                  {/* Floor Location */}
                  {maxFloors >= 1 && areaDefinition.supportsFloorLevel && (
                    <FloorLocationSelector
                      value={laundryConfig.floor.floorLevel || 1}
                      onChange={(floor) => onConfigChange({
                        floor: { ...laundryConfig.floor, floorLevel: floor }
                      } as any)}
                      maxFloors={maxFloors}
                      language={language}
                    />
                  )}
                  
                  {/* Ceiling Height */}
                  {showCeilingSelector && (
                    <CeilingHeightSelector
                      value={laundryConfig.ceiling.ceilingHeight}
                      onChange={(height) => onConfigChange({
                        ceiling: { ceilingHeight: height }
                      } as any)}
                      language={language}
                    />
                  )}
                </>
              )}
              
              {/* === GARAGE FIELDS === */}
              {garageConfig && (
                <>
                  {/* Capacity: 1-2-3 car */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t(language, 'spaces.garage.capacity')}
                    </label>
                    <div className="flex gap-2">
                      {([1, 2, 3] as const).map((cap) => (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => updateConfig('capacity' as any, cap)}
                          className={cn(
                            "flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 transition-all",
                            garageConfig.capacity === cap
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {cap}-Car
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Storage Level */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t(language, 'spaces.garage.storage')}
                    </label>
                    <div className="flex gap-2">
                      {(['light', 'medium', 'heavy'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => updateConfig('storageLevel' as any, level)}
                          className={cn(
                            "flex-1 py-1.5 px-2 text-xs font-medium rounded-lg border-2 transition-all",
                            garageConfig.storageLevel === level
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {t(language, `spaces.garage.storage.${level}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Floor Condition */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t(language, 'spaces.garage.floor_condition')}
                    </label>
                    <div className="flex gap-2">
                      {(['concrete', 'coated', 'epoxy'] as const).map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => updateConfig('floorCondition' as any, cond)}
                          className={cn(
                            "flex-1 py-1.5 px-2 text-xs font-medium rounded-lg border-2 transition-all",
                            garageConfig.floorCondition === cond
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {t(language, `spaces.garage.floor.${cond}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Toggles */}
                  <div className="grid grid-cols-2 gap-3">
                    <ToggleField
                      checked={garageConfig.hasOilStains}
                      onChange={(v) => updateConfig('hasOilStains' as any, v)}
                      label={t(language, 'spaces.garage.oil_stains')}
                    />
                    <ToggleField
                      checked={garageConfig.hasShelving}
                      onChange={(v) => updateConfig('hasShelving' as any, v)}
                      label={t(language, 'spaces.garage.shelving')}
                    />
                    <ToggleField
                      checked={garageConfig.hasWorkbench}
                      onChange={(v) => updateConfig('hasWorkbench' as any, v)}
                      label={t(language, 'spaces.garage.workbench')}
                    />
                  </div>
                  
                  {/* Hazards */}
                  {garageConfig.hazards && (
                    <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          {t(language, 'hazards.title')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleField
                          checked={garageConfig.hazards.oilLeaks}
                          onChange={(v) => onConfigChange({
                            hazards: { ...garageConfig.hazards, oilLeaks: v }
                          } as any)}
                          label={t(language, 'spaces.garage.hazards.oil_leaks')}
                        />
                        <ToggleField
                          checked={garageConfig.hazards.heavyDebris}
                          onChange={(v) => onConfigChange({
                            hazards: { ...garageConfig.hazards, heavyDebris: v }
                          } as any)}
                          label={t(language, 'spaces.garage.hazards.heavy_debris')}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* === PATIO FIELDS === */}
              {patioConfig && (
                <>
                  {/* Type: Balcony/Patio/Terrace/Yard */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t(language, 'spaces.patio.type')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['balcony', 'patio', 'terrace', 'yard'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateConfig('type' as any, type)}
                          className={cn(
                            "py-1 px-2.5 text-xs font-medium rounded-md border transition-all",
                            patioConfig.type === type
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          {t(language, `spaces.patio.${type}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <SizeTierSelector
                    value={patioConfig.size}
                    onChange={(size) => updateConfig('size' as any, size)}
                    language={language}
                    label={t(language, 'spaces.patio.size')}
                  />
                  
                  {/* Surface Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t(language, 'spaces.patio.surface')}
                    </label>
                    <div className="flex gap-2">
                      {(['tile', 'concrete', 'wood_deck'] as const).map((surf) => (
                        <button
                          key={surf}
                          type="button"
                          onClick={() => updateConfig('surfaceType' as any, surf)}
                          className={cn(
                            "flex-1 py-1.5 px-2 text-xs font-medium rounded-lg border-2 transition-all",
                            patioConfig.surfaceType === surf
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {t(language, `spaces.patio.surface.${surf}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Toggles */}
                  <div className="grid grid-cols-2 gap-3">
                    <ToggleField
                      checked={patioConfig.hasFurniture}
                      onChange={(v) => updateConfig('hasFurniture' as any, v)}
                      label={t(language, 'spaces.patio.furniture')}
                    />
                    <ToggleField
                      checked={patioConfig.hasGlassRailing}
                      onChange={(v) => updateConfig('hasGlassRailing' as any, v)}
                      label={t(language, 'spaces.patio.glass_railing')}
                    />
                  </div>
                  
                  {/* Floor Location (balconies can be on any floor) */}
                  {maxFloors >= 1 && patioConfig.type === 'balcony' && (
                    <FloorLocationSelector
                      value={patioConfig.floor.floorLevel || 1}
                      onChange={(floor) => onConfigChange({
                        floor: { floorLevel: floor }
                      } as any)}
                      maxFloors={maxFloors}
                      language={language}
                    />
                  )}
                  
                  {/* Sliding Doors */}
                  <CounterField
                    value={patioConfig.openings.slidingDoorCount}
                    onChange={(v) => onConfigChange({
                      openings: { ...patioConfig.openings, slidingDoorCount: v }
                    } as any)}
                    min={0}
                    max={4}
                    label={t(language, 'spaces.patio.sliding_doors')}
                  />
                </>
              )}
              
              {/* Pricing Summary */}
              {pricing.price > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    {t(language, 'area.estimated_time')}: ~{pricing.timeMinutes} min
                  </span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    +${pricing.price}
                  </span>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
