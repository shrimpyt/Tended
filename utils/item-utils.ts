/**
 * item-utils.ts
 * Shared utilities for inventory items and unit management.
 * Uses real-world household units (US customary + common metric where
 * appropriate) rather than abstract "pieces".
 */

// ─── Common units ordered by everyday usage ──────────────────────────────────
export const COMMON_UNITS = [
  // Volume
  'fl oz', 'cup', 'pint', 'quart', 'gallon',
  // Weight
  'oz', 'lbs',
  // Count
  'count', 'pack', 'box', 'bag', 'bottle', 'can', 'jar',
  // Roll / sheet
  'roll', 'sheet',
];

// ─── Category-specific suggestions ───────────────────────────────────────────
export const CATEGORY_UNIT_MAPPING: Record<string, string[]> = {
  // Food
  'Produce':           ['lbs', 'oz', 'count', 'bag'],
  'Dairy':             ['gallon', 'quart', 'pint', 'fl oz', 'count', 'carton'],
  'Meat':              ['lbs', 'oz', 'count'],
  'Meat & Seafood':    ['lbs', 'oz', 'count'],
  'Frozen':            ['lbs', 'oz', 'count', 'bag', 'box'],
  'Pantry':            ['lbs', 'oz', 'cup', 'fl oz', 'can', 'jar', 'bag', 'box'],
  'Snacks':            ['oz', 'lbs', 'bag', 'box', 'count'],
  'Beverages':         ['fl oz', 'gallon', 'quart', 'liter', 'bottle', 'can', 'pack'],
  'Groceries':         ['lbs', 'oz', 'cup', 'fl oz', 'count', 'can', 'jar', 'bag'],
  'Bakery':            ['count', 'lbs', 'oz', 'bag'],
  // Household
  'Household':         ['count', 'roll', 'pack', 'box', 'sheet'],
  'Cleaning':          ['fl oz', 'gallon', 'bottle', 'count', 'pack'],
  'Kitchen':           ['count', 'pack', 'box', 'roll'],
  'Bathroom':          ['count', 'roll', 'pack', 'fl oz', 'bottle'],
  'Personal care':     ['count', 'fl oz', 'oz', 'bottle', 'tube', 'pack'],
  'Personal Care':     ['count', 'fl oz', 'oz', 'bottle', 'tube', 'pack'],
  // Other
  'Pet':               ['lbs', 'oz', 'bag', 'can', 'count'],
  'Baby':              ['count', 'pack', 'bottle'],
  'Other':             ['count', 'pack', 'box'],
};

/**
 * Returns a list of suggested units based on category.
 * Falls back to COMMON_UNITS if no category / mapping found.
 */
export function getSuggestedUnits(category?: string | null): string[] {
  if (!category) return COMMON_UNITS;

  const key = Object.keys(CATEGORY_UNIT_MAPPING).find(
    k => k.toLowerCase() === category.toLowerCase(),
  );

  if (key) {
    const specific = CATEGORY_UNIT_MAPPING[key];
    // Merge with common, deduplicate, keep category-specific first
    return Array.from(new Set([...specific, ...COMMON_UNITS]));
  }

  return COMMON_UNITS;
}

/**
 * Normalises legacy/metric unit strings to preferred household equivalents.
 */
export function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  // Legacy / metric → household equivalents
  const MAP: Record<string, string> = {
    'pc':    'count',
    'piece': 'count',
    'pieces':'count',
    'unit':  'count',
    'units': 'count',
    'kg':    'lbs',
    'g':     'oz',
    'l':     'quart',
    'ml':    'fl oz',
    'litre': 'liter',
    'litres':'liter',
  };
  return MAP[u] ?? u;
}

/**
 * Short display label for a unit (strips trailing 's' on count = 1).
 */
export function formatUnit(
  unit: string | null | undefined,
  quantity?: number,
): string {
  if (!unit) return '';
  const u = normalizeUnit(unit);
  if (quantity === 1) {
    // Singularize common plurals
    if (u === 'lbs') return 'lb';
    if (u === 'cups') return 'cup';
    if (u === 'rolls') return 'roll';
    if (u === 'sheets') return 'sheet';
  }
  return u;
}
