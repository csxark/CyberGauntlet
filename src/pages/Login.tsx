import { useState, useRef, useMemo, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Shield, ArrowRight, Terminal, Cpu } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';

// --- 1. SHARED 3D BACKGROUND COMPONENTS (Reused for consistency) ---

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

// --- 2. MAIN LOGIN COMPONENT ---

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  // --- EXISTING LOGIC PRESERVED ---
  const login = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }
    navigate("/challenges", { replace: true });
  };

  const signup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) alert(error.message);
    else alert('📩 Check your email for verification');
    setLoading(false);
  };
  // --------------------------------

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden font-mono text-green-400">
      
      {/* 3D Background */}
      <HackerBackground />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      <div className="scanlines"></div>

      <div className="w-full max-w-md relative z-10 px-6">
        
        {/* Cyber Card Container */}
        <div className="relative group perspective-1000">
           {/* Glow behind card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-green-900 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          
          <div className="relative bg-black/80 backdrop-blur-md border border-green-500/30 rounded-lg p-8 shadow-2xl overflow-hidden">
            
            {/* Corner Tech Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-500/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-500/50"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-500/50"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500/50"></div>

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-green-900/20 rounded-lg flex items-center justify-center mb-4 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)] group-hover:animate-pulse">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              
              <h2 className="text-3xl font-black text-white tracking-tight mb-1 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">
                SYSTEM ACCESS
              </h2>
              <div className="flex items-center gap-2 text-green-500/60 text-xs tracking-widest">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                SECURE CONNECTION ESTABLISHED
              </div>
            </div>

            {/* Email Input */}
            <div className="mb-6">
              <label className="text-xs font-bold text-green-500 mb-2 flex items-center gap-2 tracking-wider">
                <Terminal className="w-3 h-3" />
                USER_IDENTITY
              </label>
              <div className="relative group/input">
                <input
                  type="email"
                  placeholder="agent@cybergauntlet.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 text-green-300 border border-green-500/30 rounded focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50 transition-all placeholder:text-green-900 font-mono"
                />
                <div className="absolute right-3 top-3 text-green-700 group-focus-within/input:text-green-400 transition-colors">
                    <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-8">
              <label className="text-xs font-bold text-green-500 mb-2 flex items-center gap-2 tracking-wider">
                <Cpu className="w-3 h-3" />
                ACCESS_CODE
              </label>
              <div className="relative group/input">
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 text-green-300 border border-green-500/30 rounded focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50 transition-all placeholder:text-green-900 font-mono"
                />
                 <div className="absolute right-3 top-3 text-green-700 group-focus-within/input:text-green-400 transition-colors">
                    <Lock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              <button
                onClick={login}
                disabled={loading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-black font-bold text-sm tracking-wider uppercase rounded transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 clip-path-polygon"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    INITIATE SESSION
                    <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                  </>
                )}
              </button>

              <button
                onClick={signup}
                disabled={loading}
                className="w-full py-3 bg-transparent border border-green-500/30 text-green-500 hover:bg-green-500/10 hover:border-green-500 hover:text-green-400 font-bold text-sm tracking-wider uppercase rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                REGISTER NEW OPERATIVE
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-green-500/20 text-center">
              <p className="text-[10px] text-green-500/40 uppercase tracking-widest">
                ENCRYPTION LEVEL: MILITARY GRADE // 2048-BIT
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}