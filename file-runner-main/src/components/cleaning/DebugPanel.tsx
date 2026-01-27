/**
 * DEV-ONLY Debug Panel for Pricing Widget
 * Displays live pricing rates, form data, and calculated values
 * Only renders in development mode
 * 
 * COLLAPSIBLE: Click the small bug icon to expand/collapse
 */

import { useState } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useBookingSummary } from '@/hooks/useBookingSummary';
import { HOME_BASE_RATES, HOME_BASE_TIME, BATH_RATES, BATH_TIME, FREQUENCY_MULTIPLIERS, CONDITION_FACTORS } from '@/lib/pricing_v2';
import { HOURLY_CONFIG, HOURLY_FREQUENCY_RATES, ADDON_TIMES, blindTypeAddons } from '@/lib/pricing';
import { Bug, X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DebugPanel() {
  // Only render in development
  if (import.meta.env.PROD) return null;

  const [isOpen, setIsOpen] = useState(false);

  const {
    formData,
    mode,
    situation,
    moveContext,
    selectedAddons,
    selectedMicroServices,
    calculateHourlyTotal,
    isRecurringService,
  } = useBooking();

  // Use Single Source of Truth for pricing
  const summary = useBookingSummary();
  const total = summary.totals.grandTotal;
  const hourlyTotal = formData.isHourlyMode ? calculateHourlyTotal() : 0;
  const isRecurring = isRecurringService();

  // Calculate bathroom totals
  const totalBaths = formData.masterBaths + formData.fullBaths + formData.halfBaths;
  const isDeep = formData.serviceType === 'Deep Clean' || formData.serviceType === 'Move-In/Out';
  const level = isDeep ? 'deep' : 'std';

  // Collapsed state: just a small toggle button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-2 z-[9999]",
          "w-8 h-8 rounded-full",
          "bg-black/80 text-green-400",
          "flex items-center justify-center",
          "shadow-lg border border-green-500/50",
          "hover:bg-black hover:scale-110 transition-all",
          "opacity-50 hover:opacity-100"
        )}
        title="Open Debug Panel"
      >
        <Bug className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-20 right-2 z-[9999]",
      "w-72 max-h-[50vh] overflow-auto",
      "bg-black/95 text-green-400 text-[10px] font-mono",
      "p-3 rounded-lg shadow-2xl border border-green-500/50"
    )}>
      <div className="flex justify-between items-center mb-2 border-b border-green-500/30 pb-1.5">
        <span className="text-green-300 font-bold text-xs flex items-center gap-1">
          <Bug className="w-3 h-3" /> DEBUG
        </span>
        <div className="flex items-center gap-1">
          <span className="text-yellow-400 text-[8px]">DEV</span>
          <button
            onClick={() => setIsOpen(false)}
            className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition-colors"
          >
            <X className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>

      {/* Current Form State */}
      <div className="mb-3">
        <div className="text-cyan-400 font-bold mb-1">📋 Form State</div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <span className="text-gray-400">Mode:</span>
          <span>{mode}</span>
          <span className="text-gray-400">Situation:</span>
          <span>{situation}</span>
          <span className="text-gray-400">Move Context:</span>
          <span>{moveContext || 'null'}</span>
          <span className="text-gray-400">Service Type:</span>
          <span>{formData.serviceType}</span>
          <span className="text-gray-400">Is Deep:</span>
          <span>{isDeep ? '✅' : '❌'}</span>
          <span className="text-gray-400">Is Recurring:</span>
          <span>{isRecurring ? '✅' : '❌'}</span>
          <span className="text-gray-400">Is Hourly:</span>
          <span>{formData.isHourlyMode ? '✅' : '❌'}</span>
        </div>
      </div>

      {/* Home & Bathroom Config */}
      <div className="mb-3">
        <div className="text-cyan-400 font-bold mb-1">🏠 Home Config</div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <span className="text-gray-400">Home Size (idx):</span>
          <span>{formData.homeSize}</span>
          <span className="text-gray-400">SqFt Range:</span>
          <span>{formData.sqft || 'null'}</span>
          <span className="text-gray-400">Master Baths:</span>
          <span>{formData.masterBaths}</span>
          <span className="text-gray-400">Full Baths:</span>
          <span>{formData.fullBaths}</span>
          <span className="text-gray-400">Half Baths:</span>
          <span>{formData.halfBaths}</span>
          <span className="text-gray-400">Total Baths:</span>
          <span>{totalBaths}</span>
          <span className="text-gray-400">Condition Fee:</span>
          <span>${formData.conditionFee}</span>
        </div>
      </div>

      {/* Pricing Rates */}
      <div className="mb-3">
        <div className="text-cyan-400 font-bold mb-1">💰 Active Rates</div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <span className="text-gray-400">Home Base ({level}):</span>
          <span>${HOME_BASE_RATES[formData.homeSize]?.[level] || 'N/A'}</span>
          <span className="text-gray-400">Master Bath ({level}):</span>
          <span>${BATH_RATES.master[level]}</span>
          <span className="text-gray-400">Full Bath ({level}):</span>
          <span>${BATH_RATES.full[level]}</span>
          <span className="text-gray-400">Half Bath ({level}):</span>
          <span>${BATH_RATES.half[level]}</span>
        </div>
      </div>

      {/* Time Estimates */}
      <div className="mb-3">
        <div className="text-cyan-400 font-bold mb-1">⏱️ Time Estimates</div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <span className="text-gray-400">Home Base Time:</span>
          <span>{HOME_BASE_TIME[formData.homeSize]?.[level] || 'N/A'} hrs</span>
          <span className="text-gray-400">Master Bath Time:</span>
          <span>{BATH_TIME.master[level]} min</span>
          <span className="text-gray-400">Full Bath Time:</span>
          <span>{BATH_TIME.full[level]} min</span>
          <span className="text-gray-400">Half Bath Time:</span>
          <span>{BATH_TIME.half[level]} min</span>
        </div>
      </div>

      {/* Multipliers */}
      <div className="mb-3">
        <div className="text-cyan-400 font-bold mb-1">📊 Multipliers</div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <span className="text-gray-400">Freq (Weekly):</span>
          <span>×{FREQUENCY_MULTIPLIERS.weekly}</span>
          <span className="text-gray-400">Freq (Bi-Weekly):</span>
          <span>×{FREQUENCY_MULTIPLIERS.biweekly}</span>
          <span className="text-gray-400">Freq (Monthly):</span>
          <span>×{FREQUENCY_MULTIPLIERS.monthly}</span>
          <span className="text-gray-400">Cond (Heavy):</span>
          <span>×{CONDITION_FACTORS.heavy}</span>
          <span className="text-gray-400">Cond (Extreme):</span>
          <span>×{CONDITION_FACTORS.extreme}</span>
        </div>
      </div>

      {/* Hourly Config */}
      {formData.isHourlyMode && (
        <div className="mb-3">
          <div className="text-cyan-400 font-bold mb-1">⏰ Hourly Config</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <span className="text-gray-400">Team Size:</span>
            <span>{HOURLY_CONFIG.TEAM_SIZE}</span>
            <span className="text-gray-400">Clock Hours:</span>
            <span>{formData.hourlyHours}</span>
            <span className="text-gray-400">Man-Hours:</span>
            <span>{formData.hourlyHours * HOURLY_CONFIG.TEAM_SIZE}</span>
            <span className="text-gray-400">Rate (Basic):</span>
            <span>${HOURLY_FREQUENCY_RATES[formData.hourlyFrequency || 'onetime']?.basic}/hr</span>
            <span className="text-gray-400">Rate (Deep):</span>
            <span>${HOURLY_FREQUENCY_RATES[formData.hourlyFrequency || 'onetime']?.deep}/hr</span>
            <span className="text-gray-400">Hourly Total:</span>
            <span className="text-yellow-400 font-bold">${hourlyTotal}</span>
          </div>
        </div>
      )}

      {/* Selected Add-ons (legacy global) */}
      {selectedAddons.length > 0 && (
        <div className="mb-3">
          <div className="text-cyan-400 font-bold mb-1">➕ Add-ons Legacy ({selectedAddons.length})</div>
          <div className="text-[10px] space-y-0.5 max-h-20 overflow-y-auto">
            {selectedAddons.map(a => (
              <div key={a.value} className="flex justify-between">
                <span>{a.quantity}× {a.value}</span>
                <span className="text-gray-400">{ADDON_TIMES[a.value] || '?'} min</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room-Based Add-ons (new per-room) */}
      {formData.roomAddons && (
        <div className="mb-3">
          <div className="text-cyan-400 font-bold mb-1">🏠 Room Add-ons</div>
          <div className="text-[10px] space-y-0.5 max-h-32 overflow-y-auto">
            {(['kitchen', 'living', 'dining', 'hallways'] as const).map(roomId => {
              const addons = formData.roomAddons[roomId] || [];
              if (addons.length === 0) return null;
              return (
                <div key={roomId}>
                  <span className="text-yellow-400">{roomId}:</span>
                  {addons.map(a => (
                    <span key={a.addonId} className="ml-1">{a.quantity}× {a.addonId}</span>
                  ))}
                </div>
              );
            })}
            {Object.entries(formData.roomAddons.bedrooms || {}).map(([bedId, addons]) => {
              if (!addons || addons.length === 0) return null;
              return (
                <div key={bedId}>
                  <span className="text-yellow-400">{bedId}:</span>
                  {addons.map(a => (
                    <span key={a.addonId} className="ml-1">{a.quantity}× {a.addonId}</span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Micro-Services */}
      {selectedMicroServices.length > 0 && (
        <div className="mb-3">
          <div className="text-cyan-400 font-bold mb-1">🔧 Micro-Services ({selectedMicroServices.length})</div>
          <div className="text-[10px] space-y-0.5">
            {selectedMicroServices.map(ms => (
              <div key={ms.id}>{ms.quantity}× {ms.id}</div>
            ))}
          </div>
        </div>
      )}

      {/* Blinds Audit */}
      <div className="mb-3">
        <div className="text-cyan-400 font-bold mb-1">🪟 Blinds (Audit Check)</div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          {blindTypeAddons.map(b => (
            <>
              <span key={`${b.value}-label`} className="text-gray-400">{b.value}:</span>
              <span key={`${b.value}-value`}>${b.price} / {b.laborMinutes} min</span>
            </>
          ))}
        </div>
      </div>

      {/* Window Inventory Debug */}
      {formData.roomWindowSelections && formData.roomWindowSelections.length > 0 && (
        <div className="mb-3">
          <div className="text-cyan-400 font-bold mb-1">🏠 Window Inventory</div>
          <div className="text-[10px] space-y-0.5 max-h-24 overflow-y-auto">
            {formData.roomWindowSelections
              .filter(r => r.windowInventory?.length > 0 || r.blindsCount > 0)
              .map(room => (
                <div key={room.roomId} className="flex justify-between">
                  <span className="text-gray-400">{room.roomLabel}:</span>
                  <span>
                    {room.windowInventory?.map(i => `${i.quantity}× ${i.typeId}`).join(', ')}
                    {room.includeSillsTracks ? ' +S&T' : ''}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Floor Distribution Debug */}
      {formData.roomFloorLocations && (formData.houseLevels >= 2 || formData.apartmentUnitLevels >= 2) && (
        <div className="mb-3">
          <div className="text-cyan-400 font-bold mb-1">📍 Floor Distribution</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <span className="text-gray-400">Max Floors:</span>
            <span>{formData.propertyType === 'house' ? formData.houseLevels : formData.apartmentUnitLevels}</span>
            <span className="text-gray-400">Kitchen:</span>
            <span>F{formData.roomFloorLocations.kitchen}</span>
            <span className="text-gray-400">Living:</span>
            <span>F{formData.roomFloorLocations.living}</span>
            <span className="text-gray-400">Dining:</span>
            <span>F{formData.roomFloorLocations.dining}</span>
            <span className="text-gray-400">Hallways:</span>
            <span>F{formData.roomFloorLocations.hallways}</span>
            {Object.entries(formData.roomFloorLocations.bedrooms || {}).map(([id, floor]) => (
              <div key={`${id}-row`} className="contents">
                <span className="text-gray-400">{id}:</span>
                <span>F{floor as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Total */}
      <div className="border-t border-green-500/30 pt-2 mt-2">
        <div className="flex justify-between text-sm">
          <span className="text-green-300 font-bold">TOTAL:</span>
          <span className="text-yellow-400 font-bold text-lg">${formData.isHourlyMode ? hourlyTotal : total}</span>
        </div>
      </div>
    </div>
  );
}
