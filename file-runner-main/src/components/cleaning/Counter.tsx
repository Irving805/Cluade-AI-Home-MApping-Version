import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

interface CounterProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  compact?: boolean;
}

export function Counter({ label, value, onChange, min = 0, max = 10, className, compact = false }: CounterProps) {
  const handleDecrease = useCallback(() => {
    if (value > min) onChange(value - 1);
  }, [value, min, onChange]);

  const handleIncrease = useCallback(() => {
    if (value < max) onChange(value + 1);
  }, [value, max, onChange]);

  // Mobile tap size - minimum 44px for WCAG, we use 40px compact / 44px normal
  const buttonSize = compact ? 'w-10 h-10' : 'w-11 h-11';

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-card border border-border rounded-xl',
        compact ? 'gap-2 px-2 py-2' : 'gap-3 px-3 py-3',
        className
      )}
    >
      {/* Decrease button - REAL BUTTON with native touch */}
      <button
        type="button"
        onClick={handleDecrease}
        disabled={value <= min}
        aria-label={`Decrease ${label || 'value'}`}
        className={cn(
          buttonSize,
          'flex-shrink-0 rounded-full border-2 border-primary/30 bg-primary/5',
          'flex items-center justify-center',
          'active:scale-90 active:bg-primary/20',
          'disabled:opacity-30 disabled:border-border disabled:bg-transparent',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
        style={{ 
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'rgba(0,0,0,0.1)'
        }}
      >
        <Minus className={cn('text-primary', compact ? 'w-4 h-4' : 'w-5 h-5')} />
      </button>
      
      {/* Value display */}
      <span className={cn(
        'font-bold text-center text-foreground tabular-nums',
        compact ? 'text-lg min-w-[20px]' : 'text-xl min-w-[28px]'
      )}>
        {value}
      </span>
      
      {/* Increase button - REAL BUTTON with native touch */}
      <button
        type="button"
        onClick={handleIncrease}
        disabled={value >= max}
        aria-label={`Increase ${label || 'value'}`}
        className={cn(
          buttonSize,
          'flex-shrink-0 rounded-full border-2 border-primary/30 bg-primary/5',
          'flex items-center justify-center',
          'active:scale-90 active:bg-primary/20',
          'disabled:opacity-30 disabled:border-border disabled:bg-transparent',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
        style={{ 
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'rgba(0,0,0,0.1)'
        }}
      >
        <Plus className={cn('text-primary', compact ? 'w-4 h-4' : 'w-5 h-5')} />
      </button>
    </div>
  );
}