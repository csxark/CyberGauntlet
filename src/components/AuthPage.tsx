import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Shield, Users, User, LogIn } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import { GlitchText } from './GlitchText';
import { TerminalBox } from './TerminalBox';
import { validateTeam } from '../data/teamData';

// --- 1. SHARED 3D BACKGROUND COMPONENTS ---
// (Ideally, you should move these to a separate file like 'components/HackerBackground.tsx' to avoid duplication)

const RotatingCore = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if(meshRef.current) {
        meshRef.current.rotation.x = t * 0.2;
        meshRef.current.rotation.y = t * 0.3;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} scale={2.5}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial 
          color="#22c55e" 
          wireframe 
          transparent 
          opacity={0.3} 
          blending={THREE.AdditiveBlending} 
        />
      </mesh>
    </Float>
  );
};

const DataParticles = ({ count = 300 }) => {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 15;
      p[i * 3 + 1] = (Math.random() - 0.5) * 15;
      p[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return p;
  }, [count]);

  const ref = useRef<THREE.Points>(null!);
  useFrame(() => {
    if(ref.current) ref.current.rotation.y += 0.0005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={points.length / 3} array={points} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.07} 
        color="#4ade80" 
        sizeAttenuation 
        transparent 
        opacity={0.8} 
        blending={THREE.AdditiveBlending} 
      />
    </points>
  );
};

const HackerBackground = () => (
  <div className="fixed top-0 left-0 w-full h-full z-0 opacity-60 pointer-events-none">
    <Suspense fallback={null}>
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
        <fog attach="fog" args={['#000000', 5, 15]} />
        <ambientLight intensity={0.5} />
        <RotatingCore />
        <DataParticles />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </Suspense>
  </div>
);

// --- 2. MAIN AUTH PAGE COMPONENT ---

interface AuthPageProps {
  onAuth: (teamId: string, teamName: string, leaderName: string) => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const team = validateTeam(teamName.trim(), leaderName.trim());

      if (!team) {
        setError('Invalid team name or leader name. Please check and try again.');
        setLoading(false);
        return;
      }

      onAuth(team.id, teamName.trim(), leaderName.trim());
      setLoading(false);
    }, 500);
  };

  return (
    // Changed background to match landing page (#050505)
    <div className="min-h-screen bg-[#050505] text-green-400 font-mono flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* 3D BACKGROUND */}
      <HackerBackground />
      
      {/* Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="scanlines"></div>

      {/* LOGIN CONTENT (Z-Index increased to float above background) */}
      <div className="relative z-10 w-full max-w-md">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-900/20 rounded flex items-center justify-center border border-green-500/50 backdrop-blur-md">
               <Shield className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
              <GlitchText text="CYBER" className="text-green-500" />
              <span className="text-green-400">GAUNTLET</span>
            </h1>
          </div>
          <p className="text-green-300/60 text-sm font-bold tracking-widest">Security Challenge Portal</p>
        </header>

        <TerminalBox title="login.sh">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-green-400 mb-2 text-sm flex items-center gap-2 font-bold">
                <Users className="w-4 h-4" />
                TEAM NAME:
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Echo Force"
                className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 placeholder-green-700/50 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 backdrop-blur-sm transition-all"
                required
              />
            </div>

            <div>
              <label className="text-green-400 mb-2 text-sm flex items-center gap-2 font-bold">
                <User className="w-4 h-4" />
                LEADER NAME:
              </label>
              <input
                type="text"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                placeholder="e.g., Michael Chen"
                className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 placeholder-green-700/50 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 backdrop-blur-sm transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded text-sm animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'CONNECTING...' : 'REGISTER & LOGIN'}
            </button>
          </form>
        </TerminalBox>

        <div className="mt-6 text-center text-green-300/40 text-xs space-y-2">
          <p>Only one team member can access the platform at a time</p>
        </div>
      </div>
    </div>
  );
}