import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { windowAddons, blindAddons } from '@/lib/pricing';
import { AddonCard } from '../AddonCard';
import { Grid2X2, Maximize, DoorOpen, AlignJustify, List, GripVertical, Columns } from 'lucide-react';

const windowIconMap: Record<string, React.ReactNode> = {
  'grid-2x2': <Grid2X2 className="w-5 h-5" />,
  'maximize': <Maximize className="w-5 h-5" />,
  'door-open': <DoorOpen className="w-5 h-5" />,
};

const blindIconMap: Record<string, React.ReactNode> = {
  'align-justify': <AlignJustify className="w-5 h-5" />,
  'list': <List className="w-5 h-5" />,
  'grip-vertical': <GripVertical className="w-5 h-5" />,
  'columns': <Columns className="w-5 h-5" />,
};

export function StepWindows() {
  const { language } = useBooking();

  return (
    <div className="animate-fade-in">
      <p className="text-center text-primary font-semibold mb-6">
        {t(language, 'step.win_blinds')}
      </p>

      {/* Window Cleaning */}
      <div className="mb-6">
        <h4 className="text-xs uppercase text-muted-foreground font-bold mb-3 border-b border-border pb-1">
          {t(language, 'sec.win_cleaning')}
        </h4>
        <div className="grid gap-3">
          {windowAddons.map((addon) => (
            <AddonCard
              key={addon.value}
              value={addon.value}
              labelKey={addon.labelKey}
              price={addon.price}
              hasQuantity
              unit=" ea"
              icon={windowIconMap[addon.icon]}
            />
          ))}
        </div>
      </div>

      {/* Blinds */}
      <div>
        <h4 className="text-xs uppercase text-muted-foreground font-bold mb-3 border-b border-border pb-1">
          {t(language, 'sec.sb_blinds')}
        </h4>
        <div className="grid gap-3">
          {blindAddons.map((addon) => (
            <AddonCard
              key={addon.value}
              value={addon.value}
              labelKey={addon.labelKey}
              price={addon.price}
              hasQuantity
              unit=" ea"
              icon={blindIconMap[addon.icon]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
