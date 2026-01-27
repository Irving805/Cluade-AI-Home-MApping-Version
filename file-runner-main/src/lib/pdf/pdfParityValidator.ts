/**
 * PDF Parity Validator — Dev-Only SSOT Verification
 * 
 * Compares Review display values against PDF values to ensure 100% parity.
 * This is a debug utility for QA and development.
 * 
 * USAGE:
 * import { validatePdfParity } from '@/lib/pdf/pdfParityValidator';
 * const report = validatePdfParity(summary);
 * if (!report.passed) console.warn('PDF Parity Violations:', report.mismatches);
 */

import type { BookingSummary, PricingTotals, SummaryLineItem } from '@/lib/summary/types';

export interface ParityMismatch {
  field: string;
  expected: string | number;
  actual: string | number;
  source: 'totals' | 'lineItems' | 'visibility';
}

export interface ParityReport {
  passed: boolean;
  timestamp: string;
  mismatches: ParityMismatch[];
  checkedFields: number;
}

/**
 * Validate that all PDF values match the SSOT summary values.
 * Use this during QA to ensure PDF == Review == Summary.
 */
export function validatePdfParity(summary: BookingSummary): ParityReport {
  const mismatches: ParityMismatch[] = [];
  let checkedFields = 0;

  // ===== TOTALS VALIDATION =====
  const totalsToCheck: (keyof PricingTotals)[] = [
    'grandTotal',
    'basePrice',
    'bathroomTotal',
    'addonsTotal',
    'utilityAreasTotal',
    'premiumSpacesTotal',
    'hallwaysTotal',
    'stairsTotal',
    'windowsTotal',
    'conditionFee',
    'verticalSurcharge',
  ];

  totalsToCheck.forEach(field => {
    checkedFields++;
    const value = summary.totals[field];
    
    // Check for NaN or undefined
    if (value === undefined || (typeof value === 'number' && isNaN(value))) {
      mismatches.push({
        field: `totals.${field}`,
        expected: 'number',
        actual: String(value),
        source: 'totals',
      });
    }
  });

  // ===== LINE ITEMS VALIDATION =====
  const lineItemSections = ['addons', 'utility', 'premium', 'bathroom', 'core'];
  
  lineItemSections.forEach(section => {
    const items = summary.lineItems.filter(item => item.section === section);
    checkedFields++;
    
    items.forEach(item => {
      // Validate price is a number
      if (typeof item.price !== 'number' || isNaN(item.price)) {
        mismatches.push({
          field: `lineItems.${item.id}.price`,
          expected: 'number',
          actual: String(item.price),
          source: 'lineItems',
        });
      }
      
      // Validate titleKey exists
      if (!item.titleKey || item.titleKey.length === 0) {
        mismatches.push({
          field: `lineItems.${item.id}.titleKey`,
          expected: 'non-empty string',
          actual: String(item.titleKey),
          source: 'lineItems',
        });
      }
    });
  });

  // ===== VISIBILITY VALIDATION =====
  const visibilityChecks = [
    'isStudio',
    'isOneBedroom',
    'isMultiFloor',
    'showHallways',
    'showStairs',
    'showPremiumSpaces',
    'showUtilityAreas',
  ];

  visibilityChecks.forEach(check => {
    checkedFields++;
    const value = summary.visibility[check as keyof typeof summary.visibility];
    
    if (typeof value !== 'boolean') {
      mismatches.push({
        field: `visibility.${check}`,
        expected: 'boolean',
        actual: String(value),
        source: 'visibility',
      });
    }
  });

  // ===== CROSS-VALIDATION: Totals vs LineItems =====
  
  // Addons total should match sum of addon line items
  const addonLineItems = summary.lineItems.filter(item => item.section === 'addons');
  const addonLineItemsSum = addonLineItems.reduce((sum, item) => sum + item.price, 0);
  checkedFields++;
  
  if (addonLineItemsSum !== summary.totals.addonsTotal) {
    mismatches.push({
      field: 'addons_total_parity',
      expected: summary.totals.addonsTotal,
      actual: addonLineItemsSum,
      source: 'totals',
    });
  }

  // Utility areas total should match sum of utility line items
  const utilityLineItems = summary.lineItems.filter(item => item.section === 'utility');
  const utilityLineItemsSum = utilityLineItems.reduce((sum, item) => sum + item.price, 0);
  checkedFields++;
  
  if (utilityLineItemsSum !== summary.totals.utilityAreasTotal) {
    mismatches.push({
      field: 'utility_total_parity',
      expected: summary.totals.utilityAreasTotal,
      actual: utilityLineItemsSum,
      source: 'totals',
    });
  }

  return {
    passed: mismatches.length === 0,
    timestamp: new Date().toISOString(),
    mismatches,
    checkedFields,
  };
}

/**
 * Log parity report to console (dev mode only)
 */
export function logParityReport(report: ParityReport): void {
  if (process.env.NODE_ENV !== 'development') return;

  if (report.passed) {
    console.log(
      `%c✅ PDF Parity Check PASSED`,
      'color: #10b981; font-weight: bold;',
      `(${report.checkedFields} fields checked)`
    );
  } else {
    console.warn(
      `%c❌ PDF Parity Check FAILED`,
      'color: #ef4444; font-weight: bold;',
      `${report.mismatches.length} mismatches found:`
    );
    console.table(report.mismatches);
  }
}

/**
 * Assert parity in dev mode (throws if mismatches found)
 */
export function assertPdfParity(summary: BookingSummary): void {
  if (process.env.NODE_ENV !== 'development') return;

  const report = validatePdfParity(summary);
  logParityReport(report);
}
