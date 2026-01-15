import React from 'react';
import { Leaderboard } from '../components/Leaderboard';
import { GlitchText } from '../components/GlitchText';
import { ArrowLeft } from 'lucide-react';

export function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono">
      <div className="scanlines"></div>
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <GlitchText text="CYBER" className="text-green-500" />
            <span className="text-green-400">GAUNTLET</span>
          </h1>
          <p className="text-green-300/60 text-sm">Live Leaderboard</p>
        </header>

        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Challenge
          </button>
        </div>

        <Leaderboard />

        <div className="mt-8 text-center text-green-300/40 text-xs">
          <p>Leaderboard updates in real-time as teams complete challenges</p>
        </div>
      </div>
    </div>
  );
}
