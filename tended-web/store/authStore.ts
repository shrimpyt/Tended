import {create} from 'zustand';
import {Session, User} from '@supabase/supabase-js';
import {supabase} from '../lib/supabase';

export type ProfileRole = 'creator' | 'admin' | 'member' | 'restricted';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  household_id: string | null;
  role: ProfileRole;
  dietary_restrictions: string[];
  restricted_categories: string[] | null;
  has_onboarded: boolean;
  expo_push_token?: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;

  setLoading: (loading: boolean) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  setLoading: (loading) => set({loading}),

  setSession: (session) =>
    set({session, user: session?.user ?? null}),

  setProfile: (profile) =>
    set({profile, loading: false}),

  setLoading: (loading) =>
    set({loading}),

  fetchProfile: async () => {
    const {user} = get();
    if (!user) {
      set({loading: false});
      return;
    }

    try {
      const {data, error} = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        set({profile: data as Profile, loading: false});
      } else {
        set({loading: false});
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      set({loading: false});
    }
  },

  signOut: async () => {
    const {error} = await supabase.auth.signOut();
    if (error) console.warn('Sign out error:', error.message);
    // Always clear local state so the user returns to the auth screen
    set({session: null, user: null, profile: null});
  },
}));
