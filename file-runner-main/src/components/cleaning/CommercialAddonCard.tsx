import { cn } from '@/lib/utils';
import { Minus, Plus, Check, Square, DoorOpen, Lightbulb, Wind, Droplets, Trash2, Truck, Layers, AlertTriangle, Package } from 'lucide-react';
import { CommercialAddonConfig } from '@/lib/pricing_commercial';
import { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Square,
  DoorOpen,
  Lightbulb,
  Wind,
  Droplets,
  Trash2,
  Truck,
  Layers,
  AlertTriangle,
  Package,
};

interface CommercialAddonCardProps {
  addon: CommercialAddonConfig;
  isSelected: boolean;
  quantity: number;
  onToggle: (id: string) => void;
  onQuantityChange: (id: string, qty: number) => void;
  sqft?: number;
}

export function CommercialAddonCard({ 
  addon, 
  isSelected, 
  quantity, 
  onToggle, 
  onQuantityChange,
  sqft = 0
}: CommercialAddonCardProps) {
  // Get icon from map
  const IconComponent = iconMap[addon.icon] || Package;
  
  // Calculate display price
  const displayPrice = addon.isSqftBased 
    ? `$${(addon.price * sqft).toLocaleString()}` 
    : `$${addon.price}${addon.unit || ''}`;

  // Calculate total for quantity items
  const totalPrice = addon.hasQuantity && isSelected
    ? (addon.isSqftBased ? addon.price * sqft * quantity : addon.price * quantity)
    : (addon.isSqftBased ? addon.price * sqft : addon.price);
  
  const handleClick = () => {
    if (!addon.hasQuantity) {
      onToggle(addon.id);
    } else if (!isSelected) {
      onToggle(addon.id);
    }
  };

  const handleQuantityChange = (newQty: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (newQty <= 0) {
      onToggle(addon.id);
    } else {
      onQuantityChange(addon.id, newQty);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative flex items-center gap-4 p-4 rounded-xl cursor-pointer select-none',
        'border-2 transition-all duration-200 active:scale-[0.99]',
        'touch-manipulation',
        isSelected
          ? 'border-amber-500 bg-amber-500/[0.05] shadow-[0_0_0_2px_hsl(40,95%,50%,0.15)]'
          : 'border-border bg-card hover:border-amber-500/40 hover:bg-muted/20'
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-sm animate-fade-in-scale">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}
      
      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        'transition-colors duration-200',
        isSelected ? 'bg-amber-500/10 text-amber-600' : 'bg-muted/50 text-muted-foreground'
      )}>
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-semibold text-foreground leading-snug">
          {addon.description}
        </h5>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn(
            'text-sm font-bold',
            isSelected ? 'text-amber-600' : 'text-amber-600/80'
          )}>
            {displayPrice}
          </span>
          {addon.hasQuantity && isSelected && quantity > 1 && (
            <span className="text-xs text-muted-foreground">
              × {quantity} = ${totalPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      
      {/* Quantity Controls */}
      {addon.hasQuantity && (
        <div 
          className="flex items-center gap-2 flex-shrink-0" 
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => handleQuantityChange(quantity - 1, e)}
            className={cn(
              'w-10 h-10 rounded-full border-2 border-border bg-card',
              'flex items-center justify-center',
              'transition-all duration-150 active:scale-90 touch-manipulation',
              'hover:border-amber-500 hover:bg-amber-500/5'
            )}
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4 text-amber-600" />
          </button>
          <span className="text-base font-bold w-8 text-center tabular-nums">
            {isSelected ? quantity : 0}
          </span>
          <button
            type="button"
            onClick={(e) => handleQuantityChange(quantity + 1, e)}
            className={cn(
              'w-10 h-10 rounded-full border-2 border-border bg-card',
              'flex items-center justify-center',
              'transition-all duration-150 active:scale-90 touch-manipulation',
              'hover:border-amber-500 hover:bg-amber-500/5'
            )}
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      )}
    </div>
  );
}
