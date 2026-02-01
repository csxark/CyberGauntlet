import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import { 
  Shield, 
  Lock, 
  Trophy, 
  Zap, 
  Terminal, 
  Users,
  ChevronRight,
  Cpu,
  Globe,
  Book // <--- Added Book Icon import
} from 'lucide-react';

// --- 1. UTILITY: SCROLL REVEAL COMPONENT ---
const ScrollReveal = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      {children}
    </div>
  );
};

// --- 2. BOOT SEQUENCE ---
const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [text, setText] = useState<string[]>([]);
  
  useEffect(() => {
    const sequence = [
      { text: "INITIALIZING KERNEL...", delay: 200 },
      { text: "LOADING SECURITY MODULES...", delay: 600 },
      { text: "BYPASSING FIREWALL...", delay: 1100 },
      { text: "ESTABLISHING SECURE CONNECTION...", delay: 1600 },
      { text: "ACCESS GRANTED.", delay: 2200 },
    ];

    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex >= sequence.length) {
        clearInterval(interval);
        setTimeout(onComplete, 800); 
        return;
      }
      
      const currentItem = sequence[currentIndex];
      if (currentItem) {
        setText(prev => [...prev, currentItem.text]);
      }
      
      currentIndex++;
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-mono text-green-500 text-sm md:text-2xl">
      <div className="w-full max-w-md px-6">
        {text.map((line, i) => (
          <div key={i} className="mb-2 border-l-2 border-green-500 pl-4 animate-fade-in-up">
            <span className="opacity-50 text-xs md:text-sm mr-4">[{new Date().toLocaleTimeString()}]</span>
            {line}
          </div>
        ))}
        <div className="h-4 w-4 bg-green-500 animate-pulse mt-4 ml-4"></div>
      </div>
      <div className="fixed bottom-10 left-0 w-full px-10">
        <div className="w-full h-1 bg-green-900 rounded-full overflow-hidden">
           <div className="h-full bg-green-500 animate-[width_2.5s_ease-in-out_forwards]" style={{ width: '0%' }}></div>
        </div>
      </div>
    </div>
  );
};

// --- 3. 3D BACKGROUND COMPONENTS ---
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

const DataParticles = ({ count = 450 }) => {
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

// --- 4. ANIMATED TERMINAL COMPONENT ---
const HackerTerminal = () => {
  const [lines, setLines] = useState<Array<Array<{ text: string, className: string }>>>([]);
  
  useEffect(() => {
    let isMounted = true;
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const runScript = async () => {
      setLines([]);
      await wait(500);
      setLines([[{ text: "> target_acquired: ", className: "text-green-300" }]]);
      await wait(500);
      setLines(prev => { const n = [...prev]; n[0].push({ text: "CTF_CHALLENGE", className: "text-white font-bold" }); return n; });
      await wait(600);
      setLines(prev => [...prev, [{ text: "> analyzing_vulnerabilities... ", className: "text-green-300" }]]);
      await wait(800);
      setLines(prev => { const n = [...prev]; n[1].push({ text: "DONE", className: "text-green-500 font-bold" }); return n; });
      await wait(600);
      setLines(prev => [...prev, [{ text: "> injecting_payload... ", className: "text-green-300" }]]);
      await wait(1000); 
      setLines(prev => { const n = [...prev]; n[2].push({ text: "SUCCESS", className: "text-green-500 font-bold" }); return n; });
      await wait(600);
      setLines(prev => [...prev, [{ text: "> retrieving_flag...", className: "text-green-300" }]]);
      await wait(800);
      setLines(prev => [...prev, [{ text: "WARNING: ENCRYPTION DETECTED", className: "text-yellow-500 font-bold animate-pulse" }]]);
      await wait(1000);
      setLines(prev => [...prev, [{ text: "> cracking_hash [||||||||||   ] 78%", className: "text-green-300" }]]);
      await wait(1500);
      setLines(prev => [...prev, [{ text: "FLAG: ctf{n3vr_g0nn4_g1v3_y0u_up}", className: "text-white font-mono bg-green-900/30 p-2 rounded border border-green-500/50 inline-block w-full break-all" }]]);
    };
    runScript();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="bg-gray-900/90 rounded border border-green-500/20 p-4 h-[300px] md:h-[340px] font-mono text-xs md:text-sm overflow-hidden flex flex-col shadow-2xl relative w-full">
       <div className="flex gap-2 mb-4 opacity-70 sticky top-0">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
      </div>
      <div className="space-y-2 relative z-10 w-full">
        {lines.map((line, i) => (
          <div key={i} className="animate-fade-in-up flex flex-wrap">
            {line.map((segment, j) => (<span key={j} className={segment.className}>{segment.text}</span>))}
          </div>
        ))}
        <div className="w-2 h-4 bg-green-500 animate-pulse inline-block ml-1 align-middle"></div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 pointer-events-none bg-[length:100%_4px,3px_100%]"></div>
    </div>
  );
};

// --- 5. MISSION OBJECTIVES COMPONENT ---
const MissionCard = ({ 
  icon: Icon, 
  title, 
  desc, 
  tags, 
  delay 
}: { 
  icon: any, 
  title: string, 
  desc: string, 
  tags: string[], 
  delay: number 
}) => (
  <ScrollReveal delay={delay}>
    <div className="relative group h-full">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
      
      <div className="relative h-full bg-black/80 backdrop-blur-xl border border-green-500/30 p-8 flex flex-col transition-all duration-300 hover:translate-y-[-5px] hover:shadow-[0_10px_30px_-10px_rgba(34,197,94,0.3)] clip-path-tech">
        
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-500/50"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500/50"></div>
        
        <div className="absolute top-0 left-0 w-full h-[2px] bg-green-400 opacity-0 group-hover:opacity-100 animate-scan-fast shadow-[0_0_10px_#4ade80]"></div>

        <div className="flex items-start justify-between mb-6">
          <div className="p-4 bg-green-500/10 rounded-sm border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
            <Icon className="w-8 h-8 text-green-400 group-hover:text-white transition-colors" />
          </div>
          <div className="text-right">
             <span className="text-[10px] font-mono text-green-500/40 block">SYS.MOD.0{Math.ceil(delay/100)}</span>
             <div className="w-12 h-1 bg-green-900/50 mt-1 ml-auto rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-2/3 animate-pulse"></div>
             </div>
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-green-300 transition-colors font-mono tracking-tight">
          {title}
        </h3>
        
        <p className="text-gray-400 text-sm md:text-base mb-6 leading-relaxed border-l-2 border-green-500/10 pl-4 group-hover:border-green-500/50 transition-colors">
          {desc}
        </p>

        <div className="mt-auto flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="text-[10px] uppercase font-bold px-2 py-1 bg-green-900/20 text-green-400 border border-green-500/20 rounded-sm group-hover:border-green-500/50 group-hover:text-green-300 transition-all">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  </ScrollReveal>
);

// --- 6. MAIN LANDING PAGE ---
export function LandingPage() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <BootSequence onComplete={() => setLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-green-400 font-mono relative overflow-x-hidden animate-fade-in">
      
      <HackerBackground />
      
      {/* Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* NAV BAR */}
      <header className="fixed top-0 w-full z-50 border-b border-green-500/20 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-green-600/20 rounded flex items-center justify-center border border-green-500 group-hover:animate-spin-slow">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <span className="font-bold text-lg md:text-xl tracking-widest text-white">
              CYBER<span className="text-green-500">GAUNTLET</span>
            </span>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <span className="hidden md:block text-xs text-green-500/50 animate-pulse">● SYSTEM ONLINE</span>
            
            {/* --- ADDED DOCS LINK HERE --- */}
            <Link to="/docs" className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-400 hover:text-green-400 transition-colors mr-2">
                <Book className="w-4 h-4" />
                <span className="hidden sm:inline">DOCS</span>
            </Link>

            <Link to="/auth" className="text-xs md:text-sm font-bold bg-green-600/10 hover:bg-green-600 hover:text-black border border-green-500/50 px-4 md:px-6 py-2 rounded transition-all">
              LOGIN
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 pt-20 md:pt-24">
        
        {/* HERO SECTION */}
        <section className="container mx-auto px-4 py-8 md:py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
              <ScrollReveal>
                <div className="inline-block px-3 py-1 text-[10px] md:text-xs font-bold border border-green-500/30 rounded-full bg-green-500/5 text-green-300">
                  // CTF_EVENT_ID: 2025-A
                </div>
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-white">
                  DECRYPT. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-700 animate-pulse">
                    DOMINATE.
                  </span>
                </h1>
              </ScrollReveal>
              <ScrollReveal delay={400}>
                <p className="text-sm md:text-lg text-gray-400 max-w-xl border-l-4 border-green-500 pl-4">
                  Enter the neural network. Solve elite cryptography puzzles, reverse engineer malware, and claim your place on the global leaderboard.
                </p>
              </ScrollReveal>
              <ScrollReveal delay={600}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth" className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-black font-bold py-3 md:py-4 px-8 rounded clip-path-polygon hover:translate-x-1 transition-transform text-sm md:text-base">
                    <Terminal className="w-5 h-5" />
                    INITIATE PROTOCOL
                  </Link>
                  <button className="px-8 py-3 md:py-4 border border-green-500/30 text-green-400 hover:border-green-500 hover:text-green-300 rounded transition-colors uppercase tracking-wider text-sm font-bold">
                    View Demo
                  </button>
                </div>
              </ScrollReveal>
            </div>
            <div className="relative group perspective-1000 order-1 lg:order-2 w-full">
               <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
               <div className="relative bg-black border border-green-500/30 rounded-lg p-2 shadow-2xl transform transition-transform duration-500 lg:group-hover:rotate-y-1 lg:group-hover:rotate-x-1">
                 <HackerTerminal />
               </div>
            </div>
          </div>
        </section>

        {/* --- MISSION OBJECTIVES --- */}
        <section className="container mx-auto px-4 py-12 md:py-24">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 border-b border-green-500/20 pb-4">
              <div>
                 <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                  <span className="text-green-500">01.</span> MISSION OBJECTIVES
                </h2>
                <p className="text-green-400/50 text-sm">SELECT YOUR DOMAIN OF OPERATION</p>
              </div>
              <div className="hidden md:block font-mono text-xs text-green-500/50">
                // MODULE_LOADER_V2.5
              </div>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MissionCard 
              delay={0}
              icon={Lock}
              title="Cryptography"
              desc="Crack unbreakable ciphers. From RSA to Elliptic Curve, test your math against the machine."
              tags={['RSA', 'AES', 'XOR']}
            />
             <MissionCard 
              delay={200}
              icon={Cpu}
              title="Reverse Eng"
              desc="Deconstruct binary executables. Read assembly, bypass debuggers, and find the secret logic."
              tags={['ASM', 'Ghidra', 'GDB']}
            />
            <MissionCard 
              delay={400}
              icon={Globe}
              title="Web Exploit"
              desc="Infiltrate secure networks. SQL injection, XSS, and server-side request forgery."
              tags={['SQLi', 'XSS', 'CSRF']}
            />
            <MissionCard 
              delay={600}
              icon={Trophy}
              title="Live Ops"
              desc="Real-time attack/defense. Capture flags while patching your own vulnerabilities."
              tags={['Ranked', 'PvP', 'Loot']}
            />
          </div>
        </section>

        {/* TIMELINE SECTION */}
        <section className="container mx-auto px-4 py-12 md:py-20 border-t border-green-500/10">
           <ScrollReveal>
             <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 md:mb-16 text-center">
               <span className="text-green-500">02.</span> EXECUTION PATH
             </h2>
           </ScrollReveal>
           <div className="relative">
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-900 hidden md:block -translate-y-1/2"></div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
               {[
                 { title: "REGISTER", icon: Users, desc: "Create team profile" },
                 { title: "CONNECT", icon: Zap, desc: "Access the grid" },
                 { title: "HACK", icon: Terminal, desc: "Solve challenges" },
                 { title: "WIN", icon: Trophy, desc: "Claim the reward" }
               ].map((step, idx) => (
                 <ScrollReveal key={idx} delay={idx * 200}>
                   <div className="relative z-10 bg-black p-6 border border-green-500/30 rounded-lg text-center group hover:border-green-500 transition-colors">
                       <div className="w-12 h-12 mx-auto bg-gray-900 border border-green-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                          <step.icon className="w-5 h-5 text-green-400" />
                       </div>
                       <h3 className="text-lg md:text-xl font-bold text-white">{step.title}</h3>
                       <p className="text-gray-500 text-xs md:text-sm mt-2">{step.desc}</p>
                   </div>
                 </ScrollReveal>
               ))}
             </div>
           </div>
        </section>

        {/* CTA FOOTER */}
        <section className="py-12 md:py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-green-600/5"></div>
          <div className="container mx-auto px-4 relative z-10">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">READY TO BREACH?</h2>
              <p className="text-green-400/60 mb-8 text-sm md:text-base">The system is waiting. Time to show what you're capable of.</p>
              <Link to="/auth" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-black font-bold py-3 md:py-4 px-8 md:px-12 rounded-lg text-base md:text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                START HACKING <ChevronRight className="w-5 h-5" />
              </Link>
            </ScrollReveal>
          </div>
        </section>

        <footer className="bg-black py-8 border-t border-green-900 text-center text-xs text-gray-600 font-mono">
          <p>CYBERGAUNTLET SYSTEM v2.5.0 // EST. 2026</p>
        </footer>
      </div>
    </div>
  );
}