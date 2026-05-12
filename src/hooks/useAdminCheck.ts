import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface AdminCheckResult {
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Reads `profiles.role` for the currently authenticated user.
 * Returns { isAdmin: true } only when role === 'admin'.
 */
export function useAdminCheck(): AdminCheckResult {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !isSupabaseConfigured) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!cancelled) {
          setIsAdmin(!error && data?.role === 'admin');
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || loading };
}
