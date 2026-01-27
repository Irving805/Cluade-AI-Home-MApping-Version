/**
 * Kitchen Section Toggles — SSOT Helper
 * 
 * Single source of truth for resolving kitchen section toggle states.
 * Use this helper in pricing.ts, homeLayoutModel.ts, and UI components.
 * 
 * KEY DESIGN DECISIONS:
 * - DEFAULT is FALSE (closed) for "extras feel" UX
 * - Smart auto-enable: If user has existing selections, enable the section
 * - This preserves "OFF by default" for new users but restores ON for existing data
 */

import type { BookingFormData } from '@/contexts/BookingContext';

// ============= TYPES =============

export interface KitchenSectionToggles {
  insideAppliances: boolean;  // Gates: oven, fridge, cabinets, upper_cabinets, hood, degrease
  windowInventory: boolean;   // Gates: kitchen windows + blinds
}

export interface RoomSectionToggles {
  kitchen?: KitchenSectionToggles;
  // Future: living, bedrooms, etc.
}

// ============= DEFAULT VALUES (OFF = extras feel) =============

export const DEFAULT_KITCHEN_TOGGLES: KitchenSectionToggles = {
  insideAppliances: false,  // OFF by default = "extras" feel
  windowInventory: false,   // OFF by default = "extras" feel
};

// ============= SSOT HELPER =============

/**
 * Get kitchen section toggles with smart defaults.
 * This is the SSOT helper used across pricing, ops model, and UI.
 * 
 * Rules:
 * 1. If explicit toggles exist in formData → use them
 * 2. Else, smart auto-enable based on existing data:
 *    - insideAppliances = true if kitchen addons exist OR degrease/cabinet override set
 *    - windowInventory = true if kitchen windows exist
 * 3. Otherwise → false (default OFF for extras feel)
 */
export function getKitchenSectionToggles(formData: BookingFormData): KitchenSectionToggles {
  const toggles = (formData as any).roomSectionToggles?.kitchen;
  
  // If explicit toggles exist and are set, use them
  if (toggles && typeof toggles.insideAppliances === 'boolean') {
    return {
      insideAppliances: toggles.insideAppliances,
      windowInventory: toggles.windowInventory ?? false,
    };
  }
  
  // Smart auto-enable: infer from existing data
  // This ensures users with existing selections don't lose them
  const kitchenAddons = (formData as any).roomAddons?.kitchen || [];
  const kitchenDegreaseLevel = (formData as any).kitchenDegreaseLevel;
  const kitchenCabinetOverride = (formData as any).kitchenCabinetOverride;
  const kitchenWindows = (formData.roomWindowSelections || [])
    .filter((w: any) => w.roomId === 'kitchen');
  
  // Infer insideAppliances: true if any kitchen addon, degrease, or cabinet override exists
  const hasApplianceData = kitchenAddons.length > 0 || 
    (kitchenDegreaseLevel && kitchenDegreaseLevel !== 'light') ||
    (kitchenCabinetOverride && kitchenCabinetOverride !== 'typical');
  
  // Infer windowInventory: true if kitchen windows exist
  const hasWindowData = kitchenWindows.length > 0 && 
    kitchenWindows.some((w: any) => (w.windowCount || 0) > 0);
  
  return {
    insideAppliances: hasApplianceData,
    windowInventory: hasWindowData,
  };
}

// ============= APPLIANCE ADDON IDS =============

/**
 * List of addon IDs that belong to the "Inside Appliances" section.
 * Used for data hygiene when toggling OFF.
 */
export const INSIDE_APPLIANCE_ADDON_IDS = [
  'oven',
  'fridge_empty',
  'cabinets',           // Lower/Base Cabinets
  'upper_cabinets',     // Upper Cabinets Inside
  'hood',               // Range Hood
  'degrease',           // Heavy Degrease Mode
  'kitchen_cabinets',   // Alternative key for cabinets
];

/**
 * Check if an addon ID belongs to the Inside Appliances section.
 */
export function isInsideApplianceAddon(addonId: string): boolean {
  return INSIDE_APPLIANCE_ADDON_IDS.includes(addonId);
}

// ============= DATA HYGIENE HELPERS =============

/**
 * Filter kitchen addons based on toggle state.
 * When toggle is OFF, returns empty array.
 */
export function getGatedKitchenAddons(
  formData: BookingFormData
): Array<{ addonId: string; quantity: number }> {
  const toggles = getKitchenSectionToggles(formData);
  
  if (!toggles.insideAppliances) {
    return [];
  }
  
  return (formData as any).roomAddons?.kitchen || [];
}

/**
 * Filter room window selections to exclude kitchen when toggle is OFF.
 */
export function getGatedRoomWindowSelections(
  formData: BookingFormData
): any[] {
  const toggles = getKitchenSectionToggles(formData);
  const selections = formData.roomWindowSelections || [];
  
  if (!toggles.windowInventory) {
    return selections.filter((s: any) => s.roomId !== 'kitchen');
  }
  
  return selections;
}

/**
 * Get kitchen window selection only if toggle is ON.
 */
export function getGatedKitchenWindowSelection(
  formData: BookingFormData
): any | undefined {
  const toggles = getKitchenSectionToggles(formData);
  
  if (!toggles.windowInventory) {
    return undefined;
  }
  
  return (formData.roomWindowSelections || []).find((w: any) => w.roomId === 'kitchen');
}
