import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import { 
  Terminal, 
  AlertTriangle, 
  Cpu, 
  ChevronRight, 
  ShieldAlert,
  CornerDownRight,
  Shield,
  Database,
  Eye,
  Activity,
  Lock,
  Globe,
  Server,
  FileCode,
  Key,
  FileKey,
  Hash,
  Unlock,
  BookOpen,
  ShieldCheck,
  Network,
  UserCheck,
  Target,
  Users,
  Layers,
  CheckSquare,
  Fingerprint,
  LucideIcon
} from 'lucide-react';

// --- 1. 3D BACKGROUND ANIMATION ---

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
          opacity={0.15} 
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
        opacity={0.6} 
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

// --- 2. TYPES & SUB-COMPONENTS ---

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
}

interface CodeBlockProps {
  command?: string;
  output?: string;
  lines?: string[];
  language?: string;
}

interface NavItemProps {
  active: boolean;
  label: string;
  icon: LucideIcon | React.ElementType;
  onClick: () => void;
}

interface SectionData {
  title: string;
  subtitle: string;
  body: React.ReactNode;
}

type SectionKey = 'fundamentals' | 'strategy' | 'capabilities' | 'crypto' | 'protocols';

const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, delay = 0 }) => {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const CodeBlock: React.FC<CodeBlockProps> = ({ command, output, lines, language = "BASH" }) => (
  <div className="my-6 rounded-lg border border-green-500/30 bg-black/90 backdrop-blur-md overflow-hidden font-mono text-xs md:text-sm shadow-[0_0_25px_rgba(0,0,0,0.7)] group hover:border-green-500/50 transition-colors">
    <div className="bg-gray-900/80 px-4 py-2 border-b border-green-500/20 flex items-center justify-between">
      <div className="flex gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
      </div>
      <div className="flex items-center gap-2">
         <span className="text-[10px] text-gray-500 uppercase">term.exe</span>
         <span className="text-[10px] text-green-500/50 px-2 py-0.5 rounded bg-green-900/20 border border-green-500/10">{language}</span>
      </div>
    </div>
    <div className="p-4 space-y-2 relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
      
      {command && (
        <div className="flex gap-2 text-white relative z-20">
          <span className="text-green-500 select-none font-bold">{language === "BASH" ? "$" : ">"}</span>
          <span>{command}</span>
        </div>
      )}
      {lines && lines.map((line, i) => (
         <div key={i} className={`pl-4 border-l border-green-900/50 whitespace-pre-wrap relative z-20 ${line.trim().startsWith('#') || line.trim().startsWith('//') ? 'text-gray-500 italic' : 'text-green-300'}`}>
           {line}
         </div>
      ))}
      {output && (
        <div className="text-gray-500 pl-4 border-l border-green-900/50 mt-2 pt-2 border-t border-dashed border-gray-800 relative z-20">
          {output}
        </div>
      )}
    </div>
  </div>
);

const NavItem: React.FC<NavItemProps> = ({ active, label, icon: Icon, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-mono transition-all duration-300 border-l-2 relative overflow-hidden group ${
      active 
      ? 'border-green-500 bg-green-500/10 text-white shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]' 
      : 'border-transparent text-gray-500 hover:text-green-400 hover:bg-green-500/5'
    }`}
  >
    <div className={`absolute inset-0 bg-green-500/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 blur-xl`}></div>
    <Icon className={`w-4 h-4 relative z-10 ${active ? 'animate-pulse text-green-400' : ''}`} />
    <span className="relative z-10">{label}</span>
    {active && <ChevronRight className="w-3 h-3 ml-auto text-green-500 animate-bounce-x" />}
  </button>
);

// --- 3. MAIN PAGE CONTENT ---

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('fundamentals');

  const content: Record<SectionKey, SectionData> = {
    // =========================================================================
    // 1. FUNDAMENTALS (RESTORED FULL CONTENT)
    // =========================================================================
    fundamentals: {
      title: 'CORE FUNDAMENTALS',
      subtitle: 'Version 1.0 // Status: Approved',
      body: (
        <div className="space-y-12 text-gray-300">
          
          <div className="border-l-4 border-green-500 pl-6 py-2 bg-green-900/5">
             <h3 className="text-xl text-white font-bold mb-3">1. Executive Summary</h3>
             <p className="leading-relaxed text-sm">
               This module provides the foundational technical overview of Cyber Security principles. 
               Before handling advanced weaponry (tools), every operative must understand the physics of the battlefield: 
               <strong> Confidentiality, Integrity, and Availability.</strong>
             </p>
          </div>

          <section>
            <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
               <ShieldCheck className="w-5 h-5" /> 2. The CIA Triad
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              The "CIA Triad" is the information security model that guides policies for information security within an organization.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
               <div className="bg-gray-900/40 p-5 rounded border border-green-500/10 hover:border-green-500/50 transition-colors group">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-green-500 group-hover:animate-pulse"/> Confidentiality</h4>
                  <p className="text-xs text-gray-400 mb-2 leading-relaxed">Preventing sensitive info from reaching the wrong people. Ensuring privacy.</p>
                  <div className="text-[10px] text-green-500/80 bg-green-900/20 px-2 py-1 inline-block rounded border border-green-500/30">Mech: Encryption (AES), MFA</div>
               </div>
               <div className="bg-gray-900/40 p-5 rounded border border-green-500/10 hover:border-green-500/50 transition-colors group">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Hash className="w-4 h-4 text-green-500 group-hover:animate-pulse"/> Integrity</h4>
                  <p className="text-xs text-gray-400 mb-2 leading-relaxed">Maintaining consistency and accuracy of data over its entire lifecycle.</p>
                  <div className="text-[10px] text-green-500/80 bg-green-900/20 px-2 py-1 inline-block rounded border border-green-500/30">Mech: Hashing (SHA-256)</div>
               </div>
               <div className="bg-gray-900/40 p-5 rounded border border-green-500/10 hover:border-green-500/50 transition-colors group">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-green-500 group-hover:animate-pulse"/> Availability</h4>
                  <p className="text-xs text-gray-400 mb-2 leading-relaxed">Ensuring authorized parties are able to access the information when needed.</p>
                  <div className="text-[10px] text-green-500/80 bg-green-900/20 px-2 py-1 inline-block rounded border border-green-500/30">Mech: Load Balancing, RAID</div>
               </div>
            </div>
          </section>

          {/* RESTORED SECTION 3: Cryptography Fundamentals */}
          <section>
             <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
               <Key className="w-5 h-5" /> 3. Cryptography Fundamentals
            </h3>
             <p className="text-sm text-gray-400 mb-4">Cryptography is the science of writing in secret code. It is the primary tool used to implement confidentiality and integrity.</p>
             <div className="space-y-4">
               <div className="flex gap-4 items-start bg-gray-900/40 p-4 rounded border border-gray-700">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center shrink-0 text-white font-bold">A</div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Symmetric Encryption (Private-Key)</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      A single key is used for both encryption and decryption.
                      <br/><strong>Pros:</strong> Very fast; efficient for large data.
                      <br/><strong>Cons:</strong> Key distribution (getting the key to recipient safely).
                      <br/><span className="text-green-500/70">Algo: AES (128/256-bit), ChaCha20</span>
                    </p>
                  </div>
               </div>
               

[Image of symmetric vs asymmetric encryption diagram]

               <div className="flex gap-4 items-start bg-gray-900/40 p-4 rounded border border-gray-700">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center shrink-0 text-white font-bold">B</div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Asymmetric Encryption (Public-Key)</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Uses a mathematically related key pair: <strong>Public Key</strong> (Shared) and <strong>Private Key</strong> (Secret).
                      <br/><strong>Pros:</strong> Solves key exchange problem. Enables digital signatures.
                      <br/><strong>Cons:</strong> Slower than symmetric.
                      <br/><span className="text-green-500/70">Algo: RSA, ECC (Elliptic Curve)</span>
                    </p>
                  </div>
               </div>
               <div className="flex gap-4 items-start bg-gray-900/40 p-4 rounded border border-gray-700">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center shrink-0 text-white font-bold">C</div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Hashing (One-Way Functions)</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      A mathematical algorithm that maps data of arbitrary size to a bit string of a fixed size.
                      <br/><strong>Characteristics:</strong> Irreversible (cannot retrieve original data).
                      <br/><span className="text-green-500/70">Algo: SHA-256 (Integrity), Bcrypt (Passwords)</span>
                    </p>
                  </div>
               </div>
             </div>
          </section>

          <section>
            <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
               <UserCheck className="w-5 h-5" /> 4. Public Key Infrastructure (PKI)
            </h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              PKI is the set of roles, policies, hardware, software, and procedures needed to create, manage, distribute, use, store, and revoke digital certificates. It creates the "Chain of Trust" that makes the internet work.
            </p>
            
            <div className="bg-black/40 p-6 rounded border border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative overflow-hidden">
               <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-gray-800 -z-10 hidden md:block"></div>
               <div>
                  <div className="w-10 h-10 mx-auto bg-gray-900 rounded-full flex items-center justify-center mb-2 text-white font-bold border-2 border-green-500 relative z-10 shadow-[0_0_15px_rgba(34,197,94,0.5)]">1</div>
                  <div className="text-white font-bold text-sm mb-1">Certificate Authority</div>
                  <div className="text-xs text-gray-500">A trusted third party (e.g., DigiCert) that validates identities.</div>
               </div>
               <div>
                  <div className="w-10 h-10 mx-auto bg-gray-900 rounded-full flex items-center justify-center mb-2 text-white font-bold border-2 border-green-500 relative z-10 shadow-[0_0_15px_rgba(34,197,94,0.5)]">2</div>
                  <div className="text-white font-bold text-sm mb-1">Digital Certificate</div>
                  <div className="text-xs text-gray-500">A file binding an identity (domain name) to a Public Key.</div>
               </div>
               <div>
                  <div className="w-10 h-10 mx-auto bg-gray-900 rounded-full flex items-center justify-center mb-2 text-white font-bold border-2 border-green-500 relative z-10 shadow-[0_0_15px_rgba(34,197,94,0.5)]">3</div>
                  <div className="text-white font-bold text-sm mb-1">Digital Signature</div>
                  <div className="text-xs text-gray-500">Cryptographic proof that a message was not altered.</div>
               </div>
            </div>
          </section>

          <section>
             <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
                <Network className="w-5 h-5" /> 5. Secure Protocols
             </h3>
             <div className="bg-gray-900/40 rounded border border-gray-700 overflow-hidden text-sm">
                <div className="grid grid-cols-3 bg-gray-800 p-3 font-bold text-white">
                   <div>Protocol</div><div>Layer</div><div>Usage</div>
                </div>
                <div className="grid grid-cols-3 p-3 border-t border-gray-700 text-gray-400 hover:bg-gray-800/50 transition-colors">
                   <div className="text-green-300 font-mono">HTTPS (TLS 1.3)</div><div>Application</div><div>Secures web browsing. Encrypts requests.</div>
                </div>
                <div className="grid grid-cols-3 p-3 border-t border-gray-700 text-gray-400 hover:bg-gray-800/50 transition-colors">
                   <div className="text-green-300 font-mono">SSH (Secure Shell)</div><div>Application</div><div>Secures remote command-line login.</div>
                </div>
                <div className="grid grid-cols-3 p-3 border-t border-gray-700 text-gray-400 hover:bg-gray-800/50 transition-colors">
                   <div className="text-green-300 font-mono">IPsec</div><div>Network</div><div>Secures VPN tunnels by encrypting packets.</div>
                </div>
             </div>
          </section>

          {/* RESTORED SECTION 6: Threat Vectors */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div>
                <h3 className="text-red-400 font-bold text-lg mb-4 flex items-center gap-2">
                   <ShieldAlert className="w-5 h-5" /> 6. Common Threat Vectors
                </h3>
                <div className="space-y-4">
                   <div className="bg-red-900/10 border-l-2 border-red-500 p-3 text-sm text-gray-400">
                      <strong className="text-red-400 block mb-1">Man-in-the-Middle (MitM)</strong>
                      An attacker secretly relays and alters communications between two parties.
                      <br/>
                      <br/><em>Mitigation:</em> End-to-End Encryption, Certificate Pinning.
                   </div>
                   <div className="bg-red-900/10 border-l-2 border-red-500 p-3 text-sm text-gray-400">
                      <strong className="text-red-400 block mb-1">Brute Force Attack</strong>
                      Submit many passwords with the hope of guessing correctly.
                      <br/><em>Mitigation:</em> Account lockouts, Rate limiting, Strong passwords.
                   </div>
                   <div className="bg-red-900/10 border-l-2 border-red-500 p-3 text-sm text-gray-400">
                      <strong className="text-red-400 block mb-1">SQL Injection</strong>
                      Placement of malicious code in SQL statements via web input.
                      <br/><em>Mitigation:</em> Prepared Statements (Parameterized Queries).
                   </div>
                </div>
             </div>

             {/* RESTORED SECTION 7: Developer Best Practices */}
             <div>
               <h3 className="text-blue-400 font-bold text-lg mb-4 flex items-center gap-2">
                  <FileCode className="w-5 h-5" /> 7. Developer Best Practices
               </h3>
               <CodeBlock 
                  language="TEXT"
                  lines={[
                    "1. DO NOT CREATE CUSTOM CRYPTO.",
                    "   > Always use standard libraries:",
                    "   > C++: OpenSSL",
                    "   > Java: Bouncy Castle / java.security",
                    "",
                    "2. SECURE RANDOMNESS IS MANDATORY.",
                    "   > Use: java.security.SecureRandom",
                    "   > Use: std::random_device",
                    "   > NEVER USE: rand() or Math.random() for keys",
                    "",
                    "3. DATA AT REST.",
                    "   > Encrypt sensitive DB fields (AES-256).",
                    "",
                    "4. DATA IN TRANSIT.",
                    "   > Force TLS 1.2 or 1.3 on all connections."
                  ]}
               />
             </div>
          </section>
          
           <CodeBlock command="./load_module.sh --fundamentals" output="Module loaded. Training complete." />
        </div>
      )
    },

    // =========================================================================
    // 2. STRATEGY
    // =========================================================================
    strategy: {
      title: 'OPERATIONAL STRATEGY',
      subtitle: 'Transform. Innovate. Secure.',
      body: (
        <div className="space-y-12 text-gray-300">
          
          <div className="border-l-4 border-green-500 pl-6 py-4 bg-green-900/5">
             <h3 className="text-xl text-white font-bold mb-3">The "Secure Operative" Philosophy</h3>
             <p className="leading-relaxed text-sm mb-4">
               In the modern threat landscape, the "Castle and Moat" mentality (building a strong firewall and trusting everyone inside) is obsolete. The perimeter has dissolved.
             </p>
             <p className="leading-relaxed text-sm">
               Our strategic doctrine shifts from <strong>Passive Defense</strong> (waiting to be hit) to <strong>Active Resilience</strong> (anticipating the hit and minimizing its blast radius). We assume breach and design for survival.
             </p>
          </div>

          <div className="space-y-12">
            <section>
               <h4 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
                   <Target className="w-5 h-5" /> 1. Asset Gravity (Data Classification)
               </h4>
               <p className="text-sm leading-relaxed text-gray-400 mb-6">
                  Not all data weighs the same. A successful defense applies "gravity" to assets—the heavier (more valuable) the asset, the stronger the defensive pull around it. We categorize all data into three strict tiers.
               </p>
               
               <div className="overflow-hidden border border-gray-700 rounded-lg shadow-lg">
                 <table className="w-full text-left text-xs md:text-sm">
                   <thead className="bg-gray-800 text-white font-bold">
                     <tr>
                       <th className="p-4">Tier</th>
                       <th className="p-4">Description</th>
                       <th className="p-4">Required Controls</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-700 bg-gray-900/40">
                     <tr className="hover:bg-gray-800/30 transition-colors">
                       <td className="p-4 text-red-400 font-bold font-mono">RESTRICTED (Tier 0)</td>
                       <td className="p-4 text-gray-400">Encryption Keys, Source Code, User PII, Payment Data.</td>
                       <td className="p-4 text-green-300">Encryption at Rest/Transit, MFA Hard Token, Air-gapped Backups.</td>
                     </tr>
                     <tr className="hover:bg-gray-800/30 transition-colors">
                       <td className="p-4 text-yellow-400 font-bold font-mono">CONFIDENTIAL (Tier 1)</td>
                       <td className="p-4 text-gray-400">Internal Emails, Project Roadmaps, Slack History.</td>
                       <td className="p-4 text-green-300">Role-Based Access (RBAC), Standard MFA, 90-day Retention.</td>
                     </tr>
                     <tr className="hover:bg-gray-800/30 transition-colors">
                       <td className="p-4 text-blue-400 font-bold font-mono">PUBLIC (Tier 2)</td>
                       <td className="p-4 text-gray-400">Marketing Assets, Website Content, Public Docs.</td>
                       <td className="p-4 text-green-300">Integrity Checks (Checksums), CDN Caching.</td>
                     </tr>
                   </tbody>
                 </table>
               </div>
            </section>

            <section>
               <h4 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
                   <Eye className="w-5 h-5" /> 2. The Panopticon (Total Visibility)
               </h4>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                 <div>
                    <p className="text-sm leading-relaxed text-gray-400 mb-4">
                        Adversaries hide in the gaps between your tools. Shadow IT (servers spun up by developers without approval) and IoT devices (smart printers, thermostats) are prime targets.
                    </p>
                    <p className="text-sm leading-relaxed text-gray-400 mb-4">
                        <strong>The "Dwell Time" Problem:</strong> The average hacker lives inside a network for 200+ days before detection. We aim to reduce this to minutes by ingesting logs from <em>everywhere</em> into a centralized SIEM system.
                    </p>
                 </div>
                 <div className="bg-black/40 border border-green-500/20 p-4 rounded text-xs font-mono space-y-2">
                    <div className="flex justify-between border-b border-gray-800 pb-1 font-bold text-gray-300">
                      <span>Log Source</span>
                      <span>Status</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Endpoint (EDR)</span>
                      <span>[CONNECTING...]</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Network (Firewall)</span>
                      <span>[ONLINE]</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Identity (Okta/AD)</span>
                      <span>[ONLINE]</span>
                    </div>
                    <div className="flex justify-between text-yellow-500 animate-pulse">
                      <span>Cloud (AWS/Azure)</span>
                      <span>[SYNCING logs...]</span>
                    </div>
                 </div>
               </div>
            </section>

            <section>
               <h4 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
                   <Layers className="w-5 h-5" /> 3. Compartmentalization (Blast Radius)
               </h4>
               <p className="text-sm leading-relaxed text-gray-400 mb-4">
                  We treat the network like a submarine. If the hull is breached, we seal the watertight doors to prevent the entire ship from sinking. This is <strong>Micro-Segmentation</strong>.
               </p>
               <ul className="space-y-3 text-sm text-gray-400">
                 <li className="flex items-start gap-3">
                   <CornerDownRight className="w-4 h-4 text-green-500 shrink-0 mt-1"/>
                   <span><strong>East-West Traffic Control:</strong> Just because two servers are inside the firewall doesn't mean they can talk. The "Database" should only accept traffic from the "App Server", never from the "Printer".</span>
                 </li>
                 <li className="flex items-start gap-3">
                   <CornerDownRight className="w-4 h-4 text-green-500 shrink-0 mt-1"/>
                   <span><strong>Zero Trust Policy Enforcement Point (PEP):</strong> A checkpoint that validates every single request, even internal ones. Every packet must present a visa to travel.</span>
                 </li>
               </ul>
            </section>

            <section>
               <h4 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
                   <Users className="w-5 h-5" /> 4. Cognitive Defense (Human Layer)
               </h4>
               <p className="text-sm leading-relaxed text-gray-400 mb-4">
                  90% of breaches start with a phishing email. You can have a $10M firewall, but if a user clicks a link that installs a RAT (Remote Access Trojan), the firewall is bypassed.
               </p>
               <div className="bg-red-900/10 border-l-2 border-red-500 p-4 rounded">
                  <strong className="text-red-400 text-xs uppercase mb-1 block">Active Countermeasure:</strong>
                  <p className="text-sm text-gray-300">
                    We run simulated phishing campaigns. We do not punish users who click; we educate them. We measure <strong>Reporting Rate</strong> rather than just Click Rate. A paranoid user is a secure user.
                  </p>
               </div>
            </section>

            <section>
              <h5 className="text-white font-bold mb-2">Technical Implementation: Strategy-as-Code</h5>
              <p className="text-xs text-gray-500 mb-2">Our high-level strategy translates directly into machine-enforceable policies (OPA/Terraform).</p>
              <CodeBlock 
                language="JSON"
                lines={[
                  "{",
                  "  \"policy_name\": \"Crown_Jewel_Isolation\",",
                  "  \"enforcement_mode\": \"BLOCK_AND_ALERT\",",
                  "  \"rules\": [",
                  "    {",
                  "      \"asset_tag\": \"TIER_0_DATA\",",
                  "      \"allowed_access\": [\"SYSTEM_ADMIN_MFA_VERIFIED\"],",
                  "      \"network_segment\": \"ISOLATED_VLAN_99\",",
                  "      \"egress_allowed\": false,",
                  "      \"encryption_at_rest\": \"AES_256_GCM\"",
                  "    }",
                  "  ]",
                  "}"
                ]}
              />
            </section>
          </div>
        </div>
      )
    },
    
    // =========================================================================
    // 3. CAPABILITIES
    // =========================================================================
    capabilities: {
      title: 'ACTIVE DEFENSE MODULES',
      subtitle: 'Next-Generation Cyber Capabilities.',
      body: (
        <div className="space-y-12">
          <p className="text-gray-300 leading-relaxed">
             Our system runs on a modular architecture. Depending on the threat environment, specific modules can be activated to provide layered defense.
             Each module operates independently but shares telemetry with the central core.
          </p>

          <div className="bg-gray-900/40 p-6 rounded border border-green-500/20 hover:bg-gray-900/60 transition-all">
             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Eye className="text-green-500 w-6 h-6" /> 1. Threat Detection (MDR)
             </h3>
             <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Managed Detection and Response (MDR) goes beyond simple antivirus software. Antivirus looks for "signatures"—known bad files. But hackers write new code every day.
             </p>
             <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                <strong>How it works:</strong> Our MDR system uses behavioral analysis. It doesn't care if a file <em>looks</em> safe; it watches what the file <em>does</em>. If a calculator app suddenly tries to open an internet connection to an external IP, MDR kills the process instantly.
             </p>
             <div className="grid grid-cols-2 gap-4 text-xs mt-4 border-t border-gray-700 pt-4">
               <div>
                 <strong className="text-white block">EDR (Endpoint)</strong>
                 <span className="text-gray-500">Watches laptops & servers.</span>
               </div>
               <div>
                 <strong className="text-white block">NDR (Network)</strong>
                 <span className="text-gray-500">Watches traffic flow.</span>
               </div>
             </div>
          </div>

          <div className="bg-gray-900/40 p-6 rounded border border-green-500/20 hover:bg-gray-900/60 transition-all">
             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Lock className="text-green-500 w-6 h-6" /> 2. Identity & Access (IAM)
             </h3>
             <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                "Identity is the new perimeter." We utilize Zero Trust Network Access (ZTNA). Even after you log in with your password, you are not inherently trusted.
             </p>
             <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                <strong>Conditional Access:</strong> The system checks context: Is your laptop patched? Are you logging in from a usual location? Authentication happens continuously.
             </p>
          </div>

          <div className="bg-gray-900/40 p-6 rounded border border-green-500/20 hover:bg-gray-900/60 transition-all">
             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="text-green-500 w-6 h-6" /> 3. Data Vault (DLP)
             </h3>
             <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Data Loss Prevention (DLP) ensures sensitive information stays inside the organization. If a user tries to upload a file containing Credit Card numbers to a public Dropbox, the transfer is blocked.
             </p>
          </div>

           <CodeBlock 
              command="./run_diagnostics.sh --module=ALL" 
              lines={[
                "> [INIT] Checking Endpoint Sensors...",
                "> [OK] 450/450 Nodes Reporting",
                "> [INIT] Verifying Identity Provider...",
                "> [OK] Zero Trust Policy: ENFORCED",
                "> [INFO] System is operating at 100% efficiency."
              ]}
           />
        </div>
      )
    },

    // =========================================================================
    // 4. CRYPTOGRAPHY (FULL EXPANDED)
    // =========================================================================
    crypto: {
      title: 'CRYPTOGRAPHIC ARSENAL',
      subtitle: 'Library Reference: cryptography.io // v42.0.5',
      body: (
        <div className="space-y-16 text-gray-400">
           
           <div className="prose prose-invert max-w-none text-sm leading-relaxed border-b border-gray-800 pb-8">
             <p className="text-lg text-white font-bold mb-4">The Mathematics of Secrecy</p>
             <p className="mb-4">
               Cryptography is the practice of securing communication in the presence of adversaries. It converts readable <strong className="text-green-400">Plaintext</strong> into unreadable <strong className="text-red-400">Ciphertext</strong>.
             </p>
             <p>
               We utilize the Python <code className="text-green-400">cryptography</code> library, which provides robust, peer-reviewed implementations of standard algorithms. Do not roll your own crypto.
             </p>
           </div>

           {/* --- SECTION 1: SYMMETRIC ENCRYPTION --- */}
           <section className="space-y-6">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                 <Key className="text-green-500 w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-white">1. Symmetric Encryption (AES)</h3>
                 <p className="text-xs text-green-500 uppercase tracking-widest">Shared Secret Architecture</p>
               </div>
             </div>
             
             

             <div className="bg-gray-900/30 p-6 rounded border border-gray-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Key className="w-32 h-32 text-green-500" />
                </div>
               <p className="text-sm mb-4 leading-relaxed">
                 In symmetric cryptography, the <strong>same key</strong> is used to lock and unlock the data. It is extremely fast and efficient for large files (databases, hard drives).
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mb-6">
                  <div>
                    <strong className="text-white block mb-1">Algorithm: AES-256</strong>
                    <p>The Advanced Encryption Standard. Approved by the NSA for Top Secret information.</p>
                  </div>
                  <div>
                    <strong className="text-white block mb-1">Mode: GCM (Galois/Counter Mode)</strong>
                    <p>Provides both encryption (secrecy) and integrity (tamper-proofing) simultaneously. Prevents "bit-flipping" attacks.</p>
                  </div>
               </div>

               <CodeBlock 
                 language="PYTHON"
                 lines={[
                   "import os",
                   "from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes",
                   "",
                   "# 1. GENERATE KEY & IV",
                   "key = os.urandom(32)  # 256-bit key",
                   "iv = os.urandom(12)   # 96-bit initialization vector",
                   "",
                   "# 2. ENCRYPT",
                   "cipher = Cipher(algorithms.AES(key), modes.GCM(iv))",
                   "encryptor = cipher.encryptor()",
                   "ciphertext = encryptor.update(b'NUCLEAR_LAUNCH_CODES') + encryptor.finalize()",
                   "",
                   "# 3. DECRYPT",
                   "# You need Key, IV, and the Auth Tag (encryptor.tag) to decrypt",
                   "decryptor = Cipher(algorithms.AES(key), modes.GCM(iv, encryptor.tag)).decryptor()",
                   "plaintext = decryptor.update(ciphertext) + decryptor.finalize()"
                 ]}
               />
             </div>
           </section>

           {/* --- SECTION 2: ASYMMETRIC ENCRYPTION --- */}
           <section className="space-y-6">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                 <Unlock className="text-blue-500 w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-white">2. Asymmetric Encryption (RSA)</h3>
                 <p className="text-xs text-blue-500 uppercase tracking-widest">Public Key Infrastructure</p>
               </div>
             </div>

             

             <div className="bg-gray-900/30 p-6 rounded border border-gray-800 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Unlock className="w-32 h-32 text-blue-500" />
               </div>
               <p className="text-sm mb-4 leading-relaxed">
                 Solves the problem of "How do I share a key without someone stealing it?" Uses a mathematically linked pair of keys:
               </p>
               <ul className="list-disc pl-5 text-sm text-gray-400 space-y-2 mb-6">
                 <li><strong className="text-white">Public Key:</strong> Shared with the world. Anyone can use it to encrypt a message for you.</li>
                 <li><strong className="text-red-400">Private Key:</strong> Kept secret. Only you can decrypt messages sent to your public key.</li>
               </ul>

               <CodeBlock 
                 language="PYTHON"
                 lines={[
                   "from cryptography.hazmat.primitives.asymmetric import rsa, padding",
                   "from cryptography.hazmat.primitives import hashes",
                   "",
                   "# 1. GENERATE KEY PAIR",
                   "private_key = rsa.generate_private_key(",
                   "    public_exponent=65537,",
                   "    key_size=2048,",
                   ")",
                   "public_key = private_key.public_key()",
                   "",
                   "# 2. ENCRYPT (Using Public Key)",
                   "ciphertext = public_key.encrypt(",
                   "    b'Mission Report: December 16, 1991',",
                   "    padding.OAEP(",
                   "        mgf=padding.MGF1(algorithm=hashes.SHA256()),",
                   "        algorithm=hashes.SHA256(),",
                   "        label=None",
                   "    )",
                   ")",
                   "",
                   "# 3. DECRYPT (Using Private Key)",
                   "plaintext = private_key.decrypt(",
                   "    ciphertext,",
                   "    padding.OAEP(",
                   "        mgf=padding.MGF1(algorithm=hashes.SHA256()),",
                   "        algorithm=hashes.SHA256(),",
                   "        label=None",
                   "    )",
                   ")"
                 ]}
               />
             </div>
           </section>

           {/* --- SECTION 3: DIGITAL SIGNATURES --- */}
           <section className="space-y-6">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                 <ShieldCheck className="text-purple-500 w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-white">3. Digital Signatures</h3>
                 <p className="text-xs text-purple-500 uppercase tracking-widest">Authenticity & Non-Repudiation</p>
               </div>
             </div>

             

             <div className="bg-gray-900/30 p-6 rounded border border-gray-800 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <ShieldCheck className="w-32 h-32 text-purple-500" />
               </div>
               <p className="text-sm mb-4 leading-relaxed">
                 A digital signature proves that a message came from YOU and was not altered. You "sign" a hash of the data with your <strong className="text-red-400">Private Key</strong>. Anyone can verify it with your <strong className="text-white">Public Key</strong>.
               </p>
               <CodeBlock 
                 language="PYTHON"
                 lines={[
                   "# SIGNING",
                   "signature = private_key.sign(",
                   "    b'Deploy Update v2.0',",
                   "    padding.PSS(",
                   "        mgf=padding.MGF1(hashes.SHA256()),",
                   "        salt_length=padding.PSS.MAX_LENGTH",
                   "    ),",
                   "    hashes.SHA256()",
                   ")",
                   "",
                   "# VERIFYING (Raises InvalidSignature if fake)",
                   "public_key.verify(",
                   "    signature,",
                   "    b'Deploy Update v2.0',",
                   "    padding.PSS(",
                   "        mgf=padding.MGF1(hashes.SHA256()),",
                   "        salt_length=padding.PSS.MAX_LENGTH",
                   "    ),",
                   "    hashes.SHA256()",
                   ")"
                 ]}
               />
             </div>
           </section>

           {/* --- SECTION 4: HASHING --- */}
           <section className="space-y-6">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                 <Fingerprint className="text-yellow-500 w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-white">4. Hashing (Integrity)</h3>
                 <p className="text-xs text-yellow-500 uppercase tracking-widest">One-Way Fingerprints</p>
               </div>
             </div>
             
             

             <div className="bg-gray-900/30 p-6 rounded border border-gray-800 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Fingerprint className="w-32 h-32 text-yellow-500" />
               </div>
               <p className="text-sm mb-4 leading-relaxed">
                 A hash function takes input of any size and produces a fixed-size string (the "digest"). It is irreversible. Changing even one bit of the input changes the entire hash completely (Avalanche Effect).
               </p>
               <div className="flex gap-4 text-xs font-mono mb-4">
                 <span className="bg-gray-800 px-2 py-1 rounded text-red-400 border border-red-500/20">MD5: BROKEN</span>
                 <span className="bg-gray-800 px-2 py-1 rounded text-red-400 border border-red-500/20">SHA1: BROKEN</span>
                 <span className="bg-gray-800 px-2 py-1 rounded text-green-400 border border-green-500/20">SHA-256: SECURE</span>
               </div>
               <CodeBlock 
                 language="PYTHON"
                 lines={[
                   "from cryptography.hazmat.primitives import hashes",
                   "",
                   "digest = hashes.Hash(hashes.SHA256())",
                   "digest.update(b'Download complete.')",
                   "digest.update(b' Verifying integrity.')",
                   "hash_val = digest.finalize()",
                   "",
                   "print(hash_val.hex())",
                   "# Output: 8d3f7d...",
                 ]}
               />
             </div>
           </section>

        </div>
      )
    },
    
    // =========================================================================
    // 5. PROTOCOLS
    // =========================================================================
    protocols: {
      title: 'REGULATORY PROTOCOLS',
      subtitle: 'Compliance, Trust, and Resilience.',
      body: (
        <div className="space-y-8">
           <div className="border-l-4 border-yellow-500 bg-yellow-900/10 p-6">
             <h3 className="text-xl font-bold text-yellow-500 mb-2">ZERO TRUST MANDATE</h3>
             <p className="text-gray-300 text-sm leading-relaxed">
               The core protocol of this system is <strong>Zero Trust</strong>. In a traditional network, once you VPN in, you can access everything. In our system, the network assumes you are compromised. Every request—whether it is reading a file or opening a database—requires a fresh authentication token.
             </p>
           </div>
           
           <div className="space-y-6">
             <div className="flex gap-4 items-start border-b border-gray-800 pb-6">
               <div className="w-12 h-12 rounded bg-gray-900 border border-green-500/30 flex items-center justify-center shrink-0 text-green-500 font-bold font-mono text-xl">01</div>
               <div>
                 <h4 className="text-white font-bold text-lg">Resilience Over Defense</h4>
                 <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                   <strong>Why?</strong> No wall is high enough to keep out a determined nation-state actor.
                   <br/>
                   <strong>The Protocol:</strong> Instead of focusing 100% of resources on keeping hackers out, we allocate 50% to <strong>Incident Response</strong>. We ensure that when a system goes down, we have "immutable backups" (backups that cannot be deleted or encrypted) ready to restore operations within minutes, not days.
                 </p>
               </div>
             </div>

             <div className="flex gap-4 items-start border-b border-gray-800 pb-6">
               <div className="w-12 h-12 rounded bg-gray-900 border border-green-500/30 flex items-center justify-center shrink-0 text-green-500 font-bold font-mono text-xl">02</div>
               <div>
                 <h4 className="text-white font-bold text-lg">Ethical Innovation</h4>
                 <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                   <strong>Why?</strong> AI models can hallucinate or be poisoned by bad data.
                   <br/>
                   <strong>The Protocol:</strong> Any AI used in security (like our Threat Detection bots) must have human oversight. We do not allow AI to automatically delete user data without a human analyst confirming the threat first. This prevents "false positives" from destroying legitimate business operations.
                 </p>
               </div>
             </div>

             <div className="flex gap-4 items-start border-b border-gray-800 pb-6">
               <div className="w-12 h-12 rounded bg-gray-900 border border-green-500/30 flex items-center justify-center shrink-0 text-green-500 font-bold font-mono text-xl">03</div>
               <div>
                 <h4 className="text-white font-bold text-lg">Regulatory Alignment</h4>
                 <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                   <strong>Why?</strong> Laws like GDPR and CCPA impose massive fines for mishandling user data.
                   <br/>
                   <strong>The Protocol:</strong> All personal data is pseudonymized. We conduct quarterly Privacy Impact Assessments (PIA) to ensure that we are not collecting more data than we strictly need to operate.
                 </p>
               </div>
             </div>
           </div>
           
           <div className="mt-8 bg-black/40 p-4 rounded border border-green-500/20">
              <h5 className="text-green-500 font-bold text-sm mb-2"> <CheckSquare className="inline w-4 h-4 mr-2"/> COMPLIANCE CHECKLIST</h5>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="w-4 h-4 border border-gray-600 rounded flex items-center justify-center group-hover:border-green-500 transition-colors">
                     <div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div>
                  </div>
                  <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Multi-Factor Authentication (MFA) Enforced</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="w-4 h-4 border border-gray-600 rounded flex items-center justify-center group-hover:border-green-500 transition-colors">
                     <div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div>
                  </div>
                  <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Data Encryption Standards Met</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="w-4 h-4 border border-gray-600 rounded flex items-center justify-center group-hover:border-green-500 transition-colors">
                     <div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div>
                  </div>
                  <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Third-Party Risk Assessment Complete</span>
                </label>
              </div>
           </div>
        </div>
      )
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-green-400 font-mono relative overflow-x-hidden animate-fade-in">
      
      {/* 3D Background */}
      <HackerBackground />

      {/* Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-green-900/50 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Link to="/" className="text-green-500 hover:text-white transition-colors">
                <ChevronRight className="w-6 h-6 rotate-180" />
             </Link>
             <span className="font-bold tracking-widest text-white">
               SYSTEM_MANUAL <span className="text-green-600 text-xs align-top">v7.0</span>
             </span>
           </div>
           <div className="hidden md:block text-xs text-gray-600">
             // READ_ONLY_ACCESS // CLASSIFIED
           </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="container mx-auto px-4 pt-24 pb-12 flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 border border-green-900/50 bg-black/60 rounded-lg overflow-hidden backdrop-blur-md">
            <div className="p-4 border-b border-green-900/50 bg-green-900/10">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Directory</h2>
            </div>
            <nav className="flex flex-col py-2">
              <NavItem 
                active={activeSection === 'fundamentals'} 
                label="Fundamentals" 
                icon={BookOpen} 
                onClick={() => setActiveSection('fundamentals')} 
              />
              <NavItem 
                active={activeSection === 'strategy'} 
                label="Strategy" 
                icon={Target} 
                onClick={() => setActiveSection('strategy')} 
              />
              <NavItem 
                active={activeSection === 'capabilities'} 
                label="Capabilities" 
                icon={Cpu} 
                onClick={() => setActiveSection('capabilities')} 
              />
              <NavItem 
                active={activeSection === 'crypto'} 
                label="Cryptography" 
                icon={Lock} 
                onClick={() => setActiveSection('crypto')} 
              />
              <NavItem 
                active={activeSection === 'protocols'} 
                label="Protocols" 
                icon={AlertTriangle} 
                onClick={() => setActiveSection('protocols')} 
              />
            </nav>
            <div className="p-4 border-t border-green-900/50 text-[10px] text-gray-600 text-center">
               SECURE CONNECTION ESTABLISHED<br/>
               IP: 192.168.0.X
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-h-[60vh]">
          <ScrollReveal key={activeSection}>
            <div className="bg-black/60 border border-green-500/20 rounded-lg p-6 md:p-10 relative overflow-hidden backdrop-blur-md shadow-[0_0_50px_rgba(0,255,0,0.05)]">
               {/* Decorative corner markers */}
               <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500"></div>
               <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500"></div>
               <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500"></div>
               <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500"></div>

               <header className="mb-10 border-b border-green-900/50 pb-6">
                 <h1 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase glitch-effect">
                   {content[activeSection].title}
                 </h1>
                 <p className="text-green-500/60 text-sm font-mono">
                   {content[activeSection].subtitle}
                 </p>
               </header>

               <div className="prose prose-invert prose-p:font-mono prose-headings:font-mono max-w-none">
                 {content[activeSection].body}
               </div>

            </div>
          </ScrollReveal>
        </main>

      </div>
    </div>
  );
}