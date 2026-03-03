import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
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

const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // Refresh 1 minute before expiry (14 min if token expires in 15)
const TOKEN_STORAGE_KEY = 'cybergauntlet_refresh_token';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  /**
   * Refresh the access token using the stored refresh token
   */
  const refreshToken = useCallback(async () => {
    try {
      const storedRefreshToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      
      if (!storedRefreshToken) {
        console.log('No refresh token found');
        return;
      }

      const { data, error } = await supabase.functions.invoke('refresh-token', {
        body: { refresh_token: storedRefreshToken }
      });

      if (error) {
        console.error('Token refresh error:', error);
        // If refresh fails, clear tokens and force re-login
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        await supabase.auth.signOut();
        return;
      }

      if (data && data.access_token && data.refresh_token) {
        // Store new refresh token
        localStorage.setItem(TOKEN_STORAGE_KEY, data.refresh_token);
        
        // Set the new session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
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
   * Logout from all devices by revoking all refresh tokens
   */
  const logoutAllDevices = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('refresh-token', {
        body: { logout_all: true }
      });

      if (error) {
        console.error('Error logging out all devices:', error);
        throw error;
      }

      // Clear local storage and sign out
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      await supabase.auth.signOut();
      
      console.log('Logged out from all devices');
    } catch (err) {
      console.error('Unexpected error logging out:', err);
      throw err;
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
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
      
      // If session exists, setup refresh timer
      if (data.session) {
        const expiresIn = data.session.expires_in || 900; // Default 15 min
        setTokenExpiresIn(expiresIn);
        setupRefreshTimer();
      }
    });

    // Listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session) {
          // Store refresh token on sign in
          if (session.refresh_token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, session.refresh_token);
          }
          
          const expiresIn = session.expires_in || 900;
          setTokenExpiresIn(expiresIn);
          setupRefreshTimer();
        }

        if (event === 'SIGNED_OUT') {
          // Clear refresh token on sign out
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
        }

        if (event === 'TOKEN_REFRESHED' && session) {
          // Update stored refresh token after Supabase auto-refresh
          if (session.refresh_token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, session.refresh_token);
          }
        }
      }
    );

    // Cleanup on unmount
    return () => {
      subscription?.subscription?.unsubscribe();
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [setupRefreshTimer]);

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