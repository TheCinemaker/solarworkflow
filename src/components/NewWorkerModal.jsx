import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Külön, ideiglenes Supabase kliens regisztrációhoz (session perzisztencia nélkül)
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

  useEffect(() => {
    if (isOpen) {
      async function generateNextSerial() {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('serial_number');
          
          if (error) throw error;
          
          let maxNum = 0;
          if (data && data.length > 0) {
            data.forEach(p => {
              const num = parseInt(p.serial_number);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            });
          }
          
          const nextNum = maxNum + 1;
          const formattedSerial = String(nextNum).padStart(3, '0');
          setSerialNumber(formattedSerial);
        } catch (err) {
          console.error("Nem sikerült a sorszám generálása:", err);
          setSerialNumber('001');
        }
      }
      generateNextSerial();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // A tempSupabase-t használjuk signUp-ra, így az Admin bejelentkezve marad!
    const { error: authError } = await tempSupabase.auth.signUp({
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
    borderRadius: '14px',
    padding: '14px 16px 10px',
    color: 'var(--t1)',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    transition: 'all 0.18s ease',
    minHeight: '52px'
  };

  const selectStyle = {
    ...inputStyle,
    paddingTop: '20px',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='gray' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center'
  };

  const floatingLabelStyle = {
    position: 'absolute',
    top: '8px',
    left: '16px',
    fontSize: '10px',
    color: 'var(--t3)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700,
    pointerEvents: 'none'
  };

  // Prémium üvegkártya szekció stílus
  const sectionStyle = {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.01)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3" style={{ background: 'rgba(7, 9, 15, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="w-full max-w-xl relative flex flex-col" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--card-r)', boxShadow: '0 10px 40px rgba(0,0,0,0.35), inset 0 1px rgba(255,255,255,0.03)', overflow: 'hidden' }}>
        
        {/* Bezárás gomb */}
        <button
          onClick={onClose}
          className="absolute right-7 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-all hover:bg-white/5"
          style={{ 
            top: 'calc(28px + env(safe-area-inset-top))',
            background: 'var(--s2)', 
            color: 'var(--t2)', 
            border: '1px solid var(--b1)' 
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Fejléc */}
        <div style={{ padding: 'calc(28px + env(safe-area-inset-top)) 28px 20px', flexShrink: 0 }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-[6px] flex items-center justify-center" style={{ background: 'rgba(46, 209, 88, 0.15)', border: '1px solid rgba(46, 209, 88, 0.3)' }}>
              <span style={{ fontSize: '16px' }}>👷</span>
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--t1)', letterSpacing: '-0.5px' }}>Új Dolgozó Létrehozása</h2>
            </div>
          </div>
          {error && (
            <div className="mt-3 p-2 rounded-[6px] text-xs" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Űrlap */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-7 pr-1.5 custom-scroll" style={{ padding: '8px 28px 28px', maxHeight: '64dvh', overflowY: 'auto' }}>
            
            {/* 1. SZEKCIÓ: ALAPADATOK */}
            <div style={sectionStyle}>
              <div className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest pb-3 border-b border-white/[0.03] mb-2">
                Alapadatok & Kapcsolat
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/3">
                  <span style={floatingLabelStyle}>Sorszám / ID</span>
                  <input 
                    type="text" 
                    value={serialNumber} 
                    onChange={(e) => setSerialNumber(e.target.value)} 
                    placeholder="EMP-01" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-2/3">
                  <span style={floatingLabelStyle}>Teljes Név</span>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    placeholder="Nagy Béla" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Email Cím</span>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="bela@cegem.hu" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Telefonszám</span>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="+36 30 123 4567" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Ideiglenes Jelszó</span>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••" 
                    required 
                    minLength={6} 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Szerepkör</span>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    style={selectStyle}
                  >
                    <option value="worker" style={{ background: '#07090f' }}>Terepi Szerelő</option>
                    <option value="admin" style={{ background: '#07090f' }}>Irodai Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. SZEKCIÓ: FOGLALKOZTATÁS & PÉNZÜGYEK */}
            <div style={sectionStyle}>
              <div className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest pb-3 border-b border-white/[0.03] mb-2">
                Foglalkoztatás & Pénzügyek
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Munkakör</span>
                  <input 
                    type="text" 
                    value={jobTitle} 
                    onChange={(e) => setJobTitle(e.target.value)} 
                    placeholder="pl. Villanyszerelő" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Bruttó Órabér (Ft)</span>
                  <input 
                    type="number" 
                    value={hourlyWage} 
                    onChange={(e) => setHourlyWage(e.target.value)} 
                    placeholder="3500" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Bankszámlaszám</span>
                  <input 
                    type="text" 
                    value={bankAccount} 
                    onChange={(e) => setBankAccount(e.target.value)} 
                    placeholder="11773004-..." 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Személyi Ig. Szám</span>
                  <input 
                    type="text" 
                    value={idCardNumber} 
                    onChange={(e) => setIdCardNumber(e.target.value)} 
                    placeholder="123456AB" 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>
            </div>

            {/* 3. SZEKCIÓ: SZEMÉLYES & KÖNYVELÉSI ADATOK */}
            <div style={sectionStyle}>
              <div className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest pb-3 border-b border-white/[0.03] mb-2">
                Személyes & Könyvelési Adatok
              </div>

              <div style={{ position: 'relative' }} className="w-full">
                <span style={floatingLabelStyle}>Állandó Lakcím</span>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="1234 Bp., Példa utca 12." 
                  style={{ ...inputStyle, paddingTop: '22px' }} 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Adószám (Adóazonosító)</span>
                  <input 
                    type="text" 
                    value={taxId} 
                    onChange={(e) => setTaxId(e.target.value)} 
                    placeholder="12345678-1-12" 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>TB szám (TAJ)</span>
                  <input 
                    type="text" 
                    value={tbNumber} 
                    onChange={(e) => setTbNumber(e.target.value)} 
                    placeholder="123 456 789" 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>

              <div style={{ position: 'relative' }} className="w-full">
                <span style={floatingLabelStyle}>Vészhelyzeti Kapcsolattartó (Név + Tel.)</span>
                <input 
                  type="text" 
                  value={emergencyPhone} 
                  onChange={(e) => setEmergencyPhone(e.target.value)} 
                  placeholder="pl. Kovács Mária (feleség) - +36 30 987 6543" 
                  style={{ ...inputStyle, paddingTop: '22px' }} 
                />
              </div>
            </div>

          </div>

          {/* Gombok */}
          <div style={{ display: 'flex', gap: '10px', padding: '20px 28px 28px', borderTop: '1px solid var(--b1)', flexShrink: 0 }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 font-bold transition-all hover:bg-white/5 flex items-center justify-center" 
              style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '16px', height: '56px', color: 'var(--t1)', fontSize: '14px' }}
            >
              Mégse
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 font-bold transition-all disabled:opacity-50 flex items-center justify-center hover:scale-[1.01]" 
              style={{ background: 'linear-gradient(135deg, #2ed158, #1a8a38)', border: 'none', borderRadius: '16px', height: '56px', color: '#fff', fontSize: '14px', boxShadow: '0 8px 25px rgba(46, 209, 88, 0.35)' }}
            >
              {loading ? 'Létrehozás...' : 'Dolgozó Létrehozása'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
