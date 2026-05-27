import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NewProjectModal({ isOpen, onClose, onSuccess }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [deadline, setDeadline] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
      deadline,
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
    setDeadline('');
    setStartTime('');
    setEndTime('');
    setImportantInfo('');
    setTasks('');
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
          <div className="w-12 h-12 rounded-[16px] flex items-center justify-center" style={{ background: 'rgba(79, 142, 247, 0.15)', border: '1px solid rgba(79, 142, 247, 0.3)' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--t1)', letterSpacing: '-0.5px' }}>Új Projekt</h2>
            <p style={{ fontSize: '12px', color: 'var(--t3)' }}>Rögzíts egy új munkát a rendszerbe</p>
          </div>
        </div>
        
        {error && (
          <div className="p-3 mb-5 rounded-xl text-sm" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--red)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Sorszám / ID</label>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="PRJ-001" required className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Dátum</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Projekt Neve</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Napelem telepítés - Kovács Család" required className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Helyszín / Cím</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1234 Bp., Példa u. 1." required className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Megrendelő Neve</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Kovács Péter" required className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Telefonszáma</label>
              <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+36 30 123 4567" className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Kezdési idő</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Befejezési idő</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Fontos Infó (pl. kulcs)</label>
            <input type="text" value={importantInfo} onChange={(e) => setImportantInfo(e.target.value)} placeholder="pl. Kulcs a villanyóra szekrényben" className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px' }} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Feladatlista</label>
            <textarea value={tasks} onChange={(e) => setTasks(e.target.value)} placeholder="1. Tartószerkezet felszerelése&#10;2. Kábelezés behúzása&#10;3. Inverter telepítése" className="w-full focus:outline-none transition-colors" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '15px', padding: '14px 16px', color: 'var(--t1)', fontSize: '14px', minHeight: '90px' }} />
          </div>
          
          <div className="pt-4 mt-2">
            <button type="submit" disabled={loading} className="w-full font-bold transition-all disabled:opacity-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f8ef7, #2a5ccc)', border: 'none', borderRadius: '18px', padding: '18px', color: '#fff', fontSize: '16px', boxShadow: '0 8px 25px rgba(79, 142, 247, 0.35)' }}>
              {loading ? 'Mentés folyamatban...' : 'Hozzáadás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
