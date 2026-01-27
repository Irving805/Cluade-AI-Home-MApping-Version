/**
 * BathroomMappingSection — Premium bathroom inventory UI
 * 
 * Features:
 * - Quick count steppers at top (Master/Full/Half)
 * - Auto-expand cards when bathrooms > 0 (no click required)
 * - Floor tabs for multi-floor properties
 * - Per-unit configuration (fixtures, glass, vanity, etc.)
 * - Auto-fill from presets, isCustomized + floorCustomized tracking
 * 
 * IMPORTANT: Uses PricingTier ('std' | 'deep') for bathroom pricing.
 * "Move-In/Out" is UX branding only - bathrooms use STANDARD tier.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Bath, Minus, Plus, ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import type { Situation } from '@/contexts/BookingContext';
import type { BathroomInventory, BathroomUnit } from '@/lib/bathroomMappingTypes';
import type { FloorId } from '@/lib/floorLocationTypes';
import type { PricingTier } from '@/lib/pricingTier';
import { getFloorOptions, getFloorLabel } from '@/lib/floorLocationTypes';
import { 
  syncInventoryWithCounts, 
  updateBathroomUnit as updateBathroomUnitHelper,
  hasCustomizedBathrooms,
} from '@/lib/bathroomPresets';
import { calculateBathroomInventoryTotals, getBathroomBaseRateForDisplay } from '@/lib/bathroomPricing';
import { BathroomUnitCard } from './BathroomUnitCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BathroomMappingSectionProps {
  language: Language;
  tier: PricingTier;  // Changed from isDeep: boolean
  situation: Situation;
  // Legacy counts (for stepper controls)
  masterBaths: number;
  fullBaths: number;
  halfBaths: number;
  onMasterChange: (count: number) => void;
  onFullChange: (count: number) => void;
  onHalfChange: (count: number) => void;
  // Inventory
  inventory: BathroomInventory | undefined;
  onInventoryChange: (inventory: BathroomInventory) => void;
  // Floor SSOT (from The Structure section)
  propertyFloors?: number;
}

// Quick Count Stepper component
function QuickCountStepper({
  label,
  count,
  onChange,
  price,
  max = 10,
}: {
  label: string;
  count: number;
  onChange: (count: number) => void;
  price: number;
  max?: number;
}) {
  return (
    <div className={cn(
      'flex flex-col justify-between p-3 rounded-xl border transition-all duration-200',
      count > 0 
        ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-900/10' 
        : 'border-border bg-card'
    )}>
      <div className="mb-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <p className="text-[10px] font-medium text-rose-600">+${price.toFixed(2)}</p>
      </div>
      
      <div className="flex items-center justify-between">
        <button 
          type="button"
          onClick={() => count > 0 && onChange(count - 1)}
          disabled={count <= 0}
          className="h-7 w-7 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-rose-400 hover:text-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-4 text-center font-bold text-foreground text-sm tabular-nums">
          {count}
        </span>
        <button 
          type="button"
          onClick={() => count < max && onChange(count + 1)}
          disabled={count >= max}
          className="h-7 w-7 flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-emerald-400 hover:text-emerald-500 disabled:opacity-50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Floor Tabs component for multi-floor filtering
function FloorTabs({
  propertyFloors,
  selectedFloor,
  onFloorChange,
  bathroomsByFloor,
  language,
}: {
  propertyFloors: number;
  selectedFloor: 'all' | FloorId;
  onFloorChange: (floor: 'all' | FloorId) => void;
  bathroomsByFloor: Record<FloorId, number>;
  language: Language;
}) {
  const floorOptions = getFloorOptions(propertyFloors);
  
  // Only show tabs if multi-floor
  if (propertyFloors < 2) return null;
  
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg overflow-x-auto">
      <button
        type="button"
        className={cn(
          'px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap',
          selectedFloor === 'all'
            ? 'bg-rose-500 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        onClick={() => onFloorChange('all')}
      >
        All Floors
      </button>
      {floorOptions.map(floor => {
        const count = bathroomsByFloor[floor] || 0;
        return (
          <button
            key={floor}
            type="button"
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5',
              selectedFloor === floor
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onClick={() => onFloorChange(floor)}
          >
            {getFloorLabel(floor, language)}
            {count > 0 && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                selectedFloor === floor
                  ? 'bg-white/20 text-white'
                  : 'bg-muted-foreground/20'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function BathroomMappingSection({
  language,
  tier,  // Changed from isDeep
  situation,
  masterBaths,
  fullBaths,
  halfBaths,
  onMasterChange,
  onFullChange,
  onHalfChange,
  inventory,
  onInventoryChange,
  propertyFloors = 1,
}: BathroomMappingSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<'all' | FloorId>('all');
  
  // Track previous inventory length for smart auto-expand of NEW units only
  const prevLengthRef = useRef(inventory?.bathrooms?.length || 0);
  
  // Sync inventory when counts or propertyFloors change
  useEffect(() => {
    const synced = syncInventoryWithCounts(
      inventory, masterBaths, fullBaths, halfBaths, situation, propertyFloors
    );
    
    // Only update if changed
    if (JSON.stringify(synced) !== JSON.stringify(inventory)) {
      onInventoryChange(synced);
    }
  }, [masterBaths, fullBaths, halfBaths, situation, propertyFloors]);
  
  // Handle unit update
  const handleUnitChange = useCallback((unitId: string, updates: Partial<BathroomUnit>) => {
    if (!inventory) return;
    const updated = updateBathroomUnitHelper(inventory, unitId, updates);
    onInventoryChange(updated);
  }, [inventory, onInventoryChange]);
  
  // Toggle expand for a unit
  const toggleExpand = useCallback((unitId: string) => {
    setExpandedId(prev => prev === unitId ? null : unitId);
  }, []);
  
  // Count by floor for tab badges
  const bathroomsByFloor = useMemo(() => {
    if (!inventory?.bathrooms) return {} as Record<FloorId, number>;
    return inventory.bathrooms.reduce((acc, b) => {
      acc[b.floorId] = (acc[b.floorId] || 0) + 1;
      return acc;
    }, {} as Record<FloorId, number>);
  }, [inventory]);
  
  // Filter bathrooms by selected floor
  const filteredBathrooms = useMemo(() => {
    if (!inventory?.bathrooms) return [];
    if (selectedFloor === 'all') return inventory.bathrooms;
    return inventory.bathrooms.filter(b => b.floorId === selectedFloor);
  }, [inventory, selectedFloor]);
  
  // Smart auto-expand: target NEW units or units with INVALID floor (remapped)
  useEffect(() => {
    if (!inventory?.bathrooms?.length) {
      setExpandedId(null);
      prevLengthRef.current = 0;
      return;
    }
    
    const currentLength = inventory.bathrooms.length;
    const prevLength = prevLengthRef.current;
    
    // Detect new unit added - auto-expand it
    if (currentLength > prevLength && currentLength > 0) {
      // Find the newest unit (last one added)
      const newestUnit = inventory.bathrooms[inventory.bathrooms.length - 1];
      setExpandedId(newestUnit.id);
    }
    // Detect unit with floor remap (needs attention)
    else if (!expandedId) {
      const needsAttention = inventory.bathrooms.find(b => b.floorRemappedFrom);
      if (needsAttention) {
        setExpandedId(needsAttention.id);
      }
    }
    
    prevLengthRef.current = currentLength;
  }, [inventory?.bathrooms?.length, inventory?.bathrooms]);
  
  // Calculate totals using inventory SSOT with tier
  const totals = calculateBathroomInventoryTotals(
    inventory, masterBaths, fullBaths, halfBaths, tier
  );
  
  // Display base rates for QuickCountSteppers (pure BATH_RATES without modifiers)
  const displayDeltas = useMemo(() => ({
    master: getBathroomBaseRateForDisplay('master', tier),
    full: getBathroomBaseRateForDisplay('full', tier),
    half: getBathroomBaseRateForDisplay('half', tier),
  }), [tier]);
  
  const totalBathrooms = masterBaths + fullBaths + halfBaths;
  const hasCustomized = hasCustomizedBathrooms(inventory);
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-md text-rose-600 dark:text-rose-400">
            <Bath className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-foreground uppercase tracking-wide">
            {t(language, 'label.bathroom_section')}
          </span>
          {propertyFloors >= 2 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Layers className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">
                      {propertyFloors} floors
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assign bathrooms to floors using tabs below</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* Total badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {totalBathrooms} bath{totalBathrooms !== 1 ? 's' : ''}
          </span>
          <span className="text-sm font-bold text-rose-600">
            ${totals.totalPrice}
          </span>
        </div>
      </div>
      
      {/* Quick Count Steppers Row */}
      <div className="grid grid-cols-3 gap-3">
        <QuickCountStepper 
          label="Master"
          count={masterBaths}
          onChange={onMasterChange}
          price={displayDeltas.master}
        />
        <QuickCountStepper 
          label="Full"
          count={fullBaths}
          onChange={onFullChange}
          price={displayDeltas.full}
        />
        <QuickCountStepper 
          label="Half"
          count={halfBaths}
          onChange={onHalfChange}
          price={displayDeltas.half}
        />
      </div>
      
      {/* Helper Copy */}
      <p className="text-[11px] text-muted-foreground px-1">
        {t(language, 'bath.helper_copy') || 
          'Pre-filled based on your home. Tap a bathroom below to customize fixtures, glass, and condition.'}
      </p>
      
      {/* Auto-expand Bathroom Cards Section (No collapsible - auto-rendered when bathrooms > 0) */}
      {totalBathrooms > 0 && (
        <div className="space-y-3">
          {/* Floor Tabs - only for multi-floor */}
          <FloorTabs
            propertyFloors={propertyFloors}
            selectedFloor={selectedFloor}
            onFloorChange={setSelectedFloor}
            bathroomsByFloor={bathroomsByFloor}
            language={language}
          />
          
          {/* Section header with modified badge */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-foreground">
              Customize Each Bathroom
            </span>
            {hasCustomized && (
              <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full">
                Modified
              </span>
            )}
          </div>
          
          {/* Bathroom Unit Cards - filtered by floor */}
          <div className="space-y-2">
            {filteredBathrooms.map((unit) => (
              <BathroomUnitCard
                key={unit.id}
                language={language}
                unit={unit}
                tier={tier}  // Changed from isDeep
                isExpanded={expandedId === unit.id}
                onToggleExpand={() => toggleExpand(unit.id)}
                onChange={(updates) => handleUnitChange(unit.id, updates)}
                propertyFloors={propertyFloors}
              />
            ))}
            
            {/* Empty state for filtered floor */}
            {filteredBathrooms.length === 0 && selectedFloor !== 'all' && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No bathrooms on {getFloorLabel(selectedFloor, language)}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Summary Row */}
      {totalBathrooms > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-xs">
          <span className="text-muted-foreground">
            {totals.usedInventory ? 'Customized pricing' : 'Standard pricing'}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              ~{totals.totalTime} min
            </span>
            <span className="font-bold text-rose-600">
              ${totals.totalPrice}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
