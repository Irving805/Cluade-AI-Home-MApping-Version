/**
 * ReviewPropertyLogisticsSummary — Pure Renderer
 * 
 * Displays property logistics in StepReview for LIVE_HERE/MOVING flows.
 * Consumes HomeLayoutModel ONLY. Does NOT calculate anything.
 * 
 * ARCHITECTURE:
 *   HomeLayoutModel (from useHomeLayoutModel) → this component → display
 *   No calculations allowed. Pure render only.
 */

import { HomeLayoutModel } from '@/lib/layout/homeLayoutModel';
import { Language, t } from '@/lib/translations';
import { cn } from '@/lib/utils';
import {
  Home,
  Layers,
  MapPin,
  Building2,
  Bath,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChefHat,
  Sparkles,
  Users,
  Bed,
  DoorOpen,
  ArrowRight,
} from 'lucide-react';

interface Props {
  layoutModel: HomeLayoutModel;
  language: Language;
}

export function ReviewPropertyLogisticsSummary({ layoutModel, language }: Props) {
  const { accessPlan, floors, bathroomsByFloor, mappingCompleteness, operationalNotes, totalMinutes, profile, kitchenOperations, studioOperations, hallwayOperations, stairOperations } = layoutModel;

  // Property type label
  const propertyTypeLabel = accessPlan?.propertyType === 'apartment' 
    ? t(language, 'review.logistics.apartment') || 'Apartment / Condo'
    : t(language, 'review.logistics.house') || 'Single Family Home';

  // Access method label
  const getAccessLabel = () => {
    if (!accessPlan) return null;
    if (accessPlan.propertyType === 'apartment') {
      const floor = accessPlan.unitFloor ?? 1;
      const method = accessPlan.hasElevator 
        ? (t(language, 'review.logistics.elevator') || 'Elevator')
        : (t(language, 'review.logistics.walkup') || 'Walk-Up');
      return `Floor ${floor} • ${method}`;
    }
    if (accessPlan.levels > 1) {
      return `${accessPlan.levels} ${t(language, 'review.logistics.levels') || 'Levels'}`;
    }
    return t(language, 'review.logistics.single_level') || 'Single Level';
  };

  // Mapping status
  const getMappingStatus = () => {
    if (!mappingCompleteness) return null;
    const { bedroomsMapped, bedroomsExpected, bathroomsMapped, bathroomsExpected } = mappingCompleteness;
    const allMapped = bedroomsMapped >= bedroomsExpected && bathroomsMapped >= bathroomsExpected;
    return { allMapped, bedroomsMapped, bedroomsExpected, bathroomsMapped, bathroomsExpected };
  };

  const mappingStatus = getMappingStatus();

  return (
    <div className="space-y-4">
      {/* Property Overview Card */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" />
          {t(language, 'review.logistics.property_overview') || 'Property Overview'}
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Property Type */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {accessPlan?.propertyType === 'apartment' 
                ? <Building2 className="w-4 h-4 text-primary" />
                : <Home className="w-4 h-4 text-primary" />
              }
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t(language, 'review.logistics.type') || 'Type'}
              </p>
              <p className="text-sm font-semibold text-foreground">{propertyTypeLabel}</p>
            </div>
          </div>
          
          {/* Access */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t(language, 'review.logistics.access') || 'Access'}
              </p>
              <p className="text-sm font-semibold text-foreground">{getAccessLabel()}</p>
            </div>
          </div>
          
          {/* Size/Sqft */}
          {profile && (
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Home className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t(language, 'review.logistics.size') || 'Size'}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {profile.bedroomCount} {t(language, 'review.logistics.beds') || 'Beds'}
                </p>
              </div>
            </div>
          )}
          
          {/* Time Estimate */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t(language, 'review.logistics.time') || 'Est. Time'}
              </p>
              <p className="text-sm font-semibold text-foreground">
                ~{Math.round(totalMinutes / 60 * 10) / 10} hrs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============= KITCHEN OPERATIONS CARD (NEW) ============= */}
      {kitchenOperations && (
        <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/20 p-4">
          <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-3 flex items-center gap-2">
            <ChefHat className="w-3.5 h-3.5" />
            {t(language, 'review.kitchen.title') || 'Kitchen Operations'}
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Floor Type */}
            {kitchenOperations.floorType && (
              <div>
                <span className="text-xs text-muted-foreground">{t(language, 'kitchen.review.floor') || 'Floor'}:</span>
                <span className="ml-1 font-medium capitalize">{kitchenOperations.floorType.replace('_', ' ')}</span>
              </div>
            )}
            
            {/* Ceiling Height */}
            {kitchenOperations.ceilingHeight && (
              <div>
                <span className="text-xs text-muted-foreground">{t(language, 'kitchen.review.ceiling') || 'Ceiling'}:</span>
                <span className="ml-1 font-medium capitalize">{kitchenOperations.ceilingHeight}</span>
              </div>
            )}
            
            {/* Add-ons Selected */}
            {kitchenOperations.addons.length > 0 && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">{t(language, 'kitchen.review.addons') || 'Add-ons'}:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {kitchenOperations.addons.map((addon) => (
                    <span key={addon} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                      <Sparkles className="w-2.5 h-2.5" />
                      {addon}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Windows - with explicit breakdown */}
            {(kitchenOperations.windowsInterior > 0 || kitchenOperations.windowsExterior > 0) && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">{t(language, 'kitchen.review.windows') || 'Windows'}:</span>
                <span className="ml-1 font-medium">
                  Interior: {kitchenOperations.windowsInterior}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {kitchenOperations.windowsInterior >= 1 ? ' (1 included' : ''}
                    {kitchenOperations.windowsInterior > 1 ? ` + ${kitchenOperations.windowsInterior - 1} charged)` : kitchenOperations.windowsInterior >= 1 ? ')' : ''}
                  </span>
                  {kitchenOperations.windowsExterior > 0 && (
                    <span className="ml-1">
                      • Exterior: {kitchenOperations.windowsExterior}
                      <span className="text-amber-600 dark:text-amber-400"> (all charged)</span>
                    </span>
                  )}
                </span>
              </div>
            )}
            
            {/* Hazards */}
            {kitchenOperations.hazards.length > 0 && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">{t(language, 'kitchen.review.hazards') || 'Hazards'}:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {kitchenOperations.hazards.map((hazard) => (
                    <span key={hazard} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {hazard.replace('_', ' ')}
                    </span>
                  ))}
                  {kitchenOperations.hasStickySpills && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Sticky spills
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Trash Bags */}
            {kitchenOperations.trashBags > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Trash:</span>
                <span className="ml-1 font-medium">~{kitchenOperations.trashBags} bags</span>
              </div>
            )}
            
            {/* Pull-out Appliances Warning */}
            {kitchenOperations.pullOutAppliances && (
              <div className="col-span-2 mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    {t(language, 'kitchen.access.safety_warning') || '⚠️ 2-Person Team Required'}
                  </span>
                </div>
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                  Pull out fridge/oven to clean behind
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============= STUDIO OPERATIONS CARD (SSOT) ============= */}
      {studioOperations && (
        <div className="rounded-xl border border-purple-200/60 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/20 p-4">
          <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Bed className="w-3.5 h-3.5" />
            {t(language, 'review.studio.title') || 'Studio Operations'}
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Structure Type & Size */}
            <div>
              <span className="text-xs text-muted-foreground">{t(language, 'review.studio.type') || 'Type'}:</span>
              <span className="ml-1 font-medium capitalize">
                {studioOperations.structureType.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">{t(language, 'review.studio.size') || 'Size'}:</span>
              <span className="ml-1 font-medium">{studioOperations.studioSize.replace('_', '-')} sq ft</span>
            </div>
            
            {/* Sub-areas active */}
            {(() => {
              const activeAreas = [
                studioOperations.subAreas.sleeping && 'Sleeping',
                studioOperations.subAreas.lounge && 'Lounge',
                studioOperations.subAreas.deskWork && 'Desk',
                studioOperations.subAreas.closet && 'Closet',
                studioOperations.subAreas.entryNook && 'Entry',
                studioOperations.subAreas.balconyDoor && 'Balcony',
              ].filter(Boolean);
              
              return activeAreas.length > 0 && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">{t(language, 'review.studio.sub_areas') || 'Sub-Areas'}:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeAreas.map((area) => (
                      <span key={area} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
            
            {/* Windows breakdown - same format as Kitchen */}
            {(studioOperations.windowsInterior > 0 || studioOperations.windowsExterior > 0) && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">{t(language, 'review.studio.windows') || 'Windows'}:</span>
                <span className="ml-1 font-medium">
                  Interior: {studioOperations.windowsInterior}
                  {studioOperations.windowsExterior > 0 && (
                    <span className="ml-1">• Exterior: {studioOperations.windowsExterior}</span>
                  )}
                </span>
              </div>
            )}
            
            {/* Blinds */}
            {studioOperations.blindsCount > 0 && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">{t(language, 'review.studio.blinds') || 'Blinds'}:</span>
                <span className="ml-1 font-medium">
                  {studioOperations.blindsCount} {studioOperations.blindsType === 'shutters' ? 'Shutters' : 'Blinds'}
                </span>
              </div>
            )}
            
            {/* Hazards */}
            {(studioOperations.hazards.length > 0 || studioOperations.stickySpills || studioOperations.petHairRisk) && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">{t(language, 'review.studio.hazards') || 'Hazards'}:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {studioOperations.hazards.map((hazard) => (
                    <span key={hazard} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {hazard.replace('_', ' ')}
                    </span>
                  ))}
                  {studioOperations.stickySpills && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Sticky spills
                    </span>
                  )}
                  {studioOperations.petHairRisk && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Pet hair
                    </span>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Floor-by-Floor Summary */}
      {floors.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            {t(language, 'review.logistics.floor_summary') || 'Floor Summary'}
          </h4>
          
          <div className="space-y-2">
            {floors.map((floor) => (
              <div 
                key={floor.floorId} 
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{floor.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ({floor.areas.length} {floor.areas.length === 1 ? 'area' : 'areas'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">
                    {floor.minutesTotal} min
                  </span>
                  {/* Calculate ops minutes from areas */}
                  {floor.areas.reduce((sum, a) => sum + a.minutesOps, 0) > 0 && (
                    <span className="text-xs text-amber-600">
                      (+{floor.areas.reduce((sum, a) => sum + a.minutesOps, 0)})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bathrooms by Floor */}
      {bathroomsByFloor && bathroomsByFloor.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Bath className="w-3.5 h-3.5" />
            {t(language, 'review.logistics.bathrooms_by_floor') || 'Bathrooms by Floor'}
          </h4>
          
          <div className="space-y-3">
            {bathroomsByFloor.map((group) => (
              <div key={group.floorId} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{group.floorLabel}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.bathrooms.map((bath) => (
                    <span 
                      key={bath.id}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        bath.opsNotes && bath.opsNotes.length > 0 
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {bath.label}
                      {bath.opsNotes && bath.opsNotes.length > 0 && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hallway Logistics Card (SSOT) */}
      {hallwayOperations && hallwayOperations.hallways.length > 0 && (
        <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/20 p-4">
          <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-3 flex items-center gap-2">
            <DoorOpen className="w-3.5 h-3.5" />
            {t(language, 'review.hallways.title')}
          </h4>
          
          <div className="space-y-3">
            {hallwayOperations.hallways.map((hw) => {
              // RENDER-TIME formatting using translations (SSOT)
              const connectsLabels = hw.connectsTo.map(id => t(language, `hallway.connects.${id}`));
              const connectsRoute = connectsLabels.join(' → ');
              
              return (
                <div key={hw.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{hw.label}</span>
                      <span className="text-[10px] font-mono bg-muted px-1 rounded">{hw.trackingCode}</span>
                      <span className="text-xs text-muted-foreground">({hw.sizeTier})</span>
                    </div>
                    {hw.hallwayTotalFee > 0 && (
                      <span className="text-xs font-medium text-amber-600">
                        +${hw.hallwayTotalFee}
                      </span>
                    )}
                  </div>
                  
                  {/* Connection route — computed at render */}
                  {connectsRoute && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {t(language, 'hallway.connects')}: {connectsRoute}
                    </p>
                  )}
                  
                  {/* Floor + Type */}
                  <p className="text-xs text-muted-foreground">
                    F{hw.floorId.replace('FLOOR_', '')} • {hw.floorType || 'Hard Floor'} • {hw.sizeRange}
                  </p>
                  
                  {/* Cabinet Details — NEW SSOT breakdown */}
                  {hw.cabinetDoorCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t(language, 'hallway.cabinets.title') || 'Cabinet Doors'}: {hw.cabinetDoorCount} 
                      ({hw.cabinetsEmpty ? t(language, 'hallway.cabinets.empty') || 'Empty' : t(language, 'hallway.cabinets.not_empty') || 'Not Empty'})
                    </p>
                  )}
                  
                  {/* Cabinet Detail Fee */}
                  {hw.cabinetDetailFee > 0 && (
                    <p className="text-xs text-amber-600">
                      {t(language, 'hallway.fees.cabinet_detail') || 'Cabinet Detail'}: +${hw.cabinetDetailFee} 
                      ({hw.cabinetDoorCount} × ${hw.cabinetFeePerDoor})
                    </p>
                  )}
                  
                  {/* Organization */}
                  {hw.orgCost > 0 && (
                    <p className="text-xs text-primary">
                      {t(language, 'hallway.fees.organization') || 'Organization'}: +${hw.orgCost} 
                      ({hw.organizationHours}h × $35)
                    </p>
                  )}
                  
                  {/* Hazards */}
                  {hw.hazards.length > 0 && (
                    <p className="text-[10px] text-amber-600">⚠️ {hw.hazards.join(' • ')}</p>
                  )}
                </div>
              );
            })}
            
            {/* Total */}
            {hallwayOperations.totalFees > 0 && (
              <div className="pt-2 border-t border-amber-200/50 flex justify-between">
                <span className="text-xs font-medium">Hallway Total</span>
                <span className="text-xs font-bold text-amber-700">+${hallwayOperations.totalFees}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============= STAIR LOGISTICS CARD (SSOT) ============= */}
      {stairOperations && stairOperations.stairs.length > 0 && (
        <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/20 p-4">
          <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="text-base">🪜</span>
            {t(language, 'review.stairs.title') || 'Stair Logistics'} ({stairOperations.totalCount})
          </h4>
          
          <div className="space-y-3">
            {stairOperations.stairs.map((stair) => {
              const fromFloor = stair.fromFloor.replace('FLOOR_', 'F');
              const toFloor = stair.toFloor.replace('FLOOR_', 'F');
              
              return (
                <div key={stair.id} className="space-y-1 p-2 bg-card/50 rounded-lg border border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{stair.label}</span>
                      <span className="text-xs font-mono bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        {fromFloor} <ArrowRight className="w-3 h-3" /> {toFloor}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      ~{stair.totalMinutes} min
                    </span>
                  </div>
                  
                  {/* Surface + Steps */}
                  <p className="text-xs text-muted-foreground">
                    {stair.surfaceType === 'carpet' ? '🪨 Carpet' : 
                     stair.surfaceType === 'hardwood' ? '🪵 Hardwood' : '🔀 Runner'} 
                    {' • '}{stair.stepCount} steps
                  </p>
                  
                  {/* Hazards */}
                  {stair.hazardLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stair.hazardLabels.map((hazard) => (
                        <span 
                          key={hazard}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {hazard}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Total */}
            <div className="pt-2 border-t border-amber-200/50 flex justify-between">
              <span className="text-xs font-medium">Total Stair Time</span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                ~{stairOperations.totalMinutes} min
                {stairOperations.totalHazardMinutes > 0 && (
                  <span className="font-normal ml-1">
                    (+{stairOperations.totalHazardMinutes} hazards)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {mappingStatus && (
        <div className={cn(
          "rounded-xl border p-3 flex items-center gap-3",
          mappingStatus.allMapped 
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
        )}>
          {mappingStatus.allMapped ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              mappingStatus.allMapped 
                ? "text-emerald-800 dark:text-emerald-200"
                : "text-amber-800 dark:text-amber-200"
            )}>
              {mappingStatus.allMapped 
                ? (t(language, 'review.logistics.fully_mapped') || 'Property Fully Mapped')
                : (t(language, 'review.logistics.partial_mapped') || 'Partial Mapping')
              }
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(language, 'review.logistics.beds') || 'Beds'}: {mappingStatus.bedroomsMapped}/{mappingStatus.bedroomsExpected} • 
              {t(language, 'review.logistics.baths') || 'Baths'}: {mappingStatus.bathroomsMapped}/{mappingStatus.bathroomsExpected}
            </p>
          </div>
        </div>
      )}

      {/* Operational Notes */}
      {operationalNotes && operationalNotes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10 p-4">
          <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t(language, 'review.logistics.operational_notes') || 'Special Instructions'}
          </h4>
          
          <ul className="space-y-1">
            {operationalNotes.map((note, idx) => (
              <li 
                key={idx}
                className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2"
              >
                <span className="text-amber-500">•</span>
                <span>{note.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
