import { useBooking, ServiceMode } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';

export function ModeToggle() {
  const { language, mode, setMode, setCurrentStep } = useBooking();

  const handleModeChange = (newMode: ServiceMode) => {
    setMode(newMode);
    setCurrentStep(0);
  };

  return (
    <div className="bg-muted rounded-full p-1 flex mb-6 shadow-inner">
      <button
        type="button"
        onClick={() => handleModeChange('full')}
        className={cn(
          'flex-1 text-center py-3 px-4 rounded-full font-bold text-sm transition-all duration-300',
          mode === 'full'
            ? 'bg-card text-primary shadow-md'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t(language, 'mode.full')}
      </button>
      <button
        type="button"
        onClick={() => handleModeChange('custom')}
        className={cn(
          'flex-1 text-center py-3 px-4 rounded-full font-bold text-sm transition-all duration-300',
          mode === 'custom'
            ? 'bg-card text-primary shadow-md'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t(language, 'mode.custom')}
      </button>
    </div>
  );
}
