import { BookingProvider } from '@/contexts/BookingContext';
import { HeroSection } from './HeroSection';
import { BookingWidget } from './BookingWidget';
import { SidebarQuoteSummary } from './SidebarQuoteSummary';

export function CleaningPricingWidget() {
  return (
    <BookingProvider>
      {/* Root container: overflow protection + dynamic bottom padding via CSS var */}
      {/* Fix #3: Use EXACT same boolean (--show-sticky-footer) for consistent padding */}
      <div 
        className="min-h-screen bg-cream overflow-x-hidden lg:pb-12"
        style={{ 
          paddingBottom: 'calc((var(--show-sticky-footer, 0) * (var(--sticky-footer-h, 240px) + env(safe-area-inset-bottom, 0px))) + 16px)' 
        }}
      >
        {/* Full-width on mobile (px-3), standard padding on larger screens */}
        <section className="py-4 px-3 sm:px-4 lg:py-10">
          {/* Remove max-w constraint on mobile, apply only on lg+ */}
          <div className="w-full lg:max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1520px] lg:mx-auto">
            {/* 2-Column Layout: Flex on mobile, CSS Grid on desktop */}
            <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6 xl:gap-8 lg:items-start">
              
              {/* LEFT: Pricing Engine - Auto-fills remaining space */}
              <div className="flex-1 lg:flex-none relative z-10 min-w-0">
                {/* Mobile Only: Minimal Hero */}
                <div className="lg:hidden">
                  <HeroSection />
                </div>
                
                {/* Booking Form - Full Width */}
                <BookingWidget />
              </div>

              {/* RIGHT: Validation Sidebar - Responsive clamp width */}
              <div className="hidden lg:block lg:w-[clamp(360px,30vw,480px)] lg:shrink-0 relative z-0">
                <div className="sticky top-6">
                  {/* Subtle background differentiation */}
                  <div className="bg-gradient-to-b from-slate-50/80 to-amber-50/20 dark:from-slate-900/50 dark:to-slate-800/20 rounded-2xl p-5 lg:p-6 xl:p-7 border border-border/30 shadow-sm">
                    <SidebarQuoteSummary />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </BookingProvider>
  );
}
