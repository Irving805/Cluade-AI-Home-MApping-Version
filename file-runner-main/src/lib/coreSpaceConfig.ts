// Core Space Configuration for Home Mapping & Contextual Add-ons System
// Each core space has standard inclusions and contextual add-on upsells
// Premium "McDonald's App" experience with real-world logistics

import { ADDON_TIMES, addonPrices } from '@/lib/pricing';

// === BEDROOM STANDARD INCLUSIONS ===
export interface BedroomInclusion {
  key: string;
  labelKey: string;
  requiresDeepOrMoving?: boolean;
}

export const BEDROOM_INCLUSIONS: BedroomInclusion[] = [
  { key: 'bed_making', labelKey: 'bedroom.inc.bed_making' },
  { key: 'dusting_surfaces', labelKey: 'bedroom.inc.dusting_surfaces' },
  { key: 'vacuuming_mopping', labelKey: 'bedroom.inc.vacuuming_mopping' },
  { key: 'cobweb_removal', labelKey: 'bedroom.inc.cobweb_removal' },
  { key: 'baseboards', labelKey: 'bedroom.inc.baseboards', requiresDeepOrMoving: true },
  { key: 'vent_surfaces', labelKey: 'bedroom.inc.vent_surfaces', requiresDeepOrMoving: true },
  { key: 'closet_doors', labelKey: 'bedroom.inc.closet_doors', requiresDeepOrMoving: true },
  { key: 'window_tracks', labelKey: 'bedroom.inc.window_tracks', requiresDeepOrMoving: true },
];

// === PET HAIR FLOOR TIMES BY FLOOR TYPE ===
export const PET_HAIR_FLOOR_TIMES = {
  hardwood_tile: 15,  // Static mop + HEPA vacuum
  carpet: 25,         // Deep extraction vacuum
  mixed: 20,          // Combination treatment
};

// === UPHOLSTERY PET HAIR TIMES BY MATERIAL ===
export type UpholsteryMaterial = 'fabric' | 'leather' | 'mixed';

export const UPHOLSTERY_PET_HAIR_TIMES: Record<UpholsteryMaterial, number> = {
  fabric: 35,   // Mechanical extraction + rubber brush
  leather: 20,  // Microfiber wipe + conditioner (gentler)
  mixed: 30,    // Average treatment
};

export interface CoreSpaceInclusion {
  key: string;
  labelKey: string;
  requiresDeepOrMoving?: boolean; // Only show for Deep Reset / I'm Moving flows
}

export interface ContextualAddon {
  addonId: string;
  labelKey: string;
  descriptionKey: string;      // Benefit description ("Degreasing & carbon removal")
  intentTagKey?: string;       // User intent/benefit ("Pass landlord inspection")
  icon: string;                // Lucide icon name
  price: number;
  minutes: number;
  hasQuantity?: boolean;
  maxQty?: number;
  // For Move-Out flow: mark as "Essential for Deposit Return"
  essentialForDeposit?: boolean;
  // Conditional visibility based on property structure
  requiresMultiFloor?: boolean;  // Only show for 2+ story homes
  isLifestyle?: boolean;         // Pet/lifestyle related add-on
}

export interface CoreSpaceDefinition {
  id: string;
  emoji: string;
  icon: string;
  labelKey: string;
  inclusions: CoreSpaceInclusion[];
  contextAddons: ContextualAddon[];
}

// Core Space Configuration with Premium Icons & Real-World Logistics
export const CORE_SPACE_CONFIG: Record<string, CoreSpaceDefinition> = {
  kitchen: {
    id: 'kitchen',
    emoji: '🍳',
    icon: 'chef-hat',
    labelKey: 'core.kitchen',
    inclusions: [
      { key: 'cabinet_surfaces', labelKey: 'core.kitchen.cabinet_surfaces' },
      { key: 'stove_top_front', labelKey: 'core.kitchen.stove_top_front' },
      { key: 'microwave', labelKey: 'core.kitchen.microwave', requiresDeepOrMoving: true },
      { key: 'sink_area', labelKey: 'core.kitchen.sink_area' },
      { key: 'trash_removal', labelKey: 'core.kitchen.trash_removal' },
      { key: 'countertops', labelKey: 'core.kitchen.countertops' },
      { key: 'mopping_vacuuming', labelKey: 'core.kitchen.mopping_vacuuming' },
      { key: 'vent_surfaces', labelKey: 'core.kitchen.vent_surfaces', requiresDeepOrMoving: true },
    ],
    contextAddons: [
      { 
        addonId: 'oven', 
        labelKey: 'addon.oven', 
        descriptionKey: 'addon.oven.desc',
        intentTagKey: 'addon.oven.intent',
        icon: 'flame',
        price: addonPrices.oven, 
        minutes: ADDON_TIMES.oven,
        essentialForDeposit: true 
      },
      { 
        addonId: 'fridge_empty', 
        labelKey: 'addon.fridge_empty', 
        descriptionKey: 'addon.fridge_empty.desc',
        intentTagKey: 'addon.fridge_empty.intent',
        icon: 'snowflake',
        price: addonPrices.fridge_empty, 
        minutes: ADDON_TIMES.fridge_empty,
        essentialForDeposit: true 
      },
      { 
        addonId: 'fridge_org', 
        labelKey: 'addon.fridge_org', 
        descriptionKey: 'addon.fridge_org.desc',
        intentTagKey: 'addon.fridge_org.intent',
        icon: 'refrigerator',
        price: addonPrices.fridge_org, 
        minutes: ADDON_TIMES.fridge_org 
      },
      { 
        addonId: 'cabinets', 
        labelKey: 'addon.cabinets', 
        descriptionKey: 'addon.cabinets.desc',
        intentTagKey: 'addon.cabinets.intent',
        icon: 'layout-grid',
        price: addonPrices.cabinets, 
        minutes: ADDON_TIMES.cabinets 
      },
      { 
        addonId: 'hood', 
        labelKey: 'addon.hood', 
        descriptionKey: 'addon.hood.desc',
        intentTagKey: 'addon.hood.intent',
        icon: 'wind',
        price: addonPrices.hood, 
        minutes: ADDON_TIMES.hood 
      },
    ],
  },
  living: {
    id: 'living',
    emoji: '🛋️',
    icon: 'sofa',
    labelKey: 'core.living',
    inclusions: [
      { key: 'dusting_furniture', labelKey: 'core.living.dusting_furniture' },
      { key: 'cobwebs', labelKey: 'core.living.cobwebs' },
      { key: 'slider_door', labelKey: 'core.living.slider_door', requiresDeepOrMoving: true },
      { key: 'window_tracks', labelKey: 'core.living.window_tracks', requiresDeepOrMoving: true },
      { key: 'baseboards', labelKey: 'core.living.baseboards', requiresDeepOrMoving: true },
      { key: 'mopping_vacuuming', labelKey: 'core.living.mopping_vacuuming' },
      { key: 'vent_surfaces', labelKey: 'core.living.vent_surfaces', requiresDeepOrMoving: true },
    ],
    contextAddons: [
      { 
        addonId: 'ceiling_fan', 
        labelKey: 'addon.ceiling_fan', 
        descriptionKey: 'addon.ceiling_fan.desc',
        icon: 'fan',
        price: addonPrices.ceiling_fan, 
        minutes: ADDON_TIMES.ceiling_fan,
        hasQuantity: true,
        maxQty: 5 
      },
      { 
        addonId: 'light_fixture', 
        labelKey: 'addon.light_fixture', 
        descriptionKey: 'addon.light_fixture.desc',
        icon: 'lamp',
        price: addonPrices.light_fixture, 
        minutes: ADDON_TIMES.light_fixture,
        hasQuantity: true,
        maxQty: 10 
      },
      { 
        addonId: 'fireplace', 
        labelKey: 'addon.fireplace', 
        descriptionKey: 'addon.fireplace.desc',
        intentTagKey: 'addon.fireplace.intent',
        icon: 'flame-kindling',
        price: addonPrices.fireplace, 
        minutes: ADDON_TIMES.fireplace 
      },
      // PET HAIR - FLOOR CARE (Tied to Floor Type)
      { 
        addonId: 'pet_hair_floor', 
        labelKey: 'addon.pet_hair_floor',
        descriptionKey: 'addon.pet_hair_floor.desc',
        intentTagKey: 'addon.pet_hair_floor.intent',
        icon: 'footprints',
        price: 20,
        minutes: 20,
        isLifestyle: true,
      },
      // PET HAIR - FURNITURE/UPHOLSTERY
      { 
        addonId: 'pet_hair_upholstery', 
        labelKey: 'addon.pet_hair_upholstery',
        descriptionKey: 'addon.pet_hair_upholstery.desc',
        intentTagKey: 'addon.pet_hair_upholstery.intent',
        icon: 'sofa',
        price: 30,
        minutes: 30,
        isLifestyle: true,
      },
      // Living Room Built-in Cabinet Interior
      { 
        addonId: 'living_cabinets', 
        labelKey: 'addon.living_cabinets',
        descriptionKey: 'addon.living_cabinets.desc',
        icon: 'layout-grid',
        price: 35,
        minutes: 25,
      },
    ],
  },
  hallways: {
    id: 'hallways',
    emoji: '🚶',
    icon: 'door-open',
    labelKey: 'core.hallways',
    inclusions: [
      { key: 'vacuuming', labelKey: 'core.hallways.vacuuming' },
      { key: 'mopping', labelKey: 'core.hallways.mopping' },
      { key: 'baseboards', labelKey: 'core.hallways.baseboards' },
      { key: 'vent_surfaces', labelKey: 'core.hallways.vent_surfaces', requiresDeepOrMoving: true },
      { key: 'closet_doors', labelKey: 'core.hallways.closet_doors', requiresDeepOrMoving: true },
    ],
    contextAddons: [
      // Ceiling Fans for Hallways
      { 
        addonId: 'ceiling_fan', 
        labelKey: 'addon.ceiling_fan', 
        descriptionKey: 'addon.ceiling_fan.desc',
        icon: 'fan',
        price: addonPrices.ceiling_fan, 
        minutes: ADDON_TIMES.ceiling_fan,
        hasQuantity: true,
        maxQty: 3 
      },
      // Light Fixtures for Hallways
      { 
        addonId: 'light_fixture', 
        labelKey: 'addon.light_fixture', 
        descriptionKey: 'addon.light_fixture.desc',
        icon: 'lamp',
        price: addonPrices.light_fixture, 
        minutes: ADDON_TIMES.light_fixture,
        hasQuantity: true,
        maxQty: 6 
      },
      // Hallway Linen Cabinet Interior
      { 
        addonId: 'hallway_cabinets', 
        labelKey: 'addon.hallway_cabinets',
        descriptionKey: 'addon.hallway_cabinets.desc',
        intentTagKey: 'addon.hallway_cabinets.intent',
        icon: 'archive',
        price: 25,
        minutes: 20,
      },
    ],
  },
  // === NEW: STAIRS (Separate from Hallways - only visible for 2+ floors) ===
  stairs: {
    id: 'stairs',
    emoji: '🪜',
    icon: 'footprints',
    labelKey: 'core.stairs',
    inclusions: [
      { key: 'vacuuming', labelKey: 'core.stairs.vacuuming' },
      { key: 'mopping', labelKey: 'core.stairs.mopping' },
      { key: 'railings', labelKey: 'core.stairs.railings' },
    ],
    contextAddons: [
      // Stair Railings & Banisters Detail
      { 
        addonId: 'stair_railings', 
        labelKey: 'addon.stair_railings',
        descriptionKey: 'addon.stair_railings.desc',
        intentTagKey: 'addon.stair_railings.intent',
        icon: 'hand',
        price: 25,
        minutes: 25,
      },
      // Stair Edge/Corner Deep Scrub
      { 
        addonId: 'stair_edging', 
        labelKey: 'addon.stair_edging',
        descriptionKey: 'addon.stair_edging.desc',
        intentTagKey: 'addon.stair_edging.intent',
        icon: 'corner-down-right',
        price: 20,
        minutes: 20,
      },
    ],
  },
  dining: {
    id: 'dining',
    emoji: '🍽️',
    icon: 'utensils',
    labelKey: 'core.dining',
    inclusions: [
      { key: 'dusting', labelKey: 'core.dining.dusting' },
      { key: 'surfaces', labelKey: 'core.dining.surfaces' },
      { key: 'floor', labelKey: 'core.dining.floor' },
      { key: 'furniture_wipe', labelKey: 'core.dining.furniture_wipe' },
      { key: 'vent_surfaces', labelKey: 'core.dining.vent_surfaces', requiresDeepOrMoving: true },
    ],
    contextAddons: [
      { 
        addonId: 'ceiling_fan', 
        labelKey: 'addon.ceiling_fan', 
        descriptionKey: 'addon.ceiling_fan.desc',
        icon: 'fan',
        price: addonPrices.ceiling_fan, 
        minutes: ADDON_TIMES.ceiling_fan,
        hasQuantity: true,
        maxQty: 3 
      },
      { 
        addonId: 'light_fixture', 
        labelKey: 'addon.light_fixture', 
        descriptionKey: 'addon.light_fixture.desc',
        icon: 'lamp',
        price: addonPrices.light_fixture, 
        minutes: ADDON_TIMES.light_fixture,
        hasQuantity: true,
        maxQty: 5 
      },
    ],
  },
  // === UTILITY & SUPPORT AREAS ===
  office: {
    id: 'office',
    emoji: '💼',
    icon: 'briefcase',
    labelKey: 'spaces.office',
    inclusions: [
      { key: 'dusting_surfaces', labelKey: 'office.inc.dusting_surfaces' },
      { key: 'desk_wipe', labelKey: 'office.inc.desk_wipe' },
      { key: 'vacuum_mop', labelKey: 'office.inc.vacuum_mop' },
      { key: 'trash_removal', labelKey: 'office.inc.trash_removal' },
      { key: 'baseboards', labelKey: 'office.inc.baseboards', requiresDeepOrMoving: true },
      { key: 'window_tracks', labelKey: 'office.inc.window_tracks', requiresDeepOrMoving: true },
    ],
    contextAddons: [
      {
        addonId: 'ceiling_fan',
        labelKey: 'addon.ceiling_fan',
        descriptionKey: 'addon.ceiling_fan.desc',
        icon: 'fan',
        price: addonPrices.ceiling_fan,
        minutes: ADDON_TIMES.ceiling_fan,
        hasQuantity: true,
        maxQty: 2,
      },
      {
        addonId: 'bookshelf_detail',
        labelKey: 'addon.bookshelf_detail',
        descriptionKey: 'addon.bookshelf_detail.desc',
        icon: 'book-open',
        price: 20,
        minutes: 25,
      },
    ],
  },
  laundry: {
    id: 'laundry',
    emoji: '🧺',
    icon: 'shirt',
    labelKey: 'spaces.laundry',
    inclusions: [
      { key: 'appliance_surfaces', labelKey: 'laundry.inc.appliance_surfaces' },
      { key: 'lint_trap', labelKey: 'laundry.inc.lint_trap' },
      { key: 'floor', labelKey: 'laundry.inc.floor' },
      { key: 'countertops', labelKey: 'laundry.inc.countertops' },
      { key: 'sink', labelKey: 'laundry.inc.sink' },
      { key: 'baseboards', labelKey: 'laundry.inc.baseboards', requiresDeepOrMoving: true },
    ],
    contextAddons: [
      {
        addonId: 'cabinet_interior',
        labelKey: 'addon.cabinet_interior',
        descriptionKey: 'addon.cabinet_interior.desc',
        icon: 'layout-grid',
        price: 25,
        minutes: 20,
      },
    ],
  },
  // === EXTERIOR / SEMI-EXTERIOR AREAS ===
  garage: {
    id: 'garage',
    emoji: '🚗',
    icon: 'car',
    labelKey: 'spaces.garage',
    inclusions: [
      { key: 'sweep_floor', labelKey: 'garage.inc.sweep_floor' },
      { key: 'dust_surfaces', labelKey: 'garage.inc.dust_surfaces' },
      { key: 'cobwebs', labelKey: 'garage.inc.cobwebs' },
      { key: 'trash_removal', labelKey: 'garage.inc.trash_removal' },
    ],
    contextAddons: [
      {
        addonId: 'oil_stain_treatment',
        labelKey: 'addon.oil_stain_treatment',
        descriptionKey: 'addon.oil_stain_treatment.desc',
        icon: 'droplet',
        price: 25,
        minutes: 30,
      },
      {
        addonId: 'workbench_detail',
        labelKey: 'addon.workbench_detail',
        descriptionKey: 'addon.workbench_detail.desc',
        icon: 'wrench',
        price: 15,
        minutes: 20,
      },
    ],
  },
  patio: {
    id: 'patio',
    emoji: '🌿',
    icon: 'sun',
    labelKey: 'spaces.patio',
    inclusions: [
      { key: 'sweep_surface', labelKey: 'patio.inc.sweep_surface' },
      { key: 'furniture_wipe', labelKey: 'patio.inc.furniture_wipe' },
      { key: 'glass_doors', labelKey: 'patio.inc.glass_doors' },
      { key: 'railing_wipe', labelKey: 'patio.inc.railing_wipe' },
    ],
    contextAddons: [
      {
        addonId: 'deep_scrub',
        labelKey: 'addon.deep_scrub',
        descriptionKey: 'addon.deep_scrub.desc',
        icon: 'droplets',
        price: 25,
        minutes: 35,
      },
      {
        addonId: 'glass_railing_detail',
        labelKey: 'addon.glass_railing_detail',
        descriptionKey: 'addon.glass_railing_detail.desc',
        icon: 'sparkles',
        price: 15,
        minutes: 15,
      },
    ],
  },
};

// Get all core space IDs
export function getCoreSpaceIds(): string[] {
  return Object.keys(CORE_SPACE_CONFIG);
}

// Get core space by ID
export function getCoreSpace(id: string): CoreSpaceDefinition | undefined {
  return CORE_SPACE_CONFIG[id];
}

// Get all contextual addon IDs from core spaces
export function getAllContextualAddonIds(): string[] {
  const addonIds: string[] = [];
  Object.values(CORE_SPACE_CONFIG).forEach(space => {
    space.contextAddons.forEach(addon => {
      if (!addonIds.includes(addon.addonId)) {
        addonIds.push(addon.addonId);
      }
    });
  });
  return addonIds;
}

// Check if an addon was selected via a core space context
export function getAddonSourceSpace(addonId: string): string | null {
  for (const [spaceId, space] of Object.entries(CORE_SPACE_CONFIG)) {
    if (space.contextAddons.some(a => a.addonId === addonId)) {
      return spaceId;
    }
  }
  return null;
}

// Get essential deposit addons for Move-Out flow
export function getEssentialDepositAddons(): ContextualAddon[] {
  const essentials: ContextualAddon[] = [];
  Object.values(CORE_SPACE_CONFIG).forEach(space => {
    space.contextAddons.forEach(addon => {
      if (addon.essentialForDeposit) {
        essentials.push(addon);
      }
    });
  });
  return essentials;
}

// Get addons filtered by property floors (for multi-floor conditional logic)
export function getFilteredAddonsForSpace(spaceId: string, propertyFloors: number): ContextualAddon[] {
  const space = CORE_SPACE_CONFIG[spaceId];
  if (!space) return [];
  
  return space.contextAddons.filter(addon => {
    if (addon.requiresMultiFloor) {
      return propertyFloors >= 2;
    }
    return true;
  });
}