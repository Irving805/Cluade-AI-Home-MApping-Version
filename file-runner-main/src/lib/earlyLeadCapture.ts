// Early Lead Capture - Shadow Capture for Step 1
// Sends partial lead data to Zapier when user clicks "View Available Services"

const ZAPIER_SHADOW_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/15611029/2z0t2gl/';

export interface EarlyLeadData {
  step: string;
  homeSize: number;
  city: string;
  timestamp: string;
  squareFootageRange: string;
  masterBaths?: number;
  fullBaths?: number;
  halfBaths?: number;
  serviceType?: string;
  conditionFee?: number;
}

export async function sendEarlyLeadCapture(data: EarlyLeadData): Promise<void> {
  try {
    console.log('[Shadow Capture] Sending early lead data:', data);
    
    await fetch(ZAPIER_SHADOW_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', // Fire-and-forget
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead_status: 'browsing',
        source: 'nancy_widget_step1',
        ...data,
      }),
    });
    
    console.log('[Shadow Capture] Early lead sent successfully');
  } catch (error) {
    // Silent fail - don't interrupt user flow
    console.error('[Shadow Capture] Failed to send early lead:', error);
  }
}
