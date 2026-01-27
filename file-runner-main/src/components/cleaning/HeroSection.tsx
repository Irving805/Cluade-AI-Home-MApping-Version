import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { useCityConfig } from '@/hooks/useCityConfig';
import { Star, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useState, useEffect, useMemo, useCallback } from 'react';

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

// All images to preload (for slider + legacy step-based)
const ALL_HERO_IMAGES = STORY_SLIDES.map(s => s.src);

// Get current city param from URL for link persistence (sanitized)
function getCurrentCityParam(): string | null {
  // Try query params from main URL first
  const mainUrlParams = new URLSearchParams(window.location.search);
  let cityParam = mainUrlParams.get('city');

  // If not found, try query params after the hash
  if (!cityParam && window.location.hash) {
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1]);
      cityParam = hashParams.get('city');
    }
  }
  
  // Sanitize: decode, remove trailing slashes, trim
  if (cityParam) {
    try {
      cityParam = decodeURIComponent(cityParam);
    } catch { /* ignore decode errors */ }
    cityParam = cityParam.replace(/\/+$/, '').trim();
  }
  
  return cityParam || null;
}

// Build smart link with city persistence (clean, no trailing slashes)
function buildSmartLink(baseUrl: string): string {
  const cityParam = getCurrentCityParam();
  if (!cityParam) return baseUrl;
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}city=${encodeURIComponent(cityParam)}`;
}

// Build smart logo link - contextual navigation based on city
function buildLogoLink(): string {
  const cityParam = getCurrentCityParam();
  
  // Default (no city or "goleta") goes to homepage
  if (!cityParam || cityParam.toLowerCase() === 'goleta') {
    return 'https://nancyshousekeepingservice.com/';
  }
  
  // Other cities go to their landing page with city param
  return `https://nancyshousekeepingservice.com/${cityParam}/?city=${encodeURIComponent(cityParam)}`;
}


// Storytelling Slider Component - Auto-rotating hero images
function StorytellingSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { language } = useBooking();
  const cityConfig = useCityConfig();

  // Auto-advance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % STORY_SLIDES.length);
        setIsTransitioning(false);
      }, 400); // Match fade-out duration
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentSlide = STORY_SLIDES[currentIndex];

  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0 rounded-xl shadow-lg border border-border/20 overflow-hidden aspect-[4/3]">
      {/* Image with fade transition */}
      <img 
        src={currentSlide.src}
        alt={`${currentSlide.alt} - Professional cleaning services in ${cityConfig.label}`}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Caption overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-4 transition-opacity duration-500 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}>
        <span className="text-white/90 text-sm font-medium">
          {currentSlide.caption}
        </span>
      </div>
      
      {/* Slide indicators */}
      <div className="absolute bottom-3 right-3 flex gap-1.5">
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
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
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

// Minimal Mobile Hero - Logo, Title, Subtitle only
export function HeroSection() {
  const { language } = useBooking();
  const cityConfig = useCityConfig();

  return (
    <div className="text-center mb-6">
      {/* Logo with smart contextual navigation */}
      <div className="mb-4 flex justify-center">
        <a 
          href={buildLogoLink()}
          id="track-logo-click"
          className="inline-block hover:opacity-90 transition-opacity"
        >
          <img 
            src={logo} 
            alt="Nancy's Cleaning Services" 
            className="h-16 w-auto object-contain"
          />
        </a>
      </div>

      {/* Area Tag */}
      <div className="mb-3 flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <MapPin className="w-3 h-3" />
          {cityConfig.areaTag}
        </span>
      </div>

      {/* Title */}
      <h1
        className="font-display text-xl sm:text-2xl font-bold text-primary mb-2 leading-tight"
        dangerouslySetInnerHTML={{ __html: t(language, 'hero.title') }}
      />

      {/* Dynamic Subtitle based on city */}
      <p className="text-sm text-muted-foreground font-medium">
        {cityConfig.heroSubtitle}
      </p>
    </div>
  );
}
