import { jsPDF } from 'jspdf';
import { BookingFormData, CustomZones, CustomCounts, Addon, ServiceMode, RecurringStartMode, MicroServiceSelection } from '@/contexts/BookingContext';
import { homeSizeOptions, serviceTypes, addonPrices, pricingData, serviceTypeMap, applianceAddons, extraTouchAddons, windowTypeAddons, blindTypeAddons, oneTimeAddons, recurringAddons, windowAddons, blindAddons, livingAddons, microServices, microServiceEnglishLabels, MICRO_SERVICES_MINIMUM, calculateMicroServicePrice, isHeavyCondition, HOURLY_SQFT_OPTIONS, CLEANING_DENSITY_OPTIONS, ADDON_TIMES } from '@/lib/pricing';
import { calculateEstateHours, getTaskTimeEstimate } from '@/lib/hourlyLogic';
import { calculateVerticalSurcharge, calculatePatioTotal, VERTICAL_SURCHARGES } from '@/lib/pricing_v2';
import { calculateAllUtilityAreasTotal, serializeUtilityAreasForPayload } from '@/lib/homeMappingPricing';
import { DEFAULT_HOME_MAPPING_AREAS } from '@/lib/homeMappingTypes';
import { calculateRoomWindowTotal, calcWindowMapByRoom, isWindowIncludedFlow, INCLUDED_WINDOW_LIMITS } from '@/lib/roomWindowConfig';
import { getAreaTrackingCode } from '@/lib/homeStructureIds';
import { HALLWAY_RATES, HALLWAY_SIZE_INFO } from '@/lib/pricing_hallways';

// ===== PDF LAYOUT CONSTANTS =====
const PDF_CONFIG = {
  // Page settings (US Letter in mm: 215.9 x 279.4)
  pageFormat: 'letter' as const,
  orientation: 'portrait' as const,
  
  // Margins (in mm)
  marginLeft: 20,
  marginRight: 20,
  marginTop: 22,
  marginBottom: 25,
  
  // Typography sizes (in pt)
  fontSize: {
    companyName: 22,
    title: 14,
    subtitle: 9,
    sectionHeader: 10,
    label: 9,
    body: 8,
    small: 7,
    footer: 7,
  },
  
  // Spacing (in mm)
  spacing: {
    sectionGap: 8,
    lineHeight: 3.5,
    paragraphGap: 5,
  }
};

// English labels for PDF (always English regardless of user language)
const EN_LABELS: Record<string, string> = {
  // Home size options
  'opt.studio': 'Studio / 1 Bath',
  'opt.1bed1bath': '1 Bed / 1 Bath',
  'opt.1bed15bath': '1 Bed / 1.5 Bath',
  'opt.2bed1bath': '2 Bed / 1 Bath',
  'opt.2bed15bath': '2 Bed / 1.5 Bath',
  'opt.2bed2bath': '2 Bed / 2 Bath',
  'opt.2bed25bath': '2 Bed / 2.5 Bath',
  'opt.3bed1bath': '3 Bed / 1 Bath',
  'opt.3bed2bath': '3 Bed / 2 Bath',
  'opt.3bed25bath': '3 Bed / 2.5 Bath',
  'opt.3bed3bath': '3 Bed / 3 Bath',
  'opt.4bed2bath': '4 Bed / 2 Bath',
  'opt.4bed3bath': '4 Bed / 3 Bath',
  'opt.4bed4bath': '4 Bed / 4 Bath',
  'opt.5bed3bath': '5 Bed / 3 Bath',
  // Service types
  'st.standard': 'Standard Clean',
  'st.deep': 'Deep Clean',
  'st.move': 'Move-In/Out',
  'st.weekly': 'Weekly Recurring',
  'st.biweekly': 'Bi-Weekly Recurring',
  'st.monthly': 'Monthly Recurring',
  // Appliance add-ons
  'addon.oven': 'Oven Interior (Grease-Free)',
  'addon.fridge_empty': 'Fridge Interior (Sanitized)',
  'addon.fridge_org': 'Fridge Interior + Organize',
  'addon.cabinets': 'Cabinet Interiors (Empty)',
  'addon.hood': 'Range Hood Detail',
  'addon.patio': 'Patio Sweep & Refresh',
  // Extra touch add-ons
  'addon.sheets': 'Fresh Sheets & Made Beds',
  'addon.laundry': 'Laundry Load (Wash Only)',
  'addon.dishwashing': 'Dishwashing (Sink Full)',
  'addon.dishwasher_run': 'Dishwasher Run',
  'addon.organization': 'Organization Add-On',
  'addon.ceiling_fan': 'Ceiling Fan',
  'addon.light_fixture': 'Light Fixture',
  'addon.laundry_room': 'Laundry Room Detail',
  'addon.office_room': 'Office Room Detail',
  'addon.loft_room': 'Loft Area Detail',
  'addon.garage_room': 'Garage Sweep/Tidy',
  'addon.fireplace': 'Fireplace Spot Clean',
  // Legacy window add-ons
  'win.std': 'Standard Window',
  'win.large': 'Large Window',
  'win.patio': 'Patio Door',
  // New window types
  'win.standard': 'Standard Window Pane',
  'win.picture': 'Picture Window (Large)',
  'win.garden': 'Garden Window',
  'win.bay': 'Bay Window',
  'win.bow': 'Bow Window',
  'win.patio_door': 'Patio Door Glass',
  'win.awning': 'Awning Window',
  'win.hopper': 'Hopper Window',
  'win.casement': 'Casement Window',
  'win.doublehung': 'Double Hung / Twin Hung',
  'win.trapezoid': 'Trapezoid / Triangle',
  'win.circle': 'Circle / Octagon / Custom',
  // Blind add-ons
  'blind.std': 'Standard Blinds',
  'blind.venetian': 'Venetian Blinds',
  'blind.vertical': 'Vertical Blinds',
  'blind.shutter': 'Shutters',
  'blind.standard': 'Standard Blinds',
  'blind.shutters': 'Shutters / Venetian',
  // Other
  'addon.pet_hair': 'Pet Hair Removal',
  'addon.living_blinds': 'Living Room Blinds',
};

export interface GeneratePDFParams {
  mode: ServiceMode;
  formData: BookingFormData;
  customZones: CustomZones;
  customCounts: CustomCounts;
  selectedAddons: Addon[];
  selectedMicroServices?: MicroServiceSelection[];
  microServicesMinimumApplied?: boolean;
  microServicesHeavyApplied?: boolean;
  total: number;
  recurringStartMode: RecurringStartMode;
  isRecurring: boolean;
  preferredRateWindow?: string;
  preferredCode?: string;
  preferredValue?: number;
  // Hourly mode parameters
  isHourlyMode?: boolean;
  hourlyRate?: number;
  hourlyTeamSize?: number;
  hourlyLaborHours?: number;
  // Recurring dual pricing
  firstVisitPrice?: number;
  futureVisitsPrice?: number;
  // Renovation mode parameters
  isRenovationMode?: boolean;
  renovationQuote?: {
    total: number;
    hours: number;
    teamSize: number;
    rateApplied: number;
    addonsApplied: string[];
  };
  // Property logistics model (for LIVE_HERE/MOVING flows)
  layoutModel?: import('@/lib/layout/homeLayoutModel').HomeLayoutModel | null;
}

// Get English label for addon
const getAddonEnglishLabel = (value: string): string => {
  const allAddons = [
    ...applianceAddons, 
    ...extraTouchAddons, 
    ...windowTypeAddons, 
    ...blindTypeAddons,
    ...oneTimeAddons, 
    ...recurringAddons, 
    ...windowAddons, 
    ...blindAddons, 
    ...livingAddons
  ];
  const addon = allAddons.find((a) => a.value === value);
  return addon ? (EN_LABELS[addon.labelKey] || addon.labelKey) : value;
};

// Generate unique proposal number
const generateProposalNumber = (): string => {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `NCS-${randomNum}`;
};

// Format date for PDF
const formatDate = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Calculate offer expiry date (5 days from now)
const getOfferExpiry = (): string => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 5);
  return expiry.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Calculate quote validity date (7 days from now)
const getQuoteValidity = (): string => {
  const validity = new Date();
  validity.setDate(validity.getDate() + 7);
  return validity.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Premium Color Palette
const COLORS = {
  brandPrimary: [89, 66, 52] as [number, number, number],
  brandAccent: [166, 124, 82] as [number, number, number],
  textDark: [38, 38, 38] as [number, number, number],
  textMuted: [100, 100, 100] as [number, number, number],
  cardBg: [252, 250, 248] as [number, number, number],
  offerBg: [255, 251, 245] as [number, number, number],
  successGreen: [46, 125, 50] as [number, number, number],
  successGreenBg: [240, 253, 244] as [number, number, number],
  divider: [230, 230, 230] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// Draw a soft rounded card/section background
const drawCardBackground = (
  doc: jsPDF, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  fillColor: [number, number, number] = COLORS.cardBg
) => {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
};

// Draw a subtle line divider
const drawDivider = (
  doc: jsPDF, 
  y: number, 
  leftX: number, 
  rightX: number, 
  color: [number, number, number] = COLORS.divider
) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(leftX, y, rightX, y);
};

// Check if we need a new page and add one if necessary
const checkPageBreak = (doc: jsPDF, yPos: number, neededSpace: number, pageHeight: number): number => {
  const safeBottom = pageHeight - PDF_CONFIG.marginBottom - 15; // Leave space for footer
  if (yPos + neededSpace > safeBottom) {
    doc.addPage();
    return PDF_CONFIG.marginTop;
  }
  return yPos;
};

// Core PDF generation logic (shared between save and blob functions)
function generatePDFDocument(params: GeneratePDFParams): { doc: jsPDF; proposalNumber: string } {
  const { 
    mode, formData, customZones, customCounts, selectedAddons, 
    selectedMicroServices, microServicesMinimumApplied, microServicesHeavyApplied,
    total, recurringStartMode, isRecurring, preferredRateWindow, preferredCode, preferredValue,
    isHourlyMode, hourlyRate, hourlyTeamSize, hourlyLaborHours,
    firstVisitPrice, futureVisitsPrice
  } = params;
  
  const doc = new jsPDF({
    orientation: PDF_CONFIG.orientation,
    unit: 'mm',
    format: PDF_CONFIG.pageFormat,
  });
  
  const proposalNumber = generateProposalNumber();
  const currentDate = formatDate();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Content boundaries
  const contentLeft = PDF_CONFIG.marginLeft;
  const contentRight = pageWidth - PDF_CONFIG.marginRight;
  const contentWidth = contentRight - contentLeft;
  const indentLeft = contentLeft + 4;
  
  let yPos = PDF_CONFIG.marginTop;
  
  // ===== TOP DECORATIVE LINE =====
  doc.setFillColor(...COLORS.brandAccent);
  doc.rect(0, 0, pageWidth, 2.5, 'F');
  
  // ===== HEADER =====
  yPos = 12;
  doc.setFontSize(PDF_CONFIG.fontSize.companyName);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text("Nancy's Cleaning Services", pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Professional Home Care  •  Santa Barbara & Ventura Counties', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 4;
  doc.text('(805) 719-7447  •  info@nancyshousekeepingservice.com', pageWidth / 2, yPos, { align: 'center' });
  
  // Divider
  yPos += 5;
  drawDivider(doc, yPos, contentLeft, contentRight);
  
  // ===== TITLE SECTION =====
  yPos += 8;
  doc.setFontSize(PDF_CONFIG.fontSize.title);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.brandAccent);
  doc.text('Your Personalized Home Cleaning Estimate', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 4;
  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Crafted exclusively for you', pageWidth / 2, yPos, { align: 'center' });
  
  // Metadata row
  yPos += 7;
  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.text(`Prepared: ${currentDate}`, contentLeft, yPos);
  doc.text(`Quote #${proposalNumber}`, contentRight, yPos, { align: 'right' });
  
  // ===== CLIENT INFORMATION CARD =====
  yPos += 6;
  const clientCardStartY = yPos;
  let clientContentY = yPos + 4;
  
  doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('PREPARED FOR', contentLeft + 4, clientContentY);
  
  clientContentY += 5;
  doc.setFontSize(PDF_CONFIG.fontSize.label);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textDark);
  doc.text(`${formData.firstName} ${formData.lastName}`, contentLeft + 4, clientContentY);
  
  clientContentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(...COLORS.textMuted);
  
  // Contact info
  const contactParts: string[] = [];
  if (formData.phone) contactParts.push(formData.phone);
  if (formData.email) contactParts.push(formData.email);
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  •  '), contentLeft + 4, clientContentY);
    clientContentY += 3.5;
  }
  
  // Address
  if (formData.address || formData.city) {
    const addressParts = [formData.address, formData.city].filter(Boolean).join(', ');
    const wrappedAddress = doc.splitTextToSize(addressParts, contentWidth - 10);
    doc.text(wrappedAddress, contentLeft + 4, clientContentY);
    clientContentY += wrappedAddress.length * 3.5;
  }
  
  // Access info
  const accessItems: string[] = [];
  if (formData.gatedCommunity) accessItems.push('Gated');
  if (formData.apartmentComplex) accessItems.push('Complex');
  if (formData.upperFloorNoElevator) accessItems.push('Upper Floor');
  if (accessItems.length > 0) {
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.text(`Access: ${accessItems.join(' • ')}`, contentLeft + 4, clientContentY);
    clientContentY += 3.5;
  }
  
  const clientCardHeight = clientContentY - clientCardStartY + 3;
  drawCardBackground(doc, contentLeft, clientCardStartY - 1, contentWidth, clientCardHeight, COLORS.cardBg);
  
  // Redraw text on top of card (since we drew card after)
  clientContentY = clientCardStartY + 4;
  doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('PREPARED FOR', contentLeft + 4, clientContentY);
  
  clientContentY += 5;
  doc.setFontSize(PDF_CONFIG.fontSize.label);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textDark);
  doc.text(`${formData.firstName} ${formData.lastName}`, contentLeft + 4, clientContentY);
  
  clientContentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(...COLORS.textMuted);
  
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  •  '), contentLeft + 4, clientContentY);
    clientContentY += 3.5;
  }
  
  if (formData.address || formData.city) {
    const addressParts = [formData.address, formData.city].filter(Boolean).join(', ');
    const wrappedAddress = doc.splitTextToSize(addressParts, contentWidth - 10);
    doc.text(wrappedAddress, contentLeft + 4, clientContentY);
    clientContentY += wrappedAddress.length * 3.5;
  }
  
  if (accessItems.length > 0) {
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.text(`Access: ${accessItems.join(' • ')}`, contentLeft + 4, clientContentY);
    clientContentY += 3.5;
  }
  
  yPos = clientCardStartY + clientCardHeight + 4;
  
  // ===== SERVICE DETAILS SECTION =====
  yPos = checkPageBreak(doc, yPos, 25, pageHeight);
  
  doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('SERVICE DETAILS', contentLeft, yPos);
  
  yPos += 5;
  
  if (mode === 'full') {
    // Full Home mode
    const serviceLabel = serviceTypes.find(s => s.value === formData.serviceType);
    const serviceName = serviceLabel ? (EN_LABELS[serviceLabel.labelKey as keyof typeof EN_LABELS] || serviceLabel.value) : formData.serviceType;
    
    // Service type badge
    doc.setFillColor(...COLORS.brandAccent);
    const serviceTextWidth = doc.getTextWidth(serviceName) + 6;
    doc.roundedRect(contentLeft, yPos - 3.5, Math.min(serviceTextWidth, 50), 6, 2, 2, 'F');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text(serviceName, contentLeft + 3, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setTextColor(...COLORS.textDark);
    
    // Home details
    const homeSizeOpt = homeSizeOptions.find(opt => opt.value === formData.homeSize);
    const homeSizeLabel = homeSizeOpt ? (EN_LABELS[homeSizeOpt.labelKey as keyof typeof EN_LABELS] || homeSizeOpt.labelKey) : '';
    
    doc.text(`Home: ${homeSizeLabel}`, indentLeft, yPos);
    yPos += 3.5;
    
    // SSOT: Bathroom count - prioritize inventory over legacy counts
    const inventoryCount = formData.bathroomInventory?.bathrooms?.length || 0;
    const bathroomDisplay = inventoryCount > 0 
      ? `${inventoryCount} Bathroom${inventoryCount !== 1 ? 's' : ''} (detailed inventory)`
      : `Bathrooms: Master ${formData.masterBaths} • Full ${formData.fullBaths} • Half ${formData.halfBaths}`;
    doc.text(bathroomDisplay, indentLeft, yPos);
    yPos += 3.5;
    // Property Type & Vertical Logistics (Smart Move)
    const propertyTypeLabel = formData.propertyType === 'apartment' 
      ? 'Apartment / Condo / Studio' 
      : 'Single Family Home / Townhouse';
    doc.text(`Property: ${propertyTypeLabel}`, indentLeft, yPos);
    
    // Vertical Logistics - House Levels
    if (formData.propertyType === 'house' && formData.houseLevels && formData.houseLevels > 1) {
      yPos += 3.5;
      const levelLabel = formData.houseLevels === 2 ? '2-Story Home' : '3+ Story Home';
      doc.text(`Levels: ${levelLabel}`, indentLeft, yPos);
    }
    
    // Vertical Logistics - Apartment Access
    if (formData.propertyType === 'apartment') {
      yPos += 3.5;
      const floorLabel = `Floor ${formData.apartmentFloor || 1}`;
      const elevatorLabel = formData.hasElevator !== false ? 'Elevator' : 'Walk-Up';
      doc.text(`Access: ${floorLabel} • ${elevatorLabel}`, indentLeft, yPos);
    }
    
    // Move Condition (SSOT: formData.moveCondition replaces deprecated moveOccupancy)
    if (formData.moveCondition) {
      yPos += 3.5;
      const conditionLabel = formData.moveCondition === 'partial_empty' ? 'Partial Empty (Some items remain)' : 'Vacant (Empty)';
      doc.text(`Condition: ${conditionLabel}`, indentLeft, yPos);
    } else if (formData.moveOccupancy) {
      // Legacy fallback for old data
      yPos += 3.5;
      const occupancyLabel = formData.moveOccupancy === 'furnished' ? 'Furnished (+25%)' : 'Vacant';
      doc.text(`Occupancy: ${occupancyLabel}`, indentLeft, yPos);
    }
    
    // Per-Room Floor Types (NEW - Surface Logistics)
    if (formData.spaceFloorTypes) {
      yPos += 3.5;
      doc.setFont('helvetica', 'bold');
      doc.text('Surface Logistics:', indentLeft, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 3.5;
      
      const floorTypeLabel = (type: string) => {
        switch (type) {
          case 'hardwood_tile': return 'Hard Floor';
          case 'carpet': return 'Carpet';
          case 'mixed': return 'Mixed';
          default: return type;
        }
      };
      
      const floorEntries: string[] = [];
      if (formData.spaceFloorTypes.kitchen) floorEntries.push(`Kitchen: ${floorTypeLabel(formData.spaceFloorTypes.kitchen)}`);
      if (formData.spaceFloorTypes.living) floorEntries.push(`Living: ${floorTypeLabel(formData.spaceFloorTypes.living)}`);
      if (formData.spaceFloorTypes.bedrooms) {
        Object.entries(formData.spaceFloorTypes.bedrooms).forEach(([bedId, type]) => {
          const bedNum = parseInt(bedId.replace('bed_', '')) + 1;
          const label = bedNum === 1 ? 'Master' : `Bed ${bedNum}`;
          floorEntries.push(`${label}: ${floorTypeLabel(type)}`);
        });
      }
      
      if (floorEntries.length > 0) {
        doc.text(floorEntries.join(' • '), indentLeft, yPos);
        yPos += 3.5;
      }
    } else if (formData.floorHardwoodPercent !== undefined) {
      // Legacy floor composition fallback
      yPos += 3.5;
      doc.text(`Flooring: Hardwood/Tile ${formData.floorHardwoodPercent}% • Carpet ${formData.floorCarpetPercent}%`, indentLeft, yPos);
      
      if (formData.floorIsFocus) {
        yPos += 3.5;
        doc.setTextColor(...COLORS.successGreen);
        doc.text(`✓ Floor Focus Requested`, indentLeft, yPos);
        doc.setTextColor(...COLORS.textDark);
        
        if (formData.floorFocusNotes) {
          yPos += 3.5;
          doc.setFontSize(PDF_CONFIG.fontSize.small);
          doc.setTextColor(...COLORS.textMuted);
          const wrappedNotes = doc.splitTextToSize(`Floor Notes: ${formData.floorFocusNotes}`, contentWidth - 10);
          doc.text(wrappedNotes, indentLeft, yPos);
          yPos += (wrappedNotes.length - 1) * 3;
          doc.setFontSize(PDF_CONFIG.fontSize.body);
          doc.setTextColor(...COLORS.textDark);
        }
      }
    }
    
    // === UTILITY AREAS (Home Mapping - Single Source of Truth) ===
    const utilityAreas = formData.homeMapping?.areas || DEFAULT_HOME_MAPPING_AREAS;
    const isDeepService = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
    const utilityResult = calculateAllUtilityAreasTotal(utilityAreas, isDeepService);
    
    if (utilityResult.enabledAreas.length > 0) {
      yPos += 6;
      yPos = checkPageBreak(doc, yPos, 25, pageHeight);
      
      // Section header
      doc.setFillColor(235, 245, 255); // Light blue background
      doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246); // Blue text
      doc.text('💼 UTILITY AREAS', contentLeft + 3, yPos);
      
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      
      const areaLabels: Record<string, string> = {
        office: 'Office / Study',
        laundry: 'Laundry Room',
        garage: 'Garage',
        patio: 'Patio / Balcony',
      };
      
      utilityResult.enabledAreas.forEach(areaKey => {
        const areaResult = utilityResult.perArea[areaKey];
        let summary = '';
        
        if (areaKey === 'office') {
          const cfg = utilityAreas.office;
          summary = `${cfg.size} • ${cfg.desks} desk(s)${cfg.hasShelving ? ' • Shelving' : ''}`;
        } else if (areaKey === 'laundry') {
          const cfg = utilityAreas.laundry;
          summary = `${cfg.size} ${cfg.type}${cfg.hasSink ? ' • Sink' : ''}${cfg.hasCabinets ? ' • Cabinets' : ''}`;
        } else if (areaKey === 'garage') {
          const cfg = utilityAreas.garage;
          summary = `${cfg.capacity}-car • ${cfg.storageLevel} storage${cfg.hasOilStains ? ' • Oil stains' : ''}`;
        } else if (areaKey === 'patio') {
          const cfg = utilityAreas.patio;
          summary = `${cfg.size} ${cfg.type}${cfg.hasFurniture ? ' • Furniture' : ''}${cfg.hasGlassRailing ? ' • Glass railing' : ''}`;
        }
        
        doc.text(`• ${areaLabels[areaKey]}: ${summary} (+$${areaResult.price}, ~${areaResult.timeMinutes} min)`, indentLeft, yPos);
        yPos += 3.5;
      });
      
      // Total utility areas
      doc.setFont('helvetica', 'bold');
      doc.text(`Utility Areas Total: +$${utilityResult.totalPrice} (~${utilityResult.totalTimeMinutes} min)`, indentLeft, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 3.5;
    }
    
    // Legacy Functional Zones / Add-on Spaces (Loft only - others migrated to homeMapping)
    const addonSpaces: string[] = [];
    if (formData.loftCount && formData.loftCount > 0) {
      addonSpaces.push(`Loft/Media × ${formData.loftCount}`);
    }
    
    if (addonSpaces.length > 0) {
      yPos += 3.5;
      doc.text(`Additional Spaces: ${addonSpaces.join(' • ')}`, indentLeft, yPos);
    }
    
    // Room Inventory - Patio/Balcony (Legacy - keep for backward compatibility)
    if (formData.patioCount && formData.patioCount > 0 && !utilityAreas.patio.enabled) {
      yPos += 3.5;
      const patioResult = calculatePatioTotal(formData.patioCount, formData.patioScope || 'sweep');
      const patioScopeLabel = formData.patioScope === 'scrub' ? 'Scrub/Wash Down' : 'Sweep & Cobwebs';
      doc.text(`Patio/Balcony: ${formData.patioCount} × ${patioScopeLabel} (+$${patioResult.price})`, indentLeft, yPos);
    }
    
    // Vertical Surcharge Summary
    const verticalResult = calculateVerticalSurcharge({
      propertyType: formData.propertyType,
      houseLevels: formData.houseLevels || 1,
      apartmentFloor: formData.apartmentFloor || 1,
      hasElevator: formData.hasElevator !== false,
    });
    if (verticalResult.surcharge > 0) {
      yPos += 3.5;
      doc.setTextColor(...COLORS.brandAccent);
      doc.text(`${verticalResult.reason} (+$${verticalResult.surcharge})`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textDark);
    }
    
    // === WASTE & HAZARD WARNINGS (Deep/Move flows) ===
    const isDeepOrMove = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
    if (isDeepOrMove) {
      const coreRooms = ['kitchen', 'living', 'dining', 'hallways', 'stairs'];
      const roomLabels: Record<string, string> = {
        kitchen: 'Kitchen',
        living: 'Living Room',
        dining: 'Dining Room',
        hallways: 'Hallways',
        stairs: 'Stairs',
      };
      
      // Include bedrooms in hazard data
      const bedroomIds = Object.keys(formData.bedroomConfigs || {});
      
      // Collect hazard data from core rooms
      const hazardData: Array<{ room: string; label: string; messTypes: string[]; bags: number; sticky: boolean }> = [];
      
      coreRooms.forEach(room => {
        const messTypes = (formData.roomMessTypes as any)?.[room] || [];
        const bags = (formData.roomTrashBags as any)?.[room] || 0;
        const sticky = (formData.roomStickySpills as any)?.[room] || false;
        
        if (messTypes.length > 0 || bags > 0 || sticky) {
          hazardData.push({
            room,
            label: roomLabels[room] || room,
            messTypes,
            bags,
            sticky,
          });
        }
      });
      
      // Add bedroom hazards
      bedroomIds.forEach(bedId => {
        const bags = (formData.roomTrashBags as any)?.bedrooms?.[bedId] || 0;
        const messTypes = (formData.roomMessTypes as any)?.bedrooms?.[bedId] || [];
        const sticky = (formData.roomStickySpills as any)?.bedrooms?.[bedId] || false;
        
        if (bags > 0 || messTypes.length > 0 || sticky) {
          const bedNum = parseInt(bedId.replace('bed_', '')) + 1;
          const label = bedNum === 1 ? 'Master Bedroom' : `Bedroom ${bedNum}`;
          hazardData.push({ room: bedId, label, messTypes, bags, sticky });
        }
      });
      
      if (hazardData.length > 0) {
        yPos += 6;
        yPos = checkPageBreak(doc, yPos, 20, pageHeight);
        
        // Section header
        doc.setFillColor(255, 243, 224); // Warm amber background
        doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
        doc.setFontSize(PDF_CONFIG.fontSize.small);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 100, 20); // Amber text
        doc.text('⚠️ WASTE & HAZARD WARNINGS', contentLeft + 3, yPos);
        
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        
        hazardData.forEach(h => {
          const notes: string[] = [];
          if (h.bags > 0) notes.push(`${h.bags} trash bags`);
          if (h.messTypes.length > 0) notes.push(h.messTypes.map((t: string) => t.replace(/_/g, ' ')).join(', '));
          if (h.sticky) notes.push('STICKY SPILLS - Industrial degreaser recommended');
          
          doc.text(`• ${h.label}: ${notes.join(' | ')}`, indentLeft, yPos);
          yPos += 3.5;
        });
        
        // Total bags row (core + bedrooms)
        let totalBags = coreRooms.reduce((sum, r) => sum + ((formData.roomTrashBags as any)?.[r] || 0), 0);
        bedroomIds.forEach(bedId => {
          totalBags += (formData.roomTrashBags as any)?.bedrooms?.[bedId] || 0;
        });
        
        if (totalBags > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(`Total Trash Bags Estimated: ${totalBags}`, indentLeft, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 3.5;
        }
      }
      
      // === 🍳 KITCHEN OPERATIONS (SSOT via layoutModel) ===
      const kitchenOps = params.layoutModel?.kitchenOperations;
      
      if (kitchenOps && (
        kitchenOps.addons.length > 0 || 
        kitchenOps.pullOutAppliances || 
        kitchenOps.hazards.length > 0 || 
        kitchenOps.trashBags > 2 ||
        kitchenOps.windowsInterior > 0 ||
        kitchenOps.windowsExterior > 0
      )) {
        yPos += 6;
        yPos = checkPageBreak(doc, yPos, 30, pageHeight);
        
        // Section header with orange background
        doc.setFillColor(255, 243, 224); // Light orange
        doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
        doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(194, 65, 12); // Orange text
        doc.text('🍳 KITCHEN OPERATIONS', contentLeft + 3, yPos);
        
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        
        // Inside Appliances add-ons (from SSOT)
        if (kitchenOps.addons.length > 0) {
          doc.text(`• Inside Appliances: ${kitchenOps.addons.join(', ')}`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Pull-out appliances WARNING (from SSOT)
        if (kitchenOps.pullOutAppliances) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(194, 65, 12); // Orange warning
          doc.text('• ⚠️ PULL OUT APPLIANCES → 2-PERSON TEAM REQUIRED', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          doc.setFont('helvetica', 'normal');
          yPos += 3.5;
        }
        
        // Hazards (from SSOT)
        if (kitchenOps.hazards.length > 0 || kitchenOps.hasStickySpills) {
          const hazardList = [...kitchenOps.hazards.map((h: string) => h.replace('_', ' '))];
          if (kitchenOps.hasStickySpills) hazardList.push('Sticky spills');
          doc.text(`• Hazards: ${hazardList.join(', ')}`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Trash bags estimate (from SSOT)
        if (kitchenOps.trashBags > 0) {
          doc.text(`• Trash Bags: ~${kitchenOps.trashBags} bags (bring extras)`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Kitchen windows with breakdown (from SSOT - proper interior/exterior calculation)
        if (kitchenOps.windowsInterior > 0 || kitchenOps.windowsExterior > 0) {
          const paidInterior = Math.max(0, kitchenOps.windowsInterior - 1);
          let windowNote = `Interior: ${kitchenOps.windowsInterior}`;
          if (kitchenOps.windowsInterior >= 1) {
            windowNote += paidInterior > 0 
              ? ` (1 included + ${paidInterior} charged)`
              : ` (included)`;
          }
          if (kitchenOps.windowsExterior > 0) {
            windowNote += ` • Exterior: ${kitchenOps.windowsExterior} (all charged)`;
          }
          doc.text(`• Windows: ${windowNote}`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Blinds (from SSOT)
        if (kitchenOps.blindsCount > 0) {
          const blindsLabel = kitchenOps.blindsType === 'shutters' ? 'Shutters' : 'Blinds';
          doc.text(`• ${blindsLabel}: ${kitchenOps.blindsCount}`, indentLeft, yPos);
          yPos += 3.5;
        }
      }
      
      // === 🛏️ STUDIO OPERATIONS (SSOT via layoutModel) ===
      const studioOps = params.layoutModel?.studioOperations;
      
      if (studioOps) {
        yPos += 6;
        yPos = checkPageBreak(doc, yPos, 35, pageHeight);
        
        // Section header with purple background
        doc.setFillColor(243, 232, 255); // Light purple
        doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
        doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 33, 168); // Purple text
        doc.text('🛏️ STUDIO OPERATIONS', contentLeft + 3, yPos);
        
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        
        // Structure info
        const structureLabel = studioOps.structureType.replace('_', ' ');
        const sizeLabel = studioOps.studioSize.replace('_', '-');
        doc.text(`• Type: ${structureLabel} | Size: ${sizeLabel} sq ft`, indentLeft, yPos);
        yPos += 3.5;
        
        // Sub-areas
        const activeSubAreas = [
          studioOps.subAreas.sleeping && 'Sleeping',
          studioOps.subAreas.lounge && 'Lounge/TV',
          studioOps.subAreas.deskWork && 'Desk/Work',
          studioOps.subAreas.closet && 'Closet',
          studioOps.subAreas.entryNook && 'Entry Nook',
          studioOps.subAreas.balconyDoor && 'Balcony Door',
        ].filter(Boolean);
        
        if (activeSubAreas.length > 0) {
          doc.text(`• Sub-Areas: ${activeSubAreas.join(', ')}`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Floor type if set
        if (studioOps.floorType) {
          doc.text(`• Floor: ${studioOps.floorType.replace('_', ' ')}`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Windows breakdown
        if (studioOps.windowsInterior > 0 || studioOps.windowsExterior > 0) {
          let windowNote = `Interior: ${studioOps.windowsInterior}`;
          if (studioOps.windowsExterior > 0) {
            windowNote += ` • Exterior: ${studioOps.windowsExterior}`;
          }
          doc.text(`• Windows: ${windowNote}`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Blinds (from SSOT)
        if (studioOps.blindsCount > 0) {
          const blindsLabel = studioOps.blindsType === 'shutters' ? 'Shutters' : 'Blinds';
          doc.text(`• ${blindsLabel}: ${studioOps.blindsCount}`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Hazards from SSOT
        const studioHazards = [
          ...studioOps.hazards.map((h: string) => h.replace('_', ' ')),
          studioOps.stickySpills && 'Sticky spills',
          studioOps.petHairRisk && 'Pet hair',
          studioOps.dustLevel === 'heavy' && 'Heavy dust',
        ].filter(Boolean);
        
        if (studioHazards.length > 0) {
          doc.text(`• Hazards: ${studioHazards.join(', ')}`, indentLeft, yPos);
          yPos += 3.5;
        }
        
        // Trash bags
        if (studioOps.trashBags > 0) {
          doc.text(`• Trash Bags: ~${studioOps.trashBags} bags`, indentLeft, yPos);
          yPos += 3.5;
        }
        
      }
      
      // === STAIR LOGISTICS (SSOT: layoutModel.stairOperations) ===
      const stairOps = params.layoutModel?.stairOperations;
      if (stairOps && stairOps.stairs.length > 0) {
        yPos += 6;
        yPos = checkPageBreak(doc, yPos, 20, pageHeight);
        
        // Section header
        doc.setFillColor(255, 248, 225); // Light amber background
        doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
        doc.setFontSize(PDF_CONFIG.fontSize.small);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 100, 20); // Amber text
        doc.text(`🪜 STAIR LOGISTICS (${stairOps.totalCount} Stair${stairOps.totalCount > 1 ? 's' : ''})`, contentLeft + 3, yPos);
        
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        
        // List each stair
        stairOps.stairs.forEach((stair, idx) => {
          const fromFloor = stair.fromFloor.replace('FLOOR_', 'F');
          const toFloor = stair.toFloor.replace('FLOOR_', 'F');
          const surfaceLabel = stair.surfaceType === 'carpet' 
            ? 'Carpet' 
            : stair.surfaceType === 'hardwood' 
              ? 'Hardwood' 
              : 'Runner on Hardwood';
          
          doc.text(`• ${stair.label}: ${fromFloor} → ${toFloor} | ${surfaceLabel} | ${stair.stepCount} steps`, indentLeft, yPos);
          yPos += 3.5;
          
          // Hazards for this stair
          if (stair.hazardLabels.length > 0) {
            stair.hazardLabels.forEach(hazard => {
              doc.text(`  ⚠️ ${hazard}`, indentLeft + 4, yPos);
              yPos += 3;
            });
          }
        });
        
        // Total stair time
        if (stairOps.totalMinutes > 0) {
          yPos += 2;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(180, 100, 20);
          doc.text(`Total Stair Time: ~${stairOps.totalMinutes} min`, indentLeft, yPos);
          if (stairOps.totalHazardMinutes > 0) {
            doc.text(` (includes +${stairOps.totalHazardMinutes} min hazards)`, indentLeft + 50, yPos);
          }
          doc.setTextColor(...COLORS.textDark);
          yPos += 4;
        }
      }
      
      // === HALLWAY TRAFFIC CONDITIONS (if hazards selected) ===
      if (formData.hallwaysConfig) {
        const hallwayConditions: string[] = [];
        if (formData.hallwaysConfig.highTrafficDust) hallwayConditions.push('High-Traffic Dust (+8 min)');
        if (formData.hallwaysConfig.runnerOrRug) hallwayConditions.push('Runner/Area Rug (+10 min)');
        if (formData.hallwaysConfig.wallScuffs) hallwayConditions.push('Wall & Baseboard Scuffs (+12 min)');
        if (formData.hallwaysConfig.galleryWall) hallwayConditions.push('Gallery Wall Detail (+15 min)');
        if (formData.hallwaysConfig.entryDebris) hallwayConditions.push('Entry Mud Zone (+8 min)');
        
        if (hallwayConditions.length > 0) {
          yPos += 6;
          yPos = checkPageBreak(doc, yPos, 20, pageHeight);
          
          // Section header
          doc.setFillColor(255, 250, 240); // Light amber background
          doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
          doc.setFontSize(PDF_CONFIG.fontSize.small);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(180, 100, 20); // Amber text
          doc.text('🚶 HALLWAY TRAFFIC CONDITIONS', contentLeft + 3, yPos);
          
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(PDF_CONFIG.fontSize.body);
          doc.setTextColor(...COLORS.textDark);
          
          // Hallway floor type if available
          if (formData.spaceFloorTypes?.hallways) {
            const floorLabel = formData.spaceFloorTypes.hallways === 'carpet' 
              ? 'Carpet' 
              : formData.spaceFloorTypes.hallways === 'mixed' 
                ? 'Mixed' 
                : 'Hard Floor';
            doc.text(`• Surface: ${floorLabel}`, indentLeft, yPos);
            yPos += 3.5;
          }
          
          // List conditions
          hallwayConditions.forEach(condition => {
            doc.text(`• ⚠️ ${condition}`, indentLeft, yPos);
            yPos += 3.5;
          });
          
          // Total buffer
          let totalBuffer = 0;
          if (formData.hallwaysConfig.highTrafficDust) totalBuffer += 8;
          if (formData.hallwaysConfig.runnerOrRug) totalBuffer += 10;
          if (formData.hallwaysConfig.wallScuffs) totalBuffer += 12;
          if (formData.hallwaysConfig.galleryWall) totalBuffer += 15;
          if (formData.hallwaysConfig.entryDebris) totalBuffer += 8;
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(180, 100, 20);
          doc.text(`Total Hallway Buffer: +${totalBuffer} min`, indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          doc.setFont('helvetica', 'normal');
          yPos += 3.5;
        }
      }
      
      // === HALLWAY LOGISTICS (SSOT via layoutModel) ===
      const hallwayOps = params.layoutModel?.hallwayOperations;
      
      if (hallwayOps && hallwayOps.hallways.length > 0) {
        yPos += 6;
        yPos = checkPageBreak(doc, yPos, 20 + (hallwayOps.hallways.length * 10), pageHeight);
        
        // Section header
        doc.setFillColor(250, 248, 245);
        doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
        doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(89, 66, 52);
        doc.text('🚶 HALLWAY LOGISTICS', contentLeft + 3, yPos);
        
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        
        hallwayOps.hallways.forEach((hw) => {
          // Fee label
          let feeLabel = 'Included';
          if (hw.hasCabinetFee) feeLabel = `+$${hw.cabinetFeeAmount} Cabinet Detail`;
          if (hw.orgCost > 0) feeLabel = `+$${hw.orgCost} Organization (${hw.organizationHours}h)`;
          
          // Main line
          let lineText = `${hw.label} (${hw.trackingCode}) — F${hw.floorId.replace('FLOOR_', '')} — ${hw.floorType || 'Hard Floor'} — ${hw.sizeTier} (${hw.sizeRange})`;
          if (hw.cabinetCount > 0) lineText += ` — Cabinets: ${hw.cabinetCount}`;
          lineText += ` — ${feeLabel}`;
          
          doc.text(`• ${lineText}`, indentLeft, yPos);
          yPos += 3.5;
          
          // Connection route (SSOT - render-time formatting)
          if (hw.connectsTo.length > 0) {
            const AREA_LABELS: Record<string, string> = {
              home_entry: 'Entry', kitchen: 'Kitchen', living: 'Living',
              dining: 'Dining', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms',
              stairs: 'Stairs', utility: 'Utility'
            };
            const route = hw.connectsTo.map(id => AREA_LABELS[id] || id).join(' → ');
            
            doc.setFontSize(PDF_CONFIG.fontSize.small);
            doc.setTextColor(30, 90, 140);
            doc.text(`  → Connects: ${route}`, indentLeft + 4, yPos);
            doc.setFontSize(PDF_CONFIG.fontSize.body);
            doc.setTextColor(...COLORS.textDark);
            yPos += 3.5;
          }
          
          // Hazards
          if (hw.hazards.length > 0) {
            doc.setFontSize(PDF_CONFIG.fontSize.small);
            doc.setTextColor(...COLORS.textMuted);
            doc.text(`  ⚠️ ${hw.hazards.join(' • ')}`, indentLeft + 4, yPos);
            doc.setFontSize(PDF_CONFIG.fontSize.body);
            doc.setTextColor(...COLORS.textDark);
            yPos += 3.5;
          }
        });
        
        // Total
        if (hallwayOps.totalFees > 0) {
          yPos += 2;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(89, 66, 52);
          doc.text(`Hallway Total: +$${hallwayOps.totalFees}`, indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          doc.setFont('helvetica', 'normal');
          yPos += 3.5;
        }
      }
    }
    
    // === WINDOW CLEANING MAP (Premium Logistics) ===
    // Single source of truth using calcWindowMapByRoom with PER_ROOM and AGGREGATE policies
    const isIncludedFlow = isWindowIncludedFlow(formData.serviceType, 'MOVING');
    const windowMap = calcWindowMapByRoom(formData.roomWindowSelections || [], isIncludedFlow);
    
    if (windowMap.rooms.length > 0) {
      yPos += 6;
      yPos = checkPageBreak(doc, yPos, 30 + (windowMap.rooms.length * 5), pageHeight);
      
      // Section header
      doc.setFillColor(240, 248, 255); // Light blue background
      doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
      doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 90, 140);
      doc.text('🪟 WINDOW CLEANING MAP', contentLeft + 3, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      
      // Per-room breakdown
      windowMap.rooms.forEach(room => {
        const limit = INCLUDED_WINDOW_LIMITS[room.roomType];
        const policyNote = limit?.policy === 'AGGREGATE' ? ' (Total)' : '';
        const scopeLabel = room.scopeType === 'both' ? 'In & Out' : 'Inside';
        
        // Format: "Kitchen: 2 Inside Windows (1 Included, 1 Billable +$5)"
        let lineText = `${room.emoji} ${room.roomLabel}: ${room.totalWindows} ${scopeLabel} Window${room.totalWindows !== 1 ? 's' : ''}`;
        
        if (isIncludedFlow && room.includedCount > 0) {
          lineText += ` (${room.includedCount} Included${policyNote}`;
          if (room.billableCount > 0) {
            lineText += `, ${room.billableCount} Billable +$${room.billableCost}`;
          }
          lineText += ')';
        } else if (room.billableCount > 0) {
          lineText += ` (+$${room.billableCost})`;
        }
        
        yPos = checkPageBreak(doc, yPos, 4, pageHeight);
        doc.text(lineText, indentLeft, yPos);
        yPos += 3.5;
      });
      
      // Summary line
      yPos += 2;
      doc.setFont('helvetica', 'bold');
      if (isIncludedFlow && windowMap.totalIncludedValue > 0) {
        doc.setTextColor(...COLORS.successGreen);
        doc.text(`✓ Included Window Value: $${windowMap.totalIncludedValue}`, indentLeft, yPos);
        yPos += 3.5;
      }
      
      if (windowMap.totalBillableCost > 0) {
        doc.setTextColor(...COLORS.textDark);
        doc.text(`Window Cleaning Total: $${windowMap.totalBillableCost}`, indentLeft, yPos);
      } else if (windowMap.totalWindows > 0) {
        doc.setTextColor(...COLORS.successGreen);
        doc.text(`All ${windowMap.totalWindows} windows included at no extra charge`, indentLeft, yPos);
      }
      doc.setTextColor(...COLORS.textDark);
      doc.setFont('helvetica', 'normal');
      yPos += 4;
    }
    
    // === ADDITIONAL STRUCTURES WORK MAP (Compound/Estate Properties) ===
    const hasAdditionalStructures = (formData.guestHouseCount || 0) > 0 || 
                                    (formData.studioCount || 0) > 0 || 
                                    (formData.poolHouseCount || 0) > 0;
    
    if (hasAdditionalStructures) {
      yPos += 6;
      yPos = checkPageBreak(doc, yPos, 40, pageHeight);
      
      // Section header
      doc.setFillColor(255, 248, 235); // Amber-tinted background
      doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
      doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.brandAccent);
      doc.text('🏛️ ADDITIONAL STRUCTURES - WORK MAP', contentLeft + 3, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      
      // Guest Houses
      for (let i = 0; i < (formData.guestHouseCount || 0); i++) {
        yPos = checkPageBreak(doc, yPos, 25, pageHeight);
        const config = formData.guestHouseConfigs?.[`guest_house_${i}`];
        const attachmentNote = config?.attachment === 'detached' 
          ? '⚠️ DETACHED - Allow 10min equipment transit' 
          : 'Connected to main house';
        
        doc.setFont('helvetica', 'bold');
        doc.text(`GUEST HOUSE ${i + 1}`, indentLeft, yPos);
        yPos += 4;
        
        doc.setFont('helvetica', 'normal');
        if (config) {
          doc.text(`• Layout: ${config.layout === '1br_1ba' ? '1BR/1BA' : 'Studio'}`, indentLeft + 4, yPos);
          yPos += 3.5;
          doc.text(`• Kitchen: ${config.kitchenType === 'full' ? 'Full Kitchen (all appliances)' : config.kitchenType === 'kitchenette' ? 'Kitchenette' : 'No Kitchen'}`, indentLeft + 4, yPos);
          yPos += 3.5;
          doc.text(`• Floor: ${config.floorType === 'carpet' ? 'Carpet' : config.floorType === 'mixed' ? 'Mixed' : 'Hardwood/Tile'}`, indentLeft + 4, yPos);
          yPos += 3.5;
          doc.text(`• Access: ${attachmentNote}`, indentLeft + 4, yPos);
          yPos += 3.5;
          
          if (config.windowCount > 0) {
            doc.text(`• Windows: ${config.windowCount} (interior only)`, indentLeft + 4, yPos);
            yPos += 3.5;
          }
          
          if (config.trashBags > 0 || config.stickySpills) {
            const hazardNotes: string[] = [];
            if (config.trashBags > 0) hazardNotes.push(`${config.trashBags} bag(s) trash`);
            if (config.stickySpills) hazardNotes.push('Sticky spills detected');
            doc.setTextColor(180, 100, 20);
            doc.text(`• ⚠️ Hazards: ${hazardNotes.join(', ')}`, indentLeft + 4, yPos);
            doc.setTextColor(...COLORS.textDark);
            yPos += 3.5;
          }
        } else {
          doc.text(`• Standard guest house (1BR/1BA, Kitchenette)`, indentLeft + 4, yPos);
          yPos += 3.5;
        }
        yPos += 2;
      }
      
      // Art Studios
      for (let i = 0; i < (formData.studioCount || 0); i++) {
        yPos = checkPageBreak(doc, yPos, 25, pageHeight);
        const config = formData.artStudioConfigs?.[`art_studio_${i}`];
        const attachmentNote = config?.attachment === 'detached' 
          ? '⚠️ DETACHED - Allow 10min equipment transit' 
          : 'Connected to main house';
        
        const typeLabel = config?.studioType === 'art_studio' ? 'Art Studio' :
                         config?.studioType === 'home_office' ? 'Home Office' :
                         config?.studioType === 'workshop' ? 'Workshop' : 'ADU';
        
        doc.setFont('helvetica', 'bold');
        doc.text(`ART STUDIO ${i + 1} (${typeLabel})`, indentLeft, yPos);
        yPos += 4;
        
        doc.setFont('helvetica', 'normal');
        if (config) {
          doc.text(`• Has Bathroom: ${config.hasBathroom ? 'Yes (include bathroom cleaning)' : 'No'}`, indentLeft + 4, yPos);
          yPos += 3.5;
          doc.text(`• Floor: ${config.floorType === 'carpet' ? 'Carpet' : config.floorType === 'mixed' ? 'Mixed' : 'Hardwood/Tile'}`, indentLeft + 4, yPos);
          yPos += 3.5;
          
          if (config.surfaceSensitivity === 'delicate') {
            doc.setTextColor(180, 100, 20);
            doc.text(`• Surface: ⚠️ DELICATE - Avoid wet mopping near work areas`, indentLeft + 4, yPos);
            doc.setTextColor(...COLORS.textDark);
          } else {
            doc.text(`• Surface: Standard`, indentLeft + 4, yPos);
          }
          yPos += 3.5;
          
          doc.text(`• Access: ${attachmentNote}`, indentLeft + 4, yPos);
          yPos += 3.5;
          
          if (config.specialNotes) {
            doc.text(`• Notes: "${config.specialNotes}"`, indentLeft + 4, yPos);
            yPos += 3.5;
          }
          
          if (config.trashBags > 0 || config.stickySpills) {
            const hazardNotes: string[] = [];
            if (config.trashBags > 0) hazardNotes.push(`${config.trashBags} bag(s) trash`);
            if (config.stickySpills) hazardNotes.push('Sticky spills detected');
            doc.setTextColor(180, 100, 20);
            doc.text(`• ⚠️ Hazards: ${hazardNotes.join(', ')}`, indentLeft + 4, yPos);
            doc.setTextColor(...COLORS.textDark);
            yPos += 3.5;
          }
        } else {
          doc.text(`• Standard art studio/ADU`, indentLeft + 4, yPos);
          yPos += 3.5;
        }
        yPos += 2;
      }
      
      // Pool Houses
      for (let i = 0; i < (formData.poolHouseCount || 0); i++) {
        yPos = checkPageBreak(doc, yPos, 10, pageHeight);
        doc.setFont('helvetica', 'bold');
        doc.text(`POOL HOUSE ${i + 1}`, indentLeft, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        doc.text(`• Standard pool house / cabana cleaning`, indentLeft + 4, yPos);
        doc.text(`• Access: Typically detached - allow transit time`, indentLeft + 4, yPos + 3.5);
        yPos += 8;
      }
    }
    
    // Recurring note
    if (isRecurring) {
      yPos += 5;
      doc.setFillColor(240, 248, 245);
      doc.roundedRect(contentLeft, yPos - 3, contentWidth, 6, 2, 2, 'F');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.successGreen);
      const recurringText = recurringStartMode === 'deep-plus-recurring' 
        ? '✓ First visit: Deep clean • Subsequent: Recurring rate'
        : '✓ Recurring rate applied (subject to verification)';
      doc.text(recurringText, contentLeft + 3, yPos);
      yPos += 4;
    }
    
    // Condition fee (area-specific with breakdown OR legacy blanket)
    const conditionFee = formData.conditionFee || 0;
    const hasAreaBreakdown = formData.areaConditionEnabled && 
                             formData.areaConditionSelections && 
                             formData.areaConditionSelections.length > 0;
    
    if (conditionFee > 0) {
      yPos += 2;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textMuted);
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      
      if (hasAreaBreakdown) {
        // Area-specific: show "Condition Fee (by area)" with breakdown
        doc.text('Condition adjustment (by area):', indentLeft, yPos);
        yPos += 3.5;
        
        // Show breakdown bullets
        formData.areaConditionSelections?.forEach(sel => {
          const displayName = sel.roomId.startsWith('bedroom_') 
            ? `Bedroom ${sel.roomId.replace('bedroom_', '')}`
            : sel.roomId.startsWith('bath_')
              ? sel.roomId.includes('master') ? 'Master Bathroom'
                : sel.roomId.includes('full') ? `Full Bathroom ${parseInt(sel.roomId.split('_')[2] || '0') + 1}`
                : `Half Bathroom ${parseInt(sel.roomId.split('_')[2] || '0') + 1}`
            : sel.roomId === 'kitchen' ? 'Kitchen'
            : sel.roomId === 'living' ? 'Living Room'
            : sel.roomId === 'studio_main_space' ? 'Studio Main Space'
            : sel.roomId;
          doc.text(`  • ${displayName}`, indentLeft + 2, yPos);
          yPos += 3;
        });
        
        doc.text(`  Subtotal: +$${conditionFee}`, indentLeft + 2, yPos);
      } else {
        // Legacy blanket display
        doc.text(`Condition adjustment: +$${conditionFee}`, indentLeft, yPos);
      }
    }
    
  } else if (isHourlyMode) {
    // ===== PREMIUM TEAM SESSION (Hourly Mode) =====
    doc.setFillColor(...COLORS.brandPrimary);
    doc.roundedRect(contentLeft, yPos - 3.5, 60, 6, 2, 2, 'F');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text('Premium Team Session', contentLeft + 3, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setTextColor(...COLORS.textDark);
    
    // Service Intention (SYNCED with StepHourlyConfig labels)
    const intentLabels: Record<string, string> = {
      'priority_focus': 'The Efficiency Expert - Priority Focus',
      'deep_scrub': 'The Heavy-Lifter - Deep Scrub (+30% time)',
      'post_event': 'The Recovery Team - Post-Event Cleanup',
      'organization': 'The Home Assistant - Organization',
      'routine_maintenance': 'The Keeper - Routine Lifestyle Support',
      'move_in_out': 'The Finisher - Move-In/Out'
    };
    const intentLabel = intentLabels[formData.hourlyIntent || 'priority_focus'] || 'Priority Focus';
    doc.text(`Service Intent: ${intentLabel}`, indentLeft, yPos);
    yPos += 4;
    
    // Frequency badge
    const frequencyLabels: Record<string, string> = {
      'onetime': 'One-Time',
      'weekly': 'Weekly',
      'biweekly': 'Bi-Weekly',
      'monthly': 'Monthly',
      'daily': 'Daily'
    };
    const freqLabel = frequencyLabels[formData.hourlyFrequency || 'onetime'] || 'One-Time';
    
    doc.setFillColor(240, 248, 245);
    doc.roundedRect(indentLeft - 2, yPos - 3, doc.getTextWidth(freqLabel) + 6, 5, 2, 2, 'F');
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setTextColor(...COLORS.successGreen);
    doc.text(freqLabel, indentLeft, yPos);
    
    yPos += 5;
    
    // Days per week for daily frequency
    if (formData.hourlyFrequency === 'daily' && formData.daysPerWeek) {
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      doc.text(`Schedule: ${formData.daysPerWeek} days per week`, indentLeft, yPos);
      yPos += 4;
    }
    
    yPos += 2;
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setTextColor(...COLORS.textDark);
    
    // Team math breakdown
    const clockHours = formData.hourlyHours || 2;
    const teamSize = hourlyTeamSize || formData.hourlyTeamSize || 2;
    const laborHours = hourlyLaborHours || (clockHours * teamSize);
    const rate = hourlyRate || 0;
    
    doc.text(`Team: ${teamSize} Professional Cleaners`, indentLeft, yPos);
    yPos += 3.5;
    doc.text(`Clock Hours: ${clockHours} hours on-site`, indentLeft, yPos);
    yPos += 3.5;
    doc.text(`Total Labor: ${laborHours} man-hours (${clockHours}h × ${teamSize} cleaners)`, indentLeft, yPos);
    yPos += 3.5;
    doc.text(`Rate: $${rate}/clock-hour per person`, indentLeft, yPos);
    yPos += 5;
    
    // Intensity
    const intensityLabels: Record<string, string> = {
      'standard': 'Deep Clean Intensity',
      'basic': 'Basic / Maintenance Intensity'
    };
    const intensityLabel = intensityLabels[formData.hourlyIntensity || 'standard'] || 'Deep Clean Intensity';
    doc.text(`Intensity: ${intensityLabel}`, indentLeft, yPos);
    yPos += 3.5;
    
    // Supplies
    const suppliesLabels: Record<string, string> = {
      'company': 'Company Supplies (Included)',
      'client': 'Client Provides Supplies'
    };
    const suppliesLabel = suppliesLabels[formData.hourlySupplies || 'company'] || 'Company Supplies';
    doc.text(`Supplies: ${suppliesLabel}`, indentLeft, yPos);
    yPos += 5;
    
    // Property scope
    drawDivider(doc, yPos, indentLeft, contentRight - 10, COLORS.divider);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text('PROPERTY SCOPE', indentLeft, yPos);
    yPos += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setTextColor(...COLORS.textDark);
    
    // Beds/baths to clean
    doc.text(`Bedrooms: ${formData.hourlyBedsToClean || 0} of ${formData.hourlyTotalBeds || 0} total`, indentLeft, yPos);
    yPos += 3.5;
    doc.text(`Bathrooms: ${formData.hourlyBathsToClean || 0} of ${formData.hourlyTotalBaths || 0} total`, indentLeft, yPos);
    yPos += 3.5;
    
    // Living areas
    const livingAreas: string[] = [];
    if (formData.hourlyIncludeKitchen) livingAreas.push('Kitchen');
    if (formData.hourlyIncludeLivingAreas) livingAreas.push('Living Areas');
    if (livingAreas.length > 0) {
      doc.text(`Common Areas: ${livingAreas.join(' + ')}`, indentLeft, yPos);
      yPos += 3.5;
    }
    
    // Sqft if provided
    if (formData.hourlyTotalSqft) {
      const sqftOpt = HOURLY_SQFT_OPTIONS.find(o => o.value === formData.hourlyTotalSqft);
      const sqftLabel = sqftOpt?.label || formData.hourlyTotalSqft.replace('_', '-');
      doc.text(`Total Property: ${sqftLabel}`, indentLeft, yPos);
      yPos += 3.5;
    }
    
    // === PROPERTY TYPE (NEW) ===
    if (formData.hourlyPropertyType) {
      const propertyLabels: Record<string, string> = {
        'studio_loft': 'Studio/Loft',
        'apartment_condo': 'Apartment/Condo',
        'townhouse': 'Townhouse',
        'single_family': 'Single-Family Home',
        'spanish_mediterranean': 'Spanish/Mediterranean',
        'craftsman_bungalow': 'Craftsman/Bungalow',
        'ranch': 'Ranch Home',
        'modern_contemporary': 'Modern/Contemporary',
        'guest_house_adu': 'Guest House/ADU',
        'estate_mansion': 'Estate/Mansion',
      };
      doc.text(`Property Type: ${propertyLabels[formData.hourlyPropertyType] || formData.hourlyPropertyType}`, indentLeft, yPos);
      yPos += 3.5;
    }
    
    // === AREAS TO INCLUDE (NEW) ===
    const areasToInclude = formData.hourlyAreasToInclude || [];
    if (areasToInclude.length > 0) {
      const areaLabels: Record<string, string> = {
        'kitchen': 'Kitchen',
        'living_room': 'Living Room',
        'dining_room': 'Dining Room',
        'home_office': 'Home Office',
        'laundry_room': 'Laundry',
        'mudroom': 'Mudroom',
        'garage': 'Garage',
        'patio': 'Patio',
        'wine_cellar': 'Wine Cellar',
        'butlers_pantry': "Butler's Pantry",
        'media_room': 'Media Room',
        'gym': 'Home Gym',
      };
      const areaList = areasToInclude.map((id: string) => areaLabels[id] || id).join(', ');
      doc.setTextColor(...COLORS.successGreen);
      doc.text(`✓ Areas to Clean: ${areaList}`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
    }
    
    // === AREAS TO SKIP (NEW) ===
    const areasToSkip = formData.hourlyAreasToSkip || [];
    if (areasToSkip.length > 0) {
      const skipLabels: Record<string, string> = {
        'skip_master': 'Master Bedroom',
        'skip_kids': "Kids' Rooms",
        'skip_office': 'Home Office',
        'skip_basement': 'Basement',
        'skip_attic': 'Attic',
        'skip_garage': 'Garage',
        'skip_outdoor': 'Outdoor Areas',
      };
      const skipList = areasToSkip.map((id: string) => skipLabels[id] || id).join(', ');
      doc.setTextColor(200, 100, 100);
      doc.text(`✗ Skipping: ${skipList}`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
    }
    
    // === ESTATE & COMPOUND DETAILS ===
    const guestHouses = formData.guestHouseCount || 0;
    const studios = formData.studioCount || 0;
    const poolHouses = formData.poolHouseCount || 0;
    const hasAdditionalStructures = guestHouses > 0 || studios > 0 || poolHouses > 0;
    const estateCalc = calculateEstateHours(formData);
    const isEstate = estateCalc.isEstate;
    
    // Cleaning Density (only for estates or when not 'entire')
    if (formData.cleaningDensity && formData.cleaningDensity !== 'entire') {
      const densityOpt = CLEANING_DENSITY_OPTIONS.find(o => o.value === formData.cleaningDensity);
      const densityLabel = densityOpt?.label || formData.cleaningDensity;
      doc.text(`Cleaning Scope: ${densityLabel}`, indentLeft, yPos);
      yPos += 3.5;
      doc.text(`Active Area: ~${estateCalc.activeSqft.toLocaleString()} sq ft`, indentLeft, yPos);
      yPos += 3.5;
    }
    
    // Additional Structures with Time Breakdown
    if (hasAdditionalStructures) {
      yPos += 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.brandAccent);
      doc.text('Additional Structures:', indentLeft, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textDark);
      yPos += 4;
      
      // Structure breakdown from AITimeReceipt
      const structureBreakdown = estateCalc.aiTimeReceipt?.additionalStructures;
      
      if (guestHouses > 0) {
        const ghTotal = structureBreakdown?.guestHouse?.total || (guestHouses * 115);
        doc.text(`• Guest House (${guestHouses}x, Detached): +${ghTotal} min`, indentLeft + 2, yPos);
        yPos += 3.5;
      }
      if (studios > 0) {
        const stTotal = structureBreakdown?.studio?.total || (studios * 70);
        doc.text(`• Studio/ADU (${studios}x, Attached): +${stTotal} min`, indentLeft + 2, yPos);
        yPos += 3.5;
      }
      if (poolHouses > 0) {
        const phTotal = structureBreakdown?.poolHouse?.total || (poolHouses * 60);
        doc.text(`• Pool House (${poolHouses}x, Detached): +${phTotal} min`, indentLeft + 2, yPos);
        yPos += 3.5;
      }
      
      // Total structure labor
      if (structureBreakdown?.totalMinutes) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...COLORS.brandPrimary);
        doc.text(`Structure Labor Total: ${structureBreakdown.totalMinutes} min`, indentLeft + 2, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        yPos += 4;
      }
    }
    
    // Move-In/Out Badge for hourly
    if (formData.isMovingHourly) {
      yPos += 2;
      doc.setFillColor(219, 234, 254); // light blue
      doc.roundedRect(indentLeft - 2, yPos - 3, 45, 6, 2, 2, 'F');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216); // blue
      doc.text('Move-In/Out Service', indentLeft, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textDark);
      yPos += 5;
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.text('Detailed work: cabinets, baseboards, inside drawers', indentLeft, yPos);
      yPos += 4;
    }
    
    // === CONCIERGE TASKS (Hourly Add-ons as TIME) ===
    const hourlyTasks = formData.hourlyTasks || [];
    if (hourlyTasks.length > 0) {
      yPos += 3;
      drawDivider(doc, yPos, indentLeft, contentRight - 10, COLORS.divider);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.brandPrimary);
      doc.text('CONCIERGE TASKS (Time Included)', indentLeft, yPos);
      yPos += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      
      const taskLabels: Record<string, string> = {
        'oven': 'Inside Oven',
        'fridge_empty': 'Inside Fridge',
        'cabinets': 'All Cabinets',
        'interior_windows': 'Interior Windows',
        'hood': 'Range Hood',
        'ceiling_fan': 'Ceiling Fans',
        'baseboards': 'Baseboards (Full)',
      };
      
      let totalTaskMinutes = 0;
      hourlyTasks.forEach((taskId: string) => {
        const timeEstimate = getTaskTimeEstimate(
          taskId, 
          estateCalc.activeSqft, 
          formData.isMovingHourly || false
        );
        totalTaskMinutes += timeEstimate;
        const taskLabel = taskLabels[taskId] || taskId;
        
        yPos = checkPageBreak(doc, yPos, 4, pageHeight);
        doc.text(`• ${taskLabel}`, indentLeft, yPos);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(`+${timeEstimate} min`, contentRight - 10, yPos, { align: 'right' });
        doc.setTextColor(...COLORS.textDark);
        yPos += 3.5;
      });
      
      // Total task time
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.brandAccent);
      doc.text(`Total Task Time: ~${totalTaskMinutes} min`, indentLeft, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 4;
    }
    
    // === SOUTH COAST CONCIERGE LOGISTICS PROFILE ===
    const accessType = formData.accessType || 'standard';
    const hasDelicateSurfaces = formData.hasDelicateSurfaces || false;
    const homeCondition = formData.homeConditionLevel || 'lived_in';
    const overtimeProtocol = formData.overtimeProtocol || 'strict';
    const hourlyMustHaves = formData.hourlyMustHaves || [];
    
    if (accessType !== 'standard' || hasDelicateSurfaces || hourlyMustHaves.length > 0) {
      yPos += 4;
      yPos = checkPageBreak(doc, yPos, 30, pageHeight);
      drawDivider(doc, yPos, indentLeft, contentRight - 10, COLORS.divider);
      yPos += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.brandPrimary);
      doc.text('SOUTH COAST LOGISTICS PROFILE', indentLeft, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      
      // Access Type
      const accessLabels: Record<string, string> = {
        standard: 'Standard (Driveway/Flat)',
        hillside: 'Hillside / Stairs (+15 min setup)',
        estate_gated: 'Gated Estate / Remote (+20 min setup)',
      };
      doc.text(`Access: ${accessLabels[accessType] || accessType}`, indentLeft, yPos);
      yPos += 3.5;
      
      // Delicate Surfaces
      if (hasDelicateSurfaces) {
        const surfaceTypes = formData.delicateSurfaceTypes || [];
        const surfaceLabels: Record<string, string> = {
          stone: 'Natural Stone',
          clay: 'Saltillo/Spanish Tile',
          beams: 'High Beams/Vaulted',
        };
        const surfaceList = surfaceTypes.map(s => surfaceLabels[s] || s).join(', ');
        doc.setTextColor(...COLORS.brandAccent);
        doc.text(`⚠ Delicate Surfaces: ${surfaceList}`, indentLeft, yPos);
        doc.setTextColor(...COLORS.textDark);
        yPos += 3.5;
        doc.setFontSize(PDF_CONFIG.fontSize.small);
        doc.setTextColor(...COLORS.textMuted);
        doc.text('pH-neutral care required • +10% time buffer applied', indentLeft, yPos);
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        yPos += 3.5;
      }
      
      // Surface Accessibility (renamed from Condition)
      const conditionLabels: Record<string, string> = {
        tidy: 'Clear Surfaces (100% efficiency)',
        lived_in: 'Light Clutter (80% efficiency)',
        cluttered: 'Heavy Clutter (60% efficiency)',
        deep_recovery: 'Heavy Buildup (40% efficiency)',
      };
      doc.text(`Surface Accessibility: ${conditionLabels[homeCondition] || homeCondition}`, indentLeft, yPos);
      yPos += 3.5;
      
      // Overtime Protocol
      const protocolLabels: Record<string, string> = {
        strict: '⏱ Hard Stop (strict budget)',
        flex: '✓ Flexible (may authorize +1hr)',
      };
      doc.text(`Overtime: ${protocolLabels[overtimeProtocol] || overtimeProtocol}`, indentLeft, yPos);
      yPos += 3.5;
      
      // Scope Exclusions Confirmation
      if (formData.scopeExclusionsConfirmed) {
        doc.setTextColor(...COLORS.successGreen);
        doc.text('✓ Safety Exclusions Confirmed (Bio-hazards, Height, Heavy Lifting)', indentLeft, yPos);
        doc.setTextColor(...COLORS.textDark);
        yPos += 3.5;
      }
      
      // Occupancy Status
      if (formData.isPropertyOccupied !== undefined) {
        const occLabel = formData.isPropertyOccupied ? 'Occupied (+15% time)' : 'Vacant';
        doc.text(`Occupancy: ${occLabel}`, indentLeft, yPos);
        yPos += 3.5;
      }
      
      // Pets to Secure
      if (formData.hasPetsToSecure) {
        doc.setTextColor(...COLORS.brandAccent);
        doc.text('🐾 Pets will be secured by client', indentLeft, yPos);
        doc.setTextColor(...COLORS.textDark);
        yPos += 3.5;
      }
      
      // Equipment & Supplies (Vacuum/Parking)
      if (formData.hasVacuum !== undefined || formData.hasParking !== undefined) {
        const equipmentNotes: string[] = [];
        if (formData.hasVacuum) equipmentNotes.push('Client has vacuum');
        else if (formData.hasVacuum === false) equipmentNotes.push('No vacuum on-site');
        if (formData.hasParking) equipmentNotes.push('Parking available');
        else if (formData.hasParking === false) equipmentNotes.push('Limited parking');
        if (equipmentNotes.length > 0) {
          doc.text(`Equipment: ${equipmentNotes.join(' • ')}`, indentLeft, yPos);
          yPos += 3.5;
        }
      }
      
      // Vertical Logistics
      if (formData.verticalLogistics && formData.verticalLogistics !== 'ground') {
        const vertLabels: Record<string, string> = {
          elevator: 'Elevator (+5 min)',
          walkup: 'Walk-Up (+15 min)',
        };
        doc.text(`Vertical Access: ${vertLabels[formData.verticalLogistics] || formData.verticalLogistics}`, indentLeft, yPos);
        yPos += 3.5;
      }
      
      // Priority Must-Haves
      if (hourlyMustHaves.length > 0) {
        const mustHaveLabels: Record<string, string> = {
          kitchen_deep: 'Kitchen Deep',
          master_bath: 'Master Bath',
          floors: 'Floors',
          patio_furniture: 'Patio',
          guest_house: 'Guest House',
          living_areas: 'Living Areas',
          all_bathrooms: 'All Baths',
          bedrooms: 'Bedrooms',
        };
        const priorities = hourlyMustHaves.map((p, i) => `${i + 1}. ${mustHaveLabels[p] || p}`).join(' → ');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.successGreen);
        doc.text(`Must-Haves: ${priorities}`, indentLeft, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textDark);
        yPos += 3.5;
      }
      
      // Nice-to-haves
      const niceToHaves = formData.hourlyNiceToHaves;
      if (niceToHaves) {
        doc.setTextColor(...COLORS.textMuted);
        const wrappedNice = doc.splitTextToSize(`If time permits: ${niceToHaves}`, contentWidth - 12);
        doc.text(wrappedNice, indentLeft, yPos);
        yPos += wrappedNice.length * 3.5;
        doc.setTextColor(...COLORS.textDark);
      }
    }
    
    // === INTENT-SPECIFIC DETAILS SECTION ===
    if (formData.hourlyIntent) {
      yPos += 3;
      yPos = checkPageBreak(doc, yPos, 30, pageHeight);
      drawDivider(doc, yPos, indentLeft, contentRight - 10, COLORS.divider);
      yPos += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.brandPrimary);
      doc.text('SERVICE INTENT DETAILS', indentLeft, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      
      // THE KEEPER - Routine Maintenance
      if (formData.hourlyIntent === 'routine_maintenance') {
        const lifestyle = formData.lifestyleAddons;
        if (lifestyle?.laundryLoads && lifestyle.laundryLoads > 0) {
          doc.text(`Laundry: ${lifestyle.laundryLoads} loads (wash/fold)`, indentLeft, yPos);
          yPos += 3.5;
        }
        if (lifestyle?.dishwasher) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('✓ Dishwasher Loading/Unloading', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        if (lifestyle?.bedMaking) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('✓ Bed Making (Linens Change)', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        // Extended lifestyle addons
        if (lifestyle?.plantCare) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('✓ Plant Watering', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        if (lifestyle?.trashOut) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('✓ Trash & Recycling Out', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        if (lifestyle?.mailSort) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('✓ Mail & Package Sorting', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        if (lifestyle?.petBowls) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('✓ Pet Bowl Refresh', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        if (formData.hasSheddingPets) {
          doc.setTextColor(...COLORS.brandAccent);
          doc.text('🐕 HEPA vacuum required (shedding pets)', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        // Equipment preference
        if (formData.equipmentPreference) {
          const equipLabels: Record<string, string> = {
            client_provides: 'Client Provides Supplies',
            we_bring: 'We Bring Everything',
            hybrid: 'Hybrid (Client vacuum, we bring chemicals)',
          };
          doc.text(`Equipment: ${equipLabels[formData.equipmentPreference] || formData.equipmentPreference}`, indentLeft, yPos);
          yPos += 3.5;
        }
        // Preferred Day
        if (formData.preferredDay) {
          doc.text(`Preferred Day: ${formData.preferredDay}`, indentLeft, yPos);
          yPos += 3.5;
        }
      }
      
      // EFFICIENCY EXPERT - Priority Focus
      if (formData.hourlyIntent === 'priority_focus') {
        // Priority Areas (from new custom section)
        if (formData.priorityAreas?.length > 0) {
          const areaLabels: Record<string, string> = {
            kitchen: 'Kitchen',
            bathrooms: 'Bathrooms',
            living_areas: 'Living Areas',
            floors: 'Floors',
            bedrooms: 'Bedrooms',
            surfaces: 'All Surfaces',
          };
          const areas = formData.priorityAreas.map((a: string, i: number) => 
            `${i + 1}. ${areaLabels[a] || a}`
          ).join(' → ');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.successGreen);
          doc.text(`Focus Priority: ${areas}`, indentLeft, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        doc.text(`Budget: ${formData.budgetHours || 3} hours HARD STOP`, indentLeft, yPos);
        yPos += 3.5;
        if (formData.scopeExclusionConfirmed) {
          doc.setTextColor(...COLORS.brandAccent);
          doc.text('⚠ Secondary rooms may not be touched', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
      }
      
      // HEAVY-LIFTER - Deep Scrub
      if (formData.hourlyIntent === 'deep_scrub') {
        const grimeLabel = formData.grimeLevel === 'recovery' 
          ? 'Recovery Mode (+30% time)' 
          : 'Standard Deep Clean';
        doc.text(`Grime Level: ${grimeLabel}`, indentLeft, yPos);
        yPos += 3.5;
        
        if (formData.hasNaturalStone) {
          doc.setTextColor(200, 100, 50);
          doc.text('⚠ Natural Stone: NO ACIDIC CLEANERS', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        if (formData.pullOutAppliances) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('✓ Pull out fridge/oven (2-person safety)', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
      }
      
      // RECOVERY TEAM - Post-Event (EXPANDED)
      if (formData.hourlyIntent === 'post_event') {
        // Event Type
        if (formData.eventType) {
          const eventLabels: Record<string, string> = {
            party: 'House Party',
            wedding: 'Wedding/Reception',
            corporate: 'Corporate Event',
            family: 'Family Gathering',
            holiday: 'Holiday Party',
            other: 'Other Event',
          };
          doc.text(`Event Type: ${eventLabels[formData.eventType] || formData.eventType}`, indentLeft, yPos);
          yPos += 3.5;
        }
        // Guest Count
        if (formData.eventGuestCount) {
          doc.text(`Guest Count: ${formData.eventGuestCount}`, indentLeft, yPos);
          yPos += 3.5;
        }
        // Affected Areas
        if (formData.affectedAreas?.length > 0) {
          const areaLabels: Record<string, string> = {
            kitchen: 'Kitchen',
            living: 'Living/Dining',
            bathrooms: 'Bathrooms',
            outdoor: 'Outdoor/Patio',
            garage: 'Garage',
            bedrooms: 'Bedrooms',
          };
          const areas = (formData.affectedAreas as string[]).map(a => areaLabels[a] || a).join(', ');
          doc.text(`Affected Areas: ${areas}`, indentLeft, yPos);
          yPos += 3.5;
        }
        // Mess Types
        if (formData.messTypes?.length > 0) {
          const messLabels: Record<string, string> = {
            food_spills: 'Food Spills',
            drink_stains: 'Drink Stains',
            grease: 'Grease/Oil',
            confetti: 'Confetti/Decorations',
            candle_wax: 'Candle Wax',
            broken_items: 'Broken Items',
          };
          const messes = (formData.messTypes as string[]).map(m => messLabels[m] || m).join(', ');
          doc.text(`Mess Types: ${messes}`, indentLeft, yPos);
          yPos += 3.5;
        }
        // Debris Volume
        doc.text(`Debris Volume: ${formData.debrisBags || 3} bags`, indentLeft, yPos);
        yPos += 3.5;
        // Flags
        if (formData.hasStickySpills) {
          doc.text('🧹 Sticky spills on floors (priority mopping)', indentLeft, yPos);
          yPos += 3.5;
        }
        if (formData.furnitureNeedsResetting) {
          doc.text('🪑 Furniture resetting required', indentLeft, yPos);
          yPos += 3.5;
        }
        if (formData.hasBiohazard) {
          doc.setTextColor(200, 50, 50);
          doc.text('⚠ BIOHAZARD: Specialized handling required', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        if (formData.mustFinishBy) {
          doc.text(`Must finish by: ${formData.mustFinishBy}`, indentLeft, yPos);
          yPos += 3.5;
        }
      }
      
      // HOME ASSISTANT - Organization
      if (formData.hourlyIntent === 'organization') {
        // Clutter Level (NEW)
        if (formData.clutterLevel) {
          const clutterLabels: Record<string, string> = {
            minimal: 'Minimal Clutter (Quick Reset)',
            moderate: 'Moderate Clutter (Standard Session)',
            significant: 'Significant Clutter (Extended Session)',
            overwhelming: 'Overwhelming Clutter (Multi-Session)',
          };
          doc.text(`Clutter Level: ${clutterLabels[formData.clutterLevel] || formData.clutterLevel}`, indentLeft, yPos);
          yPos += 3.5;
        }
        const tasks = formData.organizationTasks || [];
        if (tasks.length > 0) {
          const taskLabels: Record<string, string> = {
            closet: 'Closet Organization',
            pantry: 'Pantry Reset',
            toys: 'Toy Taming',
            packing: 'Packing/Unpacking',
          };
          doc.text(`Focus: ${tasks.map((t: string) => taskLabels[t] || t).join(', ')}`, indentLeft, yPos);
          yPos += 3.5;
        }
        if (formData.noScrubAcknowledged) {
          doc.setTextColor(...COLORS.brandAccent);
          doc.text('✓ Confirmed: Organizing only (no scrubbing)', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
      }
      
      // THE FINISHER - Move-In/Out
      if (formData.hourlyIntent === 'move_in_out') {
        const occupancyLabel = formData.isHome100Empty === true 
          ? '100% Vacant' 
          : formData.isHome100Empty === false 
            ? 'Furniture Present' 
            : 'Not specified';
        doc.text(`Property: ${occupancyLabel}`, indentLeft, yPos);
        yPos += 3.5;
        if (formData.pullOutAppliances) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('✓ Pull out fridge/oven (2-person safety)', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
        if (formData.needsLandlordReceipt) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text('📄 Landlord receipt requested for deposit', indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
      }
    }
    
    // === V3: AI TIME RECEIPT BREAKDOWN ===
    if (formData.hourlyTimeReceipt) {
      const receipt = formData.hourlyTimeReceipt;
      yPos += 5;
      yPos = checkPageBreak(doc, yPos, 45, pageHeight);
      
      drawDivider(doc, yPos, indentLeft, contentRight - 10, COLORS.divider);
      yPos += 5;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.brandPrimary);
      doc.text('TIME ESTIMATE BREAKDOWN', indentLeft, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      
      // Logistics Drag
      doc.text(`Logistics Drag: ${receipt.logistics.totalLogistics} min`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textMuted);
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      const logisticsDetail = `(Setup ${receipt.logistics.baseSetup} + Access ${receipt.logistics.accessFriction} + Vertical ${receipt.logistics.verticalFriction})`;
      doc.text(logisticsDetail, indentLeft + 45, yPos);
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
      
      // Active Cleaning
      doc.text(`Active Cleaning: ${receipt.activeArea.subtotalMinutes} min`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textMuted);
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      const activeDetail = `(Baths ${receipt.activeArea.bathrooms.minutes} + Beds ${receipt.activeArea.bedrooms.minutes} + Kitchen ${receipt.activeArea.kitchen.minutes} + Living ${receipt.activeArea.living.minutes})`;
      doc.text(activeDetail, indentLeft + 48, yPos);
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
      
      // Unified Spaces (if any)
      if (receipt.unifiedSpaces.totalMinutes > 0) {
        doc.text(`Unified Spaces: ${receipt.unifiedSpaces.totalMinutes} min`, indentLeft, yPos);
        doc.setTextColor(...COLORS.textMuted);
        doc.setFontSize(PDF_CONFIG.fontSize.small);
        const spaceParts: string[] = [];
        if (receipt.unifiedSpaces.office.count > 0) spaceParts.push(`Office ${receipt.unifiedSpaces.office.minutes}`);
        if (receipt.unifiedSpaces.laundry.count > 0) spaceParts.push(`Laundry ${receipt.unifiedSpaces.laundry.minutes}`);
        if (receipt.unifiedSpaces.garage.count > 0) spaceParts.push(`Garage ${receipt.unifiedSpaces.garage.minutes}`);
        if (receipt.unifiedSpaces.patio.count > 0) spaceParts.push(`Patio ${receipt.unifiedSpaces.patio.minutes}`);
        doc.text(`(${spaceParts.join(' + ')})`, indentLeft + 44, yPos);
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        yPos += 3.5;
      }
      
      // Tasks (if any)
      if (receipt.tasks.totalMinutes > 0) {
        doc.text(`Concierge Tasks: ${receipt.tasks.totalMinutes} min`, indentLeft, yPos);
        yPos += 3.5;
      }
      
      // Frequency Adjustment (if applicable)
      if (receipt.frequencyAdjustment) {
        if (receipt.frequencyAdjustment.isEfficiencyMode) {
          doc.setTextColor(...COLORS.successGreen);
          doc.text(`Frequency Efficiency: ${receipt.frequencyAdjustment.adjustmentLabel}`, indentLeft, yPos);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        } else if (receipt.frequencyAdjustment.deepMaintenanceBuffer > 0) {
          doc.setTextColor(...COLORS.brandAccent);
          doc.text(`Deep Maintenance Buffer: +${receipt.frequencyAdjustment.deepMaintenanceBuffer} min`, indentLeft, yPos);
          doc.setTextColor(...COLORS.textMuted);
          doc.setFontSize(PDF_CONFIG.fontSize.small);
          doc.text('(Baseboards, fixtures, buildup reset)', indentLeft + 52, yPos);
          doc.setFontSize(PDF_CONFIG.fontSize.body);
          doc.setTextColor(...COLORS.textDark);
          yPos += 3.5;
        }
      }
      
      // Team Recommendation
      yPos += 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.successGreen);
      doc.text(`AI Recommended: ${receipt.teamSizing.recommendedTeamSize} cleaners × ${receipt.teamSizing.clockHours} hrs`, indentLeft, yPos);
      yPos += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.textMuted);
      const rationaleLines = doc.splitTextToSize(receipt.teamSizing.rationale, contentWidth - 12);
      rationaleLines.forEach((line: string) => {
        doc.text(line, indentLeft, yPos);
        yPos += 3;
      });
      doc.setTextColor(...COLORS.textDark);
    } else if (isEstate || hasAdditionalStructures) {
      // Fallback for older calculation method
      yPos += 2;
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`AI Estimate: ${estateCalc.logisticsMinutes} min logistics + ${estateCalc.effectiveCleaningMinutes || estateCalc.cleaningMinutes} min cleaning + ${estateCalc.taskMinutes} min tasks`, indentLeft, yPos);
      yPos += 3.5;
      // Show efficiency if not 100%
      if (estateCalc.conditionEfficiency && estateCalc.conditionEfficiency < 1) {
        doc.text(`Efficiency Factor: ${Math.round(estateCalc.conditionEfficiency * 100)}% (condition adjustment)`, indentLeft, yPos);
        yPos += 3.5;
      }
    }
    
    // Priority notes
    if (formData.hourlyPriorityNotes) {
      yPos += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.brandPrimary);
      doc.text('PRIORITY NOTES', indentLeft, yPos);
      yPos += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
      const splitNotes = doc.splitTextToSize(formData.hourlyPriorityNotes, contentWidth - 12);
      splitNotes.forEach((line: string) => {
        yPos = checkPageBreak(doc, yPos, 4, pageHeight);
        doc.text(line, indentLeft, yPos);
        yPos += 3.5;
      });
    }
    
    // Logistics - Equipment & Supplies section
    yPos += 3;
    drawDivider(doc, yPos, indentLeft, contentRight - 10, COLORS.divider);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text('EQUIPMENT & SUPPLIES', indentLeft, yPos);
    yPos += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setTextColor(...COLORS.textDark);
    
    doc.text(`Vacuum: ${formData.hasVacuum ? 'Client has vacuum on-site' : 'Team brings vacuum'}`, indentLeft, yPos);
    yPos += 3.5;
    doc.text(`Parking: ${formData.hasParking ? 'Available for team' : 'Limited - may require street'}`, indentLeft, yPos);
    yPos += 3.5;
    
    // Pets to secure
    if (formData.hasPetsToSecure) {
      doc.setTextColor(...COLORS.brandAccent);
      doc.text('🐾 Pets: Will be secured by client during cleaning', indentLeft, yPos);
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
    }
    
    // Days per week for daily frequency
    if (formData.hourlyFrequency === 'daily' && formData.daysPerWeek) {
      doc.text(`Schedule: ${formData.daysPerWeek} days per week`, indentLeft, yPos);
      yPos += 3.5;
    }

  } else {
    // Custom/Partial mode (area-based)
    doc.setFillColor(...COLORS.brandAccent);
    doc.roundedRect(contentLeft, yPos - 3.5, 38, 6, 2, 2, 'F');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text('Custom Clean', contentLeft + 3, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setTextColor(...COLORS.textDark);
    
    // Zones with prices
    if (customZones.bathroom) {
      const bathTotal = (customCounts.masterBaths * 80) + (customCounts.fullBaths * 70) + (customCounts.halfBaths * 50);
      doc.text(`Bathrooms — M${customCounts.masterBaths}/F${customCounts.fullBaths}/H${customCounts.halfBaths}`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`$${bathTotal}`, contentRight, yPos, { align: 'right' });
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
    }
    if (customZones.kitchen) {
      doc.text('Kitchen — Full deep clean', indentLeft, yPos);
      doc.setTextColor(...COLORS.textMuted);
      doc.text('$165', contentRight, yPos, { align: 'right' });
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
    }
    if (customZones.living) {
      doc.text('Living Room — Complete refresh', indentLeft, yPos);
      doc.setTextColor(...COLORS.textMuted);
      doc.text('$110', contentRight, yPos, { align: 'right' });
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
    }
    if (customZones.bedroom && customCounts.bedroomCount > 0) {
      const bedroomTotal = Math.max(120, customCounts.bedroomCount * 40);
      doc.text(`Bedrooms (${customCounts.bedroomCount}) — Full service`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`$${bedroomTotal}`, contentRight, yPos, { align: 'right' });
      doc.setTextColor(...COLORS.textDark);
      yPos += 3.5;
    }
    
    yPos += 2;
    doc.text(`Property: ${formData.homeType}`, indentLeft, yPos);
  }
  
  yPos += 6;
  
  // ===== ADD-ONS SECTION =====
  if (selectedAddons.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20, pageHeight);
    drawDivider(doc, yPos, contentLeft, contentRight);
    yPos += 5;
    
    doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text('SELECTED ADD-ONS', contentLeft, yPos);
    
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    
    selectedAddons.forEach((addon) => {
      yPos = checkPageBreak(doc, yPos, 5, pageHeight);
      const price = addonPrices[addon.value] || 0;
      const label = getAddonEnglishLabel(addon.value);
      const totalPrice = price * addon.quantity;
      
      doc.setTextColor(...COLORS.textDark);
      doc.text(`${addon.quantity}× ${label}`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`$${totalPrice.toFixed(0)}`, contentRight, yPos, { align: 'right' });
      yPos += 3.5;
    });
    
    yPos += 3;
  }
  
  // ===== ROOM-BASED WINDOW & BLINDS SECTION =====
  if (formData.roomWindowSelections && formData.roomWindowSelections.length > 0) {
    const roomWindowTotals = calculateRoomWindowTotal(formData.roomWindowSelections);
    
    if (roomWindowTotals.totalPrice > 0) {
      // Separate main house from additional structures
      const mainHouseRooms = roomWindowTotals.breakdown.filter(item => 
        !item.roomId.startsWith('guest_') && !item.roomId.startsWith('studio_') && !item.roomId.startsWith('pool_')
      );
      const structureRooms = roomWindowTotals.breakdown.filter(item => 
        item.roomId.startsWith('guest_') || item.roomId.startsWith('studio_') || item.roomId.startsWith('pool_')
      );
      
      // === MAIN HOUSE WINDOWS ===
      if (mainHouseRooms.length > 0) {
        yPos = checkPageBreak(doc, yPos, 30, pageHeight);
        drawDivider(doc, yPos, contentLeft, contentRight);
        yPos += 5;
        
        doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.brandPrimary);
        doc.text('MAIN HOUSE – WINDOW & BLINDS BY ROOM', contentLeft, yPos);
        
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        
        // Print each main house room's breakdown
        mainHouseRooms.forEach((item) => {
          yPos = checkPageBreak(doc, yPos, 5, pageHeight);
          doc.setTextColor(...COLORS.textDark);
          doc.text(`${item.roomLabel}: ${item.description}`, indentLeft, yPos);
          doc.setTextColor(...COLORS.textMuted);
          doc.text(`$${item.price.toFixed(0)}`, contentRight, yPos, { align: 'right' });
          yPos += 3.5;
        });
        
        // Main house subtotal
        const mainHouseTotal = mainHouseRooms.reduce((sum, item) => sum + item.price, 0);
        const mainHouseMinutes = mainHouseRooms.reduce((sum, item) => sum + item.minutes, 0);
        yPos += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        doc.text('Main House Windows Subtotal', indentLeft, yPos);
        doc.setTextColor(...COLORS.brandAccent);
        doc.text(`$${mainHouseTotal.toFixed(0)}`, contentRight, yPos, { align: 'right' });
        
        yPos += 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.small);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(`(~${Math.round(mainHouseMinutes)} min labor)`, indentLeft, yPos);
        yPos += 5;
      }
      
      // === ADDITIONAL STRUCTURE WINDOWS ===
      if (structureRooms.length > 0) {
        yPos = checkPageBreak(doc, yPos, 25, pageHeight);
        
        doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.brandPrimary);
        doc.text('ADDITIONAL STRUCTURES – WINDOWS', contentLeft, yPos);
        
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        
        // Print each structure room's breakdown
        structureRooms.forEach((item) => {
          yPos = checkPageBreak(doc, yPos, 5, pageHeight);
          doc.setTextColor(...COLORS.textDark);
          doc.text(`${item.roomLabel}: ${item.description}`, indentLeft, yPos);
          doc.setTextColor(...COLORS.textMuted);
          doc.text(`$${item.price.toFixed(0)}`, contentRight, yPos, { align: 'right' });
          yPos += 3.5;
        });
        
        // Structure subtotal
        const structureTotal = structureRooms.reduce((sum, item) => sum + item.price, 0);
        const structureMinutes = structureRooms.reduce((sum, item) => sum + item.minutes, 0);
        yPos += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.textDark);
        doc.text('Structure Windows Subtotal', indentLeft, yPos);
        doc.setTextColor(...COLORS.brandAccent);
        doc.text(`$${structureTotal.toFixed(0)}`, contentRight, yPos, { align: 'right' });
        
        yPos += 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(PDF_CONFIG.fontSize.small);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(`(~${Math.round(structureMinutes)} min labor)`, indentLeft, yPos);
        yPos += 5;
      }
      
      // === COMBINED WINDOW TOTALS (if both main house and structures) ===
      if (mainHouseRooms.length > 0 && structureRooms.length > 0) {
        yPos += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(PDF_CONFIG.fontSize.body);
        doc.setTextColor(...COLORS.brandPrimary);
        doc.text('Combined Window & Blinds Total', indentLeft, yPos);
        doc.text(`$${roomWindowTotals.totalPrice.toFixed(0)}`, contentRight, yPos, { align: 'right' });
        yPos += 3;
      }
      
      // Summary stats (always show)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`(${roomWindowTotals.totalWindowsInside} interior + ${roomWindowTotals.totalWindowsOutside} exterior windows, ${roomWindowTotals.totalBlinds} blind sets • ~${Math.round(roomWindowTotals.laborMinutes)} min total)`, indentLeft, yPos);
      
      yPos += 5;
    }
  }

  // ===== DETAILED HOME MAPPING SECTION (NEW) =====
  // Shows baseboard config, surface notes, and bedroom profiles for work orders
  const isMoveOrDeep = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
  
  // Baseboard Configuration
  if (isMoveOrDeep && formData.baseboardSelections) {
    yPos = checkPageBreak(doc, yPos, 20, pageHeight);
    yPos += 3;
    
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text('BASEBOARD DETAIL', indentLeft, yPos);
    yPos += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setTextColor(...COLORS.textDark);
    
    const baseboardRooms: string[] = [];
    if (formData.baseboardSelections.kitchen) baseboardRooms.push('Kitchen');
    if (formData.baseboardSelections.living) baseboardRooms.push('Living');
    if ((formData.baseboardSelections as any).dining) baseboardRooms.push('Dining');
    if (formData.baseboardSelections.hallways) baseboardRooms.push('Hallways');
    if (formData.baseboardSelections.bedrooms) {
      Object.entries(formData.baseboardSelections.bedrooms).forEach(([id, enabled]) => {
        if (enabled) {
          const label = id === 'bed_0' ? 'Master' : `Bedroom ${parseInt(id.split('_')[1]) + 1}`;
          baseboardRooms.push(label);
        }
      });
    }
    
    if (baseboardRooms.length > 0) {
      doc.setTextColor(...COLORS.successGreen);
      doc.text(`✓ Baseboards Included: ${baseboardRooms.join(', ')}`, indentLeft, yPos);
      doc.setTextColor(...COLORS.textDark);
      yPos += 4;
    }
  }
  
  // Surface Notes (cleaning team instructions)
  if (formData.surfaceNotes) {
    const hasNotes = formData.surfaceNotes.kitchen || formData.surfaceNotes.living || 
                     formData.surfaceNotes.hallways || (formData.surfaceNotes as any).dining ||
                     (formData.surfaceNotes.bedrooms && Object.values(formData.surfaceNotes.bedrooms).some(n => n));
    
    if (hasNotes) {
      yPos = checkPageBreak(doc, yPos, 25, pageHeight);
      yPos += 2;
      
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.brandPrimary);
      doc.text('SURFACE NOTES (Team Instructions)', indentLeft, yPos);
      yPos += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.textMuted);
      
      if (formData.surfaceNotes.kitchen) {
        doc.text(`Kitchen: ${formData.surfaceNotes.kitchen}`, indentLeft, yPos);
        yPos += 3.5;
      }
      if (formData.surfaceNotes.living) {
        doc.text(`Living: ${formData.surfaceNotes.living}`, indentLeft, yPos);
        yPos += 3.5;
      }
      if ((formData.surfaceNotes as any).dining) {
        doc.text(`Dining: ${(formData.surfaceNotes as any).dining}`, indentLeft, yPos);
        yPos += 3.5;
      }
      if (formData.surfaceNotes.hallways) {
        doc.text(`Hallways: ${formData.surfaceNotes.hallways}`, indentLeft, yPos);
        yPos += 3.5;
      }
      if (formData.surfaceNotes.bedrooms) {
        Object.entries(formData.surfaceNotes.bedrooms).forEach(([id, notes]) => {
          if (notes) {
            const label = id === 'bed_0' ? 'Master Bedroom' : `Bedroom ${parseInt(id.split('_')[1]) + 1}`;
            doc.text(`${label}: ${notes}`, indentLeft, yPos);
            yPos += 3.5;
          }
        });
      }
      yPos += 2;
    }
  }
  
  // Bedroom Profiles with Add-ons
  if (formData.bedroomConfigs && Object.keys(formData.bedroomConfigs).length > 0) {
    const hasProfileData = Object.values(formData.bedroomConfigs).some(
      config => config.profile !== 'standard' || config.ceilingFans > 0 || config.lightFixtures > 0
    );
    
    if (hasProfileData) {
      yPos = checkPageBreak(doc, yPos, 20, pageHeight);
      yPos += 2;
      
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.brandPrimary);
      doc.text('BEDROOM DETAILS', indentLeft, yPos);
      yPos += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.textDark);
      
      const profileLabels: Record<string, string> = {
        master: 'Master Suite',
        kids: 'Kids Room',
        guest: 'Guest Room',
        office: 'Office/Study',
        standard: 'Standard Bedroom',
      };
      
      Object.entries(formData.bedroomConfigs).forEach(([id, config]) => {
        const roomLabel = id === 'bed_0' ? 'Master' : `Bedroom ${parseInt(id.split('_')[1]) + 1}`;
        const profileLabel = profileLabels[config.profile] || config.profile;
        const addons: string[] = [];
        if (config.ceilingFans > 0) addons.push(`${config.ceilingFans} ceiling fan${config.ceilingFans > 1 ? 's' : ''}`);
        if (config.lightFixtures > 0) addons.push(`${config.lightFixtures} light fixture${config.lightFixtures > 1 ? 's' : ''}`);
        if (config.closetCabinets > 0) addons.push(`${config.closetCabinets} closet${config.closetCabinets > 1 ? 's' : ''}`);
        
        const addonStr = addons.length > 0 ? ` (${addons.join(', ')})` : '';
        doc.text(`${roomLabel}: ${profileLabel}${addonStr}`, indentLeft, yPos);
        yPos += 3.5;
      });
      yPos += 2;
    }
  }

  // ===== CLOSET INVENTORY SECTION (Deep/Move Flows - Included at $0) =====
  const isDeepOrMove = formData.baseServiceLevel === 'Deep Clean' || formData.baseServiceLevel === 'Move-In/Out';
  
  if (isDeepOrMove && formData.bedroomConfigs) {
    const closetItems: { room: string; count: number }[] = [];
    
    Object.entries(formData.bedroomConfigs).forEach(([id, config]) => {
      if (config.closetCabinets && config.closetCabinets > 0) {
        const roomLabel = id === 'bed_0' ? 'Master Bedroom' : `Bedroom ${parseInt(id.split('_')[1]) + 1}`;
        closetItems.push({ room: roomLabel, count: config.closetCabinets });
      }
    });
    
    // Check for hallway linen cabinets in room addons
    if (formData.roomAddons?.hallways) {
      const hallwayCabinets = formData.roomAddons.hallways.filter(a => a.addonId === 'hallway_cabinets');
      hallwayCabinets.forEach(addon => {
        closetItems.push({ room: 'Hallway Linen Cabinet', count: addon.quantity });
      });
    }
    
    const totalClosets = closetItems.reduce((sum, item) => sum + item.count, 0);
    
    if (totalClosets > 0) {
      yPos = checkPageBreak(doc, yPos, 25, pageHeight);
      yPos += 3;
      
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.successGreen);
      doc.text('CLOSET INVENTORY (INCLUDED)', indentLeft, yPos);
      yPos += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.textDark);
      
      closetItems.forEach(item => {
        doc.text(`${item.room}: ${item.count} closet interior${item.count > 1 ? 's' : ''} — $0 (Included)`, indentLeft, yPos);
        yPos += 3.5;
      });
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Mapped: ${totalClosets} closet${totalClosets > 1 ? 's' : ''}`, indentLeft, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 4;
    }
  }

  // ===== WORK MAP BY FLOOR SECTION (Multi-Floor Properties) =====
  // Shows room distribution by floor for team routing
  const maxFloors = formData.propertyType === 'house' 
    ? (formData.houseLevels || 1) 
    : ((formData as any).apartmentUnitLevels || 1);
  
  if (maxFloors >= 2 && (formData as any).roomFloorLocations) {
    yPos = checkPageBreak(doc, yPos, 35, pageHeight);
    yPos += 3;
    
    doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text('WORK MAP BY FLOOR', indentLeft, yPos);
    yPos += 5;
    
    const locations = (formData as any).roomFloorLocations;
    
    // Group rooms by floor
    const floorGroups: Record<number, string[]> = {};
    for (let f = 1; f <= maxFloors; f++) {
      floorGroups[f] = [];
    }
    
    // Core spaces
    if (locations.kitchen) floorGroups[locations.kitchen]?.push('Kitchen');
    if (locations.living) floorGroups[locations.living]?.push('Living Room');
    if (locations.dining) floorGroups[locations.dining]?.push('Dining Room');
    if (locations.hallways) floorGroups[locations.hallways]?.push('Hallways');
    
    // Bedrooms
    if (locations.bedrooms) {
      Object.entries(locations.bedrooms).forEach(([id, floor]) => {
        const label = id === 'bed_0' ? 'Master Bedroom' : `Bedroom ${parseInt(id.split('_')[1]) + 1}`;
        floorGroups[floor as number]?.push(label);
      });
    }
    
    // Bathrooms
    if (locations.bathrooms) {
      locations.bathrooms.master?.forEach((floor: number, idx: number) => {
        const label = locations.bathrooms.master.length > 1 ? `Master Bath ${idx + 1}` : 'Master Bath';
        floorGroups[floor]?.push(label);
      });
      locations.bathrooms.full?.forEach((floor: number, idx: number) => {
        const label = locations.bathrooms.full.length > 1 ? `Full Bath ${idx + 1}` : 'Full Bath';
        floorGroups[floor]?.push(label);
      });
      locations.bathrooms.half?.forEach((floor: number, idx: number) => {
        const label = locations.bathrooms.half.length > 1 ? `Half Bath ${idx + 1}` : 'Half Bath';
        floorGroups[floor]?.push(label);
      });
    }
    
    // Optional spaces
    if (locations.optionalSpaces) {
      Object.entries(locations.optionalSpaces).forEach(([type, floors]) => {
        const typeLabels: Record<string, string> = { office: 'Office', laundry: 'Laundry', loft: 'Loft', garage: 'Garage' };
        (floors as number[]).forEach((floor, idx) => {
          const count = (floors as number[]).length;
          const label = count > 1 ? `${typeLabels[type]} ${idx + 1}` : typeLabels[type];
          floorGroups[floor]?.push(label);
        });
      });
    }
    
    // Render floor groups
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    
    for (let f = 1; f <= maxFloors; f++) {
      const rooms = floorGroups[f] || [];
      if (rooms.length > 0) {
        yPos = checkPageBreak(doc, yPos, 8, pageHeight);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.textDark);
        doc.text(`Floor ${f}:`, indentLeft, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textMuted);
        doc.text(rooms.join(', '), indentLeft + 18, yPos);
        yPos += 4;
      }
    }
    
    yPos += 2;
  }

  // ===== MICRO-SERVICES SECTION =====
  if (selectedMicroServices && selectedMicroServices.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20, pageHeight);
    drawDivider(doc, yPos, contentLeft, contentRight);
    yPos += 5;
    
    doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text('MICRO-SERVICES', contentLeft, yPos);
    
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    
    // Determine condition factor and heavy surcharge
    // Use SSOT heavy detection: area-specific or legacy
    let conditionFactor = 1.0;
    if (formData.conditionFee === 120) conditionFactor = 1.25;
    else if (formData.conditionFee === 180) conditionFactor = 1.5;
    
    // Use area-specific heavy detection when enabled
    const isHeavyForQuote = (formData.areaConditionEnabled && formData.globalConditionLevel === 'heavy_severe') || 
                           (formData.conditionFee || 0) >= 120;
    
    selectedMicroServices.forEach((micro) => {
      yPos = checkPageBreak(doc, yPos, 5, pageHeight);
      const service = microServices.find(m => m.id === micro.id);
      if (service) {
        const label = microServiceEnglishLabels[micro.id] || micro.id;
        const basePrice = calculateMicroServicePrice(service, micro.quantity, formData.sqft);
        let totalPrice = Math.round(basePrice * conditionFactor);
        if (isHeavyForQuote && service.heavySurchargePercent) {
          const heavyFactor = 1 + (service.heavySurchargePercent / 100);
          totalPrice = Math.round(totalPrice * heavyFactor);
        }
        
        doc.setTextColor(...COLORS.textDark);
        const hasHeavySurcharge = isHeavyForQuote && service.heavySurchargePercent;
        const labelWithHeavy = hasHeavySurcharge ? `${micro.quantity}× ${label} (Heavy)` : `${micro.quantity}× ${label}`;
        doc.text(labelWithHeavy, indentLeft, yPos);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(`$${totalPrice.toFixed(0)}`, contentRight, yPos, { align: 'right' });
        yPos += 3.5;
      }
    });
    
    // Heavy surcharge note
    if (microServicesHeavyApplied) {
      yPos += 1;
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.brandAccent);
      doc.text('* Heavy condition pricing applied', indentLeft, yPos);
      yPos += 3;
    }
    
    // Minimum note
    if (microServicesMinimumApplied) {
      yPos += 1;
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`* $${MICRO_SERVICES_MINIMUM} minimum visit applied`, indentLeft, yPos);
      yPos += 3;
    }
    
    yPos += 3;
  }
  
  // ===== SPECIAL NOTES SECTION =====
  if (formData.notes || formData.accessNotes) {
    yPos = checkPageBreak(doc, yPos, 15, pageHeight);
    drawDivider(doc, yPos, contentLeft, contentRight);
    yPos += 5;
    
    doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text('SPECIAL NOTES', contentLeft, yPos);
    
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setTextColor(...COLORS.textDark);
    
    if (formData.accessNotes) {
      const splitAccessNotes = doc.splitTextToSize(`Access: ${formData.accessNotes}`, contentWidth - 8);
      splitAccessNotes.forEach((line: string) => {
        yPos = checkPageBreak(doc, yPos, 4, pageHeight);
        doc.text(line, indentLeft, yPos);
        yPos += 3.5;
      });
    }
    
    if (formData.notes) {
      const splitNotes = doc.splitTextToSize(formData.notes, contentWidth - 8);
      splitNotes.forEach((line: string) => {
        yPos = checkPageBreak(doc, yPos, 4, pageHeight);
        doc.text(line, indentLeft, yPos);
        yPos += 3.5;
      });
    }
    
    yPos += 3;
  }
  
  // ===== ESTIMATE NOTES SECTION =====
  yPos = checkPageBreak(doc, yPos, 35, pageHeight);
  drawDivider(doc, yPos, contentLeft, contentRight);
  yPos += 5;
  
  doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('ESTIMATE NOTES', contentLeft, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setTextColor(...COLORS.textMuted);
  
  const estimateNotes = [
    'This estimate reflects:',
    '• Standard condition pricing',
    '• Preferred online-booking rate',
    '• Priority scheduling for your selected services',
    '• Complimentary quality assurance check upon arrival',
    '',
    'If your home has heavy buildup (grease, soap scum, hard water,',
    'or long-term residue), your professional cleaner will confirm any',
    'time or cost adjustments before work begins. This ensures',
    'transparency and maintains our no-surprises policy.',
    '',
    "Thank you for choosing Nancy's Cleaning Services — trusted by",
    'local families throughout Santa Barbara, Ventura & Central Coast.',
  ];
  
  estimateNotes.forEach((line) => {
    if (line) {
      yPos = checkPageBreak(doc, yPos, 4, pageHeight);
      doc.text(line, indentLeft, yPos);
    }
    yPos += 3;
  });
  
  yPos += 3;
  
  // ===== YOUR ESTIMATE (TOTAL) SECTION =====
  yPos = checkPageBreak(doc, yPos, 30, pageHeight);
  drawDivider(doc, yPos, contentLeft, contentRight);
  yPos += 4;
  
  // Check if we need dual pricing display (recurring with both prices available)
  const showDualPricing = isRecurring && firstVisitPrice !== undefined && futureVisitsPrice !== undefined;
  const cardHeight = showDualPricing ? 28 : 16;
  
  // Draw card background
  drawCardBackground(doc, contentLeft, yPos - 1, contentWidth, cardHeight, COLORS.cardBg);
  
  if (showDualPricing) {
    // Dual pricing display for recurring services
    doc.setFontSize(PDF_CONFIG.fontSize.label);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('YOUR RECURRING ESTIMATE', contentLeft + 4, yPos + 4);
    
    yPos += 8;
    
    // First Visit row
    const firstVisitLabel = recurringStartMode === 'deep-plus-recurring' ? 'First Visit (Deep Reset)' : 'First Visit';
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textDark);
    doc.text(firstVisitLabel, contentLeft + 4, yPos + 4);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text(`$${firstVisitPrice}`, contentRight - 4, yPos + 4, { align: 'right' });
    
    yPos += 7;
    
    // Recurring visits row
    const frequencyLabel = formData.serviceType === 'Weekly Price' ? 'Weekly' : 
                           formData.serviceType === 'Bi-Weekly Price' ? 'Bi-Weekly' : 'Monthly';
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textDark);
    doc.text(`${frequencyLabel} Visits (Ongoing)`, contentLeft + 4, yPos + 4);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandAccent);
    doc.text(`$${futureVisitsPrice}`, contentRight - 4, yPos + 4, { align: 'right' });
    
    yPos += cardHeight - 13;
  } else {
    // Single price display (one-time services or hourly)
    doc.setFontSize(PDF_CONFIG.fontSize.label);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('YOUR ESTIMATE', contentLeft + 4, yPos + 5);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandPrimary);
    doc.text(`$${total}`, contentRight - 4, yPos + 6, { align: 'right' });
    
    yPos += 18;
  }
  
  // ===== PREMIUM OFFER BADGE (if applicable) =====
  const serviceIdx = serviceTypeMap[formData.serviceType];
  const showOffer = mode === 'full' && serviceIdx !== 2; // Not Standard Clean
  
  if (showOffer) {
    yPos = checkPageBreak(doc, yPos, 22, pageHeight);
    yPos += 2;
    
    const offerCardHeight = isRecurring ? 22 : 18;
    drawCardBackground(doc, contentLeft, yPos - 2, contentWidth, offerCardHeight, COLORS.offerBg);
    
    // Badge
    doc.setFillColor(...COLORS.brandAccent);
    doc.roundedRect(contentLeft + 4, yPos, 42, 5, 1.5, 1.5, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text('PREFERRED CLIENT RATE', contentLeft + 6, yPos + 3.5);
    
    yPos += 8;
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textDark);
    
    if (isRecurring) {
      const recurringOffers: Record<number, string> = {
        3: 'Weekly: Aroma Ritual + Free add-on quarterly',
        4: 'Bi-Weekly: $50 bonus add-on credit every 3 months',
        5: 'Monthly: $25 off deep touch-ups every 3-6 months',
      };
      const offerText = recurringOffers[serviceIdx] || 'Exclusive membership benefits';
      const wrappedOffer = doc.splitTextToSize(offerText, contentWidth - 12);
      doc.text(wrappedOffer, contentLeft + 4, yPos);
      yPos += wrappedOffer.length * 3.5 + 1;
      
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.textMuted);
      doc.text('Benefits activate upon first service', contentLeft + 4, yPos);
    } else {
      const offerText = `Confirm by ${getOfferExpiry()} for complimentary Inside Fridge or Oven ($35 value)`;
      const wrappedOffer = doc.splitTextToSize(offerText, contentWidth - 12);
      doc.text(wrappedOffer, contentLeft + 4, yPos);
      yPos += wrappedOffer.length * 3.5 + 1;
      
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setTextColor(...COLORS.textMuted);
      doc.text('Use code 35BONUS to activate • Limited availability', contentLeft + 4, yPos);
    }
    
    if (preferredRateWindow) {
      yPos += 3.5;
      doc.text(`Preferred Rate Window: ${preferredRateWindow}`, contentLeft + 4, yPos);
    }
    
    yPos += offerCardHeight - 14;
  }
  
  // ===== PREFERRED CODE SECTION (if code applied) =====
  if (preferredCode && preferredValue) {
    yPos = checkPageBreak(doc, yPos, 18, pageHeight);
    yPos += 3;
    
    const codeCardHeight = 16;
    drawCardBackground(doc, contentLeft, yPos - 2, contentWidth, codeCardHeight, COLORS.successGreenBg);
    
    // Badge
    doc.setFillColor(...COLORS.successGreen);
    doc.roundedRect(contentLeft + 4, yPos, 36, 5, 1.5, 1.5, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text('PREFERRED CODE', contentLeft + 6, yPos + 3.5);
    
    yPos += 8;
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textDark);
    doc.text(`Code Applied: ${preferredCode}`, contentLeft + 4, yPos);
    
    doc.setTextColor(...COLORS.successGreen);
    doc.setFont('helvetica', 'bold');
    doc.text(`Value: $${preferredValue} Included`, contentRight - 4, yPos, { align: 'right' });
    
    if (preferredRateWindow) {
      yPos += 3.5;
      doc.setFontSize(PDF_CONFIG.fontSize.small);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`Preferred Rate Window: ${preferredRateWindow}`, contentLeft + 4, yPos);
    }
    
    yPos += codeCardHeight - 10;
  }
  
  // ===== FOOTER =====
  const footerY = pageHeight - PDF_CONFIG.marginBottom;
  
  drawDivider(doc, footerY - 8, contentLeft + 15, contentRight - 15);
  
  doc.setFontSize(PDF_CONFIG.fontSize.footer);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Payment Methods: Credit/Debit • Venmo • Zelle • Bill Pay', pageWidth / 2, footerY - 3, { align: 'center' });
  
  doc.setFontSize(6);
  doc.text(`This estimate is valid for 7 days (until ${getQuoteValidity()}). Final pricing confirmed upon booking.`, pageWidth / 2, footerY + 1, { align: 'center' });
  
  // Bottom decorative line
  doc.setFillColor(...COLORS.brandAccent);
  doc.rect(0, pageHeight - 2.5, pageWidth, 2.5, 'F');
  
  return { doc, proposalNumber };
}

export function generateQuotePDF(params: GeneratePDFParams): void {
  const { doc, proposalNumber } = generatePDFDocument(params);
  const fileName = `Nancys_Quote_${proposalNumber}.pdf`;
  doc.save(fileName);
}

export function generateQuotePDFBlob(params: GeneratePDFParams): { blob: Blob; fileName: string; proposalNumber: string } {
  const { doc, proposalNumber } = generatePDFDocument(params);
  const blob = doc.output('blob');
  return { blob, fileName: `Nancys_Quote_${proposalNumber}.pdf`, proposalNumber };
}

// Helper to download a Blob as a file (mobile-friendly)
export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate consistent filename from params
export function buildPdfFilename(city?: string, leadId?: string): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const cityPart = (city || 'Quote').replace(/[^a-zA-Z0-9]/g, '-');
  const idPart = (leadId || 'draft').replace(/[^a-zA-Z0-9]/g, '-');
  return `Nancys-Cleaning-Proposal_${cityPart}_${dateStr}_${idPart}.pdf`;
}
