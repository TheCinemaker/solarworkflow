import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Hibás email cím vagy jelszó!' : error.message);
      setLoading(false);
      return;
    }
    
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center p-5 relative overflow-hidden font-sans">
      {/* Ambient Neon Blobs */}
      <div 
        className="absolute w-[350px] h-[350px] rounded-full filter blur-[100px] opacity-[0.22] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #4f8ef7 0%, transparent 70%)',
          top: '-5%',
          left: '-5%',
          animation: 'float-slow 20s infinite alternate'
        }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full filter blur-[110px] opacity-[0.18] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #ffd60a 0%, transparent 70%)',
          bottom: '-10%',
          right: '-5%',
          animation: 'float-slow-reverse 25s infinite alternate'
        }}
      />
      
      {/* Apple-style Cyber Glassmorphic Card */}
      <div 
        className="max-w-[390px] w-full p-8 rounded-[26px] shadow-2xl relative z-10 animate-[fadeIn_0.5s_ease-out]"
        style={{
          background: 'var(--s1)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--b1)',
        }}
      >
        {/* Fine Linear Gradient Top Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Pulsing Cyber Logo */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
            {/* Spinning Outer Ring */}
            <div className="absolute inset-0 rounded-[22px] border border-cyan-500/20 animate-spin" style={{ animationDuration: '10s' }} />
            {/* Pulsing Core Glow */}
            <div className="absolute w-14 h-14 bg-cyan-500/10 rounded-2xl filter blur-[4px] animate-pulse" />
            
            {/* Central Lightning Container */}
            <div className="w-14 h-14 bg-[#07090f]/80 rounded-2xl flex items-center justify-center border border-cyan-500/30 z-10 shadow-lg shadow-cyan-500/5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-cyan-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Belépés</h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1.5">Solar & Villanyszerelő Munkalapok</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-5 text-[11px] text-center font-bold tracking-tight">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Cím</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#07090f]/60 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-700"
              style={{
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
              }}
              placeholder="pelda@email.com"
              required
            />
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Jelszó</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#07090f]/60 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-700"
              style={{
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
              }}
              placeholder="••••••••"
              required
            />
          </div>

          {/* Glowing Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-xs font-black uppercase tracking-widest text-white py-3 px-4 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center shadow-lg cursor-pointer mt-2"
            style={{
              background: 'linear-gradient(135deg, #4f8ef7, #2a5ccc)',
              boxShadow: '0 8px 24px rgba(79, 142, 247, 0.22)',
            }}
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Bejelentkezés'
            )}
          </button>
        </form>
      </div>

      {/* Embedded Custom CSS Keyframes */}
      <style>{`
        @keyframes float-slow {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(30px) scale(1.1); }
        }
        @keyframes float-slow-reverse {
          0% { transform: translateY(0) scale(1.1); }
          100% { transform: translateY(-30px) scale(1); }
        }
      `}</style>
    </div>
  );
}
