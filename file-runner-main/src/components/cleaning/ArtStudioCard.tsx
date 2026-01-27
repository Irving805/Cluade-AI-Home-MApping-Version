import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Palette, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { RoomFloorType } from '@/contexts/BookingContext';
import { FloorTypeSelector } from './FloorTypeSelector';
import { FloorLocationSelector } from './FloorLocationSelector';
import { AreaHazardSection } from './AreaHazardSection';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useState, useMemo } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { calculateArtStudioPrice } from '@/lib/pricing_v2';

// Art Studio configuration types
export type StudioType = 'art_studio' | 'home_office' | 'workshop' | 'adu';
export type SurfaceSensitivity = 'standard' | 'delicate';
export type StructureAttachment = 'attached' | 'detached';

export interface ArtStudioConfig {
  id: string;
  studioType: StudioType;
  hasBathroom: boolean;
  floorType: RoomFloorType;
  surfaceSensitivity: SurfaceSensitivity;
  attachment: StructureAttachment;
  floorLocation: number;
  specialNotes: string;
  messTypes: string[];
  trashBags: number;
  stickySpills: boolean;
}

export const defaultArtStudioConfig = (index: number): ArtStudioConfig => ({
  id: `art_studio_${index}`,
  studioType: 'art_studio',
  hasBathroom: false,
  floorType: 'hardwood_tile',
  surfaceSensitivity: 'standard',
  attachment: 'attached',
  floorLocation: 1,
  specialNotes: '',
  messTypes: [],
  trashBags: 0,
  stickySpills: false,
});

interface ArtStudioCardProps {
  index: number;
  isDeep: boolean;
  language: Language;
  config: ArtStudioConfig;
  onConfigChange: (config: Partial<ArtStudioConfig>) => void;
  showFloorSelector?: boolean;
  maxFloors?: number;
  showAreaHazards?: boolean;
}

export function ArtStudioCard({
  index,
  isDeep,
  language,
  config,
  onConfigChange,
  showFloorSelector = true,
  maxFloors = 1,
  showAreaHazards = false,
}: ArtStudioCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const getStudioLabel = () => {
    const typeLabels: Record<StudioType, string> = {
      art_studio: 'Art Studio',
      home_office: 'Home Office',
      workshop: 'Workshop',
      adu: 'ADU',
    };
    return typeLabels[config.studioType];
  };
  
  const label = `${getStudioLabel()} ${index + 1}`;
  
  // Calculate dynamic price based on configuration
  const dynamicPrice = useMemo(() => 
    calculateArtStudioPrice(config, isDeep), 
    [config, isDeep]
  );
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-xl border-2 transition-all duration-200",
        config.surfaceSensitivity === 'delicate'
          ? "border-orange-300/70 bg-gradient-to-br from-orange-50/80 to-orange-100/30 dark:from-orange-900/20 dark:to-orange-800/10 dark:border-orange-700/50"
          : "border-blue-300/70 bg-gradient-to-br from-blue-50/80 to-blue-100/30 dark:from-blue-900/20 dark:to-blue-800/10 dark:border-blue-700/50"
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between p-4 transition-colors rounded-t-xl",
              config.surfaceSensitivity === 'delicate' 
                ? "hover:bg-orange-100/30 dark:hover:bg-orange-900/20"
                : "hover:bg-blue-100/30 dark:hover:bg-blue-900/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                config.surfaceSensitivity === 'delicate'
                  ? "bg-orange-100 dark:bg-orange-900/30"
                  : "bg-blue-100 dark:bg-blue-900/30"
              )}>
                <span className="text-xl">🎨</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                  {label}
                  {config.surfaceSensitivity === 'delicate' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-200/70 text-orange-700 dark:bg-orange-800/50 dark:text-orange-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Delicate
                    </span>
                  )}
                  {config.attachment === 'detached' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-200/70 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300">
                      +10min
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {config.hasBathroom ? 'Has bathroom' : 'No bathroom'} • {
                    config.attachment === 'attached' ? 'Attached' : 'Detached'
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-medium",
                config.surfaceSensitivity === 'delicate' ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
              )}>
                ${dynamicPrice}
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className={cn(
            "px-4 pb-4 pt-0 border-t space-y-4",
            config.surfaceSensitivity === 'delicate'
              ? "border-orange-200/50 dark:border-orange-700/50"
              : "border-blue-200/50 dark:border-blue-700/50"
          )}>
            {/* Studio Type Selection */}
            <div className="space-y-2 pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t(language, 'structure.studio_type')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'art_studio' as const, label: 'Art Studio', icon: '🎨' },
                  { value: 'home_office' as const, label: 'Home Office', icon: '💼' },
                  { value: 'workshop' as const, label: 'Workshop', icon: '🔧' },
                  { value: 'adu' as const, label: 'ADU', icon: '🏠' },
                ].map((option) => {
                  const isSelected = config.studioType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onConfigChange({ studioType: option.value })}
                      className={cn(
                        "py-2 px-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-2",
                        isSelected
                          ? "border-blue-500 bg-blue-100/50 dark:bg-blue-900/30"
                          : "border-border bg-background hover:border-blue-300"
                      )}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <div className="text-xs font-medium text-foreground">{option.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Has Bathroom Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚿</span>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {t(language, 'structure.has_bathroom')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Adds bathroom cleaning</p>
                </div>
              </div>
              <Switch
                checked={config.hasBathroom}
                onCheckedChange={(checked) => onConfigChange({ hasBathroom: checked })}
              />
            </div>
            
            {/* Floor Type */}
            {showFloorSelector && (
              <FloorTypeSelector
                value={config.floorType}
                onChange={(type) => onConfigChange({ floorType: type })}
                language={language}
                compact
              />
            )}
            
            {/* Surface Sensitivity */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t(language, 'structure.surface_sensitivity')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'standard' as const, label: 'Standard', desc: 'Regular cleaning safe' },
                  { value: 'delicate' as const, label: 'Delicate ⚠️', desc: 'Do Not Touch areas' },
                ].map((option) => {
                  const isSelected = config.surfaceSensitivity === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onConfigChange({ surfaceSensitivity: option.value })}
                      className={cn(
                        "py-2 px-3 rounded-lg border-2 text-left transition-all duration-200",
                        isSelected
                          ? option.value === 'delicate'
                            ? "border-orange-500 bg-orange-100/50 dark:bg-orange-900/30"
                            : "border-blue-500 bg-blue-100/50 dark:bg-blue-900/30"
                          : "border-border bg-background hover:border-blue-300"
                      )}
                    >
                      <div className="text-xs font-medium text-foreground">{option.label}</div>
                      <div className="text-[10px] text-muted-foreground">{option.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Attachment Type */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t(language, 'structure.attachment_type')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'attached' as const, label: 'Attached', desc: 'Connected to main house' },
                  { value: 'detached' as const, label: 'Detached', desc: '+10 min transit time' },
                ].map((option) => {
                  const isSelected = config.attachment === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onConfigChange({ attachment: option.value })}
                      className={cn(
                        "py-2 px-3 rounded-lg border-2 text-left transition-all duration-200",
                        isSelected
                          ? "border-blue-500 bg-blue-100/50 dark:bg-blue-900/30"
                          : "border-border bg-background hover:border-blue-300"
                      )}
                    >
                      <div className="text-xs font-medium text-foreground">{option.label}</div>
                      <div className="text-[10px] text-muted-foreground">{option.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Floor Location (if multi-level) */}
            {maxFloors >= 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t(language, 'structure.floor_location')}
                </p>
                <FloorLocationSelector
                  language={language}
                  value={config.floorLocation}
                  onChange={(floor) => onConfigChange({ floorLocation: floor })}
                  maxFloors={maxFloors}
                />
              </div>
            )}
            
            {/* Special Notes */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t(language, 'structure.special_notes')}
              </p>
              <Textarea
                value={config.specialNotes}
                onChange={(e) => onConfigChange({ specialNotes: e.target.value })}
                placeholder={t(language, 'structure.special_notes_placeholder')}
                className="min-h-[60px] text-xs resize-none"
                maxLength={200}
              />
            </div>
            
            {/* Area Hazards (Deep/Move flows) */}
            {showAreaHazards && (
              <AreaHazardSection
                roomId={config.id}
                roomLabel={label}
                language={language}
                messTypes={config.messTypes}
                onMessTypesChange={(types) => onConfigChange({ messTypes: types })}
                trashBags={config.trashBags}
                onTrashBagsChange={(count) => onConfigChange({ trashBags: count })}
                hasStickySpills={config.stickySpills}
                onStickySpillsChange={(value) => onConfigChange({ stickySpills: value })}
              />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
