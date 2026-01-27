/**
 * Sections Engine — Builds Review/PDF Blocks from Line Items
 * 
 * Transforms computed data into display-ready section blocks.
 * Uses titleKeys (not translated strings) for language independence.
 */

import type { 
  BookingFormData, 
  HomeEntryConfig,
  Addon,
  MicroServiceSelection 
} from '@/contexts/BookingContext';
import type { 
  VisibilityResult, 
  PricingTotals,
  SummaryLineItem,
  ReviewSectionBlock,
  PdfSectionBlock,
  HomeEntrySummary,
  PremiumSpacesSummary,
  UtilityAreasSummary,
  LineItemSection,
  DetailedMappingBlock,
  SpaceMappingItem,
  SpaceMappingAddon,
  HallwayMappingItem,
  StairMappingItem
} from './types';
import { calculateAllMappedAreas, calculateStudioMainSpaceArea, calculateBathroomInventoryTotals } from '@/lib/homeMappingPricing';
import { formatBathroomUnitSummary } from '@/lib/bathroomPresets';
// SSOT: Import canonical addon prices from pricing.ts (single source of truth)
import { addonPrices } from '@/lib/pricing';
// SSOT: Import dynamic kitchen addon pricing (for cabinets, upper_cabinets, degrease)
import { getKitchenAddonPricing } from '@/lib/pricing_kitchen';

// ============= SECTION ORDER =============

const SECTION_ORDER: LineItemSection[] = [
  'core',
  'bedroom',
  'bathroom',
  'hallways',
  'stairs',
  'premium',
  'utility',
  'structures',
  'windows',
  'addons',
  'microServices',
  'logistics',
];

// ============= LINE ITEMS BUILDER =============

export function buildLineItems(
  formData: BookingFormData,
  visibility: VisibilityResult,
  totals: PricingTotals,
  homeEntry: HomeEntryConfig | undefined,
  selectedAddons?: Array<{ value: string; quantity: number }>
): SummaryLineItem[] {
  const items: SummaryLineItem[] = [];
  let orderCounter = 0;
  
  const isDeep = formData.baseServiceLevel === 'Deep Clean' || 
                 formData.baseServiceLevel === 'Move-In/Out';
  
  // === CORE: Base Service ===
  items.push({
    id: 'base_service',
    section: 'core',
    order: orderCounter++,
    titleKey: 'summary.baseService',
    titleParams: { level: formData.baseServiceLevel || 'Standard Clean' },
    enabled: true,
    price: totals.basePrice,
    timeMinutes: 0,
    detailKeys: [
      { key: 'summary.homeSize', params: { size: formData.homeSize || 0 } },
    ],
  });
  
  // === CORE: Entry Zone (FREE - always show for LIVE_HERE/MOVING) ===
  // Entry Zone is always included; show configured details
  if (homeEntry) {
    const entryFeatures: string[] = [];
    if (homeEntry.hasCoatCloset) entryFeatures.push('coatCloset');
    if (homeEntry.hasEntryRugMat) entryFeatures.push('rugMat');
    if (homeEntry.hasGlassAtEntry) entryFeatures.push('glassDoor');
    
    items.push({
      id: 'entry_zone',
      section: 'core',
      order: orderCounter++,
      titleKey: 'homeEntry.entryZone.title',
      enabled: true,
      price: 0,
      timeMinutes: 0,
      isFree: true,
      detailKeys: [
        { key: 'homeEntry.entryZone.style.value', params: { style: homeEntry.entryZoneStyle || 'standard_entry' } },
        { key: 'homeEntry.entryZone.floor.value', params: { floor: homeEntry.entryZoneFloor || 'hardwood_tile' } },
        ...entryFeatures.map(f => ({ key: `homeEntry.features.${f}` })),
      ],
    });
  }
  
  // === STUDIO MAIN SPACE (if studio - replaces Living/Dining) ===
  if (visibility.showStudioMainSpace) {
    const studioConfig = formData.homeMapping?.areas?.studioMainSpace;
    if (studioConfig?.enabled) {
      const studioResult = calculateStudioMainSpaceArea(studioConfig, isDeep);
      
      if (studioResult.price > 0) {
        items.push({
          id: 'studio_main_space',
          section: 'core',  // Part of CORE because it replaces living/dining
          order: orderCounter++,
          titleKey: 'spaces.studio_main_space',
          enabled: true,
          price: studioResult.price,
          timeMinutes: studioResult.timeMinutes,
          detailKeys: [
            { key: 'studio.furniture_density', params: { level: studioConfig.furnitureDensity || 'normal' } },
            studioConfig.studioSize 
              ? { key: 'studio.size_value', params: { size: studioConfig.studioSize } }
              : null,
            studioConfig.structureType
              ? { key: 'studio.structure_value', params: { type: studioConfig.structureType } }
              : null,
          ].filter(Boolean) as SummaryLineItem['detailKeys'],
        });
      }
    }
  }
  
  // === BATHROOMS ===
  if (totals.bathroomTotal > 0) {
    // SSOT: Use bathroomInventory length as primary, fallback to legacy counts
    const inventoryCount = formData.bathroomInventory?.bathrooms?.length || 0;
    const legacyCount = formData.masterBaths + formData.fullBaths + formData.halfBaths;
    const totalBaths = inventoryCount > 0 ? inventoryCount : legacyCount;
    const inventory = formData.bathroomInventory;
    
    // Build detail keys from inventory or fallback to counts
    const detailKeys: SummaryLineItem['detailKeys'] = [];
    
    if (inventory?.bathrooms && inventory.bathrooms.length > 0) {
      // Use inventory for detailed breakdown (max 4 items for compactness)
      inventory.bathrooms.slice(0, 4).forEach((unit) => {
        detailKeys.push({
          key: 'summary.bathroomUnit',
          params: {
            summary: formatBathroomUnitSummary(unit),
          },
        });
      });
      // If more than 4 bathrooms, add a "and X more" note
      if (inventory.bathrooms.length > 4) {
        detailKeys.push({
          key: 'summary.bathroomMore',
          params: { count: inventory.bathrooms.length - 4 },
        });
      }
    } else {
      // Fallback to legacy count display
      if (formData.masterBaths > 0) {
        detailKeys.push({ key: 'summary.masterBaths', params: { count: formData.masterBaths } });
      }
      if (formData.fullBaths > 0) {
        detailKeys.push({ key: 'summary.fullBaths', params: { count: formData.fullBaths } });
      }
      if (formData.halfBaths > 0) {
        detailKeys.push({ key: 'summary.halfBaths', params: { count: formData.halfBaths } });
      }
    }
    
    items.push({
      id: 'bathrooms',
      section: 'bathroom',
      order: orderCounter++,
      titleKey: 'summary.bathrooms',
      titleParams: { count: totalBaths },
      enabled: true,
      price: totals.bathroomTotal,
      timeMinutes: 0,
      detailKeys,
    });
  }
  
  // === HALLWAY LOGISTICS ===
  if (visibility.showHallways && totals.hallwaysTotal > 0) {
    const hallwayCount = formData.hallways?.length || 0;
    const detailKeys: SummaryLineItem['detailKeys'] = [];
    
    if (hallwayCount > 0) {
      detailKeys.push({ 
        key: 'summary.hallwayCount', 
        params: { count: hallwayCount } 
      });
    }
    
    items.push({
      id: 'hallway_logistics',
      section: 'hallways',
      order: orderCounter++,
      titleKey: 'totals.hallway_logistics',
      enabled: true,
      price: totals.hallwaysTotal,
      timeMinutes: 0,
      detailKeys,
    });
  }
  
  // === PREMIUM SPACES ===
  if (visibility.showPremiumSpaces && formData.homeMapping?.areas) {
    const mappedResult = calculateAllMappedAreas(formData.homeMapping.areas, isDeep);
    
    // Mudroom
    if (mappedResult.perArea.mudroom?.price > 0) {
      const config = formData.homeMapping.areas.mudroom;
      items.push({
        id: 'premium_mudroom',
        section: 'premium',
        order: orderCounter++,
        titleKey: 'spaces.mudroom',
        enabled: true,
        price: mappedResult.perArea.mudroom.price,
        timeMinutes: mappedResult.perArea.mudroom.timeMinutes,
        detailKeys: [
          { key: 'summary.size', params: { size: config.size } },
          config.heavySoil !== 'none' 
            ? { key: 'summary.heavySoil', params: { level: config.heavySoil } } 
            : null,
        ].filter(Boolean) as SummaryLineItem['detailKeys'],
      });
    }
    
    // Den
    if (mappedResult.perArea.den?.price > 0) {
      const config = formData.homeMapping.areas.den;
      items.push({
        id: 'premium_den',
        section: 'premium',
        order: orderCounter++,
        titleKey: 'spaces.den',
        enabled: true,
        price: mappedResult.perArea.den.price,
        timeMinutes: mappedResult.perArea.den.timeMinutes,
        detailKeys: [
          { key: 'summary.size', params: { size: config.size } },
          { key: 'summary.primaryUse', params: { use: config.primaryUse } },
          config.clutterLevel !== 'low' 
            ? { key: 'summary.clutterLevel', params: { level: config.clutterLevel } } 
            : null,
        ].filter(Boolean) as SummaryLineItem['detailKeys'],
      });
    }
  }
  
  // === UTILITY AREAS ===
  if (visibility.showUtilityAreas && formData.homeMapping?.areas) {
    const mappedResult = calculateAllMappedAreas(formData.homeMapping.areas, isDeep);
    
    // Filter out office for studios AND 1BR homes (workspace is in main living area)
    const utilityKeys = (visibility.isStudio || visibility.isOneBedroom)
      ? ['laundry', 'garage', 'patio']  // Exclude office for studio/1BR
      : ['office', 'laundry', 'garage', 'patio'];
    
    utilityKeys.forEach(areaKey => {
      const result = mappedResult.perArea[areaKey as keyof typeof mappedResult.perArea];
      if (result && result.price > 0) {
        items.push({
          id: `utility_${areaKey}`,
          section: 'utility',
          order: orderCounter++,
          titleKey: `spaces.${areaKey}`,
          enabled: true,
          price: result.price,
          timeMinutes: result.timeMinutes,
          detailKeys: [],
        });
      }
    });
  }
  
  // === VERTICAL SURCHARGE ===
  if (totals.verticalSurcharge > 0) {
    items.push({
      id: 'vertical_surcharge',
      section: 'logistics',
      order: orderCounter++,
      titleKey: 'summary.verticalSurcharge',
      enabled: true,
      price: totals.verticalSurcharge,
      timeMinutes: 0,
      detailKeys: [],
    });
  }
  
  // === FREQUENCY DISCOUNT ===
  if (totals.frequencyDiscount) {
    items.push({
      id: 'frequency_discount',
      section: 'logistics',
      order: orderCounter++,
      titleKey: 'summary.frequencyDiscount',
      titleParams: { 
        label: totals.frequencyDiscount.label,
        percent: totals.frequencyDiscount.percent 
      },
      enabled: true,
      price: -totals.frequencyDiscount.amount,
      timeMinutes: 0,
      detailKeys: [],
    });
  }
  
  // === ADDONS (GLOBAL - from selectedAddons prop) ===
  // Uses canonical addonPrices from pricing.ts (imported at top) - SSOT for all addon pricing
  if (selectedAddons && selectedAddons.length > 0 && totals.addonsTotal > 0) {
    selectedAddons.forEach((addon, idx) => {
      // Use canonical addonPrices from pricing.ts (SSOT)
      const price = addonPrices[addon.value] || 0;
      items.push({
        id: `addon_${addon.value}`,
        section: 'addons',
        order: orderCounter++,
        titleKey: `addon.${addon.value}`,
        titleParams: { qty: addon.quantity },
        enabled: true,
        price: price * addon.quantity,
        timeMinutes: 0,
        detailKeys: [],
        scope: 'global',
        origin: 'selected',
      });
    });
  }
  
  // === PER-SPACE ADDONS (Kitchen, Bedroom - from formData.roomAddons) ===
  // Gate by excludedSpaces - if space is excluded, skip its addons
  const excludedSpaces = formData.excludedSpaces || [];
  
  // Kitchen addons (RoomAddonSelection[] with addonId + quantity)
  // SSOT FIX: Use dynamic pricing for cabinet-related addons
  const DYNAMIC_KITCHEN_ADDONS = ['cabinets', 'upper_cabinets', 'kitchen_cabinets_degrease'];
  
  if (!excludedSpaces.includes('kitchen') && formData.roomAddons?.kitchen) {
    formData.roomAddons.kitchen.forEach((selection) => {
      let price = 0;
      
      // Use dynamic pricing for cabinet addons (SSOT from pricing_kitchen.ts)
      if (DYNAMIC_KITCHEN_ADDONS.includes(selection.addonId)) {
        const kitchenPricing = getKitchenAddonPricing(
          selection.addonId,
          formData.homeSize || 2,
          formData.propertyType,
          formData.squareFootageRange,
          (formData as any).kitchenCabinetOverride,
          (formData as any).kitchenDegreaseLevel,
          (formData as any).kitchenCabinetComplexity
        );
        price = kitchenPricing?.price || 0;
      } else {
        // Use static pricing for other addons
        price = addonPrices[selection.addonId] || 0;
      }
      
      if (price > 0) {
        items.push({
          id: `addon_kitchen_${selection.addonId}`,
          section: 'addons',
          order: orderCounter++,
          titleKey: `addon.${selection.addonId}`,
          titleParams: { qty: selection.quantity },
          enabled: true,
          price: price * selection.quantity,
          timeMinutes: 0,
          detailKeys: [],
          scope: 'space:kitchen',
          origin: 'selected',
        });
      }
    });
  }
  
  // Living room addons
  if (!excludedSpaces.includes('living') && formData.roomAddons?.living) {
    formData.roomAddons.living.forEach((selection) => {
      const price = addonPrices[selection.addonId] || 0;
      if (price > 0) {
        items.push({
          id: `addon_living_${selection.addonId}`,
          section: 'addons',
          order: orderCounter++,
          titleKey: `addon.${selection.addonId}`,
          titleParams: { qty: selection.quantity },
          enabled: true,
          price: price * selection.quantity,
          timeMinutes: 0,
          detailKeys: [],
          scope: 'space:living',
          origin: 'selected',
        });
      }
    });
  }
  
  // Bedroom addons (per bedroom: bed_0, bed_1, etc.)
  if (formData.roomAddons?.bedrooms) {
    Object.entries(formData.roomAddons.bedrooms).forEach(([bedroomId, addons]) => {
      // Skip if bedroom is excluded
      if (excludedSpaces.includes(bedroomId) || excludedSpaces.includes('bedrooms')) return;
      
      addons.forEach((selection) => {
        const price = addonPrices[selection.addonId] || 0;
        if (price > 0) {
          items.push({
            id: `addon_${bedroomId}_${selection.addonId}`,
            section: 'addons',
            order: orderCounter++,
            titleKey: `addon.${selection.addonId}`,
            titleParams: { qty: selection.quantity },
            enabled: true,
            price: price * selection.quantity,
            timeMinutes: 0,
            detailKeys: [],
            scope: `space:${bedroomId}`,
            origin: 'selected',
          });
        }
      });
    });
  }
  
  return items;
}

// ============= DETAILED MAPPING BLOCK BUILDER (NEW SSOT) =============

const FLOOR_TYPE_LABELS: Record<string, string> = {
  'hardwood_tile': 'Hardwood / Tile',
  'carpet': 'Carpet',
  'stone': 'Stone',
  'mixed': 'Mixed',
};

const SPACE_DISPLAY_NAMES: Record<string, string> = {
  'kitchen': 'Kitchen',
  'living': 'Living Room',
  'dining': 'Dining Room',
  'bed_0': 'Bedroom 1',
  'bed_1': 'Bedroom 2',
  'bed_2': 'Bedroom 3',
  'bed_3': 'Bedroom 4',
  'bed_4': 'Bedroom 5',
  'hallway': 'Hallway',
  'stairs': 'Stairs',
  'entry': 'Entry Zone',
};

/**
 * Build per-space mapping block for SSOT consumption.
 * This is THE source of truth for floor types and per-space addons in Review/PDF.
 */
export function buildDetailedMappingBlock(
  formData: BookingFormData,
  visibility: VisibilityResult
): DetailedMappingBlock {
  const spaces: SpaceMappingItem[] = [];
  const excludedSpaces = formData.excludedSpaces || [];
  
  // Helper to get floor type label
  const getFloorLabel = (floorType: string | null | undefined): string | null => {
    if (!floorType) return null;
    return FLOOR_TYPE_LABELS[floorType] || floorType;
  };
  
  // Helper to get addons for a space (SSOT: uses dynamic pricing for kitchen cabinet addons)
  const DYNAMIC_KITCHEN_ADDONS = ['cabinets', 'upper_cabinets', 'kitchen_cabinets_degrease'];
  
  const getSpaceAddons = (spaceKey: string): SpaceMappingAddon[] => {
    const addons: SpaceMappingAddon[] = [];
    const roomAddons = formData.roomAddons;
    
    if (!roomAddons) return addons;
    
    // Get selections based on space type
    let selections: { addonId: string; quantity: number }[] = [];
    
    if (spaceKey === 'kitchen' && roomAddons.kitchen) {
      selections = roomAddons.kitchen;
    } else if (spaceKey === 'living' && roomAddons.living) {
      selections = roomAddons.living;
    } else if (spaceKey === 'dining' && roomAddons.dining) {
      selections = roomAddons.dining;
    } else if (spaceKey.startsWith('bed_') && roomAddons.bedrooms?.[spaceKey]) {
      selections = roomAddons.bedrooms[spaceKey];
    }
    
    selections.forEach((sel) => {
      let price = 0;
      
      // Use dynamic pricing for kitchen cabinet addons (SSOT from pricing_kitchen.ts)
      if (spaceKey === 'kitchen' && DYNAMIC_KITCHEN_ADDONS.includes(sel.addonId)) {
        const kitchenPricing = getKitchenAddonPricing(
          sel.addonId,
          formData.homeSize || 2,
          formData.propertyType,
          formData.squareFootageRange,
          (formData as any).kitchenCabinetOverride,
          (formData as any).kitchenDegreaseLevel,
          (formData as any).kitchenCabinetComplexity
        );
        price = kitchenPricing?.price || 0;
      } else {
        price = addonPrices[sel.addonId] || 0;
      }
      
      addons.push({
        addonId: sel.addonId,
        label: sel.addonId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        price: price * sel.quantity,
        qty: sel.quantity,
        origin: 'selected',
      });
    });
    
    return addons;
  };
  
  // Helper to get floor level for a space (SSOT from roomFloorLocations)
  // SSOT RULE #12: Multi-floor unmapped = null (triggers "Floor TBD"), single-floor = Floor 1
  const getFloorLevel = (spaceKey: string): number | null => {
    const locations = formData.roomFloorLocations;
    
    // Determine if property is multi-floor
    const isHouse = formData.propertyType === 'house';
    const levels = isHouse 
      ? (formData.houseLevels || 1) 
      : (formData.apartmentUnitLevels || 1);
    const isMultiFloor = levels > 1;
    
    // Helper to apply fallback logic
    const applyFallback = (explicitFloor: number | null | undefined): number | null => {
      if (explicitFloor != null) return explicitFloor;
      // Single-floor property: default to Floor 1
      // Multi-floor property: return null (triggers "Floor TBD" in PDF)
      return isMultiFloor ? null : 1;
    };
    
    // Handle bedrooms separately (nested structure)
    if (spaceKey.startsWith('bed_')) {
      const bedroomFloor = locations?.bedrooms?.[spaceKey];
      return applyFallback(bedroomFloor);
    }
    
    // Direct space keys (kitchen, living, dining)
    if (spaceKey === 'kitchen') return applyFallback(locations?.kitchen);
    if (spaceKey === 'living') return applyFallback(locations?.living);
    if (spaceKey === 'dining') return applyFallback(locations?.dining);
    
    return null;
  };
  
  // Core Spaces (SERVICE-INCLUDED)
  // Kitchen
  spaces.push({
    spaceKey: 'kitchen',
    displayName: SPACE_DISPLAY_NAMES['kitchen'],
    floorType: getFloorLabel(formData.spaceFloorTypes?.kitchen),
    floorLevel: getFloorLevel('kitchen'),
    isExcluded: excludedSpaces.includes('kitchen'),
    origin: 'included',
    addons: excludedSpaces.includes('kitchen') ? [] : getSpaceAddons('kitchen'),
  });
  
  // Living Room (not for studios)
  if (!visibility.isStudio && visibility.areas.living?.visible) {
    spaces.push({
      spaceKey: 'living',
      displayName: SPACE_DISPLAY_NAMES['living'],
      floorType: getFloorLabel(formData.spaceFloorTypes?.living),
      floorLevel: getFloorLevel('living'),
      isExcluded: excludedSpaces.includes('living'),
      origin: 'included',
      addons: excludedSpaces.includes('living') ? [] : getSpaceAddons('living'),
    });
  }
  
  // Dining Room (not for studios or 1BR)
  if (!visibility.isStudio && !visibility.isOneBedroom && visibility.areas.dining?.visible) {
    spaces.push({
      spaceKey: 'dining',
      displayName: SPACE_DISPLAY_NAMES['dining'],
      floorType: getFloorLabel(formData.spaceFloorTypes?.dining),
      floorLevel: getFloorLevel('dining'),
      isExcluded: excludedSpaces.includes('dining'),
      origin: 'included',
      addons: excludedSpaces.includes('dining') ? [] : getSpaceAddons('dining'),
    });
  }
  
  // Bedrooms
  const bedroomCount = typeof formData.homeSize === 'number' ? formData.homeSize : 0;
  for (let i = 0; i < bedroomCount; i++) {
    const bedroomKey = `bed_${i}`;
    const bedroomFloorType = formData.spaceFloorTypes?.bedrooms?.[bedroomKey];
    
    spaces.push({
      spaceKey: bedroomKey,
      displayName: SPACE_DISPLAY_NAMES[bedroomKey] || `Bedroom ${i + 1}`,
      floorType: getFloorLabel(bedroomFloorType),
      floorLevel: getFloorLevel(bedroomKey),
      isExcluded: excludedSpaces.includes(bedroomKey),
      origin: 'included',
      addons: excludedSpaces.includes(bedroomKey) ? [] : getSpaceAddons(bedroomKey),
    });
  }
  
  // Build hallway mapping items
  const hallways: HallwayMappingItem[] = [];
  if (formData.hallways && formData.hallways.length > 0) {
    formData.hallways.forEach((hw) => {
      hallways.push({
        id: hw.id,
        label: hw.label || hw.id,
        sizeTier: hw.sizeTier || 'MEDIUM',
        floorType: getFloorLabel(hw.floorType),
        floorLevel: hw.floorLevel || null,
        cabinetCount: hw.cabinetCount || 0,
        price: 0, // Computed elsewhere
        timeMinutes: 0,
      });
    });
  }
  
  // Build stair mapping items
  const stairs: StairMappingItem[] = [];
  if (formData.stairs && formData.stairs.length > 0) {
    formData.stairs.forEach((st) => {
      // StairConfig uses fromFloor/toFloor, not stairConnection
      const connectionLabel = st.fromFloor && st.toFloor 
        ? `F${st.fromFloor} → F${st.toFloor}`
        : null;
      
      stairs.push({
        id: st.id,
        label: st.label || st.id,
        surfaceType: st.surfaceType || 'hardwood',
        stepCount: st.stepCount || 12,
        connection: connectionLabel,
        price: 0, // Computed elsewhere
        timeMinutes: 0,
      });
    });
  }
  
  return {
    spaces,
    excludedSpaces,
    hallways,
    stairs,
    hallwayCount: hallways.length,
    stairCount: stairs.length,
  };
}

// ============= REVIEW BLOCKS BUILDER =============

export function buildReviewBlocks(
  lineItems: SummaryLineItem[]
): ReviewSectionBlock[] {
  const blocks: ReviewSectionBlock[] = [];
  
  // Group items by section
  const grouped = new Map<LineItemSection, SummaryLineItem[]>();
  lineItems.forEach(item => {
    const existing = grouped.get(item.section) || [];
    existing.push(item);
    grouped.set(item.section, existing);
  });
  
  // Build blocks in order
  SECTION_ORDER.forEach((section, idx) => {
    const items = grouped.get(section);
    if (items && items.length > 0) {
      blocks.push({
        id: `review_${section}`,
        sectionKey: `summary.section.${section}`,
        order: idx,
        items,
        totalPrice: items.reduce((sum, i) => sum + i.price, 0),
        totalTime: items.reduce((sum, i) => sum + i.timeMinutes, 0),
      });
    }
  });
  
  return blocks;
}

// ============= PDF BLOCKS BUILDER =============

export function buildPdfBlocks(
  formData: BookingFormData,
  lineItems: SummaryLineItem[],
  homeEntry: HomeEntryConfig | undefined,
  totals: PricingTotals
): PdfSectionBlock[] {
  const blocks: PdfSectionBlock[] = [];
  
  // Home Entry Block - Entry Zone Details (FREE)
  if (homeEntry) {
    // Build feature list
    const features: string[] = [];
    if (homeEntry.hasCoatCloset) features.push('Coat Closet');
    if (homeEntry.hasEntryRugMat) features.push('Entry Rug/Mat');
    if (homeEntry.hasGlassAtEntry) features.push('Glass Door/Sidelights');
    
    // Format entry style for display
    const styleLabels: Record<string, string> = {
      'standard_entry': 'Standard Entry',
      'formal_foyer': 'Formal Foyer',
      'combined_living_entry': 'Open to Living',
    };
    
    // Format floor type for display
    const floorLabels: Record<string, string> = {
      'hardwood_tile': 'Hardwood / Tile',
      'carpet': 'Carpet',
      'stone': 'Stone',
    };
    
    blocks.push({
      id: 'pdf_home_entry',
      title: 'HOME ENTRY & ACCESS',
      items: [
        { 
          label: 'Entry Style', 
          value: styleLabels[homeEntry.entryZoneStyle || 'standard_entry'] || 'Standard Entry' 
        },
        { 
          label: 'Entry Floor', 
          value: floorLabels[homeEntry.entryZoneFloor || 'hardwood_tile'] || 'Hardwood / Tile'
        },
        features.length > 0 
          ? { label: 'Features', value: features.join(', ') }
          : null,
        { label: 'Entry Path', value: homeEntry.entryPathType || 'Not specified' },
        // Property Logistics Metadata (conditional)
        homeEntry.studioSubtype
          ? { label: 'Studio Layout', value: { 'open': 'Open Layout', 'alcove': 'Alcove / Sleeping Nook', 'attached_adu': 'Attached ADU / In-law' }[homeEntry.studioSubtype] || homeEntry.studioSubtype }
          : null,
        homeEntry.propertyStyle
          ? { label: 'Property Style', value: homeEntry.propertyStyle === 'detached' ? 'Detached Home' : 'Attached / Townhouse' }
          : null,
        homeEntry.unitPosition
          ? { label: 'Unit Position', value: { 'ground_floor': 'Ground Floor', 'mid_rise': 'Mid-Rise (2-6)', 'high_rise': 'High-Rise (7+)' }[homeEntry.unitPosition] || homeEntry.unitPosition }
          : null,
              // parkingNotes and arrivalInstructions removed per Strategy A - structured mapping only
      ].filter(Boolean) as PdfSectionBlock['items'],
    });
  }
  
  // Service Summary Block
  blocks.push({
    id: 'pdf_service',
    title: 'SERVICE DETAILS',
    items: [
      { label: 'Service Level', value: formData.baseServiceLevel || 'Standard Clean' },
      { label: 'Base Price', value: `$${totals.basePrice}`, price: totals.basePrice },
      { label: 'Bathrooms', value: `$${totals.bathroomTotal}`, price: totals.bathroomTotal },
    ],
  });
  
  // Premium Spaces Block (if any)
  if (totals.premiumSpacesTotal > 0) {
    const premiumItems = lineItems.filter(i => i.section === 'premium');
    blocks.push({
      id: 'pdf_premium',
      title: 'PREMIUM SPACES',
      items: premiumItems.map(item => ({
        label: item.titleKey.split('.').pop() || item.id,
        value: `$${item.price}`,
        price: item.price,
      })),
    });
  }
  
  // Total Block
  blocks.push({
    id: 'pdf_total',
    title: 'TOTAL',
    items: [
      { label: 'Estimated Total', value: `$${totals.grandTotal}`, price: totals.grandTotal },
    ],
  });
  
  return blocks;
}

// ============= SUMMARY EXTRACTORS =============

export function buildHomeEntrySummary(
  homeEntry: HomeEntryConfig | undefined
): HomeEntrySummary {
  if (!homeEntry) {
    return {
      propertyType: null,
      accessMethod: null,
      entryZoneStyle: null,
      entryZoneFloor: null,
      features: [],
      parkingNotes: '',
      arrivalInstructions: '',
    };
  }
  
  const features: string[] = [];
  if (homeEntry.hasCoatCloset) features.push('Coat Closet');
  if (homeEntry.hasEntryRugMat) features.push('Entry Rug/Mat');
  if (homeEntry.hasGlassAtEntry) features.push('Glass Door/Sidelights');
  
  return {
    propertyType: homeEntry.propertyType,
    accessMethod: homeEntry.accessMethod,
    entryZoneStyle: homeEntry.entryZoneStyle,
    entryZoneFloor: homeEntry.entryZoneFloor,
    features,
    parkingNotes: homeEntry.parkingNotes || '',
    arrivalInstructions: homeEntry.arrivalInstructions || '',
  };
}

export function buildPremiumSpacesSummary(
  formData: BookingFormData,
  visibility: VisibilityResult
): PremiumSpacesSummary {
  const isDeep = formData.baseServiceLevel === 'Deep Clean' || 
                 formData.baseServiceLevel === 'Move-In/Out';
  
  let mudroom: PremiumSpacesSummary['mudroom'] = null;
  let den: PremiumSpacesSummary['den'] = null;
  let totalPrice = 0;
  let totalTime = 0;
  
  if (visibility.showPremiumSpaces && formData.homeMapping?.areas) {
    const mappedResult = calculateAllMappedAreas(formData.homeMapping.areas, isDeep);
    
    if (mappedResult.perArea.mudroom?.price > 0) {
      const config = formData.homeMapping.areas.mudroom;
      mudroom = {
        enabled: true,
        size: config.size,
        price: mappedResult.perArea.mudroom.price,
        time: mappedResult.perArea.mudroom.timeMinutes,
      };
      totalPrice += mudroom.price;
      totalTime += mudroom.time;
    }
    
    if (mappedResult.perArea.den?.price > 0) {
      const config = formData.homeMapping.areas.den;
      den = {
        enabled: true,
        size: config.size,
        price: mappedResult.perArea.den.price,
        time: mappedResult.perArea.den.timeMinutes,
        primaryUse: config.primaryUse,
      };
      totalPrice += den.price;
      totalTime += den.time;
    }
  }
  
  return { mudroom, den, totalPrice, totalTime };
}

export function buildUtilityAreasSummary(
  formData: BookingFormData,
  visibility: VisibilityResult
): UtilityAreasSummary {
  const isDeep = formData.baseServiceLevel === 'Deep Clean' || 
                 formData.baseServiceLevel === 'Move-In/Out';
  
  let office: UtilityAreasSummary['office'] = null;
  let laundry: UtilityAreasSummary['laundry'] = null;
  let garage: UtilityAreasSummary['garage'] = null;
  let patio: UtilityAreasSummary['patio'] = null;
  let totalPrice = 0;
  let totalTime = 0;
  
  if (visibility.showUtilityAreas && formData.homeMapping?.areas) {
    const mappedResult = calculateAllMappedAreas(formData.homeMapping.areas, isDeep);
    const areas = formData.homeMapping.areas;
    
    // Office: Only include if NOT a studio AND NOT 1BR (workspace is in main living area)
    if (!visibility.isStudio && !visibility.isOneBedroom && mappedResult.perArea.office?.price > 0) {
      office = {
        enabled: true,
        size: areas.office.size,
        price: mappedResult.perArea.office.price,
        time: mappedResult.perArea.office.timeMinutes,
      };
      totalPrice += office.price;
      totalTime += office.time;
    }
    
    if (mappedResult.perArea.laundry?.price > 0) {
      laundry = {
        enabled: true,
        type: areas.laundry.type,
        size: areas.laundry.size,
        price: mappedResult.perArea.laundry.price,
        time: mappedResult.perArea.laundry.timeMinutes,
      };
      totalPrice += laundry.price;
      totalTime += laundry.time;
    }
    
    if (mappedResult.perArea.garage?.price > 0) {
      garage = {
        enabled: true,
        capacity: areas.garage.capacity,
        price: mappedResult.perArea.garage.price,
        time: mappedResult.perArea.garage.timeMinutes,
      };
      totalPrice += garage.price;
      totalTime += garage.time;
    }
    
    if (mappedResult.perArea.patio?.price > 0) {
      patio = {
        enabled: true,
        type: areas.patio.type,
        size: areas.patio.size,
        price: mappedResult.perArea.patio.price,
        time: mappedResult.perArea.patio.timeMinutes,
      };
      totalPrice += patio.price;
      totalTime += patio.time;
    }
  }
  
  return { office, laundry, garage, patio, totalPrice, totalTime };
}
