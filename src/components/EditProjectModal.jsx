import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

export default function EditProjectModal({ isOpen, onClose, project, onSuccess }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientPhone2, setClientPhone2] = useState('');
  const [clientPhone3, setClientPhone3] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [importantInfo, setImportantInfo] = useState('');
  const [tasks, setTasks] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [clientPrice, setClientPrice] = useState('');

  // Napelem és inverter mezők
  const [isSolar, setIsSolar] = useState(false);
  const [inverterBrand, setInverterBrand] = useState('');
  const [inverterId, setInverterId] = useState('');
  const [inverterApiKey, setInverterApiKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project && isOpen) {
      setSerialNumber(project.serial_number || '');
      setName(project.name || '');
      setAddress(project.address || '');
      setClientName(project.client_name || '');
      setClientPhone(project.client_phone || '');
      setClientPhone2(project.client_phone_2 || '');
      setClientPhone3(project.client_phone_3 || '');
      setStartTime(project.start_time || '');
      setEndTime(project.end_time || '');
      setImportantInfo(project.important_info || '');
      setTasks(project.tasks || '');
      setTelegramLink(project.telegram_link || '');
      setClientPrice(project.client_price || '');
      setIsSolar(project.is_solar || false);
      setInverterBrand(project.inverter_brand || '');
      setInverterId(project.inverter_id || '');
      setInverterApiKey(project.inverter_api_key || '');
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        serial_number: serialNumber,
        name, 
        address, 
        client_name: clientName, 
        client_phone: clientPhone,
        client_phone_2: clientPhone2,
        client_phone_3: clientPhone3,
        deadline: endTime || null,
        start_time: startTime,
        end_time: endTime,
        important_info: importantInfo,
        tasks,
        telegram_link: telegramLink,
        client_price: parseInt(clientPrice) || 0,
        is_solar: isSolar,
        inverter_brand: isSolar ? (inverterBrand || null) : null,
        inverter_id: isSolar ? (inverterId || null) : null,
        inverter_api_key: isSolar ? (inverterApiKey || null) : null
      })
      .eq('id', project.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    
    setLoading(false);
    onSuccess();
    onClose();
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

  // Prémium üvegkártya szekció stílus degradált háttérrel és finom kerettel
  const sectionStyle = {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--b1)',
    background: 'var(--s1)',
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px' // Belső térköz
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3" style={{ background: 'var(--backdrop)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="w-full max-w-xl relative flex flex-col" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--card-r)', boxShadow: '0 10px 40px rgba(0,0,0,0.35), inset 0 1px rgba(255,255,255,0.03)', overflow: 'hidden' }}>
        
        {/* Bezárás gomb - Gridre helyezve (28px top/right, 40x40px) */}
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
            <div className="w-8 h-8 rounded-[6px] flex items-center justify-center" style={{ background: 'rgba(79, 142, 247, 0.15)', border: '1px solid rgba(79, 142, 247, 0.3)' }}>
              <span style={{ fontSize: '16px' }}>✏️</span>
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--t1)', letterSpacing: '-0.5px' }}>Projekt Szerkesztése</h2>
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
          {/* Tágasabb padding-top és section gap (space-y-7) */}
          <div className="space-y-7 pr-1.5 custom-scroll" style={{ padding: '8px 28px 28px', maxHeight: '64dvh', overflowY: 'auto' }}>
            
            {/* 1. SZEKCIÓ: ALAPADATOK */}
            <div style={sectionStyle}>
              <div className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest pb-3 border-b border-white/[0.03] mb-2">
                Alapadatok & Cím
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/3">
                  <span style={floatingLabelStyle}>Sorszám</span>
                  <input 
                    type="text" 
                    value={serialNumber} 
                    onChange={(e) => setSerialNumber(e.target.value)} 
                    placeholder="PL-21" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-2/3">
                  <span style={floatingLabelStyle}>Projekt / Megrendelő Neve</span>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Napelem Telepítés..." 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>

              <div style={{ position: 'relative' }} className="w-full">
                <span style={floatingLabelStyle}>Szerelési Cím</span>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="8900 Zalaegerszeg, Fő út 12." 
                  required 
                  style={{ ...inputStyle, paddingTop: '22px' }} 
                />
              </div>
            </div>

            {/* 2. SZEKCIÓ: ÜGYFÉLKAPCSOLAT & PÉNZÜGYEK */}
            <div style={sectionStyle}>
              <div className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest pb-3 border-b border-white/[0.03] mb-2">
                Megrendelő & Pénzügyek
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Kapcsolattartó Neve</span>
                  <input 
                    type="text" 
                    value={clientName} 
                    onChange={(e) => setClientName(e.target.value)} 
                    placeholder="Szabó István" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Kialkudott ár (Ft)</span>
                  <input 
                    type="number" 
                    value={clientPrice} 
                    onChange={(e) => setClientPrice(e.target.value)} 
                    placeholder="2400000" 
                    required 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>

              {/* Telefonszámok */}
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full md:w-1/3">
                  <span style={floatingLabelStyle}>Telefon 1</span>
                  <input 
                    type="text" 
                    value={clientPhone} 
                    onChange={(e) => setClientPhone(e.target.value)} 
                    placeholder="+36 30 123 4567" 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full md:w-1/3">
                  <span style={floatingLabelStyle}>Telefon 2</span>
                  <input 
                    type="text" 
                    value={clientPhone2} 
                    onChange={(e) => setClientPhone2(e.target.value)} 
                    placeholder="+36 20 987 6543" 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full md:w-1/3">
                  <span style={floatingLabelStyle}>Telefon 3</span>
                  <input 
                    type="text" 
                    value={clientPhone3} 
                    onChange={(e) => setClientPhone3(e.target.value)} 
                    placeholder="+36 70 111 2222" 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>

              <div style={{ position: 'relative' }} className="w-full">
                <span style={floatingLabelStyle}>Telegram Csoport Link</span>
                <input 
                  type="url" 
                  value={telegramLink} 
                  onChange={(e) => setTelegramLink(e.target.value)} 
                  placeholder="https://t.me/joinchat/..." 
                  style={{ ...inputStyle, paddingTop: '22px' }} 
                />
              </div>
            </div>

            {/* 3. SZEKCIÓ: ÜTEMEZÉS */}
            <div style={sectionStyle}>
              <div className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest pb-3 border-b border-white/[0.03] mb-2">
                Ütemezés & Időzítés
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Kezdő Dátum</span>
                  <input 
                    type="date" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
                <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                  <span style={floatingLabelStyle}>Határidő / Vége</span>
                  <input 
                    type="date" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    style={{ ...inputStyle, paddingTop: '22px' }} 
                  />
                </div>
              </div>
            </div>

            {/* 4. SZEKCIÓ: NAPELEM TELEMETRIA */}
            <div style={sectionStyle}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--t2)]">☀️ Napelemes projekt?</span>
                  <span className="text-[9px] text-[var(--t3)] font-bold uppercase tracking-wider mt-0.5">Inverter és távfelügyelet bekapcsolása</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isSolar} 
                    onChange={(e) => setIsSolar(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/60 after:border-white/60 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>
              
              {isSolar && (
                <div className="flex flex-col gap-4 pt-4 border-t border-white/[0.03] animate-[fadeIn_0.2s_ease-out] w-full">
                  <div style={{ position: 'relative' }} className="w-full">
                    <span style={floatingLabelStyle}>Inverter Márka (pl. Fronius, Huawei)</span>
                    <input 
                      type="text" 
                      value={inverterBrand} 
                      onChange={(e) => setInverterBrand(e.target.value)} 
                      placeholder="pl. Fronius" 
                      style={{ ...inputStyle, paddingTop: '22px' }} 
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                      <span style={floatingLabelStyle}>Készülék ID (Datalogger)</span>
                      <input 
                        type="text" 
                        value={inverterId} 
                        onChange={(e) => setInverterId(e.target.value)} 
                        placeholder="1234567" 
                        style={{ ...inputStyle, paddingTop: '22px' }} 
                      />
                    </div>
                    <div style={{ position: 'relative' }} className="w-full sm:w-1/2">
                      <span style={floatingLabelStyle}>Inverter API Kulcs</span>
                      <input 
                        type="password" 
                        value={inverterApiKey} 
                        onChange={(e) => setInverterApiKey(e.target.value)} 
                        placeholder="••••••••" 
                        style={{ ...inputStyle, paddingTop: '22px' }} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. SZEKCIÓ: TEREP Jegyzetek */}
            <div style={sectionStyle}>
              <div className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest pb-3 border-b border-white/[0.03] mb-2">
                Terepi Jegyzetek & Feladatok
              </div>

              <div style={{ position: 'relative' }} className="w-full">
                <span style={floatingLabelStyle}>Fontos Információk (Szerelőknek)</span>
                <textarea 
                  value={importantInfo} 
                  onChange={(e) => setImportantInfo(e.target.value)} 
                  placeholder="pl. Kulcs a kapu melletti postaládában..." 
                  rows={2} 
                  style={{ ...inputStyle, paddingTop: '24px', resize: 'none', minHeight: '68px' }} 
                />
              </div>

              <div style={{ position: 'relative' }} className="w-full">
                <span style={floatingLabelStyle}>Feladatok listája (Soronként egy!)</span>
                <textarea 
                  value={tasks} 
                  onChange={(e) => setTasks(e.target.value)} 
                  placeholder="Napelemek felszerelése&#10;Inverter bekötése&#10;AC/DC elosztó kiépítése" 
                  rows={4} 
                  style={{ ...inputStyle, paddingTop: '24px', resize: 'none', fontFamily: 'monospace', lineHeight: '1.4', minHeight: '100px' }} 
                />
              </div>
            </div>
          </div>

          {/* Gombok - Igazítva a gridre (padding: 20px 28px 28px, space-x-4, magasság 56px, lekerekítés 16px) */}
          <div className="flex space-x-4" style={{ padding: '20px 28px 28px', borderTop: '1px solid var(--b1)', flexShrink: 0 }}>
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
              style={{ background: 'linear-gradient(135deg, #4f8ef7, #2c72e0)', border: 'none', borderRadius: '16px', height: '56px', color: '#fff', fontSize: '14px', boxShadow: '0 8px 25px rgba(79, 142, 247, 0.35)' }}
            >
              {loading ? 'Mentés...' : 'Változások Mentése'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
