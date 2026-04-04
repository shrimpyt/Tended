'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, setSession, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    if (session) fetchProfile();
  }, [session, fetchProfile]);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/forgot-password';
    const isLandingRoute = pathname === '/landing';
    const isHouseholdRoute = pathname === '/household';
    const isOnboardingRoute = pathname === '/onboarding';
    const isDesignLab = pathname === '/design-lab';

    if (!session) {
      if (!isAuthRoute && !isLandingRoute && !isDesignLab) {
        router.replace('/landing');
      }
    } else {
      if (!profile?.household_id) {
        if (!isHouseholdRoute && !isDesignLab) {
          router.replace('/household');
        }
      } else if (!profile?.has_onboarded) {
        if (!isOnboardingRoute && !isDesignLab) {
          router.replace('/onboarding');
        }
      } else {
        if (isAuthRoute || isLandingRoute || isHouseholdRoute || isOnboardingRoute) {
          router.replace('/');
        }
      }
    }
  }, [session, profile, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
