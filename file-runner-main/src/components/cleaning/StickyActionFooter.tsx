import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from '@/hooks/useBookingSummary';
import { t } from '@/lib/translations';
import { pricingData, serviceTypeMap, HOURLY_CONFIG, FREQUENCY_MULTIPLIERS } from '@/lib/pricing';
import { calculateRenovationQuote, getPhaseLabel, getDebrisLabel, getOccupancyLabel } from '@/lib/pricing_renovation';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { ChevronUp, ArrowRight, Loader2, Lock, Sparkles, Clock, Users, Shield, CheckCircle2, Home, Bath, Maximize2, BadgePercent, Layers, Zap, HardHat, Wind, Box, Bed, UtensilsCrossed, AlertTriangle, Gem, Leaf, Droplets, Paintbrush, SprayCan, Fan, Sofa, SunMedium, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSurfaceRiskLabel } from '@/lib/pricing_renovation';
import { YourCleaningTotalPanel } from './YourCleaningTotalPanel';
// SSOT: Centralized label normalizers for UI ↔ PDF parity
import { formatSquareFootageLabel, type Language } from '@/lib/pdf/labelNormalizers';

interface StickyActionFooterProps {
  isLastStep: boolean;
  isSubmitting: boolean;
  shouldDisableContinue: boolean;
  onContinue: () => void;
  onSubmit: () => void;
}

export function StickyActionFooter({
  isLastStep,
  isSubmitting,
  shouldDisableContinue,
  onContinue,
  onSubmit,
}: StickyActionFooterProps) {
  const { 
    language, 
    formData, 
    mode,
    situation,
    recurringStartMode,
    isRecurringService,
    getFirstVisitPrice,
    getFutureVisitsPrice,
  } = useBooking();
  
  // === USE SUMMARY HOOK (Single Source of Truth) ===
  const summary = useBookingSummary();
  
  // === DYNAMIC FOOTER HEIGHT MEASUREMENT ===
  const footerRef = useRef<HTMLDivElement>(null);
  
  // Measure footer height and set CSS variable for content padding
  useLayoutEffect(() => {
    const measureAndSetHeight = () => {
      if (footerRef.current) {
        const height = footerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--sticky-footer-h', `${height}px`);
      }
    };
    
    // Initial measurement
    measureAndSetHeight();
    
    // ResizeObserver for dynamic height changes
    const observer = new ResizeObserver(measureAndSetHeight);
    if (footerRef.current) {
      observer.observe(footerRef.current);
    }
    
    // Cleanup
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--sticky-footer-h');
    };
  }, []);
  
  // === RENOVATION MODE ===
  const isRenovation = situation === 'RENOVATION';
  const renovationScope = formData.renovationScope;
  const renovationQuote = useMemo(() => {
    if (!isRenovation || !renovationScope) return null;
    return calculateRenovationQuote(renovationScope);
  }, [isRenovation, renovationScope]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  
  // === PRICE FLASH ANIMATION ===
  const [priceFlash, setPriceFlash] = useState(false);
  const prevTotalRef = useRef<number | null>(null);
  
  // === GET DATA FROM SUMMARY (Single Source of Truth) ===
  const isHourlyMode = formData.isHourlyMode;
  
  // Get total from summary (renovation still uses its own calc)
  const total = isRenovation 
    ? (renovationQuote?.total || 0)
    : summary.totals.grandTotal;
  
  // Time metrics from summary
  const timeMetrics = summary.timeMetrics;
  
  // For hourly mode display
  const hourlyTotal = isHourlyMode ? total : 0;
  const hourlyRate = isHourlyMode 
    ? Math.round(total / Math.max(formData.hourlyHours || 1, 1) / HOURLY_CONFIG.TEAM_SIZE)
    : 0;
  const totalLaborHours = isHourlyMode 
    ? Math.max(formData.hourlyHours, HOURLY_CONFIG.MIN_CLOCK_HOURS) * HOURLY_CONFIG.TEAM_SIZE 
    : 0;
  
  // Trigger flash animation when price changes
  useEffect(() => {
    if (prevTotalRef.current !== null && prevTotalRef.current !== total) {
      setPriceFlash(true);
      const timeout = setTimeout(() => setPriceFlash(false), 600);
      return () => clearTimeout(timeout);
    }
    prevTotalRef.current = total;
  }, [total]);
  
  // Get pricing from summary
  const basePrice = summary.totals.basePrice;
  const addonsTotal = summary.totals.addonsTotal;
  const conditionFee = summary.totals.conditionFee;
  
  // Recurring service checks
  const isRecurring = isRecurringService();
  const firstVisitPrice = isRecurring ? getFirstVisitPrice() : null;
  const futureVisitsPrice = isRecurring ? getFutureVisitsPrice() : null;
  
  // Micro-services total from summary
  const microTotal = summary.totals.microServicesTotal;
  
  // Frequency discount from summary
  const frequencyDiscount = summary.totals.frequencyDiscount;
  
  // Addon labor minutes from summary
  const addonLaborMinutes = summary.timeMetrics.addonMinutes;

  // Time estimate (for non-hourly)
  const isDeep = formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out';
  
  // Get bedroom label
  const getBedroomLabel = () => {
    if (formData.homeSize === 0) return 'Studio';
    return `${formData.homeSize} Bed`;
  };
  
  // SSOT: Use centralized normalizer for UI ↔ PDF parity
  const getSquareFootageLabel = () => {
    if (!formData.squareFootageRange) return null;
    return formatSquareFootageLabel(formData.squareFootageRange, language as Language);
  };
  
  // Total bathrooms
  const totalBaths = formData.masterBaths + formData.fullBaths + formData.halfBaths;
  
  // Functional zones count
  const zonesCount = (formData.officeCount || 0) + (formData.laundryRoomCount || 0) + 
                     (formData.loftCount || 0) + (formData.garageCount || 0);
  
  // Renovation helper calculations
  const totalRenovationBaths = renovationScope 
    ? (renovationScope.bathrooms?.master || 0) + (renovationScope.bathrooms?.full || 0) + (renovationScope.bathrooms?.half || 0)
    : 0;
  const manHoursReno = renovationQuote ? renovationQuote.hours * renovationQuote.teamSize : 0;
  
  // Kitchen size label helper
  const getKitchenSizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      galley: 'Galley',
      standard: 'Standard',
      open_concept: 'Open Concept',
      chef: "Chef's Kitchen",
    };
    return labels[size] || size;
  };

  return (
    <div ref={footerRef} className="fixed bottom-0 left-0 right-0 z-50 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="bg-card border-t-2 border-primary/20 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Price + Breakdown Trigger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button 
                type="button"
                className="flex flex-col text-left touch-manipulation flex-1"
              >
                {/* Renovation Mode - Enhanced Collapsed View */}
                {isRenovation && renovationQuote ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        renovationScope?.phase === 'rough_safety' 
                          ? "bg-amber-500/20 text-amber-600"
                          : "bg-blue-500/20 text-blue-600"
                      )}>
                        {renovationScope?.phase === 'rough_safety' ? 'Rough' : 'Final'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Renovation Quote
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-2xl font-black transition-all duration-300",
                        priceFlash ? "text-emerald-500 scale-110" : "text-primary scale-100"
                      )}>
                        ${total}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{renovationQuote.teamSize}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <Clock className="w-3 h-3" />
                        <span>{renovationQuote.hours}h</span>
                        {renovationQuote.addonsApplied.length > 0 && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-primary font-medium">+{renovationQuote.addonsApplied.length}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      <span>View Details</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ) : (
                  /* Standard collapsed view - opens contract-driven panel */
                  total > 0 ? (
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">
                          {isHourlyMode 
                            ? t(language, 'live_price.priority_rate')
                            : t(language, 'live_price.title')
                          }
                        </p>
                        <p className={cn(
                          "text-2xl font-black transition-all duration-300",
                          priceFlash 
                            ? "text-emerald-500 scale-110" 
                            : "text-primary scale-100"
                        )}>
                          ${total}
                        </p>
                      </div>
                      {/* View Details button - opens contract-driven panel (non-hourly, non-renovation) */}
                      {!isHourlyMode && !isRenovation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsPanelOpen(true);
                          }}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 rounded-full",
                            "text-[10px] font-medium text-primary",
                            "bg-primary/10 hover:bg-primary/20",
                            "transition-colors touch-manipulation min-h-[32px]"
                          )}
                        >
                          <List className="w-3 h-3" />
                          <span>{t(language, 'panel.view_details') || 'Details'}</span>
                        </button>
                      )}
                      {/* Original breakdown trigger for hourly mode */}
                      {isHourlyMode && (
                        <div className="flex items-center gap-1 text-xs text-primary font-medium">
                          <span>{t(language, 'live_price.view_breakdown')}</span>
                          <ChevronUp className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty state placeholder when no pricing data yet */
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Home className="w-5 h-5 text-primary/60" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t(language, 'live_price.title')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t(language, 'live_price.pending_message')}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-safe">
              <SheetHeader className="pb-3 border-b border-border">
                {isRenovation && renovationQuote ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-left flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          renovationScope?.phase === 'rough_safety' 
                            ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                            : "bg-gradient-to-br from-blue-500/20 to-indigo-500/20"
                        )}>
                          <HardHat className={cn(
                            "w-4 h-4",
                            renovationScope?.phase === 'rough_safety' ? "text-amber-600" : "text-blue-600"
                          )} />
                        </div>
                        <span>Renovation Quote</span>
                      </SheetTitle>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">Licensed</span>
                        <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">Bonded</span>
                        <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">Insured</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <SheetTitle className="text-left flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {isHourlyMode 
                      ? t(language, 'live_price.priority_rate')
                      : t(language, 'live_price.title')
                    }
                  </SheetTitle>
                )}
              </SheetHeader>
              
              <div className="py-4 space-y-4">
                {/* Renovation Mode - Premium Mobile Breakdown */}
                {isRenovation && renovationQuote && renovationScope ? (
                  <div className="space-y-4">
                    
                    {/* Status Alert (if contractors not finished) */}
                    {!renovationScope.contractorsFinished && (
                      <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span className="text-xs text-amber-700 font-medium">Contractors Active – Standby Mode</span>
                      </div>
                    )}
                    
                    {/* Team & Labor Card - Premium Design */}
                    <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-xl p-4 border border-primary/10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Team Deployment</p>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-foreground">{renovationQuote.teamSize}</span>
                            <span className="text-sm text-muted-foreground">specialists</span>
                          </div>
                        </div>
                        <div className="h-12 w-px bg-border/50" />
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Est. Duration</p>
                          <div className="flex items-baseline gap-1.5 justify-end">
                            <span className="text-2xl font-black text-foreground">{renovationQuote.hours}</span>
                            <span className="text-sm text-muted-foreground">hours</span>
                          </div>
                        </div>
                        <div className="h-12 w-px bg-border/50" />
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Man-Hours</p>
                          <div className="flex items-baseline gap-1.5 justify-end">
                            <span className="text-2xl font-black text-primary">{manHoursReno}</span>
                            <span className="text-sm text-muted-foreground">total</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Property Composition */}
                    {(renovationScope.bedrooms > 0 || totalRenovationBaths > 0 || renovationScope.hasNewKitchen) && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                          <Home className="w-3 h-3" />
                          Property Composition
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {renovationScope.bedrooms > 0 && (
                            <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                              <Bed className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                              <p className="text-lg font-bold">{renovationScope.bedrooms}</p>
                              <p className="text-[10px] text-muted-foreground">Bedrooms</p>
                            </div>
                          )}
                          {totalRenovationBaths > 0 && (
                            <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                              <Bath className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                              <p className="text-lg font-bold">{totalRenovationBaths}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {renovationScope.bathrooms.master > 0 && `${renovationScope.bathrooms.master}M `}
                                {renovationScope.bathrooms.full > 0 && `${renovationScope.bathrooms.full}F `}
                                {renovationScope.bathrooms.half > 0 && `${renovationScope.bathrooms.half}H`}
                              </p>
                            </div>
                          )}
                          {renovationScope.hasNewKitchen && (
                            <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                              <UtensilsCrossed className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                              <p className="text-xs font-bold">New Kitchen</p>
                              <p className="text-[10px] text-muted-foreground">{getKitchenSizeLabel(renovationScope.kitchenSize)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Project Details */}
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        Project Details
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between py-1.5 px-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground">Phase</span>
                          <span className={cn(
                            "font-medium",
                            renovationScope.phase === 'rough_safety' ? "text-amber-600" : "text-blue-600"
                          )}>
                            {renovationScope.phase === 'rough_safety' ? 'Rough' : 'Final'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 px-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground">Area</span>
                          <span className="font-medium">{renovationScope.sqft.toLocaleString()} sqft</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground">Occupancy</span>
                          <span className="font-medium">{renovationScope.occupancy === 'vacant_empty' ? 'Vacant' : 'Furnished'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground">Debris</span>
                          <span className="font-medium">{getDebrisLabel(renovationScope.debrisLevel).split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Condition Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {renovationScope.occupancy === 'furnished_lived_in' && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          Furnished +50%
                        </span>
                      )}
                      {renovationScope.surfaceRisk === 'delicate_stone_wood' && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-purple-500/10 text-purple-700 border border-purple-500/20 flex items-center gap-1">
                          <Gem className="w-3 h-3" /> Premium Care
                        </span>
                      )}
                      {renovationScope.debrisLevel === 'heavy_haul' && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-red-500/10 text-red-700 border border-red-500/20">
                          Heavy Debris
                        </span>
                      )}
                      {renovationScope.highCeilings && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
                          High Ceilings
                        </span>
                      )}
                      {!renovationScope.dumpsterOnSite && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-orange-500/10 text-orange-700 border border-orange-500/20">
                          No Dumpster
                        </span>
                      )}
                    </div>

                    {/* Quote Breakdown */}
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quote Breakdown</p>
                      
                      {/* Base Labor */}
                      <div className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground">Labor Base (${renovationQuote.rateApplied.toFixed(2)}/sqft)</span>
                        <span className="font-medium">${renovationQuote.breakdown.laborBase}</span>
                      </div>
                      
                      {/* Surface Restoration */}
                      {renovationQuote.breakdown.surfaceRestoration > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Paintbrush className="w-3 h-3" /> Surface Restoration
                          </span>
                          <span className="font-medium text-primary">+${renovationQuote.breakdown.surfaceRestoration}</span>
                        </div>
                      )}
                      
                      {/* Hidden Dust */}
                      {renovationQuote.breakdown.hiddenDust > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Leaf className="w-3 h-3" /> Hidden Dust Services
                          </span>
                          <span className="font-medium text-primary">+${renovationQuote.breakdown.hiddenDust}</span>
                        </div>
                      )}
                      
                      {/* Height Access */}
                      {renovationQuote.breakdown.heightAccess > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Layers className="w-3 h-3" /> Height Access (+OSHA)
                          </span>
                          <span className="font-medium text-primary">+${renovationQuote.breakdown.heightAccess}</span>
                        </div>
                      )}
                      
                      {/* Exterior & Waste */}
                      {renovationQuote.breakdown.exterior > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <SprayCan className="w-3 h-3" /> Exterior & Waste
                          </span>
                          <span className="font-medium text-primary">+${renovationQuote.breakdown.exterior}</span>
                        </div>
                      )}
                      
                      {/* Dust Settlement (Sparkle Clean) */}
                      {renovationQuote.breakdown.dustSettlement > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> Sparkle Clean Return
                          </span>
                          <span className="font-medium text-primary">+${renovationQuote.breakdown.dustSettlement}</span>
                        </div>
                      )}
                      
                      {/* Air Quality */}
                      {renovationQuote.breakdown.airQuality > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Fan className="w-3 h-3" /> Air Quality Services
                          </span>
                          <span className="font-medium text-primary">+${renovationQuote.breakdown.airQuality}</span>
                        </div>
                      )}
                      
                      {/* Upholstery */}
                      {renovationQuote.breakdown.upholstery > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Sofa className="w-3 h-3" /> Upholstery Extraction
                          </span>
                          <span className="font-medium text-primary">+${renovationQuote.breakdown.upholstery}</span>
                        </div>
                      )}
                      
                      {/* Exterior Glass */}
                      {renovationQuote.breakdown.exteriorGlass > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <SunMedium className="w-3 h-3" /> Exterior Glass
                          </span>
                          <span className="font-medium text-primary">+${renovationQuote.breakdown.exteriorGlass}</span>
                        </div>
                      )}
                      
                      {/* Legacy costs */}
                      {renovationQuote.breakdown.windowStickers > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground">Window Stickers ({renovationScope.windowCount})</span>
                          <span className="font-medium">+${renovationQuote.breakdown.windowStickers}</span>
                        </div>
                      )}
                      {renovationQuote.breakdown.hvacFilters > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground">HVAC Filter Service</span>
                          <span className="font-medium">+${renovationQuote.breakdown.hvacFilters}</span>
                        </div>
                      )}
                      {renovationQuote.breakdown.baggingFee > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground">Haul-Away Fee</span>
                          <span className="font-medium">+${renovationQuote.breakdown.baggingFee}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Total Section - Premium */}
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Estimated Total</p>
                          <p className="text-3xl font-black text-primary">${renovationQuote.total.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground mb-1">Approx. ${Math.round(renovationQuote.total / renovationQuote.hours)}/hr</p>
                          {renovationQuote.minimumApplied && (
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">Min $350 applied</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Add-ons Applied Summary */}
                    {renovationQuote.addonsApplied.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Add-ons Included ({renovationQuote.addonsApplied.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {renovationQuote.addonsApplied.map((addon, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                              {addon}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                  </div>
                ) : isHourlyMode ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{t(language, 'hourly.duration')}</span>
                      </div>
                      <span className="font-medium">{formData.hourlyHours} hrs</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{t(language, 'hourly.team')}</span>
                      </div>
                      <span className="font-medium">2 {t(language, 'hourly.cleaners')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">{t(language, 'hourly.rate_applied')}</span>
                      <span className="font-medium">${hourlyRate}/hr</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">{t(language, 'hourly.total_labor')}</span>
                      <span className="font-medium">{totalLaborHours} hrs</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">{t(language, 'hourly.supplies')}</span>
                      <span className="font-medium">
                        {formData.hourlySupplies === 'client' 
                          ? t(language, 'hourly.client_supplies') 
                          : t(language, 'hourly.company_supplies')
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Service Level */}
                    {formData.baseServiceLevel && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{t(language, 'live_price.service_level')}</span>
                        </div>
                        <span className="font-medium">{formData.baseServiceLevel}</span>
                      </div>
                    )}
                    
                    {/* Property Details: Bedrooms */}
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{t(language, 'label.bedrooms')}</span>
                      </div>
                      <span className="font-medium">{getBedroomLabel()}</span>
                    </div>
                    
                    {/* Bathrooms */}
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Bath className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{t(language, 'label.bathrooms')}</span>
                      </div>
                      <span className="font-medium">
                        {totalBaths} ({formData.masterBaths}M/{formData.fullBaths}F/{formData.halfBaths}H)
                      </span>
                    </div>
                    
                    {/* Square Footage (if available) */}
                    {getSquareFootageLabel() && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <Maximize2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{t(language, 'label.sqft')}</span>
                        </div>
                        <span className="font-medium">{getSquareFootageLabel()}</span>
                      </div>
                    )}
                    
                    {/* Condition Fee */}
                    {conditionFee > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="text-sm text-muted-foreground">{t(language, 'live_price.condition_fee')}</span>
                        <span className="font-medium text-amber-600">+${conditionFee}</span>
                      </div>
                    )}
                    
                    {/* Functional Zones (if any) */}
                    {zonesCount > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{t(language, 'areas.title')}</span>
                        </div>
                        <span className="font-medium">{zonesCount} zones</span>
                      </div>
                    )}
                    
                    {/* Add-ons */}
                    {addonsTotal > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="text-sm text-muted-foreground">
                          {t(language, 'live_price.addons_label')}
                        </span>
                        <span className="font-medium">+${addonsTotal}</span>
                      </div>
                    )}
                    
                    {/* Micro-Services (Custom mode) */}
                    {mode === 'custom' && microTotal > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="text-sm text-muted-foreground">
                          Micro-Services
                        </span>
                        <span className="font-medium">
                          ${microTotal}
                        </span>
                      </div>
                    )}
                    
                    {/* Frequency Discount Badge */}
                    {frequencyDiscount && (
                      <div className="flex items-center justify-between py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3">
                        <div className="flex items-center gap-2">
                          <BadgePercent className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">
                            {frequencyDiscount.label} Discount
                          </span>
                        </div>
                        <span className="font-bold text-emerald-600">-{frequencyDiscount.percent}%</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Time Estimate Card */}
                {timeMetrics && (
                  <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {isHourlyMode ? 'Team Session' : 'Your Time Back'}
                      </p>
                      <p className="font-bold text-foreground">
                        {timeMetrics.manHours.toFixed(1)} man-hours
                        {timeMetrics.teamSize > 1 && (
                          <span className="text-xs text-muted-foreground font-normal ml-1">
                            ({timeMetrics.clockHours.toFixed(1)}h × {timeMetrics.teamSize})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Recurring Pricing Split */}
                {isRecurring && firstVisitPrice && futureVisitsPrice && recurringStartMode !== 'recurring-only' ? (
                  <div className="space-y-2 pt-3 border-t-2 border-primary/20">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t(language, 'recurring.first_visit')}</span>
                      <span className="text-lg font-bold text-foreground">${firstVisitPrice}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-primary">{t(language, 'recurring.future_visits')}</span>
                      <span className="text-lg font-black text-primary">${futureVisitsPrice}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
                    <span className="text-lg font-bold">{t(language, 'live_price.estimated_total')}</span>
                    <span className="text-2xl font-black text-primary">${total}</span>
                  </div>
                )}
                
                {/* Trust Anchors */}
                <div className="pt-4 space-y-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>{t(language, 'trust.licensed_bonded')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{t(language, 'trust.satisfaction_guarantee')}</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Right: Continue/Submit Button */}
          {!isLastStep ? (
            <Button
              type="button"
              onClick={onContinue}
              disabled={shouldDisableContinue}
              className={cn(
                "h-12 px-6 rounded-full font-bold text-sm",
                "bg-gradient-to-r from-primary to-primary/90",
                "shadow-primary active:scale-[0.98] transition-all",
                shouldDisableContinue && "opacity-50 cursor-not-allowed"
              )}
            >
              {t(language, 'btn.next')}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className={cn(
                "h-12 px-6 rounded-full font-bold text-sm",
                "bg-gradient-to-r from-primary to-primary/90",
                "shadow-primary active:scale-[0.98] transition-all"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-1" />
                  {t(language, 'btn.secure_booking')}
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Contract-Driven Details Panel (non-renovation, non-hourly) */}
        <YourCleaningTotalPanel
          isOpen={detailsPanelOpen}
          onClose={() => setDetailsPanelOpen(false)}
        />
      </div>
    </div>
  );
}