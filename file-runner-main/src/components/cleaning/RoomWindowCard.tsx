import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  RoomWindowSelection, 
  ROOM_WINDOW_CONFIG, 
  BLINDS_CONFIG, 
  WindowInventoryItem,
  WINDOW_TYPES,
  SILLS_TRACKS_CONFIG
} from '@/lib/roomWindowConfig';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { 
  ChefHat, Sofa, Crown, Bed, Bath, 
  Minus, Plus, Check,
  AlignJustify, Columns, Package, Wrench
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { WindowTypeDrawer } from './WindowTypeDrawer';
import { WindowInventoryCard } from './WindowInventoryCard';

const iconMap: Record<string, React.ReactNode> = {
  ChefHat: <ChefHat className="w-5 h-5" />,
  Sofa: <Sofa className="w-5 h-5" />,
  Crown: <Crown className="w-5 h-5" />,
  Bed: <Bed className="w-5 h-5" />,
  Bath: <Bath className="w-5 h-5" />,
};

interface RoomWindowCardProps {
  room: RoomWindowSelection;
  onUpdate: (updates: Partial<RoomWindowSelection>) => void;
  compact?: boolean;
}

export function RoomWindowCard({ room, onUpdate, compact = false }: RoomWindowCardProps) {
  const { language, formData, situation } = useBooking();
  const config = ROOM_WINDOW_CONFIG[room.roomType];
  
  const inventory = room.windowInventory || [];
  const hasInventory = inventory.length > 0;
  
  // Calculate total panes for Sills & Tracks pricing
  const totalPanes = useMemo(() => {
    return inventory.reduce((sum, item) => sum + item.quantity, 0);
  }, [inventory]);
  
  // Calculate room price from inventory
  const roomPrice = useMemo(() => {
    let price = 0;
    
    // Inventory-based pricing
    for (const item of inventory) {
      const windowType = WINDOW_TYPES[item.typeId];
      if (!windowType || item.glassMode === null) continue;  // Skip null glass modes
      const sideMultiplier = item.glassMode === 'both' ? 2 : 1;
      price += item.quantity * windowType.pricePerSide * sideMultiplier;
    }
    
    // Blinds pricing
    if (room.blindsCount > 0) {
      price += room.blindsCount * (room.blindsType === 'shutters' ? BLINDS_CONFIG.shutters.price : BLINDS_CONFIG.standard.price);
    }
    
    // Sills & Tracks pricing
    if (room.includeSillsTracks && totalPanes > 0) {
      price += totalPanes * SILLS_TRACKS_CONFIG.pricePerWindow;
    }
    
    return price;
  }, [inventory, room.blindsCount, room.blindsType, room.includeSillsTracks, totalPanes]);
  
  const isSelected = hasInventory || room.blindsCount > 0;
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
    onUpdate({ 
      windowInventory: [...inventory, newItem],
      glassMode: defaultGlassMode, // Keep legacy in sync
    });
  }, [inventory, onUpdate, defaultGlassMode]);
  
  // Update inventory item
  const handleUpdateInventoryItem = useCallback((index: number, updates: Partial<WindowInventoryItem>) => {
    const newInventory = [...inventory];
    newInventory[index] = { ...newInventory[index], ...updates };
    onUpdate({ windowInventory: newInventory });
  }, [inventory, onUpdate]);
  
  // Remove inventory item
  const handleRemoveInventoryItem = useCallback((index: number) => {
    const newInventory = inventory.filter((_, i) => i !== index);
    onUpdate({ 
      windowInventory: newInventory,
      glassMode: newInventory.length === 0 ? 'none' : room.glassMode,
    });
  }, [inventory, onUpdate, room.glassMode]);

  const handleBlindsChange = (delta: number) => {
    const maxBlinds = inventory.reduce((sum, item) => sum + item.quantity, 0) || room.windowCount || 10;
    const newCount = Math.max(0, Math.min(maxBlinds, room.blindsCount + delta));
    onUpdate({ 
      blindsCount: newCount,
      blindsType: newCount > 0 ? (room.blindsType || config?.blindsTypical || 'standard') : null
    });
  };

  const handleBlindsTypeChange = (type: 'standard' | 'shutters') => {
    if (room.blindsCount > 0) {
      onUpdate({ blindsType: type });
    }
  };

  return (
    <div 
      className={cn(
        "relative rounded-xl border-2 transition-all duration-200",
        compact ? "p-3" : "p-4",
        isSelected 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-2 ring-primary/20" 
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
          <Check className="w-3 h-3" />
        </div>
      )}

      {/* Header */}
      <div className={cn("flex items-start justify-between", compact ? "mb-2" : "mb-3")}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {iconMap[config?.icon || 'Bed']}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">{room.roomLabel}</h4>
            <p className="text-xs text-muted-foreground">{config?.windowFocus}</p>
          </div>
        </div>
        
        {/* Room price */}
        {roomPrice > 0 && (
          <span className="text-sm font-bold text-primary">+${roomPrice}</span>
        )}
      </div>

      {/* Window Inventory Section */}
      <div className={cn("space-y-2", compact ? "mb-2" : "mb-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t(language, 'wintype.inventory') || 'Window Inventory'}
            </span>
          </div>
          {hasInventory && (
            <span className="text-[10px] text-muted-foreground">
              {inventory.reduce((sum, i) => sum + i.quantity, 0)} {t(language, 'wintype.panes') || 'panes'}
            </span>
          )}
        </div>
        
        {/* Inventory Items */}
        {hasInventory && (
          <div className="space-y-1.5 overflow-hidden">
            {inventory.map((item, index) => (
              <WindowInventoryCard
                key={`${item.typeId}-${index}`}
                item={item}
                onUpdate={(updates) => handleUpdateInventoryItem(index, updates)}
                onRemove={() => handleRemoveInventoryItem(index)}
              />
            ))}
          </div>
        )}
        
        {/* Add Window Type Button */}
        <WindowTypeDrawer onSelectType={handleAddWindowType} />
      </div>

      {/* Sills & Tracks Section - Show for MOVING flow with inventory */}
      {situation === 'MOVING' && hasInventory && (
        <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  {t(language, 'win.sills_tracks') || 'Sills & Tracks Detailing'}
                </span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                {t(language, 'win.sills_tracks_hint') || 'Recommended for deposit return'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {room.includeSillsTracks && (
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  +${totalPanes * SILLS_TRACKS_CONFIG.pricePerWindow}
                </span>
              )}
              <Switch 
                checked={room.includeSillsTracks || false}
                onCheckedChange={(checked) => onUpdate({ includeSillsTracks: checked })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Blinds Section - Only show if room typically has blinds */}
      {showBlinds && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t(language, 'win.blinds') || 'Blinds/Shutters'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBlindsChange(-1)}
                className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                disabled={room.blindsCount <= 0}
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className="w-4 text-center font-semibold text-xs">{room.blindsCount}</span>
              <button
                onClick={() => handleBlindsChange(1)}
                className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
          
          {/* Blinds Type Toggle */}
          {room.blindsCount > 0 && (
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => handleBlindsTypeChange('standard')}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1",
                  room.blindsType === 'standard'
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-background border border-border hover:bg-muted/50"
                )}
              >
                <AlignJustify className="w-3 h-3" />
                {t(language, 'blind.standard_short') || 'Blinds'}
              </button>
              <button
                onClick={() => handleBlindsTypeChange('shutters')}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1",
                  room.blindsType === 'shutters'
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-background border border-border hover:bg-muted/50"
                )}
              >
                <Columns className="w-3 h-3" />
                {t(language, 'blind.shutters_short') || 'Shutters'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
