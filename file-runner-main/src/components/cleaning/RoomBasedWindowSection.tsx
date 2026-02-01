import { useMemo, useCallback, useState, useEffect } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { 
  generateRoomsFromHomeConfig, 
  calculateRoomWindowTotal, 
  RoomWindowSelection,
  groupRoomsByZone,
  WINDOW_ZONES
} from '@/lib/roomWindowConfig';
import { WindowZoneSection } from './WindowZoneSection';
import { Sparkles, LayoutGrid, Zap } from 'lucide-react';

export function RoomBasedWindowSection() {
  const { language, formData, updateFormData } = useBooking();

  // Generate rooms based on home config
  const generatedRooms = useMemo(() => {
    return generateRoomsFromHomeConfig(
      formData.homeSize || 3,
      formData.masterBaths || 0,
      formData.fullBaths || 2,
      formData.halfBaths || 0,
      {
        kitchen: t(language, 'room.kitchen') || 'Kitchen',
        living: t(language, 'room.living_dining') || 'Living/Dining',
        master: t(language, 'room.master') || 'Master Bedroom',
        bedroom: t(language, 'room.bedroom') || 'Bedroom',
        bathroom: t(language, 'room.bathroom') || 'Bathroom',
        masterBath: t(language, 'room.master_bath') || 'Master Bath',
      }
    );
  }, [formData.homeSize, formData.masterBaths, formData.fullBaths, formData.halfBaths, language]);

  // Initialize from formData or generated rooms
  const [roomSelections, setRoomSelections] = useState<RoomWindowSelection[]>(() => {
    // If formData already has roomWindowSelections, use those
    if (formData.roomWindowSelections && formData.roomWindowSelections.length > 0) {
      return formData.roomWindowSelections;
    }
    return generatedRooms;
  });

  // Update when home config changes (only if no existing selections)
  useEffect(() => {
    if (!formData.roomWindowSelections || formData.roomWindowSelections.length === 0) {
      setRoomSelections(generatedRooms);
    }
  }, [generatedRooms, formData.roomWindowSelections]);

  // Sync local state to BookingContext
  useEffect(() => {
    updateFormData({ roomWindowSelections: roomSelections });
  }, [roomSelections, updateFormData]);

  const currentSelections = roomSelections;

  // Calculate totals
  const totals = useMemo(() => {
    return calculateRoomWindowTotal(currentSelections);
  }, [currentSelections]);

  // Count selected rooms
  const selectedRoomsCount = currentSelections.filter(
    r => r.glassMode !== 'none' || r.blindsCount > 0
  ).length;

  // Update a specific room
  const handleRoomUpdate = useCallback((roomId: string, updates: Partial<RoomWindowSelection>) => {
    setRoomSelections(prev => prev.map(room => 
      room.roomId === roomId ? { ...room, ...updates } : room
    ));
  }, []);

  // Quick select all - apply mode to all rooms
  const handleQuickSelect = useCallback((mode: 'interior' | 'exterior' | 'both' | 'none') => {
    setRoomSelections(prev => prev.map(room => ({
      ...room,
      glassMode: mode,
    })));
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {t(language, 'win.room_based_title') || 'Window Cleaning by Room'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t(language, 'win.room_based_subtitle') || 'Strategic logistics for your home'}
            </p>
          </div>
        </div>
        
        {selectedRoomsCount > 0 && (
          <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            {selectedRoomsCount} {t(language, 'win.rooms_selected') || 'rooms'}
          </span>
        )}
      </div>

      {/* Quick Select Bar */}
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <Zap className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-2">
          {t(language, 'win.quick_select') || 'Quick:'}
        </span>
        <div className="flex gap-1 flex-1">
          <button
            onClick={() => handleQuickSelect('none')}
            className="flex-1 py-1 px-2 text-xs rounded bg-background border border-border hover:bg-muted transition-colors"
          >
            {t(language, 'win.clear_all') || 'Clear'}
          </button>
          <button
            onClick={() => handleQuickSelect('interior')}
            className="flex-1 py-1 px-2 text-xs rounded bg-background border border-border hover:bg-primary/10 transition-colors"
          >
            {t(language, 'win.all_interior') || 'All In'}
          </button>
          <button
            onClick={() => handleQuickSelect('exterior')}
            className="flex-1 py-1 px-2 text-xs rounded bg-background border border-border hover:bg-primary/10 transition-colors"
          >
            {t(language, 'win.all_exterior') || 'All Out'}
          </button>
          <button
            onClick={() => handleQuickSelect('both')}
            className="flex-1 py-1 px-2 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            {t(language, 'win.all_both') || 'All Both'}
          </button>
        </div>
      </div>

      {/* Zone-Based Layout */}
      <div className="space-y-3">
        {/* Social Core Zone - Expanded by default */}
        <WindowZoneSection
          zoneConfig={WINDOW_ZONES.social_core}
          rooms={useMemo(() => groupRoomsByZone(currentSelections).social_core, [currentSelections])}
          onRoomUpdate={handleRoomUpdate}
          defaultExpanded={true}
        />
        
        {/* Private Suites Zone - Collapsed by default */}
        <WindowZoneSection
          zoneConfig={WINDOW_ZONES.private_suites}
          rooms={useMemo(() => groupRoomsByZone(currentSelections).private_suites, [currentSelections])}
          onRoomUpdate={handleRoomUpdate}
          defaultExpanded={false}
        />
        
        {/* Sanitary Zone - Collapsed by default */}
        <WindowZoneSection
          zoneConfig={WINDOW_ZONES.sanitary_zones}
          rooms={useMemo(() => groupRoomsByZone(currentSelections).sanitary_zones, [currentSelections])}
          onRoomUpdate={handleRoomUpdate}
          defaultExpanded={false}
        />
      </div>

      {/* Summary Footer */}
      {totals.totalPrice > 0 && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">
                {t(language, 'win.total_summary') || 'Window & Blinds Total'}
              </span>
            </div>
            <span className="text-lg font-bold text-primary">
              +${totals.totalPrice.toFixed(0)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {totals.totalWindowsInside > 0 && (
              <span className="bg-background/80 px-2 py-0.5 rounded">
                {totals.totalWindowsInside} {t(language, 'win.interior') || 'interior'}
              </span>
            )}
            {totals.totalWindowsOutside > 0 && (
              <span className="bg-background/80 px-2 py-0.5 rounded">
                {totals.totalWindowsOutside} {t(language, 'win.exterior') || 'exterior'}
              </span>
            )}
            {totals.totalBlinds > 0 && (
              <span className="bg-background/80 px-2 py-0.5 rounded">
                {totals.totalBlinds} {t(language, 'win.blind_sets') || 'blind sets'}
              </span>
            )}
            <span className="bg-background/80 px-2 py-0.5 rounded ml-auto">
              ~{Math.round(totals.laborMinutes)} min
            </span>
          </div>
          
          {/* Breakdown Preview */}
          {totals.breakdown.length > 0 && (
            <div className="mt-3 pt-3 border-t border-primary/10 space-y-1">
              {totals.breakdown.map((item) => (
                <div key={item.roomId} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {item.roomLabel}: {item.description}
                  </span>
                  <span className="text-foreground font-medium">${item.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
