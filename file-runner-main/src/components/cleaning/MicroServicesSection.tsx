import { useState } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { 
  microServices, 
  MICRO_SERVICES_MINIMUM, 
  calculateMicroServicePrice, 
  MicroService,
  getCabinetPriceFromSqft,
} from '@/lib/pricing';
import { isHeavyConditionForQuote } from '@/lib/areaConditionFees';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Minus, 
  Plus, 
  Sparkles, 
  Bath, 
  ChefHat, 
  Home, 
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';

// Category config with icons and translation keys
const categoryConfig = {
  bathroom: { icon: Bath, titleKey: 'micro.cat_bathroom', subKey: 'micro.cat_bathroom_sub' },
  kitchen: { icon: ChefHat, titleKey: 'micro.cat_kitchen', subKey: 'micro.cat_kitchen_sub' },
  general: { icon: Home, titleKey: 'micro.cat_general', subKey: 'micro.cat_general_sub' },
};

// Single micro-service card component
function MicroServiceCard({ service }: { service: MicroService }) {
  const { 
    language, 
    selectedMicroServices, 
    toggleMicroService, 
    updateMicroServiceQuantity,
    formData,
    getMicroServiceLinePrice,
    situation,
  } = useBooking();
  
  const selection = selectedMicroServices.find((m) => m.id === service.id);
  const isSelected = !!selection;
  const quantity = selection?.quantity || 1;
  const hasQuantityControl = service.maxQuantity > 1;

  // Get pricing hint based on service type
  const getPriceHint = () => {
    // Per-unit pricing (blinds)
    if (service.pricingType === 'per-unit') {
      return `$${service.priceFirst}/set`;
    }
    // Sqft-based pricing (cabinets)
    if (service.pricingType === 'sqft-based') {
      const cabinetPrice = getCabinetPriceFromSqft(formData.sqft);
      return `$${cabinetPrice}`;
    }
    // Standard first/additional pricing
    if (service.priceAdditional && service.priceAdditional !== service.priceFirst) {
      return `$${service.priceFirst}/$${service.priceAdditional}`;
    }
    return `$${service.priceFirst}`;
  };
  
  // Calculate total for this service at current quantity
  const linePrice = getMicroServiceLinePrice(service.id, quantity);
  const serviceTotal = linePrice.withHeavy;
  const isHeavy = isHeavyConditionForQuote(formData, situation);
  const hasHeavySurcharge = isHeavy && service.heavySurchargePercent;

  // Get helper text with additional info
  const getHelperText = () => {
    const baseHelper = t(language, service.helperKey);
    
    // Add quantity hint for multi-quantity services
    if (hasQuantityControl) {
      if (service.pricingType === 'per-unit') {
        return `${baseHelper} • Up to ${service.maxQuantity} sets`;
      }
      return `${baseHelper} • Up to ${service.maxQuantity}`;
    }
    
    // Add sqft-based hint for cabinets
    if (service.pricingType === 'sqft-based') {
      return `${baseHelper} • $110–$220 based on home size`;
    }
    
    return baseHelper;
  };

  const handleToggle = () => {
    // For cabinets, check if sqft is selected (validation)
    if (service.pricingType === 'sqft-based' && !formData.sqft) {
      // Will use default tier 1 pricing
    }
    toggleMicroService(service.id, 1);
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, Math.min(service.maxQuantity, quantity + delta));
    updateMicroServiceQuantity(service.id, newQty);
  };

  return (
    <div
      className={cn(
        'border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer touch-manipulation',
        'min-h-[72px]', // Ensure comfortable tap target
        isSelected 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border bg-card hover:border-muted-foreground/40'
      )}
      onClick={(e) => {
        // Don't toggle if clicking on quantity buttons
        if ((e.target as HTMLElement).closest('.qty-controls')) return;
        handleToggle();
      }}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleToggle}
          className="mt-0.5 w-5 h-5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm sm:text-base text-foreground leading-tight">
              {t(language, service.labelKey)}
              {service.maxQuantity > 1 && service.pricingType !== 'per-unit' && (
                <span className="text-muted-foreground text-xs ml-1">
                  (up to {service.maxQuantity})
                </span>
              )}
            </span>
            <span className="text-primary font-bold text-sm whitespace-nowrap">
              {getPriceHint()}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {getHelperText()}
          </p>
          
          {/* Heavy surcharge indicator */}
          {service.heavySurchargePercent && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              +{service.heavySurchargePercent}% for heavy buildup
            </p>
          )}
          
          {/* Quantity selector (only shown when selected and maxQuantity > 1) */}
          {isSelected && hasQuantityControl && (
            <div className="qty-controls flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">{t(language, 'micro.quantity')}:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(-1);
                  }}
                  disabled={quantity <= 1}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                    'border-2 border-border touch-manipulation',
                    quantity <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/10 active:scale-95'
                  )}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-foreground">{quantity}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(1);
                  }}
                  disabled={quantity >= service.maxQuantity}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                    'border-2 border-border touch-manipulation',
                    quantity >= service.maxQuantity ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/10 active:scale-95'
                  )}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="ml-auto text-right">
                <span className="text-xs text-primary font-semibold">
                  = ${serviceTotal}
                </span>
                {hasHeavySurcharge && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 block">
                    (includes heavy fee)
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Show total for single-quantity items when selected */}
          {isSelected && !hasQuantityControl && (
            <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total:</span>
              <div className="text-right">
                <span className="text-xs text-primary font-semibold">${serviceTotal}</span>
                {hasHeavySurcharge && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 block">
                    (includes heavy fee)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Collapsible category section component (matches StepAddons pattern)
function CollapsibleCategory({ 
  category 
}: { 
  category: 'bathroom' | 'kitchen' | 'general';
}) {
  const { language, selectedMicroServices, formData, situation } = useBooking();
  const [isOpen, setIsOpen] = useState(false);
  
  const config = categoryConfig[category];
  const Icon = config.icon;
  const categoryServices = microServices.filter((m) => m.category === category);
  
  // Count selected items in this category
  const selectedCount = selectedMicroServices.filter(sel => 
    categoryServices.some(s => s.id === sel.id)
  ).length;
  
  // Check if any service in this category has heavy surcharge configured
  const hasHeavySurchargeServices = categoryServices.some(s => s.heavySurchargePercent);
  const isHeavy = isHeavyConditionForQuote(formData, situation);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-150',
          'border-2 active:scale-[0.99] touch-manipulation',
          'min-h-[64px]', // Ensure comfortable tap target
          isOpen 
            ? 'border-primary bg-primary/[0.03] rounded-b-none' 
            : 'border-border bg-card hover:border-muted-foreground/40'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
            isOpen ? 'bg-primary/10' : 'bg-muted/50'
          )}>
            <Icon className={cn("w-5 h-5", isOpen ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="text-left">
            <h5 className="font-bold text-foreground">{t(language, config.titleKey)}</h5>
            <p className="text-xs text-muted-foreground">{t(language, config.subKey)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center">
              {selectedCount}
            </span>
          )}
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
            isOpen ? 'bg-primary/10' : 'bg-muted/50'
          )}>
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-primary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>
      
      {isOpen && (
        <div className="border-2 border-t-0 border-primary rounded-b-xl p-4 bg-card animate-fade-in">
          {/* Heavy condition note for categories with heavy surcharge services */}
          {hasHeavySurchargeServices && isHeavy && (
            <div className="mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Heavy condition pricing (+30%) will be applied to deep-clean tasks in this category.
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryServices.map((service) => (
              <MicroServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MicroServicesSection() {
  const { 
    language, 
    selectedMicroServices, 
    getMicroServicesTotal, 
    formData, 
    updateFormData,
    customZones,
  } = useBooking();

  const microTotal = getMicroServicesTotal();
  const hasAnySelected = selectedMicroServices.length > 0;
  const hasAreaZones = customZones.bathroom || customZones.kitchen || customZones.living || customZones.bedroom;

  return (
    // Prevent horizontal overflow on mobile
    <div className="mt-6 pt-6 border-t-2 border-dashed border-border w-full max-w-full overflow-x-hidden box-border">
      {/* Section Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-lg">
            {t(language, 'micro.section_title')}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(language, 'micro.section_helper')}
        </p>
        
        {/* Minimum notice */}
        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t(language, 'micro.minimum_notice', { min: MICRO_SERVICES_MINIMUM.toString() })}
          </p>
        </div>
      </div>

      {/* Collapsible Micro-services categories */}
      <div>
        <CollapsibleCategory category="bathroom" />
        <CollapsibleCategory category="kitchen" />
        <CollapsibleCategory category="general" />
      </div>

      {/* Running total for micro-services */}
      {hasAnySelected && (
        <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {t(language, 'micro.subtotal')}
            </span>
            <span className="text-lg font-bold text-primary">
              ${microTotal.total}
            </span>
          </div>
          {microTotal.minimumApplied && !hasAreaZones && (
            <p className="text-xs text-muted-foreground mt-2">
              {t(language, 'micro.min_applied', { min: MICRO_SERVICES_MINIMUM.toString() })}
            </p>
          )}
          {microTotal.heavyApplied && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Heavy condition pricing applied for selected tasks.
            </p>
          )}
        </div>
      )}

      {/* Micro-services notes */}
      {hasAnySelected && (
        <div className="mt-4">
          <Label className="text-sm font-medium mb-2 block">
            {t(language, 'micro.notes_label')}
          </Label>
          <Textarea
            placeholder={t(language, 'micro.notes_placeholder')}
            value={formData.microServicesNotes}
            onChange={(e) => updateFormData({ microServicesNotes: e.target.value })}
            className="min-h-[80px] text-sm"
          />
        </div>
      )}
    </div>
  );
}