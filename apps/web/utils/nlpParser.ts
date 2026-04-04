/**
 * nlpParser.ts
 *
 * Lightweight, zero-dependency NLP parser that converts free-form inventory
 * text into structured item proposals. Handles natural phrasing like:
 *   "3 eggs"           → { name: "eggs", quantity: 3 }
 *   "half a gallon of milk" → { name: "milk", quantity: 0.5, unit: "gallon" }
 *   "oat milk x2"      → { name: "oat milk", quantity: 2 }
 *   "4 cans of beans"  → { name: "beans", quantity: 4, unit: "can" }
 */

export interface ParsedItem {
  name: string;
  quantity: number;
  unit?: string;
}

// ── Word-form numbers ──────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, dozen: 12,
  half: 0.5, quarter: 0.25, third: 0.333,
};

// ── Fraction literals ──────────────────────────────────────────────

const FRACTIONS: Record<string, number> = {
  '1/2': 0.5, '1/3': 0.333, '2/3': 0.667,
  '1/4': 0.25, '3/4': 0.75,
};

// ── Common container / unit words to strip from the item name ──────

const UNITS = new Set([
  'bag', 'bags', 'bottle', 'bottles', 'box', 'boxes',
  'can', 'cans', 'carton', 'cartons', 'container', 'containers',
  'cup', 'cups', 'gallon', 'gallons', 'gram', 'grams', 'g',
  'head', 'heads', 'jar', 'jars', 'kilogram', 'kilograms', 'kg',
  'liter', 'litre', 'liters', 'litres', 'l',
  'milliliter', 'millilitre', 'ml',
  'ounce', 'ounces', 'oz', 'pack', 'packs', 'package', 'packages',
  'piece', 'pieces', 'pint', 'pints', 'pound', 'pounds', 'lb', 'lbs',
  'quart', 'quarts', 'roll', 'rolls', 'sheet', 'sheets',
  'slice', 'slices', 'stick', 'sticks', 'tub', 'tubs',
]);

// Prepositions / filler words to strip before the item name
const STOPWORDS = new Set(['of', 'the', 'a', 'an', 'some', 'more', 'x']);

// ── Helpers ────────────────────────────────────────────────────────

function parseNumber(token: string): number | null {
  const lower = token.toLowerCase();
  if (lower in WORD_NUMBERS) return WORD_NUMBERS[lower];
  if (lower in FRACTIONS) return FRACTIONS[lower];
  const n = parseFloat(token);
  return isNaN(n) ? null : n;
}

function singularise(word: string): string {
  // Very light singularisation for unit display
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes'))
    return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  return word;
}

// ── Main parser ────────────────────────────────────────────────────

/**
 * Parse a single line of free-form text into a structured item.
 * Returns `null` if the input is empty or meaningless.
 */
export function parseItem(raw: string): ParsedItem | null {
  const input = raw.trim();
  if (!input) return null;

  // Handle "x<number>" suffix pattern: "oat milk x3"
  const xSuffixMatch = input.match(/^(.+?)\s+[xX×](\d+(?:\.\d+)?)$/);
  if (xSuffixMatch) {
    const name = xSuffixMatch[1].trim().toLowerCase();
    const quantity = parseFloat(xSuffixMatch[2]);
    if (name) return { name, quantity };
  }

  const tokens = input.toLowerCase().split(/\s+/);
  let idx = 0;
  let quantity = 1;
  let unit: string | undefined;

  // 1. Try to read a leading quantity (numeric or word-form)
  if (idx < tokens.length) {
    const fraction = FRACTIONS[tokens[idx]];
    if (fraction !== undefined) {
      quantity = fraction;
      idx++;
      // "half a gallon" — skip optional "a/an"
      if (idx < tokens.length && (tokens[idx] === 'a' || tokens[idx] === 'an')) idx++;
    } else {
      const n = parseNumber(tokens[idx]);
      if (n !== null) {
        quantity = n;
        idx++;
        // "a dozen eggs" — word number already consumed
      }
    }
  }

  // 2. Try to read an optional unit
  if (idx < tokens.length && UNITS.has(tokens[idx])) {
    unit = singularise(tokens[idx]);
    idx++;
  }

  // 3. Skip filler words ("of", "the", …)
  while (idx < tokens.length && STOPWORDS.has(tokens[idx])) {
    idx++;
  }

  // 4. The remainder is the item name
  const name = tokens.slice(idx).join(' ').trim();
  if (!name) return null;

  return { name, quantity, ...(unit ? { unit } : {}) };
}

/**
 * Parse multiple lines (one item per line).
 */
export function parseItems(text: string): ParsedItem[] {
  return text
    .split('\n')
    .map(line => parseItem(line.trim()))
    .filter((item): item is ParsedItem => item !== null);
}
