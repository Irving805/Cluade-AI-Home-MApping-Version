import { useEffect, useRef, useCallback } from 'react';
import { BookingFormData, Addon, ServiceMode, Situation, RecurringStartMode, MicroServiceSelection } from '@/contexts/BookingContext';

const STORAGE_KEY = 'nancy_quote_draft';
const TTL_HOURS = 24;

interface PersistedState {
  formData: BookingFormData;
  selectedAddons: Addon[];
  mode: ServiceMode;
  situation: Situation;
  currentStep: number;
  recurringStartMode: RecurringStartMode;
  servicesRevealed: boolean;
  selectedMicroServices: MicroServiceSelection[];
  timestamp: number;
}

export function usePersistedBooking() {
  const lastSaveRef = useRef<string>('');

  // Load persisted state from localStorage
  const loadPersistedState = useCallback((): Partial<PersistedState> | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed: PersistedState = JSON.parse(stored);
      
      // Check TTL - 24 hours
      const ageMs = Date.now() - parsed.timestamp;
      const maxAgeMs = TTL_HOURS * 60 * 60 * 1000;
      
      if (ageMs > maxAgeMs) {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[Persistence] Draft expired, cleared');
        return null;
      }

      console.log('[Persistence] Restored draft from', new Date(parsed.timestamp).toLocaleString());
      
      // Migration: moveOccupancy → moveCondition + enabled booleans
      if (parsed.formData) {
        const fd = parsed.formData as any;
        
        // Validate moveCondition - if missing or invalid, default to 'vacant'
        const validCondition = (v: any) => v === 'vacant' || v === 'partial_empty';
        if (!validCondition(fd.moveCondition)) {
          fd.moveCondition = 'vacant';
          console.log('[Persistence] Migrated to moveCondition: vacant');
        }
        
        // Ensure enabled booleans have defaults
        if (fd.hallwaysEnabled === undefined) fd.hallwaysEnabled = true;
        if (fd.stairsEnabled === undefined) fd.stairsEnabled = true;
        
        // === LEGACY COUNTER → homeMapping.areas.enabled MIGRATION ===
        // If legacy counter > 0 but enabled is false/undefined, set enabled = true
        // This prevents "ghost" areas that have data but aren't visible
        if (fd.homeMapping?.areas) {
          const areas = fd.homeMapping.areas;
          
          // Office: legacy officeCount → homeMapping.areas.office.enabled
          if ((fd.officeCount ?? 0) > 0 && !areas.office?.enabled) {
            if (!areas.office) areas.office = { enabled: true };
            else areas.office.enabled = true;
            console.log('[Persistence] Migrated officeCount → office.enabled');
          }
          
          // Laundry: legacy laundryRoomCount → homeMapping.areas.laundry.enabled
          if ((fd.laundryRoomCount ?? 0) > 0 && !areas.laundry?.enabled) {
            if (!areas.laundry) areas.laundry = { enabled: true };
            else areas.laundry.enabled = true;
            console.log('[Persistence] Migrated laundryRoomCount → laundry.enabled');
          }
          
          // Garage: legacy garageCount → homeMapping.areas.garage.enabled
          if ((fd.garageCount ?? 0) > 0 && !areas.garage?.enabled) {
            if (!areas.garage) areas.garage = { enabled: true };
            else areas.garage.enabled = true;
            console.log('[Persistence] Migrated garageCount → garage.enabled');
          }
          
          // Patio: legacy patioCount → homeMapping.areas.patio.enabled
          if ((fd.patioCount ?? 0) > 0 && !areas.patio?.enabled) {
            if (!areas.patio) areas.patio = { enabled: true };
            else areas.patio.enabled = true;
            console.log('[Persistence] Migrated patioCount → patio.enabled');
          }
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('[Persistence] Failed to load:', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  // Save state to localStorage (debounced via caller)
  const saveState = useCallback((state: Omit<PersistedState, 'timestamp'>) => {
    try {
      const toSave: PersistedState = {
        ...state,
        timestamp: Date.now(),
      };
      
      const serialized = JSON.stringify(toSave);
      
      // Only save if changed
      if (serialized !== lastSaveRef.current) {
        localStorage.setItem(STORAGE_KEY, serialized);
        lastSaveRef.current = serialized;
        console.log('[Persistence] Draft saved');
      }
    } catch (error) {
      console.error('[Persistence] Failed to save:', error);
    }
  }, []);

  // Clear persisted state (after successful submission)
  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      lastSaveRef.current = '';
      console.log('[Persistence] Draft cleared after submission');
    } catch (error) {
      console.error('[Persistence] Failed to clear:', error);
    }
  }, []);

  return {
    loadPersistedState,
    saveState,
    clearPersistedState,
  };
}

// Debounce helper for saving
export function useDebouncedSave(saveFunction: () => void, delay: number = 300) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveFunction();
    }, delay);
  }, [saveFunction, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedSave;
}
