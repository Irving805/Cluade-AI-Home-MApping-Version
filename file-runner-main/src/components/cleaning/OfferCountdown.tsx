import { useState, useEffect, useRef, useCallback } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { Clock, Sparkles } from 'lucide-react';

interface OfferCountdownProps {
  durationMinutes?: number;
  onDeadlineComputed?: (deadline: Date) => void;
}

export function OfferCountdown({ 
  durationMinutes = 15, 
  onDeadlineComputed 
}: OfferCountdownProps) {
  const { language } = useBooking();
  const [timeRemaining, setTimeRemaining] = useState<number>(durationMinutes * 60);
  const [isExpired, setIsExpired] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Initialize countdown on mount (per-session only)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const now = new Date();
    const deadlineDate = new Date(now.getTime() + durationMinutes * 60 * 1000);
    setDeadline(deadlineDate);
    
    // Notify parent of computed deadline
    if (onDeadlineComputed) {
      onDeadlineComputed(deadlineDate);
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [durationMinutes, onDeadlineComputed]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format deadline as readable time
  const formatDeadline = useCallback((date: Date | null): string => {
    if (!date) return '';
    
    const locale = language === 'es' ? 'es-US' : language === 'zh' ? 'zh-CN' : 'en-US';
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [language]);

  if (isExpired) {
    return (
      <div className="offer-countdown-expired">
        <div className="offer-countdown-content">
          <span className="offer-countdown-label">
            {t(language, 'countdown.expired_label') || 'Rate window ended'}
          </span>
          <p className="offer-countdown-expired-text">
            {t(language, 'countdown.expired_note') || 'If this rate is still shown, it is subject to availability.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="offer-countdown">
      <div className="offer-countdown-header">
        <Clock className="w-3.5 h-3.5" />
        <span className="offer-countdown-label">
          {t(language, 'countdown.crew_reserved') || 'Crew Availability Reserved For'}
        </span>
      </div>
      
      <div className="offer-countdown-timer-row">
        <div className="offer-countdown-timer">
          <Sparkles className="w-3 h-3 offer-countdown-sparkle" />
          <span className="offer-countdown-time">{formatTime(timeRemaining)}</span>
        </div>
        
        {deadline && (
          <div className="offer-countdown-deadline">
            <span className="offer-countdown-until">
              {t(language, 'countdown.until') || 'Reserved until'}
            </span>
            <span className="offer-countdown-time-value">
              {formatDeadline(deadline)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to format deadline for PDF (always English)
export function formatDeadlineForPDF(deadline: Date): string {
  return deadline.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}