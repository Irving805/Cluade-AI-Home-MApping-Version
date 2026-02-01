import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { ContextualAddon } from '@/lib/coreSpaceConfig';
import { RoomAddonSelection } from '@/contexts/BookingContext';
import { Info } from 'lucide-react';
import { PremiumAddonChip } from './PremiumAddonChip';

interface AddonGridSectionProps {
  roomId: string; // NEW: Identify which room this grid belongs to
  addons: ContextualAddon[];
  roomAddons: RoomAddonSelection[]; // CHANGED: Room-specific addons instead of global
  onAddonToggle: (roomId: string, addonId: string) => void; // CHANGED: Include roomId
  onAddonQuantityChange?: (roomId: string, addonId: string, quantity: number) => void;
  language: Language;
  isMoveOut?: boolean;
  className?: string;
}

export function AddonGridSection({
  roomId,
  addons,
  roomAddons,
  onAddonToggle,
  onAddonQuantityChange,
  language,
  isMoveOut = false,
  className,
}: AddonGridSectionProps) {
  // Check if addon is selected (room-specific)
  const isAddonSelected = (addonId: string): boolean => {
    return roomAddons.some(a => a.addonId === addonId);
  };

  // Get quantity for a specific addon (room-specific)
  const getAddonQuantity = (addonId: string): number => {
    const addon = roomAddons.find(a => a.addonId === addonId);
    return addon?.quantity || 0;
  };

  // Handle quantity change for addons with quantity support
  const handleQuantityChange = (addon: ContextualAddon, newQty: number) => {
    if (onAddonQuantityChange) {
      onAddonQuantityChange(roomId, addon.addonId, newQty);
    } else {
      // Fallback: toggle based on quantity
      const currentQty = getAddonQuantity(addon.addonId);
      if (newQty > 0 && currentQty === 0) {
        onAddonToggle(roomId, addon.addonId);
      } else if (newQty === 0 && currentQty > 0) {
        onAddonToggle(roomId, addon.addonId);
      }
    }
  };

  if (addons.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Info Banner */}
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30">
        <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <span className="text-xs text-emerald-700 dark:text-emerald-300">
          {t(language, 'addon.grid.info')}
        </span>
      </div>

      {/* Bento Grid of Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {addons.map(addon => {
          const isSelected = isAddonSelected(addon.addonId);
          const quantity = getAddonQuantity(addon.addonId);
          const showEssentialBadge = isMoveOut && addon.essentialForDeposit;
          const showLifestyleBadge = addon.isLifestyle;

          return (
            <PremiumAddonChip
              key={addon.addonId}
              addon={addon}
              isSelected={isSelected}
              quantity={quantity}
              onToggle={() => onAddonToggle(roomId, addon.addonId)}
              onQuantityChange={
                addon.hasQuantity 
                  ? (qty) => handleQuantityChange(addon, qty) 
                  : undefined
              }
              language={language}
              showEssentialBadge={showEssentialBadge}
              showLifestyleBadge={showLifestyleBadge}
            />
          );
        })}
      </div>
    </div>
  );
}