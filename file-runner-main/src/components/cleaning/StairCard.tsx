/**
 * StairCard — Individual Stair Configuration Card
 * 
 * UI matches the reference screenshot style:
 * - Select dropdowns for floor connection and step count
 * - Pill buttons for surface type
 * - Collapsible hazards section
 * Uses stable IDs for updates/removals. SSOT unchanged.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import type { Situation } from '@/contexts/BookingContext';
import type { StairConfig, StairSurfaceType } from '@/lib/stairs/stairsModel';
import { calcStairHazardMinutes, calcStairTotalMinutes } from '@/lib/stairs/stairsModel';
import { getAreaTrackingCode } from '@/lib/homeStructureIds';
import { toast } from 'sonner';
import {
  Footprints,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Copy,
  CheckCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StairCardProps {
  stair: StairConfig;
  language: Language;
  onUpdate: (updates: Partial<StairConfig>) => void;
  onRemove: () => void;
  canRemove: boolean;
  maxFloors: number;
  situation: Situation;
}

const SURFACE_OPTIONS: { value: StairSurfaceType; label: string; labelEs: string; emoji: string }[] = [
  { value: 'hardwood', label: 'Hardwood', labelEs: 'Madera', emoji: '🪵' },
  { value: 'carpet', label: 'Carpet', labelEs: 'Alfombra', emoji: '🧶' },
  { value: 'mixed_runner', label: 'Runner', labelEs: 'Camino', emoji: '🎗️' },
];

const STEP_COUNT_OPTIONS = [
  { value: 8, label: '8 steps' },
  { value: 10, label: '10 steps' },
  { value: 12, label: '12 steps' },
  { value: 14, label: '14 steps' },
  { value: 16, label: '16 steps' },
  { value: 18, label: '18 steps' },
  { value: 20, label: '20 steps' },
  { value: 22, label: '22 steps' },
];

const HAZARDS = [
  { id: 'cornerBuildup' as const, labelKey: 'stairs.hazard.corner_buildup', fallback: 'Corner Buildup', time: '+12 min' },
  { id: 'petHairAccumulation' as const, labelKey: 'stairs.hazard.pet_hair', fallback: 'Pet Hair Accumulation', time: '+10 min' },
  { id: 'slipHazards' as const, labelKey: 'stairs.hazard.slip', fallback: 'Slip Hazards', time: '+5 min' },
  { id: 'railingsDetail' as const, labelKey: 'stairs.hazard.railings', fallback: 'Intricate Railings', time: '+18 min' },
];

export function StairCard({
  stair,
  language,
  onUpdate,
  onRemove,
  canRemove,
  maxFloors,
  situation,
}: StairCardProps) {
  const [hazardsOpen, setHazardsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Generate tracking code
  const trackingCode = getAreaTrackingCode('stairs', stair.id);
  
  // Count active hazards
  const activeHazardCount = HAZARDS.filter(h => stair[h.id]).length;
  
  // Calculate time
  const hazardMinutes = calcStairHazardMinutes(stair);
  const totalMinutes = calcStairTotalMinutes(stair);
  
  // Surface info
  const currentSurface = SURFACE_OPTIONS.find(s => s.value === stair.surfaceType);
  
  // Generate floor options
  const floorOptions = Array.from({ length: maxFloors }, (_, i) => i + 1);
  
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
      hazardMinutes > 0
        ? "border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10"
        : "border-border bg-card"
    )}>
      {/* Header Row */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/30 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            hazardMinutes > 0 
              ? "bg-amber-100 dark:bg-amber-900/30" 
              : "bg-muted"
          )}>
            <Footprints className={cn(
              "w-5 h-5",
              hazardMinutes > 0 
                ? "text-amber-600 dark:text-amber-400" 
                : "text-muted-foreground"
            )} />
          </div>
          
          <div className="flex flex-col min-w-0 flex-1">
            {/* Title row with badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                🪜 {stair.label}
              </span>
              {/* Tracking Code Chip */}
              <button
                onClick={handleCopyCode}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-all",
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
              {/* Floor Connection Badge (read-only) */}
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                F{stair.fromFloor} → F{stair.toFloor}
              </span>
            </div>
            
            {/* Subtitle row */}
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-xs text-muted-foreground">
                {currentSurface?.emoji} {currentSurface?.[language === 'es' ? 'labelEs' : 'label']}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                • {stair.stepCount} steps
              </span>
              {hazardMinutes > 0 && (
                <span className="text-[10px] text-amber-600 font-medium">
                  +{hazardMinutes} min hazards
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Time Badge */}
          <div className="px-2 py-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground shrink-0">
            ~{totalMinutes} min
          </div>
          
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
      
      {/* Content */}
      <div className="p-3 sm:p-4 space-y-4">
        {/* Stair Connection + Est. Steps Row with Select dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* STAIR CONNECTION - Two Select dropdowns */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Stair Connection
            </label>
            <div className="flex items-center gap-2">
              <Select
                value={String(stair.fromFloor)}
                onValueChange={(val) => onUpdate({ fromFloor: parseInt(val, 10) })}
              >
                <SelectTrigger className="w-full h-9 text-xs bg-background">
                  <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {floorOptions.map((floor) => (
                    <SelectItem key={floor} value={String(floor)} className="text-xs">
                      Floor {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              
              <Select
                value={String(stair.toFloor)}
                onValueChange={(val) => onUpdate({ toFloor: parseInt(val, 10) })}
              >
                <SelectTrigger className="w-full h-9 text-xs bg-background">
                  <SelectValue placeholder="To" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {floorOptions.map((floor) => (
                    <SelectItem key={floor} value={String(floor)} className="text-xs">
                      Floor {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* EST. STEPS - Select dropdown */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Est. Steps
            </label>
            <Select
              value={String(stair.stepCount)}
              onValueChange={(val) => onUpdate({ stepCount: parseInt(val, 10) })}
            >
              <SelectTrigger className="w-full h-9 text-xs bg-background">
                <SelectValue placeholder="Select steps" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {STEP_COUNT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Count steps between floors
            </p>
          </div>
        </div>
        
        {/* SURFACE TYPE - Pill buttons */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Surface Type
          </label>
          <div className="flex gap-1.5">
            {SURFACE_OPTIONS.map((surface) => (
              <button
                key={surface.value}
                onClick={() => onUpdate({ surfaceType: surface.value })}
                className={cn(
                  "flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1",
                  stair.surfaceType === surface.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <span>{surface.emoji}</span>
                <span>{surface[language === 'es' ? 'labelEs' : 'label']}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Included info */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30">
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            ✓ Stair cleaning is included in your service
          </span>
        </div>
        
        {/* Hazards Collapsible */}
        <Collapsible open={hazardsOpen} onOpenChange={setHazardsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-foreground">
                Stair Hazards
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
            <p className="text-[10px] text-muted-foreground mb-2">
              Hazards like pet hair or intricate railings add extra time.
            </p>
            {HAZARDS.map(hazard => {
              const isActive = stair[hazard.id];
              const label = t(language, hazard.labelKey) || hazard.fallback;
              
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
                    <span className={cn(
                      "text-xs",
                      isActive ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {label}
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
