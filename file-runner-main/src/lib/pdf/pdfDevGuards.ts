/**
 * PDF Dev Guards — Development-only SSOT Regression Prevention
 * 
 * These guards catch token leaks and pricing mismatches during development.
 * They are stripped in production builds (import.meta.env.DEV).
 * 
 * SSOT RULE: No internal tokens should appear in final PDF output.
 */

// Token leak patterns that should NEVER appear in PDF output
const TOKEN_LEAK_PATTERNS = [
  /\bopt\.\w+/,              // opt.4bed, opt.studio, opt.1bed
  /\bSF_[\w<>+]+/,           // SF_900_1200, SF_<600, SF_7000+
  /\babove_average\b/,       // above_average (condition level)
  /\bheavy_severe\b/,        // heavy_severe (condition level)
  /\bst\.\w+/,               // st.standard, st.deep, st.move
];

/**
 * Assert that rendered text contains no internal token leaks.
 * Logs errors in development mode only.
 * 
 * @param text - The text being rendered to PDF
 * @param context - Description of where this text appears (for debugging)
 */
export function assertNoTokenLeaks(text: string, context: string): void {
  // Only run in development mode
  if (!import.meta.env.DEV) return;

  TOKEN_LEAK_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) {
      console.error(
        `❌ PDF TOKEN LEAK DETECTED in ${context}:`,
        `"${text}" matches pattern ${pattern}`
      );
    }
  });
}

/**
 * Assert that a displayed price is not zero when the SSOT total indicates non-zero.
 * Catches cases where lineItem prices don't match totals.
 * 
 * @param label - The label of the item being displayed
 * @param displayedPrice - The price shown in the PDF
 * @param ssotTotal - The corresponding total from summary.totals
 */
export function assertPriceNotZero(
  label: string, 
  displayedPrice: number, 
  ssotTotal: number
): void {
  // Only run in development mode
  if (!import.meta.env.DEV) return;

  if (displayedPrice === 0 && ssotTotal > 0) {
    console.warn(
      `⚠️ PDF PRICE MISMATCH: "${label}" shows $0 but SSOT total indicates $${ssotTotal}`
    );
  }
}

/**
 * Assert that line item prices sum to the expected total.
 * Catches cases where individual items don't add up.
 * 
 * @param section - The section name (e.g., "addons", "utility")
 * @param itemPrices - Array of individual item prices
 * @param expectedTotal - The expected sum from summary.totals
 * @param tolerance - Acceptable difference (for rounding)
 */
export function assertPriceSumMatch(
  section: string,
  itemPrices: number[],
  expectedTotal: number,
  tolerance: number = 1
): void {
  // Only run in development mode
  if (!import.meta.env.DEV) return;

  const actualSum = itemPrices.reduce((sum, p) => sum + p, 0);
  const diff = Math.abs(actualSum - expectedTotal);

  if (diff > tolerance) {
    console.warn(
      `⚠️ PDF SUM MISMATCH in ${section}: Items sum to $${actualSum} but SSOT total is $${expectedTotal} (diff: $${diff})`
    );
  }
}

/**
 * Validate that a floor level is properly set for multi-floor properties.
 * 
 * @param spaceName - The space being checked
 * @param floorLevel - The floor level (may be null)
 * @param isMultiFloor - Whether the property has multiple floors
 */
export function assertFloorLevelSet(
  spaceName: string,
  floorLevel: number | null,
  isMultiFloor: boolean
): void {
  // Only run in development mode
  if (!import.meta.env.DEV) return;

  if (isMultiFloor && floorLevel === null) {
    console.info(
      `📍 PDF FLOOR TBD: "${spaceName}" has no floor level set in multi-floor property (will show "Floor TBD")`
    );
  }
}
