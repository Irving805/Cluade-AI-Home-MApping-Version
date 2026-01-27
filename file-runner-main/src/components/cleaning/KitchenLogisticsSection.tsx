import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Switch } from '@/components/ui/switch';
import { FileText, RotateCcw, Users, AlertTriangle } from 'lucide-react';

interface KitchenLogisticsSectionProps {
  language: Language;
  situation: 'LIVE_HERE' | 'MOVING' | null;
  serviceType: string;
  
  // Pull out appliances
  pullOutAppliances: boolean;
  onPullOutAppliancesChange: (enabled: boolean) => void;
  pullOutAppliancesPrice: number; // $0 for moving, $30 for deep
}

export function KitchenLogisticsSection({
  language,
  situation,
  serviceType,
  pullOutAppliances,
  onPullOutAppliancesChange,
  pullOutAppliancesPrice,
}: KitchenLogisticsSectionProps) {
  const isMoving = situation === 'MOVING';
  const isDeepClean = serviceType === 'Deep Clean';
  
  // Only show for MOVING or Deep Clean (not Basic Clean)
  const showPullOutAppliances = isMoving || isDeepClean;
  
  if (!showPullOutAppliances) {
    return null;
  }

  return (
    <div className="space-y-3 pt-2 border-t border-dashed border-border/50">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t(language, 'kitchen.appliance_access')}
        </span>
      </div>
      
      {/* Pull Out Appliances */}
      {showPullOutAppliances && (
        <div 
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border transition-all",
            pullOutAppliances
              ? "border-primary/50 bg-primary/5"
              : "border-border bg-muted/30"
          )}
        >
          <div className="shrink-0 mt-0.5">
            <RotateCcw className={cn(
              "w-4 h-4",
              pullOutAppliances ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {t(language, 'kitchen.pull_out_appliances')}
                </span>
                {/* Price Badge */}
                {pullOutAppliancesPrice === 0 ? (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {t(language, 'kitchen.pull_out_appliances.included')}
                  </span>
                ) : (
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded",
                    pullOutAppliances 
                      ? "bg-primary/20 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    +${pullOutAppliancesPrice}
                  </span>
                )}
              </div>
              <Switch
                checked={pullOutAppliances}
                onCheckedChange={onPullOutAppliancesChange}
                className="scale-90"
              />
            </div>
            
            {/* Safety Note */}
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
              <Users className="w-3 h-3" />
              <span>{t(language, 'kitchen.pull_out_appliances.safety')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
