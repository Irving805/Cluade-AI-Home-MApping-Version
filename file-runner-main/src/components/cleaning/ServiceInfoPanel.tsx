import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { serviceTypeMap, pricingData } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Sparkles, Calendar, Info } from 'lucide-react';

export function ServiceInfoPanel() {
  const { 
    language, 
    formData, 
    updateFormData,
    recurringStartMode, 
    setRecurringStartMode,
    isRecurringService,
    situation
  } = useBooking();
  
  // CRITICAL: Do NOT render info panels for MOVING scenario
  // Deep Reset info should NEVER appear in Moving flow
  const isMovingScenario = situation === 'MOVING';

  const serviceIdx = serviceTypeMap[formData.serviceType];
  const isRecurring = isRecurringService();
  const firstName = formData.firstName || '';

  // Get recurring price for display
  const recurringPrice = pricingData[formData.homeSize]?.[serviceIdx] || 0;
  const deepCleanPrice = pricingData[formData.homeSize]?.[1] || 0; // Deep Clean index

  const renderStandardInfo = () => (
    <div className="space-y-3">
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <Info className="w-4 h-4 text-primary" />
        {t(language, 'info.std.title').replace('{name}', firstName ? `, ${firstName}` : '')}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-success/10 border border-success/30 rounded-lg p-3">
          <p className="text-xs font-bold text-success mb-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {t(language, 'info.std.perfect')}
          </p>
          <ul className="text-xs text-foreground space-y-1 list-disc list-inside">
            <li>{t(language, 'info.std.perfect_li1')}</li>
            <li>{t(language, 'info.std.perfect_li2')}</li>
          </ul>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <p className="text-xs font-bold text-destructive mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {t(language, 'info.std.notfit')}
          </p>
          <ul className="text-xs text-foreground space-y-1 list-disc list-inside">
            <li>{t(language, 'info.std.notfit_li1')}</li>
            <li>{t(language, 'info.std.notfit_li2')}</li>
          </ul>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => updateFormData({ serviceType: 'Deep Clean' })}
        className="text-xs text-primary font-semibold hover:underline"
      >
        {t(language, 'btn.switch_deep')} →
      </button>
    </div>
  );

  const renderDeepInfo = () => (
    <div className="space-y-3">
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        {t(language, 'info.deep.title').replace('{name}', firstName ? `, ${firstName}` : '')}
      </h4>
      <p className="text-sm text-muted-foreground">{t(language, 'info.deep.desc')}</p>
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <p className="text-xs font-bold text-primary mb-2">{t(language, 'info.deep.best')}</p>
        <ul className="text-xs text-foreground space-y-1 list-disc list-inside">
          <li>{t(language, 'info.deep.best_li1')}</li>
          <li>{t(language, 'info.deep.best_li2')}</li>
        </ul>
      </div>
    </div>
  );

  const renderMoveInfo = () => (
    <div className="space-y-3">
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        {t(language, 'info.move.title').replace('{name}', firstName ? `, ${firstName}` : '')}
      </h4>
      <p className="text-sm text-muted-foreground">{t(language, 'info.move.desc')}</p>
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <p className="text-xs font-bold text-primary mb-2">{t(language, 'info.move.includes')}</p>
        <p className="text-xs text-foreground">{t(language, 'info.move.includes_li')}</p>
      </div>
    </div>
  );

  const renderRecurringInfo = () => {
    const titleKey = serviceIdx === 3 ? 'info.weekly.title' : serviceIdx === 4 ? 'info.biweekly.title' : 'info.monthly.title';
    const descKey = serviceIdx === 3 ? 'info.weekly.desc' : serviceIdx === 4 ? 'info.biweekly.desc' : 'info.monthly.desc';
    const benefitsKey = serviceIdx === 3 ? 'info.weekly.benefits_li' : serviceIdx === 4 ? 'info.biweekly.li' : 'info.monthly.li';

    // Only show simple info panel - decision cards are handled by RecurringPricingBlock
    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          {t(language, titleKey).replace('{name}', firstName ? `, ${firstName}` : '')}
        </h4>
        <p className="text-sm text-muted-foreground">{t(language, descKey)}</p>
        <div className="bg-success/10 border border-success/30 rounded-lg p-3">
          <p className="text-xs font-bold text-success mb-2">{t(language, 'info.weekly.benefits')}</p>
          <p className="text-xs text-foreground">{t(language, benefitsKey)}</p>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    // CRITICAL: For MOVING scenario, only show move-specific info
    // Deep Reset and Standard info must NEVER appear in Moving flow
    if (isMovingScenario) {
      return renderMoveInfo();
    }
    
    // serviceTypeMap: Move-In/Out=0, Deep Clean=1, Standard Clean=2, Weekly=3, Bi-Weekly=4, Monthly=5
    switch (serviceIdx) {
      case 0: return renderMoveInfo();      // Move-In/Out
      case 1: return renderDeepInfo();      // Deep Clean (ONLY for LIVE_HERE)
      case 2: return renderStandardInfo();  // Standard Clean (ONLY for LIVE_HERE)
      case 3:
      case 4:
      case 5: return renderRecurringInfo();
      default: return null;
    }
  };

  return (
    <div className="mt-4 p-4 bg-muted/50 border border-border rounded-xl">
      {renderContent()}
    </div>
  );
}
