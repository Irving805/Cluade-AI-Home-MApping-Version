/**
 * YourCleaningTotalPanel — Premium responsive panel for mobile/tablet
 * 
 * This is the SINGLE source of truth for "Your Cleaning Total" on mobile/tablet.
 * It renders the same contract-driven content as desktop (SidebarContractSection)
 * inside a responsive container:
 *   - Mobile (< md): Bottom Drawer (vaul)
 *   - Tablet (md–lg): Side Sheet (radix)
 * 
 * MIGRATED: Now uses useBookingSummary hook for all derived data.
 */

import { useRef, useCallback, useMemo, useState, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerClose 
} from '@/components/ui/drawer';
import { PropertyLogisticsMapTeaser } from './PropertyLogisticsMapTeaser';
import { useHomeLayoutModel } from '@/hooks/useHomeLayoutModel';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetClose 
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from '@/hooks/useBookingSummary';
import { Language, t } from '@/lib/translations';
import { SidebarContractSection } from './SidebarContractSection';
import { getVisibleAreas, ServiceAreaKey } from '@/lib/homeMappingRegistry';
import { buildUnifiedGatingContext } from '@/lib/homeMappingSidebarContract';
import { 
  X, 
  Clock, 
  Shield, 
  CheckCircle2, 
  Sparkles,
  Users
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface YourCleaningTotalPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function YourCleaningTotalPanel({ isOpen, onClose }: YourCleaningTotalPanelProps) {
  const isMobile = useIsMobile();
  const { 
    formData, 
    language, 
    situation, 
    isRecurringService,
    getFirstVisitPrice,
    getFutureVisitsPrice,
    recurringStartMode,
  } = useBooking();
  
  // === USE SUMMARY HOOK (Single Source of Truth) ===
  const summary = useBookingSummary();
  
  // isDeep is used for non-bathroom components (SidebarContractSection)
  // Bathroom pricing uses its own tier from getBathroomPricingTier()
  const isDeep = formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out';
  
  // Build gating context for visible areas
  const gatingContext = useMemo(() => 
    buildUnifiedGatingContext(formData, situation), 
    [formData, situation]
  );
  
  // Get visible areas for quick jump chips
  const visibleAreas = useMemo(() => 
    getVisibleAreas(gatingContext),
    [gatingContext]
  );
  
  // === SINGLE BUILD POINT: Property Logistics Map model ===
  // Uses fingerprint-based hook for guaranteed sync with LivePriceSummary/Review/PDF
  const homeLayoutModel = useHomeLayoutModel();
  
  // Refs for quick jump scroll
  const areaRefs = useRef<Record<ServiceAreaKey, HTMLDivElement | null>>({} as Record<ServiceAreaKey, HTMLDivElement | null>);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  
  // Lifted accordion state - panel controls which area is expanded
  const [expandedArea, setExpandedArea] = useState<ServiceAreaKey | null>(
    visibleAreas[0]?.key || null
  );
  
  // Highlight state for jump feedback (React-state driven, not classList)
  const [highlightKey, setHighlightKey] = useState<ServiceAreaKey | null>(null);
  
  // Measure sticky header height dynamically
  const [headerHeight, setHeaderHeight] = useState(160);
  
  useLayoutEffect(() => {
    if (isOpen && headerRef.current) {
      const height = headerRef.current.offsetHeight;
      setHeaderHeight(height);
    }
  }, [isOpen]);
  
  // Robust scrollToArea: opens accordion, waits for animation, then scrolls
  const scrollToArea = useCallback((key: ServiceAreaKey) => {
    // Step 1: Open accordion for this area
    setExpandedArea(key);
    
    // Step 2: Double RAF to wait for accordion animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = areaRefs.current[key];
        const scrollRoot = scrollContainerRef.current;
        
        if (element && scrollRoot) {
          // Calculate target position relative to scroll container
          const scrollRootRect = scrollRoot.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const currentScrollTop = scrollRoot.scrollTop;
          
          // Quick Jump chips height (~52px) + headerHeight + padding
          const totalOffset = headerHeight + 60;
          
          // Offset = current scroll + element position - header height - padding
          const targetTop = currentScrollTop + elementRect.top - scrollRootRect.top - totalOffset;
          
          // Smooth scroll in the container (NOT scrollIntoView)
          scrollRoot.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth'
          });
          
          // Step 3: Apply highlight via state (not classList)
          setHighlightKey(key);
          setTimeout(() => setHighlightKey(null), 400);
        }
      });
    });
  }, [headerHeight]);
  
  // === GET DATA FROM SUMMARY (No duplicate calculations) ===
  const isHourlyMode = formData.isHourlyMode;
  const total = summary.totals.grandTotal;
  const timeMetrics = summary.timeMetrics;
  
  // Recurring info from summary
  const isRecurring = isRecurringService();
  const firstVisitPrice = isRecurring ? getFirstVisitPrice() : null;
  const futureVisitsPrice = isRecurring ? getFutureVisitsPrice() : null;
  
  // Frequency discount from summary
  const frequencyDiscount = summary.totals.frequencyDiscount;
  
  // Premium panel content (shared between Drawer and Sheet)
  const panelContent = (
    <div 
      ref={scrollContainerRef} 
      className="flex flex-col h-full overflow-y-auto"
      // Scoped CSS variable for scroll offset (NOT on document.documentElement)
      style={{ '--yct-sticky-header-h': `${headerHeight + 60}px` } as React.CSSProperties}
    >
      {/* Sticky Header */}
      <div 
        ref={headerRef}
        className={cn(
          "sticky top-0 z-10 bg-background/95 backdrop-blur-md",
          "border-b border-border/50",
          "px-4 py-4 sm:px-5"
        )}
      >
        {/* Title + Total */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              {t(language, 'panel.your_cleaning_total') || t(language, 'live_price.title')}
            </h2>
          </div>
        </div>
        
        {/* Big Total Display */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              {t(language, 'live_price.estimated_total')}
            </p>
            <p className="text-3xl font-black text-primary">
              ${total}
            </p>
          </div>
          
          {/* Time Back */}
          {timeMetrics && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">
                {t(language, 'panel.time_back') || t(language, 'time.your_time_back')}
              </p>
              <p className="text-lg font-bold text-foreground flex items-center justify-end gap-1">
                <Clock className="w-4 h-4 text-primary" />
                {timeMetrics.manHours.toFixed(1)} hrs
              </p>
              {timeMetrics.teamSize > 1 && (
                <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                  <Users className="w-3 h-3" />
                  Team of {timeMetrics.teamSize}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Recurring Pricing Split */}
        {isRecurring && firstVisitPrice && futureVisitsPrice && recurringStartMode !== 'recurring-only' && (
          <div className="flex gap-3 mb-3 text-sm">
            <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">First Visit</p>
              <p className="font-bold">${firstVisitPrice}</p>
            </div>
            <div className="flex-1 bg-primary/10 rounded-lg p-2 text-center border border-primary/20">
              <p className="text-[10px] text-primary">Future Visits</p>
              <p className="font-black text-primary">${futureVisitsPrice}</p>
            </div>
          </div>
        )}
        
        {/* Trust Badges Row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span>Licensed & Insured</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>100% Satisfaction</span>
          </div>
        </div>
        
        {/* Property Logistics Map Teaser */}
        {(situation === 'LIVE_HERE' || situation === 'MOVING') && (
          <div className="mt-3">
            <PropertyLogisticsMapTeaser
              layoutModel={homeLayoutModel}
              language={language}
              variant="compact"
            />
          </div>
        )}
      </div>
      
      {/* Quick Jump Chips - with active state */}
      {visibleAreas.length > 0 && (
        <div className={cn(
          "sticky z-10 bg-background/90 backdrop-blur-sm",
          "px-4 py-2 border-b border-border/30"
        )}
        style={{ top: `${headerHeight}px` }}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mr-1 flex-shrink-0">
              {t(language, 'panel.jump_to') || 'Jump to'}:
            </span>
            {visibleAreas.map(area => (
              <button
                key={area.key}
                type="button"
                onClick={() => scrollToArea(area.key)}
                className={cn(
                  "flex-shrink-0 px-2.5 py-1.5 rounded-full snap-start",
                  "text-[10px] font-medium whitespace-nowrap",
                  "transition-colors duration-150",
                  "touch-manipulation min-h-[32px]",
                  // Active state when this area is expanded
                  expandedArea === area.key 
                    ? "bg-primary/20 text-primary font-semibold ring-1 ring-primary/30"
                    : "bg-muted/60 hover:bg-primary/10 hover:text-primary"
                )}
              >
                {area.emoji} {t(language, area.labelKey) || area.key}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Contract-Driven Content */}
      <div className="flex-1 px-4 py-4">
        <SidebarContractSection
          formData={formData}
          situation={situation}
          language={language}
          isDeep={isDeep}
          // Pass refs for quick jump
          areaRefs={areaRefs}
          // Lifted accordion control from panel
          externalExpandedArea={expandedArea}
          onExpandArea={setExpandedArea}
          // Highlight state for jump feedback
          highlightKey={highlightKey}
        />
      </div>
      
      {/* Bottom safe area spacer */}
      <div className="pb-safe min-h-[20px]" />
    </div>
  );
  
  // Mobile: Bottom Drawer with premium drag handle
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[92vh] rounded-t-3xl">
          {/* Premium Drag Handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted/60 mt-3 mb-1" />
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t(language, 'panel.your_cleaning_total') || 'Your Cleaning Total'}</DrawerTitle>
          </DrawerHeader>
          <DrawerClose className="absolute right-4 top-4 z-20">
            <div className="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors touch-manipulation">
              <X className="w-5 h-5 text-muted-foreground" />
            </div>
          </DrawerClose>
          {panelContent}
        </DrawerContent>
      </Drawer>
    );
  }
  
  // Tablet: Side Sheet
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[420px] max-w-[90vw] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{t(language, 'panel.your_cleaning_total') || 'Your Cleaning Total'}</SheetTitle>
        </SheetHeader>
        <SheetClose className="absolute right-4 top-4 z-20">
          <div className="w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </div>
        </SheetClose>
        {panelContent}
      </SheetContent>
    </Sheet>
  );
}

export default YourCleaningTotalPanel;
