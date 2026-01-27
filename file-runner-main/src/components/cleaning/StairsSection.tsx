/**
 * StairsSection — Multi-Stair Logistics Container
 * 
 * Mirrors HallwaysSection pattern for SSOT consistency.
 * Only visible when maxFloors >= 2.
 */

import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import type { Situation } from '@/contexts/BookingContext';
import type { StairConfig } from '@/lib/stairs/stairsModel';
import { createDefaultStairConfig } from '@/lib/stairs/stairsModel';
import { Plus, Footprints, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StairCard } from './StairCard';

interface StairsSectionProps {
  language: Language;
  stairs: StairConfig[];
  onStairsChange: (stairs: StairConfig[]) => void;
  situation: Situation;
  maxFloors: number;
}

export function StairsSection({
  language,
  stairs,
  onStairsChange,
  situation,
  maxFloors,
}: StairsSectionProps) {
  const isMoving = situation === 'MOVING';
  
  // Ensure at least one stair exists for multi-floor properties
  const effectiveStairs = stairs.length > 0 ? stairs : [];
  
  // Handler for "Add First" button (empty state)
  const handleAddFirstStair = () => {
    // Default: F1 → F2
    const newStair = createDefaultStairConfig(0, 1, 2);
    onStairsChange([newStair]);
  };
  
  // Handler for "Add Another" button - uses STABLE IDs
  const handleAddStair = () => {
    // Find highest existing index for stable ID generation
    const maxIdx = stairs.reduce((max, s) => {
      const match = s.id.match(/stair_(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, -1);
    
    const newIndex = maxIdx + 1;
    // Default to next available floor connection
    const lastStair = stairs[stairs.length - 1];
    const fromFloor = lastStair ? lastStair.toFloor : 1;
    const toFloor = Math.min(fromFloor + 1, maxFloors);
    
    const newStair = createDefaultStairConfig(newIndex, fromFloor, toFloor);
    onStairsChange([...stairs, newStair]);
  };
  
  // Handler for remove - uses STABLE ID (NO reindexing)
  const handleRemoveStair = (id: string) => {
    if (stairs.length <= 0) return;
    const updated = stairs.filter((s) => s.id !== id);
    // NOTE: We do NOT reindex IDs - stable IDs are maintained
    onStairsChange(updated);
  };
  
  // Handler for update - uses STABLE ID
  const handleUpdateStair = (id: string, updates: Partial<StairConfig>) => {
    const updated = stairs.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    onStairsChange(updated);
  };
  
  // Empty state
  if (effectiveStairs.length === 0) {
    return (
      <div className="space-y-3 pt-3">
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Footprints className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t(language, 'stairs.empty_state') || 'Add stairs to map floor connections'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFirstStair}
            className="h-9 gap-2"
          >
            <Plus className="w-4 h-4" />
            {t(language, 'stairs.add_first') || 'Add First Stair'}
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
          <p className="text-foreground font-medium">
            {t(language, 'stairs.included') || 'Stair cleaning is included'}
          </p>
          <p className="text-muted-foreground">
            {t(language, 'stairs.hazards_add_time') || 'Hazards like pet hair or intricate railings add extra time.'}
          </p>
        </div>
      </div>
      
      {/* Stair Cards */}
      <div className="space-y-3">
        {effectiveStairs.map((stair) => (
          <StairCard
            key={stair.id}
            stair={stair}
            language={language}
            onUpdate={(updates) => handleUpdateStair(stair.id, updates)}
            onRemove={() => handleRemoveStair(stair.id)}
            canRemove={stairs.length > 1}
            maxFloors={maxFloors}
            situation={situation}
          />
        ))}
      </div>
      
      {/* Add Another Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddStair}
        className="w-full h-9 gap-2 text-xs border border-dashed border-border hover:border-primary/50"
      >
        <Plus className="w-3.5 h-3.5" />
        {t(language, 'stairs.add_another') || 'Add Another Stair'}
      </Button>
    </div>
  );
}
