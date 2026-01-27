/**
 * Hallway Windows/Blinds Pricing — Central SSOT Helper
 * 
 * Used by BOTH:
 * - homeLayoutModel.ts (HallwayOperations for Review/PDF)
 * - summary/pricing.ts (computePricing for Estimated Today)
 * 
 * This ensures ZERO DRIFT between Estimated Today and Review/PDF.
 */

import { calculateRoomWindowTotal, RoomWindowSelection } from '@/lib/roomWindowConfig';
import { isHallwayRoomId, matchHallwayRoomId } from '@/lib/windows/roomIds';

export interface HallwayWindowBlindsFees {
  windowsFee: number;
  blindsFee: number;
  totalFee: number;
  windowsInterior: number;
  windowsExterior: number;
  blindsCount: number;
}

/**
 * Calculate windows/blinds fees for a SINGLE hallway
 * SSOT: Used by both homeLayoutModel and computePricing
 */
export function calculateHallwayWindowBlindsFees(
  hallwayId: string,
  roomWindowSelections: RoomWindowSelection[]
): HallwayWindowBlindsFees {
  // Find selection for this hallway (backward compat: match both formats)
  const selection = roomWindowSelections.find(r => 
    matchHallwayRoomId(hallwayId, r.roomId)
  );
  
  if (!selection) {
    return { 
      windowsFee: 0, 
      blindsFee: 0, 
      totalFee: 0, 
      windowsInterior: 0, 
      windowsExterior: 0, 
      blindsCount: 0 
    };
  }
  
  const result = calculateRoomWindowTotal([selection]);
  return {
    windowsFee: result.windowPrice,
    blindsFee: result.blindsPrice,
    totalFee: result.totalPrice,
    windowsInterior: result.totalWindowsInside,
    windowsExterior: result.totalWindowsOutside,
    blindsCount: result.totalBlinds,
  };
}

/**
 * Calculate TOTAL windows/blinds fees for ALL hallways
 * SSOT: Used by computePricing for hallwaysTotal
 */
export function calculateAllHallwaysWindowBlindsFees(
  hallways: { id: string }[],
  roomWindowSelections: RoomWindowSelection[]
): { 
  totalWindowsFee: number; 
  totalBlindsFee: number; 
  totalFee: number;
  totalWindowsInterior: number;
  totalWindowsExterior: number;
  totalBlindsCount: number;
} {
  let totalWindowsFee = 0;
  let totalBlindsFee = 0;
  let totalWindowsInterior = 0;
  let totalWindowsExterior = 0;
  let totalBlindsCount = 0;
  
  for (const hw of hallways) {
    const fees = calculateHallwayWindowBlindsFees(hw.id, roomWindowSelections);
    totalWindowsFee += fees.windowsFee;
    totalBlindsFee += fees.blindsFee;
    totalWindowsInterior += fees.windowsInterior;
    totalWindowsExterior += fees.windowsExterior;
    totalBlindsCount += fees.blindsCount;
  }
  
  return {
    totalWindowsFee,
    totalBlindsFee,
    totalFee: totalWindowsFee + totalBlindsFee,
    totalWindowsInterior,
    totalWindowsExterior,
    totalBlindsCount,
  };
}

/**
 * Filter room window selections to exclude hallway windows
 * Use this to avoid double-counting in global windowsTotal
 */
export function filterNonHallwaySelections(
  roomWindowSelections: RoomWindowSelection[]
): RoomWindowSelection[] {
  return roomWindowSelections.filter(r => !isHallwayRoomId(r.roomId));
}
