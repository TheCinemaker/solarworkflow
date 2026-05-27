import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NewWorkerModal({ isOpen, onClose, onSuccess }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          serial_number: serialNumber
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    
    setLoading(false);
    onSuccess();
    onClose();
    
    // Reset form
    setSerialNumber('');
    setEmail('');
    setPassword('');
    setFullName('');
    setRole('worker');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative" style={{ background: '#101524', border: '1px solid rgba(255,255,255,0.09)' }}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-xl font-bold text-white mb-5">Új Dolgozó Felvétele</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Sorszám / Dolgozói ID</label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="pl. EMP-01"
              className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Teljes Név</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Cím</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Ideiglenes Jelszó</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Szerepkör</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <option value="worker" className="bg-slate-900 text-white">Terepi Szerelő</option>
                <option value="admin" className="bg-slate-900 text-white">Irodai Admin</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end items-center space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', boxShadow: '0 4px 14px rgba(2,132,199,0.35)' }}
            >
              {loading ? 'Mentés...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
