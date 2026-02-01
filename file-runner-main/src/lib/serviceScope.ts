/**
 * Service Scope Definitions - The Transparency Engine
 * Centralized source of truth for what's included/excluded in each service tier
 */

export type ServiceTier = 'Standard Clean' | 'Deep Clean' | 'Move-In/Out';

export interface ScopeItem {
  key: string;
  labelKey: string;
  included: boolean;
  tooltipKey?: string; // For excluded items - explains WHY
}

export interface ServiceScope {
  tier: ServiceTier;
  rateLabel: string; // e.g., "Efficiency Rate" or "Premium Labor"
  rateBadgeKey: string;
  items: ScopeItem[];
}

// Service scope definitions
export const serviceScopes: Record<ServiceTier, ServiceScope> = {
  'Standard Clean': {
    tier: 'Standard Clean',
    rateLabel: 'Efficiency Rate',
    rateBadgeKey: 'scope.rate_efficiency',
    items: [
      { key: 'dusting', labelKey: 'scope.dusting', included: true },
      { key: 'vacuuming', labelKey: 'scope.vacuuming', included: true },
      { key: 'mopping', labelKey: 'scope.mopping', included: true },
      { key: 'bathrooms', labelKey: 'scope.bathrooms', included: true },
      { key: 'kitchen', labelKey: 'scope.kitchen_surfaces', included: true },
      { key: 'trash', labelKey: 'scope.trash', included: true },
      { key: 'baseboards', labelKey: 'scope.baseboards_hand', included: false, tooltipKey: 'scope.baseboards_excluded_tip' },
      { key: 'appliances', labelKey: 'scope.inside_appliances', included: false, tooltipKey: 'scope.appliances_excluded_tip' },
      { key: 'grout', labelKey: 'scope.grout_scrub', included: false, tooltipKey: 'scope.grout_excluded_tip' },
    ]
  },
  'Deep Clean': {
    tier: 'Deep Clean',
    rateLabel: 'Premium Labor',
    rateBadgeKey: 'scope.rate_premium',
    items: [
      { key: 'dusting', labelKey: 'scope.dusting', included: true },
      { key: 'vacuuming', labelKey: 'scope.vacuuming', included: true },
      { key: 'mopping', labelKey: 'scope.mopping', included: true },
      { key: 'bathrooms', labelKey: 'scope.bathrooms', included: true },
      { key: 'kitchen', labelKey: 'scope.kitchen_surfaces', included: true },
      { key: 'trash', labelKey: 'scope.trash', included: true },
      { key: 'baseboards', labelKey: 'scope.baseboards_hand', included: true },
      { key: 'grout', labelKey: 'scope.grout_scrub', included: true },
      { key: 'appliances', labelKey: 'scope.inside_appliances', included: false, tooltipKey: 'scope.appliances_deep_tip' },
      { key: 'cabinets', labelKey: 'scope.inside_cabinets', included: false, tooltipKey: 'scope.cabinets_excluded_tip' },
    ]
  },
  'Move-In/Out': {
    tier: 'Move-In/Out',
    rateLabel: 'Total Reset',
    rateBadgeKey: 'scope.rate_total_reset',
    items: [
      { key: 'dusting', labelKey: 'scope.dusting', included: true },
      { key: 'vacuuming', labelKey: 'scope.vacuuming', included: true },
      { key: 'mopping', labelKey: 'scope.mopping', included: true },
      { key: 'bathrooms', labelKey: 'scope.bathrooms', included: true },
      { key: 'kitchen', labelKey: 'scope.kitchen_surfaces', included: true },
      { key: 'trash', labelKey: 'scope.trash', included: true },
      { key: 'baseboards', labelKey: 'scope.baseboards_hand', included: true },
      { key: 'grout', labelKey: 'scope.grout_scrub', included: true },
      // cabinets, oven, fridge are pre-selected ADD-ONS, not base inclusions
    ]
  }
};

// Helper to get scope by service type
export function getServiceScope(serviceType: string): ServiceScope | null {
  if (serviceType === 'Standard Clean' || serviceType === 'Deep Clean' || serviceType === 'Move-In/Out') {
    return serviceScopes[serviceType];
  }
  // For recurring services, use the base level
  if (['Weekly Price', 'Bi-Weekly Price', 'Monthly Price'].includes(serviceType)) {
    return serviceScopes['Deep Clean']; // Recurring defaults to Deep
  }
  return null;
}
