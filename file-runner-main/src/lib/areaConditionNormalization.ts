/**
 * Area Condition Normalization — Room ID Mapping + Display Names
 * 
 * Maps internal roomIds to condition categories.
 * Generates available room IDs for condition selector.
 * Provides display names for UI/PDF/Zapier.
 */

import type { BookingFormData } from '@/contexts/BookingContext';
import type { ConditionAreaCategory, AreaConditionSelection } from './areaConditionFees';
import { getBedroomCountFromHomeSize } from '@/lib/pricing_v2';

// ============= TYPES =============

export interface ConditionRoomInfo {
  roomId: string;
  category: ConditionAreaCategory;
  displayName: string;
}

// ============= ROOM ID → CATEGORY MAPPING =============

/**
 * Normalize roomId to condition category.
 * Returns undefined for rooms not tracked by condition system.
 */
export function normalizeRoomIdToConditionCategory(
  roomId: string
): ConditionAreaCategory | undefined {
  if (roomId === 'kitchen') return 'kitchen';
  
  // Bathrooms: bath_master_0, bath_full_1, bath_half_0
  if (roomId.startsWith('bath_')) return 'bathroom';
  
  // Bedrooms: bedroom_1, bedroom_2, etc.
  if (roomId.startsWith('bedroom_')) return 'bedroom';
  
  // Living: living, studio_main_space, dining (fold dining into living)
  if (['living', 'studio_main_space', 'studio_main', 'dining', 'living_dining'].includes(roomId)) {
    return 'living';
  }
  
  // Exclude: office, laundry, garage, patio, mudroom, den, hallways, stairs
  return undefined;
}

// ============= DISPLAY NAME GENERATION =============

/**
 * Get human-readable display name for a roomId.
 * Uses bathroomInventory for bathroom labels.
 * 
 * SSOT: Single function for all display name needs (UI/PDF/Zapier)
 */
export function getRoomDisplayName(
  roomId: string,
  formData: BookingFormData
): string {
  // Kitchen
  if (roomId === 'kitchen') return 'Kitchen';
  
  // Bathrooms: look up from bathroomInventory
  if (roomId.startsWith('bath_')) {
    const bathroom = formData.bathroomInventory?.bathrooms?.find(b => b.id === roomId);
    if (bathroom) {
      // Extract type and index from ID: bath_master_0 → master, 0
      const parts = roomId.split('_');
      const type = parts[1]; // master, full, half
      const idx = parseInt(parts[2] || '0', 10);
      
      // Format: "Master Bathroom", "Full Bathroom 2", "Half Bathroom 1"
      const typeLabel = type === 'master' ? 'Master' : type === 'full' ? 'Full' : 'Half';
      
      // Only show number if there are multiple of this type
      const sameTypeCount = formData.bathroomInventory?.bathrooms?.filter(
        b => b.id.includes(`bath_${type}_`)
      ).length || 1;
      
      if (sameTypeCount > 1 || type !== 'master') {
        return `${typeLabel} Bathroom ${idx + 1}`;
      }
      return `${typeLabel} Bathroom`;
    }
    // Fallback if not in inventory
    return 'Bathroom';
  }
  
  // Bedrooms: bedroom_1, bedroom_2 (no "Master" concept in SSOT)
  if (roomId.startsWith('bedroom_')) {
    const num = parseInt(roomId.replace('bedroom_', ''), 10);
    return `Bedroom ${num}`;
  }
  
  // Living areas
  if (roomId === 'living') return 'Living Room';
  if (roomId === 'studio_main_space' || roomId === 'studio_main') return 'Studio Main Space';
  if (roomId === 'dining') return 'Dining Room';
  if (roomId === 'living_dining') return 'Living/Dining';
  
  // Fallback
  return roomId;
}

// ============= AVAILABLE ROOM IDS GENERATOR =============

/**
 * Get list of available room IDs for condition selector.
 * Uses SSOT fields from formData for bedroom/bathroom counts.
 */
export function getAvailableConditionRoomIds(
  formData: BookingFormData
): ConditionRoomInfo[] {
  const rooms: ConditionRoomInfo[] = [];
  
  // Kitchen (always available)
  rooms.push({
    roomId: 'kitchen',
    category: 'kitchen',
    displayName: 'Kitchen',
  });
  
  // Bathrooms from SSOT: bathroomInventory.bathrooms[]
  if (formData.bathroomInventory?.bathrooms) {
    formData.bathroomInventory.bathrooms.forEach(bathroom => {
      rooms.push({
        roomId: bathroom.id,
        category: 'bathroom',
        displayName: getRoomDisplayName(bathroom.id, formData),
      });
    });
  }
  
  // Bedrooms: generated from homeSize (SSOT used by computePricing)
  // No "Master" concept - all bedrooms are "Bedroom 1", "Bedroom 2", etc.
  const bedroomCount = getBedroomCountFromHomeSize(formData.homeSize);
  for (let i = 1; i <= bedroomCount; i++) {
    rooms.push({
      roomId: `bedroom_${i}`,
      category: 'bedroom',
      displayName: `Bedroom ${i}`,
    });
  }
  
  // Living: studio_main_space (if studio) else living
  const isStudio = bedroomCount === 0;
  if (isStudio) {
    rooms.push({
      roomId: 'studio_main_space',
      category: 'living',
      displayName: 'Studio Main Space',
    });
  } else {
    rooms.push({
      roomId: 'living',
      category: 'living',
      displayName: 'Living Room',
    });
  }
  
  return rooms;
}

// ============= HELPER: Group rooms by category =============

export function groupRoomsByCategory(
  rooms: ConditionRoomInfo[]
): Record<ConditionAreaCategory, ConditionRoomInfo[]> {
  const grouped: Record<ConditionAreaCategory, ConditionRoomInfo[]> = {
    kitchen: [],
    bathroom: [],
    bedroom: [],
    living: [],
  };
  
  for (const room of rooms) {
    grouped[room.category].push(room);
  }
  
  return grouped;
}

// ============= HELPER: Check if a selection exists =============

export function isRoomSelected(
  selections: AreaConditionSelection[],
  roomId: string
): boolean {
  return selections.some(s => s.roomId === roomId);
}
