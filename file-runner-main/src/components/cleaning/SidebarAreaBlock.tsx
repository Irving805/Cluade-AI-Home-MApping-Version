/**
 * SidebarAreaBlock — Premium mobile-optimized area block for sidebar
 * 
 * Renders each service area based on the contract, displaying:
 * - Area header with emoji, label, status badge
 * - Floor and Ceiling badges for logistics visibility
 * - Price/Time impact summaries
 * - Expandable field details with smooth animations
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  SIDEBAR_FIELD_CONTRACT,
  computeAreaStatus,
  computeAreaPriceImpact,
  computeAreaTimeImpact,
  getFieldValue,
  getDisplayableFields,
} from '@/lib/homeMappingSidebarContract';
import { ServiceAreaKey } from '@/lib/homeMappingRegistry';
import { BookingFormData, Situation, CeilingHeights, RoomFloorLocations } from '@/contexts/BookingContext';
import { Language, t } from '@/lib/translations';
import { SidebarStatusBadge } from './SidebarStatusBadge';
import { SidebarFieldRow } from './SidebarFieldRow';
import { extractUniqueCeilings } from '@/lib/homeMappingCeilingHelpers';
import { extractBedroomFloors, extractUniqueFloors } from '@/lib/homeMappingFloorHelpers';
import { getCeilingBadgeLabel, CEILING_BADGE_CLASS, ResidentialCeilingHeight } from '@/lib/ceilingHeightTypes';
import { getFloorLabelShort } from '@/lib/floorLocationTypes';
import { AreaDiff } from '@/lib/sidebarDiffEngine';

// Floor badge classes - primary theme color
const FLOOR_BADGE_CLASS = "px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-primary/90 text-primary-foreground whitespace-nowrap";

interface SidebarAreaBlockProps {
  areaKey: ServiceAreaKey;
  formData: BookingFormData;
  language: Language;
  isDeep: boolean;
  situation: Situation;
  defaultExpanded?: boolean;
  // Logistics display props
  ceilingHeights?: CeilingHeights;
  roomFloorLocations?: RoomFloorLocations;
  maxFloors?: number;
  hallways?: Array<{ id: string; floorLevel?: number | null }>;
  stairs?: Array<{ id: string; fromFloor: number; toFloor: number }>;
  // Diff tracking
  areaDiff?: AreaDiff | null;
  // Controlled expand (for accordion behavior)
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function SidebarAreaBlock({
  areaKey,
  formData,
  language,
  isDeep,
  situation,
  defaultExpanded = false,
  ceilingHeights,
  roomFloorLocations,
  maxFloors = 1,
  hallways = [],
  stairs = [],
  areaDiff,
  isExpanded: controlledExpanded,
  onToggle,
}: SidebarAreaBlockProps) {
  // Use controlled or internal state
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };
  
  // Track diff display timeout
  const [showDiff, setShowDiff] = useState(false);
  const diffTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (areaDiff && areaDiff.totalChanges > 0) {
      setShowDiff(true);
      // Clear any existing timeout
      if (diffTimeoutRef.current) {
        clearTimeout(diffTimeoutRef.current);
      }
      // Hide diff indicator after 3 seconds
      diffTimeoutRef.current = setTimeout(() => {
        setShowDiff(false);
      }, 3000);
    }
    return () => {
      if (diffTimeoutRef.current) {
        clearTimeout(diffTimeoutRef.current);
      }
    };
  }, [areaDiff]);
  
  const contract = SIDEBAR_FIELD_CONTRACT[areaKey];
  if (!contract) return null;
  
  const status = computeAreaStatus(areaKey, formData);
  const priceImpact = computeAreaPriceImpact(areaKey, formData, isDeep);
  const timeImpact = computeAreaTimeImpact(areaKey, formData, isDeep);
  const displayableFields = getDisplayableFields(areaKey);
  
  // Compute floor badges for this area
  const floorBadges: number[] = [];
  const ceilingBadges: ResidentialCeilingHeight[] = [];
  
  // Core spaces (kitchen, living, dining, stairs) - single floor/ceiling per area
  if (['kitchen', 'living', 'dining'].includes(areaKey)) {
    const floor = roomFloorLocations?.[areaKey as 'kitchen' | 'living' | 'dining'];
    if (typeof floor === 'number' && floor > 0 && maxFloors >= 2) {
      floorBadges.push(floor);
    }
    const ceiling = ceilingHeights?.[areaKey as 'kitchen' | 'living' | 'dining'];
    if (ceiling) {
      ceilingBadges.push(ceiling);
    }
  }
  
  // Bedrooms - multiple entries, extract unique values
  if (areaKey === 'bedrooms') {
    const bedroomFloors = extractBedroomFloors(roomFloorLocations?.bedrooms);
    if (maxFloors >= 2) {
      floorBadges.push(...bedroomFloors);
    }
    const bedroomCeilings = extractUniqueCeilings(ceilingHeights?.bedrooms);
    ceilingBadges.push(...bedroomCeilings);
  }
  
  // Hallways - multiple entries
  if (areaKey === 'hallways') {
    const hallwayFloors = extractUniqueFloors(hallways);
    if (maxFloors >= 2) {
      floorBadges.push(...hallwayFloors);
    }
    const hallwayCeilings = extractUniqueCeilings(ceilingHeights?.hallways);
    ceilingBadges.push(...hallwayCeilings);
  }
  
  // Stairs - extract unique floors from fromFloor/toFloor
  if (areaKey === 'stairs') {
    const stairFloors = new Set<number>();
    stairs.forEach(stair => {
      if (stair.fromFloor) stairFloors.add(stair.fromFloor);
      if (stair.toFloor) stairFloors.add(stair.toFloor);
    });
    if (maxFloors >= 2 && stairFloors.size > 0) {
      floorBadges.push(...[...stairFloors].sort((a, b) => a - b));
    }
  }
  
  // Determine if this block has any meaningful content to show
  const hasContent = status.changedFromDefault || priceImpact > 0 || timeImpact > 0;
  const hasBadges = floorBadges.length > 0 || ceilingBadges.length > 0;
  
  // Skip entirely if default_only with no impacts (minimal clutter)
  if (status.status === 'default_only' && !hasContent && displayableFields.length === 0 && !hasBadges) {
    return null;
  }
  
  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            // Base layout
            "w-full flex items-center justify-between gap-2",
            // Mobile-first touch-friendly sizing
            "min-h-[44px] py-2.5 px-3 sm:py-2 sm:px-2.5",
            // Premium rounded styling
            "rounded-xl sm:rounded-lg",
            // Smooth transitions
            "transition-all duration-200 ease-out",
            // Interactive states
            "hover:bg-primary/5 active:scale-[0.98]",
            // Expanded state
            isExpanded && "bg-primary/5 shadow-sm"
          )}
        >
          {/* Left: Emoji + Label + Badges */}
          <div className="flex items-center gap-2.5 sm:gap-2 min-w-0 flex-1">
            {/* Emoji container with subtle background */}
            <div className={cn(
              "flex items-center justify-center flex-shrink-0",
              "w-8 h-8 sm:w-6 sm:h-6 rounded-lg sm:rounded-md",
              "bg-gradient-to-br from-muted/80 to-muted/40",
              "shadow-sm"
            )}>
              <span className="text-base sm:text-sm">{contract.emoji}</span>
            </div>
            
            {/* Label */}
            <span className={cn(
              "text-sm sm:text-xs font-medium text-foreground truncate",
              "transition-colors duration-150"
            )}>
              {t(language, contract.labelKey) || areaKey}
            </span>
            
            {/* Status badge */}
            <SidebarStatusBadge status={status.status} language={language} compact />
            
            {/* Floor + Ceiling Badges - overflow-safe with +N indicator */}
            {hasBadges && (
              <div className={cn(
                "flex flex-wrap items-center gap-0.5",
                "max-w-[90px] sm:max-w-[120px] min-w-0",
                "overflow-hidden"
              )}>
                {/* Floor badges - limit to 3 */}
                {floorBadges.slice(0, 3).map(floor => (
                  <span key={`floor-${floor}`} className={FLOOR_BADGE_CLASS}>
                    {getFloorLabelShort(floor)}
                  </span>
                ))}
                {floorBadges.length > 3 && (
                  <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-primary/60 text-primary-foreground">
                    +{floorBadges.length - 3}
                  </span>
                )}
                {/* Ceiling badges - limit to 2 */}
                {ceilingBadges.slice(0, 2).map(ceiling => (
                  <span key={`ceiling-${ceiling}`} className={CEILING_BADGE_CLASS}>
                    {getCeilingBadgeLabel(ceiling, language)}
                  </span>
                ))}
                {ceilingBadges.length > 2 && (
                  <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-accent/60 text-accent-foreground">
                    +{ceilingBadges.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Right: Diff + Impacts + Chevron */}
          <div className="flex items-center gap-2 sm:gap-1.5 flex-shrink-0">
            {/* Recent changes indicator */}
            {showDiff && areaDiff && areaDiff.totalChanges > 0 && (
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                "bg-blue-100 dark:bg-blue-900/40",
                "text-blue-600 dark:text-blue-300",
                "animate-pulse"
              )}>
                {areaDiff.totalChanges} {t(language, 'sidebar.changes') || 'changes'}
              </span>
            )}
            
            {/* Impact badges with premium styling */}
            {priceImpact > 0 && (
              <span className={cn(
                "text-xs sm:text-[10px] font-semibold font-mono",
                "px-2 py-0.5 sm:px-1.5 rounded-full",
                "bg-emerald-100 dark:bg-emerald-900/40",
                "text-emerald-700 dark:text-emerald-300"
              )}>
                +${priceImpact}
              </span>
            )}
            {timeImpact > 0 && (
              <span className={cn(
                "text-xs sm:text-[10px] font-semibold font-mono",
                "px-2 py-0.5 sm:px-1.5 rounded-full",
                "bg-blue-100 dark:bg-blue-900/40",
                "text-blue-700 dark:text-blue-300"
              )}>
                +{timeImpact}m
              </span>
            )}
            
            {/* Animated chevron */}
            <div className={cn(
              "flex items-center justify-center",
              "w-6 h-6 sm:w-5 sm:h-5 rounded-full",
              "bg-muted/60 transition-all duration-200",
              isExpanded && "bg-primary/10"
            )}>
              <ChevronRight className={cn(
                "w-4 h-4 sm:w-3.5 sm:h-3.5 text-muted-foreground",
                "transition-transform duration-200 ease-out",
                isExpanded && "rotate-90 text-primary"
              )} />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className={cn(
          // Layout
          "ml-[42px] sm:ml-8 mr-2 mb-2",
          // Premium card styling
          "bg-muted/30 rounded-xl sm:rounded-lg",
          "border border-border/40",
          "p-3 sm:p-2",
          // Content spacing
          "space-y-1"
        )}>
          {displayableFields.map(field => {
            const value = getFieldValue(formData, field.key);
            const fieldPriceImpact = field.priceImpactFn 
              ? field.priceImpactFn(value, formData, isDeep) 
              : 0;
            const fieldTimeImpact = field.timeImpactFn 
              ? field.timeImpactFn(value, formData, isDeep) 
              : 0;
            
            return (
              <SidebarFieldRow
                key={field.key}
                field={field}
                value={value}
                language={language}
                priceImpact={fieldPriceImpact}
                timeImpact={fieldTimeImpact}
                formData={formData}
              />
            );
          })}
          
          {displayableFields.length === 0 && (
            <p className="text-xs sm:text-[10px] text-muted-foreground italic py-2 sm:py-1 text-center">
              {t(language, 'sidebar.no_fields') || 'No configurable fields'}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default SidebarAreaBlock;
