import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import { LandingPage } from './components/LandingPage';
import { ChallengePage } from './components/ChallengePage';
import DocsPage from './components/DocsPage';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './pages/ProtectedRoute';

import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';

/* ---------- 404 PAGE ---------- */
const NotFound = () => (
  <div className="min-h-screen bg-[#050505] text-green-500 font-mono flex flex-col items-center justify-center p-4">
    <div className="border border-red-500/50 p-8 rounded bg-red-900/10 max-w-md w-full text-center relative overflow-hidden">
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

/* ---------- ROUTES ---------- */
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono flex items-center justify-center">
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/docs" element={<DocsPage />} />

      {/* Protected dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected challenges */}
      <Route
        path="/challenges"
        element={
          user ? (
            <ChallengePage
              user={user}
              onLogout={async () => {
                await supabase.auth.signOut();
              }}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/* ---------- APP ROOT ---------- */
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
