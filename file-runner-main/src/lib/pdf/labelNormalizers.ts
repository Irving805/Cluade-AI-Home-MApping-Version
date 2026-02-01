/**
 * PDF Label Normalizers — i18n-aware Presentation SSOT
 * 
 * These are PRESENTATION functions only.
 * They receive raw enum values and return display-ready strings.
 * NO pricing logic. NO formData mutations.
 * 
 * SSOT RULE #11: Normalizers accept language param for i18n support
 */

export type Language = 'en' | 'es' | 'zh';

// ============= HOME SIZE NORMALIZER =============

const HOME_SIZE_LABELS: Record<Language, Record<number, string>> = {
  en: {
    0: 'Studio',
    1: '1 Bedroom',
    2: '2 Bedroom',
    3: '3 Bedroom',
    4: '4 Bedroom',
    5: '5 Bedroom',
    6: '6+ Bedroom',
  },
  es: {
    0: 'Estudio',
    1: '1 Recámara',
    2: '2 Recámaras',
    3: '3 Recámaras',
    4: '4 Recámaras',
    5: '5 Recámaras',
    6: '6+ Recámaras',
  },
  zh: {
    0: '开间',
    1: '1卧室',
    2: '2卧室',
    3: '3卧室',
    4: '4卧室',
    5: '5卧室',
    6: '6+卧室',
  },
};

/**
 * Format home size number to display label
 * @param homeSize - Number of bedrooms (0 = studio)
 * @param language - Language code
 * @returns Display-ready string (e.g., "4 Bedroom")
 */
export function formatHomeSizeLabel(homeSize: number, language: Language = 'en'): string {
  const labels = HOME_SIZE_LABELS[language] || HOME_SIZE_LABELS.en;
  // Cap at 6+ for large homes
  const key = Math.min(Math.max(homeSize, 0), 6);
  return labels[key] || labels[2]; // Default to 2BR if unknown
}

// ============= SQUARE FOOTAGE NORMALIZER =============

const SQFT_LABELS: Record<Language, Record<string, string>> = {
  en: {
    'SF_<600': '< 600 Sq Ft',
    'SF_600_900': '600 – 900 Sq Ft',
    'SF_900_1200': '900 – 1,200 Sq Ft',
    'SF_1200_1500': '1,200 – 1,500 Sq Ft',
    'SF_1500_2000': '1,500 – 2,000 Sq Ft',
    'SF_2000_2500': '2,000 – 2,500 Sq Ft',
    'SF_2500_3000': '2,500 – 3,000 Sq Ft',
    'SF_3000_3500': '3,000 – 3,500 Sq Ft',
    'SF_3500_4000': '3,500 – 4,000 Sq Ft',
    'SF_4000_5000': '4,000 – 5,000 Sq Ft',
    'SF_5000_7000': '5,000 – 7,000 Sq Ft',
    'SF_7000+': '7,000+ Sq Ft',
  },
  es: {
    'SF_<600': '< 600 Pies²',
    'SF_600_900': '600 – 900 Pies²',
    'SF_900_1200': '900 – 1,200 Pies²',
    'SF_1200_1500': '1,200 – 1,500 Pies²',
    'SF_1500_2000': '1,500 – 2,000 Pies²',
    'SF_2000_2500': '2,000 – 2,500 Pies²',
    'SF_2500_3000': '2,500 – 3,000 Pies²',
    'SF_3000_3500': '3,000 – 3,500 Pies²',
    'SF_3500_4000': '3,500 – 4,000 Pies²',
    'SF_4000_5000': '4,000 – 5,000 Pies²',
    'SF_5000_7000': '5,000 – 7,000 Pies²',
    'SF_7000+': '7,000+ Pies²',
  },
  zh: {
    'SF_<600': '< 600 平方英尺',
    'SF_600_900': '600 – 900 平方英尺',
    'SF_900_1200': '900 – 1,200 平方英尺',
    'SF_1200_1500': '1,200 – 1,500 平方英尺',
    'SF_1500_2000': '1,500 – 2,000 平方英尺',
    'SF_2000_2500': '2,000 – 2,500 平方英尺',
    'SF_2500_3000': '2,500 – 3,000 平方英尺',
    'SF_3000_3500': '3,000 – 3,500 平方英尺',
    'SF_3500_4000': '3,500 – 4,000 平方英尺',
    'SF_4000_5000': '4,000 – 5,000 平方英尺',
    'SF_5000_7000': '5,000 – 7,000 平方英尺',
    'SF_7000+': '7,000+ 平方英尺',
  },
};

/**
 * Format square footage range enum to display label
 * @param sqftRange - Raw enum like "SF_900_1200"
 * @param language - Language code
 * @returns Display-ready string (e.g., "900 – 1,200 Sq Ft")
 */
export function formatSquareFootageLabel(sqftRange: string, language: Language = 'en'): string {
  const labels = SQFT_LABELS[language] || SQFT_LABELS.en;
  return labels[sqftRange] || sqftRange; // Fallback to raw if unknown
}

// ============= CONDITION LEVEL NORMALIZER =============

const CONDITION_LABELS: Record<Language, Record<string, string>> = {
  en: {
    'normal': 'Normal',
    'above_average': 'Above Average',
    'heavy_severe': 'Heavy / Severe',
  },
  es: {
    'normal': 'Normal',
    'above_average': 'Encima del Promedio',
    'heavy_severe': 'Pesado / Severo',
  },
  zh: {
    'normal': '正常',
    'above_average': '高于平均',
    'heavy_severe': '严重',
  },
};

/**
 * Format condition level enum to display label
 * @param level - Raw enum like "above_average"
 * @param language - Language code
 * @returns Display-ready string (e.g., "Above Average")
 */
export function formatConditionLevelLabel(
  level: string | null | undefined, 
  language: Language = 'en'
): string {
  if (!level) return 'Standard';
  const labels = CONDITION_LABELS[language] || CONDITION_LABELS.en;
  return labels[level] || 'Standard';
}

// ============= PROPERTY TYPE NORMALIZER =============

const PROPERTY_TYPE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    'house': 'Single Family Home',
    'apartment': 'Apartment / Condo',
    'townhouse': 'Townhouse',
    'condo': 'Condominium',
  },
  es: {
    'house': 'Casa Unifamiliar',
    'apartment': 'Apartamento / Condo',
    'townhouse': 'Casa Adosada',
    'condo': 'Condominio',
  },
  zh: {
    'house': '独立屋',
    'apartment': '公寓',
    'townhouse': '联排别墅',
    'condo': '公寓',
  },
};

/**
 * Format property type enum to display label
 * @param type - Raw enum like "house" or "apartment"
 * @param language - Language code
 * @returns Display-ready string (e.g., "Single Family Home")
 */
export function formatPropertyTypeLabel(type: string, language: Language = 'en'): string {
  const labels = PROPERTY_TYPE_LABELS[language] || PROPERTY_TYPE_LABELS.en;
  return labels[type] || type;
}

// ============= MOVE CONDITION NORMALIZER =============

const MOVE_CONDITION_LABELS: Record<Language, Record<string, string>> = {
  en: {
    'partial_empty': 'Partial Empty (Some items remain)',
    'vacant': 'Vacant (Fully Empty)',
  },
  es: {
    'partial_empty': 'Parcialmente Vacío (Algunos artículos quedan)',
    'vacant': 'Vacante (Completamente Vacío)',
  },
  zh: {
    'partial_empty': '部分空置（部分物品保留）',
    'vacant': '完全空置',
  },
};

/**
 * Format move condition enum to display label
 * @param condition - Raw enum like "partial_empty" or "vacant"
 * @param language - Language code
 * @returns Display-ready string
 */
export function formatMoveConditionLabel(condition: string, language: Language = 'en'): string {
  const labels = MOVE_CONDITION_LABELS[language] || MOVE_CONDITION_LABELS.en;
  return labels[condition] || condition;
}

// ============= SERVICE TYPE NORMALIZER =============

const SERVICE_TYPE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    'st.standard': 'Standard Clean',
    'st.deep': 'Deep Clean',
    'st.move': 'Move-In/Out Clean',
    'Standard Clean': 'Standard Clean',
    'Deep Clean': 'Deep Clean',
    'Move-In/Out': 'Move-In/Out Clean',
  },
  es: {
    'st.standard': 'Limpieza Estándar',
    'st.deep': 'Limpieza Profunda',
    'st.move': 'Limpieza de Mudanza',
    'Standard Clean': 'Limpieza Estándar',
    'Deep Clean': 'Limpieza Profunda',
    'Move-In/Out': 'Limpieza de Mudanza',
  },
  zh: {
    'st.standard': '标准清洁',
    'st.deep': '深度清洁',
    'st.move': '搬迁清洁',
    'Standard Clean': '标准清洁',
    'Deep Clean': '深度清洁',
    'Move-In/Out': '搬迁清洁',
  },
};

/**
 * Format service type key or value to display label
 * @param serviceTypeKey - Raw key like "st.deep" or value like "Deep Clean"
 * @param language - Language code
 * @returns Display-ready string (e.g., "Deep Clean")
 */
export function formatServiceTypeLabel(
  serviceTypeKey: string | undefined | null, 
  language: Language = 'en'
): string {
  if (!serviceTypeKey) return 'Standard Clean';
  const labels = SERVICE_TYPE_LABELS[language] || SERVICE_TYPE_LABELS.en;
  return labels[serviceTypeKey] || serviceTypeKey;
}
