/**
 * Internal Review Email Notification
 * 
 * ⚠️ DISABLED: All email notifications are now handled via Zapier.
 * Web3Forms is used ONLY as a form backend and webhook trigger.
 * 
 * This file is kept for reference but the function is a NO-OP.
 * 
 * Previously sent internal email notifications to the office when users
 * reached the Review step. Now all emails (office notifications, follow-ups,
 * abandoned cart) are managed through Zapier automations.
 * 
 * Data flow:
 * - Partial leads: Web3Forms → Zapier Webhook (with PDF)
 * - Complete leads: Web3Forms → Zapier Webhook (with PDF)
 * - Direct Zapier: sendReviewLeadToZapier → Zapier Catch Hook (with PDF)
 */

import type { ReviewLeadData } from './zapierReviewWebhook';

/**
 * DISABLED: Internal email sending via Web3Forms.
 * 
 * This function is now a NO-OP. All email notifications are handled by Zapier.
 * Keeping the export signature for backward compatibility (import won't break).
 * 
 * @deprecated Use Zapier automations for email notifications instead.
 */
export async function sendInternalReviewEmail(
  _leadData: ReviewLeadData,
  _pdfBlob: Blob,
  _pdfFileName: string
): Promise<void> {
  // NO-OP: Email notifications moved to Zapier
  console.log('[Internal Review Email] DISABLED - All emails handled via Zapier');
  return Promise.resolve();
}
