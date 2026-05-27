import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function EditProjectModal({ isOpen, onClose, project, onSuccess }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
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
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(79, 142, 247, 0.15)', border: '1px solid rgba(79, 142, 247, 0.3)' }}>
            <span style={{ fontSize: '16px' }}>✏️</span>
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--t1)', letterSpacing: '-0.5px' }}>Projekt Szerkesztése</h2>
          </div>
        </div>
        
        {error && (
          <div className="p-2 mb-3 rounded-lg text-xs" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1.5 scroll-area">
            {/* Alapadatok */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label style={labelStyle}>Sorszám</label>
                <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="PL-21" required style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Projekt/Megrendelő Neve</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Napelem Telepítés..." required style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Szerelési Cím</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="8900 Zalaegerszeg, Fő út 12." required style={inputStyle} />
            </div>

            {/* Megrendelő és ára */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={labelStyle}>Megrendelő Teljes Neve</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Szabó István" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Megrendelői Ár (Ft)</label>
                <input type="number" value={clientPrice} onChange={(e) => setClientPrice(e.target.value)} placeholder="2400000" required style={inputStyle} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={labelStyle}>Kezdő Dátum</label>
                <input type="date" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Határidő / Vége</label>
                <input type="date" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Inverter és Napelem Telemetria Adatok */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">☀️ Napelemes projekt?</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Inverter és távfelügyelet bekapcsolása</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isSolar} 
                    onChange={(e) => setIsSolar(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>
              
              {isSolar && (
                <div className="space-y-3 pt-3 border-t border-white/5 animate-[fadeIn_0.2s_ease-out]">
                  <div>
                    <label style={labelStyle}>Inverter Márka (pl. Fronius, Huawei)</label>
                    <input type="text" value={inverterBrand} onChange={(e) => setInverterBrand(e.target.value)} placeholder="pl. Fronius" style={inputStyle} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label style={labelStyle}>Készülék ID (Datalogger)</label>
                      <input type="text" value={inverterId} onChange={(e) => setInverterId(e.target.value)} placeholder="1234567" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Inverter API Kulcs (Key)</label>
                      <input type="password" value={inverterApiKey} onChange={(e) => setInverterApiKey(e.target.value)} placeholder="••••••••" style={inputStyle} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Kapcsolati és egyéb mezők */}
            <div>
              <label style={labelStyle}>Megrendelő Telefonja</label>
              <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+36 30 123 4567" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Telegram Csoport Link</label>
              <input type="url" value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} placeholder="https://t.me/joinchat/..." style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Fontos Információk (Terepi szerelőknek)</label>
              <textarea value={importantInfo} onChange={(e) => setImportantInfo(e.target.value)} placeholder="pl. Kulcs a kapu melletti postaládában..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>

            <div>
              <label style={labelStyle}>Feladatok listája (Soronként egy!)</label>
              <textarea value={tasks} onChange={(e) => setTasks(e.target.value)} placeholder="Napelemek felszerelése&#10;Inverter bekötése&#10;AC/DC elosztó kiépítése&#10;EPH földelés és mérés" rows={4} style={{ ...inputStyle, resize: 'none', fontFamily: 'monospace', lineHeight: '1.4' }} />
            </div>
          </div>
          
          <div className="pt-2 border-t border-white/5 flex space-x-2">
            <button type="button" onClick={onClose} className="flex-1 font-bold transition-all" style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '10px', padding: '10px', color: 'var(--t1)', fontSize: '14px' }}>
              Mégse
            </button>
            <button type="submit" disabled={loading} className="flex-1 font-bold transition-all disabled:opacity-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f8ef7, #2c72e0)', border: 'none', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '14px', boxShadow: '0 8px 25px rgba(79, 142, 247, 0.35)' }}>
              {loading ? 'Mentés...' : 'Változások Mentése'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
