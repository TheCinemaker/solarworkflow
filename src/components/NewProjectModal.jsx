import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NewProjectModal({ isOpen, onClose, onSuccess }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [deadline, setDeadline] = useState('');
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
      deadline,
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
    setDeadline('');
    setTasks('');
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
        
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(42,92,204,0.3)', border: '1px solid rgba(42,92,204,0.6)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Új Projekt</h2>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Projekt Sorszáma / ID</label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="pl. PRJ-2026-01"
              className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Projekt Neve</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="pl. Napelem telepítés - Kovács Család"
              className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Helyszín / Cím</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="1234 Budapest, Példa utca 1."
              className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Megrendelő Neve</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Határidő</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Feladatlista</label>
            <textarea
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              placeholder="1. Tartószerkezet felszerelése&#10;2. Kábelezés behúzása&#10;3. Inverter telepítése"
              className="w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', minHeight: '80px' }}
            />
          </div>
          
          <div className="pt-3 flex justify-end items-center space-x-4">
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
              style={{ background: 'linear-gradient(135deg, #4f8ef7, #2a5ccc)', boxShadow: '0 4px 14px rgba(79,142,247,0.35)' }}
            >
              {loading ? 'Mentés...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
