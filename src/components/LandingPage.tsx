import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Trophy, 
  Zap, 
  ArrowRight, 
  Terminal, 
  Users, 
  Code, 
  Cpu, 
  Server, 
  Hash, 
  ChevronRight 
} from 'lucide-react';

// --- 1. BOOT SEQUENCE (INTRO ANIMATION) ---
// FIXED: Removed race condition that caused the crash
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
      // Safety check: stop if we've gone past the array
      if (currentIndex >= sequence.length) {
        clearInterval(interval);
        setTimeout(onComplete, 800); 
        return;
      }
      
      // Capture the text into a const variable immediately
      const currentLine = sequence[currentIndex].text;
      
      // Update state using the captured variable
      setText(prev => [...prev, currentLine]);
      
      currentIndex++;
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-mono text-green-500 text-lg md:text-2xl">
      <div className="w-full max-w-md px-6">
        {text.map((line, i) => (
          <div key={i} className="mb-2 border-l-2 border-green-500 pl-4 animate-fade-in-up">
            <span className="opacity-50 text-sm mr-4">[{new Date().toLocaleTimeString()}]</span>
            {line}
          </div>
        ))}
        <div className="h-4 w-4 bg-green-500 animate-pulse mt-4 ml-4"></div>
      </div>
      
      {/* Loading Bar */}
      <div className="fixed bottom-10 left-0 w-full px-10">
        <div className="w-full h-1 bg-green-900 rounded-full overflow-hidden">
           <div className="h-full bg-green-500 animate-[width_2.5s_ease-in-out_forwards]" style={{ width: '0%' }}></div>
        </div>
      </div>
    </div>
  );
};

// --- 2. MATRIX BACKGROUND ---
const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01'; 
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = new Array(Math.ceil(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.95 ? '#fff' : '#00ff00';
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 50);
    
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
        clearInterval(interval);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full opacity-10 pointer-events-none z-0" />;
};

// --- 3. REUSABLE "TECH" CARD ---
const TechCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative bg-gray-900/40 backdrop-blur-sm border border-green-500/30 p-6 group transition-all duration-300 hover:border-green-400 hover:bg-gray-900/60 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] ${className}`}>
    {/* Corner accents */}
    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-green-500 transition-all group-hover:w-full group-hover:h-full opacity-50"></div>
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-green-500 transition-all group-hover:w-full group-hover:h-full opacity-50"></div>
    {children}
  </div>
);

// --- 4. MAIN LANDING PAGE ---
export function LandingPage() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <BootSequence onComplete={() => setLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-green-400 font-mono relative overflow-x-hidden animate-fade-in">
      <MatrixBackground />
      
      {/* Decorative Grid Lines Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* NAV BAR */}
      <header className="fixed top-0 w-full z-50 border-b border-green-500/20 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-green-600/20 rounded flex items-center justify-center border border-green-500 group-hover:animate-spin-slow">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <span className="font-bold text-xl tracking-widest text-white">
              CYBER<span className="text-green-500">GAUNTLET</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden md:block text-xs text-green-500/50 animate-pulse">● SYSTEM ONLINE</span>
            <Link to="/auth" className="text-sm font-bold bg-green-600/10 hover:bg-green-600 hover:text-black border border-green-500/50 px-6 py-2 rounded transition-all">
              LOGIN
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 pt-24">
        
        {/* HERO SECTION */}
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Text */}
            <div className="space-y-8">
              <div className="inline-block px-3 py-1 text-xs font-bold border border-green-500/30 rounded-full bg-green-500/5 text-green-300">
                // CTF_EVENT_ID: 2025-A
              </div>
              <h1 className="text-5xl md:text-7xl font-black leading-tight text-white">
                DECRYPT. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-700 animate-pulse">
                  DOMINATE.
                </span>
              </h1>
              <p className="text-lg text-gray-400 max-w-xl border-l-4 border-green-500 pl-4">
                Enter the neural network. Solve elite cryptography puzzles, reverse engineer malware, and claim your place on the global leaderboard.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/auth" className="flex items-center gap-3 bg-green-600 hover:bg-green-500 text-black font-bold py-4 px-8 rounded clip-path-polygon hover:translate-x-1 transition-transform">
                  <Terminal className="w-5 h-5" />
                  INITIATE PROTOCOL
                </Link>
                <button className="px-8 py-4 border border-green-500/30 text-green-400 hover:border-green-500 hover:text-green-300 rounded transition-colors uppercase tracking-wider text-sm font-bold">
                  View Demo
                </button>
              </div>
            </div>

            {/* Right: Interactive Terminal Graphic */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-black border border-green-500/30 rounded-lg p-2 shadow-2xl">
                <div className="bg-gray-900 rounded border border-green-500/20 p-4 h-[300px] font-mono text-sm overflow-hidden flex flex-col">
                  <div className="flex gap-2 mb-4 opacity-50">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  
                  {/* Fixed JSX content with corrected symbols */}
                  <div className="space-y-2 text-green-300">
                    <p>&gt; target_acquired: <span className="text-white">CTF_CHALLENGE</span></p>
                    <p>&gt; analyzing_vulnerabilities... <span className="text-green-500">DONE</span></p>
                    <p>&gt; injecting_payload... <span className="text-green-500">SUCCESS</span></p>
                    <p>&gt; retrieving_flag...</p>
                    <p className="animate-pulse text-yellow-400">WARNING: ENCRYPTION DETECTED</p>
                    <p>&gt; cracking_hash [||||||||||   ] 78%</p>
                    <div className="mt-4 p-2 bg-green-900/20 border border-green-500/30 rounded text-xs">
                      FLAG: ctf{'{'}n3vr_g0nn4_g1v3_y0u_up{'}'}
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* BENTO GRID FEATURES */}
        <section className="container mx-auto px-4 py-20">
          <div className="flex items-end justify-between mb-12 border-b border-green-500/20 pb-4">
            <h2 className="text-3xl font-bold text-white">
              <span className="text-green-500">01.</span> MISSION OBJECTIVES
            </h2>
            <div className="hidden md:block font-mono text-xs text-green-500/50">
              // SELECT_MODULE
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Card */}
            <TechCard className="md:col-span-2">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <Lock className="w-8 h-8 text-green-400" />
                </div>
                <Hash className="w-6 h-6 text-green-500/20" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Cryptography & Ciphers</h3>
              <p className="text-gray-400 mb-6">
                Break classical and modern encryption schemes. Analyze frequency distributions, crack RSA keys, and decode hidden steganography messages embedded in media files.
              </p>
              <div className="flex gap-2">
                {['RSA', 'AES', 'XOR', 'BASE64'].map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 bg-black border border-green-500/30 text-green-500 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </TechCard>

            {/* Tall Card */}
            <TechCard className="md:row-span-2 flex flex-col justify-between">
              <div>
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 w-fit mb-6">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Live Ranking</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Real-time scoreboard updates. Outsmart rival teams and watch your rank climb as you submit flags.
                </p>
                
                {/* Mini Leaderboard Visualization */}
                <div className="space-y-3 mt-4">
                  {[1, 2, 3].map((rank) => (
                    <div key={rank} className="flex items-center gap-3 text-xs border-b border-green-500/10 pb-2">
                      <span className={`font-bold ${rank === 1 ? 'text-yellow-400' : 'text-gray-500'}`}>0{rank}</span>
                      <span className="text-gray-300">USER_X{rank}9</span>
                      <span className="ml-auto text-green-500 font-mono">{1000 - (rank * 50)}pts</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="w-full mt-6 py-2 border border-green-500 text-green-500 hover:bg-green-500 hover:text-black transition-colors text-sm font-bold uppercase">
                View Global Board
              </button>
            </TechCard>

            {/* Standard Card */}
            <TechCard>
               <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 w-fit mb-4">
                  <Code className="w-6 h-6 text-blue-400" />
                </div>
              <h3 className="text-xl font-bold text-white mb-2">Reverse Engineering</h3>
              <p className="text-gray-400 text-sm">
                Decompile binaries and analyze assembly code to find vulnerabilities.
              </p>
            </TechCard>

            {/* Standard Card */}
            <TechCard>
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 w-fit mb-4">
                  <Server className="w-6 h-6 text-purple-400" />
                </div>
              <h3 className="text-xl font-bold text-white mb-2">Web Exploitation</h3>
              <p className="text-gray-400 text-sm">
                Inject SQL, bypass authentication, and manipulate requests.
              </p>
            </TechCard>
          </div>
        </section>

        {/* TIMELINE SECTION */}
        <section className="container mx-auto px-4 py-20 border-t border-green-500/10">
           <h2 className="text-3xl font-bold text-white mb-16 text-center">
              <span className="text-green-500">02.</span> EXECUTION PATH
            </h2>

            <div className="relative">
              {/* Connector Line */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-900 hidden md:block -translate-y-1/2"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { title: "REGISTER", icon: Users, desc: "Create team profile" },
                  { title: "CONNECT", icon: Zap, desc: "Access the grid" },
                  { title: "HACK", icon: Terminal, desc: "Solve challenges" },
                  { title: "WIN", icon: Trophy, desc: "Claim the reward" }
                ].map((step, idx) => (
                  <div key={idx} className="relative z-10 bg-black p-6 border border-green-500/30 rounded-lg text-center group hover:border-green-500 transition-colors">
                     <div className="w-12 h-12 mx-auto bg-gray-900 border border-green-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                        <step.icon className="w-5 h-5 text-green-400" />
                     </div>
                     <h3 className="text-xl font-bold text-white">{step.title}</h3>
                     <p className="text-gray-500 text-sm mt-2">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
        </section>

        {/* CTA FOOTER */}
        <section className="py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-green-600/5"></div>
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-4xl font-bold text-white mb-6">READY TO BREACH?</h2>
            <p className="text-green-400/60 mb-8">The system is waiting. Time to show what you're capable of.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-black font-bold py-4 px-12 rounded-lg text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
              START HACKING <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        <footer className="bg-black py-8 border-t border-green-900 text-center text-xs text-gray-600 font-mono">
          <p>CYBERGAUNTLET SYSTEM v2.5.0 // EST. 2025</p>
        </footer>

      </div>
    </div>
  );
}