import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  refreshToken: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  tokenExpiresIn: number | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshToken: async () => {},
  logoutAllDevices: async () => {},
  tokenExpiresIn: null,
});

const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  /**
   * Logout all devices by signing out
   */
  const logoutAllDevices = useCallback(async () => {
    try {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error logging out all devices:', err);
    }
  }, []);

  /**
   * Refresh the access token using the stored refresh token
   */
  const refreshToken = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase.functions.invoke('refresh-token', {
        body: {},
        credentials: 'include'
      });

      if (error) {
        console.error('Token refresh error:', error);
        await supabase.auth.signOut();
        return;
      }

      if (data && data.access_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: '', // Not returned in body anymore (in HttpOnly cookie)
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          return;
        }

        setTokenExpiresIn(data.expires_in);
        console.log('Token refreshed successfully');
      }
    } catch (err) {
      console.error('Unexpected error refreshing token:', err);
    }
  }, []);

  /**
   * Create user profile if it doesn't exist
   */
  const ensureProfileExists = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        await supabase.from('profiles').insert({
          user_id: userId,
          team_name: null,
          leader_name: null,
          role: 'user',
        });
        console.log('Profile created for user', userId);
      } else if (!error && data) {
        console.log('Profile already exists for user', userId);
      }
    } catch (err) {
      console.error('Error ensuring profile exists:', err);
    }
  }, []);

  /**
   * Setup automatic token refresh timer
   */
  const setupRefreshTimer = useCallback(() => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Set up new timer to refresh token periodically
    refreshTimerRef.current = window.setInterval(() => {
      refreshToken();
    }, TOKEN_REFRESH_INTERVAL);
  }, [refreshToken]);

  /**
   * Initialize auth state and setup listeners
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Get initial session from local storage or auth state
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!error && mounted) {
          setUser(session?.user ?? null);

          // Ensure profile exists if user is logged in
          if (session?.user) {
            await ensureProfileExists(session.user.id);
          }

          // If session exists, setup refresh timer
          if (session) {
            const expiresIn = session.expires_in || 900; // Default 15 min
            setTokenExpiresIn(expiresIn);
            setupRefreshTimer();
          }

          setLoading(false);
        } else if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.warn('Failed to initialize auth session:', err);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    let subscription: any = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

          setUser(session?.user ?? null);
          setLoading(false);

          if (event === 'SIGNED_IN' && session?.user) {
            await ensureProfileExists(session.user.id);
            const expiresIn = session.expires_in || 900;
            setTokenExpiresIn(expiresIn);
            setupRefreshTimer();
          }

          if (event === 'SIGNED_OUT') {
            if (refreshTimerRef.current) {
              clearInterval(refreshTimerRef.current);
              refreshTimerRef.current = null;
            }
          }

          if (event === 'TOKEN_REFRESHED' && session) {
            setTokenExpiresIn(session.expires_in);
          }
        }
      );
      subscription = data;
    }

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe();
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [setupRefreshTimer, ensureProfileExists]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      refreshToken, 
      logoutAllDevices,
      tokenExpiresIn 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);