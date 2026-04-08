/**
 * recipeUtils.ts
 *
 * Utilities for mapping inventory item names to clean strings suitable
 * for use in recipe API queries (e.g. Spoonacular findByIngredients).
 *
 * The Spoonacular API is sensitive to noise in ingredient names — brand names,
 * size descriptors, adjectives like "Organic", and units all reduce match
 * accuracy. This module strips that noise before items are sent to the API.
 */

// ── Descriptor words to strip ──────────────────────────────────────────────

/** Adjectives / brand qualifiers that add no value to recipe matching */
const STRIP_ADJECTIVES = new Set([
  'organic', 'natural', 'fresh', 'frozen', 'dried', 'canned', 'whole',
  'skim', 'low-fat', 'low fat', 'fat-free', 'fat free', 'unsalted',
  'salted', 'raw', 'cooked', 'sliced', 'diced', 'chopped', 'ground',
  'shredded', 'grated', 'extra', 'large', 'medium', 'small', 'mini',
  'jumbo', 'premium', 'select', 'classic', 'original', 'traditional',
  'homestyle', 'smooth', 'chunky', 'lite', 'light', 'dark', 'sweetened',
  'unsweetened', 'plain', 'flavored', 'unflavored', 'enriched', 'fortified',
]);

/** Units that appear in item names (e.g. "Milk 1L", "Olive Oil 500ml") */
const STRIP_UNIT_PATTERN =
  /\b\d+(\.\d+)?\s*(ml|l|g|kg|oz|lb|lbs|fl\s?oz|litre|liter|gram|grams|kilogram|ounce|ounces|pound|pounds|pint|pints|quart|quarts|gallon|gallons|pack|packs|pk|ct|count|piece|pieces|pc|pcs|jar|jars|can|cans|bottle|bottles|box|boxes|bag|bags|tub|tubs|roll|rolls)\b/gi;

/** Any leading digit-based quantity prefix ("3x Eggs" → "Eggs") */
const STRIP_LEADING_QUANTITY = /^\d+(\.\d+)?\s*[xX×]?\s*/;

/** Brand names commonly found in the Tended inventory */
const KNOWN_BRANDS = new Set([
  'heinz', 'kraft', 'kelloggs', "kellogg's", 'nestle', 'nestlé',
  'pepsi', 'coca-cola', 'coke', 'lay\'s', 'lays', 'doritos', 'pringles',
  'oreo', 'nabisco', 'campbell\'s', 'campbells', 'general mills',
  'quaker', 'dole', 'del monte', 'birds eye', "bird's eye",
  'green giant', 'uncle ben\'s', 'bens original',
]);

// ── Main exported function ─────────────────────────────────────────────────

/**
 * Strip brand names, size descriptors, units, and noise from a raw inventory
 * item name and return a clean, lowercase string for use in recipe API calls.
 *
 * @example
 * cleanIngredientName("Organic Whole Milk 1L")  // → "milk"
 * cleanIngredientName("Heinz Ketchup 500ml")    // → "ketchup"
 * cleanIngredientName("2x Large Eggs")          // → "eggs"
 * cleanIngredientName("Frozen Spinach")         // → "spinach"
 */
export function cleanIngredientName(name: string): string {
  let cleaned = name.trim().toLowerCase();

  // 1. Strip leading quantity prefix ("3x ", "2 × ")
  cleaned = cleaned.replace(STRIP_LEADING_QUANTITY, '');

  // 2. Strip unit+quantity patterns embedded anywhere ("500ml", "1 lb", etc.)
  cleaned = cleaned.replace(STRIP_UNIT_PATTERN, '');

  // 3. Strip known brand names (whole-word match)
  for (const brand of KNOWN_BRANDS) {
    const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    cleaned = cleaned.replace(re, '');
  }

  // 4. Strip descriptor adjectives (whole-word match, order-preserving)
  const words = cleaned.split(/\s+/);
  const filtered = words.filter(w => !STRIP_ADJECTIVES.has(w));
  cleaned = filtered.join(' ');

  // 5. Strip any remaining punctuation and extra whitespace
  cleaned = cleaned.replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Given an array of raw inventory item names, return a de-duped array of
 * cleaned ingredient strings, filtering out empty strings.
 */
export function cleanIngredientNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const clean = cleanIngredientName(name);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
}
