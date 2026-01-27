import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { 
  RoomWindowSelection, 
  ROOM_WINDOW_CONFIG, 
  BLINDS_CONFIG, 
  WindowInventoryItem,
  WINDOW_TYPES,
  SILLS_TRACKS_CONFIG
} from '@/lib/roomWindowConfig';
import { useBooking } from '@/contexts/BookingContext';
import { 
  Minus, Plus, Check,
  AlignJustify, Columns, Package, Wrench, Sparkles
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { WindowTypeDrawer } from './WindowTypeDrawer';
import { WindowInventoryCard } from './WindowInventoryCard';

interface RoomWindowSectionCompactProps {
  roomId: string;
  roomType: string;
  roomLabel: string;
  language: Language;
  roomWindowSelection?: RoomWindowSelection;
  onUpdate?: (updates: Partial<RoomWindowSelection>) => void;
  showSillsTracks?: boolean; // Only for MOVING flow
  tracksIncludedByDefault?: boolean; // For Deep/Move flows - show as included benefit
  includedWindowsEnabled?: boolean; // For Deep/Move flows - show first N windows as "Included"
  includedWindowsLimit?: number; // How many windows are included (1 for kitchen, 2 for bedrooms, etc.)
}

export function RoomWindowSectionCompact({
  roomId,
  roomType,
  roomLabel,
  language,
  roomWindowSelection,
  onUpdate,
  showSillsTracks = false,
  tracksIncludedByDefault = false,
  includedWindowsEnabled = false,
  includedWindowsLimit = 0,
}: RoomWindowSectionCompactProps) {
  const { situation } = useBooking();
  const config = ROOM_WINDOW_CONFIG[roomType] || ROOM_WINDOW_CONFIG.bedroom;
  
  // Default values if no selection exists
  const inventory = roomWindowSelection?.windowInventory || [];
  const blindsCount = roomWindowSelection?.blindsCount || 0;
  const blindsType = roomWindowSelection?.blindsType || null;
  const includeSillsTracks = roomWindowSelection?.includeSillsTracks || false;
  
  const hasInventory = inventory.length > 0;
  
  // Calculate total panes for Sills & Tracks pricing
  const totalPanes = useMemo(() => {
    return inventory.reduce((sum, item) => sum + item.quantity, 0);
  }, [inventory]);
  
  // Calculate which inventory items are "included" (free) for Deep/Move flows
  // Only interior-only windows count toward the included limit
  const includedWindowsInfo = useMemo(() => {
    if (!includedWindowsEnabled || includedWindowsLimit <= 0) {
      return { includedIndices: new Set<number>(), includedValue: 0 };
    }
    
    let remaining = includedWindowsLimit;
    const includedIndices = new Set<number>();
    let includedValue = 0;
    
    inventory.forEach((item, index) => {
      // Only interior-only windows qualify for inclusion
      if (item.glassMode === 'interior' && remaining > 0) {
        const windowType = WINDOW_TYPES[item.typeId];
        const includedQty = Math.min(item.quantity, remaining);
        if (windowType && includedQty > 0) {
          includedIndices.add(index);
          includedValue += includedQty * windowType.pricePerSide;
          remaining -= includedQty;
        }
      }
    });
    
    return { includedIndices, includedValue };
  }, [inventory, includedWindowsEnabled, includedWindowsLimit]);
  
  // Calculate room price from inventory (with included windows discount)
  const roomPrice = useMemo(() => {
    let price = 0;
    
    // Inventory-based pricing
    inventory.forEach((item, index) => {
      const windowType = WINDOW_TYPES[item.typeId];
      if (!windowType || item.glassMode === null) return;
      
      const sideMultiplier = item.glassMode === 'both' ? 2 : 1;
      let itemPrice = item.quantity * windowType.pricePerSide * sideMultiplier;
      
      // Apply included discount for qualifying windows
      if (includedWindowsEnabled && includedWindowsInfo.includedIndices.has(index) && item.glassMode === 'interior') {
        const includedQty = Math.min(item.quantity, includedWindowsLimit);
        const discount = includedQty * windowType.pricePerSide;
        itemPrice = Math.max(0, itemPrice - discount);
      }
      
      price += itemPrice;
    });
    
    // Blinds pricing
    if (blindsCount > 0) {
      price += blindsCount * (blindsType === 'shutters' ? BLINDS_CONFIG.shutters.price : BLINDS_CONFIG.standard.price);
    }
    
    // Sills & Tracks pricing
    if (includeSillsTracks && totalPanes > 0) {
      price += totalPanes * SILLS_TRACKS_CONFIG.pricePerWindow;
    }
    
    return price;
  }, [inventory, blindsCount, blindsType, includeSillsTracks, totalPanes, includedWindowsEnabled, includedWindowsLimit, includedWindowsInfo]);
  
  const isSelected = hasInventory || blindsCount > 0;
  const showBlinds = config?.blindsTypical !== null;
  
  // Determine default glass mode based on flow
  const defaultGlassMode = situation === 'MOVING' ? 'both' : 'interior';
  
  // Add window type to inventory
  const handleAddWindowType = useCallback((typeId: string) => {
    const newItem: WindowInventoryItem = {
      typeId,
      quantity: 1,
      glassMode: defaultGlassMode,
    };
    onUpdate?.({ 
      windowInventory: [...inventory, newItem],
      glassMode: defaultGlassMode,
    });
  }, [inventory, onUpdate, defaultGlassMode]);
  
  // Update inventory item
  const handleUpdateInventoryItem = useCallback((index: number, updates: Partial<WindowInventoryItem>) => {
    const newInventory = [...inventory];
    newInventory[index] = { ...newInventory[index], ...updates };
    onUpdate?.({ windowInventory: newInventory });
  }, [inventory, onUpdate]);
  
  // Remove inventory item
  const handleRemoveInventoryItem = useCallback((index: number) => {
    const newInventory = inventory.filter((_, i) => i !== index);
    onUpdate?.({ 
      windowInventory: newInventory,
      glassMode: newInventory.length === 0 ? 'none' : roomWindowSelection?.glassMode || 'none',
    });
  }, [inventory, onUpdate, roomWindowSelection]);

  const handleBlindsChange = (delta: number) => {
    const maxBlinds = inventory.reduce((sum, item) => sum + item.quantity, 0) || 10;
    const newCount = Math.max(0, Math.min(maxBlinds, blindsCount + delta));
    onUpdate?.({ 
      blindsCount: newCount,
      blindsType: newCount > 0 ? (blindsType || config?.blindsTypical || 'standard') : null
    });
  };

  const handleBlindsTypeChange = (type: 'standard' | 'shutters') => {
    if (blindsCount > 0) {
      onUpdate?.({ blindsType: type });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {t(language, 'win.section_title') || 'Windows in This Area'}
          </span>
          {includedWindowsEnabled && includedWindowsLimit > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
              {includedWindowsLimit} {t(language, 'win.included_badge') || 'Included'}
            </span>
          )}
        </div>
        {roomPrice > 0 && (
          <span className="text-xs font-bold text-primary">+${roomPrice}</span>
        )}
        {roomPrice === 0 && includedWindowsInfo.includedValue > 0 && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ${includedWindowsInfo.includedValue} {t(language, 'win.included_value') || 'value'}
          </span>
        )}
      </div>

      {/* Window Inventory Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Package className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {t(language, 'wintype.inventory') || 'Window Inventory'}
            </span>
          </div>
          {hasInventory && (
            <span className="text-[10px] text-muted-foreground">
              {totalPanes} {t(language, 'wintype.panes') || 'panes'}
            </span>
          )}
        </div>
        
        {/* Inventory Items */}
        {hasInventory && (
          <div className="space-y-1.5 overflow-hidden">
            {inventory.map((item, index) => {
              // Determine if this item is included (free) - only for interior-only windows within limit
              const isItemIncluded = includedWindowsEnabled && 
                includedWindowsInfo.includedIndices.has(index) && 
                item.glassMode === 'interior';
              
              return (
                <WindowInventoryCard
                  key={`${item.typeId}-${index}`}
                  item={item}
                  onUpdate={(updates) => handleUpdateInventoryItem(index, updates)}
                  onRemove={() => handleRemoveInventoryItem(index)}
                  isIncluded={isItemIncluded}
                />
              );
            })}
          </div>
        )}
        
        {/* Add Window Type Button */}
        <WindowTypeDrawer onSelectType={handleAddWindowType} />
      </div>

      {/* Window Tracks - Always show as INCLUDED for Deep/Move flows (regardless of inventory) */}
      {tracksIncludedByDefault && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                {t(language, 'win.tracks_always_included')}
              </span>
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400">
                {t(language, 'win.tracks_always_included_desc')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Sills & Tracks Section - Only show toggle for Standard Clean with inventory */}
      {showSillsTracks && hasInventory && !tracksIncludedByDefault && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
                  {t(language, 'win.sills_tracks') || 'Sills & Tracks Detailing'}
                </span>
              </div>
              <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">
                {t(language, 'win.sills_tracks_hint') || 'Recommended for deposit return'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {includeSillsTracks && (
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  +${totalPanes * SILLS_TRACKS_CONFIG.pricePerWindow}
                </span>
              )}
              <Switch 
                checked={includeSillsTracks}
                onCheckedChange={(checked) => onUpdate?.({ includeSillsTracks: checked })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Blinds Section - Only show if room typically has blinds */}
      {showBlinds && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-muted-foreground">
              {t(language, 'win.blinds') || 'Blinds/Shutters'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBlindsChange(-1)}
                className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                disabled={blindsCount <= 0}
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className="w-4 text-center font-semibold text-[10px]">{blindsCount}</span>
              <button
                type="button"
                onClick={() => handleBlindsChange(1)}
                className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          
          {/* Blinds Type Toggle */}
          {blindsCount > 0 && (
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleBlindsTypeChange('standard')}
                className={cn(
                  "py-1 px-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                  blindsType === 'standard'
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-background border border-border hover:bg-muted/50"
                )}
              >
                <AlignJustify className="w-2.5 h-2.5" />
                {t(language, 'blind.standard_short') || 'Blinds'}
              </button>
              <button
                type="button"
                onClick={() => handleBlindsTypeChange('shutters')}
                className={cn(
                  "py-1 px-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                  blindsType === 'shutters'
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-background border border-border hover:bg-muted/50"
                )}
              >
                <Columns className="w-2.5 h-2.5" />
                {t(language, 'blind.shutters_short') || 'Shutters'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
