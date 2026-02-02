import React, { useState, FormEvent } from 'react';
import { Shield } from 'lucide-react';
import { validateTeam } from '../data/teamData';
import { GlitchText } from './GlitchText';

interface AuthPageProps {
  onAuth: (teamId: string, teamName: string, leaderName: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuth }) => {
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));

    const team = validateTeam(teamName, leaderName);
    
    if (team) {
      onAuth(team.id.toLowerCase().replace(/\s+/g, ''), team.id, team.leaderName);
    } else {
      setError('Invalid team name or leader name');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden font-mono">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 px-6">
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-green-900 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

          <div className="relative bg-black/80 backdrop-blur-md border border-green-500/30 rounded-lg p-8 shadow-2xl">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-500/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-500/50"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-500/50"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500/50"></div>

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-green-900/20 rounded-lg flex items-center justify-center mb-4 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <Shield className="w-8 h-8 text-green-400" />
              </div>

              <h1 className="text-3xl font-black text-center mb-2">
                <GlitchText text="CYBER" className="text-green-400" />
                <span className="mx-2 text-white">•</span>
                <GlitchText text="GAUNTLET" className="text-green-400" />
              </h1>
              <p className="text-green-500/70 text-sm text-center">Team Authentication System</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Team Name Input */}
              <div className="space-y-2">
                <label htmlFor="teamName" className="block text-sm text-green-400/80 uppercase tracking-wider">
                  Team Name
                </label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Echo Force"
                  required
                  disabled={loading}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 placeholder-green-700/50 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Leader Name Input */}
              <div className="space-y-2">
                <label htmlFor="leaderName" className="block text-sm text-green-400/80 uppercase tracking-wider">
                  Leader Name
                </label>
                <input
                  id="leaderName"
                  type="text"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Michael Chen"
                  required
                  disabled={loading}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 placeholder-green-700/50 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded p-3 text-red-400 text-sm text-center animate-pulse">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-6 rounded uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] disabled:hover:shadow-none"
              >
                {loading ? 'Connecting...' : 'Register & Login'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center text-green-700/50 text-xs">
              <p>&gt; Secure team authentication enabled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
