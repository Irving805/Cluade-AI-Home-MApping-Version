import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Calendar, Phone, Mail, MapPin, User, FileText, 
  Clock, Building2, Key, DoorOpen, AlertCircle 
} from 'lucide-react';

export function StepDetails() {
  const { language, formData, updateFormData, situation } = useBooking();
  const isMoving = situation === 'MOVING';

  const inputClasses = cn(
    "h-12 bg-card border-2 border-border rounded-xl px-4",
    "focus:border-primary focus:ring-4 focus:ring-primary/10",
    "placeholder:text-muted-foreground/60",
    "transition-all duration-200"
  );

  // Handle timeline intent change - clear walkthrough date if switching to planning
  const handleTimelineChange = (value: 'urgent' | 'planning') => {
    updateFormData({ 
      movingTimelineIntent: value,
      // Clear walkthrough date when switching to planning
      ...(value === 'planning' ? { walkthroughDate: '' } : {})
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Section Header */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-foreground">
          {isMoving ? t(language, 'step3.title_moving') : t(language, 'step3.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isMoving ? t(language, 'step3.subtitle_moving') : t(language, 'step3.subtitle')}
        </p>
      </div>

      {/* CARD 1: Contact Information - ALL FLOWS */}
      <Card className="border-2 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {t(language, 'details.contact_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* First / Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="text"
              placeholder={t(language, 'ph.firstname')}
              value={formData.firstName}
              onChange={(e) => updateFormData({ firstName: e.target.value })}
              required
              autoComplete="given-name"
              className={inputClasses}
            />
            <Input
              type="text"
              placeholder={t(language, 'ph.lastname')}
              value={formData.lastName}
              onChange={(e) => updateFormData({ lastName: e.target.value })}
              required
              autoComplete="family-name"
              className={inputClasses}
            />
          </div>

          {/* Date & Phone */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                {t(language, 'label.date')}
              </Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => updateFormData({ date: e.target.value })}
                className={cn(inputClasses, 'touch-manipulation')}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                <Phone className="w-4 h-4 text-primary" />
                {t(language, 'label.phone')}
              </Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
                required
                autoComplete="tel"
                className={cn(inputClasses, 'touch-manipulation')}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
              <Mail className="w-4 h-4 text-primary" />
              {t(language, 'label.email')}
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              required
              autoComplete="email"
              className={inputClasses}
            />
          </div>

          {/* Address & City */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                {t(language, 'label.address')}
              </Label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => updateFormData({ address: e.target.value })}
                required
                autoComplete="street-address"
                className={cn(inputClasses, 'touch-manipulation')}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block text-foreground">
                {t(language, 'label.city')}
              </Label>
              <Input
                type="text"
                value={formData.city}
                onChange={(e) => updateFormData({ city: e.target.value })}
                required
                autoComplete="address-level2"
                className={cn(inputClasses, 'touch-manipulation')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Move-Out Details (Deposit Success) - MOVING ONLY */}
      {isMoving && (
        <Card className="border-2 border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {t(language, 'details.move_out')}
              <span className="ml-1 text-xs font-normal text-amber-600/80 dark:text-amber-400/80">
                ({t(language, 'details.move_out.subtitle')})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Landlord Receipt Toggle */}
            <div 
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border-2 transition-all",
                formData.needsLandlordReceipt
                  ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/20"
                  : "border-border bg-card"
              )}
            >
              <div className="shrink-0 mt-0.5">
                <FileText className={cn(
                  "w-5 h-5",
                  formData.needsLandlordReceipt ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {t(language, 'move.landlord_receipt')}
                  </span>
                  <Switch
                    checked={formData.needsLandlordReceipt}
                    onCheckedChange={(enabled) => updateFormData({ needsLandlordReceipt: enabled })}
                    className="scale-90"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(language, 'move.landlord_receipt.desc')}
                </p>
              </div>
            </div>

            {/* Timeline Intent Radio */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {t(language, 'move.timeline_intent')}
              </Label>
              <RadioGroup
                value={formData.movingTimelineIntent || ''}
                onValueChange={(v) => handleTimelineChange(v as 'urgent' | 'planning')}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {/* Urgent Option */}
                <label
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    formData.movingTimelineIntent === 'urgent'
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                      : "border-border bg-card hover:border-amber-300 dark:hover:border-amber-700"
                  )}
                >
                  <RadioGroupItem value="urgent" className="mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground block">
                      {t(language, 'move.timeline_intent.urgent')}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {t(language, 'move.timeline_intent.urgent.desc')}
                    </span>
                  </div>
                </label>

                {/* Planning Option */}
                <label
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    formData.movingTimelineIntent === 'planning'
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value="planning" className="mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground block">
                      {t(language, 'move.timeline_intent.planning')}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {t(language, 'move.timeline_intent.planning.desc')}
                    </span>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Walkthrough Date (only if urgent) */}
            {formData.movingTimelineIntent === 'urgent' && (
              <div className="animate-fade-in">
                <Label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {t(language, 'move.walkthrough_date')}
                </Label>
                <Input
                  type="date"
                  value={formData.walkthroughDate}
                  onChange={(e) => updateFormData({ walkthroughDate: e.target.value })}
                  className={cn(inputClasses, 'touch-manipulation')}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t(language, 'move.walkthrough_date.desc')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CARD 3: Access & Entry Details - Show for complex properties or MOVING */}
      {(isMoving || formData.propertyType === 'apartment' || formData.houseLevels > 1) && (
        <Card className="border-2 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              {t(language, 'details.access')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gated Community Toggle */}
            <div 
              className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                formData.gatedCommunity
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {t(language, 'access.gated_community')}
                </span>
              </div>
              <Switch
                checked={formData.gatedCommunity || false}
                onCheckedChange={(enabled) => updateFormData({ gatedCommunity: enabled })}
                className="scale-90"
              />
            </div>

            {/* Apartment Complex Toggle (if relevant) */}
            {formData.propertyType === 'apartment' && (
              <div 
                className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                  formData.apartmentComplex
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {t(language, 'access.apartment_complex')}
                  </span>
                </div>
                <Switch
                  checked={formData.apartmentComplex || false}
                  onCheckedChange={(enabled) => updateFormData({ apartmentComplex: enabled })}
                  className="scale-90"
                />
              </div>
            )}

            {/* Access Notes */}
            <div>
              <Label className="text-sm font-medium mb-2 block text-foreground">
                {t(language, 'access.notes_label')}
              </Label>
              <Textarea
                placeholder={t(language, 'access.notes_placeholder')}
                value={formData.accessNotes || ''}
                onChange={(e) => updateFormData({ accessNotes: e.target.value })}
                className="min-h-[80px] bg-card border-2 border-border rounded-xl resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {t(language, 'access.notes_hint')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
