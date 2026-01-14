import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { ChallengePage } from './components/ChallengePage';
import { supabase, isSupabaseConfigured } from './lib/supabase';

function generateDeviceId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [deviceRestricted, setDeviceRestricted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const savedAuth = localStorage.getItem('cybergauntlet_auth');
      const currentDeviceId = localStorage.getItem('cybergauntlet_current_device') || (() => {
        const id = generateDeviceId();
        localStorage.setItem('cybergauntlet_current_device', id);
        return id;
      })();

      if (savedAuth && isSupabaseConfigured) {
        const auth = JSON.parse(savedAuth);
        const { data: session, error } = await supabase
          .from('team_sessions')
          .select('*')
          .eq('team_id', auth.teamId)
          .maybeSingle();

        if (!error && session) {
          if (session.device_id !== currentDeviceId && session.is_active) {
            setDeviceRestricted(true);
            setLoading(false);
            return;
          }

          if (session.device_id === currentDeviceId && session.is_active) {
            setTeamId(auth.teamId);
            setTeamName(auth.teamName);
            setLeaderName(auth.leaderName);
            setAuthenticated(true);
            setLoading(false);
            return;
          }
        }
      }

      // If Supabase is not configured, fallback to trusting local auth state
      if (savedAuth && !isSupabaseConfigured) {
        const auth = JSON.parse(savedAuth);
        setTeamId(auth.teamId);
        setTeamName(auth.teamName);
        setLeaderName(auth.leaderName);
        setAuthenticated(true);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error checking auth status:', err);
      setLoading(false);
    }
  };

  const handleAuth = async (id: string, name: string, leader: string) => {
    try {
      const currentDeviceId = localStorage.getItem('cybergauntlet_current_device') || generateDeviceId();
      localStorage.setItem('cybergauntlet_current_device', currentDeviceId);

      if (isSupabaseConfigured) {
        const { data: existingSession, error: fetchError } = await supabase
          .from('team_sessions')
          .select('*')
          .eq('team_id', id)
          .maybeSingle();

        if (fetchError && (fetchError as any).code !== 'PGRST116') {
          throw fetchError;
        }

        if (existingSession && existingSession.is_active) {
          setDeviceRestricted(true);
          return;
        }

        if (existingSession && !existingSession.is_active) {
          await supabase
            .from('team_sessions')
            .update({
              device_id: currentDeviceId,
              logged_in_at: new Date().toISOString(),
              is_active: true,
              last_activity: new Date().toISOString()
            })
            .eq('team_id', id);
        } else {
          await supabase
            .from('team_sessions')
            .insert({
              team_id: id,
              device_id: currentDeviceId,
              is_active: true
            });
        }
      }

      setTeamId(id);
      setTeamName(name);
      setLeaderName(leader);
      setAuthenticated(true);
      localStorage.setItem('cybergauntlet_auth', JSON.stringify({ teamId: id, teamName: name, leaderName: leader }));
    } catch (err) {
      console.error('Error during authentication:', err);
      alert('Authentication failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      if (teamId && isSupabaseConfigured) {
        await supabase
          .from('team_sessions')
          .update({ is_active: false })
          .eq('team_id', teamId);
      }

      setAuthenticated(false);
      setTeamId('');
      setTeamName('');
      setLeaderName('');
      localStorage.removeItem('cybergauntlet_auth');
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 text-green-500">⌛</div>
          </div>
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  if (deviceRestricted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-red-400 font-mono flex items-center justify-center p-4">
        <div className="scanlines"></div>
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="mb-6">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">ACCESS RESTRICTED</h1>
            <p className="text-red-300/80 mb-4">
              This team is already logged in from another device.
            </p>
            <p className="text-red-300/60 text-sm">
              Only one device per team is allowed at any time. Please log out from the active device first.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-black font-bold py-2 px-6 rounded transition-all"
          >
            REFRESH
          </button>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <ChallengePage
      teamId={teamId}
      teamName={teamName}
      leaderName={leaderName}
      onLogout={handleLogout}
    />
  );
}

export default App;
