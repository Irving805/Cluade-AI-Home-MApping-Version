/**
 * BathroomLogisticsPanel — Operational details for time estimation
 * 
 * This panel collects operational signals that affect CLEANING TIME only,
 * not price. It's designed for the "I'm Moving" flow but can be used elsewhere.
 * 
 * V1 Fields:
 * - toiletScale: Toilet bowl buildup level
 * - tubScale: Tub/shower surface condition
 * - showerDoorScale: Glass door condition
 * - cabinetInterior: Clean inside cabinets?
 * - mirrorCount: Number of mirrors
 * - notes: Crew notes (optional)
 */

import { Sparkles, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  BathroomLogistics, 
  ToiletScaleLevel, 
  TubScaleLevel, 
  ShowerDoorScaleLevel, 
  CabinetInteriorLoad 
} from '@/lib/bathroomMappingTypes';
import { calculateBathroomLogisticsTime, LOGISTICS_TIME_DELTAS } from '@/lib/bathroomLogisticsTime';
import { DEFAULT_BATHROOM_LOGISTICS } from '@/lib/bathroomPresets';

interface BathroomLogisticsPanelProps {
  logistics: BathroomLogistics | undefined;
  onChange: (logistics: BathroomLogistics) => void;
  isHalfBath?: boolean;  // Half baths don't have tub/shower
}

// Pill button for selections
function PillButton({
  selected,
  onClick,
  children,
  size = 'normal',
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: 'small' | 'normal';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border transition-all duration-200',
        size === 'small' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
        selected
          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
          : 'bg-card text-muted-foreground border-border hover:border-amber-300 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

// Section header
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

export function BathroomLogisticsPanel({
  logistics,
  onChange,
  isHalfBath = false,
}: BathroomLogisticsPanelProps) {
  // Use defaults if no logistics set
  const current = logistics || DEFAULT_BATHROOM_LOGISTICS;
  
  // Calculate extra time for display
  const extraTime = calculateBathroomLogisticsTime(current);
  
  // Update helper
  const update = (updates: Partial<BathroomLogistics>) => {
    onChange({ ...current, ...updates });
  };
  
  return (
    <div className="space-y-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Operational Details
          </span>
        </div>
        {extraTime > 0 && (
          <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
            +{extraTime} min
          </span>
        )}
      </div>
      
      {/* Surface Buildup Section */}
      <div className="space-y-2">
        <SectionHeader>Surface Buildup</SectionHeader>
        
        {/* Toilet Scale */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-foreground">Toilet</span>
          <div className="flex flex-wrap gap-1.5">
            {(['none', 'light', 'heavy', 'stained'] as ToiletScaleLevel[]).map(level => (
              <PillButton
                key={level}
                size="small"
                selected={current.toiletScale === level}
                onClick={() => update({ toiletScale: level })}
              >
                {level === 'none' ? 'Clean' : level.charAt(0).toUpperCase() + level.slice(1)}
                {LOGISTICS_TIME_DELTAS.toiletScale[level] > 0 && (
                  <span className="ml-1 opacity-70">+{LOGISTICS_TIME_DELTAS.toiletScale[level]}</span>
                )}
              </PillButton>
            ))}
          </div>
        </div>
        
        {/* Tub Scale - Only for non-half baths */}
        {!isHalfBath && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-foreground">Tub/Shower</span>
            <div className="flex flex-wrap gap-1.5">
              {(['none', 'soap', 'mineral', 'heavy'] as TubScaleLevel[]).map(level => (
                <PillButton
                  key={level}
                  size="small"
                  selected={current.tubScale === level}
                  onClick={() => update({ tubScale: level })}
                >
                  {level === 'none' ? 'Clean' : level === 'soap' ? 'Soap Scum' : level === 'mineral' ? 'Mineral' : 'Heavy'}
                  {LOGISTICS_TIME_DELTAS.tubScale[level] > 0 && (
                    <span className="ml-1 opacity-70">+{LOGISTICS_TIME_DELTAS.tubScale[level]}</span>
                  )}
                </PillButton>
              ))}
            </div>
          </div>
        )}
        
        {/* Shower Door Scale - Only for non-half baths */}
        {!isHalfBath && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-foreground">Shower Door Glass</span>
            <div className="flex flex-wrap gap-1.5">
              {(['none', 'water_spots', 'mineral', 'heavy'] as ShowerDoorScaleLevel[]).map(level => (
                <PillButton
                  key={level}
                  size="small"
                  selected={current.showerDoorScale === level}
                  onClick={() => update({ showerDoorScale: level })}
                >
                  {level === 'none' ? 'Clean' : level === 'water_spots' ? 'Water Spots' : level === 'mineral' ? 'Mineral' : 'Heavy'}
                  {LOGISTICS_TIME_DELTAS.showerDoorScale[level] > 0 && (
                    <span className="ml-1 opacity-70">+{LOGISTICS_TIME_DELTAS.showerDoorScale[level]}</span>
                  )}
                </PillButton>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Cabinet & Mirrors Section */}
      <div className="space-y-2 pt-2 border-t border-amber-200/30">
        <SectionHeader>Cabinet & Mirrors</SectionHeader>
        
        {/* Cabinet Interior */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-foreground">Inside Cabinets</span>
          <div className="flex flex-wrap gap-1.5">
            {(['no', 'yes_empty', 'yes_with_items'] as CabinetInteriorLoad[]).map(level => (
              <PillButton
                key={level}
                size="small"
                selected={current.cabinetInterior === level}
                onClick={() => update({ cabinetInterior: level })}
              >
                {level === 'no' ? 'No' : level === 'yes_empty' ? 'Yes (Empty)' : 'Yes (Items)'}
                {LOGISTICS_TIME_DELTAS.cabinetInterior[level] > 0 && (
                  <span className="ml-1 opacity-70">+{LOGISTICS_TIME_DELTAS.cabinetInterior[level]}</span>
                )}
              </PillButton>
            ))}
          </div>
        </div>
        
        {/* Mirror Count */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-foreground">Mirrors</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update({ mirrorCount: Math.max(0, current.mirrorCount - 1) })}
              disabled={current.mirrorCount <= 0}
              className={cn(
                'w-6 h-6 rounded-full border flex items-center justify-center transition-all',
                current.mirrorCount <= 0
                  ? 'border-border text-muted-foreground/50 cursor-not-allowed'
                  : 'border-amber-300 text-amber-600 hover:bg-amber-100'
              )}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium text-foreground w-6 text-center">
              {current.mirrorCount}
            </span>
            <button
              type="button"
              onClick={() => update({ mirrorCount: Math.min(5, current.mirrorCount + 1) })}
              disabled={current.mirrorCount >= 5}
              className={cn(
                'w-6 h-6 rounded-full border flex items-center justify-center transition-all',
                current.mirrorCount >= 5
                  ? 'border-border text-muted-foreground/50 cursor-not-allowed'
                  : 'border-amber-300 text-amber-600 hover:bg-amber-100'
              )}
            >
              <Plus className="w-3 h-3" />
            </button>
            {current.mirrorCount > 1 && (
              <span className="text-[10px] text-amber-600">
                +{(current.mirrorCount - 1) * LOGISTICS_TIME_DELTAS.mirrors.perExtra} min
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Crew Notes (Optional) */}
      <div className="space-y-1.5 pt-2 border-t border-amber-200/30">
        <SectionHeader>Crew Notes (Optional)</SectionHeader>
        <textarea
          value={current.notes || ''}
          onChange={(e) => update({ notes: e.target.value || undefined })}
          placeholder="Any special notes for the cleaning crew..."
          className="w-full text-xs p-2 rounded-md border border-border bg-background resize-none h-14 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>
      
      {/* Footer */}
      <div className="pt-2 border-t border-amber-200/30">
        <p className="text-[10px] text-muted-foreground italic">
          Affects cleaning time only — price won't change
        </p>
      </div>
    </div>
  );
}
