import { useMemo, useEffect } from 'react';
import { useBooking, PaintOverspray, DebrisHaulSize, KitchenSize } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { calculateRenovationQuote, ADDON_PRICES } from '@/lib/pricing_renovation';
import { 
  HardHat, Sparkles, ShieldCheck, Trash2, 
  Gem, Wind, Box, Sofa, AlertTriangle, 
  CheckCircle2, XCircle, ArrowLeft,
  Layers, Grid3X3, Square, Archive, Droplets,
  PaintBucket, Refrigerator, Waves, ArrowUpFromLine,
  Droplet, Truck, Hammer, Clock, Fan, Armchair, Bed,
  GlassWater, Maximize2, Home, Bath, ChefHat
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Counter } from '@/components/cleaning/Counter';

export function StepRenovation() {
  const { 
    language, 
    formData, 
    updateFormData, 
    setCurrentStep, 
    setSituation 
  } = useBooking();
  
  const renovationScope = formData.renovationScope;

  const updateReno = (updates: Partial<typeof renovationScope>) => {
    updateFormData({ 
      renovationScope: { ...renovationScope, ...updates }
    });
  };

  const quote = useMemo(() => calculateRenovationQuote(renovationScope), [renovationScope]);
  const isFinal = renovationScope.phase === 'final_punch_list';

  // Phase-locked logic: Reset irrelevant fields when phase changes
  useEffect(() => {
    if (!isFinal) {
      updateReno({ windowCount: 0, hvacFilters: false });
    }
  }, [isFinal]);

  // Handle back navigation
  const handleBack = () => {
    setSituation(null);
    setCurrentStep(1);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t(language, 'btn.back')}
      </button>

      {/* Header with Trust Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">
            {t(language, 'reno.title')}
          </h2>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{t(language, 'reno.osha_badge')}</span>
          </div>
        </div>
        {/* Trust Badges */}
        <div className="flex gap-2">
          <Badge text={t(language, 'commercial.licensed')} />
          <Badge text={t(language, 'commercial.bonded')} />
          <Badge text={t(language, 'commercial.insured')} />
        </div>
      </div>

      {/* 1. PHASE SELECTOR */}
      <div className="bg-card p-1.5 rounded-2xl border border-border shadow-sm flex relative z-10">
        <button
          type="button"
          onClick={() => updateReno({ phase: 'rough_safety' })}
          className={cn(
            "flex-1 py-4 px-3 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all",
            !isFinal 
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 shadow-inner ring-1 ring-amber-200 dark:ring-amber-800" 
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5" />
            <span>{t(language, 'reno.phase_rough')}</span>
          </div>
          <span className="text-[10px] font-normal opacity-70">
            {t(language, 'reno.phase_rough_sub')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => updateReno({ phase: 'final_punch_list' })}
          className={cn(
            "flex-1 py-4 px-3 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all",
            isFinal 
              ? "bg-blue-600 text-white shadow-lg ring-1 ring-blue-700" 
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span>{t(language, 'reno.phase_final')}</span>
          </div>
          <span className="text-[10px] font-normal opacity-70">
            {t(language, 'reno.phase_final_sub')}
          </span>
        </button>
      </div>

      {/* Context Alert */}
      <div className={cn(
        "p-4 rounded-xl border-l-4 text-xs leading-relaxed flex gap-3",
        isFinal 
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-900 dark:text-blue-100" 
          : "bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-900 dark:text-amber-100"
      )}>
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold block mb-1 uppercase tracking-wider">
            {isFinal ? t(language, 'reno.scope_final_title') : t(language, 'reno.scope_rough_title')}
          </span>
          {isFinal 
            ? t(language, 'reno.scope_final')
            : t(language, 'reno.scope_rough')}
        </div>
      </div>

      {/* 2. CONSTRUCTION STATUS (Gatekeeper) */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <label className="text-xs font-bold uppercase text-muted-foreground mb-4 block">
          {t(language, 'reno.construction_status')}
        </label>
        <div className="flex gap-4">
          <button 
            type="button"
            onClick={() => updateReno({ contractorsFinished: true })}
            className={cn(
              "flex-1 p-3 border rounded-xl flex items-center gap-3 transition-all",
              renovationScope.contractorsFinished 
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                : "border-border opacity-60 hover:opacity-80"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center border",
              renovationScope.contractorsFinished 
                ? "bg-emerald-500 border-emerald-500" 
                : "border-muted-foreground"
            )}>
              {renovationScope.contractorsFinished && <CheckCircle2 className="w-3 h-3 text-white"/>}
            </div>
            <span className="text-sm font-bold text-foreground">{t(language, 'reno.contractors_done')}</span>
          </button>
          <button 
            type="button"
            onClick={() => updateReno({ contractorsFinished: false })}
            className={cn(
              "flex-1 p-3 border rounded-xl flex items-center gap-3 transition-all",
              !renovationScope.contractorsFinished 
                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" 
                : "border-border opacity-60 hover:opacity-80"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center border",
              !renovationScope.contractorsFinished 
                ? "bg-amber-500 border-amber-500" 
                : "border-muted-foreground"
            )}>
              {!renovationScope.contractorsFinished && <XCircle className="w-3 h-3 text-white"/>}
            </div>
            <span className="text-sm font-bold text-foreground">{t(language, 'reno.contractors_active')}</span>
          </button>
        </div>
        {!renovationScope.contractorsFinished && (
          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-2 font-medium">
            * {t(language, 'reno.warning_trades')}
          </p>
        )}
      </div>

      {/* 3. PROJECT SPECS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Square Footage */}
        <div className="bg-card p-5 rounded-2xl border border-border">
          <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
            {t(language, 'reno.sqft_label')}
          </label>
          <div className="relative">
            <input 
              type="number" 
              value={renovationScope.sqft || ''}
              onChange={e => updateReno({ sqft: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="w-full text-3xl font-black p-2 border-b-2 border-border focus:border-primary outline-none font-mono bg-transparent text-foreground"
            />
            <span className="absolute right-0 bottom-4 text-xs font-bold text-muted-foreground">SQ FT</span>
          </div>
        </div>

        {/* Delicate Materials Toggle */}
        <button
          type="button"
          onClick={() => updateReno({ 
            surfaceRisk: renovationScope.surfaceRisk === 'standard_materials' 
              ? 'delicate_stone_wood' 
              : 'standard_materials' 
          })}
          className={cn(
            "bg-card p-5 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden text-left",
            renovationScope.surfaceRisk === 'delicate_stone_wood' 
              ? "border-amber-500 ring-1 ring-amber-500" 
              : "border-border hover:border-muted-foreground"
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <Gem className={cn(
              "w-5 h-5",
              renovationScope.surfaceRisk === 'delicate_stone_wood' 
                ? "text-amber-600 dark:text-amber-400" 
                : "text-muted-foreground"
            )}/>
            {renovationScope.surfaceRisk === 'delicate_stone_wood' && (
              <span className="text-[9px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-bold uppercase">
                Premium Care
              </span>
            )}
          </div>
          <div className="font-bold text-sm text-foreground">{t(language, 'reno.delicate_materials')}</div>
          <p className="text-xs text-muted-foreground mt-1">{t(language, 'reno.delicate_desc')}</p>
        </button>
      </div>

      {/* ========== PROPERTY COMPOSITION (Work Density) ========== */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Home className="w-5 h-5 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t(language, 'reno.composition_title')}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground -mt-2 mb-4">
          {t(language, 'reno.composition_info')}
        </p>
        
        {/* Bedrooms Counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bed className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t(language, 'reno.bedrooms')}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateReno({ bedrooms: Math.max(0, renovationScope.bedrooms - 1) })}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 font-bold"
            >−</button>
            <span className="text-lg font-bold font-mono w-6 text-center">{renovationScope.bedrooms}</span>
            <button
              type="button"
              onClick={() => updateReno({ bedrooms: Math.min(8, renovationScope.bedrooms + 1) })}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold"
            >+</button>
          </div>
        </div>

        {/* Bathrooms Grid */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Bath className="w-4 h-4" />
            {t(language, 'reno.bathrooms')}
          </span>
          <div className="grid grid-cols-3 gap-2">
            <BathroomCounter 
              label={t(language, 'reno.bath_master')}
              value={renovationScope.bathrooms.master} 
              max={4}
              onChange={(v) => updateReno({ bathrooms: { ...renovationScope.bathrooms, master: v } })}
            />
            <BathroomCounter 
              label={t(language, 'reno.bath_full')}
              value={renovationScope.bathrooms.full} 
              max={6}
              onChange={(v) => updateReno({ bathrooms: { ...renovationScope.bathrooms, full: v } })}
            />
            <BathroomCounter 
              label={t(language, 'reno.bath_half')}
              value={renovationScope.bathrooms.half} 
              max={4}
              onChange={(v) => updateReno({ bathrooms: { ...renovationScope.bathrooms, half: v } })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">
            * {t(language, 'reno.bath_scope_note')}
          </p>
        </div>

        {/* New Kitchen Toggle + Size */}
        <div className="space-y-3">
          <ScopeCheckbox
            icon={ChefHat}
            label={t(language, 'reno.new_kitchen')}
            checked={renovationScope.hasNewKitchen}
            onChange={() => updateReno({ hasNewKitchen: !renovationScope.hasNewKitchen })}
          />
          {renovationScope.hasNewKitchen && (
            <div className="flex gap-2 flex-wrap ml-6">
              {(['galley', 'standard', 'open_concept', 'chef'] as KitchenSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateReno({ kitchenSize: size })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    renovationScope.kitchenSize === size
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {t(language, `reno.kitchen_${size}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. DEBRIS & OCCUPANCY MATRIX */}
      <div className="space-y-4">
        {/* Occupancy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OptionBtn 
            icon={Box} 
            label={t(language, 'reno.vacant')} 
            active={renovationScope.occupancy === 'vacant_empty'}
            onClick={() => updateReno({ occupancy: 'vacant_empty' })}
          />
          <OptionBtn 
            icon={Sofa} 
            label={t(language, 'reno.furnished')} 
            sub={t(language, 'reno.furnished_desc')}
            active={renovationScope.occupancy === 'furnished_lived_in'}
            onClick={() => updateReno({ occupancy: 'furnished_lived_in' })}
          />
        </div>
        
        {/* Debris Level */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <label className="text-xs font-bold uppercase text-muted-foreground mb-3 block">
            {t(language, 'reno.debris_label')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            <LevelBtn 
              label={t(language, 'reno.debris_dust')} 
              active={renovationScope.debrisLevel === 'broom_swept'} 
              onClick={() => updateReno({ debrisLevel: 'broom_swept' })} 
            />
            <LevelBtn 
              label={t(language, 'reno.debris_scattered')} 
              active={renovationScope.debrisLevel === 'standard_debris'} 
              onClick={() => updateReno({ debrisLevel: 'standard_debris' })} 
            />
            <LevelBtn 
              label={t(language, 'reno.debris_heavy')} 
              active={renovationScope.debrisLevel === 'heavy_haul'} 
              onClick={() => updateReno({ debrisLevel: 'heavy_haul' })} 
              warning 
            />
          </div>
        </div>
      </div>

      {/* ========== SCOPE DEFINITION CHECKPOINT ========== */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-2xl border border-primary/20">
        <h4 className="font-bold text-sm mb-1 flex items-center gap-2 text-foreground">
          <Layers className="w-4 h-4 text-primary" />
          {t(language, 'reno.scope_title')}
        </h4>
        <p className="text-xs text-muted-foreground mb-4">{t(language, 'reno.scope_hint')}</p>
        
        <div className="grid grid-cols-2 gap-3">
          <ScopeCheckbox 
            icon={Grid3X3} 
            label={t(language, 'reno.scope_tiling')}
            checked={renovationScope.hasNewTiling}
            onChange={() => updateReno({ hasNewTiling: !renovationScope.hasNewTiling })}
          />
          <ScopeCheckbox 
            icon={Waves} 
            label={t(language, 'reno.scope_carpets')}
            checked={renovationScope.hasNewCarpets}
            onChange={() => updateReno({ hasNewCarpets: !renovationScope.hasNewCarpets })}
          />
          <ScopeCheckbox 
            icon={Square} 
            label={t(language, 'reno.scope_windows')}
            checked={renovationScope.hasNewWindows}
            onChange={() => updateReno({ hasNewWindows: !renovationScope.hasNewWindows })}
          />
          <ScopeCheckbox 
            icon={Archive} 
            label={t(language, 'reno.scope_cabinetry')}
            checked={renovationScope.hasNewCabinetry}
            onChange={() => updateReno({ hasNewCabinetry: !renovationScope.hasNewCabinetry })}
          />
        </div>
      </div>

      {/* ========== CATEGORY 1: SURFACE RESTORATION ========== */}
      {(renovationScope.hasNewTiling || renovationScope.surfaceRisk === 'delicate_stone_wood' || renovationScope.paintOverspray !== 'none' || renovationScope.floorPolishing) && (
        <div className="space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
            <Droplets className="w-4 h-4 text-blue-600" />
            {t(language, 'reno.cat1_title')}
          </h4>
          
          {/* Grout Haze Removal */}
          {(renovationScope.hasNewTiling || renovationScope.surfaceRisk === 'delicate_stone_wood') && (
            <AddonCard
              icon={Droplets}
              title={t(language, 'reno.addon_grout_title')}
              description={t(language, 'reno.addon_grout_desc')}
              price={`$${ADDON_PRICES.grout_haze_per_sqft}/sqft`}
              badge={t(language, 'reno.badge_acid_wash')}
              badgeColor="blue"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t(language, 'reno.tile_area_label')}</span>
                  <span className="font-mono font-bold">{renovationScope.groutHazeSqft} sqft</span>
                </div>
                <Slider
                  value={[renovationScope.groutHazeSqft]}
                  onValueChange={(v) => updateReno({ groutHazeSqft: v[0] })}
                  max={renovationScope.sqft || 500}
                  step={50}
                  className="w-full"
                />
                {renovationScope.groutHazeSqft > 0 && (
                  <div className="text-xs text-primary font-medium text-right">
                    +${Math.round(renovationScope.groutHazeSqft * ADDON_PRICES.grout_haze_per_sqft)}
                  </div>
                )}
              </div>
            </AddonCard>
          )}
          
          {/* Paint Overspray */}
          <AddonCard
            icon={PaintBucket}
            title={t(language, 'reno.addon_paint_title')}
            description={t(language, 'reno.addon_paint_desc')}
          >
            <div className="flex gap-2 flex-wrap">
              {(['none', 'light', 'moderate', 'heavy'] as PaintOverspray[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => updateReno({ paintOverspray: level })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    renovationScope.paintOverspray === level
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {t(language, `reno.paint_${level}`)}
                </button>
              ))}
            </div>
          </AddonCard>
          
          {/* Floor Polishing */}
          <ToggleAddonCard
            icon={Sparkles}
            title={t(language, 'reno.addon_floor_title')}
            description={t(language, 'reno.addon_floor_desc')}
            price={`$${ADDON_PRICES.floor_polishing_per_sqft}/sqft`}
            checked={renovationScope.floorPolishing}
            onChange={() => updateReno({ floorPolishing: !renovationScope.floorPolishing })}
            total={renovationScope.floorPolishing && renovationScope.sqft > 0 
              ? Math.round(renovationScope.sqft * ADDON_PRICES.floor_polishing_per_sqft) 
              : undefined}
          />
        </div>
      )}

      {/* ========== CATEGORY 2: HIDDEN DUST LOGISTICS ========== */}
      {(renovationScope.hasNewCabinetry || renovationScope.hasNewCarpets || renovationScope.applianceCount > 0 || renovationScope.insideCabinetry || renovationScope.carpetExtraction) && (
        <div className="space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
            <Wind className="w-4 h-4 text-amber-600" />
            {t(language, 'reno.cat2_title')}
          </h4>
          
          {/* Inside Cabinetry */}
          {renovationScope.hasNewCabinetry && (
            <ToggleAddonCard
              icon={Archive}
              title={t(language, 'reno.addon_cabinetry_title')}
              description={t(language, 'reno.addon_cabinetry_desc')}
              price={`$${ADDON_PRICES.inside_cabinetry}`}
              checked={renovationScope.insideCabinetry}
              onChange={() => updateReno({ insideCabinetry: !renovationScope.insideCabinetry })}
            />
          )}
          
          {/* Appliance Detailing */}
          <AddonCard
            icon={Refrigerator}
            title={t(language, 'reno.addon_appliance_title')}
            description={t(language, 'reno.addon_appliance_desc')}
            price={`$${ADDON_PRICES.appliance_detail_each}/each`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateReno({ applianceCount: Math.max(0, renovationScope.applianceCount - 1) })}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 font-bold"
              >
                −
              </button>
              <span className="text-lg font-bold font-mono w-8 text-center">{renovationScope.applianceCount}</span>
              <button
                type="button"
                onClick={() => updateReno({ applianceCount: Math.min(10, renovationScope.applianceCount + 1) })}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold"
              >
                +
              </button>
              {renovationScope.applianceCount > 0 && (
                <span className="text-xs text-primary font-medium ml-auto">
                  +${renovationScope.applianceCount * ADDON_PRICES.appliance_detail_each}
                </span>
              )}
            </div>
          </AddonCard>
          
          {/* Carpet Extraction with SQFT slider */}
          {renovationScope.hasNewCarpets && (
            <AddonCard
              icon={Waves}
              title={t(language, 'reno.addon_carpet_title')}
              description={t(language, 'reno.addon_carpet_desc')}
              price={`$${ADDON_PRICES.carpet_extraction_per_sqft}/sqft`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Carpet Area</span>
                  <span className="font-mono font-bold">{renovationScope.carpetExtractionSqft} sqft</span>
                </div>
                <Slider
                  value={[renovationScope.carpetExtractionSqft]}
                  onValueChange={(v) => updateReno({ carpetExtractionSqft: v[0], carpetExtraction: v[0] > 0 })}
                  max={renovationScope.sqft || 500}
                  step={50}
                  className="w-full"
                />
                {renovationScope.carpetExtractionSqft > 0 && (
                  <div className="text-xs text-primary font-medium text-right">
                    +${Math.round(renovationScope.carpetExtractionSqft * ADDON_PRICES.carpet_extraction_per_sqft)}
                  </div>
                )}
              </div>
            </AddonCard>
          )}
        </div>
      )}

      {/* ========== CATEGORY 3: HEIGHT & SAFETY ========== */}
      <div className="space-y-4">
        <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
          <ArrowUpFromLine className="w-4 h-4 text-red-600" />
          {t(language, 'reno.cat3_title')}
        </h4>
        
        <ToggleAddonCard
          icon={ArrowUpFromLine}
          title={t(language, 'reno.addon_height_title')}
          description={t(language, 'reno.addon_height_desc')}
          price={`$${ADDON_PRICES.high_ceiling_surcharge}`}
          checked={renovationScope.highCeilings}
          onChange={() => updateReno({ highCeilings: !renovationScope.highCeilings })}
          badge={t(language, 'reno.badge_safety')}
          badgeColor="red"
        />
      </div>

      {/* ========== CATEGORY 4: EXTERIOR & WASTE ========== */}
      <div className="space-y-4">
        <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
          <Truck className="w-4 h-4 text-slate-600" />
          {t(language, 'reno.cat4_title')}
        </h4>
        
        {/* Pressure Washing */}
        <ToggleAddonCard
          icon={Droplet}
          title={t(language, 'reno.addon_pressure_title')}
          description={t(language, 'reno.addon_pressure_desc')}
          price={`$${ADDON_PRICES.pressure_washing}`}
          checked={renovationScope.pressureWashing}
          onChange={() => updateReno({ pressureWashing: !renovationScope.pressureWashing })}
        />
        
        {/* Debris Haul-Away */}
        <AddonCard
          icon={Truck}
          title={t(language, 'reno.addon_debris_title')}
          description={t(language, 'reno.addon_debris_desc')}
        >
          <div className="flex gap-2 flex-wrap">
            {(['none', 'small', 'truck'] as DebrisHaulSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updateReno({ debrisHaulSize: size })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  renovationScope.debrisHaulSize === size
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t(language, `reno.haul_${size}`)}
              </button>
            ))}
          </div>
        </AddonCard>
      </div>

      {/* ========== NEW GROUP 1: SPARKLE CLEAN (Dust Settling) ========== */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 rounded-2xl border border-amber-200 dark:border-amber-800">
        <h4 className="font-bold text-sm flex items-center gap-2 text-amber-900 dark:text-amber-100 mb-3">
          <Clock className="w-4 h-4" />
          Dust Settlement Management
        </h4>
        <ToggleAddonCard
          icon={Sparkles}
          title="Sparkle Clean (Return Visit)"
          description="24-48hr follow-up to wipe resettled dust before final walkthrough"
          price={`25% of clean (min $${ADDON_PRICES.sparkle_clean_minimum})`}
          checked={renovationScope.sparkleClean}
          onChange={() => updateReno({ sparkleClean: !renovationScope.sparkleClean })}
          badge="Dust Protection"
          badgeColor="amber"
        />
      </div>

      {/* ========== NEW GROUP 2: ADVANCED AIR QUALITY ========== */}
      <div className="space-y-4">
        <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
          <Fan className="w-4 h-4 text-cyan-600" />
          Ventilation & Air Quality
        </h4>
        
        {/* Vent Cover Detailing */}
        <AddonCard
          icon={Fan}
          title="HVAC Vent Cover Detailing"
          description="Remove, wash, and polish vent grates/registers"
          price={`$${ADDON_PRICES.vent_cover_detail}/vent`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateReno({ ventCoverCount: Math.max(0, renovationScope.ventCoverCount - 1) })}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 font-bold"
            >−</button>
            <span className="text-lg font-bold font-mono w-8 text-center">{renovationScope.ventCoverCount}</span>
            <button
              type="button"
              onClick={() => updateReno({ ventCoverCount: Math.min(30, renovationScope.ventCoverCount + 1) })}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold"
            >+</button>
            {renovationScope.ventCoverCount > 0 && (
              <span className="text-xs text-primary font-medium ml-auto">
                +${renovationScope.ventCoverCount * ADDON_PRICES.vent_cover_detail}
              </span>
            )}
          </div>
        </AddonCard>
        
        {/* Duct Cleaning Coordination */}
        <ToggleAddonCard
          icon={Wind}
          title="Full Duct Cleaning Coordination"
          description="Professional ductwork suction cleaning (managed service)"
          price={`$${ADDON_PRICES.duct_cleaning_coordination}`}
          checked={renovationScope.ductCleaningCoordination}
          onChange={() => updateReno({ ductCleaningCoordination: !renovationScope.ductCleaningCoordination })}
          badge="Specialist"
          badgeColor="blue"
        />
      </div>

      {/* ========== NEW GROUP 3: UPHOLSTERY (Furnished Only) ========== */}
      {renovationScope.occupancy === 'furnished_lived_in' && (
        <div className="space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
            <Sofa className="w-4 h-4 text-purple-600" />
            Furniture Restoration
          </h4>
          <p className="text-xs text-muted-foreground -mt-2">Construction dust embeds into fabric - HEPA extraction recommended</p>
          
          <div className="grid grid-cols-2 gap-3">
            <CounterCard icon={Sofa} label="Sofas/Sectionals" price={ADDON_PRICES.upholstery_sofa}
              value={renovationScope.upholsteryItems.sofas} max={5}
              onChange={(v) => updateReno({ upholsteryItems: { ...renovationScope.upholsteryItems, sofas: v } })}
            />
            <CounterCard icon={Armchair} label="Armchairs" price={ADDON_PRICES.upholstery_armchair}
              value={renovationScope.upholsteryItems.armchairs} max={8}
              onChange={(v) => updateReno({ upholsteryItems: { ...renovationScope.upholsteryItems, armchairs: v } })}
            />
            <CounterCard icon={Box} label="Dining Chairs" price={ADDON_PRICES.upholstery_dining_chair}
              value={renovationScope.upholsteryItems.diningChairs} max={12}
              onChange={(v) => updateReno({ upholsteryItems: { ...renovationScope.upholsteryItems, diningChairs: v } })}
            />
            <CounterCard icon={Bed} label="Mattresses" price={ADDON_PRICES.upholstery_mattress}
              value={renovationScope.upholsteryItems.mattresses} max={6}
              onChange={(v) => updateReno({ upholsteryItems: { ...renovationScope.upholsteryItems, mattresses: v } })}
            />
          </div>
        </div>
      )}

      {/* ========== NEW GROUP 4: EXTERIOR GLASS (Window Types) ========== */}
      <div className="space-y-4">
        <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
          <GlassWater className="w-4 h-4 text-sky-600" />
          Exterior Glass & Facade
        </h4>
        <p className="text-xs text-muted-foreground -mt-2">Separate from interior - exterior windows require specialized scrapers</p>
        
        <div className="grid grid-cols-2 gap-3">
          <CounterCard icon={Square} label="Standard Panes" price={ADDON_PRICES.exterior_standard_pane}
            value={renovationScope.exteriorWindows.standardPanes} max={30}
            onChange={(v) => updateReno({ exteriorWindows: { ...renovationScope.exteriorWindows, standardPanes: v } })}
          />
          <CounterCard icon={Maximize2} label="Picture Windows" price={ADDON_PRICES.exterior_picture_window}
            value={renovationScope.exteriorWindows.pictureWindows} max={10}
            onChange={(v) => updateReno({ exteriorWindows: { ...renovationScope.exteriorWindows, pictureWindows: v } })}
          />
          <CounterCard icon={Layers} label="Sliding Doors" price={ADDON_PRICES.exterior_sliding_door}
            value={renovationScope.exteriorWindows.slidingDoors} max={6}
            onChange={(v) => updateReno({ exteriorWindows: { ...renovationScope.exteriorWindows, slidingDoors: v } })}
          />
          <CounterCard icon={ArrowUpFromLine} label="Skylights" price={ADDON_PRICES.exterior_skylight}
            value={renovationScope.exteriorWindows.skylights} max={6} badge="Ladder"
            onChange={(v) => updateReno({ exteriorWindows: { ...renovationScope.exteriorWindows, skylights: v } })}
          />
        </div>
        
        {/* Paint Splatter Toggle */}
        {(renovationScope.exteriorWindows.standardPanes + renovationScope.exteriorWindows.pictureWindows + renovationScope.exteriorWindows.slidingDoors + renovationScope.exteriorWindows.skylights) > 0 && (
          <ToggleAddonCard
            icon={PaintBucket}
            title="Paint Splatter on Exterior Glass?"
            description="Adds scraping protocol for overspray removal"
            price={`+$${ADDON_PRICES.exterior_paint_splatter_surcharge}/pane`}
            checked={renovationScope.hasExteriorPaintSplatter}
            onChange={() => updateReno({ hasExteriorPaintSplatter: !renovationScope.hasExteriorPaintSplatter })}
            badge="Extra Labor"
            badgeColor="amber"
          />
        )}
      </div>

      {/* 5. LEGACY LOGISTICS (Phase-Locked) */}
      <div className="bg-muted/30 p-6 rounded-2xl border border-border/60">
        <h4 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4"/> {t(language, 'reno.logistics_title')}
        </h4>

        <div className="space-y-4">
          {/* SHOW IF FINAL CLEAN */}
          {isFinal && (
            <>
              <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border shadow-sm">
                <div>
                  <div className="text-sm font-bold text-foreground">{t(language, 'reno.window_stickers')}</div>
                  <div className="text-[10px] text-muted-foreground">{t(language, 'reno.window_stickers_desc')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    className="w-16 p-2 border border-border rounded-lg text-center font-bold text-foreground outline-none focus:border-primary bg-background" 
                    placeholder="0"
                    value={renovationScope.windowCount || ''}
                    onChange={e => updateReno({ windowCount: parseInt(e.target.value) || 0 })}
                  />
                  <span className="text-xs font-bold text-muted-foreground">Count</span>
                </div>
              </div>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    renovationScope.hvacFilters 
                      ? "bg-blue-600 border-blue-600" 
                      : "bg-background border-border"
                  )}>
                    {renovationScope.hvacFilters && <CheckCircle2 className="w-3.5 h-3.5 text-white"/>}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {t(language, 'reno.hvac_filters')}
                    </div>
                    <div className="text-xs text-muted-foreground">{t(language, 'reno.hvac_desc')}</div>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={renovationScope.hvacFilters} 
                  onChange={() => updateReno({ hvacFilters: !renovationScope.hvacFilters })}
                />
              </label>
            </>
          )}

          {/* SHOW IF ROUGH CLEAN OR HEAVY DEBRIS */}
          {(!isFinal || renovationScope.debrisLevel === 'heavy_haul') && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-1"/>
              <div className="flex-1">
                <div className="text-sm font-bold text-amber-900 dark:text-amber-100">{t(language, 'reno.dumpster_title')}</div>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mb-3">{t(language, 'reno.dumpster_desc')}</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="dumpster" 
                      className="accent-amber-600" 
                      checked={renovationScope.dumpsterOnSite} 
                      onChange={() => updateReno({ dumpsterOnSite: true })} 
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-100">{t(language, 'reno.dumpster_yes')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="dumpster" 
                      className="accent-amber-600" 
                      checked={!renovationScope.dumpsterOnSite} 
                      onChange={() => updateReno({ dumpsterOnSite: false })} 
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-100">{t(language, 'reno.dumpster_no')}</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== SUB-COMPONENTS =====
const Badge = ({ text }: { text: string }) => (
  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
    {text}
  </span>
);

interface OptionBtnProps {
  icon: React.ElementType;
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
}

const OptionBtn = ({ icon: Icon, label, sub, active, onClick }: OptionBtnProps) => (
  <button 
    type="button"
    onClick={onClick}
    className={cn(
      "p-4 rounded-xl border transition-all text-left flex items-start gap-3",
      active 
        ? "border-primary bg-primary/5 ring-1 ring-primary" 
        : "border-border bg-card hover:border-muted-foreground"
    )}
  >
    <div className={cn(
      "p-2 rounded-lg",
      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    )}>
      <Icon className="w-5 h-5"/>
    </div>
    <div>
      <div className="font-bold text-sm text-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  </button>
);

interface LevelBtnProps {
  label: string;
  active: boolean;
  warning?: boolean;
  onClick: () => void;
}

const LevelBtn = ({ label, active, warning, onClick }: LevelBtnProps) => (
  <button 
    type="button"
    onClick={onClick}
    className={cn(
      "py-2 px-3 rounded-lg text-xs font-bold transition-all",
      active 
        ? warning 
          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-1 ring-red-300" 
          : "bg-primary/10 text-primary ring-1 ring-primary/50"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    )}
  >
    {label}
  </button>
);

interface ScopeCheckboxProps {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: () => void;
}

const ScopeCheckbox = ({ icon: Icon, label, checked, onChange }: ScopeCheckboxProps) => (
  <button
    type="button"
    onClick={onChange}
    className={cn(
      "p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-left",
      checked 
        ? "border-primary bg-primary/5" 
        : "border-border hover:border-muted-foreground"
    )}
  >
    <div className={cn(
      "w-5 h-5 rounded flex items-center justify-center border transition-colors",
      checked 
        ? "bg-primary border-primary" 
        : "bg-background border-border"
    )}>
      {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
    </div>
    <Icon className={cn(
      "w-4 h-4",
      checked ? "text-primary" : "text-muted-foreground"
    )} />
    <span className={cn(
      "text-sm font-medium",
      checked ? "text-foreground" : "text-muted-foreground"
    )}>{label}</span>
  </button>
);

interface AddonCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  price?: string;
  badge?: string;
  badgeColor?: 'blue' | 'amber' | 'red' | 'emerald';
  children?: React.ReactNode;
}

const AddonCard = ({ icon: Icon, title, description, price, badge, badgeColor = 'blue', children }: AddonCardProps) => {
  const badgeClasses = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  
  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">{title}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {price && <span className="text-xs font-mono text-primary">{price}</span>}
          {badge && (
            <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase", badgeClasses[badgeColor])}>
              {badge}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

interface ToggleAddonCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  price: string;
  checked: boolean;
  onChange: () => void;
  badge?: string;
  badgeColor?: 'blue' | 'amber' | 'red' | 'emerald';
  total?: number;
}

const ToggleAddonCard = ({ icon: Icon, title, description, price, checked, onChange, badge, badgeColor = 'blue', total }: ToggleAddonCardProps) => {
  const badgeClasses = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "w-full bg-card p-4 rounded-xl border-2 shadow-sm transition-all text-left",
        checked 
          ? "border-primary ring-1 ring-primary/30" 
          : "border-border hover:border-muted-foreground"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">{title}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={cn(
            "w-5 h-5 rounded flex items-center justify-center border transition-colors",
            checked 
              ? "bg-primary border-primary" 
              : "bg-background border-border"
          )}>
            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </div>
          <span className="text-xs font-mono text-primary">{price}</span>
          {badge && (
            <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase", badgeClasses[badgeColor])}>
              {badge}
            </span>
          )}
          {total !== undefined && (
            <span className="text-xs font-bold text-primary">+${total}</span>
          )}
        </div>
      </div>
    </button>
  );
};

// Counter Card Component for compact counters (general use)
interface CounterCardProps {
  icon: React.ElementType;
  label: string;
  price: number;
  value: number;
  max: number;
  badge?: string;
  onChange: (value: number) => void;
}

const CounterCard = ({ icon: Icon, label, price, value, max, badge, onChange }: CounterCardProps) => (
  <div className="bg-card p-3 rounded-xl border border-border">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs font-medium text-foreground">{label}</span>
      {badge && (
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">{badge}</span>
      )}
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">−</button>
        <span className="font-mono font-bold w-6 text-center">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
          className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">+</button>
      </div>
      <span className="text-[10px] text-muted-foreground">${price}/ea</span>
    </div>
    {value > 0 && (
      <div className="text-xs text-primary font-medium text-right mt-1">+${value * price}</div>
    )}
  </div>
);

// Bathroom Counter - Optimized for 3-col mobile layout (informational, no pricing)
interface BathroomCounterProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

const BathroomCounter = ({ label, value, max, onChange }: BathroomCounterProps) => (
  <div className="bg-card p-2 rounded-xl border border-border flex flex-col items-center text-center">
    <span className="text-[11px] font-semibold text-foreground mb-1.5 truncate w-full">{label}</span>
    <div className="flex items-center justify-center gap-1">
      <button 
        type="button" 
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground active:scale-95 transition-transform"
      >−</button>
      <span className="font-mono font-bold w-4 text-center text-sm">{value}</span>
      <button 
        type="button" 
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold active:scale-95 transition-transform"
      >+</button>
    </div>
  </div>
);
