import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface BaseboardToggleProps {
  roomId: string;
  isIncludedByDefault: boolean; // True for Deep/Move flows (shows as "Included" at $0)
  hasBaseboards: boolean;        // Whether baseboards are selected for this room
  onToggle: (enabled: boolean) => void;
  language: Language;
  compact?: boolean;
}

export function BaseboardToggle({
  roomId,
  isIncludedByDefault,
  hasBaseboards,
  onToggle,
  language,
  compact = true,
}: BaseboardToggleProps) {
  
  // For Deep/Move flows: Show as included benefit with option to deselect
  if (isIncludedByDefault) {
    return (
      <div className={cn(
        "rounded-lg border transition-all",
        hasBaseboards 
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          : "bg-muted/30 border-dashed border-muted-foreground/30"
      )}>
        <div className="flex items-center justify-between gap-2 p-2">
          <div className="flex items-center gap-2 min-w-0">
            {hasBaseboards ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex flex-col">
              <span className={cn(
                "text-[10px] font-semibold",
                hasBaseboards 
                  ? "text-emerald-700 dark:text-emerald-300" 
                  : "text-muted-foreground line-through"
              )}>
                {t(language, 'baseboard.included')}
              </span>
              {!hasBaseboards && (
                <span className="text-[9px] text-muted-foreground">
                  {t(language, 'baseboard.not_applicable')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasBaseboards && (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                $0
              </span>
            )}
            <Switch
              checked={hasBaseboards}
              onCheckedChange={onToggle}
              className="scale-75"
            />
          </div>
        </div>
      </div>
    );
  }

  // For Standard Clean: Show as optional add-on (not implemented in this version)
  // Baseboards are only included for Deep/Move, so this case won't typically render
  return null;
}
