import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicHeader from "../../components/public/PublicHeader";
import Footer from "../../components/common/Footer";

const PublicLanding = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Text-to-Speech welcome message with loading
  useEffect(() => {
    // Start loading animation
    const duration = 4000; // 4 seconds total
    const steps = 100;
    const interval = duration / steps;
    
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += 1;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    }, interval);

    // Start speech at the beginning
    const speakWelcome = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(
          "Welcome To The Hybrid Quantum-Safe Banking System"
        );
        
        // Configure voice settings for sweet sound
        utterance.rate = 0.85; // Slower for better sync with loading
        utterance.pitch = 1.1; // Slightly higher pitch for sweetness
        utterance.volume = 0.8; // 80% volume
        utterance.lang = 'en-US';
        
        const setVoice = () => {
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(voice => 
            voice.name.includes('Female') || 
            voice.name.includes('Samantha') ||
            voice.name.includes('Victoria') ||
            voice.name.includes('Google US English') ||
            voice.name.includes('Microsoft Zira')
          );
          
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          
          // Speak immediately when loading starts
          setTimeout(() => {
            window.speechSynthesis.speak(utterance);
          }, 300);
        };
        
        if (window.speechSynthesis.getVoices().length > 0) {
          setVoice();
        } else {
          window.speechSynthesis.onvoiceschanged = setVoice;
        }
      }
    };
    
    speakWelcome();
    
    return () => {
      clearInterval(progressInterval);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // World-class loading screen (LIGHT MODE)
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-white via-cyan-50 to-blue-50 overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl animate-pulse-slower"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-3xl animate-pulse-slowest"></div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-cyan-500/40 rounded-full animate-float-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`
              }}
            ></div>
          ))}
        </div>

        {/* Main loading content */}
        <div className="relative z-10 text-center px-4 max-w-2xl">
          {/* Logo/Brand */}
          <div className="mb-8 animate-fade-in-down">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-2xl shadow-cyan-500/30 mb-6 animate-pulse-glow">
              <span className="text-4xl font-bold text-white">PQ</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-3 tracking-tight">
               Hybrid Quantum-Safe
            </h1>
            <p className="text-xl md:text-2xl text-cyan-600 font-semibold">
              Banking System
            </p>
          </div>

          {/* Progress Circle */}
          <div className="relative w-48 h-48 mx-auto mb-8">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-20 blur-xl animate-pulse"></div>
            
            {/* SVG Progress Circle */}
            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth="12"
              />
              
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 85}`}
                strokeDashoffset={`${2 * Math.PI * 85 * (1 - progress / 100)}`}
                className="transition-all duration-100 ease-out drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]"
              />
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center percentage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-slate-800 mb-1 animate-pulse-number">
                  {progress}
                </div>
                <div className="text-sm text-cyan-600 font-semibold tracking-wider">
                  LOADING
                </div>
              </div>
            </div>
          </div>

          {/* Loading bar */}
          <div className="w-full max-w-md mx-auto mb-6">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-100 ease-out shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Loading text */}
          <div className="space-y-2 animate-fade-in-up">
            <p className="text-lg text-slate-700 font-medium">
              Initializing Quantum-Safe Infrastructure
            </p>
            <div className="flex items-center justify-center gap-2 text-cyan-500">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>

          {/* Security badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-8 animate-fade-in-up" style={{animationDelay: '500ms'}}>
            <span className="px-4 py-2 text-xs font-bold tracking-wider text-cyan-700 bg-white border-2 border-cyan-300 rounded-full shadow-sm">
              🔒 ML-KEM-768
            </span>
            <span className="px-4 py-2 text-xs font-bold tracking-wider text-blue-700 bg-white border-2 border-blue-300 rounded-full shadow-sm">
              🛡️ AES-256-GCM
            </span>
            <span className="px-4 py-2 text-xs font-bold tracking-wider text-indigo-700 bg-white border-2 border-indigo-300 rounded-full shadow-sm">
              ⚛️ NIST PQC
            </span>
          </div>
        </div>

        <style jsx>{`
          @keyframes float-particle {
            0%, 100% {
              transform: translate(0, 0) scale(1);
              opacity: 0.3;
            }
            25% {
              transform: translate(20px, -20px) scale(1.2);
              opacity: 0.6;
            }
            50% {
              transform: translate(-15px, -40px) scale(0.8);
              opacity: 0.4;
            }
            75% {
              transform: translate(-25px, -20px) scale(1.1);
              opacity: 0.5;
            }
          }

          @keyframes pulse-slow {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.05); }
          }

          @keyframes pulse-slower {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.08); }
          }

          @keyframes pulse-slowest {
            0%, 100% { opacity: 0.1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.1); }
          }

          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 40px rgba(34, 211, 238, 0.3); }
            50% { box-shadow: 0 0 60px rgba(34, 211, 238, 0.5); }
          }

          @keyframes pulse-number {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }

          @keyframes fade-in-down {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .animate-float-particle {
            animation: float-particle linear infinite;
          }

          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }

          .animate-pulse-slower {
            animation: pulse-slower 6s ease-in-out infinite;
          }

          .animate-pulse-slowest {
            animation: pulse-slowest 8s ease-in-out infinite;
          }

          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }

          .animate-pulse-number {
            animation: pulse-number 0.5s ease-in-out infinite;
          }

          .animate-fade-in-down {
            animation: fade-in-down 0.8s ease-out;
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-cyan-50 text-slate-900">
      <PublicHeader />
      
      <main className="flex flex-col gap-16 px-4 py-8 mx-auto max-w-7xl md:px-8 md:py-12 lg:py-16">
        
        {/* Hero Section */}
        <section
          id="hero"
          className="text-center transition-all duration-700 animate-fade-in-up"
        >
          <div className="inline-block px-4 py-1 mb-4 text-xs font-semibold tracking-wider text-cyan-700 uppercase bg-cyan-100 rounded-full">
            Academic Research Project
          </div>
          <h1 className="text-5xl font-extrabold leading-tight text-slate-900 md:text-6xl">
            Hybrid Quantum-Safe Banking System
          </h1>
          <p className="mt-4 text-xl text-slate-600 md:text-2xl">
            PQC + RSA/ECC + AES-256
          </p>
          <p className="max-w-3xl mx-auto mt-6 text-lg text-slate-600">
            A next-generation banking platform combining Post-Quantum Cryptography 
            with classical encryption methods to ensure security in both current 
            and quantum computing eras.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              to="/login"
              className="px-8 py-3 text-white no-underline transition duration-200 rounded-lg shadow-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 hover:scale-105"
            >
              Access System Login
            </Link>
            <a
              href="#architecture"
              className="px-8 py-3 no-underline transition duration-200 border-2 rounded-lg border-cyan-500 text-cyan-700 hover:bg-cyan-50"
            >
              View Security Architecture
            </a>
          </div>
        </section>

        {/* About the System */}
        <section
          id="about"
          className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] animate-fade-in"
        >
          <h2 className="text-3xl font-bold text-center text-slate-900">
            About the System
          </h2>
          <p className="max-w-4xl mx-auto mt-4 text-lg text-center text-slate-600">
            This hybrid quantum-safe banking application demonstrates a defense-in-depth 
            approach to cryptographic security, preparing financial systems for the 
            post-quantum era.
          </p>
          
          <div className="grid gap-6 mt-8 md:grid-cols-3">
            <div className="p-6 transition border rounded-2xl border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-lg">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-cyan-100">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Hybrid Cryptography</h3>
              <p className="mt-2 text-sm text-slate-600">
                Combines quantum-resistant algorithms (ML-KEM, ML-DSA) with proven 
                classical methods (RSA, ECC) for layered protection against both 
                current and future threats.
              </p>
            </div>

            <div className="p-6 transition border rounded-2xl border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-lg">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-indigo-100">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Defense-in-Depth</h3>
              <p className="mt-2 text-sm text-slate-600">
                Multiple security layers including RBAC, certificate-based authentication, 
                device binding, immutable audit logs, and encrypted data storage ensure 
                comprehensive protection.
              </p>
            </div>

            <div className="p-6 transition border rounded-2xl border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-lg">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-emerald-100">
                <span className="text-2xl">🔬</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Future-Proof Design</h3>
              <p className="mt-2 text-sm text-slate-600">
                Built on NIST-standardized post-quantum algorithms (FIPS 203/204) 
                to resist attacks from quantum computers while maintaining backward 
                compatibility with existing systems.
              </p>
            </div>
          </div>
        </section>

        {/* Security Architecture Overview */}
        <section
          id="architecture"
          className="rounded-3xl border border-white/70 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-8 text-white shadow-[0_20px_50px_rgba(15,23,42,0.2)] animate-fade-in-up"
        >
          <h2 className="text-3xl font-bold text-center">
            High-Level Security Architecture
          </h2>
          <p className="max-w-3xl mx-auto mt-4 text-center text-slate-300">
            A multi-layered security framework designed for quantum resistance and operational excellence
          </p>

          <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-5 border rounded-xl bg-white/10 border-white/20">
              <h4 className="text-lg font-semibold text-cyan-300">Authentication Layer</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Hybrid certificate issuance</li>
                <li>Device binding verification</li>
                <li>Multi-factor authentication</li>
                <li>Certificate revocation (CRL)</li>
              </ul>
            </div>

            <div className="p-5 border rounded-xl bg-white/10 border-white/20">
              <h4 className="text-lg font-semibold text-indigo-300">Authorization Layer</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Role-Based Access Control</li>
                <li>Permission management</li>
                <li>Least privilege principle</li>
                <li>Dynamic policy enforcement</li>
              </ul>
            </div>

            <div className="p-5 border rounded-xl bg-white/10 border-white/20">
              <h4 className="text-lg font-semibold text-emerald-300">Encryption Layer</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>AES-256-GCM (data at rest)</li>
                <li>ML-KEM-768 (key exchange)</li>
                <li>RSA-3072 (classical PKI)</li>
                <li>Hybrid encryption modes</li>
              </ul>
            </div>

            <div className="p-5 border rounded-xl bg-white/10 border-white/20">
              <h4 className="text-lg font-semibold text-amber-300">Audit Layer</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Immutable audit trails</li>
                <li>Transaction logging</li>
                <li>Security event monitoring</li>
                <li>Compliance reporting</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Cryptography Layers Explanation */}
        <section
          id="cryptography"
          className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] animate-fade-in"
        >
          <h2 className="text-3xl font-bold text-center text-slate-900">
            Cryptographic Layers
          </h2>
          <p className="max-w-3xl mx-auto mt-4 text-center text-slate-600">
            Three-tier cryptographic protection ensuring security across all system components
          </p>

          <div className="mt-8 space-y-6">
            {/* Layer 1: Data at Rest */}
            <div className="p-6 border rounded-2xl border-cyan-200 bg-gradient-to-r from-cyan-50 to-white">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center flex-shrink-0 w-16 h-16 text-2xl rounded-full bg-cyan-100">
                  💾
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">
                    Layer 1: Data at Rest Protection
                  </h3>
                  <p className="mt-2 font-mono text-sm font-semibold text-cyan-700">
                    AES-256-GCM (Advanced Encryption Standard)
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    All sensitive data stored in the database is encrypted using AES-256 in 
                    Galois/Counter Mode, providing both confidentiality and authenticity. 
                    This includes customer records, transaction history, and audit logs.
                  </p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700">
                      256-bit security
                    </span>
                    <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700">
                      FIPS 197 compliant
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 2: Classical PKI */}
            <div className="p-6 border rounded-2xl border-indigo-200 bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center flex-shrink-0 w-16 h-16 text-2xl rounded-full bg-indigo-100">
                  🔑
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">
                    Layer 2: Classical Key Exchange
                  </h3>
                  <p className="mt-2 font-mono text-sm font-semibold text-indigo-700">
                    RSA-3072 / ECC-256 (Public Key Infrastructure)
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Traditional asymmetric cryptography for certificate signing, key exchange, 
                    and digital signatures. Provides 128-bit security level and ensures 
                    compatibility with existing PKI infrastructure.
                  </p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                      RSA-3072 signatures
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                      ECC-256 key exchange
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 3: Post-Quantum */}
            <div className="p-6 border rounded-2xl border-emerald-200 bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center flex-shrink-0 w-16 h-16 text-2xl rounded-full bg-emerald-100">
                  ⚛️
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">
                    Layer 3: Post-Quantum Cryptography
                  </h3>
                  <p className="mt-2 font-mono text-sm font-semibold text-emerald-700">
                    ML-KEM-768 + ML-DSA-65 (NIST PQC Standards)
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Quantum-resistant algorithms based on lattice cryptography. ML-KEM (Module 
                    Lattice Key Encapsulation Mechanism) for key exchange and ML-DSA (Module 
                    Lattice Digital Signature Algorithm) for signatures, both at NIST Level 3 security.
                  </p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      FIPS 203 (ML-KEM)
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      FIPS 204 (ML-DSA)
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      Quantum-resistant
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benchmarking & Strength Metrics */}
        <section
          id="benchmarking"
          className="rounded-3xl border border-white/70 bg-gradient-to-br from-white via-indigo-50/30 to-cyan-50/40 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] animate-fade-in-up"
        >
          <h2 className="text-3xl font-bold text-center text-slate-900">
            Security Strength & Benchmarking
          </h2>
          <p className="max-w-3xl mx-auto mt-4 text-center text-slate-600">
            Comparative analysis of cryptographic strength and attack resistance
          </p>

          {/* Security Strength Comparison Table */}
          <div className="mt-8 overflow-hidden border rounded-2xl border-slate-200 bg-white/90">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Algorithm
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Security Level
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Classical Attack
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Quantum Attack
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      AES-256
                    </td>
                    <td className="px-4 py-3 text-slate-600">Symmetric</td>
                    <td className="px-4 py-3 text-slate-600">256-bit</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Secure (2^256)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                        Reduced (2^128)
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      RSA-3072
                    </td>
                    <td className="px-4 py-3 text-slate-600">Asymmetric</td>
                    <td className="px-4 py-3 text-slate-600">128-bit equiv.</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Secure
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        Vulnerable
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      ECC-256
                    </td>
                    <td className="px-4 py-3 text-slate-600">Asymmetric</td>
                    <td className="px-4 py-3 text-slate-600">128-bit equiv.</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Secure
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        Vulnerable
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      ML-KEM-768
                    </td>
                    <td className="px-4 py-3 text-slate-600">PQC Key Exchange</td>
                    <td className="px-4 py-3 text-slate-600">NIST Level 3</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Secure
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Resistant
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      ML-DSA-65
                    </td>
                    <td className="px-4 py-3 text-slate-600">PQC Signature</td>
                    <td className="px-4 py-3 text-slate-600">NIST Level 3</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Secure
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Resistant
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Attack Resistance Matrix */}
          <div className="grid gap-6 mt-8 md:grid-cols-2">
            <div className="p-6 border rounded-2xl border-slate-200 bg-white/90">
              <h3 className="text-lg font-semibold text-slate-900">
                Classical Attack Resistance
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Protection against current computational threats
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Brute Force</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-emerald-500" style={{width: '100%'}}></div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Excellent</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Factorization</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-emerald-500" style={{width: '100%'}}></div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Excellent</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Discrete Log</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-emerald-500" style={{width: '100%'}}></div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Excellent</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Side-Channel</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-cyan-500" style={{width: '85%'}}></div>
                    </div>
                    <span className="text-xs font-semibold text-cyan-600">Strong</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border rounded-2xl border-slate-200 bg-white/90">
              <h3 className="text-lg font-semibold text-slate-900">
                Quantum Attack Resistance
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Protection against quantum computational threats
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Shor's Algorithm</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-emerald-500" style={{width: '100%'}}></div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Resistant</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Grover's Algorithm</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-cyan-500" style={{width: '75%'}}></div>
                    </div>
                    <span className="text-xs font-semibold text-cyan-600">Mitigated</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Lattice Attacks</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-emerald-500" style={{width: '95%'}}></div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Resistant</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Harvest Now, Decrypt Later</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-emerald-500" style={{width: '100%'}}></div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Protected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance vs Security Trade-off */}
          <div className="p-6 mt-8 border rounded-2xl border-indigo-200 bg-gradient-to-r from-indigo-50 to-white">
            <h3 className="text-xl font-semibold text-center text-slate-900">
              Performance vs Security Trade-off Analysis
            </h3>
            <div className="grid gap-6 mt-6 md:grid-cols-3">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-3 rounded-full bg-emerald-100">
                  <span className="text-2xl">⚡</span>
                </div>
                <h4 className="font-semibold text-slate-900">Classical Only</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Fast performance but vulnerable to quantum attacks. Not future-proof.
                </p>
                <div className="flex justify-center gap-2 mt-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                    High Speed
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                    Low Q-Security
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-3 rounded-full bg-cyan-100">
                  <span className="text-2xl">⚖️</span>
                </div>
                <h4 className="font-semibold text-slate-900">Hybrid Approach</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Balanced performance with quantum resistance. Best of both worlds.
                </p>
                <div className="flex justify-center gap-2 mt-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-cyan-100 text-cyan-700">
                    Good Speed
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                    High Q-Security
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-3 rounded-full bg-indigo-100">
                  <span className="text-2xl">🔒</span>
                </div>
                <h4 className="font-semibold text-slate-900">PQC Only</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Maximum quantum security but higher computational overhead.
                </p>
                <div className="flex justify-center gap-2 mt-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                    Moderate Speed
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                    Max Q-Security
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System Strength Indicators */}
        <section
          id="indicators"
          className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] animate-fade-in"
        >
          <h2 className="text-3xl font-bold text-center text-slate-900">
            System Strength Indicators
          </h2>
          <p className="max-w-3xl mx-auto mt-4 text-center text-slate-600">
            Key security features that make this system enterprise-ready
          </p>

          <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 transition border rounded-2xl border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100">
                  <span className="text-xl">⚛️</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Quantum-Safe Design</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• NIST-standardized PQC algorithms</li>
                <li>• Hybrid certificate infrastructure</li>
                <li>• Future-proof key management</li>
                <li>• Quantum threat mitigation</li>
              </ul>
            </div>

            <div className="p-6 transition border rounded-2xl border-indigo-200 bg-gradient-to-br from-indigo-50 to-white hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100">
                  <span className="text-xl">🛡️</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Defense-in-Depth</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Multi-layer security architecture</li>
                <li>• Redundant protection mechanisms</li>
                <li>• Fail-safe design principles</li>
                <li>• Zero-trust network model</li>
              </ul>
            </div>

            <div className="p-6 transition border rounded-2xl border-cyan-200 bg-gradient-to-br from-cyan-50 to-white hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-100">
                  <span className="text-xl">👥</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">RBAC System</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Role-based access control</li>
                <li>• Fine-grained permissions</li>
                <li>• Separation of duties</li>
                <li>• Dynamic policy enforcement</li>
              </ul>
            </div>

            <div className="p-6 transition border rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
                  <span className="text-xl">📜</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Certificate Management</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Hybrid certificate issuance</li>
                <li>• Automated revocation (CRL)</li>
                <li>• Certificate lifecycle management</li>
                <li>• Device binding verification</li>
              </ul>
            </div>

            <div className="p-6 transition border rounded-2xl border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
                  <span className="text-xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Audit Logs</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Immutable audit trail</li>
                <li>• Transaction logging</li>
                <li>• Security event monitoring</li>
                <li>• Compliance reporting</li>
              </ul>
            </div>

            <div className="p-6 transition border rounded-2xl border-rose-200 bg-gradient-to-br from-rose-50 to-white hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100">
                  <span className="text-xl">💾</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Backup & Recovery</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Automated backup system</li>
                <li>• Encrypted backup storage</li>
                <li>• Disaster recovery procedures</li>
                <li>• Data integrity verification</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section
          id="cta"
          className="rounded-3xl border border-white/70 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 p-8 text-white shadow-[0_20px_50px_rgba(14,116,144,0.3)] animate-fade-in-up text-center"
        >
          <h2 className="text-3xl font-bold">Ready to Experience Quantum-Safe Banking?</h2>
          <p className="max-w-2xl mx-auto mt-4 text-lg text-white/90">
            Access the secure platform or explore our comprehensive security architecture documentation
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              to="/login"
              className="px-8 py-3 text-lg font-semibold text-cyan-600 no-underline transition bg-white rounded-lg shadow-lg hover:bg-slate-50 hover:scale-105"
            >
              Login to System
            </Link>
            <a
              href="#architecture"
              className="px-8 py-3 text-lg font-semibold text-white no-underline transition border-2 border-white rounded-lg hover:bg-white/10"
            >
              View Architecture
            </a>
            <Link
              to="/register"
              className="px-8 py-3 text-lg font-semibold text-white no-underline transition border-2 border-white rounded-lg hover:bg-white/10"
            >
              Create Account
            </Link>
          </div>
        </section>

        {/* Academic Disclaimer */}
        <section className="p-6 text-center border rounded-2xl border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Academic Research Disclaimer
          </p>
          <p className="max-w-4xl mx-auto mt-3 text-sm text-slate-600">
            This is an academic research project demonstrating hybrid quantum-safe cryptography 
            in banking applications. The system implements NIST-standardized post-quantum algorithms 
            (FIPS 203/204) combined with classical cryptographic methods for educational and research 
            purposes. All cryptographic implementations follow published standards and best practices. 
            This platform is designed for demonstration and research purposes to explore the integration 
            of quantum-resistant cryptography in financial systems.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
            <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700">
              NIST PQC Compliant
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700">
              Research Project
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700">
              Educational Purpose
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700">
              Open Standards
            </span>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default PublicLanding;
