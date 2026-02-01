/**
 * Sidebar Diff Engine — Smart change detection for Detailed Home Mapping
 * 
 * Computes what changed between two formData states to enable:
 * - "Recent Changes" indicator in sidebar
 * - Highlight newly added/removed fields
 */

import { BookingFormData } from '@/contexts/BookingContext';
import { 
  SIDEBAR_FIELD_CONTRACT,
  getFieldValue,
  isFieldChanged,
  formatFieldValue,
  FieldContract,
} from './homeMappingSidebarContract';
import { ServiceAreaKey, getVisibleAreas, AreaGatingContext } from './homeMappingRegistry';
import { Language } from './translations';

export interface FieldChange {
  keyPath: string;
  fieldLabel: string;
  fromValue: any;
  toValue: any;
  fromDisplay: string;
  toDisplay: string;
  changeType: 'added' | 'removed' | 'changed';
  priceImpact?: number;
  timeImpact?: number;
}

export interface AreaDiff {
  added: FieldChange[];
  removed: FieldChange[];
  changed: FieldChange[];
  totalChanges: number;
}

export interface DiffResult {
  byArea: Partial<Record<ServiceAreaKey, AreaDiff>>;
  totalChanges: number;
  hasChanges: boolean;
}

/**
 * Create empty area diff
 */
function createEmptyAreaDiff(): AreaDiff {
  return { added: [], removed: [], changed: [], totalChanges: 0 };
}

/**
 * Deep compare two values for equality
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}

/**
 * Compute diff for a single field
 */
function computeFieldDiff(
  field: FieldContract,
  prevFormData: BookingFormData | null,
  nextFormData: BookingFormData,
  language: Language
): FieldChange | null {
  const prevValue = prevFormData ? getFieldValue(prevFormData, field.key) : field.defaultValue;
  const nextValue = getFieldValue(nextFormData, field.key);

  // If values are deeply equal, no change
  if (deepEqual(prevValue, nextValue)) return null;

  const prevIsDefault = !isFieldChanged(prevValue, field.defaultValue);
  const nextIsDefault = !isFieldChanged(nextValue, field.defaultValue);

  // Determine change type
  let changeType: 'added' | 'removed' | 'changed';
  if (prevIsDefault && !nextIsDefault) {
    changeType = 'added';
  } else if (!prevIsDefault && nextIsDefault) {
    changeType = 'removed';
  } else if (!prevIsDefault && !nextIsDefault) {
    changeType = 'changed';
  } else {
    // Both default - no meaningful change
    return null;
  }

  return {
    keyPath: field.key,
    fieldLabel: field.labelKey,
    fromValue: prevValue,
    toValue: nextValue,
    fromDisplay: formatFieldValue(field, prevValue, language),
    toDisplay: formatFieldValue(field, nextValue, language),
    changeType,
  };
}

/**
 * Compute diff between previous and current form data
 */
export function computeSidebarDiff(
  prevFormData: BookingFormData | null,
  nextFormData: BookingFormData,
  context: AreaGatingContext,
  language: Language
): DiffResult {
  const visibleAreas = getVisibleAreas(context);
  const byArea: Partial<Record<ServiceAreaKey, AreaDiff>> = {};
  let totalChanges = 0;

  visibleAreas.forEach(area => {
    const contract = SIDEBAR_FIELD_CONTRACT[area.key];
    if (!contract) return;

    const areaDiff = createEmptyAreaDiff();

    contract.fields.forEach(field => {
      const change = computeFieldDiff(field, prevFormData, nextFormData, language);
      if (!change) return;

      switch (change.changeType) {
        case 'added':
          areaDiff.added.push(change);
          break;
        case 'removed':
          areaDiff.removed.push(change);
          break;
        case 'changed':
          areaDiff.changed.push(change);
          break;
      }
    });

    areaDiff.totalChanges = areaDiff.added.length + areaDiff.removed.length + areaDiff.changed.length;
    totalChanges += areaDiff.totalChanges;
    
    if (areaDiff.totalChanges > 0) {
      byArea[area.key] = areaDiff;
    }
  });

  return {
    byArea,
    totalChanges,
    hasChanges: totalChanges > 0,
  };
}

/**
 * Get human-readable summary of changes for an area
 */
export function getAreaChangeSummary(
  areaDiff: AreaDiff,
  maxItems: number = 2
): string {
  const items: string[] = [];
  
  areaDiff.added.slice(0, maxItems).forEach(c => {
    items.push(`+${c.toDisplay}`);
  });
  
  areaDiff.changed.slice(0, Math.max(0, maxItems - items.length)).forEach(c => {
    items.push(`${c.fromDisplay}→${c.toDisplay}`);
  });
  
  const remaining = areaDiff.totalChanges - items.length;
  if (remaining > 0) {
    items.push(`+${remaining} more`);
  }
  
  return items.join(', ');
}
