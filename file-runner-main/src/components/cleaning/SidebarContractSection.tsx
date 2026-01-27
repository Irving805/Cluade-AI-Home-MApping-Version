/**
 * SidebarContractSection — Contract-driven Detailed Home Mapping sidebar
 * 
 * This component renders ALL home mapping areas using ONLY the data contract.
 * It replaces the hardcoded per-area rendering in LivePriceSummary.
 * 
 * PRINCIPLE: This component has NO business logic.
 *            It only renders what the contract tells it to.
 */

import { useMemo, useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingFormData, Situation } from '@/contexts/BookingContext';
import { Language, t } from '@/lib/translations';
import { ServiceAreaKey } from '@/lib/homeMappingRegistry';
import { 
  buildUnifiedGatingContext,
  validateSidebarContract,
} from '@/lib/homeMappingSidebarContract';
import { SidebarAreaBlock } from './SidebarAreaBlock';
import { computeSidebarDiff, DiffResult } from '@/lib/sidebarDiffEngine';
import { getMappedAreaDefinitions } from '@/lib/mappedSpacesSelector';

interface SidebarContractSectionProps {
  formData: BookingFormData;
  situation: Situation;
  language: Language;
  isDeep: boolean;
  className?: string;
  /** External refs for quick-jump navigation from parent panel */
  areaRefs?: React.MutableRefObject<Record<ServiceAreaKey, HTMLDivElement | null>>;
  /** External accordion control from parent panel (lifted state) */
  externalExpandedArea?: ServiceAreaKey | null;
  onExpandArea?: (key: ServiceAreaKey | null) => void;
  /** Current area to highlight (for Jump To feedback) */
  highlightKey?: ServiceAreaKey | null;
}

export function SidebarContractSection({
  formData,
  situation,
  language,
  isDeep,
  className,
  areaRefs: externalAreaRefs,
  externalExpandedArea,
  onExpandArea,
  highlightKey,
}: SidebarContractSectionProps) {
  // Build unified gating context — same context used by UI components
  const gatingContext = useMemo(() => 
    buildUnifiedGatingContext(formData, situation), 
    [formData, situation]
  );
  
  // Get MAPPED areas (eligible + enabled for utility/premium)
  // This is the SSOT for what appears in the sidebar
  const visibleAreas = useMemo(() => 
    getMappedAreaDefinitions(formData, gatingContext),
    [formData, gatingContext]
  );
  
  // Diff tracking for smart change detection
  const prevFormDataRef = useRef<BookingFormData | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  
  useEffect(() => {
    if (prevFormDataRef.current) {
      const newDiff = computeSidebarDiff(
        prevFormDataRef.current,
        formData,
        gatingContext,
        language
      );
      if (newDiff.hasChanges) {
        setDiff(newDiff);
        // Clear diff after 3 seconds
        const timer = setTimeout(() => setDiff(null), 3000);
        return () => clearTimeout(timer);
      }
    }
    prevFormDataRef.current = { ...formData };
  }, [formData, gatingContext, language]);
  
  // Accordion behavior - use external state if provided, otherwise internal
  const [internalExpandedArea, setInternalExpandedArea] = useState<ServiceAreaKey | null>(
    visibleAreas[0]?.key || null
  );
  
  // Use external state if provided (lifted from panel), else internal
  const expandedArea = externalExpandedArea !== undefined 
    ? externalExpandedArea 
    : internalExpandedArea;
  
  const handleToggle = (key: ServiceAreaKey) => {
    const newValue = expandedArea === key ? null : key;
    if (onExpandArea) {
      onExpandArea(newValue);
    } else {
      setInternalExpandedArea(newValue);
    }
  };
  
  // Dev-only validation — warn about unmapped fields
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      validateSidebarContract(formData);
    }
  }, [formData]);
  
  // Compute property floors for badge display
  const maxFloors = gatingContext.propertyFloors;
  
  // Don't render if no areas are visible
  if (visibleAreas.length === 0) return null;
  
  return (
    <div className={cn(
      // Container spacing
      "space-y-1.5 sm:space-y-1",
      // Premium top border with gradient effect
      "border-t border-border/30 pt-4 sm:pt-3 mt-4 sm:mt-3",
      className
    )}>
      {/* Section Header - Premium styling */}
      <div className={cn(
        "flex items-center gap-2 sm:gap-1.5 mb-3 sm:mb-2",
        "px-2 sm:px-0"
      )}>
        <div className={cn(
          "flex items-center justify-center",
          "w-7 h-7 sm:w-5 sm:h-5 rounded-lg sm:rounded-md",
          "bg-gradient-to-br from-primary/20 to-primary/5",
          "shadow-sm ring-1 ring-primary/10"
        )}>
          <MapPin className="w-4 h-4 sm:w-3 sm:h-3 text-primary" />
        </div>
        <span className={cn(
          "text-xs sm:text-[10px] font-bold",
          "text-foreground/80 uppercase tracking-widest"
        )}>
          {t(language, 'sidebar.detailed_mapping') || 'Detailed Home Mapping'}
        </span>
      </div>
      
      {/* Areas container with subtle background */}
      <div className={cn(
        "rounded-2xl sm:rounded-xl",
        "bg-gradient-to-b from-muted/20 to-transparent",
        "p-1.5 sm:p-1",
        "space-y-1"
      )}>
        {/* Render each visible area using SidebarAreaBlock */}
        {visibleAreas.map((area) => (
          <div
            key={area.key}
            ref={(el) => {
              // Store ref for quick-jump navigation
              if (externalAreaRefs) {
                externalAreaRefs.current[area.key] = el;
              }
            }}
            // scrollMarginTop for accurate scroll positioning
            style={{ 
              scrollMarginTop: 'calc(var(--yct-sticky-header-h, 160px) + 8px)' 
            }}
            className={cn(
              "transition-all duration-200",
              // React-state driven highlight (not classList.add/remove)
              highlightKey === area.key && "jump-highlight"
            )}
          >
            <SidebarAreaBlock
              areaKey={area.key}
              formData={formData}
              language={language}
              isDeep={isDeep}
              situation={situation}
              // Logistics display props
              ceilingHeights={formData.ceilingHeights}
              roomFloorLocations={formData.roomFloorLocations}
              maxFloors={maxFloors}
              hallways={formData.hallways?.map(h => ({ id: h.id, floorLevel: h.floorLevel })) || []}
              stairs={formData.stairs?.map(s => ({ id: s.id, fromFloor: s.fromFloor, toFloor: s.toFloor })) || []}
              // Diff tracking
              areaDiff={diff?.byArea[area.key] || null}
              // Accordion behavior with lifted state support
              isExpanded={expandedArea === area.key}
              onToggle={() => handleToggle(area.key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SidebarContractSection;
