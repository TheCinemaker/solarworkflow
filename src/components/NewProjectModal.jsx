import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NewProjectModal({ isOpen, onClose, onSuccess }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [startTime, setStartTime] = useState(''); // Kezdési dátum
  const [endTime, setEndTime] = useState('');     // Befejezési dátum
  const [importantInfo, setImportantInfo] = useState('');
  const [tasks, setTasks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from('projects').insert([{ 
      serial_number: serialNumber,
      name, 
      address, 
      client_name: clientName, 
      client_phone: clientPhone,
      deadline: endTime || null, // A befejezési dátumot szinkronizáljuk a határidővel
      start_time: startTime,
      end_time: endTime,
      important_info: importantInfo,
      tasks
    }]);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }
    
    setLoading(false);
    onSuccess();
    onClose();
    
    // Reset form
    setSerialNumber('');
    setName('');
    setAddress('');
    setClientName('');
    setClientPhone('');
    setStartTime('');
    setEndTime('');
    setImportantInfo('');
    setTasks('');
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
    fontSize: '13px', // Megnövelve 2px-szel (11px-ről)
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px', // Nagyobb térköz a címke és az input között
    display: 'block'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(7, 9, 15, 0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="w-full max-w-md relative max-h-[95vh] overflow-y-auto" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '20px', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
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
            <span style={{ fontSize: '16px' }}>⚡</span>
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--t1)', letterSpacing: '-0.5px' }}>Új Projekt</h2>
          </div>
        </div>
        
        {error && (
          <div className="p-2 mb-3 rounded-lg text-xs" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3"> {/*space-y-2 helyett space-y-3 a nagyobb térközért*/}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label style={labelStyle}>Sorszám / ID</label>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="PRJ-01" required style={inputStyle} />
            </div>
            <div className="col-span-2">
              <label style={labelStyle}>Projekt Neve</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Napelem - Kovács porta" required style={inputStyle} />
            </div>
          </div>
          
          <div>
            <label style={labelStyle}>Helyszín / Cím</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1234 Bp., Példa u. 1." required style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label style={labelStyle}>Megrendelő Neve</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Kovács Péter" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Telefonszáma</label>
              <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+36 30 123 4567" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label style={labelStyle}>Kezdési dátum</label>
              <input type="date" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Befejezési dátum</label>
              <input type="date" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Fontos Infó (pl. kulcs helye)</label>
            <input type="text" value={importantInfo} onChange={(e) => setImportantInfo(e.target.value)} placeholder="pl. Kulcs a villanyóra szekrényben" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Feladatlista</label>
            <textarea value={tasks} onChange={(e) => setTasks(e.target.value)} placeholder="1. Tartószerkezet felszerelése&#10;2. Kábelezés behúzása&#10;3. Inverter telepítése" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
          </div>
          
          <div className="pt-1">
            <button type="submit" disabled={loading} className="w-full font-bold transition-all disabled:opacity-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f8ef7, #2a5ccc)', border: 'none', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '14px', boxShadow: '0 8px 25px rgba(79, 142, 247, 0.35)' }}>
              {loading ? 'Mentés...' : 'Hozzáadás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
