/**
 * SidebarStatusBadge — Premium visual status indicator for area configuration
 * 
 * Status meanings:
 * - configured (green): All required fields have values
 * - incomplete (amber): At least one required field missing
 * - default_only (gray): User hasn't changed any field from default
 */

import { cn } from '@/lib/utils';
import { AreaStatus } from '@/lib/homeMappingSidebarContract';
import { Language, t } from '@/lib/translations';
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react';

interface SidebarStatusBadgeProps {
  status: AreaStatus;
  language: Language;
  compact?: boolean;
}

const statusConfig: Record<AreaStatus, {
  bgClass: string;
  textClass: string;
  ringClass: string;
  labelKey: string;
  Icon: typeof CheckCircle2;
}> = {
  configured: {
    bgClass: 'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/50 dark:to-emerald-900/20',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    ringClass: 'ring-1 ring-emerald-200/50 dark:ring-emerald-700/50',
    labelKey: 'sidebar.status.configured',
    Icon: CheckCircle2,
  },
  incomplete: {
    bgClass: 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/50 dark:to-amber-900/20',
    textClass: 'text-amber-600 dark:text-amber-400',
    ringClass: 'ring-1 ring-amber-200/50 dark:ring-amber-700/50',
    labelKey: 'sidebar.status.incomplete',
    Icon: AlertCircle,
  },
  default_only: {
    bgClass: 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40',
    textClass: 'text-slate-500 dark:text-slate-400',
    ringClass: 'ring-1 ring-slate-200/50 dark:ring-slate-700/50',
    labelKey: 'sidebar.status.default',
    Icon: Circle,
  },
};

export function SidebarStatusBadge({ status, language, compact = false }: SidebarStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.Icon;
  
  if (compact) {
    return (
      <div className={cn(
        // Size - touch-friendly on mobile
        "flex items-center justify-center",
        "w-5 h-5 sm:w-4 sm:h-4",
        // Premium circular styling with gradient
        "rounded-full",
        config.bgClass,
        config.ringClass,
        // Subtle shadow for depth
        "shadow-sm",
        // Smooth transition
        "transition-all duration-200"
      )}>
        <Icon className={cn(
          "w-3 h-3 sm:w-2.5 sm:h-2.5",
          config.textClass,
          // Subtle animation for configured status
          status === 'configured' && "animate-[scale-in_0.2s_ease-out]"
        )} />
      </div>
    );
  }
  
  return (
    <span className={cn(
      // Layout
      "inline-flex items-center gap-1.5 sm:gap-1",
      // Mobile-first padding
      "px-2.5 py-1 sm:px-1.5 sm:py-0.5",
      // Premium styling
      "rounded-full sm:rounded",
      config.bgClass,
      config.ringClass,
      config.textClass,
      // Typography
      "text-[11px] sm:text-[9px] font-semibold tracking-wide",
      // Shadow and transitions
      "shadow-sm",
      "transition-all duration-200"
    )}>
      <Icon className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
      <span className="uppercase">
        {t(language, config.labelKey) || status}
      </span>
    </span>
  );
}

export default SidebarStatusBadge;
