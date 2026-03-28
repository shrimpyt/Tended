import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import {Colors, Typography} from '../constants/theme';
import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import SpendingScreen from '../screens/SpendingScreen';
import MealsScreen from '../screens/MealsScreen';

export type TabParamList = {
  Dashboard: undefined;
  Inventory: undefined;
  Spending: undefined;
  Meals: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, string> = {
  Dashboard: '⊞',
  Inventory: '▤',
  Spending: '$',
  Meals: '⊡',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.medium,
        },
        tabBarIcon: ({color}) => (
          <Text style={{fontSize: 18, color}}>
            {TAB_ICONS[route.name as keyof TabParamList]}
          </Text>
        ),
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Spending" component={SpendingScreen} />
      <Tab.Screen name="Meals" component={MealsScreen} />
    </Tab.Navigator>
  );
}
