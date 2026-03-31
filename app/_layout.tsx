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
    if (session && profile) {
      registerForPushNotificationsAsync().then((token) => {
        if (token && token !== profile.expo_push_token) {
          supabase.from('profiles').update({ expo_push_token: token }).eq('id', profile.id).then(() => {
            fetchProfile();
          });
        }
      });
    }
  }, [session, profile, fetchProfile]);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = segments[0] === 'sign-in' || segments[0] === 'sign-up';
    const isHouseholdRoute = segments[0] === 'household';

    if (!session) {
      if (!isAuthRoute) {
        router.replace('/sign-in');
      }
    } else {
      if (!profile?.household_id) {
        if (!isHouseholdRoute) {
          router.replace('/household');
        }
      } else {
        if (isAuthRoute || isHouseholdRoute) {
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
