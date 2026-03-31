import React from 'react';
import {Tabs} from 'expo-router';
import {Text, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Shadows} from '../../constants/theme';

const TAB_ICONS: Record<string, string> = {
  index: '⊞',
  inventory: '▤',
  spending: '$',
  meals: '⊡',
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom - 10 : 16;

  return (
    <Tabs
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surfaceElevated,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          marginHorizontal: 16,
          marginBottom: Math.max(bottomPadding, 16),
          borderRadius: 32,
          position: 'absolute',
          ...Shadows.medium,
        },
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.medium,
        },
        tabBarIcon: ({color}) => (
          <Text style={{fontSize: 18, color}}>
            {TAB_ICONS[route.name] || '?'}
          </Text>
        ),
      })}>
      <Tabs.Screen 
        name="index" 
        options={{
          title: 'Dashboard',
        }} 
      />
      <Tabs.Screen 
        name="inventory" 
        options={{
          title: 'Inventory',
        }} 
      />
      <Tabs.Screen 
        name="spending" 
        options={{
          title: 'Spending',
        }} 
      />
      <Tabs.Screen 
        name="meals" 
        options={{
          title: 'Meals',
        }} 
      />
    </Tabs>
  );
}
