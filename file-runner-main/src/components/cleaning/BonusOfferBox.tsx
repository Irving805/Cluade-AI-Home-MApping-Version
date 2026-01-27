import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { serviceTypeMap } from '@/lib/pricing';
import { Gift, Crown, Clock, Sparkles } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { OfferCountdown } from './OfferCountdown';

interface BonusOfferBoxProps {
  compact?: boolean;
  showCountdown?: boolean;
  onDeadlineComputed?: (deadline: Date) => void;
}

// Store deadline globally for PDF access
let globalOfferDeadline: Date | null = null;

export function BonusOfferBox({ 
  compact = false, 
  showCountdown = false,
  onDeadlineComputed 
}: BonusOfferBoxProps) {
  const { language, formData, mode } = useBooking();
  const [deadline, setDeadline] = useState<Date | null>(null);
  
  // No offers for Custom/Partial mode or Standard cleaning
  const serviceIdx = serviceTypeMap[formData.serviceType];
  const isStandard = serviceIdx === 2;
  
  // Hide offers for Custom mode or Standard cleaning
  if (mode === 'custom' || isStandard) {
    return null;
  }
  
  const isOneTime = serviceIdx === 0 || serviceIdx === 1; // Deep, Move-In/Out only (not Standard)
  const isRecurring = serviceIdx === 3 || serviceIdx === 4 || serviceIdx === 5; // Weekly, Bi-Weekly, Monthly

  // Calculate expiry date (5 days from now) for one-time offers
  const offerExpiryDate = useMemo(() => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 5);
    
    // Format based on language
    const locale = language === 'es' ? 'es-US' : language === 'zh' ? 'zh-CN' : 'en-US';
    return expires.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
    });
  }, [language]);

  // Handle deadline computed from countdown
  const handleDeadlineComputed = useCallback((computedDeadline: Date) => {
    setDeadline(computedDeadline);
    globalOfferDeadline = computedDeadline;
    if (onDeadlineComputed) {
      onDeadlineComputed(computedDeadline);
    }
  }, [onDeadlineComputed]);

  // Get recurring bonus message based on service type
  const getRecurringBonusMessage = () => {
    switch (serviceIdx) {
      case 3: // Weekly
        return t(language, 'offer.weekly_bonus');
      case 4: // Bi-Weekly
        return (
          <>
            <span dangerouslySetInnerHTML={{ __html: t(language, 'offer.member.li1') }} />
            <br />
            <span dangerouslySetInnerHTML={{ __html: t(language, 'offer.member.li2') }} />
          </>
        );
      case 5: // Monthly
        return (
          <>
            <span dangerouslySetInnerHTML={{ __html: t(language, 'offer.member.li1') }} />
            <br />
            <span dangerouslySetInnerHTML={{ __html: t(language, 'offer.member.li2') }} />
          </>
        );
      default:
        return null;
    }
  };

  if (isOneTime) {
    return (
      <div className={`premium-offer-card urgent ${compact ? 'compact' : ''}`}>
        {/* Decorative accent line */}
        <div className="premium-offer-accent" />
        
        <div className="premium-offer-content">
          {/* Premium badge */}
          <div className="premium-offer-badge">
            <Sparkles className="w-3 h-3" />
            <span>{t(language, 'offer.badge') || 'Preferred Client'}</span>
          </div>
          
          {/* Main offer content */}
          <div className="premium-offer-main">
            <div className="premium-offer-icon">
              <Gift className="w-5 h-5" />
            </div>
            <div className="premium-offer-text">
              <strong className="premium-offer-title">
                {t(language, 'offer.urgent.title')}
              </strong>
              <p className="premium-offer-desc">
                {t(language, 'offer.urgent.desc').replace('{date}', offerExpiryDate)}
              </p>
              {/* Code hint */}
              <p className="premium-offer-code-hint">
                {t(language, 'offer.code_hint') || 'Use code 35BONUS to activate'}
              </p>
            </div>
          </div>
          
          {/* Countdown timer - only in Review step */}
          {showCountdown && (
            <OfferCountdown 
              durationMinutes={15} 
              onDeadlineComputed={handleDeadlineComputed}
            />
          )}
          
          {/* Elegant time indicator (when not showing countdown) */}
          {!showCountdown && (
            <div className="premium-offer-footer">
              <Clock className="w-3.5 h-3.5" />
              <span>{t(language, 'offer.limited') || `Available until ${offerExpiryDate}`}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isRecurring) {
    const bonusMessage = getRecurringBonusMessage();
    
    return (
      <div className={`premium-offer-card member ${compact ? 'compact' : ''}`}>
        {/* Decorative accent line */}
        <div className="premium-offer-accent member" />
        
        <div className="premium-offer-content">
          {/* Premium badge */}
          <div className="premium-offer-badge member">
            <Crown className="w-3 h-3" />
            <span>{t(language, 'offer.member_badge') || 'Member Exclusive'}</span>
          </div>
          
          {/* Main offer content */}
          <div className="premium-offer-main">
            <div className="premium-offer-icon member">
              <Crown className="w-5 h-5" />
            </div>
            <div className="premium-offer-text">
              <strong className="premium-offer-title member">
                {t(language, 'offer.member.title')}
              </strong>
              <div className="premium-offer-desc member">
                {bonusMessage}
              </div>
            </div>
          </div>
          
          {/* Countdown timer - only in Review step */}
          {showCountdown && (
            <OfferCountdown 
              durationMinutes={15} 
              onDeadlineComputed={handleDeadlineComputed}
            />
          )}
          
          {/* Trust footer (when not showing countdown) */}
          {!showCountdown && (
            <div className="premium-offer-footer member">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t(language, 'offer.auto_applied') || 'Benefits activate automatically'}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Export deadline getter for PDF generation
export function getOfferDeadline(): Date | null {
  return globalOfferDeadline;
}

// Export expiry date helper for PDF generation
export function getOfferExpiryDate(language: string): string {
  const expires = new Date();
  expires.setDate(expires.getDate() + 5);
  const locale = language === 'es' ? 'es-US' : language === 'zh' ? 'zh-CN' : 'en-US';
  return expires.toLocaleDateString(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

// Format deadline for PDF (always English)
export function formatDeadlineForPDF(deadline: Date | null): string {
  if (!deadline) return '';
  return deadline.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}