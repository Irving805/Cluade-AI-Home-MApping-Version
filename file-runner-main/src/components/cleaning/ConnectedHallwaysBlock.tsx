/**
 * ConnectedHallwaysBlock — Read-Only Display for Area Cards
 * 
 * Shows which hallways connect to a given area (kitchen, living, bedrooms, etc.)
 * Filters hallways by connectsTo.includes(areaId).
 * 
 * SSOT: Reads from hallways[].connectsTo, no editing here.
 */

import { Language, t } from '@/lib/translations';
import { DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HallwayConfig } from '@/contexts/BookingContext';

interface ConnectedHallwaysBlockProps {
  areaId: string;           // 'kitchen', 'living', 'bedrooms', etc.
  hallways: HallwayConfig[];
  language: Language;
  onManageHallways?: () => void;
}

export function ConnectedHallwaysBlock({
  areaId,
  hallways,
  language,
  onManageHallways,
}: ConnectedHallwaysBlockProps) {
  // Filter hallways that connect to this area
  const connectedHallways = hallways.filter(hw => 
    hw.connectsTo?.includes(areaId)
  );
  
  if (connectedHallways.length === 0) return null;
  
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2">
        <DoorOpen className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            {t(language, 'area.connected_hallways')}
          </span>
          <div className="flex flex-wrap gap-1">
            {connectedHallways.map(hw => (
              <span key={hw.id} className="text-xs font-medium text-foreground">
                • {hw.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      {onManageHallways && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onManageHallways} 
          className="text-xs h-7 px-2"
        >
          {t(language, 'area.manage_hallways')}
        </Button>
      )}
    </div>
  );
}
