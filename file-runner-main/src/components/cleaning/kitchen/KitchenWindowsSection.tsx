import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { RoomWindowSelection } from '@/lib/roomWindowConfig';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Minus, Plus, Info, Check } from 'lucide-react';

interface KitchenWindowsSectionProps {
  language: Language;
  roomWindowSelection?: RoomWindowSelection;
  onUpdate: (updates: Partial<RoomWindowSelection>) => void;
  interiorWindowPrice: number;
  exteriorWindowPrice: number;
}

export function KitchenWindowsSection({
  language,
  roomWindowSelection,
  onUpdate,
  interiorWindowPrice = 15,
  exteriorWindowPrice = 20,
}: KitchenWindowsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use windowCount for interior (first one free), blindsCount for actual blinds
  const interiorCount = roomWindowSelection?.windowCount || 1;  // Interior count (min 1, first free)
  const exteriorCount = 0; // Exterior managed separately - not in this scope for kitchen
  const blindsCount = roomWindowSelection?.blindsCount || 0;  // Actual blinds
  
  // First interior window is FREE
  const paidInteriorCount = Math.max(0, interiorCount - 1);
  const interiorCharge = paidInteriorCount * interiorWindowPrice;
  const exteriorCharge = exteriorCount * exteriorWindowPrice;
  const totalWindowCharge = interiorCharge + exteriorCharge;
  
  const handleInteriorChange = (delta: number) => {
    const newCount = Math.max(1, interiorCount + delta);
    onUpdate({ windowCount: newCount });
  };
  
  const handleBlindsChange = (delta: number) => {
    const newCount = Math.max(0, blindsCount + delta);
    onUpdate({ blindsCount: newCount });
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-lg">🪟</span>
            <span className="text-sm font-medium text-foreground">
              {t(language, 'kitchen.windows.title')}
            </span>
            {totalWindowCharge > 0 && (
              <span className="text-xs font-bold text-primary">
                +${totalWindowCharge}
              </span>
            )}
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-3 space-y-4 border-x border-b border-border rounded-b-xl bg-card">
          {/* Window Pricing Rule Banner */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                {t(language, 'kitchen.windows.rule')}
              </p>
            </div>
          </div>
          
          {/* Interior Windows - FIRST ONE FREE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {t(language, 'kitchen.windows.interior_label')}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {t(language, 'kitchen.windows.included_label')}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Badge for first included */}
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
                  <Check className="w-2.5 h-2.5" />
                  1 {t(language, 'kitchen.included.badge')}
                </span>
                
                {/* Stepper */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInteriorChange(-1)}
                    disabled={interiorCount <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">
                    {interiorCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleInteriorChange(1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* Price for additional */}
                {paidInteriorCount > 0 && (
                  <span className="text-xs font-medium text-primary min-w-[45px] text-right">
                    +${interiorCharge}
                  </span>
                )}
              </div>
            </div>
            
            {/* Additional windows note */}
            {paidInteriorCount > 0 && (
              <p className="text-[10px] text-muted-foreground pl-1">
                +{paidInteriorCount} {t(language, 'kitchen.windows.additional')} × ${interiorWindowPrice}
              </p>
            )}
          </div>
          
          {/* Window Tracks Included */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  {t(language, 'kitchen.windows.tracks_included')}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t(language, 'kitchen.windows.tracks_desc')}
                </span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
              {t(language, 'kitchen.included.badge')}
            </span>
          </div>
          
          {/* Blinds/Shutters */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-sm font-medium text-foreground">
              {t(language, 'kitchen.windows.blinds_label')}
            </span>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleBlindsChange(-1)}
                disabled={blindsCount <= 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-bold">
                {blindsCount}
              </span>
              <button
                type="button"
                onClick={() => handleBlindsChange(1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
