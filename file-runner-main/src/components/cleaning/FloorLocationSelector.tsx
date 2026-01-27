/**
 * FloorLocationSelector - Premium Floor Location Selector
 * 
 * Features:
 * - Full labels: "Floor 1", "Floor 2", "Floor 3" (not F1/F2)
 * - Required state: Amber badge + "Tap to select" hint
 * - Confirmed state: Primary color chip when selected
 * - Mobile-friendly: Premium chips with proper spacing
 * - Horizontal scroll with snap for 4+ floors (Fix #1)
 * - Swipe hint with animated chevron for 4+ floors (Fix #2)
 */

import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { MapPin, AlertCircle, ChevronRight } from 'lucide-react';
import { getFloorLabel, getFloorNumberOptions, isFloorRequired } from '@/lib/floorLocationTypes';
import { useRef, useEffect, useState, useCallback } from 'react';

interface FloorLocationSelectorProps {
  language: Language;
  value: number | null;
  onChange: (floor: number) => void;
  maxFloors: number;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  inline?: boolean; // When true, renders just the pills without label (for header use)
  showRequired?: boolean; // Show required indicator if null and multi-floor
  highlightedFloors?: number[]; // Floors that have assignments (shown with ring highlight)
}

export function FloorLocationSelector({
  language,
  value,
  onChange,
  maxFloors,
  disabled = false,
  compact = true,
  label,
  inline = false,
  showRequired = false,
  highlightedFloors = [],
}: FloorLocationSelectorProps) {
  // Allow single floor to render - shows "Floor 1" pill for mapping visibility
  // No early return needed - component handles maxFloors === 1 naturally

  const floors = getFloorNumberOptions(maxFloors);
  const hasSelection = typeof value === 'number' && value >= 1;
  const showRequiredState = showRequired && !hasSelection && isFloorRequired(maxFloors);
  
  // Ref for auto-scrolling selected option into view
  const selectedRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Swipe hint state
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const microPeekDone = useRef(false);
  
  // Check if scrollable and show hint
  const checkOverflow = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const hasOverflow = container.scrollWidth > container.clientWidth + 2;
    const isAtStart = container.scrollLeft < 8;
    
    // Show hint only if: has overflow, hasn't interacted, and at start
    setShowSwipeHint(hasOverflow && !hasInteracted && isAtStart && floors.length > 3);
  }, [hasInteracted, floors.length]);
  
  // Handle scroll to detect interaction
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    if (container.scrollLeft > 8) {
      setHasInteracted(true);
      setShowSwipeHint(false);
    }
    
    // Also hide if reached end
    const isAtEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 2;
    if (isAtEnd) {
      setShowSwipeHint(false);
    }
  }, []);
  
  // Auto-scroll to selected floor when value changes
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        inline: 'center', 
        block: 'nearest' 
      });
    }
  }, [value]);
  
  // Check overflow on mount and when floors change
  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [checkOverflow]);
  
  // Micro-peek animation (only once per mount, if overflow exists)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || microPeekDone.current || hasInteracted) return;
    
    const hasOverflow = container.scrollWidth > container.clientWidth + 2;
    if (!hasOverflow || floors.length <= 3) return;
    
    // Delay micro-peek for premium feel
    const timer = setTimeout(() => {
      if (microPeekDone.current || hasInteracted) return;
      microPeekDone.current = true;
      
      // Subtle peek right
      container.scrollTo({ left: 14, behavior: 'smooth' });
      
      // Return to start
      setTimeout(() => {
        if (container.scrollLeft < 20) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        }
      }, 400);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [floors.length, hasInteracted]);

  // Inline mode: premium horizontal scroll pills for header use
  // CRITICAL: Must scroll internally, never clip floors, auto-scroll selected
  if (inline) {
    return (
      <div className="relative flex-1 min-w-0">
        {/* Left edge fade indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none rounded-l-md" />
        {/* Right edge fade indicator */}
        <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none rounded-r-md" />
        
        {/* Animated swipe hint for 4+ floors */}
        {showSwipeHint && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center z-20 pointer-events-none pr-0.5">
            <div className="flex items-center animate-swipe-hint">
              <ChevronRight className="w-4 h-4 text-primary/70" />
              <ChevronRight className="w-4 h-4 text-primary/40 -ml-2.5" />
            </div>
          </div>
        )}
        
        {/* Scrollable pills container */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={cn(
            "flex items-center gap-1.5",
            "overflow-x-auto scrollbar-hide",
            "snap-x snap-mandatory",
            "overscroll-x-contain",
            "px-1 -mx-0.5" // Slight padding for edge fade visibility
          )}
        >
          {/* Required state badge */}
          {showRequiredState && (
            <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[8px] font-bold uppercase snap-start">
              <AlertCircle className="w-2.5 h-2.5" />
            </span>
          )}
          
          {floors.map((floor) => {
            const isSelected = value === floor;
            const isHighlighted = highlightedFloors.includes(floor);
            const floorLabel = getFloorLabel(floor, language);
            return (
              <button
                key={floor}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setHasInteracted(true);
                  setShowSwipeHint(false);
                  if (!disabled) {
                    onChange(floor);
                  }
                }}
                disabled={disabled}
                className={cn(
                  // CRITICAL: flex-shrink-0 prevents compression
                  "flex-shrink-0 snap-start",
                  "px-2.5 py-1 rounded-md",
                  "text-[10px] font-semibold whitespace-nowrap",
                  "min-h-[28px] min-w-[52px]", // Ensure visibility & touch target
                  "transition-all duration-150",
                  "active:scale-95", // Premium press feedback
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isHighlighted
                      ? "bg-primary/20 text-primary ring-1 ring-primary/50" // Highlighted: has bedroom assigned
                      : showRequiredState
                        ? "bg-amber-100/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {floorLabel}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default mode with label
  return (
    <div className={cn(
      "flex flex-col gap-2",
      compact ? "py-1" : "py-2"
    )}>
      {/* Header with label and required badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {label || t(language, 'floor.location_label')}
          </span>
        </div>
        
        {showRequiredState && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase">
            <AlertCircle className="w-3 h-3" />
            {t(language, 'floor.required')}
          </span>
        )}
      </div>
      
      {/* Floor chips - horizontal scroll with snap for premium feel (NO flex-wrap!) */}
      <div className="relative">
        {/* Right edge fade + swipe hint overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none rounded-r-md" />
        
        {/* Animated swipe hint for 4+ floors */}
        {showSwipeHint && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center z-20 pointer-events-none">
            <div className="flex items-center animate-swipe-hint">
              <ChevronRight className="w-5 h-5 text-primary/70" />
              <ChevronRight className="w-5 h-5 text-primary/40 -ml-3" />
            </div>
          </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-x-auto scrollbar-hide -mx-1 px-1 snap-x snap-mandatory"
        >
          <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
            {floors.map((floor) => {
              const isSelected = value === floor;
              const floorLabel = getFloorLabel(floor, language);
              return (
                <button
                  key={floor}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                  onClick={() => {
                    setHasInteracted(true);
                    setShowSwipeHint(false);
                    !disabled && onChange(floor);
                  }}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border-2 flex-shrink-0 min-h-[44px] snap-start",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : showRequiredState
                        ? "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 hover:border-primary/50"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {floorLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Hint text when required but not selected */}
      {showRequiredState && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          {t(language, 'floor.tap_to_select')}
        </p>
      )}
    </div>
  );
}

// Multi-location selector for bathrooms (multiple units can be on different floors)
interface MultiFloorLocationSelectorProps {
  language: Language;
  locations: number[];
  count: number;
  maxFloors: number;
  onChange: (locations: number[]) => void;
  disabled?: boolean;
  label?: string;
  showRequired?: boolean;
}

export function MultiFloorLocationSelector({
  language,
  locations,
  count,
  maxFloors,
  onChange,
  disabled = false,
  label,
  showRequired = false,
}: MultiFloorLocationSelectorProps) {
  // If no items, don't show (allow single floor for mapping visibility)
  if (count === 0) return null;

  const floors = getFloorNumberOptions(maxFloors);
  
  // Ensure locations array matches count
  const normalizedLocations = locations.length >= count 
    ? locations.slice(0, count)
    : [...locations, ...Array(count - locations.length).fill(1)];

  const handleFloorChange = (index: number, floor: number) => {
    const newLocations = [...normalizedLocations];
    newLocations[index] = floor;
    onChange(newLocations);
  };

  // Check if any location is missing
  const hasMissingSelection = normalizedLocations.some(loc => !loc || loc < 1);
  const showRequiredState = showRequired && hasMissingSelection;

  return (
    <div className="flex items-center gap-2 py-1 flex-wrap">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MapPin className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">
          {label || t(language, 'floor.locations')}
        </span>
        {showRequiredState && (
          <span className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[8px] font-bold uppercase">
            <AlertCircle className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        {normalizedLocations.map((loc, index) => (
          <div key={index} className="flex items-center gap-0.5">
            {count > 1 && (
              <span className="text-[9px] text-muted-foreground mr-0.5">
                #{index + 1}:
              </span>
            )}
            <div className="flex items-center gap-0.5">
              {floors.map((floor) => {
                const isSelected = loc === floor;
                const floorLabel = getFloorLabel(floor, language);
                return (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => !disabled && handleFloorChange(index, floor)}
                    disabled={disabled}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all duration-150",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : showRequiredState && !loc
                          ? "bg-amber-100/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {floorLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
