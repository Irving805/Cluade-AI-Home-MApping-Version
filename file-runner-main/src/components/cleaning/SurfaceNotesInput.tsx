import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { FileText, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface SurfaceNotesInputProps {
  roomId: string;
  value: string;
  onChange: (value: string) => void;
  language: Language;
  placeholder?: string;
  compact?: boolean;
}

export function SurfaceNotesInput({
  roomId,
  value,
  onChange,
  language,
  placeholder,
  compact = false,
}: SurfaceNotesInputProps) {
  const [isExpanded, setIsExpanded] = useState(!!value); // Auto-expand if has content

  const defaultPlaceholder = t(language, 'surface.notes_placeholder');
  const finalPlaceholder = placeholder || defaultPlaceholder;

  const hasContent = value && value.trim().length > 0;
  const charCount = value?.length || 0;
  const maxChars = 200;

  return (
    <div 
      className={cn(
        "rounded-lg border transition-all",
        hasContent 
          ? "border-primary/30 bg-primary/[0.02]" 
          : "border-border/50 bg-muted/20",
        compact ? "p-2" : "p-2.5"
      )}
    >
      {/* Header - Clickable to expand */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "flex items-center justify-center rounded-md transition-colors",
            hasContent ? "text-primary" : "text-muted-foreground",
            compact ? "w-5 h-5" : "w-6 h-6"
          )}>
            <FileText className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
          </div>
          <span className={cn(
            "font-medium truncate",
            hasContent ? "text-foreground" : "text-muted-foreground",
            compact ? "text-[10px]" : "text-xs"
          )}>
            {t(language, 'surface.notes_title')}
          </span>
          {hasContent && !isExpanded && (
            <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">
              "{value.substring(0, 20)}..."
            </span>
          )}
        </div>
        
        <ChevronDown className={cn(
          "w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0",
          isExpanded && "rotate-180"
        )} />
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-2 space-y-1.5 animate-fade-in">
          <Textarea
            value={value}
            onChange={(e) => {
              const newValue = e.target.value.slice(0, maxChars);
              onChange(newValue);
            }}
            placeholder={finalPlaceholder}
            className={cn(
              "min-h-[60px] max-h-[100px] text-xs resize-none",
              "bg-background border-border/50 focus:border-primary/50"
            )}
          />
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted-foreground">
              {t(language, 'surface.notes_hint')}
            </span>
            <span className={cn(
              "text-[9px]",
              charCount > maxChars * 0.8 ? "text-amber-500" : "text-muted-foreground"
            )}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
