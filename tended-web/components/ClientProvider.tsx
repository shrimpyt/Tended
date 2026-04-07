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
  const { session, profile, loading: authLoading, setSession, fetchProfile, setLoading: setAuthLoading } = useAuthStore();
  const [sessionResolved, setSessionResolved] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setSessionResolved(true);
      })
      .catch((e) => {
        console.error(e);
        setSessionResolved(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    if (session) {
      fetchProfile();
    } else if (sessionResolved) {
      setAuthLoading(false);
    }
  }, [session, sessionResolved, fetchProfile, setAuthLoading]);

  useEffect(() => {
    if (!sessionResolved || authLoading) return;

    const isAuthRoute = pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/forgot-password';
    const isLandingRoute = pathname === '/';
    const isDashboardRoute = pathname === '/dashboard';
    const isHouseholdRoute = pathname === '/household';
    const isOnboardingRoute = pathname === '/onboarding';
    const isDesignLab = pathname === '/design-lab';

    if (!session) {
      // Guest users: Allow landing, auth routes, and design lab
      if (!isLandingRoute && !isAuthRoute && !isDesignLab) {
        router.replace('/');
      }
    } else {
      // Authenticated users:
      if (!profile?.household_id) {
        if (!isHouseholdRoute && !isDesignLab) {
          router.replace('/household');
        }
      } else if (!profile?.has_onboarded) {
        if (!isOnboardingRoute && !isDesignLab) {
          router.replace('/onboarding');
        }
      } else {
        // Fully onboarded:
        // Redirect them to /dashboard if they are on an auth route, the landing page, or household/onboarding
        if (isAuthRoute || isLandingRoute || isHouseholdRoute || isOnboardingRoute) {
          router.replace('/dashboard');
        }
      }
    }
  }, [session, profile, sessionResolved, authLoading, pathname, router]);

  if (!sessionResolved || authLoading) {
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
