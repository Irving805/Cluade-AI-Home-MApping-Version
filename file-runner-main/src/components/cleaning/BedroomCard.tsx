import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Bed, Crown, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { RoomFloorType, BedroomConfig, BedroomHazards } from '@/contexts/BookingContext';
import { RoomWindowSelection } from '@/lib/roomWindowConfig';
import { FloorTypeSelector } from './FloorTypeSelector';
import { SurfaceNotesInput } from './SurfaceNotesInput';
import { BedroomProfileSelector, BedroomProfile } from './BedroomProfileSelector';
import { BedroomAddonsCompact, BedroomAddonCounts } from './BedroomAddonsCompact';
import { RoomWindowSectionCompact } from './RoomWindowSectionCompact';
import { BedroomsHazardSection, defaultBedroomHazards } from './BedroomsHazardSection';
import { CeilingHeightSelector } from './CeilingHeightSelector';
import { ResidentialCeilingHeight } from '@/lib/ceilingHeightTypes';
import { FloorLocationSelector } from './FloorLocationSelector';

interface BedroomCardProps {
  bedroomIndex: number; // 0 = Master, 1+ = Standard bedrooms
  isSkipped: boolean;
  isDeep: boolean;
  isMoveOut?: boolean;
  language: Language;
  // NEW: Allow bed_0 skip in Partial Empty moving mode
  isPartialEmptyMoving?: boolean;
  onToggle: (bedroomId: string) => void;
  creditAmount: number;
  creditMinutes: number;
  // Floor type props (MOVING mode)
  floorType?: RoomFloorType;
  onFloorTypeChange?: (bedroomId: string, type: RoomFloorType) => void;
  showFloorSelector?: boolean;
  // Surface Notes props (replaces Floor Focus)
  surfaceNotes?: string;
  onSurfaceNotesChange?: (bedroomId: string, notes: string) => void;
  showSurfaceNotes?: boolean;
  // Bedroom Profile props
  bedroomProfile?: BedroomProfile;
  onBedroomProfileChange?: (bedroomId: string, profile: BedroomProfile) => void;
  showBedroomProfile?: boolean;
  // Per-bedroom add-ons props
  bedroomAddons?: BedroomAddonCounts;
  onBedroomAddonsChange?: (bedroomId: string, addons: BedroomAddonCounts) => void;
  showBedroomAddons?: boolean;
  // Lifestyle addons (Fresh Sheets, Organization) - only for "I live here" Deep/Basic
  showLifestyleAddons?: boolean;
  // Window section props
  showWindowSection?: boolean;
  roomWindowSelection?: RoomWindowSelection;
  onRoomWindowUpdate?: (bedroomId: string, updates: Partial<RoomWindowSelection>) => void;
  tracksIncludedByDefault?: boolean; // For Deep/Move flows
  // Included windows props for Deep/Move flows
  includedWindowsEnabled?: boolean;
  includedWindowsLimit?: number;
  // Floor location props (multi-floor properties)
  floorLocation?: number;
  onFloorLocationChange?: (bedroomId: string, floor: number) => void;
  maxFloors?: number;
  // Bedroom hazards props (Deep/Move flows) - NEW
  showBedroomHazards?: boolean;
  bedroomHazards?: BedroomHazards;
  onBedroomHazardsChange?: (bedroomId: string, hazards: BedroomHazards) => void;
  // Ceiling height props (Detailed Home Mapping)
  ceilingHeight?: ResidentialCeilingHeight | null;
  onCeilingHeightChange?: (bedroomId: string, height: ResidentialCeilingHeight) => void;
  showCeilingSelector?: boolean;
}

export function BedroomCard({
  bedroomIndex,
  isSkipped,
  isDeep,
  isMoveOut = false,
  language,
  isPartialEmptyMoving = false,
  onToggle,
  creditAmount,
  creditMinutes,
  floorType,
  onFloorTypeChange,
  showFloorSelector = false,
  surfaceNotes = '',
  onSurfaceNotesChange,
  showSurfaceNotes = false,
  bedroomProfile = 'standard',
  onBedroomProfileChange,
  showBedroomProfile = false,
  bedroomAddons = { ceilingFans: 0, lightFixtures: 0, closetCabinets: 0, freshSheets: 0, organizationHours: 0 },
  onBedroomAddonsChange,
  showBedroomAddons = false,
  showLifestyleAddons = false,
  showWindowSection = false,
  roomWindowSelection,
  onRoomWindowUpdate,
  tracksIncludedByDefault = false,
  includedWindowsEnabled = false,
  includedWindowsLimit = 2, // Bedrooms: 2 windows included by default
  floorLocation,
  onFloorLocationChange,
  maxFloors = 1,
  // Bedroom hazards props - NEW
  showBedroomHazards = false,
  bedroomHazards = defaultBedroomHazards,
  onBedroomHazardsChange,
  // Ceiling height props
  ceilingHeight = null,
  onCeilingHeightChange,
  showCeilingSelector = false,
}: BedroomCardProps) {
  const isFirstBedroom = bedroomIndex === 0;
  const bedroomId = `bed_${bedroomIndex}`;
  
  // Allow skipping bed_0 ONLY in Partial Empty moving mode
  // Otherwise, first bedroom cannot be skipped (always required)
  const canSkip = isPartialEmptyMoving ? true : !isFirstBedroom;
  
  // Dynamic label based on profile - no more hardcoded "Master"
  const getLabel = () => {
    // Use profile name if set and not standard
    if (bedroomProfile && bedroomProfile !== 'standard') {
      return t(language, `bedroom.profile_${bedroomProfile}`);
    }
    // Fallback to "Bedroom N"
    return `${t(language, 'bedroom.standard')} ${bedroomIndex + 1}`;
  };

  const label = getLabel();

  // Check if bedroom has any customizations
  const hasCustomizations = 
    (bedroomAddons?.ceilingFans || 0) > 0 || 
    (bedroomAddons?.lightFixtures || 0) > 0 ||
    (surfaceNotes && surfaceNotes.trim().length > 0);

  // Visual styling based on profile
  const isPrimaryStyle = isFirstBedroom && ['master', 'primary', 'studio_living'].includes(bedroomProfile);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border-2 transition-all duration-200",
        isSkipped
          ? "border-dashed border-muted-foreground/30 bg-muted/30 opacity-60"
          : isPrimaryStyle
            ? "border-amber-400 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10"
            : hasCustomizations
              ? "border-primary/40 bg-gradient-to-br from-primary/[0.03] to-primary/[0.08]"
              : "border-primary/30 bg-primary/5 dark:bg-primary/10"
      )}
    >
      {/* Main row */}
      <div className="flex items-center justify-between p-3 sm:p-4 min-w-0">
        {/* Left: Icon, Label, Status */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0",
            isSkipped 
              ? "bg-muted/50" 
              : isPrimaryStyle 
                ? "bg-amber-100 dark:bg-amber-900/30" 
                : "bg-primary/10"
          )}>
            {isPrimaryStyle ? (
              <Crown className={cn(
                "w-5 h-5",
                isSkipped ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400"
              )} />
            ) : (
              <Bed className={cn(
                "w-5 h-5",
                isSkipped ? "text-muted-foreground" : "text-primary"
              )} />
            )}
          </div>
          
            <div className="flex flex-col min-w-0 flex-1">
            {/* Title row */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn(
                "text-sm font-semibold whitespace-nowrap flex-shrink-0",
                isSkipped ? "line-through text-muted-foreground" : "text-foreground"
              )}>
                {label}
              </span>
            </div>
            
            {/* Floor pills row - matches CoreSpaceCardCompact pattern */}
            {maxFloors >= 1 && onFloorLocationChange && !isSkipped && (
              <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden mt-0.5">
                <FloorLocationSelector
                  language={language}
                  value={floorLocation ?? null}
                  onChange={(floor) => onFloorLocationChange(bedroomId, floor)}
                  maxFloors={maxFloors}
                  inline
                  showRequired
                />
              </div>
            )}
            {isSkipped ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                −${creditAmount} · {creditMinutes} {t(language, 'bedroom.min_saved')}
              </span>
            ) : isFirstBedroom ? (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {t(language, 'bedroom.always_included')}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t(language, 'bedroom.included')}
              </span>
            )}
          </div>
        </div>

        {/* Right: Toggle or Lock indicator */}
        <div className="flex items-center gap-2">
          {canSkip ? (
            <>
              {isSkipped && (
                <span className="text-xs font-bold text-muted-foreground uppercase bg-muted/50 px-2 py-0.5 rounded">
                  {t(language, 'bedroom.skipped')}
                </span>
              )}
              <Switch
                checked={!isSkipped}
                onCheckedChange={() => onToggle(bedroomId)}
                aria-label={isSkipped ? t(language, 'bedroom.include') : t(language, 'bedroom.skip')}
              />
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Check className="w-4 h-4" />
              <span className="font-medium">{t(language, 'bedroom.required')}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Expandable Content - Only visible when not skipped */}
      {!isSkipped && (
        <div className="px-3 pb-3 pt-0 border-t border-border/30 space-y-2">
          {/* Bedroom Profile Selector - available for all bedrooms */}
          {showBedroomProfile && onBedroomProfileChange && (
            <BedroomProfileSelector
              value={bedroomProfile}
              onChange={(profile) => onBedroomProfileChange(bedroomId, profile)}
              language={language}
              compact
              isFirstBedroom={isFirstBedroom}
            />
          )}
          
          {/* Floor Type Selector */}
          {showFloorSelector && floorType && onFloorTypeChange && (
            <FloorTypeSelector
              value={floorType}
              onChange={(type) => onFloorTypeChange(bedroomId, type)}
              language={language}
              compact
            />
          )}
          
          {/* Ceiling Height Selector - Detailed Home Mapping */}
          {showCeilingSelector && onCeilingHeightChange && (
            <CeilingHeightSelector
              language={language}
              value={ceilingHeight}
              onChange={(height) => onCeilingHeightChange(bedroomId, height)}
            />
          )}
          
          {/* Floor Location Selector moved to header row */}
          
          {/* Surface Notes Input (replaces Floor Focus) */}
          {showSurfaceNotes && onSurfaceNotesChange && (
            <SurfaceNotesInput
              roomId={bedroomId}
              value={surfaceNotes}
              onChange={(notes) => onSurfaceNotesChange(bedroomId, notes)}
              language={language}
              compact
            />
          )}
          
          {/* Per-Bedroom Add-ons (Ceiling Fans, Light Fixtures, Closet Interiors, Fresh Sheets, Organization) */}
          {showBedroomAddons && onBedroomAddonsChange && (
            <BedroomAddonsCompact
              roomId={bedroomId}
              value={bedroomAddons}
              onChange={(addons) => onBedroomAddonsChange(bedroomId, addons)}
              language={language}
              compact
              isClosetIncluded={isDeep || isMoveOut}
              showLifestyleAddons={showLifestyleAddons}
            />
          )}
          
          {/* Closet Doors Included Indicator - Deep/Move flows */}
          {(isDeep || isMoveOut) && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-800/30">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                  {t(language, 'bedroom.closet_doors_included')}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {t(language, 'bedroom.closet_doors_desc')}
                </span>
              </div>
            </div>
          )}
          
          {/* Window Section */}
          {showWindowSection && onRoomWindowUpdate && (
            <RoomWindowSectionCompact
              roomId={bedroomId}
              roomType={isFirstBedroom ? 'master_bedroom' : 'bedroom'}
              roomLabel={label}
              language={language}
              roomWindowSelection={roomWindowSelection}
              onUpdate={(updates) => onRoomWindowUpdate(bedroomId, updates)}
              showSillsTracks={isMoveOut}
              tracksIncludedByDefault={tracksIncludedByDefault}
              includedWindowsEnabled={includedWindowsEnabled}
              includedWindowsLimit={includedWindowsLimit}
            />
          )}
          
          {/* Bedroom Hazards Section (Deep/Move flows) - NEW */}
          {showBedroomHazards && onBedroomHazardsChange && (
            <BedroomsHazardSection
              roomId={bedroomId}
              roomLabel={label}
              language={language}
              hazards={bedroomHazards}
              onHazardsChange={(hazards) => onBedroomHazardsChange(bedroomId, hazards)}
              isMoveOut={isMoveOut}
              floorType={floorType}
            />
          )}
        </div>
      )}
    </div>
  );
}
