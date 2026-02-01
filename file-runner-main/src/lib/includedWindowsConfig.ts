// Included Windows Configuration for Deep Reset and Move-In/Out flows
// These windows are pre-selected at $0 (included in service) - Interior Only

export interface IncludedWindowConfig {
  roomType: string;
  defaultWindowType: string;    // e.g., 'double_hung', 'patio_slider'
  quantity: number;
  glassMode: 'interior';        // Always interior only for included windows
  label: string;
  labelKey: string;
}

// Default included windows per room type (Deep/Move flows only)
export const INCLUDED_WINDOWS_CONFIG: Record<string, IncludedWindowConfig[]> = {
  kitchen: [
    { 
      roomType: 'kitchen', 
      defaultWindowType: 'double_hung', 
      quantity: 1, 
      glassMode: 'interior', 
      label: 'Main Kitchen Window (above sink)',
      labelKey: 'win.included_kitchen_main',
    }
  ],
  living_dining: [
    { 
      roomType: 'living_dining', 
      defaultWindowType: 'patio_slider', 
      quantity: 1, 
      glassMode: 'interior', 
      label: 'Living Room Slider',
      labelKey: 'win.included_living_slider',
    },
    { 
      roomType: 'living_dining', 
      defaultWindowType: 'double_hung', 
      quantity: 1, 
      glassMode: 'interior', 
      label: 'Standard Window',
      labelKey: 'win.included_standard',
    }
  ],
  master_bedroom: [
    { 
      roomType: 'master_bedroom', 
      defaultWindowType: 'double_hung', 
      quantity: 2, 
      glassMode: 'interior', 
      label: 'Standard Windows',
      labelKey: 'win.included_standard_plural',
    }
  ],
  bedroom: [
    { 
      roomType: 'bedroom', 
      defaultWindowType: 'double_hung', 
      quantity: 2, 
      glassMode: 'interior', 
      label: 'Standard Windows',
      labelKey: 'win.included_standard_plural',
    }
  ],
};

// Calculate total included window count for a room type
export function getIncludedWindowCount(roomType: string): number {
  const config = INCLUDED_WINDOWS_CONFIG[roomType];
  if (!config) return 0;
  return config.reduce((sum, w) => sum + w.quantity, 0);
}

// Calculate the value of included windows (for display purposes)
// Uses $5/side for standard windows, interior only = 1 side
export function getIncludedWindowValue(roomType: string): number {
  const config = INCLUDED_WINDOWS_CONFIG[roomType];
  if (!config) return 0;
  // Each included window is $5 (interior only = 1 side)
  return config.reduce((sum, w) => sum + (w.quantity * 5), 0);
}

// Get total included windows value across all rooms
export function getTotalIncludedWindowsValue(bedroomCount: number): number {
  let total = 0;
  
  // Kitchen: 1 window = $5
  total += getIncludedWindowValue('kitchen');
  
  // Living: 2 windows = $10
  total += getIncludedWindowValue('living_dining');
  
  // Bedrooms: 2 windows each = $10/bedroom
  if (bedroomCount > 0) {
    // Master bedroom
    total += getIncludedWindowValue('master_bedroom');
    // Additional bedrooms
    if (bedroomCount > 1) {
      total += (bedroomCount - 1) * getIncludedWindowValue('bedroom');
    }
  }
  
  return total;
}
