import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Külön, ideiglenes Supabase kliens létrehozása session perzisztencia NÉLKÜL.
// Ez azért kell, hogy ha az Admin új felhasználót regisztrál be a client-side signUp-pal,
// a Supabase SDK ne léptesse ki az Admint és ne vegye át a helyét a frissen létrehozott User!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export default function NewWorkerModal({ isOpen, onClose, onSuccess }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Új könyvelési és személyes állapotok
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [tbNumber, setTbNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [hourlyWage, setHourlyWage] = useState('3500');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // A tempSupabase-t használjuk signUp-ra, így az Admin bejelentkezve marad!
    const { data, error: authError } = await tempSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          serial_number: serialNumber,
          address,
          phone,
          tax_id: taxId,
          tb_number: tbNumber,
          bank_account: bankAccount,
          id_card_number: idCardNumber,
          emergency_phone: emergencyPhone,
          job_title: jobTitle,
          hourly_wage: parseInt(hourlyWage) || 3500
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
    setAddress('');
    setPhone('');
    setTaxId('');
    setTbNumber('');
    setBankAccount('');
    setIdCardNumber('');
    setEmergencyPhone('');
    setJobTitle('');
    setHourlyWage('3500');
  };

  const inputStyle = {
    background: 'var(--s1)',
    border: '1px solid var(--b1)',
    borderRadius: '10px',
    padding: '7px 12px',
    color: 'var(--t1)',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.15s ease'
  };

  const labelStyle = {
    color: 'var(--t2)',
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
    display: 'block'
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto flex items-start justify-center p-4" style={{ background: 'rgba(7, 9, 15, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="w-full max-w-md relative my-auto" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '20px', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full"
          style={{ background: 'var(--s2)', color: 'var(--t2)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(46, 209, 88, 0.15)', border: '1px solid rgba(46, 209, 88, 0.3)' }}>
            <span style={{ fontSize: '16px' }}>👷</span>
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--t1)', letterSpacing: '-0.5px' }}>Új Dolgozó</h2>
          </div>
        </div>
        
        {error && (
          <div className="p-2 mb-3 rounded-lg text-xs" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1.5 scroll-area">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label style={labelStyle}>Sorszám / ID</label>
                <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="EMP-01" required style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Teljes Név</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nagy Béla" required style={inputStyle} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={labelStyle}>Email Cím</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="bela@cegem.hu" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Szerepkör</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
                  <option value="worker" style={{ background: '#07090f' }}>Terepi Szerelő</option>
                  <option value="admin" style={{ background: '#07090f' }}>Irodai Admin</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={labelStyle}>Ideiglenes Jelszó</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required minLength={6} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Munkakör</label>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="pl. Villanyszerelő" required style={inputStyle} />
              </div>
            </div>

            {/* Órabér és Telefonszám */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={labelStyle}>Bruttó Órabér (Ft)</label>
                <input type="number" value={hourlyWage} onChange={(e) => setHourlyWage(e.target.value)} placeholder="3500" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telefonszám</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+36 30 123 4567" required style={inputStyle} />
              </div>
            </div>

            {/* Lakcím */}
            <div>
              <label style={labelStyle}>Lakcím</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1234 Bp., Példa utca 12." style={inputStyle} />
            </div>

            {/* Adó és TB szám */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={labelStyle}>Adószám</label>
                <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="12345678-1-12" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>TB szám (TAJ)</label>
                <input type="text" value={tbNumber} onChange={(e) => setTbNumber(e.target.value)} placeholder="123 456 789" style={inputStyle} />
              </div>
            </div>

            {/* Bank és személyi szám */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={labelStyle}>Bankszámlaszám</label>
                <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="11773004-..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Személyi Szám</label>
                <input type="text" value={idCardNumber} onChange={(e) => setIdCardNumber(e.target.value)} placeholder="123456AB" style={inputStyle} />
              </div>
            </div>

            {/* Vészhelyzeti Telefonszám */}
            <div>
              <label style={labelStyle}>Vészhelyzeti Kapcsolat (Tel.)</label>
              <input type="text" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="pl. Kovács Mária (feleség) - +36 30 987 6543" style={inputStyle} />
            </div>
          </div>
          
          <div className="pt-2 border-t border-white/5">
            <button type="submit" disabled={loading} className="w-full font-bold transition-all disabled:opacity-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2ed158, #1a8a38)', border: 'none', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '14px', boxShadow: '0 8px 25px rgba(46, 209, 88, 0.35)' }}>
              {loading ? 'Mentés...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
