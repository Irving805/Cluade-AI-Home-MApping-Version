import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Building2, Info } from 'lucide-react';
import { Counter } from './Counter';
import { GuestHouseCard, GuestHouseConfig, defaultGuestHouseConfig } from './GuestHouseCard';
import { ArtStudioCard, ArtStudioConfig, defaultArtStudioConfig } from './ArtStudioCard';
import { useEffect } from 'react';

interface AdditionalStructuresSectionProps {
  language: Language;
  isDeep: boolean;
  isMoveOut?: boolean;
  // Counts
  guestHouseCount: number;
  studioCount: number;
  poolHouseCount: number;
  // Count change handlers
  onGuestHouseCountChange: (count: number) => void;
  onStudioCountChange: (count: number) => void;
  onPoolHouseCountChange: (count: number) => void;
  // Configurations
  guestHouseConfigs: Record<string, GuestHouseConfig>;
  artStudioConfigs: Record<string, ArtStudioConfig>;
  // Config change handlers
  onGuestHouseConfigChange: (id: string, config: Partial<GuestHouseConfig>) => void;
  onArtStudioConfigChange: (id: string, config: Partial<ArtStudioConfig>) => void;
  // Floor props
  maxFloors?: number;
  showAreaHazards?: boolean;
}

export function AdditionalStructuresSection({
  language,
  isDeep,
  isMoveOut = false,
  guestHouseCount,
  studioCount,
  poolHouseCount,
  onGuestHouseCountChange,
  onStudioCountChange,
  onPoolHouseCountChange,
  guestHouseConfigs,
  artStudioConfigs,
  onGuestHouseConfigChange,
  onArtStudioConfigChange,
  maxFloors = 1,
  showAreaHazards = false,
}: AdditionalStructuresSectionProps) {
  
  const hasAnyStructures = guestHouseCount > 0 || studioCount > 0 || poolHouseCount > 0;
  
  // Get config for a guest house, creating default if missing
  const getGuestHouseConfig = (index: number): GuestHouseConfig => {
    const id = `guest_house_${index}`;
    return guestHouseConfigs[id] || defaultGuestHouseConfig(index);
  };
  
  // Get config for an art studio, creating default if missing
  const getArtStudioConfig = (index: number): ArtStudioConfig => {
    const id = `art_studio_${index}`;
    return artStudioConfigs[id] || defaultArtStudioConfig(index);
  };
  
  return (
    <div className="bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-5 sm:p-6 lg:p-8 space-y-5 border border-slate-200 dark:border-slate-700">
      {/* Section Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100/80 dark:bg-amber-900/30 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-sm font-bold uppercase tracking-wide text-foreground">
            {t(language, 'structure.additional_structures_title')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(language, 'structure.additional_structures_hint')}
        </p>
      </div>
      
      {/* Structure Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Guest House Counter */}
        <div className="flex items-center justify-between p-3 rounded-xl border-2 border-amber-200/50 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-700/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏡</span>
            <div>
              <p className="text-sm font-medium text-foreground">{t(language, 'structure.guest_house')}</p>
              <p className="text-[10px] text-muted-foreground">1BR/1BA, kitchenette</p>
            </div>
          </div>
          <Counter
            label="Guest House"
            value={guestHouseCount}
            min={0}
            max={3}
            onChange={onGuestHouseCountChange}
            compact
          />
        </div>
        
        {/* Art Studio / ADU Counter */}
        <div className="flex items-center justify-between p-3 rounded-xl border-2 border-blue-200/50 bg-blue-50/30 dark:bg-blue-900/10 dark:border-blue-700/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <p className="text-sm font-medium text-foreground">{t(language, 'structure.art_studio')}</p>
              <p className="text-[10px] text-muted-foreground">Workshop, office, studio</p>
            </div>
          </div>
          <Counter
            label="Art Studio"
            value={studioCount}
            min={0}
            max={3}
            onChange={onStudioCountChange}
            compact
          />
        </div>
      </div>
      
      {/* Pool House Counter (shows if guest house or studio selected) */}
      {(guestHouseCount > 0 || studioCount > 0) && (
        <div className="flex items-center justify-between p-3 rounded-xl border-2 border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-700/50 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏊</span>
            <div>
              <p className="text-sm font-medium text-foreground">{t(language, 'structure.pool_house')}</p>
              <p className="text-[10px] text-muted-foreground">Outdoor entertaining space</p>
            </div>
          </div>
          <Counter
            label="Pool House"
            value={poolHouseCount}
            min={0}
            max={2}
            onChange={onPoolHouseCountChange}
            compact
          />
        </div>
      )}
      
      {/* Pricing Note */}
      {hasAnyStructures && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-900/20 dark:to-emerald-900/20 border border-amber-200/50 dark:border-amber-700/50 animate-fade-in">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            {t(language, 'structure.pricing_note')}
          </p>
        </div>
      )}
      
      {/* Detailed Mapping Cards - Guest Houses */}
      {guestHouseCount > 0 && (
        <div className="space-y-3 pt-2 border-t border-border/50 animate-fade-in">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {t(language, 'structure.guest_house_mapping')}
          </p>
          {Array.from({ length: guestHouseCount }, (_, i) => (
            <GuestHouseCard
              key={`guest_house_${i}`}
              index={i}
              isDeep={isDeep}
              language={language}
              config={getGuestHouseConfig(i)}
              onConfigChange={(updates) => onGuestHouseConfigChange(`guest_house_${i}`, updates)}
              showFloorSelector={true}
              maxFloors={maxFloors}
              showWindowSection={true}
              showAreaHazards={showAreaHazards}
            />
          ))}
        </div>
      )}
      
      {/* Detailed Mapping Cards - Art Studios */}
      {studioCount > 0 && (
        <div className="space-y-3 pt-2 border-t border-border/50 animate-fade-in">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {t(language, 'structure.studio_mapping')}
          </p>
          {Array.from({ length: studioCount }, (_, i) => (
            <ArtStudioCard
              key={`art_studio_${i}`}
              index={i}
              isDeep={isDeep}
              language={language}
              config={getArtStudioConfig(i)}
              onConfigChange={(updates) => onArtStudioConfigChange(`art_studio_${i}`, updates)}
              showFloorSelector={true}
              maxFloors={maxFloors}
              showAreaHazards={showAreaHazards}
            />
          ))}
        </div>
      )}
    </div>
  );
}
