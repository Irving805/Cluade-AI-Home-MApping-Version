import { useBooking } from '@/contexts/BookingContext';
import { useCityConfig } from '@/hooks/useCityConfig';
import { t } from '@/lib/translations';
import { Star, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useState, useEffect } from 'react';
import { LivePriceSummary } from './LivePriceSummary';

// Storytelling slider images - The Experience Journey
const STORY_SLIDES = [
  {
    src: 'https://nancyshousekeepingservice.com/wp-content/uploads/2025/12/Team-arriving-to-clients-home.jpg',
    alt: 'Professional cleaning team arriving',
    caption: 'Professionalism',
  },
  {
    src: 'https://nancyshousekeepingservice.com/wp-content/uploads/2025/12/maid-after-cleaning.jpg',
    alt: 'Detail-oriented kitchen cleaning',
    caption: 'Quality & Expertise',
  },
  {
    src: 'https://nancyshousekeepingservice.com/wp-content/uploads/2025/12/Client-Relax-enjoin-free-time-scaled.jpg',
    alt: 'Happy client enjoying clean home',
    caption: 'Your Time Back',
  },
  {
    src: 'https://nancyshousekeepingservice.com/wp-content/uploads/2025/12/The-promise-Relax-and-Enjoy-scaled.jpg',
    alt: 'Relaxing in a spotless home',
    caption: 'The Promise',
  },
];

// Get current city param from URL for link persistence
function getCurrentCityParam(): string | null {
  const mainUrlParams = new URLSearchParams(window.location.search);
  let cityParam = mainUrlParams.get('city');

  if (!cityParam && window.location.hash) {
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1]);
      cityParam = hashParams.get('city');
    }
  }
  
  if (cityParam) {
    try {
      cityParam = decodeURIComponent(cityParam);
    } catch { /* ignore decode errors */ }
    cityParam = cityParam.replace(/\/+$/, '').trim();
  }
  
  return cityParam || null;
}

// Build smart link with city persistence
function buildSmartLink(baseUrl: string): string {
  const cityParam = getCurrentCityParam();
  if (!cityParam) return baseUrl;
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}city=${encodeURIComponent(cityParam)}`;
}

// Build smart logo link
function buildLogoLink(): string {
  const cityParam = getCurrentCityParam();
  
  if (!cityParam || cityParam.toLowerCase() === 'goleta') {
    return 'https://nancyshousekeepingservice.com/';
  }
  
  return `https://nancyshousekeepingservice.com/${cityParam}/?city=${encodeURIComponent(cityParam)}`;
}

// Compact Storytelling Slider for Sidebar
function SidebarSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const cityConfig = useCityConfig();

  // Auto-advance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % STORY_SLIDES.length);
        setIsTransitioning(false);
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Preload images
  useEffect(() => {
    STORY_SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.src;
    });
  }, []);

  const currentSlide = STORY_SLIDES[currentIndex];

  return (
    <div className="relative w-full rounded-lg overflow-hidden aspect-[4/3] shadow-sm border border-border/30">
      <img 
        src={currentSlide.src}
        alt={`${currentSlide.alt} - Professional cleaning services in ${cityConfig.label}`}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Caption overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-3 transition-opacity duration-500 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}>
        <span className="text-white/90 text-xs font-medium">
          {currentSlide.caption}
        </span>
      </div>
      
      {/* Slide indicators */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        {STORY_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setCurrentIndex(idx);
                setIsTransitioning(false);
              }, 300);
            }}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex 
                ? 'bg-white scale-110' 
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function SidebarQuoteSummary() {
  const { language } = useBooking();
  const cityConfig = useCityConfig();

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Logo & Brand Header */}
      <div className="text-center">
        <a 
          href={buildLogoLink()}
          id="track-sidebar-logo-click"
          className="inline-block hover:opacity-90 transition-opacity mb-3"
        >
          <img 
            src={logo} 
            alt="Nancy's Cleaning Services" 
            className="h-16 lg:h-20 w-auto object-contain mx-auto"
          />
        </a>
        
        {/* Area Tag */}
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <MapPin className="w-3 h-3" />
            {cityConfig.areaTag}
          </span>
        </div>
        
        {/* Title */}
        <h2 className="text-lg lg:text-xl font-bold text-foreground mb-1.5">
          {t(language, 'hero.title_short') || 'Your Clean Home Awaits'}
        </h2>
        <p className="text-xs lg:text-sm text-muted-foreground">
          See Your Price Instantly — No Guesswork
        </p>
      </div>

      {/* Live Price Summary - The Main Event */}
      <div className="relative">
        <LivePriceSummary />
      </div>

      {/* Visual Reward - Image Carousel */}
      <div className="pt-2">
        <SidebarSlider />
      </div>

      {/* Trust Stack - Safety Signals */}
      <div className="bg-gradient-to-br from-slate-50/80 to-amber-50/40 dark:from-slate-900/50 dark:to-slate-800/30 rounded-xl p-4 lg:p-5 border border-border/40 space-y-3">
        <div className="flex items-start gap-2.5 text-xs text-foreground">
          <Star className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: t(language, 'trust.item1') }} />
        </div>
        <div className="flex items-start gap-2.5 text-xs text-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: t(language, 'trust.item2') }} />
        </div>
        <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
          <CheckCircle className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
          <span>Licensed, Bonded & Insured — Zero Risk</span>
        </div>
      </div>

      {/* Commercial CTA - Secondary Action */}
      <div className="pt-3 border-t border-border/30 text-center">
        <p className="text-xs text-muted-foreground mb-2">
          {t(language, 'hero.commercial')}
        </p>
        <a
          id="track-sidebar-contact-commercial"
          href={buildSmartLink('https://nancyshousekeepingservice.com/contact-us/')}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-primary font-semibold text-xs hover:opacity-80 transition-opacity"
        >
          <span>{t(language, 'hero.contact_btn')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
