/**
 * Map Open Food Facts category strings to a sensible default category.
 */
export function mapOFFCategory(categoriesStr: string | undefined): string {
  if (!categoriesStr) return 'Kitchen';
  const cats = categoriesStr.toLowerCase();
  if (
    cats.includes('cleaning') ||
    cats.includes('household') ||
    cats.includes('detergent') ||
    cats.includes('dishwash') ||
    cats.includes('laundry') ||
    cats.includes('trash') ||
    cats.includes('paper-towel') ||
    cats.includes('toilet-paper') ||
    cats.includes('paper')
  ) return 'Cleaning';
  if (
    cats.includes('hygiene') ||
    cats.includes('beauty') ||
    cats.includes('personal-care') ||
    cats.includes('shampoo') ||
    cats.includes('soap') ||
    cats.includes('toothpaste') ||
    cats.includes('deodorant') ||
    cats.includes('cosmetic') ||
    cats.includes('cosmetics') ||
    cats.includes('bathroom') ||
    cats.includes('toilet')
  ) return 'Bathroom';
  if (
    cats.includes('pasta') ||
    cats.includes('rice') ||
    cats.includes('cereal') ||
    cats.includes('flour') ||
    cats.includes('sugar') ||
    cats.includes('oil') ||
    cats.includes('sauce') ||
    cats.includes('condiment') ||
    cats.includes('canned') ||
    cats.includes('spice') ||
    cats.includes('coffee') ||
    cats.includes('tea') ||
    cats.includes('pantry') ||
    cats.includes('groceries') ||
    cats.includes('snack') ||
    cats.includes('dry') ||
    cats.includes('baking')
  ) return 'Pantry';
  return 'Kitchen';
}

/**
 * Extract a clean unit from the quantity field.
 */
export function parseUnit(quantity: string | undefined): string {
  if (!quantity) return '';
  // Match units that are either separate words or follow a digit (e.g., "500ml")
  const match = quantity.match(/(?:\b|(?<=\d))(ml|l|g|kg|oz|lb|fl oz|count|rolls|sheets|pack|packs)\b/i);
  return match ? match[1].toLowerCase() : '';
}
