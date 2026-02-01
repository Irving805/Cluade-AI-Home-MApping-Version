import { Bath, Info, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BathroomModulesSectionProps {
  language: Language;
  masterBaths: number;
  fullBaths: number;
  halfBaths: number;
  onMasterChange: (count: number) => void;
  onFullChange: (count: number) => void;
  onHalfChange: (count: number) => void;
  bathRates: {
    master: number;
    full: number;
    half: number;
  };
}

export function BathroomModulesSection({
  language,
  masterBaths,
  fullBaths,
  halfBaths,
  onMasterChange,
  onFullChange,
  onHalfChange,
  bathRates,
}: BathroomModulesSectionProps) {
  const totalBathrooms = masterBaths + fullBaths + (halfBaths * 0.5);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-md text-rose-600 dark:text-rose-400">
          <Bath className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold text-foreground uppercase tracking-wide">
          {t(language, 'label.bathroom_section')}
        </span>
      </div>

      {/* Grid Container - Stack on mobile, 3-col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* CARD 1: MASTER BATH */}
        <TooltipProvider>
          <div className={cn(
            "flex flex-col justify-between p-4 rounded-xl border transition-all duration-200",
            masterBaths > 0 
              ? "border-rose-500 bg-rose-50/10 dark:bg-rose-900/10 shadow-sm" 
              : "border-border bg-card hover:border-muted-foreground/30"
          )}>
            {/* Info Section */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-foreground text-sm">{t(language, 'bath.master')}</h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    <p>Includes double vanity, deep tub/shower scrub, and detailed mirror cleaning</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">+${bathRates.master.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tub + Shower + Double Vanity</p>
            </div>
            
            {/* Control Row (Compact) */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">QTY</span>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => masterBaths > 0 && onMasterChange(masterBaths - 1)}
                  disabled={masterBaths <= 0}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-rose-500 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-4 text-center font-bold text-foreground text-sm tabular-nums">
                  {masterBaths}
                </span>
                <button 
                  type="button"
                  onClick={() => masterBaths < 10 && onMasterChange(masterBaths + 1)}
                  disabled={masterBaths >= 10}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-emerald-500 hover:text-emerald-600 active:bg-emerald-50 dark:active:bg-emerald-900/20 transition-all shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* CARD 2: FULL BATH */}
        <TooltipProvider>
          <div className={cn(
            "flex flex-col justify-between p-4 rounded-xl border transition-all duration-200",
            fullBaths > 0 
              ? "border-rose-500 bg-rose-50/10 dark:bg-rose-900/10 shadow-sm" 
              : "border-border bg-card hover:border-muted-foreground/30"
          )}>
            <div className="mb-4">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-foreground text-sm">{t(language, 'bath.full')}</h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    <p>Standard tub/shower combo with full sanitization of all surfaces</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">+${bathRates.full.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Standard Tub/Shower Combo</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">QTY</span>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => fullBaths > 0 && onFullChange(fullBaths - 1)} 
                  disabled={fullBaths <= 0} 
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-rose-500 hover:text-rose-600 disabled:opacity-50 shrink-0 shadow-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-4 text-center font-bold text-foreground text-sm tabular-nums">{fullBaths}</span>
                <button 
                  type="button" 
                  onClick={() => fullBaths < 10 && onFullChange(fullBaths + 1)} 
                  disabled={fullBaths >= 10}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-emerald-500 hover:text-emerald-600 active:bg-emerald-50 dark:active:bg-emerald-900/20 transition-all shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* CARD 3: HALF BATH */}
        <TooltipProvider>
          <div className={cn(
            "flex flex-col justify-between p-4 rounded-xl border transition-all duration-200",
            halfBaths > 0 
              ? "border-rose-500 bg-rose-50/10 dark:bg-rose-900/10 shadow-sm" 
              : "border-border bg-card hover:border-muted-foreground/30"
          )}>
            <div className="mb-4">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-foreground text-sm">{t(language, 'bath.half')}</h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    <p>Toilet, sink, and mirror only — no tub or shower</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">+${bathRates.half.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Toilet + Sink Only</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">QTY</span>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => halfBaths > 0 && onHalfChange(halfBaths - 1)} 
                  disabled={halfBaths <= 0} 
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-rose-500 hover:text-rose-600 disabled:opacity-50 shrink-0 shadow-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-4 text-center font-bold text-foreground text-sm tabular-nums">{halfBaths}</span>
                <button 
                  type="button" 
                  onClick={() => halfBaths < 10 && onHalfChange(halfBaths + 1)} 
                  disabled={halfBaths >= 10}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:border-emerald-500 hover:text-emerald-600 active:bg-emerald-50 dark:active:bg-emerald-900/20 transition-all shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground text-center">
        {t(language, 'label.bathroom_summary').replace('{count}', totalBathrooms.toString())}
      </div>
    </div>
  );
}
