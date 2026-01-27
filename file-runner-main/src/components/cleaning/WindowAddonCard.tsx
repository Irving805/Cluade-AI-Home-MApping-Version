import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

interface WindowAddonCardProps {
  value: string;
  labelKey: string;
  price: number;
}

export function WindowAddonCard({ value, labelKey, price }: WindowAddonCardProps) {
  const { language, selectedAddons, toggleAddon, updateAddonQuantity } = useBooking();
  
  const insideKey = `${value}_in`;
  const outsideKey = `${value}_out`;
  
  const insideAddon = selectedAddons.find((a) => a.value === insideKey);
  const outsideAddon = selectedAddons.find((a) => a.value === outsideKey);
  
  const insideQty = insideAddon?.quantity || 0;
  const outsideQty = outsideAddon?.quantity || 0;
  
  const isSelected = insideQty > 0 || outsideQty > 0;
  const totalPrice = (insideQty + outsideQty) * price;

  const handleQuantityChange = (key: string, currentQty: number, newQty: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const addon = selectedAddons.find((a) => a.value === key);
    
    if (newQty <= 0) {
      if (addon) toggleAddon(key);
    } else {
      if (!addon) {
        toggleAddon(key, newQty);
      } else {
        updateAddonQuantity(key, newQty);
      }
    }
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all duration-200',
        isSelected
          ? 'border-primary bg-primary/[0.03] shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]'
          : 'border-border bg-card'
      )}
    >
      {/* Header: Window Type + Price */}
      <div className="mb-4">
        <h5 className="text-sm font-semibold text-foreground leading-snug break-words hyphens-auto">
          {t(language, labelKey)}
        </h5>
        <p className="text-xs text-muted-foreground mt-1">
          <span className="font-bold text-primary">${price}</span>
          <span className="ml-1">{t(language, 'win.per_side')}</span>
        </p>
      </div>
      
      {/* Inside / Outside Counters */}
      <div className="space-y-3">
        {/* Inside Counter */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t(language, 'win.inside')}
          </span>
          <div className="flex items-center gap-2 sm:gap-2">
            {/* Mobile: 44x44px tap targets for WCAG compliance */}
            <button
              type="button"
              onClick={(e) => handleQuantityChange(insideKey, insideQty, insideQty - 1, e)}
              disabled={insideQty <= 0}
              className={cn(
                'w-10 h-10 sm:w-8 sm:h-8 rounded-full border-2 border-border bg-card',
                'flex items-center justify-center',
                'transition-all duration-150 active:scale-90 touch-manipulation',
                'hover:border-primary hover:bg-primary/5',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
              aria-label="Decrease inside quantity"
            >
              <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-primary" />
            </button>
            <span className="text-sm font-bold w-6 sm:w-5 text-center tabular-nums">{insideQty}</span>
            <button
              type="button"
              onClick={(e) => handleQuantityChange(insideKey, insideQty, insideQty + 1, e)}
              className={cn(
                'w-10 h-10 sm:w-8 sm:h-8 rounded-full border-2 border-border bg-card',
                'flex items-center justify-center',
                'transition-all duration-150 active:scale-90 touch-manipulation',
                'hover:border-primary hover:bg-primary/5'
              )}
              aria-label="Increase inside quantity"
            >
              <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-primary" />
            </button>
          </div>
        </div>
        
        {/* Outside Counter */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t(language, 'win.outside')}
          </span>
          <div className="flex items-center gap-2 sm:gap-2">
            <button
              type="button"
              onClick={(e) => handleQuantityChange(outsideKey, outsideQty, outsideQty - 1, e)}
              disabled={outsideQty <= 0}
              className={cn(
                'w-10 h-10 sm:w-8 sm:h-8 rounded-full border-2 border-border bg-card',
                'flex items-center justify-center',
                'transition-all duration-150 active:scale-90 touch-manipulation',
                'hover:border-primary hover:bg-primary/5',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
              aria-label="Decrease outside quantity"
            >
              <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-primary" />
            </button>
            <span className="text-sm font-bold w-6 sm:w-5 text-center tabular-nums">{outsideQty}</span>
            <button
              type="button"
              onClick={(e) => handleQuantityChange(outsideKey, outsideQty, outsideQty + 1, e)}
              className={cn(
                'w-10 h-10 sm:w-8 sm:h-8 rounded-full border-2 border-border bg-card',
                'flex items-center justify-center',
                'transition-all duration-150 active:scale-90 touch-manipulation',
                'hover:border-primary hover:bg-primary/5'
              )}
              aria-label="Increase outside quantity"
            >
              <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-primary" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Total for this window type */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
          <span className="text-xs text-muted-foreground font-medium">
            {insideQty > 0 && outsideQty > 0 
              ? `${insideQty} ${t(language, 'win.in_short')} + ${outsideQty} ${t(language, 'win.out_short')}`
              : insideQty > 0 
                ? `${insideQty} ${t(language, 'win.inside')}`
                : `${outsideQty} ${t(language, 'win.outside')}`
            }
          </span>
          <span className="text-sm font-bold text-primary">${totalPrice.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}