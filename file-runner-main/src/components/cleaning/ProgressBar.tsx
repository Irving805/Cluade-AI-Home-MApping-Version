import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// Step labels for visual progress bar (always 4 steps displayed)
// START → CUSTOMIZE → DETAILS → REVIEW
const stepLabels = ['step.start', 'step.customize', 'step.details', 'step.review'];

// Map internal currentStep to visual step index for all service flows
// Visual flow is ALWAYS: Start(0) → Customize(1) → Details(2) → Review(3)
// Industry step (Step 0) is part of "Start" visually
const getVisualStep = (
  currentStep: number, 
  showWindowStep: boolean, 
  mode: string, 
  isHourlyMode: boolean,
  situation: string | null
): number => {
  // COMMERCIAL MODE: Industry(0) → ServiceType(1) → CommercialStart(2) → Details(3) → Review(4)
  if (situation === 'COMMERCIAL') {
    if (currentStep <= 2) return 0; // Industry, ServiceType, or CommercialStart = Start
    if (currentStep === 3) return 2; // Details
    if (currentStep === 4) return 3; // Review
    return 0;
  }

  // RENOVATION MODE: Industry(0) → Triage(1) → RenovationStart(2) → Details(3) → Review(4)
  if (situation === 'RENOVATION') {
    if (currentStep <= 2) return 0; // Industry, Triage, or RenovationStart = Start
    if (currentStep === 3) return 2; // Details
    if (currentStep === 4) return 3; // Review
    return 0;
  }

  // HOURLY MODE: Industry(0) → Triage(1) → HourlyConfig(2) → Details(3) → Review(4)
  if (isHourlyMode) {
    if (currentStep <= 2) return 0; // Industry, Triage, or HourlyConfig = Start
    if (currentStep === 3) return 2; // Details
    if (currentStep === 4) return 3; // Review
    return 0;
  }

  // CUSTOM/AREA MODE: Industry(0) → Triage(1) → CustomStart(2) → [Windows(3)] → Details → Review
  if (mode === 'custom') {
    if (currentStep <= 2) return 0; // Industry, Triage, or CustomStart = Start
    if (showWindowStep) {
      if (currentStep === 3) return 1; // Windows = Customize
      if (currentStep === 4) return 2; // Details
      if (currentStep === 5) return 3; // Review
    } else {
      if (currentStep === 3) return 2; // Details
      if (currentStep === 4) return 3; // Review
    }
    return 0;
  }

  // FULL HOME MODE (LIVE_HERE/MOVING): 
  // Triage(0) → Start(1) → Addons(2) → [Windows(3)] → Details → Review
  // Visual: Start(0) → Customize(1) → Details(2) → Review(3)
  if (currentStep <= 1) return 0; // Triage or Start = Visual "Start"
  if (currentStep === 2) return 1; // Addons = Visual "Customize"
  
  if (showWindowStep) {
    if (currentStep === 3) return 1; // Windows = Visual "Customize"
    if (currentStep === 4) return 2; // Details
    if (currentStep === 5) return 3; // Review
  } else {
    if (currentStep === 3) return 2; // Details
    if (currentStep === 4) return 3; // Review
  }
  return 0;
};

// Get contextual "what's next" text for mobile guide
const getNextStepHint = (visualStep: number, language: string): string => {
  if (visualStep === 0) return t(language as any, 'progress.next_home_details');
  if (visualStep === 1) return t(language as any, 'progress.next_review');
  if (visualStep === 2) return t(language as any, 'progress.next_confirm');
  return '';
};

export function ProgressBar() {
  const { language, currentStep, mode, showWindowStep, formData, situation } = useBooking();
  
  const visualStep = getVisualStep(currentStep, showWindowStep, mode, formData.isHourlyMode, situation);
  const totalSteps = stepLabels.length;
  const nextHint = getNextStepHint(visualStep, language);
  
  return (
    <div className="mb-6 sm:mb-8">
      {/* Step indicator with connecting lines - Uber/Airbnb style */}
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-border" />
        
        {/* Progress line */}
        <div 
          className="absolute top-4 left-6 h-0.5 bg-primary transition-all duration-500 ease-out"
          style={{ 
            width: `calc(${(visualStep / (totalSteps - 1)) * 100}% - 3rem)`,
            maxWidth: 'calc(100% - 3rem)'
          }}
        />
        
        {stepLabels.map((stepKey, idx) => {
          const isCompleted = visualStep > idx;
          const isCurrent = visualStep === idx;
          const isUpcoming = visualStep < idx;

          return (
            <div 
              key={stepKey} 
              className="flex flex-col items-center relative z-10"
              style={{ flex: 1 }}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                  'text-sm font-bold border-2',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'bg-card border-primary text-primary shadow-primary ring-4 ring-primary/20',
                  isUpcoming && 'bg-card border-border text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 animate-checkmark" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              
              {/* Step label */}
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-semibold uppercase tracking-wide mt-2 transition-colors text-center',
                  'max-w-[70px] sm:max-w-[80px] leading-tight',
                  isCurrent && 'text-primary',
                  isCompleted && 'text-primary/70',
                  isUpcoming && 'text-muted-foreground'
                )}
              >
                {t(language, stepKey)}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Mobile: Next step hint */}
      {nextHint && (
        <p className="text-center text-xs text-muted-foreground mt-3 md:hidden font-medium">
          {nextHint}
        </p>
      )}
    </div>
  );
}
