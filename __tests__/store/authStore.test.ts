import {useAuthStore} from '../../store/authStore';
import {supabase} from '../../lib/supabase';

// Reset the store between tests
beforeEach(() => {
  useAuthStore.setState({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });
  jest.clearAllMocks();
});

const mockSession = {
  user: {id: 'user-123', email: 'test@example.com'},
  access_token: 'token-abc',
} as any;

const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test User',
  household_id: 'hh-001',
  expo_push_token: null,
};

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('has null session, user, profile and loading=true by default', () => {
      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.loading).toBe(true);
    });
  });

  describe('setSession', () => {
    it('sets session and extracts user from it', () => {
      useAuthStore.getState().setSession(mockSession);
      const state = useAuthStore.getState();
      expect(state.session).toBe(mockSession);
      expect(state.user).toBe(mockSession.user);
    });

    it('clears user when session is null', () => {
      useAuthStore.setState({session: mockSession, user: mockSession.user});
      useAuthStore.getState().setSession(null);
      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('setProfile', () => {
    it('stores the given profile', () => {
      useAuthStore.getState().setProfile(mockProfile);
      expect(useAuthStore.getState().profile).toEqual(mockProfile);
    });

    it('clears profile when null is passed', () => {
      useAuthStore.setState({profile: mockProfile});
      useAuthStore.getState().setProfile(null);
      expect(useAuthStore.getState().profile).toBeNull();
    });
  });

  describe('fetchProfile', () => {
    it('does nothing if there is no user in state', async () => {
      await useAuthStore.getState().fetchProfile();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('fetches profile from supabase and stores it', async () => {
      useAuthStore.setState({user: mockSession.user as any});

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({data: mockProfile, error: null}),
      }));

      await useAuthStore.getState().fetchProfile();
      expect(useAuthStore.getState().profile).toEqual(mockProfile);
    });

    it('does not update profile when supabase returns an error', async () => {
      useAuthStore.setState({user: mockSession.user as any, profile: null});

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({data: null, error: {message: 'Not found'}}),
      }));

      await useAuthStore.getState().fetchProfile();
      expect(useAuthStore.getState().profile).toBeNull();
    });
  });

  describe('signOut', () => {
    it('clears session, user, and profile after successful sign out', async () => {
      useAuthStore.setState({session: mockSession as any, user: mockSession.user as any, profile: mockProfile});

      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({error: null});

      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
    });

    it('still clears local state even when sign out returns an error', async () => {
      useAuthStore.setState({session: mockSession as any, user: mockSession.user as any, profile: mockProfile});

      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({error: {message: 'network error'}});

      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
    });
  });
});
