import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Paintbrush, Layers, Shuffle } from 'lucide-react';

// Floor type options per room
export type RoomFloorType = 'hardwood_tile' | 'carpet' | 'mixed';

interface FloorTypeSelectorProps {
  value: RoomFloorType;
  onChange: (type: RoomFloorType) => void;
  language: Language;
  compact?: boolean;
}

const FLOOR_OPTIONS: { id: RoomFloorType; icon: typeof Paintbrush; color: string }[] = [
  { id: 'hardwood_tile', icon: Paintbrush, color: 'amber' },
  { id: 'carpet', icon: Layers, color: 'violet' },
  { id: 'mixed', icon: Shuffle, color: 'slate' },
];

export function FloorTypeSelector({
  value,
  onChange,
  language,
  compact = false,
}: FloorTypeSelectorProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", compact && "py-1")}>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Paintbrush className="w-3 h-3" />
        {t(language, 'floor.title')}
      </span>
      <div className="flex gap-2">
        {FLOOR_OPTIONS.map((option) => {
          const isSelected = value === option.id;
          const IconComponent = option.icon;
          
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg border-2 transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? option.color === 'amber'
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm"
                    : option.color === 'violet'
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-sm"
                      : "border-slate-500 bg-slate-50 dark:bg-slate-900/20 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/50"
              )}
            >
              <IconComponent className={cn(
                "w-4 h-4 transition-colors",
                isSelected
                  ? option.color === 'amber'
                    ? "text-amber-600 dark:text-amber-400"
                    : option.color === 'violet'
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-slate-600 dark:text-slate-400"
                  : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[10px] font-semibold leading-tight text-center",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {t(language, `floor.${option.id}` as any)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
