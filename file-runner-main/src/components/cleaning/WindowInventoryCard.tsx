import { cn } from '@/lib/utils';
import { WindowInventoryItem, WINDOW_TYPES } from '@/lib/roomWindowConfig';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface WindowInventoryCardProps {
  item: WindowInventoryItem;
  onUpdate: (updates: Partial<WindowInventoryItem>) => void;
  onRemove: () => void;
  isIncluded?: boolean;  // Show "Included" badge instead of price (Deep/Move flows)
}

export function WindowInventoryCard({ item, onUpdate, onRemove, isIncluded = false }: WindowInventoryCardProps) {
  const { language } = useBooking();
  const isMobile = useIsMobile();
  const windowType = WINDOW_TYPES[item.typeId];
  
  if (!windowType) return null;
  
  // Calculate line total - null glassMode = $0
  // If included, interior-only is $0, but switching to 'both' shows upgrade price
  const sideMultiplier = item.glassMode === 'both' ? 2 : item.glassMode === null ? 0 : 1;
  const lineTotal = item.quantity * windowType.pricePerSide * sideMultiplier;
  
  // For included windows, only interior is free - exterior or both shows price
  const isIncludedFree = isIncluded && item.glassMode === 'interior';
  const displayTotal = isIncludedFree ? 0 : lineTotal;
  
  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, Math.min(20, item.quantity + delta));
    onUpdate({ quantity: newQty });
  };
  
  // Toggle glass mode - clicking active mode deselects (sets to null)
  const handleGlassModeChange = (mode: 'interior' | 'exterior' | 'both') => {
    if (item.glassMode === mode) {
      onUpdate({ glassMode: null });  // Deselect
    } else {
      onUpdate({ glassMode: mode });
    }
  };

  const glassModes = ['interior', 'exterior', 'both'] as const;

  return (
    <div className={cn(
      "rounded-lg border transition-all p-3",
      // Mobile: Stack vertically | Desktop: 2-row grid layout
      isMobile 
        ? "space-y-3" 
        : "grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 items-center",
      // Visual separation with background
      "bg-muted/40 border-border/50",
      // Active indicator - left border + shadow when glass mode selected
      item.glassMode !== null 
        ? "border-l-4 border-l-primary bg-primary/5 shadow-sm" 
        : "border-l-4 border-l-transparent opacity-90"
    )}>
      {/* ROW 1: Icon + Name + Price per side */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg flex-shrink-0">{windowType.emoji}</span>
        <div className="min-w-0 flex-1">
          <span 
            className="text-sm font-medium text-foreground block truncate"
            title={t(language, windowType.labelKey) || item.typeId.replace(/_/g, ' ')}
          >
            {t(language, windowType.labelKey) || item.typeId.replace(/_/g, ' ')}
          </span>
          <span className="text-[11px] text-muted-foreground">
            ${windowType.pricePerSide}/side
          </span>
        </div>
        
        {/* Delete Button - Mobile: in row 1 */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Delete Button - Desktop: Row 1, Column 2 */}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive justify-self-end"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
      
      {/* ROW 2: Glass Mode Toggles + Quantity + Price */}
      <div className={cn(
        "flex items-center",
        isMobile 
          ? "w-full flex-col gap-3" 
          : "col-span-2 justify-between gap-4"
      )}>
        {/* Glass Mode Toggles */}
        <div className={cn(
          "flex",
          isMobile ? "w-full gap-1" : "gap-0.5 flex-shrink-0"
        )}>
          {glassModes.map((mode, index) => (
            <button
              key={mode}
              onClick={() => handleGlassModeChange(mode)}
              className={cn(
                "font-medium transition-all text-xs",
                // Mobile: Full width, tall buttons | Desktop: Compact fit
                isMobile 
                  ? "flex-1 py-3 px-2 rounded-lg min-h-[44px]" 
                  : "px-3 py-1.5 min-h-[32px]",
                // Desktop: Rounded ends
                !isMobile && index === 0 && "rounded-l-md",
                !isMobile && index === 2 && "rounded-r-md",
                // Active state
                item.glassMode === mode
                  ? mode === 'both' 
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm"
                    : "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background border border-border hover:bg-muted",
                // Deselected state - slightly muted
                item.glassMode === null && "opacity-80"
              )}
            >
              {mode === 'interior' 
                ? (t(language, 'win.in') || 'In')
                : mode === 'exterior' 
                  ? (t(language, 'win.out') || 'Out')
                  : (t(language, 'win.both') || 'Both')
              }
            </button>
          ))}
        </div>
        
        {/* Quantity Controls + Line Total */}
        <div className={cn(
          "flex items-center",
          isMobile ? "w-full justify-between" : "gap-3"
        )}>
          {/* Quantity Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleQuantityChange(-1)}
              className={cn(
                "rounded-full bg-background border border-border flex items-center justify-center",
                "hover:bg-muted transition-colors active:scale-95",
                isMobile ? "w-10 h-10" : "w-7 h-7"
              )}
              disabled={item.quantity <= 1}
            >
              <Minus className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
            </button>
            <span className={cn(
              "text-center font-semibold",
              isMobile ? "w-8 text-base" : "w-6 text-sm"
            )}>
              {item.quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              className={cn(
                "rounded-full bg-background border border-border flex items-center justify-center",
                "hover:bg-muted transition-colors active:scale-95",
                isMobile ? "w-10 h-10" : "w-7 h-7"
              )}
              disabled={item.quantity >= 20}
            >
              <Plus className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
            </button>
          </div>
          
          {/* Line Total or Included Badge */}
          <span className={cn(
            "font-bold min-w-[50px] text-right",
            isMobile ? "text-base" : "text-sm",
            isIncludedFree ? "text-emerald-600 dark:text-emerald-400" :
            item.glassMode === null ? "text-muted-foreground" : "text-primary"
          )}>
            {isIncludedFree ? '✓ Included' : item.glassMode === null ? '$0' : `$${displayTotal}`}
          </span>
        </div>
      </div>
    </div>
  );
}
