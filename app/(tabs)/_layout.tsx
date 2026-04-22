import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Typography } from '../../constants/theme';

// ─── Icon Components ──────────────────────────────────────────────────────────
// Using simple SVG-like Unicode shapes; replace with @expo/vector-icons if available

function TabIcon({
  symbol,
  color,
  active,
}: {
  symbol: string;
  color: string;
  active: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, { color, opacity: active ? 1 : 0.65 }]}>
        {symbol}
      </Text>
      {active && (
        <View style={[styles.activeDot, { backgroundColor: color }]} />
      )}
    </View>
  );
}

const TAB_SYMBOLS: Record<string, string> = {
  index:           '⊞',
  inventory:       '▤',
  'shopping-list': '☑',
  spending:        '◈',
  meals:           '⑁',
  settings:        '⊙',
};

const TAB_LABELS: Record<string, string> = {
  index:           'Home',
  inventory:       'Inventory',
  'shopping-list': 'List',
  spending:        'Spending',
  meals:           'Meals',
  settings:        'Settings',
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const { colors } = useTheme();
  const isRestricted = profile?.role === 'restricted';

  const bottomPadding = insets.bottom > 0 ? insets.bottom - 8 : 16;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 16),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          paddingTop: 8,
          // No rounded pill in this design — clean bottom bar
          position: 'absolute',
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.medium,
          marginTop: 0,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabIcon
            symbol={TAB_SYMBOLS[route.name] || '●'}
            color={color}
            active={focused}
          />
        ),
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ title: TAB_LABELS['index'] }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: TAB_LABELS['inventory'] }}
      />
      <Tabs.Screen
        name="shopping-list"
        options={{ title: TAB_LABELS['shopping-list'] }}
      />
      <Tabs.Screen
        name="spending"
        options={{
          title: TAB_LABELS['spending'],
          href: isRestricted ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: TAB_LABELS['meals'],
          href: isRestricted ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: TAB_LABELS['settings'] }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    gap: 3,
  },
  icon: {
    fontSize: 19,
    lineHeight: 22,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
});
