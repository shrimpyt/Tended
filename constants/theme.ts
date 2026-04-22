// ─────────────────────────────────────────────────────────────────────────────
// Tended Design System — Color Tokens
// Light theme is default; dark theme used when colorScheme === 'dark'
// ─────────────────────────────────────────────────────────────────────────────

export const LightColors = {
  // Backgrounds
  background:    '#F5F0EA',  // warm cream
  surface:       '#FEFCF9',
  surfaceAlt:    '#EDE7DD',
  surfaceElevated: '#FEFCF9',

  // Text
  textPrimary:   '#1C1916',
  textSecondary: '#7A6E68',
  textMuted:     '#A89A94',

  // Border
  border:        '#E8E0D4',

  // Accent — terracotta
  accent:        '#B5673E',
  accentBg:      '#F5E8DA',

  // Semantic
  danger:        '#B54242',
  dangerBg:      '#F5DADA',
  success:       '#3D8B5C',
  successBg:     '#E4F0EA',
  info:          '#5270A8',
  infoBg:        '#DAE4F5',
  warning:       '#A07830',
  warningBg:     '#F5EAD8',

  // Legacy aliases used by existing code
  blue:          '#5270A8',
  blueHighlight: 'rgba(82, 112, 168, 0.15)',
  green:         '#3D8B5C',
  amber:         '#A07830',
  red:           '#B54242',
} as const;

export const DarkColors = {
  // Backgrounds
  background:    '#171310',
  surface:       '#211C18',
  surfaceAlt:    '#2C2620',
  surfaceElevated: '#2C2620',

  // Text
  textPrimary:   '#F0E8DE',
  textSecondary: '#9A8E88',
  textMuted:     '#6A5E58',

  // Border
  border:        '#38302A',

  // Accent — terracotta (slightly brighter in dark)
  accent:        '#C8804A',
  accentBg:      '#2E2018',

  // Semantic
  danger:        '#D46060',
  dangerBg:      '#2E1818',
  success:       '#5BAF7A',
  successBg:     '#182E22',
  info:          '#7090C8',
  infoBg:        '#1A2238',
  warning:       '#C09040',
  warningBg:     '#2E2410',

  // Legacy aliases
  blue:          '#7090C8',
  blueHighlight: 'rgba(112, 144, 200, 0.15)',
  green:         '#5BAF7A',
  amber:         '#C09040',
  red:           '#D46060',
} as const;

// Default export: light colors (screens use useTheme() hook at runtime)
export const Colors = LightColors;

// ─────────────────────────────────────────────────────────────────────────────
// Category Colors — pantry dot colors
// ─────────────────────────────────────────────────────────────────────────────

export const CategoryColors: Record<string, string> = {
  Pantry:     '#C17A4A',
  Dairy:      '#5270A8',
  Produce:    '#3D8B5C',
  Meat:       '#B54242',
  Frozen:     '#4B8FA8',
  Beverages:  '#7B5CA8',
  Household:  '#A8844A',
  Cleaning:   '#A8844A',
  Kitchen:    '#C17A4A',
  Bathroom:   '#7B5CA8',
  Groceries:  '#3D8B5C',
  'Personal care': '#7B5CA8',
};

export const DEFAULT_CATEGORY_COLOR = '#A89A94';

// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

export const Typography = {
  weights: {
    regular:  '400' as const,
    medium:   '500' as const,
    semiBold: '600' as const,
    bold:     '700' as const,
  },
  sizes: {
    xs:   12,
    sm:   14,
    md:   16,
    lg:   18,
    xl:   22,
    xxl:  28,
    xxxl: 36,
    display: 48,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Spacing / Radius / Border
// ─────────────────────────────────────────────────────────────────────────────

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const Radius = {
  xs:   6,
  sm:   10,   // inputs, buttons
  md:   12,   // cards (min)
  lg:   16,   // cards (max)
  xl:   24,
  full: 99,   // pills / chips
} as const;

export const Border = {
  width: 1,
  color: LightColors.border,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shadows — light-mode friendly
// ─────────────────────────────────────────────────────────────────────────────

export const Shadows = {
  soft: {
    shadowColor: '#1C1916',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#1C1916',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  glow: {
    shadowColor: '#B5673E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
