import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, Laptop, Globe, Clock, X, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Session {
  id: string;
  logged_in_at: string;
  last_used_at: string;
  expires_at: string;
  device_info: string;
  ip_address: string;
  location: string;
  session_status: 'active' | 'recent' | 'idle' | 'inactive';
  seconds_until_expiry: number;
}

export const SessionManagement: React.FC = () => {
  const { user, logoutAllDevices, tokenExpiresIn } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch active sessions for the current user
   */
  const fetchSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_sessions_detail')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setSessions(data || []);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Revoke a specific session
   */
  const revokeSession = async (sessionId: string) => {
    try {
      setRevoking(sessionId);
      setError(null);

      const { error: deleteError } = await supabase
        .from('refresh_tokens')
        .delete()
        .eq('id', sessionId);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh session list
      await fetchSessions();
    } catch (err: any) {
      console.error('Error revoking session:', err);
      setError(err.message || 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  /**
   * Logout from all devices
   */
  const handleLogoutAll = async () => {
    if (!confirm('Are you sure you want to logout from all devices? You will need to sign in again.')) {
      return;
    }

    try {
      setRevokingAll(true);
      setError(null);
      await logoutAllDevices();
    } catch (err: any) {
      console.error('Error logging out all devices:', err);
      setError(err.message || 'Failed to logout from all devices');
      setRevokingAll(false);
    }
  };

  /**
   * Get icon based on device type
   */
  const getDeviceIcon = (deviceInfo: string) => {
    if (deviceInfo.includes('Mobile')) return <Smartphone className="w-5 h-5" />;
    if (deviceInfo.includes('Tablet')) return <Tablet className="w-5 h-5" />;
    if (deviceInfo.includes('Mac')) return <Laptop className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  /**
   * Format date to relative time
   */
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  /**
   * Format expiry time
   */
  const formatExpiryTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'recent': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'idle': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'inactive': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  useEffect(() => {
    fetchSessions();
    
    // Refresh sessions every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-green-400 mb-1">Active Sessions</h2>
          <p className="text-gray-400 text-sm">
            Manage your active login sessions across devices
          </p>
        </div>
        <button
          onClick={handleLogoutAll}
          disabled={revokingAll || sessions.length === 0}
          className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {revokingAll ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          {revokingAll ? 'Logging out...' : 'Logout All Devices'}
        </button>
      </div>

      {/* Token Expiry Info */}
      {tokenExpiresIn && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-400 font-medium">Current Session</p>
            <p className="text-gray-400 text-sm">
              Your access token expires in {Math.floor(tokenExpiresIn / 60)} minutes. 
              It will automatically refresh.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-green-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading sessions...</p>
        </div>
      )}

      {/* No Sessions */}
      {!loading && sessions.length === 0 && (
        <div className="text-center py-12">
          <Monitor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No active sessions found</p>
          <p className="text-gray-500 text-sm">Your sessions will appear here when you sign in</p>
        </div>
      )}

      {/* Sessions List */}
      {!loading && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-green-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Device Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-green-400 mt-1">
                    {getDeviceIcon(session.device_info)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-green-400 font-medium">
                        {session.device_info || 'Unknown Device'}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(session.session_status)}`}>
                        {session.session_status}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{session.ip_address || 'Unknown IP'}</span>
                        {session.location && (
                          <span className="text-gray-500">• {session.location}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last active: {formatRelativeTime(session.last_used_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Expires in: {formatExpiryTime(session.seconds_until_expiry)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Revoke this session"
                >
                  {revoking === session.id ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Info Footer */}
      {!loading && sessions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <p className="text-gray-400 text-sm text-center">
            You have {sessions.length} active session{sessions.length > 1 ? 's' : ''} across your devices
          </p>
        </div>
      )}
    </div>
  );
};
