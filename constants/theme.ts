export const Colors = {
  // Backgrounds
  background: '#0d1117',
  surface: '#161b22',

  // Borders
  border: '#21262d',

  // Accents
  blue: '#388bfd',
  green: '#3fb950',
  amber: '#d29922',
  red: '#f85149',

  // Text
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
} as const;

export const Typography = {
  weights: {
    regular: '400' as const,
    medium: '500' as const,
  },
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
} as const;

export const Border = {
  width: 0.5,
  color: '#21262d',
} as const;
