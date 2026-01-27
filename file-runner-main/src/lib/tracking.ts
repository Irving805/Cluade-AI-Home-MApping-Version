/**
 * Central Analytics & Tracking Helper
 * 
 * This module provides a unified interface for all analytics tracking.
 * It pushes events to GTM's dataLayer and triggers Meta Pixel events
 * without injecting any external scripts.
 * 
 * GTM, GA4, and Meta Pixel are expected to be installed at the domain level.
 */

export type TrackingPayload = Record<string, unknown>;

/**
 * Global tracking context for UTM parameters and traffic source attribution.
 * Captured once on module load and merged into every event.
 */
type GlobalTrackingContext = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
};

const globalTrackingContext: GlobalTrackingContext = {};

// Capture UTM parameters and referrer on module load (runs once)
if (typeof window !== 'undefined') {
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const utmTerm = params.get('utm_term');
    const utmContent = params.get('utm_content');
    const gclid = params.get('gclid');
    const fbclid = params.get('fbclid');

    if (utmSource) globalTrackingContext.utm_source = utmSource;
    if (utmMedium) globalTrackingContext.utm_medium = utmMedium;
    if (utmCampaign) globalTrackingContext.utm_campaign = utmCampaign;
    if (utmTerm) globalTrackingContext.utm_term = utmTerm;
    if (utmContent) globalTrackingContext.utm_content = utmContent;
    if (gclid) globalTrackingContext.gclid = gclid;
    if (fbclid) globalTrackingContext.fbclid = fbclid;

    if (document.referrer) {
      globalTrackingContext.referrer = document.referrer;
    }
  } catch (e) {
    console.error('[Tracking] Failed to parse UTM params:', e);
  }
}

/**
 * Configuration for future external integrations (Zapier, n8n, internal APIs)
 * 
 * In the future, this config can be toggled to POST events
 * (pricing_review_viewed, quote_submitted, etc.) to an external webhook
 * for deeper tracking and CRM automation.
 * 
 * For now, DO NOT enable it; just keep the placeholder.
 */
const INTEGRATIONS_CONFIG = {
  webhookEnabled: false,
  webhookUrl: '',
} as const;

// Extend Window interface for GTM and Meta Pixel
declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Track an event across all configured analytics platforms.
 * 
 * @param name - The event name (e.g., 'pricing_review_viewed', 'quote_submitted')
 * @param payload - Additional data to attach to the event
 * 
 * This function:
 * 1. Pushes to GTM dataLayer for GA4 and other GTM-based tracking
 * 2. Triggers Meta Pixel events for relevant conversion actions
 * 3. Has a placeholder for future webhook integrations
 * 
 * NEVER throws - errors are logged to console only.
 */
export function trackEvent(name: string, payload: TrackingPayload = {}): void {
  try {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') return;

    // Merge global UTM/source context with event-specific payload
    const mergedPayload: TrackingPayload = {
      ...globalTrackingContext,
      ...payload,
    };

    // === GTM / dataLayer ===
    // Ensure dataLayer exists (GTM creates this, but we ensure it exists)
    window.dataLayer = window.dataLayer || [];
    
    // Push event to dataLayer for GTM/GA4
    window.dataLayer.push({
      event: name,
      ...mergedPayload,
    });

    // === Meta Pixel ===
    // Map specific events to Meta standard events
    if (typeof window.fbq === 'function') {
      if (name === 'pricing_review_viewed') {
        window.fbq('track', 'ViewContent', {
          value: payload.estimate_total ?? 0,
          currency: 'USD',
        });
      }

      if (name === 'quote_submitted') {
        window.fbq('track', 'Lead', {
          value: payload.estimate_total ?? 0,
          currency: 'USD',
        });
      }

      // Optional: Track InitiateCheckout when user starts the flow
      if (name === 'pricing_details_completed') {
        window.fbq('track', 'InitiateCheckout', {
          content_name: payload.service_type ?? 'Cleaning Service',
        });
      }
    }

    // === Future External Webhook Integration ===
    // Future-ready hook for server / webhook / n8n / Zapier integrations.
    // For now this is a NO-OP to avoid extra network calls in production.
    // Example of how it could be extended in the future:
    //
    // if (INTEGRATIONS_CONFIG.webhookEnabled && INTEGRATIONS_CONFIG.webhookUrl) {
    //   fetch(INTEGRATIONS_CONFIG.webhookUrl, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ 
    //       event: name, 
    //       timestamp: new Date().toISOString(),
    //       ...payload 
    //     }),
    //   }).catch((err) => console.error('[Tracking] Webhook failed:', err));
    // }

    // Log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Tracking] ${name}`, mergedPayload);
    }

  } catch (error) {
    // NEVER throw - just log the error
    console.error('[Tracking] Error tracking event:', name, error);
  }
}

/**
 * Available tracking events for this widget:
 * 
 * - pricing_start: Widget loaded/mounted
 * - pricing_details_completed: User moved from Start to Details step
 * - pricing_review_viewed: User reached the Review step
 * - abandoned_pdf_sent: Abandoned cart webhook was triggered
 * - quote_submitted: Final booking request was submitted
 * - lead_info_completed: User filled all required contact fields
 */
