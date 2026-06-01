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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Hibás email cím vagy jelszó!' : error.message);
      setLoading(false);
      return;
    }
    navigate('/');
  };

  const inputStyle = {
    background: 'var(--s1)',
    border: '1px solid var(--b1)',
    borderRadius: 'var(--input-r)',
    padding: '11px 14px',
    color: 'var(--t1)',
    fontSize: '15px',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  };

  const labelStyle = {
    display: 'block',
    color: 'var(--t3)',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '7px',
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="glow-top" />
      <div className="glow-bot" />

      <div style={{
        width: '100%',
        maxWidth: '360px',
        background: 'var(--s1)',
        border: '1px solid var(--b1)',
        borderRadius: 'var(--card-r)',
        padding: '36px 28px 32px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: 'var(--shadow-strong)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Top highlight line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--b2), transparent)',
          borderRadius: 'var(--card-r) var(--card-r) 0 0',
        }} />

        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: 'var(--card-r)',
            background: 'rgba(79,142,247,0.10)',
            border: '1px solid rgba(79,142,247,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.6px', color: 'var(--t1)', marginBottom: '5px' }}>
            Belépés
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t3)', letterSpacing: '0.02em' }}>
            Solar & Villanyszerelő Munkalapok
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.08)',
            border: '1px solid rgba(255,59,48,0.20)',
            borderRadius: 'var(--card-r)',
            padding: '10px 14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--red)',
            textAlign: 'center',
            lineHeight: '1.4',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Email cím</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pelda@email.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Jelszó</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'rgba(79,142,247,0.45)' : 'linear-gradient(135deg,#4f8ef7,#2a5ccc)',
              border: 'none',
              borderRadius: 'var(--btn-r)',
              padding: '14px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              fontFamily: 'inherit',
              cursor: loading ? 'default' : 'pointer',
              width: '100%',
              boxShadow: loading ? 'none' : '0 6px 22px rgba(79,142,247,0.35)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
              letterSpacing: '-0.2px',
            }}
          >
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" className="spinner">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Belépés...
              </>
            ) : 'Bejelentkezés'}
          </button>
        </form>
      </div>
    </div>
  );
}
