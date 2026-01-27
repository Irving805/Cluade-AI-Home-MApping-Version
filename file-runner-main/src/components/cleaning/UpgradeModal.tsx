/**
 * UpgradeModal - Prompts user to upgrade from Standard Clean to Deep Reset
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { Sparkles, ArrowUp } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  addonValue?: string; // Optional: auto-select this addon after upgrade
}

export function UpgradeModal({ open, onOpenChange, itemName, addonValue }: UpgradeModalProps) {
  const { language, updateFormData, toggleAddon, selectedAddons } = useBooking();

  const handleUpgrade = () => {
    // Switch to Deep Reset
    updateFormData({ 
      serviceType: 'Deep Clean',
      baseServiceLevel: 'Deep Clean'
    });
    
    // Auto-select the clicked addon if provided and not already selected
    if (addonValue) {
      const isAlreadySelected = selectedAddons.some(a => a.value === addonValue);
      if (!isAlreadySelected) {
        toggleAddon(addonValue, 1);
      }
    }
    
    onOpenChange(false);
  };

  const handleKeepStandard = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <ArrowUp className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {t(language, 'upgrade.modal_title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            {t(language, 'upgrade.modal_description', { itemName })}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleKeepStandard}
            className="order-2 sm:order-1"
          >
            {t(language, 'upgrade.keep_standard')}
          </Button>
          <Button
            onClick={handleUpgrade}
            className="order-1 sm:order-2 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {t(language, 'upgrade.confirm_upgrade')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
