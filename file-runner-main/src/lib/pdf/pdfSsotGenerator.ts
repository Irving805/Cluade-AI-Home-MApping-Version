/**
 * PDF SSOT Generator — Single Source of Truth Compliant
 * 
 * ARCHITECTURE:
 * - Page 1: START SSOT Sections (client-facing clean summary)
 * - Page 2: Detailed Mapping Appendix (if needed)
 * 
 * NON-NEGOTIABLES:
 * 1. All pricing from summary.totals ONLY
 * 2. All line items from summary.lineItems ONLY
 * 3. Section order MUST match START flow exactly
 * 4. Explicit empty states ("No add-ons selected")
 * 5. No calculation functions in this file
 */

import { jsPDF } from 'jspdf';
import type { BookingFormData, ServiceMode, Addon, RecurringStartMode, MicroServiceSelection } from '@/contexts/BookingContext';
import type { BookingSummary, PricingTotals, VisibilityResult, SummaryLineItem } from '@/lib/summary/types';
import type { HomeLayoutModel } from '@/lib/layout/homeLayoutModel';
import { homeSizeOptions, serviceTypes } from '@/lib/pricing';
// SSOT: Import centralized label normalizers for presentation
import { 
  formatHomeSizeLabel, 
  formatSquareFootageLabel, 
  formatConditionLevelLabel,
  formatPropertyTypeLabel,
  formatMoveConditionLabel,
  formatServiceTypeLabel 
} from './labelNormalizers';
// Dev-only guards for regression prevention
import { assertNoTokenLeaks, assertPriceNotZero } from './pdfDevGuards';

// ===== LAYOUT CONFIGURATION =====
export type PdfLayout = 'desktop' | 'tablet' | 'mobile';

interface LayoutConfig {
  fontSize: {
    companyName: number;
    title: number;
    sectionHeader: number;
    label: number;
    body: number;
    small: number;
  };
  spacing: {
    sectionGap: number;
    cardPadding: number;
    lineHeight: number;
  };
  stackedLabels: boolean;
  valueColumnOffset: number;
}

const LAYOUT_CONFIG: Record<PdfLayout, LayoutConfig> = {
  desktop: {
    fontSize: { companyName: 20, title: 13, sectionHeader: 10, label: 8, body: 8, small: 7 },
    spacing: { sectionGap: 6, cardPadding: 4, lineHeight: 3.5 },
    stackedLabels: false,
    valueColumnOffset: 40,
  },
  tablet: {
    fontSize: { companyName: 22, title: 14, sectionHeader: 11, label: 9, body: 9, small: 8 },
    spacing: { sectionGap: 8, cardPadding: 5, lineHeight: 4 },
    stackedLabels: false,
    valueColumnOffset: 50,
  },
  mobile: {
    fontSize: { companyName: 24, title: 15, sectionHeader: 12, label: 10, body: 10, small: 9 },
    spacing: { sectionGap: 10, cardPadding: 6, lineHeight: 4.5 },
    stackedLabels: true,
    valueColumnOffset: 0,
  },
};

// ===== CONFIGURATION =====
const PDF_CONFIG = {
  pageFormat: 'letter' as const,
  orientation: 'portrait' as const,
  marginLeft: 18,
  marginRight: 18,
  marginTop: 20,
  marginBottom: 22,
  fontSize: {
    companyName: 20,
    title: 13,
    sectionHeader: 10,
    label: 8,
    body: 8,
    small: 7,
  },
  spacing: {
    sectionGap: 6,
    cardPadding: 4,
    lineHeight: 3.5,
  },
};

const COLORS = {
  brandPrimary: [89, 66, 52] as [number, number, number],
  brandAccent: [166, 124, 82] as [number, number, number],
  textDark: [38, 38, 38] as [number, number, number],
  textMuted: [100, 100, 100] as [number, number, number],
  cardBg: [252, 250, 248] as [number, number, number],
  sectionHeaderBg: [245, 243, 240] as [number, number, number],
  successGreen: [46, 125, 50] as [number, number, number],
  warningAmber: [180, 100, 20] as [number, number, number],
  divider: [220, 220, 220] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  includedBadge: [59, 130, 246] as [number, number, number], // Blue
  selectedBadge: [16, 185, 129] as [number, number, number], // Green
};

// ===== SSOT PDF PARAMS INTERFACE =====
export interface SsotPdfParams {
  mode: ServiceMode;
  formData: BookingFormData;
  summary: BookingSummary; // SSOT: All derived data
  selectedAddons: Addon[];
  selectedMicroServices?: MicroServiceSelection[];
  recurringStartMode: RecurringStartMode;
  isRecurring: boolean;
  layoutModel?: HomeLayoutModel | null;
  // Optional display overrides
  preferredRateWindow?: string;
  preferredCode?: string;
  preferredValue?: number;
  // Layout mode for responsive PDF (default: 'desktop')
  layout?: PdfLayout;
}

// ===== ENGLISH LABELS =====
const EN_LABELS: Record<string, string> = {
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
  'st.standard': 'Standard Clean',
  'st.deep': 'Deep Clean',
  'st.move': 'Move-In/Out',
};

// ===== HELPER FUNCTIONS =====
const generateProposalNumber = (): string => {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `NCS-${randomNum}`;
};

const formatDate = (): string => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getQuoteValidity = (): string => {
  const validity = new Date();
  validity.setDate(validity.getDate() + 7);
  return validity.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const drawCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number] = COLORS.cardBg
) => {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'F');
};

const drawDivider = (doc: jsPDF, y: number, x1: number, x2: number) => {
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
};

const drawSectionHeader = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number
): number => {
  drawCard(doc, x, y - 3.5, width, 7, COLORS.sectionHeaderBg);
  doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text(text, x + 4, y);
  return y + 6;
};

const drawLabelValue = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  valueX: number
): number => {
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text(label, x, y);
  doc.setTextColor(...COLORS.textDark);
  doc.setFont('helvetica', 'bold');
  doc.text(value, valueX, y, { align: 'right' });
  return y + PDF_CONFIG.spacing.lineHeight;
};

const drawBadge = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  bgColor: [number, number, number]
): number => {
  const textWidth = doc.getTextWidth(text) + 4;
  doc.setFillColor(...bgColor);
  doc.roundedRect(x, y - 2.5, textWidth, 4.5, 1.5, 1.5, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(text, x + 2, y);
  return textWidth;
};

const checkPageBreak = (doc: jsPDF, yPos: number, needed: number, pageHeight: number): number => {
  const safeBottom = pageHeight - PDF_CONFIG.marginBottom - 10;
  if (yPos + needed > safeBottom) {
    doc.addPage();
    return PDF_CONFIG.marginTop;
  }
  return yPos;
};

// ===== SECTION RENDERERS (START SSOT ORDER) =====

/**
 * Section 1: Header + Client Info
 */
function renderHeader(
  doc: jsPDF,
  params: SsotPdfParams,
  proposalNumber: string,
  pageWidth: number,
  contentLeft: number,
  contentRight: number,
  contentWidth: number
): number {
  let yPos = 10;

  // Top accent line
  doc.setFillColor(...COLORS.brandAccent);
  doc.rect(0, 0, pageWidth, 2, 'F');

  // Company name
  doc.setFontSize(PDF_CONFIG.fontSize.companyName);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text("Nancy's Cleaning Services", pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;
  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Professional Home Care  •  Santa Barbara & Ventura Counties', pageWidth / 2, yPos, { align: 'center' });

  yPos += 3.5;
  doc.text('(805) 719-7447  •  info@nancyshousekeepingservice.com', pageWidth / 2, yPos, { align: 'center' });

  yPos += 4;
  drawDivider(doc, yPos, contentLeft, contentRight);

  // Title
  yPos += 6;
  doc.setFontSize(PDF_CONFIG.fontSize.title);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.brandAccent);
  doc.text('Your Personalized Cleaning Estimate', pageWidth / 2, yPos, { align: 'center' });

  yPos += 4;
  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`Prepared: ${formatDate()}  •  Quote #${proposalNumber}`, pageWidth / 2, yPos, { align: 'center' });

  // Client card
  yPos += 5;
  const { formData } = params;
  const clientCardY = yPos;
  let clientY = yPos + 4;

  doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('PREPARED FOR', contentLeft + 4, clientY);

  clientY += 4;
  doc.setFontSize(PDF_CONFIG.fontSize.label);
  doc.setTextColor(...COLORS.textDark);
  doc.text(`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Guest', contentLeft + 4, clientY);

  clientY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(...COLORS.textMuted);

  const contactParts = [formData.phone, formData.email].filter(Boolean);
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  •  '), contentLeft + 4, clientY);
    clientY += 3.5;
  }

  const address = [formData.address, formData.city].filter(Boolean).join(', ');
  if (address) {
    doc.text(address, contentLeft + 4, clientY);
    clientY += 3.5;
  }

  const cardHeight = clientY - clientCardY + 2;
  drawCard(doc, contentLeft, clientCardY - 1, contentWidth, cardHeight, COLORS.cardBg);

  // Re-render text on top of card
  clientY = clientCardY + 4;
  doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('PREPARED FOR', contentLeft + 4, clientY);

  clientY += 4;
  doc.setFontSize(PDF_CONFIG.fontSize.label);
  doc.setTextColor(...COLORS.textDark);
  doc.text(`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Guest', contentLeft + 4, clientY);

  clientY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setTextColor(...COLORS.textMuted);
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  •  '), contentLeft + 4, clientY);
    clientY += 3.5;
  }
  if (address) {
    doc.text(address, contentLeft + 4, clientY);
  }

  return clientCardY + cardHeight + 3;
}

/**
 * Section 2: Service Level (START ORDER #1)
 */
function renderServiceLevel(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  yPos = checkPageBreak(doc, yPos, 20, pageHeight);
  yPos = drawSectionHeader(doc, '1. SERVICE LEVEL', contentLeft, yPos, contentWidth);

  const { formData, summary } = params;
  const serviceLabel = serviceTypes.find(s => s.value === formData.serviceType);
  // SSOT: Use centralized normalizer instead of EN_LABELS
  const serviceName = formatServiceTypeLabel(
    serviceLabel?.labelKey || formData.baseServiceLevel, 
    'en'
  );
  assertNoTokenLeaks(serviceName, 'Service Level');

  // Service type badge
  doc.setFillColor(...COLORS.brandAccent);
  const badgeWidth = doc.getTextWidth(serviceName) + 8;
  doc.roundedRect(contentLeft + 4, yPos - 2, Math.min(badgeWidth, 55), 5, 1.5, 1.5, 'F');
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(serviceName, contentLeft + 7, yPos + 1);

  yPos += 6;

  // Base price from SSOT
  yPos = drawLabelValue(doc, 'Base Service Price', `$${summary.totals.basePrice}`, contentLeft + 4, yPos, valueX);

  return yPos + 2;
}

/**
 * Section 3: Move Condition (START ORDER #2) - Only for MOVING flow
 */
function renderMoveCondition(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  const { formData, summary } = params;
  
  // Only show for MOVING flow with move condition set
  if (!formData.moveCondition) return yPos;

  yPos = checkPageBreak(doc, yPos, 20, pageHeight);
  yPos = drawSectionHeader(doc, '2. MOVE CONDITION', contentLeft, yPos, contentWidth);

  // SSOT: Use centralized normalizer for move condition
  const conditionLabel = formatMoveConditionLabel(formData.moveCondition || '', 'en');
  assertNoTokenLeaks(conditionLabel, 'Move Condition');
  yPos = drawLabelValue(doc, 'Occupancy Status', conditionLabel, contentLeft + 4, yPos, valueX);

  // Partial empty discount from SSOT
  if (summary.totals.partialEmptyDiscount && summary.totals.partialEmptyDiscount > 0) {
    yPos = drawLabelValue(
      doc, 
      'Partial Empty Discount', 
      `-$${summary.totals.partialEmptyDiscount}`, 
      contentLeft + 4, 
      yPos, 
      valueX
    );
  }

  // Excluded zones
  if (summary.totals.partialEmptyRemovedZones && summary.totals.partialEmptyRemovedZones.length > 0) {
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Excluded: ${summary.totals.partialEmptyRemovedZones.join(', ')}`, contentLeft + 4, yPos);
    yPos += PDF_CONFIG.spacing.lineHeight;
  }

  return yPos + 2;
}

/**
 * Section 4: The Structure (START ORDER #3)
 */
function renderStructure(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  yPos = checkPageBreak(doc, yPos, 25, pageHeight);
  
  const sectionNum = params.formData.moveCondition ? '3' : '2';
  yPos = drawSectionHeader(doc, `${sectionNum}. THE STRUCTURE`, contentLeft, yPos, contentWidth);

  const { formData, summary } = params;

  // SSOT: Use centralized normalizer for property type
  const propertyLabel = formatPropertyTypeLabel(formData.propertyType || 'house', 'en');
  assertNoTokenLeaks(propertyLabel, 'Structure - Property Type');
  yPos = drawLabelValue(doc, 'Property Type', propertyLabel, contentLeft + 4, yPos, valueX);

  // Floors/Levels
  if (formData.propertyType === 'house' && formData.houseLevels) {
    const levelLabel = formData.houseLevels === 1 ? '1 Story' : `${formData.houseLevels} Stories`;
    yPos = drawLabelValue(doc, 'Floors', levelLabel, contentLeft + 4, yPos, valueX);
  } else if (formData.propertyType === 'apartment') {
    const floorLabel = `Floor ${formData.apartmentFloor || 1}`;
    const elevatorLabel = formData.hasElevator !== false ? '(Elevator)' : '(Walk-Up)';
    yPos = drawLabelValue(doc, 'Access', `${floorLabel} ${elevatorLabel}`, contentLeft + 4, yPos, valueX);
  }

  // Vertical surcharge from SSOT
  if (summary.totals.verticalSurcharge > 0) {
    doc.setTextColor(...COLORS.warningAmber);
    yPos = drawLabelValue(doc, 'Vertical Access Fee', `+$${summary.totals.verticalSurcharge}`, contentLeft + 4, yPos, valueX);
    doc.setTextColor(...COLORS.textDark);
  }

  return yPos + 2;
}

/**
 * Section 5: Property Size (START ORDER #4)
 */
function renderPropertySize(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  yPos = checkPageBreak(doc, yPos, 20, pageHeight);
  
  const sectionNum = params.formData.moveCondition ? '4' : '3';
  yPos = drawSectionHeader(doc, `${sectionNum}. PROPERTY SIZE`, contentLeft, yPos, contentWidth);

  const { formData } = params;

  // SSOT: Use centralized normalizer (no token leaks like "opt.4bed")
  const homeSizeLabel = formatHomeSizeLabel(formData.homeSize || 0, 'en');
  assertNoTokenLeaks(homeSizeLabel, 'Property Size - Home Size');
  yPos = drawLabelValue(doc, 'Home Size', homeSizeLabel, contentLeft + 4, yPos, valueX);

  // Square footage - use normalizer (no token leaks like "SF_900_1200")
  if (formData.squareFootageRange) {
    const sqftLabel = formatSquareFootageLabel(formData.squareFootageRange, 'en');
    assertNoTokenLeaks(sqftLabel, 'Property Size - Sqft');
    yPos = drawLabelValue(doc, 'Approx. Sqft', sqftLabel, contentLeft + 4, yPos, valueX);
  }

  return yPos + 2;
}

/**
 * Section 6: Detailed Home Mapping (START ORDER #5)
 * Core areas (SERVICE-INCLUDED) + Connectors + Per-Space Addons
 * 
 * SSOT: Reads EXCLUSIVELY from summary.sectionBlocks.detailedMapping
 * NO direct formData.spaceFloorTypes access
 */
function renderDetailedMapping(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  yPos = checkPageBreak(doc, yPos, 35, pageHeight);
  
  const sectionNum = params.formData.moveCondition ? '5' : '4';
  yPos = drawSectionHeader(doc, `${sectionNum}. DETAILED HOME MAPPING`, contentLeft, yPos, contentWidth);

  const { summary } = params;
  const visibility = summary.visibility;
  const detailedMapping = summary.sectionBlocks.detailedMapping;

  // === Core Areas (SERVICE-INCLUDED) ===
  doc.setFontSize(PDF_CONFIG.fontSize.body);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('Core Areas', contentLeft + 4, yPos);
  drawBadge(doc, 'INCLUDED', contentLeft + 32, yPos, COLORS.includedBadge);
  yPos += PDF_CONFIG.spacing.lineHeight + 1;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(PDF_CONFIG.fontSize.body);

  // Render each space from SSOT detailedMapping.spaces
  const includedSpaces = detailedMapping.spaces.filter(s => !s.isExcluded && s.origin === 'included');
  const excludedSpaces = detailedMapping.spaces.filter(s => s.isExcluded);
  
  // SSOT RULE #12: Multi-floor unmapped = "Floor TBD", single-floor = omit floor note
  const isMultiFloor = params.formData.propertyType === 'house' 
    ? (params.formData.houseLevels || 1) > 1
    : (params.formData.apartmentUnitLevels || 1) > 1;
  
  // Build space list with floor types and floor levels (SSOT)
  includedSpaces.forEach((space, idx) => {
    const floorNote = space.floorType ? ` (${space.floorType})` : '';
    // Floor level with TBD fallback for multi-floor properties
    const levelNote = space.floorLevel 
      ? ` — Floor ${space.floorLevel}` 
      : (isMultiFloor ? ' — Floor TBD' : '');
    const spaceLine = `• ${space.displayName}${floorNote}${levelNote}`;
    doc.text(spaceLine, contentLeft + 4, yPos);
    yPos += PDF_CONFIG.spacing.lineHeight;
    
    // Render per-space addons (from SSOT) - these appear ONLY here, not in ADD-ONS section
    if (space.addons && space.addons.length > 0) {
      space.addons.forEach(addon => {
        doc.setFontSize(PDF_CONFIG.fontSize.small);
        doc.setTextColor(...COLORS.textMuted);
        const addonQty = addon.qty > 1 ? ` ×${addon.qty}` : '';
        // Validate price from SSOT
        assertPriceNotZero(`${space.displayName} - ${addon.label}`, addon.price, addon.price);
        doc.text(`   + ${addon.label}${addonQty} ($${addon.price})`, contentLeft + 8, yPos);
        yPos += PDF_CONFIG.spacing.lineHeight - 0.5;
      });
      doc.setFontSize(PDF_CONFIG.fontSize.body);
      doc.setTextColor(...COLORS.textDark);
    }
  });

  // === Excluded Spaces (MOVING partial empty) ===
  if (excludedSpaces.length > 0) {
    yPos += 2;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textMuted);
    const excludedNames = excludedSpaces.map(s => s.displayName).join(', ');
    doc.text(`Excluded: ${excludedNames}`, contentLeft + 4, yPos);
    yPos += PDF_CONFIG.spacing.lineHeight;
  }

  // === Connectors (Hallways & Stairs from SSOT) ===
  // ALWAYS show Connectors subsection (with explicit empty state per SSOT RULE #8)
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('Connectors', contentLeft + 4, yPos);
  yPos += PDF_CONFIG.spacing.lineHeight;

  if (detailedMapping.hallwayCount > 0 || detailedMapping.stairCount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textDark);

    // Hallways from SSOT detailedMapping
    if (detailedMapping.hallwayCount > 0 && summary.totals.hallwaysTotal > 0) {
      yPos = drawLabelValue(
        doc, 
        `Hallways (${detailedMapping.hallwayCount})`, 
        `+$${summary.totals.hallwaysTotal}`, 
        contentLeft + 4, 
        yPos, 
        valueX
      );
    }

    // Stairs from SSOT detailedMapping
    if (detailedMapping.stairCount > 0 && summary.totals.stairsTotal > 0) {
      yPos = drawLabelValue(
        doc, 
        `Stairs (${detailedMapping.stairCount})`, 
        `+$${summary.totals.stairsTotal}`, 
        contentLeft + 4, 
        yPos, 
        valueX
      );
    }
  } else {
    // Explicit empty state (SSOT RULE #8)
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('No hallways or stairs configured', contentLeft + 4, yPos);
    yPos += PDF_CONFIG.spacing.lineHeight;
  }

  return yPos + 2;
}

/**
 * Section 7: Utility Areas (START ORDER #6)
 */
function renderUtilityAreas(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  yPos = checkPageBreak(doc, yPos, 25, pageHeight);
  
  const sectionNum = params.formData.moveCondition ? '6' : '5';
  yPos = drawSectionHeader(doc, `${sectionNum}. UTILITY AREAS`, contentLeft, yPos, contentWidth);

  const { summary } = params;
  const utilityBlock = summary.sectionBlocks.utilityAreas;

  // Get utility line items from SSOT
  const utilityLineItems = summary.lineItems.filter(item => item.section === 'utility');

  if (utilityLineItems.length === 0 || utilityBlock.totalPrice === 0) {
    // Explicit empty state
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('No utility areas selected', contentLeft + 4, yPos);
    return yPos + PDF_CONFIG.spacing.lineHeight + 2;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_CONFIG.fontSize.body);

  // Render each enabled utility area from SSOT lineItems
  utilityLineItems.forEach(item => {
    const label = item.titleKey.replace('spaces.', '').replace(/_/g, ' ');
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    drawBadge(doc, 'SELECTED', contentLeft + 4, yPos, COLORS.selectedBadge);
    yPos = drawLabelValue(doc, `  ${capitalizedLabel}`, `+$${item.price}`, contentLeft + 22, yPos, valueX);
  });

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  yPos = drawLabelValue(doc, 'Utility Areas Total', `$${utilityBlock.totalPrice}`, contentLeft + 4, yPos, valueX);

  return yPos + 2;
}

/**
 * Section 8: Bathroom Modules (START ORDER #7)
 */
function renderBathroomModules(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  yPos = checkPageBreak(doc, yPos, 25, pageHeight);
  
  const sectionNum = params.formData.moveCondition ? '7' : '6';
  yPos = drawSectionHeader(doc, `${sectionNum}. BATHROOM MODULES`, contentLeft, yPos, contentWidth);

  const { formData, summary } = params;

  // SSOT: Bathroom count from inventory or legacy
  const inventoryCount = formData.bathroomInventory?.bathrooms?.length || 0;
  const legacyCount = (formData.masterBaths || 0) + (formData.fullBaths || 0) + (formData.halfBaths || 0);
  const totalBaths = inventoryCount > 0 ? inventoryCount : legacyCount;

  yPos = drawLabelValue(
    doc, 
    `${totalBaths} Bathroom${totalBaths !== 1 ? 's' : ''}`, 
    inventoryCount > 0 ? '(Detailed Inventory)' : '', 
    contentLeft + 4, 
    yPos, 
    valueX
  );

  // Bathroom total from SSOT
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  yPos = drawLabelValue(doc, 'Bathroom Cleaning', `$${summary.totals.bathroomTotal}`, contentLeft + 4, yPos, valueX);

  return yPos + 2;
}

/**
 * Section 9: Property Condition (START ORDER #8)
 */
function renderPropertyCondition(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  const { summary, formData } = params;

  // Only show if condition fee exists
  if (summary.totals.conditionFee === 0 && !summary.totals.conditionFeeBreakdown?.length) {
    return yPos;
  }

  yPos = checkPageBreak(doc, yPos, 25, pageHeight);
  
  const sectionNum = params.formData.moveCondition ? '8' : '7';
  yPos = drawSectionHeader(doc, `${sectionNum}. PROPERTY CONDITION`, contentLeft, yPos, contentWidth);

  // SSOT: Use centralized normalizer for condition level (no "above_average" tokens)
  const levelLabel = formatConditionLevelLabel(summary.totals.conditionFeeLevel, 'en');
  assertNoTokenLeaks(levelLabel, 'Property Condition - Level');
  yPos = drawLabelValue(doc, 'Condition Level', levelLabel, contentLeft + 4, yPos, valueX);

  // Area-specific breakdown from SSOT
  if (summary.totals.conditionFeeBreakdown && summary.totals.conditionFeeBreakdown.length > 0) {
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    
    summary.totals.conditionFeeBreakdown.forEach(item => {
      doc.text(`• ${item.displayName}: +$${item.fee}`, contentLeft + 4, yPos);
      yPos += PDF_CONFIG.spacing.lineHeight;
    });
  }

  // Condition fee total from SSOT
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.warningAmber);
  yPos = drawLabelValue(doc, 'Condition Fee', `+$${summary.totals.conditionFee}`, contentLeft + 4, yPos, valueX);

  return yPos + 2;
}

/**
 * Additional: Add-ons Section
 * 
 * SSOT UX FIX: Shows ONLY global addons (scope='global' or no scope).
 * Per-space addons are displayed in Detailed Home Mapping to avoid duplication.
 */
function renderAddons(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  yPos = checkPageBreak(doc, yPos, 25, pageHeight);
  yPos = drawSectionHeader(doc, 'ADD-ONS', contentLeft, yPos, contentWidth);

  const { summary } = params;

  // Get ONLY global addon line items from SSOT (per-space addons shown in Detailed Mapping)
  const globalAddons = summary.lineItems.filter(
    item => item.section === 'addons' && (item.scope === 'global' || !item.scope)
  );

  // Check if any per-space addons exist (for context message)
  const hasSpaceAddons = summary.sectionBlocks.detailedMapping.spaces
    .some(space => space.addons && space.addons.length > 0);

  if (globalAddons.length === 0) {
    // Explicit empty state with context (SSOT RULE #8)
    doc.setFontSize(PDF_CONFIG.fontSize.body);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textMuted);
    
    const emptyText = hasSpaceAddons 
      ? 'Room-specific add-ons shown in Detailed Home Mapping above' 
      : 'No add-ons selected';
    doc.text(emptyText, contentLeft + 4, yPos);
    return yPos + PDF_CONFIG.spacing.lineHeight + 2;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(PDF_CONFIG.fontSize.body);

  // Render only global addons
  globalAddons.forEach(item => {
    const label = item.titleKey.replace('addon.', '').replace(/_/g, ' ');
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    const qty = typeof item.titleParams?.qty === 'number' ? item.titleParams.qty : 1;
    const displayLabel = qty > 1 ? `${capitalizedLabel} ×${qty}` : capitalizedLabel;
    
    drawBadge(doc, 'SELECTED', contentLeft + 4, yPos, COLORS.selectedBadge);
    yPos = drawLabelValue(doc, `  ${displayLabel}`, `+$${item.price}`, contentLeft + 22, yPos, valueX);
  });

  // Total for global addons only (space addons totals shown in mapping)
  const globalTotal = globalAddons.reduce((sum, item) => sum + item.price, 0);
  if (globalTotal > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.brandPrimary);
    yPos = drawLabelValue(doc, 'Global Add-ons Total', `$${globalTotal}`, contentLeft + 4, yPos, valueX);
  }

  return yPos + 2;
}

/**
 * Windows Section
 */
function renderWindows(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  const { summary } = params;

  // Only show if windows total > 0
  if (summary.totals.windowsTotal === 0) return yPos;

  yPos = checkPageBreak(doc, yPos, 20, pageHeight);
  yPos = drawSectionHeader(doc, 'WINDOWS & BLINDS', contentLeft, yPos, contentWidth);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  yPos = drawLabelValue(doc, 'Window Cleaning', `$${summary.totals.windowsTotal}`, contentLeft + 4, yPos, valueX);

  return yPos + 2;
}

/**
 * Estimate Summary (Footer)
 */
function renderEstimateSummary(
  doc: jsPDF,
  params: SsotPdfParams,
  yPos: number,
  contentLeft: number,
  contentWidth: number,
  valueX: number,
  pageHeight: number
): number {
  yPos = checkPageBreak(doc, yPos, 50, pageHeight);
  
  yPos += 4;
  drawDivider(doc, yPos, contentLeft, contentLeft + contentWidth);
  yPos += 6;

  const { summary, isRecurring } = params;
  const totals = summary.totals;

  // Summary card
  const cardStartY = yPos - 2;
  const cardHeight = 45;
  drawCard(doc, contentLeft, cardStartY, contentWidth, cardHeight, COLORS.cardBg);

  doc.setFontSize(PDF_CONFIG.fontSize.sectionHeader);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('ESTIMATE SUMMARY', contentLeft + 4, yPos + 2);
  yPos += 8;

  // Line items breakdown
  const breakdownItems: { label: string; value: number }[] = [
    { label: 'Base Service', value: totals.basePrice },
    { label: 'Bathrooms', value: totals.bathroomTotal },
  ];

  if (totals.utilityAreasTotal > 0) {
    breakdownItems.push({ label: 'Utility Areas', value: totals.utilityAreasTotal });
  }
  if (totals.premiumSpacesTotal > 0) {
    breakdownItems.push({ label: 'Premium Spaces', value: totals.premiumSpacesTotal });
  }
  if (totals.hallwaysTotal > 0) {
    breakdownItems.push({ label: 'Hallways', value: totals.hallwaysTotal });
  }
  if (totals.windowsTotal > 0) {
    breakdownItems.push({ label: 'Windows', value: totals.windowsTotal });
  }
  if (totals.addonsTotal > 0) {
    breakdownItems.push({ label: 'Add-ons', value: totals.addonsTotal });
  }
  if (totals.conditionFee > 0) {
    breakdownItems.push({ label: 'Condition Fee', value: totals.conditionFee });
  }
  if (totals.verticalSurcharge > 0) {
    breakdownItems.push({ label: 'Vertical Access', value: totals.verticalSurcharge });
  }

  breakdownItems.forEach(item => {
    yPos = drawLabelValue(doc, item.label, `$${item.value}`, contentLeft + 4, yPos, valueX - 4);
  });

  // Discounts
  if (totals.frequencyDiscount && totals.frequencyDiscount.amount > 0) {
    doc.setTextColor(...COLORS.successGreen);
    yPos = drawLabelValue(
      doc, 
      `${totals.frequencyDiscount.label} Discount`, 
      `-$${totals.frequencyDiscount.amount}`, 
      contentLeft + 4, 
      yPos, 
      valueX - 4
    );
  }
  if (totals.partialEmptyDiscount && totals.partialEmptyDiscount > 0) {
    doc.setTextColor(...COLORS.successGreen);
    yPos = drawLabelValue(
      doc, 
      'Partial Empty Discount', 
      `-$${totals.partialEmptyDiscount}`, 
      contentLeft + 4, 
      yPos, 
      valueX - 4
    );
  }

  // Grand total
  yPos += 2;
  drawDivider(doc, yPos, contentLeft + 4, valueX - 4);
  yPos += 4;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.brandPrimary);
  doc.text('YOUR ESTIMATE', contentLeft + 4, yPos);
  doc.setFontSize(16);
  doc.text(`$${totals.grandTotal}`, valueX - 4, yPos, { align: 'right' });

  // Minimum note
  if (totals.grandTotal <= 165) {
    yPos += 4;
    doc.setFontSize(PDF_CONFIG.fontSize.small);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Minimum service charge: $165', contentLeft + 4, yPos);
  }

  return yPos + 10;
}

/**
 * Footer
 */
function renderFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  contentLeft: number,
  contentRight: number
): void {
  const footerY = pageHeight - PDF_CONFIG.marginBottom;

  drawDivider(doc, footerY - 8, contentLeft + 20, contentRight - 20);

  doc.setFontSize(PDF_CONFIG.fontSize.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Payment: Credit/Debit • Venmo • Zelle • Bill Pay', pageWidth / 2, footerY - 3, { align: 'center' });

  doc.setFontSize(6);
  doc.text(
    `This estimate is valid for 7 days (until ${getQuoteValidity()}). Final pricing confirmed upon booking.`,
    pageWidth / 2,
    footerY + 1,
    { align: 'center' }
  );

  // Bottom accent line
  doc.setFillColor(...COLORS.brandAccent);
  doc.rect(0, pageHeight - 2, pageWidth, 2, 'F');
}

// ===== MAIN GENERATOR =====

export function generateSsotPdf(params: SsotPdfParams): { doc: jsPDF; proposalNumber: string } {
  const doc = new jsPDF({
    orientation: PDF_CONFIG.orientation,
    unit: 'mm',
    format: PDF_CONFIG.pageFormat,
  });

  const proposalNumber = generateProposalNumber();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const contentLeft = PDF_CONFIG.marginLeft;
  const contentRight = pageWidth - PDF_CONFIG.marginRight;
  const contentWidth = contentRight - contentLeft;
  const valueX = contentRight - 4;

  // ===== PAGE 1: START SSOT SECTIONS =====
  
  let yPos = renderHeader(doc, params, proposalNumber, pageWidth, contentLeft, contentRight, contentWidth);

  // Section 1: Service Level
  yPos = renderServiceLevel(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Section 2: Move Condition (MOVING only)
  yPos = renderMoveCondition(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Section 3: The Structure
  yPos = renderStructure(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Section 4: Property Size
  yPos = renderPropertySize(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Section 5: Detailed Home Mapping
  yPos = renderDetailedMapping(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Section 6: Utility Areas
  yPos = renderUtilityAreas(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Section 7: Bathroom Modules
  yPos = renderBathroomModules(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Section 8: Property Condition
  yPos = renderPropertyCondition(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Additional sections
  yPos = renderAddons(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);
  yPos = renderWindows(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Estimate Summary
  yPos = renderEstimateSummary(doc, params, yPos, contentLeft, contentWidth, valueX, pageHeight);

  // Footer
  renderFooter(doc, pageWidth, pageHeight, contentLeft, contentRight);

  return { doc, proposalNumber };
}

// ===== EXPORTS =====

export function generateSsotPdfBlob(params: SsotPdfParams): { 
  blob: Blob; 
  fileName: string; 
  proposalNumber: string 
} {
  const { doc, proposalNumber } = generateSsotPdf(params);
  const blob = doc.output('blob');
  return { 
    blob, 
    fileName: `Nancys_Quote_${proposalNumber}.pdf`, 
    proposalNumber 
  };
}

export function downloadSsotPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
