/**
 * itemUtils.ts
 * Shared utilities for inventory items and unit management.
 */

export const COMMON_UNITS = [
  'pc', 'kg', 'g', 'l', 'ml', 'bottle', 'box', 'pack', 'roll', 'bag', 'can', 'jar', 'dozen'
];

export const CATEGORY_UNIT_MAPPING: Record<string, string[]> = {
  'Produce': ['kg', 'g', 'pc', 'bag'],
  'Dairy': ['l', 'ml', 'pc', 'carton', 'pack'],
  'Meat & Seafood': ['kg', 'g', 'pack'],
  'Bakery': ['pc', 'pack', 'bag'],
  'Frozen': ['pack', 'box', 'bag', 'kg'],
  'Pantry': ['kg', 'g', 'can', 'jar', 'pack', 'bottle'],
  'Snacks': ['pack', 'bag', 'box'],
  'Beverages': ['l', 'ml', 'bottle', 'can', 'pack'],
  'Alcoholic Drinks': ['bottle', 'can', 'pack', 'l'],
  'Cleaning': ['bottle', 'pack', 'pc'],
  'Personal Care': ['pc', 'bottle', 'tube', 'pack'],
  'Household': ['pc', 'roll', 'pack', 'box'],
  'Baby': ['pack', 'pc', 'bottle'],
  'Pet': ['bag', 'can', 'pack', 'kg'],
  'Other': ['pc', 'unit'],
};

/**
 * Returns a list of suggested units based on category.
 * If no category is provided or no mapping exists, returns common units.
 */
export function getSuggestedUnits(category?: string | null): string[] {
  if (!category) return COMMON_UNITS;
  
  // Find matching category (case-insensitive)
  const key = Object.keys(CATEGORY_UNIT_MAPPING).find(
    k => k.toLowerCase() === category.toLowerCase()
  );
  
  if (key) {
    // Return category-specific units + some general and common ones, but unique
    const specific = CATEGORY_UNIT_MAPPING[key];
    return Array.from(new Set([...specific, ...COMMON_UNITS.slice(0, 5)]));
  }
  
  return COMMON_UNITS;
}

/**
 * Basic singularization for unit display.
 */
export function formatUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  if (u === 'pieces') return 'pc';
  if (u === 'piece') return 'pc';
  return u;
}
