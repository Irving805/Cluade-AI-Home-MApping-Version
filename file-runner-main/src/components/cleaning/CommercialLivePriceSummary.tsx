import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { t, Language } from '@/lib/translations';
import { CommercialScope } from '@/contexts/BookingContext';
import { 
  ConstructionQuoteResult, 
  CommercialQuoteResult,
  calculateCommercialAddonsTotal,
} from '@/lib/pricing_commercial';
import { 
  Sparkles, 
  Clock, 
  Users, 
  HardHat, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Layers,
  AlertTriangle
} from 'lucide-react';

interface CommercialLivePriceSummaryProps {
  quote: ConstructionQuoteResult | CommercialQuoteResult | null;
  commercialScope: CommercialScope;
  language: Language;
  isConstruction: boolean;
}

export function CommercialLivePriceSummary({ 
  quote, 
  commercialScope, 
  language, 
  isConstruction 
}: CommercialLivePriceSummaryProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [displayedTotal, setDisplayedTotal] = useState(0);
  
  // Calculate addons total
  const addonsTotal = useMemo(() => {
    if (!commercialScope.selectedAddons?.length) return 0;
    const sqft = parseInt(commercialScope.sqft) || 0;
    return calculateCommercialAddonsTotal(
      commercialScope.selectedAddons,
      commercialScope.projectType,
      sqft
    );
  }, [commercialScope.selectedAddons, commercialScope.projectType, commercialScope.sqft]);
  
  // Final total including addons
  const finalTotal = quote ? quote.total + addonsTotal : 0;
  
  // Animate price changes
  useEffect(() => {
    if (displayedTotal === finalTotal) return;
    
    const diff = finalTotal - displayedTotal;
    const step = Math.ceil(Math.abs(diff) / 10);
    const increment = diff > 0 ? step : -step;
    
    const timer = setInterval(() => {
      setDisplayedTotal(prev => {
        const next = prev + increment;
        if ((increment > 0 && next >= finalTotal) || (increment < 0 && next <= finalTotal)) {
          clearInterval(timer);
          return finalTotal;
        }
        return next;
      });
    }, 30);
    
    return () => clearInterval(timer);
  }, [finalTotal, displayedTotal]);
  
  if (!quote) {
    return (
      <div className="bg-muted/30 border-2 border-dashed border-border rounded-xl p-6 text-center">
        <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {t(language, 'commercial.enter_sqft_prompt')}
        </p>
      </div>
    );
  }
  
  const isConstructionQuote = 'frictionApplied' in quote;
  const constructionQuote = isConstructionQuote ? quote as ConstructionQuoteResult : null;

  return (
    <div className="bg-slate-900 text-white rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold">
          {t(language, 'commercial.your_total')}
        </span>
      </div>
      
      {/* Main Price */}
      <div className="p-4">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              {commercialScope.frequency !== 'one_time' 
                ? t(language, 'commercial.per_visit') 
                : t(language, 'commercial.estimated_quote')}
            </p>
            <p className="text-4xl font-black tracking-tight">
              ${displayedTotal.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
              <Clock className="w-3 h-3" />
              {'clockHours' in quote ? quote.clockHours : Math.ceil(quote.estimatedHours / quote.teamSize)} hrs
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
              <Users className="w-3 h-3" />
              {quote.teamSize} team
            </div>
          </div>
        </div>
        
        {/* Method Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full font-medium">
            {quote.methodLabel}
          </span>
          {quote.frequencyDiscount > 0 && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] rounded-full font-medium">
              -{quote.frequencyDiscount}% discount
            </span>
          )}
        </div>
        
        {/* Breakdown Toggle */}
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-3 h-3" />
            {t(language, 'live_price.view_breakdown')}
          </span>
          {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {/* Breakdown Content */}
        {showBreakdown && (
          <div className="mt-3 space-y-2 text-xs animate-fade-in">
            {/* Base Quote */}
            <div className="flex justify-between text-slate-300">
              <span>{t(language, 'commercial.base_quote')}</span>
              <span className="font-mono">${quote.total.toLocaleString()}</span>
            </div>
            
            {/* Labor Breakdown (Construction) */}
            {constructionQuote && (
              <>
                <div className="flex justify-between text-slate-400 pl-3">
                  <span>Labor ({constructionQuote.manHours} hrs × $55)</span>
                  <span className="font-mono">${constructionQuote.breakdown.labor.toLocaleString()}</span>
                </div>
                {constructionQuote.breakdown.addons > 0 && (
                  <div className="flex justify-between text-slate-400 pl-3">
                    <span>Built-in Add-ons</span>
                    <span className="font-mono">+${constructionQuote.breakdown.addons.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
            
            {/* Selected Commercial Addons */}
            {addonsTotal > 0 && (
              <div className="flex justify-between text-amber-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {t(language, 'commercial.addons_total')}
                </span>
                <span className="font-mono">+${addonsTotal.toLocaleString()}</span>
              </div>
            )}
            
            {/* Friction Applied */}
            {constructionQuote && (constructionQuote.frictionApplied.height > 1 || 
              constructionQuote.frictionApplied.noElevator || 
              constructionQuote.frictionApplied.activeTrades) && (
              <div className="pt-2 border-t border-slate-700">
                <div className="flex items-center gap-1 text-amber-400 mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{t(language, 'commercial.friction_applied')}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {constructionQuote.frictionApplied.height > 1 && (
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded">
                      Height +{Math.round((constructionQuote.frictionApplied.height - 1) * 100)}%
                    </span>
                  )}
                  {constructionQuote.frictionApplied.noElevator && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-[10px] rounded">
                      No Elevator +20%
                    </span>
                  )}
                  {constructionQuote.frictionApplied.activeTrades && (
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded">
                      Active Trades +25%
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Grand Total */}
            <div className="flex justify-between pt-2 border-t border-slate-700 text-white font-bold">
              <span>{t(language, 'commercial.grand_total')}</span>
              <span className="font-mono">${finalTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Trust Footer */}
      <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50 flex items-center justify-center gap-3 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Licensed</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Bonded</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Insured</span>
        </div>
      </div>
    </div>
  );
}
