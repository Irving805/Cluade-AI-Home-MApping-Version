/**
 * Sidebar Field Contract — Single Source of Truth
 * 
 * This module defines the complete data contract between Detailed Home Mapping
 * and the "Your Cleaning Total" sidebar. Every field in the mapping MUST have
 * a corresponding entry here to be displayed in the sidebar.
 * 
 * PRINCIPLE: Detailed Home Mapping is the SOURCE OF TRUTH.
 *            Your Cleaning Total is a DERIVED, READ-ONLY VIEW of that truth.
 */

import { BookingFormData, Situation, HomeEntryConfig, StairsConfig, HallwayConfig, BedroomConfig, BedroomHazards } from '@/contexts/BookingContext';
import { HOME_MAPPING_REGISTRY, getVisibleAreas, AreaGatingContext, ServiceAreaKey } from './homeMappingRegistry';
import { Language, t } from './translations';
import {
  calcHallwaySummary, 
  HALLWAY_SIZE_LABOR,
  HALLWAY_HAZARD_TIMES,
} from './pricing_hallways';
import {
  getStairHazardBuffer,
  getBedroomHazardBuffer,
  getDiningHazardBuffer,
  getLivingHazardBuffer,
  FLOOR_TYPE_LABOR_MULTIPLIER,
  STAIR_HAZARD_TIMES,
  BEDROOM_HAZARD_TIMES,
  calcFreshSheetsTotals,
  calcOrganizationTotals,
  FRESH_SHEETS_RATE,
  ORGANIZATION_RATE,
} from './pricing_v2';
import { addonPrices, ADDON_TIMES } from './pricing';
import { calculateKitchenAddonsTotal, CabinetSizeOverride, DegreaseLevel } from './pricing_kitchen';

// ============= TYPE DEFINITIONS =============

export type FieldType = 'text' | 'select' | 'toggle' | 'number' | 'counter' | 'array' | 'object' | 'computed';

export interface FieldContract {
  key: string;                      // Field key in BookingFormData path
  type: FieldType;
  defaultValue: string | number | boolean | null | any[] | Record<string, any>;
  affectsPrice: boolean;
  affectsTime: boolean;
  affectsLogistics: boolean;
  display: boolean;                 // Should show in sidebar
  labelKey: string;                 // Translation key for label
  formatFn?: (value: any, language: Language, formData?: BookingFormData) => string;
  requiredForComplete?: boolean;    // Is this field required for "Configured" status
  priceImpactFn?: (value: any, formData: BookingFormData, isDeep: boolean) => number;
  timeImpactFn?: (value: any, formData: BookingFormData, isDeep: boolean) => number;
}

export interface AreaContract {
  areaKey: ServiceAreaKey;
  order: number;
  emoji: string;
  labelKey: string;
  fields: FieldContract[];
}

export type AreaStatus = 'configured' | 'incomplete' | 'default_only';

export interface AreaStatusResult {
  status: AreaStatus;
  configuredCount: number;
  requiredCount: number;
  totalFields: number;
  changedFromDefault: boolean;
}

export interface AreaImpactResult {
  priceImpact: number;
  timeImpact: number; // in minutes
  details: Array<{ label: string; value: number; type: 'price' | 'time' }>;
}

// ============= FIELD CONTRACTS BY AREA =============

const homeEntryFields: FieldContract[] = [
  {
    key: 'homeEntry.entryPathType',
    type: 'select',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.sfh.entryPath.label',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return t(language, 'sidebar.not_set');
      return t(language, `homeEntry.sfh.entryPath.${value.toLowerCase()}`);
    },
  },
  // === ENTRY ZONE DETAILS (FREE - included with all cleanings) ===
  {
    key: 'homeEntry.entryZoneStyle',
    type: 'select',
    defaultValue: 'standard_entry',
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.entryZone.style.label',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return t(language, 'sidebar.not_set');
      const styleMap: Record<string, string> = {
        'standard_entry': 'homeEntry.entryZone.style.standard',
        'formal_foyer': 'homeEntry.entryZone.style.formal',
        'combined_living_entry': 'homeEntry.entryZone.style.combined',
      };
      return t(language, styleMap[value] || 'sidebar.not_set');
    },
  },
  {
    key: 'homeEntry.entryZoneFloor',
    type: 'select',
    defaultValue: 'hardwood_tile',
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.entryZone.floor.label',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return t(language, 'sidebar.not_set');
      const floorMap: Record<string, string> = {
        'hardwood_tile': 'homeEntry.entryZone.floor.hardwood',
        'carpet': 'homeEntry.entryZone.floor.carpet',
        'stone': 'homeEntry.entryZone.floor.stone',
      };
      return t(language, floorMap[value] || 'sidebar.not_set');
    },
  },
  {
    key: 'homeEntry.hasEntryRugMat',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.entryZone.rugMat',
    requiredForComplete: false,
    formatFn: (value: boolean) => value ? '✓' : '—',
  },
  {
    key: 'homeEntry.hasCoatCloset',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.entryZone.coatCloset',
    requiredForComplete: false,
    formatFn: (value: boolean) => value ? '✓' : '—',
  },
  {
    key: 'homeEntry.hasGlassAtEntry',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.entryZone.glassAtEntry',
    requiredForComplete: false,
    formatFn: (value: boolean) => value ? '✓' : '—',
  },
  // === PROPERTY LOGISTICS METADATA (no pricing, logistics only) ===
  {
    key: 'homeEntry.studioSubtype',
    type: 'select',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.studioSubtype.label',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return ''; // Return empty - renderer hides empty values
      return t(language, `homeEntry.studioSubtype.${value}`);
    },
  },
  {
    key: 'homeEntry.propertyStyle',
    type: 'select',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.propertyStyle.label',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return ''; // Return empty - renderer hides empty values
      return t(language, `homeEntry.propertyStyle.${value}`);
    },
  },
  {
    key: 'homeEntry.unitPosition',
    type: 'select',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'homeEntry.unitPosition.label',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return ''; // Return empty - renderer hides empty values
      const keyMap: Record<string, string> = {
        'ground_floor': 'ground',
        'mid_rise': 'midRise',
        'high_rise': 'highRise',
      };
      return t(language, `homeEntry.unitPosition.${keyMap[value] || value}`);
    },
  },
    // arrivalInstructions and parkingNotes removed per Strategy A - structured mapping only
];

const kitchenFields: FieldContract[] = [
  {
    key: 'spaceFloorTypes.kitchen',
    type: 'select',
    defaultValue: 'hardwood_tile',
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'floor.title',
    requiredForComplete: false,
    formatFn: (value: string, language: Language) => t(language, `floor.${value}`),
    timeImpactFn: (value: string) => {
      // Base kitchen time ~30 min, carpet adds 15%
      const baseTime = 30;
      const multiplier = FLOOR_TYPE_LABOR_MULTIPLIER[value as keyof typeof FLOOR_TYPE_LABOR_MULTIPLIER] || 1;
      return Math.round(baseTime * (multiplier - 1));
    },
  },
  {
    key: 'ceilingHeights.kitchen',
    type: 'select',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'ceiling.title',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return t(language, 'sidebar.not_set');
      return t(language, `ceiling.${value.toLowerCase()}`);
    },
  },
  {
    key: 'pullOutAppliances',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'addon.pull_out_appliances',
    requiredForComplete: false,
    formatFn: (value: boolean, language: Language) => value ? '✓' : '—',
    priceImpactFn: (value: boolean) => value ? 30 : 0,
    timeImpactFn: (value: boolean) => value ? 25 : 0,
  },
  {
    key: 'roomAddons.kitchen',
    type: 'array',
    defaultValue: [],
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'sidebar.kitchen_addons',
    requiredForComplete: false,
    formatFn: (value: any[], language: Language) => {
      if (!value || value.length === 0) return t(language, 'sidebar.none');
      return `${value.length} ${t(language, 'sidebar.selected')}`;
    },
    priceImpactFn: (value: any[], formData: BookingFormData) => {
      if (!value || value.length === 0) return 0;
      // SSOT: Use dynamic pricing from pricing_kitchen.ts
      const result = calculateKitchenAddonsTotal(
        value,
        formData?.homeSize || 2,
        formData?.propertyType,
        formData?.squareFootageRange,
        ((formData as any)?.kitchenCabinetOverride || 'typical') as CabinetSizeOverride,
        ((formData as any)?.kitchenDegreaseLevel) as DegreaseLevel | undefined
      );
      return result.totalPrice;
    },
    timeImpactFn: (value: any[], formData: BookingFormData) => {
      if (!value || value.length === 0) return 0;
      // SSOT: Use dynamic time from pricing_kitchen.ts
      const result = calculateKitchenAddonsTotal(
        value,
        formData?.homeSize || 2,
        formData?.propertyType,
        formData?.squareFootageRange,
        ((formData as any)?.kitchenCabinetOverride || 'typical') as CabinetSizeOverride,
        ((formData as any)?.kitchenDegreaseLevel) as DegreaseLevel | undefined
      );
      return result.totalMinutes;
    },
  },
  {
    key: 'roomMessTypes.kitchen',
    type: 'array',
    defaultValue: [],
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'sidebar.kitchen_hazards',
    requiredForComplete: false,
    formatFn: (value: any[], language: Language) => {
      if (!value || value.length === 0) return t(language, 'sidebar.none');
      return `${value.length} ${t(language, 'sidebar.flagged')}`;
    },
  },
  {
    key: 'roomTrashBags.kitchen',
    type: 'number',
    defaultValue: 0,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'sidebar.trash_bags',
    requiredForComplete: false,
    formatFn: (value: number) => value > 0 ? `${value} bags` : '—',
    timeImpactFn: (value: number) => value * 5, // 5 min per bag
  },
];

const livingFields: FieldContract[] = [
  {
    key: 'spaceFloorTypes.living',
    type: 'select',
    defaultValue: 'hardwood_tile',
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'floor.title',
    requiredForComplete: false,
    formatFn: (value: string, language: Language) => t(language, `floor.${value}`),
    timeImpactFn: (value: string) => {
      const baseTime = 25;
      const multiplier = FLOOR_TYPE_LABOR_MULTIPLIER[value as keyof typeof FLOOR_TYPE_LABOR_MULTIPLIER] || 1;
      return Math.round(baseTime * (multiplier - 1));
    },
  },
  {
    key: 'ceilingHeights.living',
    type: 'select',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'ceiling.title',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return t(language, 'sidebar.not_set');
      return t(language, `ceiling.${value.toLowerCase()}`);
    },
  },
  {
    key: 'roomAddons.living',
    type: 'array',
    defaultValue: [],
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'sidebar.living_addons',
    requiredForComplete: false,
    formatFn: (value: any[], language: Language) => {
      if (!value || value.length === 0) return t(language, 'sidebar.none');
      return `${value.length} ${t(language, 'sidebar.selected')}`;
    },
    priceImpactFn: (value: any[]) => {
      if (!value) return 0;
      return value.reduce((sum, addon) => sum + (addonPrices[addon.addonId] || 0) * addon.quantity, 0);
    },
    timeImpactFn: (value: any[]) => {
      if (!value) return 0;
      return value.reduce((sum, addon) => sum + (ADDON_TIMES[addon.addonId] || 15) * addon.quantity, 0);
    },
  },
  {
    key: 'roomMessTypes.living',
    type: 'array',
    defaultValue: [],
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'sidebar.living_hazards',
    requiredForComplete: false,
    formatFn: (value: any[], language: Language) => {
      if (!value || value.length === 0) return t(language, 'sidebar.none');
      return `${value.length} ${t(language, 'sidebar.flagged')}`;
    },
    timeImpactFn: (value: any[], formData: BookingFormData) => {
      const stickySpills = (formData.roomStickySpills as any)?.living || false;
      return getLivingHazardBuffer(value || [], stickySpills);
    },
  },
];

const diningFields: FieldContract[] = [
  {
    key: 'spaceFloorTypes.dining',
    type: 'select',
    defaultValue: 'hardwood_tile',
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'floor.title',
    requiredForComplete: false,
    formatFn: (value: string, language: Language) => t(language, `floor.${value}`),
    timeImpactFn: (value: string) => {
      const baseTime = 20;
      const multiplier = FLOOR_TYPE_LABOR_MULTIPLIER[value as keyof typeof FLOOR_TYPE_LABOR_MULTIPLIER] || 1;
      return Math.round(baseTime * (multiplier - 1));
    },
  },
  {
    key: 'ceilingHeights.dining',
    type: 'select',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'ceiling.title',
    requiredForComplete: false,
    formatFn: (value: string | null, language: Language) => {
      if (!value) return t(language, 'sidebar.not_set');
      return t(language, `ceiling.${value.toLowerCase()}`);
    },
  },
  {
    key: 'roomAddons.dining',
    type: 'array',
    defaultValue: [],
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'sidebar.dining_addons',
    requiredForComplete: false,
    formatFn: (value: any[], language: Language) => {
      if (!value || value.length === 0) return t(language, 'sidebar.none');
      return `${value.length} ${t(language, 'sidebar.selected')}`;
    },
    priceImpactFn: (value: any[]) => {
      if (!value) return 0;
      return value.reduce((sum, addon) => sum + (addonPrices[addon.addonId] || 0) * addon.quantity, 0);
    },
    timeImpactFn: (value: any[]) => {
      if (!value) return 0;
      return value.reduce((sum, addon) => sum + (ADDON_TIMES[addon.addonId] || 15) * addon.quantity, 0);
    },
  },
  {
    key: 'roomMessTypes.dining',
    type: 'array',
    defaultValue: [],
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'sidebar.dining_hazards',
    requiredForComplete: false,
    formatFn: (value: any[], language: Language) => {
      if (!value || value.length === 0) return t(language, 'sidebar.none');
      return `${value.length} ${t(language, 'sidebar.flagged')}`;
    },
    timeImpactFn: (value: any[], formData: BookingFormData) => {
      const stickySpills = (formData.roomStickySpills as any)?.dining || false;
      return getDiningHazardBuffer(value || [], stickySpills);
    },
  },
];

const bedroomsFields: FieldContract[] = [
  {
    key: 'bedroomConfigs',
    type: 'object',
    defaultValue: null,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'sidebar.bedroom_configs',
    requiredForComplete: false,
    formatFn: (value: Record<string, BedroomConfig>, language: Language) => {
      if (!value) return t(language, 'sidebar.none');
      const count = Object.keys(value).length;
      return `${count} ${t(language, count === 1 ? 'sidebar.bedroom' : 'sidebar.bedrooms_mapped')}`;
    },
    priceImpactFn: (value: Record<string, BedroomConfig>) => {
      if (!value) return 0;
      let total = 0;
      Object.values(value).forEach(config => {
        total += config.ceilingFans * 8;
        total += config.lightFixtures * 5;
        total += config.freshSheets * FRESH_SHEETS_RATE;
        total += config.organizationHours * ORGANIZATION_RATE;
      });
      return total;
    },
    timeImpactFn: (value: Record<string, BedroomConfig>) => {
      if (!value) return 0;
      let total = 0;
      Object.values(value).forEach(config => {
        total += config.ceilingFans * 10;
        total += config.lightFixtures * 8;
        total += config.freshSheets * 15;
        total += config.organizationHours * 60;
      });
      return total;
    },
  },
  {
    key: 'skippedBedrooms',
    type: 'array',
    defaultValue: [],
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'sidebar.skipped_bedrooms',
    requiredForComplete: false,
    formatFn: (value: string[], language: Language) => {
      if (!value || value.length === 0) return t(language, 'sidebar.none_skipped');
      return `${value.length} ${t(language, 'sidebar.skipped')}`;
    },
  },
  {
    key: 'bedroomHazards',
    type: 'object',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'sidebar.bedroom_hazards',
    requiredForComplete: false,
    formatFn: (value: Record<string, BedroomHazards>, language: Language) => {
      if (!value) return t(language, 'sidebar.none');
      const flaggedCount = Object.values(value).filter(h => 
        h.dustBuildup || h.petHair || h.underBedDebris || h.closetClutter || h.textileAccumulation
      ).length;
      return flaggedCount > 0 ? `${flaggedCount} ${t(language, 'sidebar.flagged')}` : t(language, 'sidebar.none');
    },
    timeImpactFn: (value: Record<string, BedroomHazards>) => {
      return getBedroomHazardBuffer(value);
    },
  },
  {
    key: 'ceilingHeights.bedrooms',
    type: 'object',
    defaultValue: {},
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'ceiling.bedrooms',
    requiredForComplete: false,
    formatFn: (value: Record<string, string | null>, language: Language) => {
      if (!value || Object.keys(value).length === 0) return t(language, 'sidebar.not_set');
      const uniqueCeilings = [...new Set(Object.values(value).filter(Boolean))];
      if (uniqueCeilings.length === 0) return t(language, 'sidebar.not_set');
      return uniqueCeilings.map(c => t(language, `ceiling.${String(c).toLowerCase()}`)).join(', ');
    },
  },
];

const hallwaysFields: FieldContract[] = [
  {
    key: 'hallways',
    type: 'array',
    defaultValue: [],
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'hallway.section_title',
    requiredForComplete: false,
    formatFn: (value: HallwayConfig[], language: Language) => {
      if (!value || value.length === 0) return t(language, 'sidebar.none_mapped');
      return `${value.length} ${t(language, value.length === 1 ? 'sidebar.hallway' : 'sidebar.hallways_mapped')}`;
    },
    priceImpactFn: (value: HallwayConfig[], formData: BookingFormData) => {
      if (!value || value.length === 0) return 0;
      const summary = calcHallwaySummary(
        value, 
        formData.baseServiceLevel === 'Move-In/Out' ? 'MOVING' : 'LIVE_HERE',
        formData.baseServiceLevel
      );
      return summary.totalCost;
    },
    timeImpactFn: (value: HallwayConfig[]) => {
      if (!value || value.length === 0) return 0;
      let total = 0;
      value.forEach(h => {
        total += HALLWAY_SIZE_LABOR[h.sizeTier].minutes;
        if (h.highTrafficDust) total += HALLWAY_HAZARD_TIMES.highTrafficDust;
        if (h.runnerOrRug) total += HALLWAY_HAZARD_TIMES.runnerOrRug;
        if (h.wallScuffs) total += HALLWAY_HAZARD_TIMES.wallScuffs;
        if (h.galleryWall) total += HALLWAY_HAZARD_TIMES.galleryWall;
        if (h.entryDebris) total += HALLWAY_HAZARD_TIMES.entryDebris;
        total += (h.organizationHours || 0) * 60;
      });
      return total;
    },
  },
  {
    key: 'ceilingHeights.hallways',
    type: 'object',
    defaultValue: {},
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'ceiling.hallways',
    requiredForComplete: false,
    formatFn: (value: Record<string, string | null>, language: Language) => {
      if (!value || Object.keys(value).length === 0) return t(language, 'sidebar.not_set');
      const uniqueCeilings = [...new Set(Object.values(value).filter(Boolean))];
      if (uniqueCeilings.length === 0) return t(language, 'sidebar.not_set');
      return uniqueCeilings.map(c => t(language, `ceiling.${String(c).toLowerCase()}`)).join(', ');
    },
  },
];

// ============= STAIRS FIELDS (SSOT: formData.stairs[]) =============
// These fields derive ALL values from the multi-stair array, NOT legacy stairsConfig
const stairsFields: FieldContract[] = [
  {
    key: 'stairs.count',
    type: 'computed',
    defaultValue: 0,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'stairs.section_title',
    requiredForComplete: false,
    formatFn: (_value: unknown, language: Language, formData?: BookingFormData) => {
      const count = formData?.stairs?.length ?? 0;
      if (count === 0) return t(language, 'sidebar.disabled');
      return `${count} ${count === 1 ? 'staircase' : 'staircases'}`;
    },
    timeImpactFn: (_value: unknown, formData?: BookingFormData) => {
      // Sum base step time across all stairs
      return (formData?.stairs || []).reduce((sum, stair) => {
        return sum + Math.ceil((stair.stepCount || 14) * 0.8);
      }, 0);
    },
  },
  {
    key: 'stairs.surfaces',
    type: 'computed',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'stairs.surface_type',
    requiredForComplete: false,
    formatFn: (_value: unknown, language: Language, formData?: BookingFormData) => {
      const stairs = formData?.stairs || [];
      if (stairs.length === 0) return t(language, 'sidebar.not_set');
      const surfaces = [...new Set(stairs.map(s => s.surfaceType))];
      return surfaces.map(s => t(language, `stairs.${s}`)).join(', ');
    },
    timeImpactFn: (_value: unknown, formData?: BookingFormData) => {
      // Carpet/runner surfaces add time
      return (formData?.stairs || []).reduce((sum, stair) => {
        if (stair.surfaceType === 'carpet') return sum + 8;
        if (stair.surfaceType === 'mixed_runner') return sum + 5;
        return sum;
      }, 0);
    },
  },
  {
    key: 'stairs.totalSteps',
    type: 'computed',
    defaultValue: 0,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'stairs.step_count',
    requiredForComplete: false,
    formatFn: (_value: unknown, _language: Language, formData?: BookingFormData) => {
      const totalSteps = (formData?.stairs || []).reduce((sum, stair) => sum + (stair.stepCount || 14), 0);
      return `${totalSteps} steps total`;
    },
  },
  {
    key: 'stairs.connections',
    type: 'computed',
    defaultValue: null,
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'stairs.connection',
    requiredForComplete: false,
    formatFn: (_value: unknown, language: Language, formData?: BookingFormData) => {
      const stairs = formData?.stairs || [];
      if (stairs.length === 0) return t(language, 'sidebar.not_set');
      return stairs.map(s => `F${s.fromFloor} → F${s.toFloor}`).join(', ');
    },
  },
  {
    key: 'stairs.hazards.cornerBuildup',
    type: 'computed',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'stairs.corner_buildup',
    requiredForComplete: false,
    formatFn: (_value: unknown, _language: Language, formData?: BookingFormData) => {
      const count = (formData?.stairs || []).filter(s => s.cornerBuildup).length;
      return count > 0 ? `⚠️ ${count}` : '—';
    },
    timeImpactFn: (_value: unknown, formData?: BookingFormData) => {
      return (formData?.stairs || []).filter(s => s.cornerBuildup).length * STAIR_HAZARD_TIMES.cornerBuildup;
    },
  },
  {
    key: 'stairs.hazards.petHair',
    type: 'computed',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'stairs.pet_hair',
    requiredForComplete: false,
    formatFn: (_value: unknown, _language: Language, formData?: BookingFormData) => {
      const count = (formData?.stairs || []).filter(s => s.petHairAccumulation).length;
      return count > 0 ? `🐾 ${count}` : '—';
    },
    timeImpactFn: (_value: unknown, formData?: BookingFormData) => {
      return (formData?.stairs || []).filter(s => s.petHairAccumulation).length * STAIR_HAZARD_TIMES.petHairAccumulation;
    },
  },
  {
    key: 'stairs.hazards.railings',
    type: 'computed',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'stairs.railings_detail',
    requiredForComplete: false,
    formatFn: (_value: unknown, _language: Language, formData?: BookingFormData) => {
      const count = (formData?.stairs || []).filter(s => s.railingsDetail).length;
      return count > 0 ? `✓ ${count}` : '—';
    },
    timeImpactFn: (_value: unknown, formData?: BookingFormData) => {
      return (formData?.stairs || []).filter(s => s.railingsDetail).length * STAIR_HAZARD_TIMES.railingsDetail;
    },
  },
];

// ============= UTILITY AREA FIELD CONTRACTS =============
// These contracts now use homeMapping.areas as the source of truth

const officeFields: FieldContract[] = [
  {
    key: 'homeMapping.areas.office.enabled',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.office',
    requiredForComplete: false,
    formatFn: (value: boolean, language: Language) => value ? t(language, 'sidebar.enabled') : t(language, 'sidebar.disabled'),
  },
  {
    key: 'homeMapping.areas.office.size',
    type: 'select',
    defaultValue: 'medium',
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.office.size',
    requiredForComplete: false,
    formatFn: (value: string, language: Language) => t(language, `size.${value}`),
    priceImpactFn: (value: string) => value === 'small' ? -10 : value === 'medium' ? 0 : 15,
    timeImpactFn: (value: string) => value === 'small' ? -5 : value === 'medium' ? 0 : 10,
  },
  {
    key: 'homeMapping.areas.office.floor.floorType',
    type: 'select',
    defaultValue: 'hardwood_tile',
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'floor.title',
    formatFn: (value: string, language: Language) => t(language, `floor.${value}`),
  },
  {
    key: 'homeMapping.areas.office.openings.windowCount',
    type: 'number',
    defaultValue: 1,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'win.count',
    formatFn: (value: number) => value > 0 ? `${value}` : '—',
  },
];

const laundryFields: FieldContract[] = [
  {
    key: 'homeMapping.areas.laundry.enabled',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.laundry',
    requiredForComplete: false,
    formatFn: (value: boolean, language: Language) => value ? t(language, 'sidebar.enabled') : t(language, 'sidebar.disabled'),
  },
  {
    key: 'homeMapping.areas.laundry.type',
    type: 'select',
    defaultValue: 'closet',
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.laundry.type',
    requiredForComplete: false,
    formatFn: (value: string, language: Language) => t(language, `spaces.laundry.${value}`),
    priceImpactFn: (value: string) => value === 'room' ? 10 : 0,
    timeImpactFn: (value: string) => value === 'room' ? 10 : 0,
  },
  {
    key: 'homeMapping.areas.laundry.size',
    type: 'select',
    defaultValue: 'small',
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.laundry.size',
    formatFn: (value: string, language: Language) => t(language, `size.${value}`),
  },
];

const garageFields: FieldContract[] = [
  {
    key: 'homeMapping.areas.garage.enabled',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.garage',
    requiredForComplete: false,
    formatFn: (value: boolean, language: Language) => value ? t(language, 'sidebar.enabled') : t(language, 'sidebar.disabled'),
  },
  {
    key: 'homeMapping.areas.garage.capacity',
    type: 'select',
    defaultValue: 2,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.garage.capacity',
    formatFn: (value: number) => `${value}-car`,
    priceImpactFn: (value: number) => value === 1 ? 45 : value === 2 ? 65 : 85,
    timeImpactFn: (value: number) => value === 1 ? 30 : value === 2 ? 45 : 60,
  },
  {
    key: 'homeMapping.areas.garage.storageLevel',
    type: 'select',
    defaultValue: 'light',
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'spaces.garage.storage',
    formatFn: (value: string, language: Language) => t(language, `spaces.garage.storage.${value}`),
    priceImpactFn: (value: string) => value === 'heavy' ? 20 : value === 'medium' ? 10 : 0,
    timeImpactFn: (value: string) => value === 'heavy' ? 25 : value === 'medium' ? 10 : 0,
  },
  {
    key: 'homeMapping.areas.garage.hasOilStains',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'spaces.garage.oil_stains',
    formatFn: (value: boolean) => value ? '⚠️' : '—',
    priceImpactFn: (value: boolean) => value ? 15 : 0,
    timeImpactFn: (value: boolean) => value ? 20 : 0,
  },
];

const patioFields: FieldContract[] = [
  {
    key: 'homeMapping.areas.patio.enabled',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.patio',
    requiredForComplete: false,
    formatFn: (value: boolean, language: Language) => value ? t(language, 'sidebar.enabled') : t(language, 'sidebar.disabled'),
  },
  {
    key: 'homeMapping.areas.patio.type',
    type: 'select',
    defaultValue: 'patio',
    affectsPrice: false,
    affectsTime: false,
    affectsLogistics: true,
    display: true,
    labelKey: 'spaces.patio.type',
    formatFn: (value: string, language: Language) => t(language, `spaces.patio.${value}`),
  },
  {
    key: 'homeMapping.areas.patio.size',
    type: 'select',
    defaultValue: 'medium',
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.patio.size',
    formatFn: (value: string, language: Language) => t(language, `size.${value}`),
    priceImpactFn: (value: string) => value === 'small' ? 25 : value === 'medium' ? 40 : 60,
    timeImpactFn: (value: string) => value === 'small' ? 15 : value === 'medium' ? 25 : 40,
  },
  {
    key: 'homeMapping.areas.patio.hasFurniture',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.patio.furniture',
    formatFn: (value: boolean, language: Language) => value ? '✓' : '—',
    priceImpactFn: (value: boolean) => value ? 10 : 0,
    timeImpactFn: (value: boolean) => value ? 15 : 0,
  },
  {
    key: 'homeMapping.areas.patio.hasGlassRailing',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'spaces.patio.glass_railing',
    formatFn: (value: boolean, language: Language) => value ? '✓' : '—',
    priceImpactFn: (value: boolean) => value ? 15 : 0,
    timeImpactFn: (value: boolean) => value ? 10 : 0,
  },
];

// ============= STUDIO MAIN SPACE FIELDS =============

const studioMainSpaceFields: FieldContract[] = [
  // Structure Type
  {
    key: 'homeMapping.areas.studioMainSpace.structureType',
    type: 'select',
    defaultValue: 'apartment_unit',
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'studio.structure_type',
    formatFn: (value: string, language: Language) => 
      t(language, `studio.structure.${value}`) || value,
  },
  // Studio Size
  {
    key: 'homeMapping.areas.studioMainSpace.studioSize',
    type: 'select',
    defaultValue: '400_600',
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'studio.size',
    formatFn: (value: string, language: Language) => 
      t(language, `studio.size.${value}`) || value,
  },
  // Floor Type
  {
    key: 'homeMapping.areas.studioMainSpace.floorType',
    type: 'select',
    defaultValue: 'hardwood_tile',
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'floor.title',
    formatFn: (value: string, language: Language) => 
      t(language, `floor.${value}`) || value,
  },
  // Furniture Density
  {
    key: 'homeMapping.areas.studioMainSpace.furnitureDensity',
    type: 'select',
    defaultValue: 'normal',
    affectsPrice: true,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'studio.furniture_density',
    formatFn: (value: string, language: Language) => 
      t(language, `studio.density_${value}`) || value,
  },
  // Clutter Level
  {
    key: 'homeMapping.areas.studioMainSpace.clutterLevel',
    type: 'select',
    defaultValue: 'normal',
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'studio.clutter_level',
    formatFn: (value: string, language: Language) => 
      t(language, `studio.density_${value}`) || value,
  },
  // === TOGGLE FIELDS ===
  {
    key: 'homeMapping.areas.studioMainSpace.hasCloset',
    type: 'toggle',
    defaultValue: true,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'studio.has_closet',
    formatFn: (value: boolean) => value ? '✓' : '—',
  },
  {
    key: 'homeMapping.areas.studioMainSpace.hasDeskArea',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'studio.has_desk',
    formatFn: (value: boolean) => value ? '✓' : '—',
  },
  {
    key: 'homeMapping.areas.studioMainSpace.hasTvArea',
    type: 'toggle',
    defaultValue: true,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'studio.has_tv',
    formatFn: (value: boolean) => value ? '✓' : '—',
  },
  {
    key: 'homeMapping.areas.studioMainSpace.hasBalconyDoor',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'studio.has_balcony_door',
    formatFn: (value: boolean) => value ? '✓' : '—',
  },
  {
    key: 'homeMapping.areas.studioMainSpace.petHairRisk',
    type: 'toggle',
    defaultValue: false,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: true,
    display: true,
    labelKey: 'studio.pet_hair',
    formatFn: (value: boolean) => value ? '✓' : '—',
  },
  // Window Count
  {
    key: 'homeMapping.areas.studioMainSpace.windowCount',
    type: 'counter',
    defaultValue: 2,
    affectsPrice: false,
    affectsTime: true,
    affectsLogistics: false,
    display: true,
    labelKey: 'studio.window_count',
    formatFn: (value: number) => `${value || 0}`,
  },
];

// ============= MAIN CONTRACT REGISTRY =============

export const SIDEBAR_FIELD_CONTRACT: Record<ServiceAreaKey, AreaContract> = {
  home_entry: {
    areaKey: 'home_entry',
    order: 5,
    emoji: '🚪',
    labelKey: 'homeEntry.title',
    fields: homeEntryFields,
  },
  kitchen: {
    areaKey: 'kitchen',
    order: 10,
    emoji: '🍳',
    labelKey: 'core.kitchen',
    fields: kitchenFields,
  },
  studio_main_space: {
    areaKey: 'studio_main_space',
    order: 15,
    emoji: '🛏️',
    labelKey: 'spaces.studio_main_space',
    fields: studioMainSpaceFields,
  },
  living: {
    areaKey: 'living',
    order: 20,
    emoji: '🛋️',
    labelKey: 'core.living',
    fields: livingFields,
  },
  dining: {
    areaKey: 'dining',
    order: 30,
    emoji: '🍽️',
    labelKey: 'core.dining',
    fields: diningFields,
  },
  bedrooms: {
    areaKey: 'bedrooms',
    order: 40,
    emoji: '🛏️',
    labelKey: 'spaces.bedrooms_title',
    fields: bedroomsFields,
  },
  hallways: {
    areaKey: 'hallways',
    order: 50,
    emoji: '🚶',
    labelKey: 'hallway.section_title',
    fields: hallwaysFields,
  },
  stairs: {
    areaKey: 'stairs',
    order: 60,
    emoji: '🪜',
    labelKey: 'core.stairs',
    fields: stairsFields,
  },
  // === PREMIUM SPACES (Mudroom & Den only - Entryway absorbed into Home Entry) ===
  mudroom: {
    areaKey: 'mudroom',
    order: 61,
    emoji: '👟',
    labelKey: 'spaces.mudroom',
    fields: [], // UI-only
  },
  den: {
    areaKey: 'den',
    order: 62,
    emoji: '🛋️',
    labelKey: 'spaces.den',
    fields: [], // UI-only
  },
  // === UTILITY & SUPPORT AREAS ===
  office: {
    areaKey: 'office',
    order: 65,
    emoji: '💼',
    labelKey: 'spaces.office',
    fields: officeFields,
  },
  laundry: {
    areaKey: 'laundry',
    order: 70,
    emoji: '🧺',
    labelKey: 'spaces.laundry',
    fields: laundryFields,
  },
  // === EXTERIOR / SEMI-EXTERIOR AREAS ===
  garage: {
    areaKey: 'garage',
    order: 75,
    emoji: '🚗',
    labelKey: 'spaces.garage',
    fields: garageFields,
  },
  patio: {
    areaKey: 'patio',
    order: 80,
    emoji: '🌿',
    labelKey: 'spaces.patio',
    fields: patioFields,
  },
};

// ============= HELPER FUNCTIONS =============

/**
 * Build unified gating context from form data
 * This is the SINGLE source for gating context used by UI, Sidebar, Review, and PDF
 */
export function buildUnifiedGatingContext(
  formData: BookingFormData,
  situation: Situation
): AreaGatingContext {
  // Compute bedroom count consistently
  const bedroomCount = formData.homeSize || 0;
  
  // Compute home size label consistently
  let homeSizeLabel: string;
  if (bedroomCount === 0) {
    homeSizeLabel = 'Studio';
  } else if (bedroomCount === 1) {
    homeSizeLabel = '1 Bedroom';
  } else {
    homeSizeLabel = `${bedroomCount} Bedrooms`;
  }
  
  // Compute property floors consistently
  const propertyFloors = formData.propertyType === 'apartment'
    ? (formData.apartmentUnitLevels || 1)
    : (formData.houseLevels || 1);
  
  return {
    situation: situation,
    serviceType: formData.serviceType || formData.baseServiceLevel || '',
    homeSizeLabel,
    bedroomCount,
    propertyFloors,
    // SSOT: Include propertyType for studio detection
    propertyType: formData.propertyType,
    sqftRange: formData.squareFootageRange,
    apartmentUnitLevels: formData.apartmentUnitLevels,
  };
}

/**
 * Get nested value from object using dot notation path
 */
export function getFieldValue(formData: BookingFormData, path: string): any {
  const keys = path.split('.');
  let value: any = formData;
  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }
  return value;
}

/**
 * Check if a field value differs from its default
 */
export function isFieldChanged(
  value: any, 
  defaultValue: any
): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length !== (defaultValue?.length || 0);
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return value !== defaultValue;
}

/**
 * Compute the status of an area based on its fields
 */
export function computeAreaStatus(
  areaKey: ServiceAreaKey,
  formData: BookingFormData
): AreaStatusResult {
  const contract = SIDEBAR_FIELD_CONTRACT[areaKey];
  if (!contract) {
    return { status: 'default_only', configuredCount: 0, requiredCount: 0, totalFields: 0, changedFromDefault: false };
  }

  let configuredCount = 0;
  let requiredCount = 0;
  let changedFromDefault = false;
  const totalFields = contract.fields.filter(f => f.display).length;

  contract.fields.forEach(field => {
    const value = getFieldValue(formData, field.key);
    const isChanged = isFieldChanged(value, field.defaultValue);
    
    if (isChanged) {
      configuredCount++;
      changedFromDefault = true;
    }
    
    if (field.requiredForComplete) {
      requiredCount++;
    }
  });

  // Determine status
  let status: AreaStatus = 'default_only';
  if (changedFromDefault) {
    // Check if all required fields are filled
    const requiredFields = contract.fields.filter(f => f.requiredForComplete);
    const allRequiredFilled = requiredFields.every(field => {
      const value = getFieldValue(formData, field.key);
      return value !== undefined && value !== null && value !== '' && 
             !(Array.isArray(value) && value.length === 0);
    });
    
    status = allRequiredFilled ? 'configured' : 'incomplete';
  }

  return { status, configuredCount, requiredCount, totalFields, changedFromDefault };
}

/**
 * Compute price impact for an area
 */
export function computeAreaPriceImpact(
  areaKey: ServiceAreaKey,
  formData: BookingFormData,
  isDeep: boolean
): number {
  const contract = SIDEBAR_FIELD_CONTRACT[areaKey];
  if (!contract) return 0;

  let total = 0;
  contract.fields.forEach(field => {
    if (field.affectsPrice && field.priceImpactFn) {
      const value = getFieldValue(formData, field.key);
      total += field.priceImpactFn(value, formData, isDeep);
    }
  });

  return Math.round(total);
}

/**
 * Compute time impact for an area (in minutes)
 */
export function computeAreaTimeImpact(
  areaKey: ServiceAreaKey,
  formData: BookingFormData,
  isDeep: boolean
): number {
  const contract = SIDEBAR_FIELD_CONTRACT[areaKey];
  if (!contract) return 0;

  let total = 0;
  contract.fields.forEach(field => {
    if (field.affectsTime && field.timeImpactFn) {
      const value = getFieldValue(formData, field.key);
      total += field.timeImpactFn(value, formData, isDeep);
    }
  });

  return Math.round(total);
}

/**
 * Get visible areas for sidebar based on gating context
 */
export function getVisibleAreasForSidebar(context: AreaGatingContext): AreaContract[] {
  const visibleAreas = getVisibleAreas(context);
  return visibleAreas
    .map(area => SIDEBAR_FIELD_CONTRACT[area.key])
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get all displayable fields for an area
 */
export function getDisplayableFields(areaKey: ServiceAreaKey): FieldContract[] {
  const contract = SIDEBAR_FIELD_CONTRACT[areaKey];
  if (!contract) return [];
  return contract.fields.filter(f => f.display);
}

/**
 * Format a field value for display
 */
export function formatFieldValue(
  field: FieldContract,
  value: any,
  language: Language,
  formData?: BookingFormData
): string {
  if (field.formatFn) {
    return field.formatFn(value, language, formData);
  }
  
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (Array.isArray(value)) return value.length > 0 ? `${value.length}` : '—';
  return String(value);
}

// ============= DEV-ONLY VALIDATION =============

/**
 * DEV-only: Validate that all BookingFormData fields relevant to home mapping are in contract
 */
export function validateSidebarContract(formData: BookingFormData): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;

  const homeMappingPaths = [
    'homeEntry',
    'spaceFloorTypes',
    'roomAddons',
    'roomMessTypes',
    'roomTrashBags',
    'roomStickySpills',
    'bedroomConfigs',
    'bedroomHazards',
    'skippedBedrooms',
    'hallways',
    'stairsConfig',
    'pullOutAppliances',
  ];

  const contractPaths: string[] = [];
  Object.values(SIDEBAR_FIELD_CONTRACT).forEach(area => {
    area.fields.forEach(field => {
      contractPaths.push(field.key);
    });
  });

  homeMappingPaths.forEach(rootPath => {
    const hasMapping = contractPaths.some(path => path.startsWith(rootPath));
    if (!hasMapping) {
      console.warn(`[SidebarContract] Missing mapping for home mapping root: ${rootPath}`);
    }
  });
}

/**
 * Get summary of all areas with their status and impacts
 */
export function getAllAreasSummary(
  formData: BookingFormData,
  context: AreaGatingContext,
  isDeep: boolean
): Array<{
  areaKey: ServiceAreaKey;
  emoji: string;
  label: string;
  status: AreaStatus;
  priceImpact: number;
  timeImpact: number;
  hasContent: boolean;
}> {
  const visibleAreas = getVisibleAreasForSidebar(context);
  
  return visibleAreas.map(area => {
    const status = computeAreaStatus(area.areaKey, formData);
    const priceImpact = computeAreaPriceImpact(area.areaKey, formData, isDeep);
    const timeImpact = computeAreaTimeImpact(area.areaKey, formData, isDeep);
    
    return {
      areaKey: area.areaKey,
      emoji: area.emoji,
      label: area.labelKey,
      status: status.status,
      priceImpact,
      timeImpact,
      hasContent: status.changedFromDefault || priceImpact > 0 || timeImpact > 0,
    };
  });
}
