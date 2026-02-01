// Strategic Room-Based Window and Blinds Configuration
// Maps home spaces to window cleaning logistics
// ============= VISUAL WINDOW INVENTORY ENGINE =============

// ========== WINDOW TYPE CATALOG ==========
// Technical window types with per-side pricing from South Coast price list

export type WindowCategory = 'standard' | 'complex' | 'architectural' | 'patio';

export interface WindowType {
  id: string;
  labelKey: string;
  icon: string;
  emoji: string;
  pricePerSide: number;
  laborMinutes: number;
  category: WindowCategory;
  description: string;
  descriptionKey: string;
}

export const WINDOW_TYPES: Record<string, WindowType> = {
  // === STANDARD WINDOWS ($5/side) ===
  double_hung: {
    id: 'double_hung',
    labelKey: 'wintype.double_hung',
    icon: 'LayoutGrid',
    emoji: '⬜',
    pricePerSide: 5,
    laborMinutes: 4.5,
    category: 'standard',
    description: 'Classic two-sash vertical slider',
    descriptionKey: 'wintype.double_hung_desc',
  },
  two_lite_slider: {
    id: 'two_lite_slider',
    labelKey: 'wintype.two_lite_slider',
    icon: 'PanelLeftClose',
    emoji: '↔️',
    pricePerSide: 5,
    laborMinutes: 4.5,
    category: 'standard',
    description: '2-panel horizontal liftout slider',
    descriptionKey: 'wintype.two_lite_slider_desc',
  },
  casement: {
    id: 'casement',
    labelKey: 'wintype.casement',
    icon: 'DoorOpen',
    emoji: '🚪',
    pricePerSide: 5,
    laborMinutes: 4.5,
    category: 'standard',
    description: 'Hinged - swings outward with crank',
    descriptionKey: 'wintype.casement_desc',
  },
  hopper: {
    id: 'hopper',
    labelKey: 'wintype.hopper',
    icon: 'ChevronsDown',
    emoji: '⬇️',
    pricePerSide: 5,
    laborMinutes: 4,
    category: 'standard',
    description: 'Tilts inward from bottom',
    descriptionKey: 'wintype.hopper_desc',
  },
  awning: {
    id: 'awning',
    labelKey: 'wintype.awning',
    icon: 'ChevronsUp',
    emoji: '⬆️',
    pricePerSide: 5,
    laborMinutes: 4.5,
    category: 'standard',
    description: 'Hinged at top, opens outward',
    descriptionKey: 'wintype.awning_desc',
  },
  fixed_over_awning: {
    id: 'fixed_over_awning',
    labelKey: 'wintype.fixed_over_awning',
    icon: 'Square',
    emoji: '▫️',
    pricePerSide: 5,
    laborMinutes: 4.5,
    category: 'standard',
    description: 'Fixed panel over awning ventilation',
    descriptionKey: 'wintype.fixed_over_awning_desc',
  },
  garden: {
    id: 'garden',
    labelKey: 'wintype.garden',
    icon: 'Flower2',
    emoji: '🌿',
    pricePerSide: 5,
    laborMinutes: 5,
    category: 'standard',
    description: 'Box projection - greenhouse style',
    descriptionKey: 'wintype.garden_desc',
  },
  
  // === COMPLEX / LARGE ($8.50 - $10.00/side) ===
  picture_flankers: {
    id: 'picture_flankers',
    labelKey: 'wintype.picture_flankers',
    icon: 'RectangleHorizontal',
    emoji: '🖼️',
    pricePerSide: 8.5,
    laborMinutes: 8,
    category: 'complex',
    description: 'Large picture with double hung flankers',
    descriptionKey: 'wintype.picture_flankers_desc',
  },
  three_lite_slider: {
    id: 'three_lite_slider',
    labelKey: 'wintype.three_lite_slider',
    icon: 'LayoutDashboard',
    emoji: '⬜↔️⬜',
    pricePerSide: 10,
    laborMinutes: 10,
    category: 'complex',
    description: 'Three-panel slider (center fixed or mobile)',
    descriptionKey: 'wintype.three_lite_slider_desc',
  },
  bay: {
    id: 'bay',
    labelKey: 'wintype.bay',
    icon: 'Pentagon',
    emoji: '🏠',
    pricePerSide: 8.5,
    laborMinutes: 8,
    category: 'complex',
    description: '3-panel angular projection (per section)',
    descriptionKey: 'wintype.bay_desc',
  },
  bow: {
    id: 'bow',
    labelKey: 'wintype.bow',
    icon: 'CircleDot',
    emoji: '🌙',
    pricePerSide: 8.5,
    laborMinutes: 8,
    category: 'complex',
    description: '4-5 panel curved projection (per section)',
    descriptionKey: 'wintype.bow_desc',
  },
  
  // === ARCHITECTURAL SPECIALTY ($5.00 - $10.00/piece) ===
  eyebrow: {
    id: 'eyebrow',
    labelKey: 'wintype.eyebrow',
    icon: 'Minus',
    emoji: '◠',
    pricePerSide: 5,
    laborMinutes: 5,
    category: 'architectural',
    description: 'Thin arched decorative top',
    descriptionKey: 'wintype.eyebrow_desc',
  },
  circle_top: {
    id: 'circle_top',
    labelKey: 'wintype.circle_top',
    icon: 'CircleDot',
    emoji: '◠',
    pricePerSide: 10,
    laborMinutes: 9.5,
    category: 'architectural',
    description: 'Half-circle / arch top accent',
    descriptionKey: 'wintype.circle_top_desc',
  },
  quarter_arch: {
    id: 'quarter_arch',
    labelKey: 'wintype.quarter_arch',
    icon: 'CornerUpRight',
    emoji: '⌐',
    pricePerSide: 5,
    laborMinutes: 5,
    category: 'architectural',
    description: 'Quarter-round corner accent',
    descriptionKey: 'wintype.quarter_arch_desc',
  },
  triangle: {
    id: 'triangle',
    labelKey: 'wintype.triangle',
    icon: 'Triangle',
    emoji: '△',
    pricePerSide: 5,
    laborMinutes: 4.5,
    category: 'architectural',
    description: 'Triangular gable accent',
    descriptionKey: 'wintype.triangle_desc',
  },
  trapezoid: {
    id: 'trapezoid',
    labelKey: 'wintype.trapezoid',
    icon: 'Hexagon',
    emoji: '⬠',
    pricePerSide: 5,
    laborMinutes: 4.5,
    category: 'architectural',
    description: 'Trapezoidal accent window',
    descriptionKey: 'wintype.trapezoid_desc',
  },
  octagon: {
    id: 'octagon',
    labelKey: 'wintype.octagon',
    icon: 'Octagon',
    emoji: '⬡',
    pricePerSide: 5,
    laborMinutes: 4.5,
    category: 'architectural',
    description: 'Octagonal decorative window',
    descriptionKey: 'wintype.octagon_desc',
  },
  full_circle: {
    id: 'full_circle',
    labelKey: 'wintype.full_circle',
    icon: 'Circle',
    emoji: '○',
    pricePerSide: 5,
    laborMinutes: 5,
    category: 'architectural',
    description: 'Full round porthole window',
    descriptionKey: 'wintype.full_circle_desc',
  },
  cathedral: {
    id: 'cathedral',
    labelKey: 'wintype.cathedral',
    icon: 'Church',
    emoji: '⛪',
    pricePerSide: 5,
    laborMinutes: 6,
    category: 'architectural',
    description: 'Gothic pointed arch window',
    descriptionKey: 'wintype.cathedral_desc',
  },
  
  // === PATIO DOORS ($5.00/panel) ===
  patio_slider: {
    id: 'patio_slider',
    labelKey: 'wintype.patio_slider',
    icon: 'ArrowRightLeft',
    emoji: '🚪',
    pricePerSide: 5,
    laborMinutes: 5,
    category: 'patio',
    description: 'Sliding glass door (per sliding panel)',
    descriptionKey: 'wintype.patio_slider_desc',
  },
  french_door: {
    id: 'french_door',
    labelKey: 'wintype.french_door',
    icon: 'Columns',
    emoji: '🚪🚪',
    pricePerSide: 5,
    laborMinutes: 5,
    category: 'patio',
    description: 'Hinged double doors (per door)',
    descriptionKey: 'wintype.french_door_desc',
  },
};

// Sills & Tracks Add-on Configuration
export const SILLS_TRACKS_CONFIG = {
  id: 'sills_tracks',
  labelKey: 'win.sills_tracks',
  descriptionKey: 'win.sills_tracks_desc',
  pricePerWindow: 3,
  laborMinutes: 3,
  suggestForFlows: ['MOVING'],
} as const;

// Category groupings for drawer UI
export const WINDOW_CATEGORIES: { id: WindowCategory; labelKey: string; label: string }[] = [
  { id: 'standard', labelKey: 'wintype.category_standard', label: 'Standard Windows' },
  { id: 'complex', labelKey: 'wintype.category_complex', label: 'Complex / Large' },
  { id: 'architectural', labelKey: 'wintype.category_architectural', label: 'Architectural' },
  { id: 'patio', labelKey: 'wintype.category_patio', label: 'Patio Doors' },
];

// ========== WINDOW INVENTORY ITEM ==========

export interface WindowInventoryItem {
  typeId: string;
  quantity: number;
  glassMode: 'interior' | 'exterior' | 'both' | null;  // null = deselected (no pricing)
}

// ========== ROOM CONFIGURATION ==========

export interface RoomConfig {
  id: string;
  labelKey: string;
  icon: string;
  emoji: string;
  typicalWindowCount: { min: number; max: number; default: number };
  windowFocus: string;
  focusKey: string;
  laborMinutesPerWindow: number;
  pricePerSide: number;
  suggestBothSides: boolean;
  blindsTypical: 'standard' | 'shutters' | null;
}

export const ROOM_WINDOW_CONFIG: Record<string, RoomConfig> = {
  kitchen: {
    id: 'kitchen',
    labelKey: 'room.kitchen',
    icon: 'ChefHat',
    emoji: '👨‍🍳',
    typicalWindowCount: { min: 1, max: 3, default: 2 },
    windowFocus: 'Grease-prone areas above sink',
    focusKey: 'win.grease_focus',
    laborMinutesPerWindow: 6, // Higher due to grease
    pricePerSide: 5,
    suggestBothSides: true, // Kitchen often needs In/Out
    blindsTypical: 'standard',
  },
  living_dining: {
    id: 'living_dining',
    labelKey: 'room.living_dining',
    icon: 'Sofa',
    emoji: '🛋️',
    typicalWindowCount: { min: 2, max: 6, default: 3 },
    windowFocus: 'Showpiece glass - high visibility',
    focusKey: 'win.showpiece_focus',
    laborMinutesPerWindow: 5,
    pricePerSide: 5,
    suggestBothSides: true, // Living usually needs both
    blindsTypical: 'shutters',
  },
  master_bedroom: {
    id: 'master_bedroom',
    labelKey: 'room.master',
    icon: 'Crown',
    emoji: '👑',
    typicalWindowCount: { min: 2, max: 5, default: 3 },
    windowFocus: 'Premium suite glass',
    focusKey: 'win.premium_focus',
    laborMinutesPerWindow: 5,
    pricePerSide: 5,
    suggestBothSides: true,
    blindsTypical: 'shutters',
  },
  bedroom: {
    id: 'bedroom',
    labelKey: 'room.bedroom',
    icon: 'Bed',
    emoji: '🛏️',
    typicalWindowCount: { min: 1, max: 3, default: 2 },
    windowFocus: 'Privacy glass - interior focused',
    focusKey: 'win.privacy_focus',
    laborMinutesPerWindow: 4.5,
    pricePerSide: 5,
    suggestBothSides: false, // Bedrooms often interior-only
    blindsTypical: 'standard',
  },
  bathroom: {
    id: 'bathroom',
    labelKey: 'room.bathroom',
    icon: 'Bath',
    emoji: '🚿',
    typicalWindowCount: { min: 0, max: 2, default: 1 },
    windowFocus: 'Moisture & water spots',
    focusKey: 'win.moisture_focus',
    laborMinutesPerWindow: 4,
    pricePerSide: 5,
    suggestBothSides: false, // Bathrooms usually interior
    blindsTypical: null, // Bathrooms rarely have blinds
  },
  // NEW: Hallways for transit area window tracking
  hallways: {
    id: 'hallways',
    labelKey: 'room.hallways',
    icon: 'Footprints',
    emoji: '🚶',
    typicalWindowCount: { min: 0, max: 4, default: 1 },
    windowFocus: 'Transit area glass - high traffic',
    focusKey: 'win.transit_focus',
    laborMinutesPerWindow: 4,
    pricePerSide: 5,
    suggestBothSides: false, // Hallway windows usually interior only
    blindsTypical: 'standard',
  },
  // NEW: Stairs as full room type for multi-floor properties
  stairs: {
    id: 'stairs',
    labelKey: 'room.stairs',
    icon: 'Stairs',
    emoji: '🪜',
    typicalWindowCount: { min: 0, max: 4, default: 2 },
    windowFocus: 'Stairwell windows - vertical access challenges',
    focusKey: 'win.stairs_focus',
    laborMinutesPerWindow: 6, // Higher due to access difficulty
    pricePerSide: 5,
    suggestBothSides: false, // Stair windows usually interior only
    blindsTypical: null, // Stairs rarely have blinds
  },
};

export const BLINDS_CONFIG = {
  standard: { 
    price: 15, 
    laborMinutes: 15, 
    labelKey: 'blind.standard',
    icon: 'AlignJustify',
  },
  shutters: { 
    price: 8, 
    laborMinutes: 12, 
    labelKey: 'blind.shutters',
    icon: 'Columns',
  },
} as const;

// Room-based window selection interface
export interface RoomWindowSelection {
  roomId: string;
  roomType: string; // 'kitchen' | 'living_dining' | 'bedroom' | 'bathroom' | 'master_bedroom'
  roomLabel: string;
  // === VISUAL WINDOW INVENTORY ===
  windowInventory: WindowInventoryItem[];  // Typed window inventory
  // Legacy compat (derived from inventory for simple mode)
  windowCount: number;
  glassMode: 'none' | 'interior' | 'exterior' | 'both';
  blindsCount: number;
  blindsType: 'standard' | 'shutters' | null;
  // Sills & Tracks add-on for MOVING flow
  includeSillsTracks?: boolean;
}

// Generate room list from home config
export function generateRoomsFromHomeConfig(
  bedroomCount: number,
  masterBaths: number,
  fullBaths: number,
  halfBaths: number,
  translations: { kitchen: string; living: string; master: string; bedroom: string; bathroom: string; masterBath: string }
): RoomWindowSelection[] {
  const rooms: RoomWindowSelection[] = [];

  // Always include Kitchen
  rooms.push({
    roomId: 'kitchen',
    roomType: 'kitchen',
    roomLabel: translations.kitchen,
    windowInventory: [],
    windowCount: ROOM_WINDOW_CONFIG.kitchen.typicalWindowCount.default,
    glassMode: 'none',
    blindsCount: 0,
    blindsType: null,
  });

  // Always include Living/Dining
  rooms.push({
    roomId: 'living_dining',
    roomType: 'living_dining',
    roomLabel: translations.living,
    windowInventory: [],
    windowCount: ROOM_WINDOW_CONFIG.living_dining.typicalWindowCount.default,
    glassMode: 'none',
    blindsCount: 0,
    blindsType: null,
  });

  // Add bedrooms based on homeSize
  for (let i = 1; i <= bedroomCount; i++) {
    const isMaster = i === 1 && bedroomCount > 1;
    const roomType = isMaster ? 'master_bedroom' : 'bedroom';
    const config = ROOM_WINDOW_CONFIG[roomType];
    
    rooms.push({
      roomId: isMaster ? 'master_bedroom' : `bedroom_${i}`,
      roomType,
      roomLabel: isMaster ? translations.master : `${translations.bedroom} ${i}`,
      windowInventory: [],
      windowCount: config.typicalWindowCount.default,
      glassMode: 'none',
      blindsCount: 0,
      blindsType: null,
    });
  }

  // Add bathrooms based on bath counts
  const totalBaths = masterBaths + fullBaths + halfBaths;
  for (let i = 1; i <= totalBaths; i++) {
    const isMasterBath = i === 1 && masterBaths > 0;
    rooms.push({
      roomId: `bathroom_${i}`,
      roomType: 'bathroom',
      roomLabel: isMasterBath ? translations.masterBath : `${translations.bathroom} ${i}`,
      windowInventory: [],
      windowCount: ROOM_WINDOW_CONFIG.bathroom.typicalWindowCount.default,
      glassMode: 'none',
      blindsCount: 0,
      blindsType: null,
    });
  }

  return rooms;
}

// Calculate room-based window totals
export interface RoomWindowTotals {
  windowPrice: number;
  blindsPrice: number;
  totalPrice: number;
  laborMinutes: number;
  totalWindowsInside: number;
  totalWindowsOutside: number;
  totalBlinds: number;
  breakdown: { roomId: string; roomLabel: string; price: number; minutes: number; description: string }[];
}

export function calculateRoomWindowTotal(selections: RoomWindowSelection[]): RoomWindowTotals {
  let windowPrice = 0;
  let blindsPrice = 0;
  let laborMinutes = 0;
  let totalWindowsInside = 0;
  let totalWindowsOutside = 0;
  let totalBlinds = 0;
  const breakdown: { roomId: string; roomLabel: string; price: number; minutes: number; description: string }[] = [];

  for (const room of selections) {
    const hasInventory = room.windowInventory && room.windowInventory.length > 0;
    const hasLegacySelection = room.glassMode !== 'none';
    const hasBlinds = room.blindsCount > 0;
    
    if (!hasInventory && !hasLegacySelection && !hasBlinds) continue;

    const config = ROOM_WINDOW_CONFIG[room.roomType];
    if (!config) continue;

    let roomWindowPrice = 0;
    let roomLabor = 0;
    let insideCount = 0;
    let outsideCount = 0;
    const descParts: string[] = [];

    // === INVENTORY-BASED PRICING (Visual Window Engine) ===
    if (hasInventory) {
      for (const item of room.windowInventory) {
        const windowType = WINDOW_TYPES[item.typeId];
        if (!windowType || item.glassMode === null) continue;  // Skip null glass modes

        const sideMultiplier = item.glassMode === 'both' ? 2 : 1;
        const itemPrice = item.quantity * windowType.pricePerSide * sideMultiplier;
        const itemLabor = item.quantity * windowType.laborMinutes * sideMultiplier;

        roomWindowPrice += itemPrice;
        roomLabor += itemLabor;

        // Count sides
        if (item.glassMode === 'interior' || item.glassMode === 'both') {
          insideCount += item.quantity;
        }
        if (item.glassMode === 'exterior' || item.glassMode === 'both') {
          outsideCount += item.quantity;
        }

        // Build description with type names
        const typeName = windowType.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const modeLabel = item.glassMode === 'both' ? 'In/Out' : item.glassMode === 'interior' ? 'In' : 'Out';
        descParts.push(`${item.quantity}× ${typeName} (${modeLabel})`);
      }
    }
    // === LEGACY MODE (Simple count-based) ===
    else if (hasLegacySelection) {
      if (room.glassMode === 'interior') {
        insideCount = room.windowCount;
      } else if (room.glassMode === 'exterior') {
        outsideCount = room.windowCount;
      } else if (room.glassMode === 'both') {
        insideCount = room.windowCount;
        outsideCount = room.windowCount;
      }

      roomWindowPrice = (insideCount + outsideCount) * config.pricePerSide;
      roomLabor = (insideCount + outsideCount) * config.laborMinutesPerWindow;

      // Build description
      if (room.glassMode === 'both') {
        descParts.push(`${room.windowCount} Windows (In/Out)`);
      } else if (room.glassMode === 'interior') {
        descParts.push(`${insideCount} Windows (Interior)`);
      } else if (room.glassMode === 'exterior') {
        descParts.push(`${outsideCount} Windows (Exterior)`);
      }
    }

    totalWindowsInside += insideCount;
    totalWindowsOutside += outsideCount;
    totalBlinds += room.blindsCount;

    // Blinds pricing
    const roomBlindsPrice = room.blindsCount * (room.blindsType === 'shutters' ? BLINDS_CONFIG.shutters.price : BLINDS_CONFIG.standard.price);
    roomLabor += room.blindsCount * (room.blindsType === 'shutters' ? BLINDS_CONFIG.shutters.laborMinutes : BLINDS_CONFIG.standard.laborMinutes);

    if (room.blindsCount > 0) {
      descParts.push(`${room.blindsCount} ${room.blindsType === 'shutters' ? 'Shutters' : 'Blinds'}`);
    }

    // Sills & Tracks pricing
    let sillsTracksPrice = 0;
    if (room.includeSillsTracks && (insideCount + outsideCount) > 0) {
      const totalPanes = hasInventory 
        ? room.windowInventory.reduce((sum, item) => sum + item.quantity, 0)
        : room.windowCount;
      sillsTracksPrice = totalPanes * SILLS_TRACKS_CONFIG.pricePerWindow;
      roomLabor += totalPanes * SILLS_TRACKS_CONFIG.laborMinutes;
      descParts.push(`Sills & Tracks ($${sillsTracksPrice})`);
    }

    windowPrice += roomWindowPrice + sillsTracksPrice;
    blindsPrice += roomBlindsPrice;
    laborMinutes += roomLabor;

    if (roomWindowPrice + roomBlindsPrice > 0) {
      breakdown.push({
        roomId: room.roomId,
        roomLabel: room.roomLabel,
        price: roomWindowPrice + roomBlindsPrice,
        minutes: roomLabor,
        description: descParts.join(' + '),
      });
    }
  }

  return {
    windowPrice,
    blindsPrice,
    totalPrice: windowPrice + blindsPrice,
    laborMinutes,
    totalWindowsInside,
    totalWindowsOutside,
    totalBlinds,
    breakdown,
  };
}

// ========== THEMATIC WINDOW ZONES ==========
// Organizes rooms into logical cleaning zones for a professional walkthrough experience

export interface WindowZoneConfig {
  id: string;
  labelKey: string;
  label: string;
  icon: string;
  emoji: string;
  description: string;
  descriptionKey: string;
  roomTypes: string[];
  bgTint: string;
  borderColor: string;
  defaultExpanded: boolean;
}

export const WINDOW_ZONES: Record<string, WindowZoneConfig> = {
  social_core: {
    id: 'social_core',
    labelKey: 'zone.social_core',
    label: 'THE SOCIAL CORE',
    icon: 'Home',
    emoji: '✨',
    description: 'Transparency & Grease — Guest-facing areas',
    descriptionKey: 'zone.social_core_desc',
    roomTypes: ['kitchen', 'living_dining'],
    bgTint: 'from-amber-500/5 to-orange-500/5',
    borderColor: 'border-amber-500/20',
    defaultExpanded: true,
  },
  private_suites: {
    id: 'private_suites',
    labelKey: 'zone.private_suites',
    label: 'PERSONAL RETREATS',
    icon: 'Moon',
    emoji: '🌙',
    description: 'Privacy & Dust — Interior glass focus',
    descriptionKey: 'zone.private_suites_desc',
    roomTypes: ['master_bedroom', 'bedroom'],
    bgTint: 'from-indigo-500/5 to-purple-500/5',
    borderColor: 'border-indigo-500/20',
    defaultExpanded: false,
  },
  sanitary_zones: {
    id: 'sanitary_zones',
    labelKey: 'zone.sanitary',
    label: 'SERVICE AREAS',
    icon: 'Droplets',
    emoji: '💧',
    description: 'Sanitization — Hard water & steam removal',
    descriptionKey: 'zone.sanitary_desc',
    roomTypes: ['bathroom'],
    bgTint: 'from-cyan-500/5 to-blue-500/5',
    borderColor: 'border-cyan-500/20',
    defaultExpanded: false,
  },
};

// Group rooms by zone
export function groupRoomsByZone(rooms: RoomWindowSelection[]): Record<string, RoomWindowSelection[]> {
  return {
    social_core: rooms.filter(r => ['kitchen', 'living_dining'].includes(r.roomType)),
    private_suites: rooms.filter(r => ['master_bedroom', 'bedroom'].includes(r.roomType)),
    sanitary_zones: rooms.filter(r => r.roomType === 'bathroom'),
  };
}

// Calculate zone-specific total
export function calculateZoneTotal(rooms: RoomWindowSelection[]): number {
  return rooms.reduce((sum, room) => {
    const config = ROOM_WINDOW_CONFIG[room.roomType];
    if (!config) return sum;
    
    let price = 0;
    if (room.glassMode === 'interior' || room.glassMode === 'exterior') {
      price += room.windowCount * config.pricePerSide;
    } else if (room.glassMode === 'both') {
      price += room.windowCount * 2 * config.pricePerSide;
    }
    if (room.blindsCount > 0) {
      price += room.blindsCount * (room.blindsType === 'shutters' ? BLINDS_CONFIG.shutters.price : BLINDS_CONFIG.standard.price);
    }
    return sum + price;
  }, 0);
}

// Count selected rooms in a zone
export function countZoneSelections(rooms: RoomWindowSelection[]): number {
  return rooms.filter(r => r.glassMode !== 'none' || r.blindsCount > 0).length;
}

// ========== INCLUDED WINDOWS DISCOUNT (Deep/Move flows) ==========
// Calculates the discount for pre-included windows in Deep Reset and Move-In/Out flows
// Rules: Kitchen (1 free), Living (1 slider free), Bedrooms (2 each free), interior-only

export interface IncludedWindowsDiscount {
  roomId: string;
  includedCount: number;      // Windows covered at $0
  includedValue: number;      // Dollar value of discount
  chargedCount: number;       // Windows that get charged
  chargedPrice: number;       // Price for charged windows
}

export interface IncludedWindowsResult {
  discounts: IncludedWindowsDiscount[];
  totalDiscount: number;
  totalCharged: number;
}

// Maximum included windows per room type (interior-only)
// PREMIUM WINDOW CLEANING MAP - Crystal Clear Included Rules
// 
// CRITICAL POLICY TYPES:
// - PER_ROOM: Each individual room (bedroom_1, bedroom_2, etc.) gets its own allowance
// - AGGREGATE: All rooms of this type SHARE a single allowance (e.g., all hallway entries share 2 total)

export type IncludedWindowPolicy = 'PER_ROOM' | 'AGGREGATE';

export interface IncludedWindowLimit {
  count: number; 
  scopeType: 'interior' | 'both';  // What scope is included
  policy: IncludedWindowPolicy;     // PER_ROOM vs AGGREGATE
  preferredType?: string;
  emoji: string;
  labelKey: string;
  descriptionKey: string;
}

export const INCLUDED_WINDOW_LIMITS: Record<string, IncludedWindowLimit> = {
  kitchen: { 
    count: 1, 
    scopeType: 'interior',
    policy: 'PER_ROOM',
    emoji: '👨‍🍳',
    labelKey: 'win.included_kitchen',
    descriptionKey: 'win.included_kitchen_desc',  // "1 Inside Window FREE"
  },
  living: {  // Split from living_dining - slider with In & Out
    count: 1, 
    scopeType: 'both',  // Slider includes In & Out
    policy: 'PER_ROOM',
    preferredType: 'patio_slider',
    emoji: '🛋️',
    labelKey: 'win.included_living',
    descriptionKey: 'win.included_living_desc',  // "1 Sliding Door FREE (In & Out)"
  },
  living_dining: {  // Legacy support - same as living
    count: 1, 
    scopeType: 'both',
    policy: 'PER_ROOM',
    preferredType: 'patio_slider',
    emoji: '🛋️',
    labelKey: 'win.included_living',
    descriptionKey: 'win.included_living_desc',
  },
  dining: {  // Separate from living
    count: 1, 
    scopeType: 'interior',
    policy: 'PER_ROOM',
    emoji: '🍽️',
    labelKey: 'win.included_dining',
    descriptionKey: 'win.included_dining_desc',  // "1 Inside Window FREE"
  },
  master_bedroom: { 
    count: 2, 
    scopeType: 'interior',
    policy: 'PER_ROOM',  // EACH bedroom gets 2 FREE
    emoji: '👑',
    labelKey: 'win.included_bedroom',
    descriptionKey: 'win.included_bedroom_desc',  // "2 Inside Windows FREE"
  },
  bedroom: { 
    count: 2, 
    scopeType: 'interior',
    policy: 'PER_ROOM',  // EACH bedroom gets 2 FREE
    emoji: '🛏️',
    labelKey: 'win.included_bedroom',
    descriptionKey: 'win.included_bedroom_desc',  // "2 Inside Windows FREE"
  },
  hallways: { 
    count: 2, 
    scopeType: 'interior',
    policy: 'AGGREGATE',  // 2 FREE TOTAL for all hallways combined
    emoji: '🚶',
    labelKey: 'win.included_hallways',
    descriptionKey: 'win.included_hallways_desc',  // "2 Inside Windows FREE (Total)"
  },
  stairs: {  // Stairs as full room type
    count: 2, 
    scopeType: 'interior',
    policy: 'AGGREGATE',  // 2 FREE TOTAL for all stairs combined
    emoji: '🪜',
    labelKey: 'win.included_stairs',
    descriptionKey: 'win.included_stairs_desc',  // "2 Inside Stair Windows FREE"
  },
};

/**
 * Single source of truth for determining if included windows apply
 * Used everywhere: Card, Sidebar, Review, PDF, Payload
 */
export function isWindowIncludedFlow(
  serviceType: string,
  situation?: string
): boolean {
  // Deep Clean and Move-In/Out get included windows
  const eligibleServices = ['Deep Clean', 'Move-In/Out'];
  if (eligibleServices.includes(serviceType)) return true;
  
  // Also check situation for MOVING flow (covers Move flows)
  if (situation === 'MOVING') return true;
  
  // Standard Clean / Commercial = no included windows
  return false;
}

export function calculateIncludedWindowsDiscount(
  selections: RoomWindowSelection[],
  bedroomCount: number,
  isDeepOrMove: boolean
): IncludedWindowsResult {
  const discounts: IncludedWindowsDiscount[] = [];
  let totalDiscount = 0;
  let totalCharged = 0;

  if (!isDeepOrMove) {
    // No discount for Basic Clean
    return { discounts, totalDiscount: 0, totalCharged: 0 };
  }

  for (const room of selections) {
    const limit = INCLUDED_WINDOW_LIMITS[room.roomType];
    if (!limit) continue; // No included windows for this room type

    const hasInventory = room.windowInventory && room.windowInventory.length > 0;
    if (!hasInventory) continue;

    let remainingIncluded = limit.count;
    let roomDiscount = 0;
    let roomCharged = 0;

    // Process inventory items - only interior-only windows qualify for inclusion
    for (const item of room.windowInventory) {
      const windowType = WINDOW_TYPES[item.typeId];
      if (!windowType) continue;

      // Only interior-only windows qualify for the included discount
      const isInteriorOnly = item.glassMode === 'interior';
      
      for (let i = 0; i < item.quantity; i++) {
        if (isInteriorOnly && remainingIncluded > 0) {
          // This window is included (free)
          remainingIncluded--;
          roomDiscount += windowType.pricePerSide; // Interior only = 1 side
        } else {
          // This window is charged
          const sideMultiplier = item.glassMode === 'both' ? 2 : item.glassMode === null ? 0 : 1;
          roomCharged += windowType.pricePerSide * sideMultiplier;
        }
      }
    }

    if (roomDiscount > 0 || roomCharged > 0) {
      discounts.push({
        roomId: room.roomId,
        includedCount: limit.count - remainingIncluded,
        includedValue: roomDiscount,
        chargedCount: Math.max(0, room.windowInventory.reduce((sum, item) => sum + item.quantity, 0) - (limit.count - remainingIncluded)),
        chargedPrice: roomCharged,
      });
      totalDiscount += roomDiscount;
      totalCharged += roomCharged;
    }
  }

  return { discounts, totalDiscount, totalCharged };
}

// ========== PREMIUM WINDOW CLEANING MAP ==========
// Crystal-clear per-room breakdown with included/billable logic
// Used by: Sidebar, StepReview, PDF, Normalized Payload

export interface WindowMapRoom {
  roomId: string;
  roomType: string;
  roomLabel: string;
  emoji: string;
  scopeType: 'interior' | 'both';
  includedLimit: number;
  includedCount: number;      // Windows covered at $0
  includedValue: number;      // Dollar value of included windows
  billableCount: number;      // Windows that get charged
  billableCost: number;       // Price for charged windows
  totalWindows: number;       // Total windows in this room
  includedDescription: string; // "1 Inside Window FREE" etc.
}

export interface WindowCleaningMapResult {
  rooms: WindowMapRoom[];
  totalIncludedValue: number;
  totalBillableCost: number;
  totalWindows: number;
  totalIncludedWindows: number;
}

/**
 * Calculate per-room window totals with included/billable breakdown
 * Single source of truth for all UI surfaces (Sidebar, Review, PDF, Payload)
 * 
 * POLICY HANDLING:
 * - PER_ROOM: Each individual room gets its own allowance (bedrooms)
 * - AGGREGATE: All rooms of same type share one allowance (hallways, stairs)
 */
export function calcWindowMapByRoom(
  selections: RoomWindowSelection[],
  isDeepOrMove: boolean
): WindowCleaningMapResult {
  const rooms: WindowMapRoom[] = [];
  let totalIncludedValue = 0;
  let totalBillableCost = 0;
  let totalWindows = 0;
  let totalIncludedWindows = 0;

  // === AGGREGATE TRACKING ===
  // Track remaining allowance for AGGREGATE policy types
  const aggregateRemaining: Record<string, number> = {};
  
  // Initialize aggregate pools for room types with AGGREGATE policy
  Object.entries(INCLUDED_WINDOW_LIMITS).forEach(([roomType, limit]) => {
    if (limit.policy === 'AGGREGATE' && isDeepOrMove) {
      aggregateRemaining[roomType] = limit.count;
    }
  });

  // Process each room selection
  for (const room of selections) {
    const hasInventory = room.windowInventory && room.windowInventory.length > 0;
    if (!hasInventory) continue;

    const limit = INCLUDED_WINDOW_LIMITS[room.roomType];
    const config = ROOM_WINDOW_CONFIG[room.roomType];
    
    // Calculate totals for this room
    let roomWindowCount = 0;
    let roomIncludedCount = 0;
    let roomIncludedValue = 0;
    let roomBillableCount = 0;
    let roomBillableCost = 0;
    
    // Determine remaining included allowance based on policy
    let remainingIncluded = 0;
    if (isDeepOrMove && limit) {
      if (limit.policy === 'AGGREGATE') {
        // Use shared pool for this room type
        remainingIncluded = aggregateRemaining[room.roomType] || 0;
      } else {
        // PER_ROOM: each room gets its own full allowance
        remainingIncluded = limit.count;
      }
    }

    for (const item of room.windowInventory) {
      const windowType = WINDOW_TYPES[item.typeId];
      if (!windowType || item.glassMode === null) continue;

      const sideMultiplier = item.glassMode === 'both' ? 2 : 1;
      
      for (let i = 0; i < item.quantity; i++) {
        roomWindowCount++;
        
        // Check if this window qualifies for inclusion
        // Only interior-only OR "both" (for living sliders) can be included
        const qualifiesForInclusion = isDeepOrMove && limit && remainingIncluded > 0 && 
          (item.glassMode === 'interior' || (item.glassMode === 'both' && limit.scopeType === 'both'));
        
        if (qualifiesForInclusion) {
          // This window is included (free)
          remainingIncluded--;
          
          // Update aggregate pool if AGGREGATE policy
          if (limit.policy === 'AGGREGATE') {
            aggregateRemaining[room.roomType] = remainingIncluded;
          }
          
          roomIncludedCount++;
          // Calculate the value that's being included (only if we have real pricing)
          const includedSideMultiplier = limit.scopeType === 'both' ? 2 : 1;
          roomIncludedValue += windowType.pricePerSide * includedSideMultiplier;
        } else {
          // This window is charged
          roomBillableCount++;
          roomBillableCost += windowType.pricePerSide * sideMultiplier;
        }
      }
    }

    if (roomWindowCount > 0) {
      // Build description based on policy
      const policyNote = limit?.policy === 'AGGREGATE' ? ' (Total)' : '';
      const scopeLabel = limit?.scopeType === 'both' ? 'In & Out' : 'Inside';
      
      rooms.push({
        roomId: room.roomId,
        roomType: room.roomType,
        roomLabel: room.roomLabel,
        emoji: limit?.emoji || config?.emoji || '🪟',
        scopeType: limit?.scopeType || 'interior',
        includedLimit: limit?.count || 0,
        includedCount: roomIncludedCount,
        includedValue: roomIncludedValue,
        billableCount: roomBillableCount,
        billableCost: roomBillableCost,
        totalWindows: roomWindowCount,
        includedDescription: isDeepOrMove && limit 
          ? `${limit.count} ${scopeLabel} FREE${policyNote}`
          : 'No included allowance',
      });

      totalIncludedValue += roomIncludedValue;
      totalBillableCost += roomBillableCost;
      totalWindows += roomWindowCount;
      totalIncludedWindows += roomIncludedCount;
    }
  }

  return {
    rooms,
    totalIncludedValue,
    totalBillableCost,
    totalWindows,
    totalIncludedWindows,
  };
}

/**
 * DEV-ONLY: Validate window map consistency
 * Ensures all surfaces agree on included/billable calculations
 * Warns if AGGREGATE policy is violated (e.g., hallways getting > 2 included total)
 */
export function validateWindowMapConsistency(
  formData: { roomWindowSelections?: RoomWindowSelection[]; serviceType: string },
  situation: string | undefined,
  computedWindowTotal: number
): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const isIncludedFlow = isWindowIncludedFlow(formData.serviceType, situation);
  const windowMap = calcWindowMapByRoom(formData.roomWindowSelections || [], isIncludedFlow);
  
  // Check: totalBillableCost should match what pricing engine uses
  if (windowMap.totalBillableCost !== computedWindowTotal) {
    console.warn('[WindowMap Consistency] MISMATCH:', {
      expected: windowMap.totalBillableCost,
      actual: computedWindowTotal,
      diff: windowMap.totalBillableCost - computedWindowTotal,
    });
  }
  
  // Check: AGGREGATE rooms should not exceed their shared limit
  const aggregateTotals: Record<string, number> = {};
  windowMap.rooms.forEach(room => {
    const limit = INCLUDED_WINDOW_LIMITS[room.roomType];
    if (limit?.policy === 'AGGREGATE') {
      aggregateTotals[room.roomType] = (aggregateTotals[room.roomType] || 0) + room.includedCount;
    }
  });
  
  Object.entries(aggregateTotals).forEach(([roomType, totalIncluded]) => {
    const limit = INCLUDED_WINDOW_LIMITS[roomType];
    if (limit && totalIncluded > limit.count) {
      console.warn(`[WindowMap Consistency] AGGREGATE VIOLATION: ${roomType} has ${totalIncluded} included but limit is ${limit.count}`);
    }
  });
  
  // Log success in verbose mode
  console.debug('[WindowMap Consistency] OK - totalBillable:', windowMap.totalBillableCost);
}

/**
 * Get room label for display (used for consistent naming across surfaces)
 */
export function getWindowRoomLabel(roomType: string, roomId: string): string {
  const config = ROOM_WINDOW_CONFIG[roomType];
  if (!config) return roomId;
  
  // Handle bedroom numbering
  if (roomType === 'bedroom' && roomId.startsWith('bedroom_')) {
    const num = parseInt(roomId.replace('bedroom_', ''));
    return `Bedroom ${num}`;
  }
  if (roomType === 'master_bedroom') {
    return 'Primary Bedroom';
  }
  
  // Default labels
  const labels: Record<string, string> = {
    kitchen: 'Kitchen',
    living: 'Living Room',
    living_dining: 'Living Room',
    dining: 'Dining Room',
    hallways: 'Hallways',
    stairs: 'Stairs',
    bathroom: 'Bathroom',
  };
  
  return labels[roomType] || roomType;
}
