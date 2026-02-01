import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { Counter } from '../Counter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Bath, ChefHat, Sofa, Bed, LayoutGrid, ChevronRight } from 'lucide-react';
import { addonPrices } from '@/lib/pricing';
import { MicroServicesSection } from '../MicroServicesSection';

interface ZoneCardProps {
  icon: React.ReactNode;
  label: string;
  price: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}

function ZoneCard({ icon, label, price, checked, onChange, children }: ZoneCardProps) {
  return (
    <div
      className={cn(
        'border-2 rounded-xl overflow-hidden transition-all duration-200',
        checked ? 'border-primary shadow-md' : 'border-border'
      )}
    >
      {/* Min height 56px for comfortable mobile tapping */}
      <label
        className={cn(
          'flex items-center justify-between p-4 cursor-pointer transition-colors min-h-[56px] touch-manipulation',
          checked ? 'bg-primary/5' : 'bg-muted/30'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Larger checkbox for mobile */}
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-6 h-6 accent-primary flex-shrink-0"
          />
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-semibold text-foreground text-sm sm:text-base">{label}</span>
          </div>
        </div>
        <span className="text-sm font-bold text-primary whitespace-nowrap ml-2">{price}</span>
      </label>
      {checked && children && (
        <div className="p-3 sm:p-4 border-t border-border bg-card animate-slide-down">
          {children}
        </div>
      )}
    </div>
  );
}

// Kitchen addon option component - Mobile-optimized tap targets
function KitchenAddonOption({ value, label, price }: { value: string; label: string; price: number }) {
  const { selectedAddons, toggleAddon } = useBooking();
  const isSelected = selectedAddons.some((a) => a.value === value);
  
  return (
    <label className={cn(
      // Min height 44px for WCAG compliance
      "flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all text-sm min-h-[44px] touch-manipulation",
      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
    )}>
      <Checkbox 
        checked={isSelected}
        onCheckedChange={() => toggleAddon(value)}
        className="w-5 h-5 flex-shrink-0"
      />
      <span className="flex-1 text-xs sm:text-sm">{label}</span>
      <span className="text-xs text-primary font-semibold whitespace-nowrap">${price}</span>
    </label>
  );
}

// Living room addon option component - Mobile-optimized tap targets
function LivingAddonOption({ value, label, price }: { value: string; label: string; price: number }) {
  const { selectedAddons, toggleAddon } = useBooking();
  const isSelected = selectedAddons.some((a) => a.value === value);
  
  return (
    <label className={cn(
      // Min height 44px for WCAG compliance
      "flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all text-sm min-h-[44px] touch-manipulation",
      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
    )}>
      <Checkbox 
        checked={isSelected}
        onCheckedChange={() => toggleAddon(value)}
        className="w-5 h-5 flex-shrink-0"
      />
      <span className="flex-1 text-xs sm:text-sm">{label}</span>
      <span className="text-xs text-primary font-semibold whitespace-nowrap">${price}</span>
    </label>
  );
}

export function StepCustomStart() {
  const {
    language,
    formData,
    updateFormData,
    customZones,
    setCustomZones,
    customCounts,
    setCustomCounts,
    showWindowStep,
    setShowWindowStep,
  } = useBooking();

  return (
    // Prevent horizontal overflow on mobile - critical for expanded accordions
    <div className="animate-fade-in space-y-4 w-full max-w-full overflow-x-hidden box-border">
      {/* About You */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">
          {t(language, 'label.about_you')}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="text"
            placeholder={t(language, 'ph.firstname')}
            value={formData.firstName}
            onChange={(e) => updateFormData({ firstName: e.target.value })}
            required
            className="bg-card"
          />
          <Input
            type="text"
            placeholder={t(language, 'ph.lastname')}
            value={formData.lastName}
            onChange={(e) => updateFormData({ lastName: e.target.value })}
            required
            className="bg-card"
          />
        </div>
      </div>

      {/* Services */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">
          {t(language, 'label.select_services')}
        </Label>
        <p className="text-sm text-muted-foreground mb-4">
          {t(language, 'text.build_custom')}
        </p>

        <div className="space-y-3">
          {/* Bathroom */}
          <ZoneCard
            icon={<Bath className="w-5 h-5 text-muted-foreground" />}
            label={t(language, 'csc.bathroom')}
            price={t(language, 'csc.price_from100')}
            checked={customZones.bathroom}
            onChange={(checked) => setCustomZones((prev) => ({ ...prev, bathroom: checked }))}
          >
            {/* Mobile: Single column on very small screens, 3 cols on xs+ */}
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-3">
              <Counter
                label={t(language, 'csc.master_80')}
                value={customCounts.masterBaths}
                onChange={(val) => setCustomCounts((prev) => ({ ...prev, masterBaths: val }))}
              />
              <Counter
                label={t(language, 'csc.full_70')}
                value={customCounts.fullBaths}
                onChange={(val) => setCustomCounts((prev) => ({ ...prev, fullBaths: val }))}
              />
              <Counter
                label={t(language, 'csc.half_50')}
                value={customCounts.halfBaths}
                onChange={(val) => setCustomCounts((prev) => ({ ...prev, halfBaths: val }))}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {t(language, 'csc.min_call')}
            </p>
          </ZoneCard>

          {/* Kitchen */}
          <ZoneCard
            icon={<ChefHat className="w-5 h-5 text-muted-foreground" />}
            label={t(language, 'csc.kitchen')}
            price="$165"
            checked={customZones.kitchen}
            onChange={(checked) => setCustomZones((prev) => ({ ...prev, kitchen: checked }))}
          >
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">{t(language, 'csc.kitchen_addons')}</p>
              <div className="grid grid-cols-2 gap-2">
                <KitchenAddonOption 
                  value="oven" 
                  label={t(language, 'addon.oven')} 
                  price={addonPrices.oven}
                />
                <KitchenAddonOption 
                  value="fridge_empty" 
                  label={t(language, 'addon.fridge_empty')} 
                  price={addonPrices.fridge_empty}
                />
                <KitchenAddonOption 
                  value="cabinets" 
                  label={t(language, 'addon.cabinets')} 
                  price={addonPrices.cabinets}
                />
                <KitchenAddonOption 
                  value="hood" 
                  label={t(language, 'addon.hood')} 
                  price={addonPrices.hood}
                />
              </div>
            </div>
          </ZoneCard>

          {/* Living Room */}
          <ZoneCard
            icon={<Sofa className="w-5 h-5 text-muted-foreground" />}
            label={t(language, 'csc.living')}
            price="$110"
            checked={customZones.living}
            onChange={(checked) => setCustomZones((prev) => ({ ...prev, living: checked }))}
          >
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">{t(language, 'csc.living_addons')}</p>
              <div className="grid grid-cols-1 gap-2">
                <LivingAddonOption 
                  value="living_pet_hair" 
                  label={t(language, 'addon.pet_hair')} 
                  price={addonPrices.living_pet_hair}
                />
                <LivingAddonOption 
                  value="living_blinds" 
                  label={t(language, 'addon.living_blinds')} 
                  price={addonPrices.living_blinds}
                />
                <LivingAddonOption 
                  value="patio" 
                  label={t(language, 'addon.patio')} 
                  price={addonPrices.patio}
                />
              </div>
            </div>
          </ZoneCard>

          {/* Bedroom */}
          <ZoneCard
            icon={<Bed className="w-5 h-5 text-muted-foreground" />}
            label={t(language, 'csc.bedroom')}
            price={t(language, 'csc.price_from120')}
            checked={customZones.bedroom}
            onChange={(checked) => setCustomZones((prev) => ({ ...prev, bedroom: checked }))}
          >
            <Counter
              label={t(language, 'csc.rooms_40')}
              value={customCounts.bedroomCount}
              onChange={(val) => setCustomCounts((prev) => ({ ...prev, bedroomCount: val }))}
              min={3}
              className="max-w-[200px] mx-auto mb-2"
            />
            <p className="text-xs text-muted-foreground text-center">
              {t(language, 'csc.min_3rooms')}
            </p>
          </ZoneCard>

          {/* Windows Trigger */}
          <div
            onClick={() => setShowWindowStep(!showWindowStep)}
            className={cn(
              'flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all',
              'min-h-[56px] touch-manipulation', // Comfortable tap target
              showWindowStep ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              {/* Larger checkbox for mobile */}
              <input
                type="checkbox"
                checked={showWindowStep}
                onChange={(e) => setShowWindowStep(e.target.checked)}
                className="w-6 h-6 accent-primary flex-shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {t(language, 'win.trigger_title')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(language, 'win.trigger_sub')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Micro-Services Section */}
        <MicroServicesSection />
      </div>
    </div>
  );
}
