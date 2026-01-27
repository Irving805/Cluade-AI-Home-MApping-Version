import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { 
  WindowZoneConfig, 
  RoomWindowSelection, 
  calculateZoneTotal, 
  countZoneSelections 
} from '@/lib/roomWindowConfig';
import { RoomWindowCard } from './RoomWindowCard';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WindowZoneSectionProps {
  zoneConfig: WindowZoneConfig;
  rooms: RoomWindowSelection[];
  onRoomUpdate: (roomId: string, updates: Partial<RoomWindowSelection>) => void;
  defaultExpanded: boolean;
}

export function WindowZoneSection({ 
  zoneConfig, 
  rooms, 
  onRoomUpdate, 
  defaultExpanded 
}: WindowZoneSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const { language } = useBooking();
  
  // Calculate zone total
  const zoneTotal = useMemo(() => calculateZoneTotal(rooms), [rooms]);
  
  // Count selected rooms in zone
  const selectedCount = useMemo(() => countZoneSelections(rooms), [rooms]);

  if (rooms.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* Zone Header - Always visible */}
      <CollapsibleTrigger asChild>
        <button 
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-xl transition-all",
            "bg-gradient-to-r", zoneConfig.bgTint,
            "border", zoneConfig.borderColor,
            "hover:shadow-md cursor-pointer"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{zoneConfig.emoji}</span>
            <div className="text-left">
              <h5 className="text-xs font-bold tracking-wide text-foreground uppercase">
                {t(language, zoneConfig.labelKey) || zoneConfig.label}
              </h5>
              <p className="text-xs text-muted-foreground">
                {t(language, zoneConfig.descriptionKey) || zoneConfig.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zone total badge */}
            {zoneTotal > 0 && (
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                +${zoneTotal}
              </span>
            )}
            {/* Selected count indicator */}
            <span className={cn(
              "text-xs",
              selectedCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {selectedCount}/{rooms.length}
            </span>
            {/* Chevron */}
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </button>
      </CollapsibleTrigger>
      
      {/* Zone Content - Collapsible */}
      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="pt-3 grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <RoomWindowCard
              key={room.roomId}
              room={room}
              onUpdate={(updates) => onRoomUpdate(room.roomId, updates)}
              compact={true}
            />
          ))}
        </div>
        
        {/* Zone Summary Footer */}
        {zoneTotal > 0 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <span>{t(language, 'zone.total') || 'Zone Total'}:</span>
            <span className="font-semibold text-primary">${zoneTotal}</span>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}