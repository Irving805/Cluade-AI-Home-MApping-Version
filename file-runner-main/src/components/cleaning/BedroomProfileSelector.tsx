import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/translations';
import { Crown, Baby, Users, Briefcase, Bed, Star, Sofa } from 'lucide-react';

// Bedroom profile types for room identity
export type BedroomProfile = 
  | 'master'           // Master Suite (with ensuite bath)
  | 'primary'          // Primary Bedroom (modern term)
  | 'studio_living'    // Main Living/Sleeping Area (for Studios/Lofts)
  | 'kids'             // Kids Room
  | 'guest'            // Guest Room
  | 'office'           // Home Office
  | 'standard';        // Standard Bedroom

// Profile configuration with icons and labels
const BEDROOM_PROFILES: { 
  id: BedroomProfile; 
  icon: React.ElementType; 
  labelKey: string;
  firstBedroomOnly?: boolean; // Only show for first bedroom
}[] = [
  { id: 'master', icon: Crown, labelKey: 'bedroom.profile_master', firstBedroomOnly: true },
  { id: 'primary', icon: Star, labelKey: 'bedroom.profile_primary', firstBedroomOnly: true },
  { id: 'studio_living', icon: Sofa, labelKey: 'bedroom.profile_studio', firstBedroomOnly: true },
  { id: 'kids', icon: Baby, labelKey: 'bedroom.profile_kids' },
  { id: 'guest', icon: Users, labelKey: 'bedroom.profile_guest' },
  { id: 'office', icon: Briefcase, labelKey: 'bedroom.profile_office' },
  { id: 'standard', icon: Bed, labelKey: 'bedroom.profile_standard' },
];

interface BedroomProfileSelectorProps {
  value: BedroomProfile;
  onChange: (profile: BedroomProfile) => void;
  language: Language;
  compact?: boolean;
  isFirstBedroom?: boolean; // Controls which profiles are shown
}

export function BedroomProfileSelector({
  value,
  onChange,
  language,
  compact = false,
  isFirstBedroom = false,
}: BedroomProfileSelectorProps) {
  // Filter profiles based on bedroom position
  // First bedroom: show master/primary/studio + standard options
  // Other bedrooms: exclude master/primary/studio
  const availableProfiles = isFirstBedroom 
    ? BEDROOM_PROFILES 
    : BEDROOM_PROFILES.filter(p => !p.firstBedroomOnly);

  return (
    <div className="space-y-1.5">
      <span className={cn(
        "text-muted-foreground font-medium",
        compact ? "text-[9px]" : "text-[10px]"
      )}>
        {t(language, 'bedroom.select_type')}
      </span>
      
      <div className="flex flex-wrap gap-1.5">
        {availableProfiles.map((profile) => {
          const Icon = profile.icon;
          const isSelected = value === profile.id;
          
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => onChange(profile.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border transition-all",
                compact ? "px-2 py-0.5" : "px-2.5 py-1",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <Icon className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
              <span className={cn("font-medium", compact ? "text-[9px]" : "text-[10px]")}>
                {t(language, profile.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
