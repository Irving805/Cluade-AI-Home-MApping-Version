/**
 * WindowBreakdownSummary — Kitchen Window Breakdown Display
 * 
 * Shows explicit breakdown of interior (1 included + N charged) and exterior (all charged)
 * for Kitchen windows. Uses windowInventory for accurate glass mode calculations.
 */

import { useMemo } from 'react';
import { Language, t } from '@/lib/translations';
import { RoomWindowSelection, WINDOW_TYPES } from '@/lib/roomWindowConfig';
import { Info } from 'lucide-react';

interface WindowBreakdownSummaryProps {
  roomWindowSelection?: RoomWindowSelection;
  language: Language;
}

export function WindowBreakdownSummary({ roomWindowSelection, language }: WindowBreakdownSummaryProps) {
  const inventory = roomWindowSelection?.windowInventory || [];
  
  // Calculate interior vs exterior totals from inventory using glassMode
  const { interiorCount, exteriorCount } = useMemo(() => {
    let interior = 0;
    let exterior = 0;
    
    inventory.forEach((item) => {
      if (item.glassMode === 'interior') {
        interior += item.quantity;
      } else if (item.glassMode === 'exterior') {
        exterior += item.quantity;
      } else if (item.glassMode === 'both') {
        // Both sides = count toward both interior AND exterior
        interior += item.quantity;
        exterior += item.quantity;
      }
    });
    
    return { interiorCount: interior, exteriorCount: exterior };
  }, [inventory]);
  
  // Kitchen rule: First 1 interior window is FREE
  const paidInterior = Math.max(0, interiorCount - 1);
  const hasWindows = interiorCount > 0 || exteriorCount > 0;
  
  if (!hasWindows) return null;
  
  return (
    <div className="p-2.5 bg-muted/40 border border-border/50 rounded-lg">
      <div className="flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t(language, 'kitchen.windows.breakdown') || 'Summary'}:</span>
          <span className="ml-1.5">
            Interior: {interiorCount} 
            <span className="text-emerald-600 dark:text-emerald-400">
              {interiorCount >= 1 ? ' (1 included' : ''}
              {paidInterior > 0 ? ` + ${paidInterior} charged)` : interiorCount >= 1 ? ')' : ''}
            </span>
            {exteriorCount > 0 && (
              <span className="ml-1">
                • Exterior: {exteriorCount} 
                <span className="text-amber-600 dark:text-amber-400"> (all charged)</span>
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
