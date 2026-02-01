import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { HomeEntryConfig, EntryPathType, EntryZoneStyle, EntryZoneFloor } from '@/contexts/BookingContext';
import { CheckCircle2, Home, Sparkles, Footprints, DoorOpen, Fence, CircleSlash, Route, DoorClosed, Landmark, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface HomeEntrySectionProps {
  language: Language;
  situation: 'LIVE_HERE' | 'MOVING' | null;
  homeEntry: HomeEntryConfig;
  onChange: (updates: Partial<HomeEntryConfig>) => void;
}

// Included tasks (always shown)
const INCLUDED_TASKS = [
  'homeEntry.included.frontDoor.item1',
  'homeEntry.included.frontDoor.item2',
  'homeEntry.included.frontDoor.item3',
  'homeEntry.included.frontDoor.item4',
];

// Entry path options with icons (now shown for ALL property types)
const ENTRY_PATH_TYPES: { value: EntryPathType; labelKey: string; icon: LucideIcon }[] = [
  { value: 'STEPS', labelKey: 'homeEntry.sfh.entryPath.steps', icon: Footprints },
  { value: 'PORCH', labelKey: 'homeEntry.sfh.entryPath.porch', icon: DoorOpen },
  { value: 'SIDE_GATE', labelKey: 'homeEntry.sfh.entryPath.sideGate', icon: Fence },
  { value: 'NONE', labelKey: 'homeEntry.sfh.entryPath.none', icon: CircleSlash },
  { value: 'OTHER', labelKey: 'homeEntry.sfh.entryPath.other', icon: Route },
];

// Entry Zone Style options with icons (absorbed from Entryway/Foyer)
const ENTRY_ZONE_STYLES: { value: EntryZoneStyle; labelKey: string; icon: LucideIcon }[] = [
  { value: 'standard_entry', labelKey: 'homeEntry.entryZone.style.standard', icon: DoorClosed },
  { value: 'formal_foyer', labelKey: 'homeEntry.entryZone.style.formal', icon: Landmark },
  { value: 'combined_living_entry', labelKey: 'homeEntry.entryZone.style.combined', icon: LayoutGrid },
];

// Entry Zone Floor options
const ENTRY_ZONE_FLOORS: { value: EntryZoneFloor; labelKey: string }[] = [
  { value: 'hardwood_tile', labelKey: 'homeEntry.entryZone.floor.hardwood' },
  { value: 'carpet', labelKey: 'homeEntry.entryZone.floor.carpet' },
  { value: 'stone', labelKey: 'homeEntry.entryZone.floor.stone' },
];

/**
 * HomeEntrySection - Simplified content-only component for Home Entry configuration
 * The Collapsible wrapper and header live in UnifiedSpacesSection.tsx
 * 
 * SIMPLIFIED: Removed Property Type, Access Method, Multi-unit fields, Shoes Policy, Moving Notes
 * KEPT: Included tasks, Arrival Instructions, Parking Notes, Entry Path Type
 */
export function HomeEntrySection({
  language,
  homeEntry,
  onChange,
}: HomeEntrySectionProps) {
  return (
    <div className="px-3 pb-4 space-y-4 border-t border-border/50">
      
      {/* === INCLUDED (FREE) BLOCK === */}
      <div className="mt-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
            {t(language, 'homeEntry.included.frontDoor.title')}
          </span>
        </div>
        <ul className="space-y-1.5">
          {INCLUDED_TASKS.map((key, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span>{t(language, key)}</span>
            </li>
          ))}
        </ul>
      </div>
      
        {/* Textareas removed per Strategy A - structured mapping only */}
      
      {/* === ENTRY PATH TYPE (shown for all property types) === */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {t(language, 'homeEntry.sfh.entryPath.label')}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ENTRY_PATH_TYPES.map(path => (
            <button
              key={path.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ entryPathType: path.value });
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                homeEntry.entryPathType === path.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <path.icon className="w-3.5 h-3.5" />
              {t(language, path.labelKey)}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {t(language, 'homeEntry.sfh.entryPath.helper')}
        </p>
      </div>
      
      {/* === ENTRY ZONE DETAILS (FREE - absorbed from Entryway/Foyer) === */}
      <div className="mt-4 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30">
        <div className="flex items-center gap-2 mb-3">
          <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
            {t(language, 'homeEntry.entryZone.title')}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
            <Sparkles className="w-3 h-3" />
            {t(language, 'homeEntry.entryZone.included')}
          </span>
        </div>
        
        {/* Entry Zone Style */}
        <div className="space-y-1.5 mb-3">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {t(language, 'homeEntry.entryZone.style.label')}
          </label>
        <div className="flex flex-wrap gap-1.5">
            {ENTRY_ZONE_STYLES.map(style => (
              <button
                key={style.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ entryZoneStyle: style.value });
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                  homeEntry.entryZoneStyle === style.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <style.icon className="w-3.5 h-3.5" />
                {t(language, style.labelKey)}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {t(language, 'homeEntry.entryZone.style.helper')}
          </p>
        </div>
        
        {/* Entry Zone Floor */}
        <div className="space-y-1.5 mb-3">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {t(language, 'homeEntry.entryZone.floor.label')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ENTRY_ZONE_FLOORS.map(floor => (
              <button
                key={floor.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ entryZoneFloor: floor.value });
                }}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                  homeEntry.entryZoneFloor === floor.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {t(language, floor.labelKey)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Entry Zone Toggles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-foreground/80">
              {t(language, 'homeEntry.entryZone.rugMat')}
            </label>
            <Switch
              checked={homeEntry.hasEntryRugMat}
              onCheckedChange={(checked) => onChange({ hasEntryRugMat: checked })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs text-foreground/80">
              {t(language, 'homeEntry.entryZone.coatCloset')}
            </label>
            <Switch
              checked={homeEntry.hasCoatCloset}
              onCheckedChange={(checked) => onChange({ hasCoatCloset: checked })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs text-foreground/80">
              {t(language, 'homeEntry.entryZone.glassAtEntry')}
            </label>
            <Switch
              checked={homeEntry.hasGlassAtEntry}
              onCheckedChange={(checked) => onChange({ hasGlassAtEntry: checked })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
