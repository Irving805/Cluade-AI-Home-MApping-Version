import { useState, useEffect, useRef } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { Check, Sparkles, Gift, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PreferredCodeInputProps {
  onCodeApplied: (code: string, deadline: Date) => void;
}

const VALID_CODE = '35BONUS';
const BONUS_VALUE = 35;
const COUNTDOWN_MINUTES = 15;

export function PreferredCodeInput({ onCodeApplied }: PreferredCodeInputProps) {
  const { language } = useBooking();
  const [code, setCode] = useState('');
  const [isApplied, setIsApplied] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleApply = () => {
    const trimmedCode = code.trim().toUpperCase();
    
    if (trimmedCode === VALID_CODE) {
      setIsApplied(true);
      setIsInvalid(false);
      setShowSuccess(true);
      
      // Calculate deadline (15 minutes from now)
      const newDeadline = new Date(Date.now() + COUNTDOWN_MINUTES * 60 * 1000);
      setDeadline(newDeadline);
      
      // Notify parent
      onCodeApplied(trimmedCode, newDeadline);
      
      // Remove success animation after delay
      setTimeout(() => setShowSuccess(false), 2000);
    } else {
      setIsInvalid(true);
      setTimeout(() => setIsInvalid(false), 2000);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  // Format deadline for display
  const formatDeadline = (date: Date): string => {
    const locale = language === 'es' ? 'es-US' : language === 'zh' ? 'zh-CN' : 'en-US';
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isApplied) {
    return (
      <div className={`preferred-code-success ${showSuccess ? 'animate-scale-in' : ''}`}>
        {/* Success state - elegant confirmation */}
        <div className="preferred-code-success-content">
          <div className="preferred-code-success-icon">
            <div className="preferred-code-check-circle">
              <Check className="w-4 h-4" />
            </div>
          </div>
          
          <div className="preferred-code-success-text">
            <div className="preferred-code-applied-label">
              <span>{t(language, 'code.applied') || 'Preferred Code Applied'}</span>
              <span className="preferred-code-value">{VALID_CODE}</span>
            </div>
            
            <div className="preferred-code-bonus-activated">
              <Gift className="w-3.5 h-3.5" />
              <span>
                {t(language, 'code.value_activated') || 'Preferred Client Value Activated'} 
                <strong className="ml-1">(${BONUS_VALUE})</strong>
              </span>
            </div>
          </div>
        </div>
        
        {/* Reserved until indicator */}
        {deadline && (
          <div className="preferred-code-reserved">
            <Lock className="w-3 h-3" />
            <span>
              {t(language, 'code.reserved_until') || 'Rate reserved until'} {formatDeadline(deadline)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="preferred-code-input-container">
      <div className="preferred-code-header">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="preferred-code-label">
          {t(language, 'code.have_code') || 'Have a preferred client code?'}
        </span>
      </div>
      
      <div className="preferred-code-input-row">
        <div className="preferred-code-input-wrapper">
          <Input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder={t(language, 'code.enter_code') || 'Enter code'}
            className={`preferred-code-input ${isInvalid ? 'invalid' : ''}`}
            maxLength={20}
            autoComplete="off"
          />
          {isInvalid && (
            <span className="preferred-code-error">
              {t(language, 'code.invalid') || 'Invalid code'}
            </span>
          )}
        </div>
        
        <Button
          type="button"
          onClick={handleApply}
          disabled={!code.trim()}
          className="preferred-code-apply-btn"
          variant="outline"
        >
          {t(language, 'code.apply') || 'Apply'}
        </Button>
      </div>
    </div>
  );
}

// Export constants for use elsewhere
export const PREFERRED_CODE = VALID_CODE;
export const PREFERRED_BONUS_VALUE = BONUS_VALUE;
