import { LightColors, DarkColors } from '../constants/theme';

export interface ExpiryInfo {
  label: string;
  /** Hex color for the badge */
  color: string;
  /** Background color for the badge */
  bgColor: string;
  /** Days until expiry (negative = expired) */
  daysUntil: number;
}

/**
 * Given an ISO date string (YYYY-MM-DD) returns a human-readable expiry label
 * and the appropriate badge colors from the design system.
 */
export function getExpiryInfo(
  dateStr: string | null | undefined,
  isDark = false,
): ExpiryInfo | null {
  if (!dateStr) return null;

  const C = isDark ? DarkColors : LightColors;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + 'T00:00:00');
  const daysUntil = Math.round(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntil < 0) {
    return {
      label: 'Expired',
      color: C.danger,
      bgColor: C.dangerBg,
      daysUntil,
    };
  }
  if (daysUntil === 0) {
    return {
      label: 'Today',
      color: C.danger,
      bgColor: C.dangerBg,
      daysUntil,
    };
  }
  if (daysUntil === 1) {
    return {
      label: 'Tomorrow',
      color: C.warning,
      bgColor: C.warningBg,
      daysUntil,
    };
  }
  if (daysUntil <= 7) {
    return {
      label: `${daysUntil}d`,
      color: C.warning,
      bgColor: C.warningBg,
      daysUntil,
    };
  }
  return {
    label: `${daysUntil}d`,
    color: C.textSecondary,
    bgColor: C.surfaceAlt,
    daysUntil,
  };
}
