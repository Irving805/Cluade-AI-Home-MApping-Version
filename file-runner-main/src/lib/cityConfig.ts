export type CityKey =
  | "default"
  | "santa-barbara"
  | "goleta"
  | "ventura"
  | "camarillo"
  | "thousand-oaks"
  | "pismo-beach"
  | "san-luis-obispo"
  | "santa-maria"
  | "lompoc"
  | "central-coast";

export interface CityConfig {
  key: CityKey;
  label: string;
  heroSubtitle: string;
  areaTag: string;
}

export const CITY_CONFIG: Record<CityKey, CityConfig> = {
  default: {
    key: "default",
    label: "Santa Barbara, Ventura & Central Coast",
    heroSubtitle:
      "No guesswork. No waiting. Get your personalized quote in under 60 seconds.",
    areaTag: "Serving: Santa Barbara + Ventura + Central Coast",
  },

  "santa-barbara": {
    key: "santa-barbara",
    label: "Santa Barbara Area",
    heroSubtitle:
      "Santa Barbara homes cleaned with unmatched care — get your instant quote now.",
    areaTag: "Serving: Santa Barbara Area",
  },

  goleta: {
    key: "goleta",
    label: "Goleta Area",
    heroSubtitle:
      "Goleta homes — professional cleaning with your instant personalized quote.",
    areaTag: "Serving: Goleta Area",
  },

  ventura: {
    key: "ventura",
    label: "Ventura Area",
    heroSubtitle:
      "Ventura & Oxnard homes — get your price instantly with no guesswork.",
    areaTag: "Serving: Ventura Area",
  },

  camarillo: {
    key: "camarillo",
    label: "Camarillo Area",
    heroSubtitle:
      "Camarillo homes — instant pricing for professional cleaning services.",
    areaTag: "Serving: Camarillo Area",
  },

  "thousand-oaks": {
    key: "thousand-oaks",
    label: "Thousand Oaks Area",
    heroSubtitle:
      "Thousand Oaks homes — get your personalized cleaning quote in seconds.",
    areaTag: "Serving: Thousand Oaks Area",
  },

  "pismo-beach": {
    key: "pismo-beach",
    label: "Pismo Beach Area",
    heroSubtitle:
      "Pismo Beach homes cleaned with hotel-level detail — get an instant price.",
    areaTag: "Serving: Pismo Beach Area",
  },

  "san-luis-obispo": {
    key: "san-luis-obispo",
    label: "San Luis Obispo Area",
    heroSubtitle:
      "San Luis Obispo homes — your personalized cleaning quote is ready in seconds.",
    areaTag: "Serving: San Luis Obispo",
  },

  "santa-maria": {
    key: "santa-maria",
    label: "Santa Maria Area",
    heroSubtitle:
      "Santa Maria homes — professional cleaning with instant transparent pricing.",
    areaTag: "Serving: Santa Maria Area",
  },

  lompoc: {
    key: "lompoc",
    label: "Lompoc Area",
    heroSubtitle:
      "Lompoc homes — get your instant cleaning quote with no hidden fees.",
    areaTag: "Serving: Lompoc Area",
  },

  "central-coast": {
    key: "central-coast",
    label: "Central Coast",
    heroSubtitle:
      "Central Coast homes — get your instant cleaning quote today.",
    areaTag: "Serving: Central Coast",
  },
};

// Normalize city param to match our keys (handle case, trailing slashes, etc.)
export function normalizeCityParam(cityParam: string | null): CityKey {
  if (!cityParam) return "default";
  
  // Clean up the param: lowercase, trim, remove trailing slashes
  const cleaned = cityParam.toLowerCase().trim().replace(/\/+$/, '');
  
  // Direct match
  if (cleaned in CITY_CONFIG) {
    return cleaned as CityKey;
  }
  
  // Handle common variations
  const aliases: Record<string, CityKey> = {
    "pismo": "pismo-beach",
    "slo": "san-luis-obispo",
    "thousandoaks": "thousand-oaks",
    "thousand_oaks": "thousand-oaks",
  };
  
  if (cleaned in aliases) {
    return aliases[cleaned];
  }
  
  return "default";
}

export function getCityConfig(cityKey: CityKey): CityConfig {
  return CITY_CONFIG[cityKey] || CITY_CONFIG.default;
}
