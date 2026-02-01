/**
 * Stable Room ID Helpers for Window/Blinds Selection
 * 
 * SSOT: All hallway window roomIds must use these helpers
 * to prevent mismatch between UI and pricing.
 */

/**
 * Generate stable roomId for hallway window selections
 * Format: "hallway:hallway_0" (not just "hallway_0")
 */
export function getHallwayRoomId(hallwayId: string): string {
  // If already prefixed, return as-is
  if (hallwayId.startsWith('hallway:')) {
    return hallwayId;
  }
  return `hallway:${hallwayId}`;
}

/**
 * Check if a roomId belongs to a hallway
 */
export function isHallwayRoomId(roomId: string): boolean {
  return roomId.startsWith('hallway:') || roomId.startsWith('hallway_');
}

/**
 * Extract the original hallway ID from a stable roomId
 * "hallway:hallway_0" → "hallway_0"
 * "hallway_0" → "hallway_0" (legacy format)
 */
export function extractHallwayId(roomId: string): string | null {
  if (roomId.startsWith('hallway:')) {
    return roomId.replace('hallway:', '');
  }
  if (roomId.startsWith('hallway_')) {
    return roomId; // Legacy format - return as-is
  }
  return null;
}

/**
 * Match a hallway to its window selection (handles both legacy and new format)
 * Use this in buildHallwayOperations and pricing
 */
export function matchHallwayRoomId(hallwayId: string, roomId: string): boolean {
  // New format: hallway:hallway_0
  if (roomId === getHallwayRoomId(hallwayId)) {
    return true;
  }
  // Legacy format: hallway_0 directly
  if (roomId === hallwayId) {
    return true;
  }
  return false;
}
