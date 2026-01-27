import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { HallwayConfig, Situation } from '@/contexts/BookingContext';
import { RoomWindowSelection } from '@/lib/roomWindowConfig';
import { Plus, DoorOpen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HallwayCard } from './HallwayCard';
import { createDefaultHallwayConfig, isMovingFlow, isDeepResetLiveHere, HALLWAY_RATES } from '@/lib/pricing_hallways';
import { ResidentialCeilingHeight } from '@/lib/ceilingHeightTypes';
import { getHallwayRoomId, matchHallwayRoomId } from '@/lib/windows/roomIds';

interface HallwaysSectionProps {
  language: Language;
  hallways: HallwayConfig[];
  onHallwaysChange: (hallways: HallwayConfig[]) => void;
  situation: Situation;
  serviceType: string;
  maxFloors?: number;  // For floor level selector
  // Window props
  roomWindowSelections?: RoomWindowSelection[];
  onRoomWindowUpdate?: (roomId: string, updates: Partial<RoomWindowSelection>) => void;
  // Window flow props
  tracksIncludedByDefault?: boolean;
  includedWindowsEnabled?: boolean;
  showWindowSection?: boolean;
  // Ceiling height props (Detailed Home Mapping)
  ceilingHeights?: Record<string, ResidentialCeilingHeight | null>;
  onCeilingHeightChange?: (hallwayId: string, height: ResidentialCeilingHeight) => void;
  showCeilingSelector?: boolean;
  // SSOT: baseServiceLevel for Deep Clean detection in HallwayCard
  baseServiceLevel?: string;
}

export function HallwaysSection({
  language,
  hallways,
  onHallwaysChange,
  situation,
  serviceType,
  maxFloors = 1,
  roomWindowSelections = [],
  onRoomWindowUpdate,
  tracksIncludedByDefault = false,
  includedWindowsEnabled = false,
  showWindowSection = false,
  // Ceiling height
  ceilingHeights,
  onCeilingHeightChange,
  showCeilingSelector = false,
  // SSOT: baseServiceLevel for Deep Clean detection
  baseServiceLevel = '',
}: HallwaysSectionProps) {
  const isMoving = isMovingFlow(situation, serviceType);
  const isLiveHere = isDeepResetLiveHere(situation, serviceType);
  
  // Ensure at least one hallway exists
  const effectiveHallways = hallways.length > 0 ? hallways : [createDefaultHallwayConfig(0)];
  
  // Handler for "Add First" button (empty state) - creates exactly 1 hallway
  const handleAddFirstHallway = () => {
    const newHallway = createDefaultHallwayConfig(0);
    onHallwaysChange([newHallway]);
  };
  
  // Handler for "Add Another" button - appends to ACTUAL state
  const handleAddHallway = () => {
    const newIndex = hallways.length; // Use ACTUAL state, not effectiveHallways
    const newHallway = createDefaultHallwayConfig(newIndex);
    onHallwaysChange([...hallways, newHallway]); // Use ACTUAL state
  };
  
  const handleRemoveHallway = (index: number) => {
    if (hallways.length <= 1) return; // Keep at least one - use ACTUAL state
    const updated = hallways.filter((_, i) => i !== index); // Use ACTUAL state
    // Re-index remaining hallways
    const reindexed = updated.map((h, i) => ({
      ...h,
      id: `hallway_${i}`,
      label: `Hallway ${i + 1}`,
    }));
    onHallwaysChange(reindexed);
  };
  
  const handleUpdateHallway = (index: number, updates: Partial<HallwayConfig>) => {
    const updated = hallways.map((h, i) => // Use ACTUAL state
      i === index ? { ...h, ...updates } : h
    );
    onHallwaysChange(updated);
  };
  
  const handleWindowUpdate = (hallwayId: string, updates: Partial<RoomWindowSelection>) => {
    if (onRoomWindowUpdate) {
      // Use stable roomId format: "hallway:hallway_0"
      const stableRoomId = getHallwayRoomId(hallwayId);
      onRoomWindowUpdate(stableRoomId, updates);
    }
  };
  
  // If no hallways exist yet, show empty state with add button
  if (effectiveHallways.length === 0 || (effectiveHallways.length === 1 && effectiveHallways[0].id === 'hallway_0' && hallways.length === 0)) {
    return (
      <div className="space-y-3 pt-3">
        {/* Empty State */}
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <DoorOpen className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t(language, 'hallway.empty_state')}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFirstHallway}
            className="h-9 gap-2"
          >
            <Plus className="w-4 h-4" />
            {t(language, 'hallway.add_first')}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3 pt-3">
      
      {/* Pricing Microcopy */}
      <div className={cn(
        "p-3 rounded-lg border text-xs flex items-start gap-2",
        isMoving 
          ? "bg-amber-50/50 border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-800/30"
          : "bg-primary/5 border-primary/10"
      )}>
        <Info className={cn(
          "w-4 h-4 shrink-0 mt-0.5",
          isMoving ? "text-amber-600 dark:text-amber-400" : "text-primary"
        )} />
        <div className="space-y-1">
          {isMoving ? (
            <>
              <p className="text-foreground font-medium">
                {t(language, 'hallway.moving_included')}
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                {t(language, 'hallway.moving_large_fee')}
              </p>
            </>
          ) : isLiveHere ? (
            <p className="text-foreground">
              {t(language, 'hallway.livein_org')}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {t(language, 'hallway.standard_included')}
            </p>
          )}
        </div>
      </div>
      
      {/* Hallway Cards */}
      <div className="space-y-3">
        {effectiveHallways.map((hallway, index) => {
          // Find window selection using stable roomId matcher (handles both legacy and new format)
          const windowSelection = roomWindowSelections?.find(
            rws => matchHallwayRoomId(hallway.id, rws.roomId)
          );
          
          return (
            <HallwayCard
              key={hallway.id}
              hallway={hallway}
              index={index}
              language={language}
              onUpdate={(updates) => handleUpdateHallway(index, updates)}
              onRemove={() => handleRemoveHallway(index)}
              canRemove={hallways.length > 1}
              isMovingFlow={isMoving}
              isLiveHereFlow={isLiveHere}
              maxFloors={maxFloors}
              showWindowSection={showWindowSection}
              roomWindowSelection={windowSelection}
              onWindowUpdate={(updates) => handleWindowUpdate(hallway.id, updates)}
              tracksIncludedByDefault={tracksIncludedByDefault}
              includedWindowsEnabled={includedWindowsEnabled}
              // Ceiling height (Detailed Home Mapping)
              ceilingHeight={ceilingHeights?.[hallway.id] || null}
              onCeilingHeightChange={onCeilingHeightChange 
                ? (height) => onCeilingHeightChange(hallway.id, height) 
                : undefined}
              showCeilingSelector={showCeilingSelector}
              // SSOT: baseServiceLevel for Deep Clean detection
              baseServiceLevel={baseServiceLevel}
            />
          );
        })}
      </div>
      
      {/* Add Another Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddHallway}
        className="w-full h-9 gap-2 text-xs border border-dashed border-border hover:border-primary/50"
      >
        <Plus className="w-3.5 h-3.5" />
        {t(language, 'hallway.add_another')}
      </Button>
    </div>
  );
}
