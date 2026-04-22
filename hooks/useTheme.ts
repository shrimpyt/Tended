import { useState, useEffect, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors } from '../constants/theme';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@tended/theme_preference';

let _preference: ThemePreference = 'system';
let _listeners: Array<() => void> = [];

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

function resolveColors(pref: ThemePreference, systemScheme: ColorSchemeName) {
  const isDark =
    pref === 'dark' || (pref === 'system' && systemScheme === 'dark');
  return isDark ? DarkColors : LightColors;
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(_preference);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );

  // Subscribe to OS theme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  // Subscribe to explicit preference changes from other screens
  useEffect(() => {
    const listener = () => setPreference(_preference);
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter(l => l !== listener);
    };
  }, []);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        _preference = stored;
        notifyListeners();
      }
    });
  }, []);

  const changeTheme = useCallback(async (pref: ThemePreference) => {
    _preference = pref;
    notifyListeners();
    await AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  const colors = resolveColors(preference, systemScheme);
  const isDark =
    preference === 'dark' ||
    (preference === 'system' && systemScheme === 'dark');

  return { theme: preference, colors, isDark, setTheme: changeTheme };
}

// Convenience: get current colors without React (for stylesheets defined at
// module level — they'll use the light palette as the default).
export function getColors(preference: ThemePreference = 'system') {
  const scheme = Appearance.getColorScheme();
  return resolveColors(preference, scheme);
}
