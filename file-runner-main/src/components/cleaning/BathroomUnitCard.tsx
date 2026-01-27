/**
 * BathroomUnitCard — Individual bathroom configuration card
 * Collapsible card with premium styling for per-unit customization
 * Includes floor assignment for multi-floor properties
 * Includes logistics panel for operational time estimation (V1)
 * 
 * IMPORTANT: Uses PricingTier ('std' | 'deep') for bathroom pricing.
 * "Move-In/Out" is UX branding only - bathrooms use STANDARD tier.
 */

import { ChevronDown, Bath, Sparkles, Droplet, Grid3X3, Layers, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import type { BathroomUnit, BathroomFixtures, BathroomVanityType, BathroomGlassLevel, BathroomTileLevel, BathroomSizeType, BathroomCondition, BathroomLogistics } from '@/lib/bathroomMappingTypes';
import type { FloorId } from '@/lib/floorLocationTypes';
import type { PricingTier } from '@/lib/pricingTier';
import { getFloorOptions, getFloorLabel, getFloorLabelShort } from '@/lib/floorLocationTypes';
import { calculateBathroomUnit } from '@/lib/bathroomPricing';
import { calculateBathroomLogisticsTime } from '@/lib/bathroomLogisticsTime';
import { BathroomLogisticsPanel } from './BathroomLogisticsPanel';

interface BathroomUnitCardProps {
  language: Language;
  unit: BathroomUnit;
  tier: PricingTier;  // Changed from isDeep: boolean
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (updates: Partial<BathroomUnit>) => void;
  propertyFloors?: number;
}

// Pill button component for selections
function PillButton({
  selected,
  onClick,
  children,
  disabled = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-3 py-1.5 text-xs rounded-full border transition-all duration-200',
        selected
          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
          : 'bg-card text-muted-foreground border-border hover:border-rose-300 hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

// Toggle button component
function ToggleButton({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-all',
        checked
          ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 text-rose-700 dark:text-rose-300'
          : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/50'
      )}
    >
      <div className={cn(
        'w-3.5 h-3.5 rounded-sm border flex items-center justify-center',
        checked ? 'bg-rose-500 border-rose-500' : 'border-muted-foreground/50'
      )}>
        {checked && <span className="text-white text-[10px]">✓</span>}
      </div>
      {label}
    </button>
  );
}

export function BathroomUnitCard({
  language,
  unit,
  tier,  // Changed from isDeep
  isExpanded,
  onToggleExpand,
  onChange,
  propertyFloors = 1,
}: BathroomUnitCardProps) {
  // Calculate pricing for this unit using tier
  const pricing = calculateBathroomUnit(unit, tier);
  
  // Calculate logistics extra time
  const logisticsExtraTime = calculateBathroomLogisticsTime(unit.logistics);
  const totalTime = pricing.timeMinutes + logisticsExtraTime;
  
  // Type label
  const typeLabels: Record<string, string> = {
    master: 'Master Bath',
    full: 'Full Bath',
    half: 'Half Bath',
  };
  
  // Build quick summary (compact)
  const quickSummary: string[] = [];
  if (unit.fixtures !== 'none') {
    const fixtureLabels: Record<string, string> = {
      shower: 'Shower',
      tub: 'Tub',
      shower_tub: 'Tub+Shower',
    };
    quickSummary.push(fixtureLabels[unit.fixtures] || '');
  }
  if (unit.vanity === 'double') quickSummary.push('Dbl Vanity');
  if (unit.glass !== 'none') quickSummary.push(unit.glass === 'heavy' ? 'Heavy Glass' : 'Glass');
  if (unit.condition !== 'standard') {
    quickSummary.push(unit.condition === 'buildup' ? 'Buildup' : 'Severe');
  }
  if (logisticsExtraTime > 0) {
    quickSummary.push(`+${logisticsExtraTime}min ops`);
  }
  
  const isHalfBath = unit.type === 'half';
  const showFloorSelector = propertyFloors >= 2;
  const floorOptions = getFloorOptions(propertyFloors);
  
  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      isExpanded 
        ? 'border-rose-400 bg-rose-50/30 dark:bg-rose-900/10 shadow-sm' 
        : 'border-border bg-card hover:border-muted-foreground/40',
      unit.isCustomized && 'ring-1 ring-rose-200 dark:ring-rose-800'
    )}>
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-3 gap-3"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-1.5 rounded-lg',
            unit.type === 'master' 
              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600'
              : 'bg-muted text-muted-foreground'
          )}>
            <Bath className="w-4 h-4" />
          </div>
          
          <div className="text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {typeLabels[unit.type]}
              </span>
              
              {/* Floor badge - only for multi-floor */}
              {showFloorSelector && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                  {getFloorLabelShort(unit.floorId)}
                </span>
              )}
              
              {/* Floor remap badge - shows when floor was auto-remapped */}
              {unit.floorRemappedFrom && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                  Moved from {getFloorLabelShort(unit.floorRemappedFrom)}
                </span>
              )}
              
              {/* Ensuite badge */}
              {unit.isEnsuite && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                  Ensuite
                </span>
              )}
              
              {/* Customized badge */}
              {unit.isCustomized && (
                <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full">
                  Customized
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {quickSummary.length > 0 ? quickSummary.join(' • ') : 'Standard config'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-rose-600">
            +${pricing.price}
          </span>
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </button>
      
      {/* Expanded Content - Premium 2-column layout */}
      {isExpanded && (
        <div className="px-3 pb-4 pt-1 border-t border-border/50 space-y-4">
          {/* Floor Location - Only for multi-floor (FIRST for prominence) */}
          {showFloorSelector && (
            <div className="space-y-2 p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Floor Location</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {floorOptions.map(floor => (
                  <PillButton
                    key={floor}
                    selected={unit.floorId === floor}
                    onClick={() => onChange({ floorId: floor })}
                  >
                    {getFloorLabel(floor, language)}
                  </PillButton>
                ))}
              </div>
            </div>
          )}
          
          {/* 2-column grid for desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Layout & Fixtures */}
            <div className="space-y-4">
              {/* Fixtures - Only for non-half baths */}
              {!isHalfBath && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Fixtures</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['shower', 'tub', 'shower_tub'] as BathroomFixtures[]).map(f => (
                      <PillButton
                        key={f}
                        selected={unit.fixtures === f}
                        onClick={() => onChange({ fixtures: f })}
                      >
                        {f === 'shower' ? 'Shower' : f === 'tub' ? 'Tub' : 'Both'}
                      </PillButton>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Vanity */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Grid3X3 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Vanity</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['single', 'double'] as BathroomVanityType[]).map(v => (
                    <PillButton
                      key={v}
                      selected={unit.vanity === v}
                      onClick={() => onChange({ vanity: v })}
                    >
                      {v === 'single' ? 'Single' : 'Double'}
                    </PillButton>
                  ))}
                </div>
              </div>
              
              {/* Glass Level - Only for non-half baths */}
              {!isHalfBath && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Glass Enclosure</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['none', 'standard', 'heavy'] as BathroomGlassLevel[]).map(g => (
                      <PillButton
                        key={g}
                        selected={unit.glass === g}
                        onClick={() => onChange({ glass: g })}
                      >
                        {g === 'none' ? 'None' : g === 'standard' ? 'Standard' : 'Heavy (+$5)'}
                      </PillButton>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Column 2: Condition & Details */}
            <div className="space-y-4">
              {/* Tile/Grout Level */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-foreground">Tile & Grout</span>
                <div className="flex flex-wrap gap-2">
                  {(['light', 'normal', 'heavy'] as BathroomTileLevel[]).map(t => (
                    <PillButton
                      key={t}
                      selected={unit.tileLevel === t}
                      onClick={() => onChange({ tileLevel: t })}
                    >
                      {t === 'light' ? 'Light' : t === 'normal' ? 'Normal' : 'Heavy (+$5)'}
                    </PillButton>
                  ))}
                </div>
              </div>
              
              {/* Size */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-foreground">Size</span>
                <div className="flex flex-wrap gap-2">
                  {(['small', 'normal', 'large'] as BathroomSizeType[]).map(s => (
                    <PillButton
                      key={s}
                      selected={unit.size === s}
                      onClick={() => onChange({ size: s })}
                    >
                      {s === 'small' ? 'Small' : s === 'normal' ? 'Normal' : 'Large'}
                    </PillButton>
                  ))}
                </div>
              </div>
              
              {/* Condition */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-foreground">Condition</span>
                <div className="flex flex-wrap gap-2">
                  {(['standard', 'buildup', 'severe'] as BathroomCondition[]).map(c => (
                    <PillButton
                      key={c}
                      selected={unit.condition === c}
                      onClick={() => onChange({ condition: c })}
                    >
                      {c === 'standard' ? 'Standard' : c === 'buildup' ? 'Buildup (+$8)' : 'Severe (+$15)'}
                    </PillButton>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Toggles Row - Footer */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <ToggleButton
              checked={unit.isEnsuite}
              onChange={(checked) => onChange({ isEnsuite: checked })}
              label="Ensuite"
            />
            <ToggleButton
              checked={unit.hasWindow}
              onChange={(checked) => onChange({ hasWindow: checked })}
              label="Window"
            />
          </div>
          
          {/* Bathroom Logistics Panel (Operational Details) */}
          <BathroomLogisticsPanel
            logistics={unit.logistics}
            onChange={(newLogistics: BathroomLogistics) => onChange({ 
              logistics: newLogistics,
              logisticsCustomized: true,  // Mark as customized to prevent preset overwrite
            })}
            isHalfBath={isHalfBath}
          />
          
          {/* Pricing breakdown */}
          <div className="pt-3 border-t border-border/50">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Unit Total:</span>
              <span className="font-bold text-rose-600">${pricing.price}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Base Time:</span>
              <span className="font-medium text-foreground">{pricing.timeMinutes} min</span>
            </div>
            {logisticsExtraTime > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Logistics Extra:
                </span>
                <span className="font-medium text-amber-600">+{logisticsExtraTime} min</span>
              </div>
            )}
            <div className="flex justify-between text-xs mt-1 pt-1 border-t border-dashed border-border/50">
              <span className="text-muted-foreground font-medium">Total Time:</span>
              <span className="font-bold text-foreground">{totalTime} min</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
