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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(7, 9, 15, 0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="w-full max-w-md relative max-h-[90vh] overflow-y-auto" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '28px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: 'var(--s2)', color: 'var(--t2)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-[16px] flex items-center justify-center" style={{ background: 'rgba(46, 209, 88, 0.15)', border: '1px solid rgba(46, 209, 88, 0.3)' }}>
            <span style={{ fontSize: '24px' }}>👷</span>
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--t1)', letterSpacing: '-0.5px' }}>Új Dolgozó</h2>
            <p style={{ fontSize: '12px', color: 'var(--t3)' }}>Adj hozzá új szerelőt vagy admint</p>
          </div>
        </div>
        
        {error && (
          <div className="p-3 mb-5 rounded-xl text-sm" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Sorszám / ID</label>
            <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="EMP-01" required className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Teljes Név</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nagy Béla" required className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Email Cím</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="bela@cegem.hu" required className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Ideiglenes Jelszó</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required minLength={6} className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Szerepkör</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }}>
                <option value="worker" style={{ background: '#07090f' }}>Terepi Szerelő</option>
                <option value="admin" style={{ background: '#07090f' }}>Irodai Admin</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 mt-2">
            <button type="submit" disabled={loading} className="w-full font-bold transition-all disabled:opacity-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2ed158, #1a8a38)', border: 'none', borderRadius: '18px', padding: '18px', color: '#fff', fontSize: '16px', boxShadow: '0 8px 25px rgba(46, 209, 88, 0.35)' }}>
              {loading ? 'Mentés folyamatban...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
