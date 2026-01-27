import React from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface FreezeToggleWrapperProps {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

/**
 * FreezeToggleWrapper - Used for Partial Empty mode in MOVING flow
 * Wraps area sections (Kitchen, Living, Hallways, Stairs) with a toggle header
 * When disabled: dashed border, reduced opacity, content collapsed
 * When enabled: normal styling with content visible
 */
export const FreezeToggleWrapper: React.FC<FreezeToggleWrapperProps> = ({
  label,
  enabled,
  onToggle,
  children,
}) => (
  <div className={cn(
    "rounded-xl border-2 overflow-hidden transition-all duration-200",
    enabled
      ? "border-primary/30 bg-primary/[0.03]"
      : "border-dashed border-muted-foreground/30 bg-muted/30 opacity-70"
  )}>
    <div className="flex items-center justify-between p-3 border-b border-border/50">
      <span className="text-sm font-medium">{label}</span>
      <Switch 
        checked={enabled} 
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
    {enabled && children}
  </div>
);
