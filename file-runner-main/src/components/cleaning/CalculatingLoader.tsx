import { useEffect, useState } from 'react';
import { useCityConfig } from '@/hooks/useCityConfig';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatingLoaderProps {
  onComplete: () => void;
  duration?: number; // milliseconds
}

const loadingMessages = [
  "Analyzing home specifications...",
  "Checking availability in {city}...",
  "Applying online incentives...",
  "Preparing your personalized quote..."
];

export function CalculatingLoader({ onComplete, duration = 2000 }: CalculatingLoaderProps) {
  const cityConfig = useCityConfig();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Get city name for dynamic message
  const cityName = cityConfig.key !== 'default' 
    ? cityConfig.key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'your area';

  const messages = loadingMessages.map(msg => 
    msg.replace('{city}', cityName)
  );

  // Cycle through messages
  useEffect(() => {
    const messageInterval = duration / messages.length;
    
    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        if (prev < messages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, messageInterval);

    return () => clearInterval(interval);
  }, [duration, messages.length]);

  // Progress animation
  useEffect(() => {
    const progressInterval = 50; // Update every 50ms
    const increment = 100 / (duration / progressInterval);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, progressInterval);

    return () => clearInterval(interval);
  }, [duration]);

  // Trigger completion after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="text-center px-6 max-w-md animate-fade-in">
        {/* Premium Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-muted/30" />
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
              className="transition-all duration-100 ease-linear"
            />
          </svg>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>

        {/* Dynamic Message */}
        <div className="h-12 flex items-center justify-center">
          <p 
            key={currentMessageIndex}
            className={cn(
              "text-lg font-medium text-foreground",
              "animate-fade-in"
            )}
          >
            {messages[currentMessageIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-6 w-full max-w-xs mx-auto">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Reassurance text */}
        <p className="mt-4 text-sm text-muted-foreground">
          Building your personalized estimate...
        </p>
      </div>
    </div>
  );
}
