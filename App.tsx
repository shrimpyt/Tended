import React, {useEffect, useState} from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {supabase} from './lib/supabase';
import {useAuthStore} from './store/authStore';
import TabNavigator from './navigation/TabNavigator';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import HouseholdScreen from './screens/auth/HouseholdScreen';
import {Colors} from './constants/theme';

type AuthScreen = 'signIn' | 'signUp';

export default function App() {
  const {session, profile, setSession, fetchProfile} = useAuthStore();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('signIn');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore existing session on launch
    supabase.auth.getSession().then(({data: {session: s}}) => {
      setSession(s);
      setLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile whenever session changes
  useEffect(() => {
    if (session) fetchProfile();
  }, [session]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  // Not signed in — show auth screens
  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        {authScreen === 'signIn'
          ? <SignInScreen onNavigateToSignUp={() => setAuthScreen('signUp')} />
          : <SignUpScreen onNavigateToSignIn={() => setAuthScreen('signIn')} />
        }
      </SafeAreaProvider>
    );
  }

  // Signed in but no household yet
  if (!profile?.household_id) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <HouseholdScreen />
      </SafeAreaProvider>
    );
  }

  // Fully authenticated — show the app
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
