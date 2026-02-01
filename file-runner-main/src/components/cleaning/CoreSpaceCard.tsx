import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { CoreSpaceDefinition, ContextualAddon } from '@/lib/coreSpaceConfig';
import { Addon } from '@/contexts/BookingContext';
import { 
  ChevronDown, 
  ChevronRight, 
  Lock, 
  Check, 
  ChefHat, 
  Sofa, 
  Footprints,
  Sparkles,
  AlertCircle,
  Minus,
  Plus
} from 'lucide-react';

// Icon mapping for core spaces
const spaceIconMap: Record<string, React.ElementType> = {
  'chef-hat': ChefHat,
  'sofa': Sofa,
  'footprints': Footprints,
};

interface CoreSpaceCardProps {
  space: CoreSpaceDefinition;
  language: Language;
  isDeep: boolean;
  isMoveOut: boolean;
  selectedAddons: Addon[];
  onAddonToggle: (addonId: string) => void;
  onAddonQuantityChange?: (addonId: string, quantity: number) => void;
  defaultExpanded?: boolean;
}

export function CoreSpaceCard({
  space,
  language,
  isDeep,
  isMoveOut,
  selectedAddons,
  onAddonToggle,
  onAddonQuantityChange,
  defaultExpanded = false,
}: CoreSpaceCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  
  // Auto-expand for Move-Out flow if space has essential addons
  useEffect(() => {
    if (isMoveOut && space.contextAddons.some(a => a.essentialForDeposit)) {
      setIsOpen(true);
    }
  }, [isMoveOut, space.contextAddons]);
  
  const IconComponent = spaceIconMap[space.icon] || Sparkles;
  
  // Check which addons from this space are selected
  const selectedCount = space.contextAddons.filter(addon => 
    selectedAddons.some(a => a.value === addon.addonId)
  ).length;
  
  const hasSelectedAddons = selectedCount > 0;
  
  // Get quantity for a specific addon
  const getAddonQuantity = (addonId: string): number => {
    const addon = selectedAddons.find(a => a.value === addonId);
    return addon?.quantity || 0;
  };
  
  // Check if addon is selected
  const isAddonSelected = (addonId: string): boolean => {
    return selectedAddons.some(a => a.value === addonId);
  };

  // Handle quantity change for addons with quantity support
  const handleQuantityChange = (addon: ContextualAddon, delta: number) => {
    const currentQty = getAddonQuantity(addon.addonId);
    const newQty = Math.max(0, Math.min(addon.maxQty || 1, currentQty + delta));
    
    if (onAddonQuantityChange) {
      onAddonQuantityChange(addon.addonId, newQty);
    } else {
      // Fallback: toggle on/off
      if (newQty > 0 && currentQty === 0) {
        onAddonToggle(addon.addonId);
      } else if (newQty === 0 && currentQty > 0) {
        onAddonToggle(addon.addonId);
      }
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200",
            "border-2 cursor-pointer active:scale-[0.99] touch-manipulation",
            isOpen
              ? "border-primary bg-primary/[0.03] rounded-b-none"
              : hasSelectedAddons
                ? "border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10 ring-2 ring-primary/20"
                : "border-border bg-emerald-50 dark:bg-emerald-900/20 hover:border-primary/40"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{space.emoji}</span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {t(language, space.labelKey)}
                </span>
                <Lock className="w-3 h-3 text-emerald-500" />
              </div>
              {space.contextAddons.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t(language, 'core.tap_to_upgrade')}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasSelectedAddons && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                +{selectedCount}
              </span>
            )}
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
              isOpen ? 'bg-primary/10' : 'bg-muted/50'
            )}>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-primary" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className={cn(
          "border-2 border-t-0 rounded-b-xl p-4 bg-card animate-fade-in",
          hasSelectedAddons ? "border-primary/50" : "border-primary"
        )}>
          {/* Standard Inclusions */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {t(language, 'core.standard_inclusions')}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {space.inclusions.map(inclusion => (
                <div key={inclusion.key} className="flex items-center gap-1.5 text-xs text-foreground">
                  <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  <span>{t(language, inclusion.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Contextual Add-ons */}
          {space.contextAddons.length > 0 && (
            <>
              <div className="border-t border-border/50 my-3" />
              
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    {t(language, `core.upgrade_${space.id}`)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {space.contextAddons.map(addon => {
                    const isSelected = isAddonSelected(addon.addonId);
                    const quantity = getAddonQuantity(addon.addonId);
                    const showEssentialBadge = isMoveOut && addon.essentialForDeposit;
                    
                    return (
                      <div
                        key={addon.addonId}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : showEssentialBadge
                              ? "border-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
                              : "border-border bg-card hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {addon.hasQuantity ? (
                            // Quantity controls for multi-item addons
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(addon, -1);
                                }}
                                disabled={quantity <= 0}
                                className="w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-foreground tabular-nums text-sm">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(addon, 1);
                                }}
                                disabled={quantity >= (addon.maxQty || 1)}
                                className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            // Simple checkbox for single-item addons
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onAddonToggle(addon.addonId)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          )}
                          
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">
                                {t(language, addon.labelKey)}
                              </span>
                              {showEssentialBadge && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  {t(language, 'core.essential_deposit')}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              ~{addon.minutes} min
                            </span>
                          </div>
                        </div>
                        
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          +${addon.price}{addon.hasQuantity ? '/ea' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
