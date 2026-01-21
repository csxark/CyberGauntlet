import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { ChallengePage } from './components/ChallengePage';
import DocsPage from './components/DocsPage'; // Ensure this path matches where you saved DocsPage.tsx
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { AlertTriangle } from 'lucide-react';

function generateDeviceId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// --- NEW: THEMED 404 PAGE ---
const NotFound = () => (
  <div className="min-h-screen bg-[#050505] text-green-500 font-mono flex flex-col items-center justify-center p-4">
    <div className="border border-red-500/50 p-8 rounded bg-red-900/10 max-w-md w-full text-center relative overflow-hidden">
      {/* Glitch Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ff0000_10px,#ff0000_20px)]"></div>
      
      <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
      <h1 className="text-4xl font-black text-white mb-2">404 ERROR</h1>
      <p className="text-red-400 mb-6">SIGNAL LOST. COORDINATES INVALID.</p>
      
      <div className="font-mono text-xs text-red-500/50 mb-8 text-left space-y-1">
        <p>{'>'} trace_route(current_loc)</p>
        <p>{'>'} ERROR: Destination unreachable</p>
        <p>{'>'} initiating_emergency_protocol...</p>
      </div>

      <Link 
        to="/" 
        className="inline-block bg-red-600 hover:bg-red-500 text-black font-bold py-3 px-8 rounded transition-all hover:scale-105"
      >
        RETURN TO BASE
      </Link>
    </div>
  </div>
);

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [deviceRestricted, setDeviceRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
          navigate('/restricted');
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
      navigate('/challenges');
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
      setDeviceRestricted(false);
      localStorage.removeItem('cybergauntlet_auth');
      navigate('/');
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  useEffect(() => {
    if (deviceRestricted) {
      navigate('/restricted', { replace: true });
    }
  }, [deviceRestricted, navigate]);

  function DeviceRestrictedPage() {
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
            onClick={() => navigate('/')}
            className="bg-red-600 hover:bg-red-700 text-black font-bold py-2 px-6 rounded transition-all"
          >
            GO TO HOME
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      
      {/* --- ADDED DOCS ROUTE --- */}
      <Route path="/docs" element={<DocsPage />} />

      <Route 
        path="/auth" 
        element={
          authenticated ? (
            <Navigate to="/challenges" replace />
          ) : deviceRestricted ? (
            <Navigate to="/restricted" replace />
          ) : (
            <AuthPage onAuth={handleAuth} />
          )
        } 
      />
      
      <Route
        path="/restricted"
        element={<DeviceRestrictedPage />}
      />
      
      <Route
        path="/challenges"
        element={
          deviceRestricted ? (
            <Navigate to="/restricted" replace />
          ) : authenticated ? (
            <ChallengePage
              teamId={teamId}
              teamName={teamName}
              leaderName={leaderName}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
      
      {/* --- UPDATED CATCH-ALL ROUTE --- */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;