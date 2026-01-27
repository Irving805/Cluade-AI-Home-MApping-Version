/**
 * StepAddonsLite - Simplified add-ons for Standard Clean
 * Shows:
 * 1. Active: Standard-clean-only add-ons (Sliding Glass, Patio Sweep, Interior Windows, Fridge+Organize)
 * 2. Active: "Extra Touches" with "Fresh Sheets & Made Beds"
 * 3. Locked: "Special Attention Areas" (Windows/Blinds) - upgrade to unlock
 * 4. Locked: "Kitchen & Deep Clean Extras" (Oven/Fridge/Cabinets) - upgrade to unlock
 */

import { useState } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { standardCleanOnlyAddons } from '@/lib/pricing';
import { AddonCard } from '../AddonCard';
import { LockedAddonCard } from '../LockedAddonCard';
import { UpgradeModal } from '../UpgradeModal';
import { Sparkles, Blinds, ChefHat, Home, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// Locked add-ons configuration (Windows/Blinds section)
const lockedWindowAddons = [
  { value: 'windows', labelKey: 'addon.windows_headline', price: 5, unit: '/pane' },
  { value: 'blinds', labelKey: 'addon.blinds_headline', price: 12, unit: '/set' },
];

// Locked add-ons configuration (Kitchen/Deep Clean section)
const lockedKitchenAddons = [
  { value: 'oven', labelKey: 'addon.oven', price: 35 },
  { value: 'fridge_empty', labelKey: 'addon.fridge_empty', price: 35 },
  { value: 'cabinets', labelKey: 'addon.cabinets', price: 45 },
];

export function StepAddonsLite() {
  const { language, selectedAddons } = useBooking();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedLockedItem, setSelectedLockedItem] = useState<{ name: string; value: string }>({ name: '', value: '' });

  const handleLockedClick = (itemName: string, addonValue: string) => {
    setSelectedLockedItem({ name: itemName, value: addonValue });
    setUpgradeModalOpen(true);
  };

  // Count selected Standard-only add-ons
  const standardOnlyCount = selectedAddons.filter(a => 
    standardCleanOnlyAddons.some(s => s.value === a.value)
  ).reduce((sum, a) => sum + a.quantity, 0);

  return (
    <div className="animate-fade-in space-y-8 pb-60 md:pb-0">
      {/* Premium Header for Standard Maintenance */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          {t(language, 'standard.customize_title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(language, 'standard.customize_subtitle')}
        </p>
      </div>

      {/* SECTION 1: Standard Clean Only Add-ons (ACTIVE) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DoorOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground">
              {t(language, 'addon.standard_clean_extras') || 'Quick Refresh Add-ons'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(language, 'addon.standard_only_note')}
            </p>
          </div>
          {standardOnlyCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
              {standardOnlyCount}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {standardCleanOnlyAddons.map((addon) => (
            <AddonCard
              key={addon.value}
              value={addon.value}
              labelKey={addon.labelKey}
              price={addon.price}
              hasQuantity={'hasQuantity' in addon ? addon.hasQuantity : false}
              unit={'unit' in addon ? addon.unit : undefined}
            />
          ))}
        </div>
      </div>

      {/* SECTION 2: Extra Touches (ACTIVE) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {t(language, 'standard.extra_touches_title')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(language, 'standard.extra_touches_subtitle')}
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <AddonCard
            value="sheets"
            labelKey="addon.sheets"
            price={10}
            hasQuantity={true}
            unit="/bed"
          />
        </div>
      </div>

      {/* SECTION 3: Special Attention Areas (LOCKED) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Blinds className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-muted-foreground">
              {t(language, 'addon.special_attention_title')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(language, 'standard.locked_section_hint')}
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-3">
          {lockedWindowAddons.map((addon) => (
            <LockedAddonCard
              key={addon.value}
              labelKey={addon.labelKey}
              price={addon.price}
              unit={addon.unit}
              onUpgradeClick={(name) => handleLockedClick(name, addon.value)}
            />
          ))}
        </div>
      </div>

      {/* SECTION 4: Kitchen & Deep Clean Extras (LOCKED) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-muted-foreground">
              {t(language, 'addon.kitchen_extras_title')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(language, 'standard.locked_section_hint')}
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-3">
          {lockedKitchenAddons.map((addon) => (
            <LockedAddonCard
              key={addon.value}
              labelKey={addon.labelKey}
              price={addon.price}
              onUpgradeClick={(name) => handleLockedClick(name, addon.value)}
            />
          ))}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        itemName={selectedLockedItem.name}
        addonValue={selectedLockedItem.value}
      />
    </div>
  );
}