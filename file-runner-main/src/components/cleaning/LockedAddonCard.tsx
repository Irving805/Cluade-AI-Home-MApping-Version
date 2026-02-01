/**
 * LockedAddonCard - Displays a locked add-on that requires upgrade to Deep Reset
 * Clicking opens an upgrade modal
 */

import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { useBooking } from '@/contexts/BookingContext';

interface LockedAddonCardProps {
  labelKey: string;
  price: number;
  unit?: string;
  icon?: React.ReactNode;
  onUpgradeClick: (itemName: string) => void;
}

export function LockedAddonCard({ labelKey, price, unit, icon, onUpgradeClick }: LockedAddonCardProps) {
  const { language } = useBooking();
  const itemName = t(language, labelKey);

  return (
    <div
      onClick={() => onUpgradeClick(itemName)}
      className={cn(
        'relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl cursor-pointer select-none',
        'border-2 border-dashed border-muted-foreground/30 bg-muted/30',
        'transition-all duration-200 hover:border-primary/40 hover:bg-muted/50',
        'opacity-60 hover:opacity-80',
        'min-h-[auto]'
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Lock badge */}
      <div className="absolute -top-2 right-3 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide rounded-full border border-amber-200">
        Deep Reset Only
      </div>
      
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/50 text-muted-foreground">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-semibold text-muted-foreground leading-snug break-words hyphens-auto">
            {itemName}
          </h5>
          <span className="text-sm font-bold text-muted-foreground/60 inline-block mt-0.5">
            ${price}
            {unit && <span className="font-medium">{unit}</span>}
          </span>
        </div>
      </div>
      
      {/* Lock icon instead of toggle */}
      <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-3 self-end sm:self-center">
        <div className="w-11 h-11 sm:w-9 sm:h-9 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center">
          <Lock className="w-4 h-4 text-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
}
