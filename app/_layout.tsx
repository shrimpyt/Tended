import React, {useEffect} from 'react';
import {View, ActivityIndicator, StyleSheet, AppState, AppStateStatus, Platform} from 'react-native';
import {Slot, useRouter, useSegments} from 'expo-router';
import {QueryClient, onlineManager, focusManager} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {supabase} from '../lib/supabase';
import {useAuthStore} from '../store/authStore';
import {Colors} from '../constants/theme';
import {StatusBar} from 'expo-status-bar';
import {registerForPushNotificationsAsync} from '../utils/notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected);
  });
});

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

function InitialLayout() {
  const {session, profile, setSession, fetchProfile} = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession()
      .then(({data: {session: s}}) => {
        setSession(s);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });

    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    if (session) fetchProfile();
  }, [session, fetchProfile]);

  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', onAppStateChange);
    return () => appStateSub.remove();
  }, []);

  useEffect(() => {
    /*
    if (session && profile) {
      registerForPushNotificationsAsync().then((token) => {
        if (token && token !== profile.expo_push_token) {
          supabase.from('profiles').update({ expo_push_token: token }).eq('id', profile.id).then(() => {
            fetchProfile();
          });
        }
      });
    }
    */
  }, [session, profile, fetchProfile]);

  useEffect(() => {
    if (loading) return;

    const seg0 = segments[0] as string | undefined;
    const isAuthRoute = seg0 === 'sign-in' || seg0 === 'sign-up' || seg0 === 'forgot-password';
    const isLandingRoute = seg0 === 'landing';
    const isHouseholdRoute = seg0 === 'household';
    const isOnboardingRoute = seg0 === 'onboarding';
    const isSettingsRoute = seg0 === 'settings';

    if (!session) {
      // Unauthenticated: allow landing and auth routes; redirect everything else to landing
      if (!isAuthRoute && !isLandingRoute) {
        router.replace('/landing');
      }
    } else {
      // Authenticated
      if (!profile?.household_id) {
        // No household yet
        if (!isHouseholdRoute) {
          router.replace('/household');
        }
      } else if (!profile?.has_onboarded) {
        // Has household but hasn't seen onboarding
        if (!isOnboardingRoute) {
          router.replace('/onboarding');
        }
      } else {
        // Fully set up — redirect away from auth/landing/household/onboarding
        if (isAuthRoute || isLandingRoute || isHouseholdRoute || isOnboardingRoute) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [session, profile, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <InitialLayout />
      </SafeAreaProvider>
    </PersistQueryClientProvider>
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
