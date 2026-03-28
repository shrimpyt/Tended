import {create} from 'zustand';
import {Session, User} from '@supabase/supabase-js';
import {supabase} from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  household_id: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  setSession: (session) =>
    set({session, user: session?.user ?? null}),

  setProfile: (profile) =>
    set({profile}),

  fetchProfile: async () => {
    const {user} = get();
    if (!user) return;

    const {data, error} = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      set({profile: data as Profile});
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({session: null, user: null, profile: null});
  },
}));
