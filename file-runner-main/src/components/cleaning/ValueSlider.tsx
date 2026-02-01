import { useState, useEffect } from 'react';
import { Calendar, Sparkles, Heart, Shield, Star, RefreshCw, Truck, Clock, Zap, Users, Building2, HardHat, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import type { Industry, Situation } from '@/contexts/BookingContext';

interface ValueSliderProps {
  language: Language;
  industry?: Industry | null;
  situation?: Situation | null;
}

// Message sets for each context
const messagesByContext = {
  default: [
    { icon: Shield, key: 'value_slider.licensed' },
    { icon: Star, key: 'value_slider.rated' },
    { icon: Calendar, key: 'value_slider.flexible' },
    { icon: Sparkles, key: 'value_slider.weekend' },
    { icon: Heart, key: 'value_slider.clear_mind' },
  ],
  residential_living: [
    { icon: RefreshCw, key: 'value_slider.recurring_save' },
    { icon: Calendar, key: 'value_slider.flexible' },
    { icon: Sparkles, key: 'value_slider.weekend' },
    { icon: Heart, key: 'value_slider.clear_mind' },
    { icon: Shield, key: 'value_slider.licensed' },
  ],
  residential_moving: [
    { icon: Truck, key: 'value_slider.deposit_back' },
    { icon: Sparkles, key: 'value_slider.move_deep' },
    { icon: Clock, key: 'value_slider.move_priority' },
    { icon: Heart, key: 'value_slider.stress_free' },
    { icon: Shield, key: 'value_slider.licensed' },
  ],
  residential_custom: [
    { icon: Zap, key: 'value_slider.hourly_power' },
    { icon: Calendar, key: 'value_slider.flexible' },
    { icon: Star, key: 'value_slider.estate_ready' },
    { icon: Users, key: 'value_slider.pro_team' },
    { icon: Shield, key: 'value_slider.licensed' },
  ],
  commercial: [
    { icon: Building2, key: 'value_slider.commercial_cert' },
    { icon: Shield, key: 'value_slider.commercial_insured' },
    { icon: Clock, key: 'value_slider.commercial_flexible' },
    { icon: Star, key: 'value_slider.commercial_rated' },
    { icon: HardHat, key: 'value_slider.commercial_osha' },
  ],
  renovation: [
    { icon: HardHat, key: 'value_slider.reno_osha' },
    { icon: Sparkles, key: 'value_slider.reno_silica' },
    { icon: Shield, key: 'value_slider.reno_insured' },
    { icon: Clock, key: 'value_slider.reno_guarantee' },
    { icon: Gem, key: 'value_slider.reno_premium' },
  ],
};

// Get appropriate message set based on context
function getMessageSet(industry?: Industry | null, situation?: Situation | null) {
  // Check both industry AND situation for commercial (robust fallback)
  if (industry === 'commercial' || situation === 'COMMERCIAL') {
    return messagesByContext.commercial;
  }
  // Renovation flow
  if (situation === 'RENOVATION') {
    return messagesByContext.renovation;
  }
  if (situation === 'LIVE_HERE') {
    return messagesByContext.residential_living;
  }
  if (situation === 'MOVING') {
    return messagesByContext.residential_moving;
  }
  if (situation === 'SPECIFIC_AREAS') {
    return messagesByContext.residential_custom;
  }
  return messagesByContext.default;
}

export function ValueSlider({ language, industry, situation }: ValueSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const messages = getMessageSet(industry, situation);

  // Reset index when context changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [industry, situation]);

  // Auto-rotate every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % messages.length);
        setIsTransitioning(false);
      }, 300);
    }, 4000);

    return () => clearInterval(timer);
  }, [messages.length]);

  const currentMessage = messages[currentIndex];
  const Icon = currentMessage.icon;

  return (
    <div className="py-2 sm:py-3 px-3 sm:px-4 border-t border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
      <div className="flex flex-col items-center gap-1.5 sm:gap-2">
        {/* Message with icon */}
        <div
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 transition-opacity duration-300",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary flex-shrink-0" />
          <span className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground text-center leading-tight line-clamp-2 sm:line-clamp-none">
            {t(language, currentMessage.key)}
          </span>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {messages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setIsTransitioning(false);
                }, 150);
              }}
              className={cn(
                "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all duration-300",
                idx === currentIndex
                  ? "bg-primary scale-110"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
