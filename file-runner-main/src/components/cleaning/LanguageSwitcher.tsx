import { useBooking } from '@/contexts/BookingContext';
import { Language } from '@/lib/translations';
import { cn } from '@/lib/utils';

const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'zh', label: '中文' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useBooking();

  return (
    <div className="flex justify-center gap-2 mb-4">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200',
            'border',
            language === code
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
