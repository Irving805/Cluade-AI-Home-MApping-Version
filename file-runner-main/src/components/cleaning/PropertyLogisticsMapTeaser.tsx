/**
 * PropertyLogisticsMapTeaser — Collapsed Property Logistics Map
 * 
 * Shows a compact teaser of the property logistics with:
 * - Floor distribution chips (% per floor)
 * - Top time zone highlight
 * - Ops Extra badge (if applicable)
 * - Mini thumbnail of stacked floors
 * - "View Map" button to expand
 * 
 * PLACEMENT: After Total/Time, before CTA in "Your Cleaning Total" sidebar
 * DEFAULT: Collapsed. Auto-opens once per session if opsExtraMinutesTotal > 20
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, MapPin, Clock, Wrench, Layers, Bath, ChefHat, Bed, Home, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import type { HomeLayoutModel, LayoutArea, LayoutFloor, AreaType } from '@/lib/layout/homeLayoutModel';

interface PropertyLogisticsMapTeaserProps {
  layoutModel: HomeLayoutModel | null;
  language: Language;
  onExpand?: () => void;
  variant?: 'default' | 'compact';
  className?: string;
}

// Session storage key for auto-open tracking
const AUTO_OPEN_KEY = 'propertyMap_autoOpened';

// Area type icons
function getAreaIcon(type: AreaType) {
  switch (type) {
    case 'bathroom': return Bath;
    case 'kitchen': return ChefHat;
    case 'bedroom': return Bed;
    default: return Home;
  }
}

// Heat color based on minutes
function getHeatColor(minutes: number): string {
  if (minutes <= 20) return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700';
  if (minutes <= 40) return 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-700';
  if (minutes <= 60) return 'bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-700';
  return 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-700';
}

// Mini Floor Card for thumbnail
function MiniFloorCard({ floor, isTop }: { floor: LayoutFloor; isTop: boolean }) {
  const topAreas = floor.areas.slice(0, 3);
  
  return (
    <div 
      className={cn(
        "relative rounded-md border px-2 py-1.5 transition-all",
        isTop ? "bg-muted/60" : "bg-background",
        "border-border/40"
      )}
      style={{
        transform: isTop ? 'translateY(0)' : 'translateY(-4px)',
        zIndex: isTop ? 1 : 2,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-medium text-muted-foreground">
          F{floor.floorId.replace('FLOOR_', '')}
        </span>
        <span className="text-[10px] font-semibold text-foreground">
          {floor.percentOfTotal}%
        </span>
      </div>
      <div className="flex gap-0.5">
        {topAreas.map((area, idx) => (
          <div
            key={area.id}
            className={cn(
              "h-2 rounded-sm border",
              getHeatColor(area.minutesTotal)
            )}
            style={{ 
              width: `${Math.max(20, (area.minutesTotal / floor.minutesTotal) * 100)}%`,
              minWidth: '12px',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PropertyLogisticsMapTeaser({
  layoutModel,
  language,
  onExpand,
  variant = 'default',
  className,
}: PropertyLogisticsMapTeaserProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Auto-open logic: once per session if opsExtraMinutesTotal > 20
  useEffect(() => {
    if (!layoutModel) return;
    
    const alreadyOpened = sessionStorage.getItem(AUTO_OPEN_KEY);
    if (!alreadyOpened && layoutModel.opsExtraMinutesTotal > 20) {
      setIsExpanded(true);
      sessionStorage.setItem(AUTO_OPEN_KEY, 'true');
    }
  }, [layoutModel?.opsExtraMinutesTotal]);
  
  const handleToggle = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
    } else if (onExpand) {
      onExpand();
    } else {
      setIsExpanded(true);
    }
  }, [isExpanded, onExpand]);
  
  // Show fallback teaser if no model or no floors
  if (!layoutModel || layoutModel.floors.length === 0) {
    const isCompact = variant === 'compact';
    return (
      <div 
        className={cn(
          "rounded-lg border border-dashed border-border/60 bg-muted/20 overflow-hidden",
          isCompact ? "p-2" : "p-3",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0 p-1.5 rounded-md bg-muted/40">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t(language, 'property_map.title')}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {t(language, 'property_map.add_rooms')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground/50">
          <span className="px-1.5 py-0.5 rounded bg-muted/40">Floors: —</span>
          <span className="px-1.5 py-0.5 rounded bg-muted/40">Areas: —</span>
          <span className="px-1.5 py-0.5 rounded bg-muted/40">Ops: —</span>
        </div>
      </div>
    );
  }
  
  const { floors, topTimeZones, opsExtraMinutesTotal, hasMultiFloor, totalMinutes } = layoutModel;
  const topZone = topTimeZones[0];
  const TopZoneIcon = topZone ? getAreaIcon(topZone.type) : Home;
  
  // Compact variant for mobile
  const isCompact = variant === 'compact';
  
  return (
    <div 
      className={cn(
        "rounded-lg border border-border/60 bg-gradient-to-b from-muted/30 to-muted/10 overflow-hidden transition-all",
        isCompact ? "p-2" : "p-3",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 p-1.5 rounded-md bg-primary/10">
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className={cn(
              "font-medium text-foreground leading-tight truncate",
              isCompact ? "text-xs" : "text-sm"
            )}>
              {t(language, 'property_map.title')}
            </h4>
            {!isCompact && (
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {t(language, 'property_map.subtitle')}
              </p>
            )}
          </div>
        </div>
        
        <div className="shrink-0 flex items-center gap-1">
          {opsExtraMinutesTotal > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              <Wrench className="h-2.5 w-2.5" />
              +{opsExtraMinutesTotal}m
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {/* Collapsed Content (Teaser) */}
      {!isExpanded && (
        <div className={cn("mt-2", isCompact ? "space-y-1.5" : "space-y-2")}>
          {/* 3 Key Metric Chips Row + Property Size Chips */}
          <div className="flex flex-wrap gap-1.5">
            {/* Beds chip */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border/50">
              <Bed className="h-2.5 w-2.5 text-muted-foreground" />
              {t(language, 'property_map.beds')}: {layoutModel.profile.isStudio ? 'Studio' : layoutModel.profile.bedroomCount}
            </span>
            {/* SqFt chip (if available) */}
            {layoutModel.profile.sqftLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border/50">
                <Square className="h-2.5 w-2.5 text-muted-foreground" />
                {layoutModel.profile.sqftLabel}
              </span>
            )}
            {/* Floors chip */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border/50">
              <Layers className="h-2.5 w-2.5 text-muted-foreground" />
              {t(language, 'property_map.floors')}: {floors.length}
            </span>
            {/* Zones chip */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border/50">
              <Home className="h-2.5 w-2.5 text-muted-foreground" />
              {t(language, 'property_map.zones')}: {layoutModel.allAreasCount}
            </span>
            {/* Ops Extra chip */}
            {opsExtraMinutesTotal > 0 && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                title={t(language, 'property_map.ops_extra_tooltip')}
              >
                <Wrench className="h-2.5 w-2.5" />
                +{opsExtraMinutesTotal}m
              </span>
            )}
          </div>

          {/* DEV ONLY: Bedroom SSOT Debug Display */}
          {process.env.NODE_ENV === 'development' && layoutModel.debugMeta?.bedrooms && layoutModel.debugMeta.bedrooms.resolvedFloors.length > 0 && (
            <div className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-[8px] font-mono text-muted-foreground">
              Beds: {layoutModel.debugMeta.bedrooms.resolvedFloors.map(b => 
                `${b.id}→F${b.floor}(${b.source.slice(0, 3)})`
              ).join(' | ')}
            </div>
          )}

          {/* Distribution Estimated Badge (if applicable) */}
          {layoutModel.isDistributionEstimated && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-muted-foreground bg-muted/50 border border-dashed border-border/50">
              <span className="opacity-60">ⓘ</span>
              <span>{t(language, 'property_map.distribution_estimated')}</span>
            </div>
          )}
          
          {/* Mini Thumbnail + Top Zone */}
          <div className="flex items-center gap-3">
            {/* Mini Stacked Floors (show even for single floor) */}
            <div className="shrink-0 w-20 flex flex-col gap-0.5">
              {floors.slice(0, 2).reverse().map((floor, idx) => (
                <MiniFloorCard 
                  key={floor.floorId} 
                  floor={floor} 
                  isTop={idx === floors.length - 1}
                />
              ))}
            </div>
            
            {/* Top Zone Highlight */}
            {topZone && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  {t(language, 'property_map.top_zone')}:
                </p>
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md border",
                  getHeatColor(topZone.minutesTotal)
                )}>
                  <TopZoneIcon className="h-3 w-3 shrink-0" />
                  <span className="text-xs font-medium truncate">
                    {topZone.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {topZone.minutesTotal}m
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* View Map Button */}
          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <span>{t(language, 'property_map.view_map')}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
      
      {/* Expanded Content */}
      {isExpanded && (
        <PropertyLogisticsMapExpanded
          layoutModel={layoutModel}
          language={language}
          onCollapse={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

// ============= EXPANDED VIEW (INLINE) =============

interface ExpandedProps {
  layoutModel: HomeLayoutModel;
  language: Language;
  onCollapse: () => void;
}

function PropertyLogisticsMapExpanded({ layoutModel, language, onCollapse }: ExpandedProps) {
  const { floors, topTimeZones, opsExtraMinutesTotal, totalMinutes } = layoutModel;
  
  return (
    <div className="mt-3 space-y-3 animate-fade-in">
      {/* Time by Floor Bars */}
      <div className="space-y-1.5">
        <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {t(language, 'property_map.time_by_floor')}
        </h5>
        {floors.map((floor) => (
          <div key={floor.floorId} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 shrink-0">
              {floor.label}
            </span>
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
                style={{ width: `${floor.percentOfTotal}%` }}
              />
            </div>
            <span className="text-xs font-medium text-foreground w-16 text-right shrink-0">
              {floor.minutesTotal}m ({floor.percentOfTotal}%)
            </span>
          </div>
        ))}
      </div>
      
      {/* 2.5D Stacked Floors Map */}
      <div className="relative py-2">
        <div className="flex flex-col-reverse gap-1">
          {floors.map((floor, floorIdx) => (
            <FloorCard key={floor.floorId} floor={floor} isTop={floorIdx === floors.length - 1} />
          ))}
        </div>
      </div>
      
      {/* Top 3 Time Zones */}
      <div className="space-y-1.5">
        <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {t(language, 'property_map.top_zones')}
        </h5>
        <div className="space-y-1">
          {topTimeZones.map((zone, idx) => {
            const ZoneIcon = getAreaIcon(zone.type);
            return (
              <div
                key={zone.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md border transition-colors cursor-pointer hover:bg-muted/50",
                  getHeatColor(zone.minutesTotal)
                )}
              >
                <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                <ZoneIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-medium flex-1 truncate">{zone.label}</span>
                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold">{zone.minutesTotal}m</span>
                  {zone.minutesOps > 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1">
                      (+{zone.minutesOps})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Ops Extra Badge */}
      {opsExtraMinutesTotal > 0 && (
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {t(language, 'property_map.ops_extra')}
            </span>
          </div>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
            +{opsExtraMinutesTotal} min
          </span>
        </div>
      )}

      {/* Distribution Estimated Badge */}
      {layoutModel.isDistributionEstimated && !layoutModel.validation.matchesSidebar && (
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/50 border border-dashed border-border/50">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground opacity-60">ⓘ</span>
            <span className="text-xs text-muted-foreground">
              {t(language, 'property_map.distribution_estimated')}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/70">
            {t(language, 'property_map.distribution_hint')}
          </span>
        </div>
      )}
      
      {/* Collapse Button */}
      <button
        onClick={onCollapse}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <ChevronUp className="h-3 w-3" />
        <span>{t(language, 'property_map.collapse')}</span>
      </button>
    </div>
  );
}

// ============= FLOOR CARD (2.5D) =============

function FloorCard({ floor, isTop }: { floor: LayoutFloor; isTop: boolean }) {
  const maxAreas = 6;
  const visibleAreas = floor.areas.slice(0, maxAreas);
  const hasMore = floor.areas.length > maxAreas;
  
  return (
    <div
      className={cn(
        "relative rounded-lg border-2 p-2 transition-all",
        isTop 
          ? "bg-background border-border shadow-md" 
          : "bg-muted/40 border-border/60",
        !isTop && "transform translate-y-1"
      )}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Floor Label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {floor.label}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          {floor.minutesTotal}m total
        </span>
      </div>
      
      {/* Area Blocks */}
      <div className="flex flex-wrap gap-1">
        {visibleAreas.map((area) => (
          <AreaBlock key={area.id} area={area} />
        ))}
        {hasMore && (
          <div className="flex items-center justify-center px-2 py-1 rounded text-[10px] text-muted-foreground bg-muted/50">
            +{floor.areas.length - maxAreas} more
          </div>
        )}
      </div>
    </div>
  );
}

// ============= AREA BLOCK =============

function AreaBlock({ area }: { area: LayoutArea }) {
  const Icon = getAreaIcon(area.type);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Calculate width based on relative time
  const widthClass = area.minutesTotal > 40 
    ? 'flex-1 min-w-[80px]' 
    : area.minutesTotal > 20 
      ? 'w-[70px]' 
      : 'w-[55px]';
  
  return (
    <div
      className={cn(
        "relative group cursor-pointer rounded-md border p-1.5 transition-all hover:shadow-sm",
        getHeatColor(area.minutesTotal),
        widthClass
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 shrink-0 opacity-70" />
        <span className="text-[10px] font-medium truncate">
          {area.subType || area.type}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {area.minutesTotal}m
        {area.minutesOps > 0 && (
          <span className="text-amber-600 dark:text-amber-400 ml-0.5">
            (+{area.minutesOps})
          </span>
        )}
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 p-2 rounded-md bg-popover border border-border shadow-lg min-w-[140px] animate-scale-in">
          <p className="text-xs font-semibold mb-1">{area.label}</p>
          <div className="space-y-0.5 text-[10px] text-muted-foreground">
            <p>Base: {area.minutesBase}m</p>
            {area.minutesOps > 0 && <p>Ops: +{area.minutesOps}m</p>}
            <p className="font-medium text-foreground">Total: {area.minutesTotal}m</p>
          </div>
          {area.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1 pt-1 border-t border-border">
              {area.tags.map((tag, idx) => (
                <span key={idx} className="text-[9px] px-1 py-0.5 rounded bg-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PropertyLogisticsMapTeaser;
