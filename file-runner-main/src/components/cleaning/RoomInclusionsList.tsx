import { Check, Sparkles } from 'lucide-react';
import { Language, t } from '@/lib/translations';
import { CoreSpaceInclusion } from '@/lib/coreSpaceConfig';
import { cn } from '@/lib/utils';

interface RoomInclusionsListProps {
  roomId: string;
  inclusions: CoreSpaceInclusion[];
  language: Language;
  situation: 'LIVE_HERE' | 'MOVING' | null;
  serviceType: string; // 'Deep Clean', 'Move-In/Out', etc.
}

export function RoomInclusionsList({
  roomId,
  inclusions,
  language,
  situation,
  serviceType,
}: RoomInclusionsListProps) {
  // Filter inclusions based on service level
  const isDeepOrMoving = situation === 'MOVING' || serviceType === 'Deep Clean' || serviceType === 'Move-In/Out';
  
  const visibleInclusions = inclusions.filter(inc => {
    // If requiresDeepOrMoving is set, only show for Deep/Moving flows
    if ((inc as any).requiresDeepOrMoving) {
      return isDeepOrMoving;
    }
    return true;
  });

  if (visibleInclusions.length === 0) return null;

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 p-2.5">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {t(language, 'room.standard_inclusions')}
        </span>
      </div>
      
      {/* Grid of inclusions - 2 columns desktop, responsive on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {visibleInclusions.map(inc => (
          <div 
            key={inc.key} 
            className="flex items-center gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-200"
          >
            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <span className="truncate">{t(language, inc.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
