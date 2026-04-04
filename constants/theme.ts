export const Colors = {
  // Midnight Dark Base
  background: '#050505',
  surface: '#121212',
  surfaceElevated: '#1A1A1A',

  // Borders
  border: '#2A2A2A',

  // Vibrant Accents
  blue: '#0A84FF', // iOS-style vibrant blue
  blueHighlight: 'rgba(10, 132, 255, 0.15)', // Light blue background for interactive elements
  green: '#30D158', 
  amber: '#FFD60A',
  red: '#FF453A',

  // Text
  textPrimary: '#F2F2F7',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
} as const;

export const Typography = {
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 34,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 9999,
} as const;

export const Border = {
  width: 1,
  color: '#2A2A2A',
} as const;

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  }
} as const;
