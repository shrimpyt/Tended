import { CategoryColors, DEFAULT_CATEGORY_COLOR } from '../constants/theme';

/**
 * Returns the dot color for a given inventory category.
 */
export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return DEFAULT_CATEGORY_COLOR;
  return CategoryColors[category] ?? DEFAULT_CATEGORY_COLOR;
}

/**
 * Returns a semi-transparent background for category chips (dark mode style).
 */
export function getCategoryChipBg(
  category: string | null | undefined,
  opacity = 0.16,
): string {
  const color = getCategoryColor(category);
  // Parse hex → rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
