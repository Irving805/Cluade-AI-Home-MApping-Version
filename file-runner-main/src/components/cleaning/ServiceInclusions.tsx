import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { getServiceScope, ServiceTier } from '@/lib/serviceScope';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Sparkles, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ServiceInclusionsProps {
  serviceType: ServiceTier;
  className?: string;
}

export function ServiceInclusions({ serviceType, className }: ServiceInclusionsProps) {
  const { language } = useBooking();
  
  const scope = getServiceScope(serviceType);
  
  if (!scope) return null;
  
  const includedItems = scope.items.filter(item => item.included);
  const excludedItems = scope.items.filter(item => !item.included);
  
  return (
    <div className={cn(
      "bg-card border border-border/50 rounded-2xl overflow-hidden",
      "animate-fade-in",
      className
    )}>
      {/* Header with Rate Badge */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {t(language, 'scope.whats_included')}
          </span>
        </div>
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full",
          serviceType === 'Standard Clean' && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
          serviceType === 'Deep Clean' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
          serviceType === 'Move-In/Out' && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        )}>
          {t(language, scope.rateBadgeKey)}
        </span>
      </div>
      
      {/* Inclusions Grid */}
      <div className="p-4 space-y-4">
        {/* Included Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {includedItems.map((item) => (
            <div 
              key={item.key}
              className="flex items-center gap-2 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-foreground">
                {t(language, item.labelKey)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Excluded Items (if any) */}
        {excludedItems.length > 0 && (
          <>
            <div className="h-px bg-border/50" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {excludedItems.map((item) => (
                <TooltipProvider key={item.key} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 text-sm cursor-help group">
                        <XCircle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                        <span className="text-muted-foreground line-through decoration-muted-foreground/30">
                          {t(language, item.labelKey)}
                        </span>
                        {item.tooltipKey && (
                          <Info className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        )}
                      </div>
                    </TooltipTrigger>
                    {item.tooltipKey && (
                      <TooltipContent side="top" className="max-w-[240px] text-xs">
                        {t(language, item.tooltipKey)}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </>
        )}
        
        {/* Upsell Footer */}
        <div className="pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            {t(language, 'scope.extras_hint')}
          </p>
        </div>
      </div>
    </div>
  );
}
