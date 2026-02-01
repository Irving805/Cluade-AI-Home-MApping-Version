import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Minus, Plus, Check } from 'lucide-react';

interface AddonCardProps {
  value: string;
  labelKey: string;
  price: number;
  hasQuantity?: boolean;
  unit?: string;
  icon?: React.ReactNode;
}

export function AddonCard({ value, labelKey, price, hasQuantity, unit, icon }: AddonCardProps) {
  const { language, selectedAddons, toggleAddon, updateAddonQuantity } = useBooking();
  
  const addon = selectedAddons.find((a) => a.value === value);
  const isSelected = !!addon;
  const quantity = addon?.quantity || 1;

  const handleClick = () => {
    if (!hasQuantity) {
      toggleAddon(value);
    } else if (!isSelected) {
      toggleAddon(value, 1);
    }
  };

  const handleQuantityChange = (newQty: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (newQty <= 0) {
      toggleAddon(value);
    } else {
      if (!isSelected) {
        toggleAddon(value, newQty);
      } else {
        updateAddonQuantity(value, newQty);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl cursor-pointer select-none',
        'border-2 transition-all duration-200 active:scale-[0.98]',
        'min-h-[auto]',
        isSelected
          ? 'border-primary bg-primary/[0.03] shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]'
          : 'border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/20'
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm animate-fade-in-scale">
          <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
        </div>
      )}
      
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            'transition-colors duration-200',
            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-semibold text-foreground leading-snug break-words hyphens-auto">
            {t(language, labelKey)}
          </h5>
          <span className={cn(
            'text-sm font-bold inline-block mt-0.5',
            isSelected ? 'text-primary' : 'text-primary/80'
          )}>
            ${price}
            {unit && <span className="text-muted-foreground font-medium">{unit}</span>}
          </span>
        </div>
      </div>
      
      {hasQuantity && (
        <div 
          className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0 sm:ml-3 self-end sm:self-center" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile: 44x44px tap targets for WCAG compliance */}
          <button
            type="button"
            onClick={(e) => handleQuantityChange(quantity - 1, e)}
            className={cn(
              'w-11 h-11 sm:w-9 sm:h-9 rounded-full border-2 border-border bg-card',
              'flex items-center justify-center',
              'transition-all duration-150 active:scale-90 touch-manipulation',
              'hover:border-primary hover:bg-primary/5'
            )}
            aria-label="Decrease quantity"
          >
            <Minus className="w-5 h-5 sm:w-4 sm:h-4 text-primary" />
          </button>
          <span className="text-base sm:text-sm font-bold w-8 sm:w-6 text-center tabular-nums">
            {isSelected ? quantity : 0}
          </span>
          <button
            type="button"
            onClick={(e) => handleQuantityChange(quantity + 1, e)}
            className={cn(
              'w-11 h-11 sm:w-9 sm:h-9 rounded-full border-2 border-border bg-card',
              'flex items-center justify-center',
              'transition-all duration-150 active:scale-90 touch-manipulation',
              'hover:border-primary hover:bg-primary/5'
            )}
            aria-label="Increase quantity"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4 text-primary" />
          </button>
        </div>
      )}
    </div>
  );
}