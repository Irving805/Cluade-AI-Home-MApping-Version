import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { StairsConfig, StairSurfaceType } from '@/contexts/BookingContext';
import { Footprints, CheckCircle2, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StairConnectionSelector } from './StairConnectionSelector';
import { StairConnection } from '@/lib/floorLocationTypes';

interface StairsConfigSectionProps {
  language: Language;
  stairsConfig: StairsConfig;
  onStairsConfigChange: (updates: Partial<StairsConfig>) => void;
  showStepCount?: boolean;
  showStandardInclusions?: boolean;
  isDeepOrMove?: boolean;
  maxFloors?: number; // For stair connection selector
  showConnectionRequired?: boolean; // Show required state for connection
}

const STAIR_SURFACE_OPTIONS: { value: StairSurfaceType; emoji: string; labelKey: string }[] = [
  { value: 'hardwood', emoji: '🪵', labelKey: 'stairs.hardwood' },
  { value: 'carpet', emoji: '🪨', labelKey: 'stairs.carpet' },
  { value: 'mixed_runner', emoji: '🔀', labelKey: 'stairs.mixed_runner' },
];

const STEP_COUNT_OPTIONS = [
  { value: 10, label: '8-12 steps' },
  { value: 14, label: '12-16 steps' },
  { value: 18, label: '16-20 steps' },
  { value: 22, label: '20+ steps' },
];

// Standard inclusions for stairs
const STAIR_STANDARD_INCLUSIONS = [
  { emoji: '✨', labelKey: 'stairs.dusting_rails' },
  { emoji: '🕸️', labelKey: 'stairs.cobwebs' },
  { emoji: '🧹', labelKey: 'stairs.vacuuming' },
  { emoji: '📐', labelKey: 'stairs.corners' },
];

export function StairsConfigSection({
  language,
  stairsConfig,
  onStairsConfigChange,
  showStepCount = true,
  showStandardInclusions = true,
  isDeepOrMove = false,
  maxFloors = 2,
  showConnectionRequired = false,
}: StairsConfigSectionProps) {
  // Handler for stair connection changes
  const handleConnectionChange = (connection: StairConnection) => {
    onStairsConfigChange({ stairConnection: connection });
  };

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Footprints className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {t(language, 'stairs.logistics')}
        </span>
      </div>
      
      {/* Stair Connection Selector - Premium (for multi-floor properties) */}
      {maxFloors >= 2 && (
        <StairConnectionSelector
          language={language}
          value={stairsConfig.stairConnection}
          onChange={handleConnectionChange}
          maxFloors={maxFloors}
          showRequired={showConnectionRequired}
        />
      )}
      
      {/* Standard Inclusions (always shown when stairs enabled) */}
      {showStandardInclusions && (
        <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-900/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">
              {t(language, 'stairs.standard_inclusions')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[9px] text-emerald-700 dark:text-emerald-400">
            {STAIR_STANDARD_INCLUSIONS.map((inclusion, idx) => (
              <span key={idx} className="flex items-center gap-1">
                <span>{inclusion.emoji}</span>
                <span>{t(language, inclusion.labelKey)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Stair Surface Type Selection */}
      <div className="space-y-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {t(language, 'stairs.surface_type')}
        </span>
        <div className="grid grid-cols-3 gap-2">
          {STAIR_SURFACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStairsConfigChange({ surfaceType: option.value })}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-200",
                stairsConfig.surfaceType === option.value
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/50 bg-card hover:border-primary/30"
              )}
            >
              <span className="text-lg">{option.emoji}</span>
              <span className={cn(
                "text-[10px] font-medium text-center leading-tight",
                stairsConfig.surfaceType === option.value
                  ? "text-primary"
                  : "text-muted-foreground"
              )}>
                {t(language, option.labelKey)}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Estimated Step Count */}
      {showStepCount && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {t(language, 'stairs.step_count')}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              {t(language, 'stairs.step_count_hint')}
            </span>
          </div>
          <Select
            value={String(stairsConfig.stepCount || 14)}
            onValueChange={(value) => onStairsConfigChange({ stepCount: parseInt(value) })}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEP_COUNT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Window Cleaning Section (Deep/Move only) */}
      {isDeepOrMove && (
        <div className="pt-2 mt-2 border-t border-dashed border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-foreground uppercase tracking-wide">
              {t(language, 'stairs.window_section')}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
              2 {t(language, 'win.included_badge') || 'Included'}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground">
            {t(language, 'win.included_stairs_desc')}
          </p>
        </div>
      )}
    </div>
  );
}
