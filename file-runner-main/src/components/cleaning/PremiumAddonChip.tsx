import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { ContextualAddon } from '@/lib/coreSpaceConfig';
import { 
  Check,
  AlertCircle,
  Minus,
  Plus,
  Flame,
  Snowflake,
  LayoutGrid,
  Wind,
  Fan,
  Lamp,
  PawPrint,
  Hand,
  CornerDownRight,
  Ruler,
  Zap,
  LucideIcon,
  Refrigerator,
} from 'lucide-react';

// Premium icon mapping for add-ons
const addonIconMap: Record<string, LucideIcon> = {
  'flame': Flame,
  'snowflake': Snowflake,
  'refrigerator': Refrigerator,
  'layout-grid': LayoutGrid,
  'wind': Wind,
  'fan': Fan,
  'lamp': Lamp,
  'flame-kindling': Flame,
  'paw-print': PawPrint,
  'hand': Hand,
  'corner-down-right': CornerDownRight,
  'ruler': Ruler,
};

interface PremiumAddonChipProps {
  addon: ContextualAddon;
  isSelected: boolean;
  quantity?: number;
  onToggle: () => void;
  onQuantityChange?: (qty: number) => void;
  language: Language;
  showEssentialBadge?: boolean;
  showLifestyleBadge?: boolean;
}

export function PremiumAddonChip({
  addon,
  isSelected,
  quantity = 0,
  onToggle,
  onQuantityChange,
  language,
  showEssentialBadge = false,
  showLifestyleBadge = false,
}: PremiumAddonChipProps) {
  const IconComponent = addonIconMap[addon.icon] || Zap;
  
  const handleClick = () => {
    if (addon.hasQuantity) {
      if (onQuantityChange) {
        onQuantityChange(quantity > 0 ? 0 : 1);
      }
    } else {
      onToggle();
    }
  };

  const handleQuantityChange = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuantityChange) {
      const newQty = Math.max(0, Math.min(addon.maxQty || 1, quantity + delta));
      onQuantityChange(newQty);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all duration-200",
        "min-h-[100px] touch-manipulation select-none",
        "active:scale-[0.97] hover:shadow-md",
        isSelected
          ? "border-primary bg-gradient-to-br from-primary/5 to-primary/15 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
          : showEssentialBadge
            ? "border-amber-400 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-900/20 dark:to-amber-800/10 hover:border-amber-500"
            : showLifestyleBadge
              ? "border-teal-400/50 bg-teal-50/30 dark:bg-teal-900/10 hover:border-teal-500"
              : "border-border bg-card hover:border-primary/50"
      )}
    >
      {/* Selection Check Badge (top-right corner) */}
      {isSelected && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
          <Check className="w-3 h-3 text-primary-foreground" />
        </span>
      )}

      {/* Essential Badge (top-right when not selected) */}
      {showEssentialBadge && !isSelected && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 text-[8px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
          <AlertCircle className="w-2 h-2" />
          Essential
        </span>
      )}

      {/* Lifestyle Badge */}
      {showLifestyleBadge && !isSelected && !showEssentialBadge && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 text-[8px] font-bold text-white bg-teal-500 px-1.5 py-0.5 rounded-full shadow-sm">
          <PawPrint className="w-2 h-2" />
          Pet
        </span>
      )}

      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all mb-1.5",
        isSelected 
          ? "bg-primary text-primary-foreground shadow-md" 
          : showEssentialBadge
            ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
            : showLifestyleBadge
              ? "bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400"
              : "bg-muted text-muted-foreground"
      )}>
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Label */}
      <span className={cn(
        "text-xs font-semibold text-center leading-tight line-clamp-2 mb-1.5",
        isSelected ? "text-primary" : "text-foreground"
      )}>
        {t(language, addon.labelKey)}
      </span>

      {/* Quantity Controls or Time Badge */}
      {addon.hasQuantity && isSelected ? (
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-0.5">
          <button
            type="button"
            onClick={(e) => handleQuantityChange(-1, e)}
            disabled={quantity <= 0}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-background"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-4 text-center font-bold text-foreground tabular-nums text-xs">
            {quantity}
          </span>
          <button
            type="button"
            onClick={(e) => handleQuantityChange(1, e)}
            disabled={quantity >= (addon.maxQty || 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <span className={cn(
          "text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors",
          isSelected
            ? "bg-primary/20 text-primary"
            : "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        )}>
          +{addon.minutes} min
        </span>
      )}
    </button>
  );
}