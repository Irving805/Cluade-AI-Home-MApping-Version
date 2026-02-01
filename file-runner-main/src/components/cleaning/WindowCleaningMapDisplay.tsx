import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { 
  RoomWindowSelection, 
  calcWindowMapByRoom, 
  WindowMapRoom,
  isWindowIncludedFlow,
  INCLUDED_WINDOW_LIMITS,
} from '@/lib/roomWindowConfig';
import { CheckCircle2 } from 'lucide-react';

interface WindowCleaningMapDisplayProps {
  roomWindowSelections: RoomWindowSelection[];
  serviceType: string;
  situation?: string;
  language: Language;
  variant?: 'sidebar' | 'review' | 'compact';
}

/**
 * Premium Window Cleaning Map Display
 * Crystal-clear per-room breakdown with included/billable logic
 * Uses isWindowIncludedFlow() helper for consistent gating
 * 
 * Used in: Sidebar (condensed), StepReview (expanded), PDF (text)
 */
export function WindowCleaningMapDisplay({
  roomWindowSelections,
  serviceType,
  situation,
  language,
  variant = 'sidebar',
}: WindowCleaningMapDisplayProps) {
  // Use single source of truth helper for included flow detection
  const isIncludedFlow = isWindowIncludedFlow(serviceType, situation);
  
  // Calculate window map using single source of truth
  const windowMap = useMemo(() => {
    return calcWindowMapByRoom(roomWindowSelections, isIncludedFlow);
  }, [roomWindowSelections, isIncludedFlow]);

  // Filter rooms with windows
  const roomsWithWindows = windowMap.rooms.filter(r => r.totalWindows > 0);

  if (roomsWithWindows.length === 0) {
    return null;
  }

  // Sidebar variant - condensed
  if (variant === 'sidebar' || variant === 'compact') {
    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🪟</span>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
            {t(language, 'win.cleaning_map')}
          </span>
        </div>

        {/* Per-Room Breakdown */}
        <div className="space-y-1">
          {roomsWithWindows.map(room => (
            <RoomWindowRow 
              key={room.roomId} 
              room={room} 
              language={language}
              isIncludedFlow={isIncludedFlow}
              variant="condensed"
            />
          ))}
        </div>

        {/* Summary - only show if we have real pricing */}
        {isIncludedFlow && windowMap.totalIncludedValue > 0 && (
          <div className="text-[9px] text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20 px-2 py-1 rounded text-center">
            ${windowMap.totalIncludedValue} {t(language, 'win.included_value')}
          </div>
        )}

        {/* Total billable if any */}
        {windowMap.totalBillableCost > 0 && (
          <div className="flex justify-between text-[10px] pt-1 border-t border-dashed border-border/50">
            <span className="text-muted-foreground">{t(language, 'win.total_billable')}</span>
            <span className="font-bold text-primary">+${windowMap.totalBillableCost}</span>
          </div>
        )}
      </div>
    );
  }

  // Review variant - expanded with more details
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <span className="text-xl">🪟</span>
        <span className="font-bold text-foreground">{t(language, 'win.cleaning_map')}</span>
      </div>

      {/* Room-by-Room Breakdown */}
      <div className="mt-3 space-y-2">
        {roomsWithWindows.map(room => (
          <RoomWindowRow 
            key={room.roomId} 
            room={room} 
            language={language}
            isIncludedFlow={isIncludedFlow}
            variant="expanded"
          />
        ))}
      </div>

      {/* Totals */}
      <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{t(language, 'win.cleaning_map')}</span>
        <div className="text-right">
          <span className="text-lg font-bold text-primary">
            ${windowMap.totalBillableCost}
          </span>
          {isIncludedFlow && windowMap.totalIncludedValue > 0 && (
            <span className="text-xs text-emerald-600 ml-2">
              (+ ${windowMap.totalIncludedValue} {t(language, 'win.included_value')})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual room row component
function RoomWindowRow({ 
  room, 
  language, 
  isIncludedFlow,
  variant 
}: { 
  room: WindowMapRoom; 
  language: Language;
  isIncludedFlow: boolean;
  variant: 'condensed' | 'expanded';
}) {
  // Get policy info for proper labeling
  const limit = INCLUDED_WINDOW_LIMITS[room.roomType];
  const isAggregate = limit?.policy === 'AGGREGATE';
  const scopeLabel = room.scopeType === 'both' ? 'In & Out' : t(language, 'win.inside');
  
  if (variant === 'condensed') {
    return (
      <div className="flex items-center justify-between text-[9px]">
        <span className="flex items-center gap-1">
          <span>{room.emoji}</span>
          <span className="text-muted-foreground">{room.roomLabel}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {room.includedCount > 0 && isIncludedFlow && (
            <span className="text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {room.includedCount} {t(language, 'win.free')}
            </span>
          )}
          {room.billableCount > 0 && (
            <span className="text-primary font-medium">+${room.billableCost}</span>
          )}
          {room.includedCount > 0 && room.billableCount === 0 && (
            <span className="text-emerald-600 font-semibold text-[8px]">
              {t(language, 'live_price.included')}
            </span>
          )}
        </span>
      </div>
    );
  }

  // Expanded variant for Review - includes exact wording
  // Example: "Kitchen: 2 Inside Windows (1 Included, 1 Billable)"
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30">
      <div className="flex items-center gap-2">
        <span>{room.emoji}</span>
        <span className="text-sm font-medium">{room.roomLabel}</span>
      </div>
      <div className="text-right">
        {/* Total windows with scope */}
        <div className="text-xs text-muted-foreground">
          {room.totalWindows} {scopeLabel} {room.totalWindows === 1 ? 'Window' : 'Windows'}
        </div>
        
        {/* Included / Billable breakdown */}
        {isIncludedFlow && room.includedLimit > 0 && (
          <div className="text-xs">
            {room.includedCount > 0 && (
              <span className="text-emerald-600">
                {room.includedCount} {t(language, 'live_price.included')}
              </span>
            )}
            {room.includedCount > 0 && room.billableCount > 0 && (
              <span className="text-muted-foreground mx-1">|</span>
            )}
            {room.billableCount > 0 && (
              <span className="text-primary font-semibold">
                {room.billableCount} {t(language, 'win.billable')} (+${room.billableCost})
              </span>
            )}
          </div>
        )}
        
        {/* Non-included flow - just show billable */}
        {!isIncludedFlow && room.billableCount > 0 && (
          <div className="text-xs text-primary font-semibold">
            +${room.billableCost}
          </div>
        )}
      </div>
    </div>
  );
}

// Export types and helper for external use
export { isWindowIncludedFlow };
export type { WindowMapRoom, WindowCleaningMapDisplayProps };
