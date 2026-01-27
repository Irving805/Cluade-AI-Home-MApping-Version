import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { HallwayConfig, HallwaySizeTier } from '@/contexts/BookingContext';
import { RoomWindowSelection } from '@/lib/roomWindowConfig';
import { DoorOpen, Trash2, ChevronDown, Package, Clock, AlertTriangle, Footprints, Layers, PenTool, Frame, Check, Info, Sparkles, Copy, CheckCheck, MapPin, ArrowRight, ChefHat, Sofa, UtensilsCrossed, Bed, Bath, TrendingUp, WashingMachine } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { RoomWindowSectionCompact } from './RoomWindowSectionCompact';
import { HALLWAY_RATES, HALLWAY_SIZE_INFO, calculateHallwayCabinetFee } from '@/lib/pricing_hallways';
import { isDeepCleanLevel } from '@/lib/pricingTier';
import { getAreaTrackingCode } from '@/lib/homeStructureIds';
import { toast } from 'sonner';
import { FloorTypeSelector, RoomFloorType } from './FloorTypeSelector';
import { FloorLocationSelector } from './FloorLocationSelector';
import { CeilingHeightSelector } from './CeilingHeightSelector';
import { ResidentialCeilingHeight } from '@/lib/ceilingHeightTypes';

// Official area IDs for Connection Mapping (SSOT)
const CONNECTION_AREAS = [
  { id: 'home_entry', icon: DoorOpen },
  { id: 'kitchen', icon: ChefHat },
  { id: 'living', icon: Sofa },
  { id: 'dining', icon: UtensilsCrossed },
  { id: 'bedrooms', icon: Bed },
  { id: 'bathrooms', icon: Bath },
  { id: 'stairs', icon: TrendingUp },
  { id: 'utility', icon: WashingMachine },
];

interface HallwayCardProps {
  hallway: HallwayConfig;
  index: number;
  language: Language;
  onUpdate: (updates: Partial<HallwayConfig>) => void;
  onRemove: () => void;
  canRemove: boolean;
  isMovingFlow: boolean;
  isLiveHereFlow: boolean;
  maxFloors?: number;  // For floor level selector
  // SSOT: Pass baseServiceLevel for internal isDeepClean computation
  baseServiceLevel?: string;
  // Window section props
  showWindowSection?: boolean;
  roomWindowSelection?: RoomWindowSelection;
  onWindowUpdate?: (updates: Partial<RoomWindowSelection>) => void;
  tracksIncludedByDefault?: boolean;
  includedWindowsEnabled?: boolean;
  // Ceiling height props (Detailed Home Mapping)
  ceilingHeight?: ResidentialCeilingHeight | null;
  onCeilingHeightChange?: (height: ResidentialCeilingHeight) => void;
  showCeilingSelector?: boolean;
}

const SIZE_TIERS: { value: HallwaySizeTier; label: string; labelEs: string; emoji: string }[] = [
  { value: 'SMALL', label: 'Small', labelEs: 'Pequeño', emoji: '🚶' },
  { value: 'MEDIUM', label: 'Medium', labelEs: 'Mediano', emoji: '🚶‍♂️' },
  { value: 'LARGE', label: 'Large', labelEs: 'Grande', emoji: '🏃' },
];

const HAZARDS = [
  { id: 'highTrafficDust' as const, icon: Footprints, labelKey: 'hallways.high_traffic_dust', time: '+8 min' },
  { id: 'runnerOrRug' as const, icon: Layers, labelKey: 'hallways.runner_rug', time: '+10 min' },
  { id: 'wallScuffs' as const, icon: PenTool, labelKey: 'hallways.wall_scuffs', time: '+12 min' },
  { id: 'galleryWall' as const, icon: Frame, labelKey: 'hallways.gallery_wall', time: '+15 min' },
  { id: 'entryDebris' as const, icon: DoorOpen, labelKey: 'hallways.entry_debris', time: '+8 min' },
];

export function HallwayCard({
  hallway,
  index,
  language,
  onUpdate,
  onRemove,
  canRemove,
  isMovingFlow,
  isLiveHereFlow,
  maxFloors = 1,
  // SSOT: baseServiceLevel for internal Deep Clean detection
  baseServiceLevel = '',
  showWindowSection = false,
  roomWindowSelection,
  onWindowUpdate,
  tracksIncludedByDefault = false,
  includedWindowsEnabled = false,
  // Ceiling height
  ceilingHeight = null,
  onCeilingHeightChange,
  showCeilingSelector = false,
}: HallwayCardProps) {
  const [hazardsOpen, setHazardsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Generate tracking code
  const trackingCode = getAreaTrackingCode('hallway', hallway.id);
  
  // SSOT: Compute isDeepClean internally from baseServiceLevel
  const isDeepClean = isDeepCleanLevel(baseServiceLevel);
  
  // SSOT: Use centralized cabinet fee calculation
  // Shows fee UI when: cabinetCount >= 1 AND (MOVING OR LIVE_HERE Deep Clean)
  const situation = isMovingFlow ? 'MOVING' : 'LIVE_HERE';
  const { fee: cabinetFee, feePerDoor } = calculateHallwayCabinetFee(
    hallway.cabinetCount,
    hallway.cabinetsEmpty,
    situation,
    isDeepClean
  );
  const showCabinetFeeUI = hallway.cabinetCount >= 1 && (isMovingFlow || isDeepClean);
  
  // Count active hazards
  const activeHazardCount = HAZARDS.filter(h => hallway[h.id]).length;
  
  // Organization cost for LIVE_HERE only
  const orgCost = hallway.organizationHours * HALLWAY_RATES.ORGANIZATION_RATE;
  
  // Get size info for microcopy
  const sizeInfo = HALLWAY_SIZE_INFO[hallway.sizeTier];
  
  // Copy tracking code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      toast.success(`Copied ${trackingCode}`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };
  
  return (
    <div className={cn(
      "rounded-xl border-2 transition-all duration-200 overflow-hidden",
      cabinetFee > 0
        ? "border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10"
        : orgCost > 0
          ? "border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5"
          : "border-border bg-card"
    )}>
      {/* Header Row */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/30 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            cabinetFee > 0 
              ? "bg-amber-100 dark:bg-amber-900/30" 
              : orgCost > 0
                ? "bg-primary/10"
                : "bg-muted"
          )}>
            <DoorOpen className={cn(
              "w-5 h-5",
              cabinetFee > 0 
                ? "text-amber-600 dark:text-amber-400" 
                : orgCost > 0
                  ? "text-primary"
                  : "text-muted-foreground"
            )} />
          </div>
          
          <div className="flex flex-col min-w-0 flex-1">
            {/* Title row with badges - responsive wrap */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              {/* Label + tracking code */}
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="text-sm font-semibold text-foreground truncate">
                  {hallway.label}
                </span>
                {/* Tracking Code Chip */}
                <button
                  onClick={handleCopyCode}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-all flex-shrink-0",
                    "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    copied && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  )}
                  title="Click to copy area ID"
                >
                  {copied ? (
                    <CheckCheck className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 flex-shrink-0" />
                  )}
                  <span>{trackingCode}</span>
                </button>
              </div>
              
              {/* Floor Level Pills - wraps to new line on mobile */}
              {maxFloors > 1 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <FloorLocationSelector
                    language={language}
                    value={hallway.floorLevel || null}
                    onChange={(floor) => onUpdate({ floorLevel: floor })}
                    maxFloors={maxFloors}
                    inline={true}
                    showRequired={maxFloors >= 2}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {SIZE_TIERS.find(s => s.value === hallway.sizeTier)?.[language === 'es' ? 'labelEs' : 'label']}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                ({sizeInfo.ftRange})
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status Chip - SSOT: uses cabinetFee from calculateHallwayCabinetFee */}
          {(isMovingFlow || isDeepClean) && cabinetFee > 0 && (
            <div className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              +${cabinetFee}
            </div>
          )}
          
          {(isMovingFlow || isDeepClean) && hallway.cabinetCount >= 1 && cabinetFee === 0 && (
            <div className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {t(language, 'hallway.included')}
            </div>
          )}
          
          {isLiveHereFlow && !isDeepClean && orgCost > 0 && (
            <div className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary shrink-0">
              +${orgCost.toFixed(0)}
            </div>
          )}
          
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Connection Mapping Section */}
      <div className="px-3 sm:px-4 pb-3 space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          {t(language, 'hallway.connects')}
        </label>
        
        {/* Connection chips */}
        <div className="flex flex-wrap gap-1.5">
          {CONNECTION_AREAS.map(area => {
            const isSelected = hallway.connectsTo?.includes(area.id);
            const AreaIcon = area.icon;
            return (
              <button
                key={area.id}
                onClick={() => {
                  const current = hallway.connectsTo || [];
                  const updated = isSelected
                    ? current.filter(id => id !== area.id)
                    : [...current, area.id];
                  onUpdate({ connectsTo: updated });
                }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <AreaIcon className="w-3 h-3" />
                {t(language, `hallway.connects.${area.id}`)}
              </button>
            );
          })}
        </div>
        
        {/* Route preview — computed at render using translations */}
        {hallway.connectsTo && hallway.connectsTo.length > 0 && (
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            {hallway.connectsTo.map(id => t(language, `hallway.connects.${id}`)).join(' → ')}
          </p>
        )}
      </div>
      
      {/* Content - Two Column on Desktop */}
      <div className="p-3 sm:p-4 space-y-4 border-t border-border/30">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left Column: Size */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t(language, 'hallway.size')}
            </label>
            <div className="flex gap-1.5">
              {SIZE_TIERS.map(tier => {
                const tierInfo = HALLWAY_SIZE_INFO[tier.value];
                return (
                  <button
                    key={tier.value}
                    onClick={() => onUpdate({ sizeTier: tier.value })}
                    className={cn(
                      "flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-0.5",
                      hallway.sizeTier === tier.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{tier.emoji} {tier[language === 'es' ? 'labelEs' : 'label']}</span>
                  </button>
                );
              })}
            </div>
            {/* Size microcopy */}
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              {sizeInfo.ftRange} — {language === 'es' ? sizeInfo.typicalEs : sizeInfo.typical}
            </p>
            
            {/* Floor Type Selector - Same pattern as Bedrooms */}
            <FloorTypeSelector
              value={(hallway.floorType as RoomFloorType) || 'hardwood_tile'}
              onChange={(type) => onUpdate({ floorType: type })}
              language={language}
              compact={true}
            />
            
            {/* Ceiling Height Selector - Detailed Home Mapping */}
            {showCeilingSelector && onCeilingHeightChange && (
              <CeilingHeightSelector
                language={language}
                value={ceilingHeight}
                onChange={onCeilingHeightChange}
              />
            )}
          </div>
          
          {/* Right Column: Cabinets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Package className="w-3 h-3" />
                {t(language, 'hallway.cabinets')}
              </label>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {hallway.cabinetCount}
              </span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(count => (
                <button
                  key={count}
                  onClick={() => onUpdate({ cabinetCount: count })}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                    hallway.cabinetCount === count
                      ? count >= HALLWAY_RATES.CABINET_THRESHOLD 
                        ? "bg-amber-500 text-white shadow-sm" 
                        : "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t(language, 'hallway.cabinets_helper')}
            </p>
          </div>
        </div>
        
        {/* Cabinet Empty Toggle - Show when: cabinetCount >= 1 AND (MOVING OR Deep Clean) */}
        {showCabinetFeeUI && (
          <div className={cn(
            "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
            hallway.cabinetsEmpty
              ? "border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-900/10"
              : "border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10"
          )}>
            <div className="flex items-center gap-3">
              {hallway.cabinetsEmpty ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  {t(language, 'hallway.cabinets_empty')}
                </span>
                <span className={cn(
                  "text-[10px] font-medium",
                  hallway.cabinetsEmpty 
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}>
                  {hallway.cabinetsEmpty 
                    ? `+$${HALLWAY_RATES.CABINET_DOOR_EMPTY}/door × ${hallway.cabinetCount} = $${hallway.cabinetCount * HALLWAY_RATES.CABINET_DOOR_EMPTY}`
                    : `+$${HALLWAY_RATES.CABINET_DOOR_NOT_EMPTY}/door × ${hallway.cabinetCount} = $${hallway.cabinetCount * HALLWAY_RATES.CABINET_DOOR_NOT_EMPTY}`
                  }
                </span>
              </div>
            </div>
            <Switch
              checked={hallway.cabinetsEmpty}
              onCheckedChange={(checked) => onUpdate({ cabinetsEmpty: checked })}
            />
          </div>
        )}
        
        {/* LIVE_HERE Standard: Cabinet fee is $0, but still capture count for ops */}
        {isLiveHereFlow && !isDeepClean && hallway.cabinetCount > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50">
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground">
              {hallway.cabinetCount} cabinet door{hallway.cabinetCount > 1 ? 's' : ''} — No extra fee for standard clean
            </span>
          </div>
        )}
        
        {/* LIVE_HERE: Organization Hours Slider (hidden for MOVING) */}
        {isLiveHereFlow && (
          <div className="space-y-3 p-3 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">
                    {t(language, 'hallway.organization')}
                  </span>
                  <span className="text-[10px] text-primary font-medium">
                    {t(language, 'hallway.extra_service')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-primary tabular-nums">
                  {hallway.organizationHours > 0 
                    ? `$${orgCost.toFixed(0)}`
                    : '$0'
                  }
                </span>
                {hallway.organizationHours > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {hallway.organizationHours}h × ${HALLWAY_RATES.ORGANIZATION_RATE}
                  </p>
                )}
              </div>
            </div>
            
            <Slider
              value={[hallway.organizationHours]}
              onValueChange={([value]) => onUpdate({ organizationHours: value })}
              min={0}
              max={4}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>0h</span>
              <span>1h</span>
              <span>2h</span>
              <span>3h</span>
              <span>4h</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t(language, 'hallway.org_hint')}
            </p>
          </div>
        )}
        
        {/* Window Section */}
        {showWindowSection && onWindowUpdate && (
          <RoomWindowSectionCompact
            roomId={hallway.id}
            roomType="hallways"
            roomLabel={hallway.label}
            language={language}
            roomWindowSelection={roomWindowSelection}
            onUpdate={onWindowUpdate}
            showSillsTracks={isMovingFlow}
            tracksIncludedByDefault={tracksIncludedByDefault}
            includedWindowsEnabled={includedWindowsEnabled}
            includedWindowsLimit={2}  // AGGREGATE policy: shared 2 across all hallways
          />
        )}
        
        {/* Hazards Collapsible */}
        <Collapsible open={hazardsOpen} onOpenChange={setHazardsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-foreground">
                {t(language, 'hallways.hazard.title')}
              </span>
              {activeHazardCount > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full">
                  {activeHazardCount}
                </span>
              )}
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              hazardsOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-2 space-y-1.5">
            {HAZARDS.map(hazard => {
              const Icon = hazard.icon;
              const isActive = hallway[hazard.id];
              
              return (
                <div
                  key={hazard.id}
                  className={cn(
                    "flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-all",
                    isActive
                      ? "border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/20"
                      : "border-border/30 bg-card hover:border-border/50"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Icon className={cn(
                      "w-4 h-4",
                      isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-xs",
                      isActive ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {t(language, hazard.labelKey)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        {hazard.time}
                      </span>
                    )}
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => onUpdate({ [hazard.id]: checked })}
                      className="scale-90"
                    />
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}