import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

export default function Finance() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [projects, setProjects] = useState([]);
  const [workersData, setWorkersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (user?.role !== 'admin') {
    return (
      <div className="page active flex flex-col items-center justify-center h-screen px-6 text-center">
        <div className="p-8 rounded-[24px] shadow-2xl relative" style={{ background: 'var(--s1)', border: '1px solid rgba(255, 69, 58, 0.2)', backdropFilter: 'blur(20px)', maxWidth: '380px' }}>
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Hozzáférés megtagadva</h2>
          <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
            Ez a felület bizalmas bérszámfejtési és HR adatokat tartalmaz, ezért kizárólag adminisztrátorok számára érhető el.
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-6 w-full text-xs font-black uppercase tracking-widest text-white py-3 px-4 rounded-xl active:scale-95 transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #4f8ef7, #2a5ccc)' }}
          >
            Vissza a Főoldalra
          </button>
        </div>
      </div>
    );
  }
  
  // Kiválasztott dolgozó az adó/bérlap részletes megtekintéséhez
  const [expandedWorkerId, setExpandedWorkerId] = useState(null);

  // Szerkesztési állapotok a dolgozói adatok menet közbeni frissítéséhez
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [editWage, setEditWage] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTaxId, setEditTaxId] = useState('');
  const [editTbNumber, setEditTbNumber] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editIdCard, setEditIdCard] = useState('');
  const [editEmergency, setEditEmergency] = useState('');

  // Aktív tab: 'projects' (Megrendelői kifizetések) vagy 'workers' (Dolgozói bérszámfejtés)
  const [activeTab, setActiveTab] = useState('projects');

  async function loadFinanceData() {
    try {
      setError(null);

      // 1. Projektek lekérése
      const { data: projs, error: projErr } = await supabase
        .from('projects')
        .select('id, serial_number, name, address, client_price, paid, created_at')
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;
      setProjects(projs || []);

      // 2. Profilok (dolgozók) lekérése az összes adó/bér mezővel
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, serial_number, address, phone, tax_id, tb_number, bank_account, id_card_number, emergency_phone, job_title, hourly_wage');

      if (profErr) throw profErr;

      // 3. Munkalapok lekérése az összesítéshez
      const { data: logs, error: logsErr } = await supabase
        .from('worklogs')
        .select('user_id, hours');

      if (logsErr) throw logsErr;

      // 4. Dolgozói adatok összesítése
      if (profiles) {
        const aggregated = profiles.map(profile => {
          const workerLogs = logs ? logs.filter(log => log.user_id === profile.id) : [];
          const totalHours = workerLogs.reduce((sum, log) => sum + Number(log.hours), 0);
          const wage = Number(profile.hourly_wage) || 3500;
          
          return {
            ...profile,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalLogs: workerLogs.length,
            estimatedPay: totalHours * wage
          };
        });

        aggregated.sort((a, b) => b.totalHours - a.totalHours);
        setWorkersData(aggregated);
      }
    } catch (err) {
      console.error("Hiba a pénzügyi adatok betöltésekor:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Megrendelői kifizetés átváltása (Fizetve / Nem fizetett)
  async function toggleProjectPaid(id, currentPaid) {
    try {
      const { error: patchErr } = await supabase
        .from('projects')
        .update({ paid: !currentPaid })
        .eq('id', id);

      if (patchErr) throw patchErr;
      loadFinanceData();
    } catch (err) {
      console.error("Hiba a fizetési státusz mentésekor:", err);
      setError(err.message);
    }
  }

  // Dolgozói adatok gyors-szerkesztésének mentése
  async function saveWorkerEdit(workerId) {
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          hourly_wage: parseInt(editWage) || 3500,
          job_title: editJobTitle,
          phone: editPhone,
          address: editAddress,
          tax_id: editTaxId,
          tb_number: editTbNumber,
          bank_account: editBankAccount,
          id_card_number: editIdCard,
          emergency_phone: editEmergency
        })
        .eq('id', workerId);

      if (updateErr) throw updateErr;
      setEditingWorkerId(null);
      loadFinanceData();
    } catch (err) {
      console.error("Hiba a dolgozó mentésekor:", err);
      setError(err.message);
    }
  }

  // Szerkesztési állapot megnyitása a meglévő adatok betöltésével
  function startEditing(worker) {
    setEditingWorkerId(worker.id);
    setEditWage(worker.hourly_wage || 3500);
    setEditJobTitle(worker.job_title || '');
    setEditPhone(worker.phone || '');
    setEditAddress(worker.address || '');
    setEditTaxId(worker.tax_id || '');
    setEditTbNumber(worker.tb_number || '');
    setEditBankAccount(worker.bank_account || '');
    setEditIdCard(worker.id_card_number || '');
    setEditEmergency(worker.emergency_phone || '');
  }

  useEffect(() => {
    loadFinanceData();

    // Realtime szinkronizáció munkalapokra és profilokra
    const channel = supabase
      .channel('finance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worklogs' }, () => loadFinanceData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadFinanceData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadFinanceData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Megrendelői Pénzügyi Számítások
  const totalContractVolume = projects.reduce((sum, p) => sum + (p.client_price || 0), 0);
  const paidVolume = projects.filter(p => p.paid).reduce((sum, p) => sum + (p.client_price || 0), 0);
  const unpaidVolume = totalContractVolume - paidVolume;

  // Dolgozói Bérek Számításai
  const totalWorkerHours = workersData.reduce((sum, w) => sum + w.totalHours, 0);
  const totalWorkerPayout = workersData.reduce((sum, w) => sum + w.estimatedPay, 0);

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="page active scroll-area" id="p-finance">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>
      
      <div className="page-header fu">
        <div>
          <div className="pg-greet">Mini Könyvelőiroda</div>
          <div className="pg-title">Pénzügy & Bérszámfejtés</div>
        </div>
        <div className="hdr-btn">💼</div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Modern iOS-Style Tab Selector */}
      <div className="px-5 mt-4">
        <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/5">
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'projects' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🏢 Megrendelői Kifizetések
          </button>
          <button 
            onClick={() => setActiveTab('workers')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${activeTab === 'workers' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            👷 Dolgozói Bérszámfejtés
          </button>
        </div>
      </div>

      {/* STATISZTIKAI PANELEK (A KIVÁLASZTOTT NÉZET ALAPJÁN) */}
      {activeTab === 'projects' ? (
        <div className="stats-grid fu d1 mt-4">
          <div className="sc" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--b1)' }}>
            <div className="sc-lbl">Szerződéses állomány</div>
            <div className="sc-val text-white">{totalContractVolume.toLocaleString('hu-HU')} Ft</div>
            <div className="sc-sub">Összes rögzített projektérték</div>
          </div>
          <div className="sc" style={{ background: 'rgba(46, 209, 88, 0.05)', border: '1px solid rgba(46, 209, 88, 0.15)' }}>
            <div className="sc-lbl">Beérkezett összeg</div>
            <div className="sc-val" style={{ color: 'var(--green)' }}>{paidVolume.toLocaleString('hu-HU')} Ft</div>
            <div className="sc-sub">Kifizetett projektek összege</div>
          </div>
          <div className="sc" style={{ background: 'rgba(255, 69, 58, 0.05)', border: '1px solid rgba(255, 69, 58, 0.15)' }}>
            <div className="sc-lbl">Kinnlévőség</div>
            <div className="sc-val" style={{ color: 'var(--red)' }}>{unpaidVolume.toLocaleString('hu-HU')} Ft</div>
            <div className="sc-sub">Fizetésre váró tételek</div>
          </div>
        </div>
      ) : (
        <div className="stats-grid fu d1 mt-4">
          <div className="sc" style={{ background: 'rgba(46, 209, 88, 0.05)', border: '1px solid rgba(46, 209, 88, 0.15)' }}>
            <div className="sc-lbl">Összes ledolgozott óra</div>
            <div className="sc-val" style={{ color: 'var(--green)' }}>{totalWorkerHours} óra</div>
            <div className="sc-sub">Terepi munkálapok alapján</div>
          </div>
          <div className="sc" style={{ background: 'rgba(255, 214, 10, 0.05)', border: '1px solid rgba(255, 214, 10, 0.15)' }}>
            <div className="sc-lbl">Összesített bérköltség</div>
            <div className="sc-val" style={{ color: '#ffd60a' }}>{totalWorkerPayout.toLocaleString('hu-HU')} Ft</div>
            <div className="sc-sub">Egyedi órabérekkel felszorozva</div>
          </div>
        </div>
      )}

      {/* 🏢 NÉZET: MEGRENDELŐI KIFIZETÉSEK */}
      {activeTab === 'projects' && (
        <div className="mt-4 px-5 pb-24 fu d2 space-y-3.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Projektek fizetési státusza</span>
            <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-300 font-bold">{projects.length} db</span>
          </div>

          {projects.length === 0 ? (
            <div className="text-center text-xs text-slate-400 italic py-10" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '24px' }}>
              Nincsenek projektek a rendszerben.
            </div>
          ) : (
            projects.map(proj => (
              <div 
                key={proj.id}
                className="p-4 rounded-2xl flex flex-col space-y-3 transition-all duration-300"
                style={{
                  background: 'var(--s1)',
                  border: proj.paid ? '1px solid rgba(46, 209, 88, 0.2)' : '1px solid var(--b1)',
                  boxShadow: proj.paid ? '0 8px 20px rgba(46, 209, 88, 0.03)' : 'none'
                }}
              >
                {/* Fejléc */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-black text-slate-200 text-sm tracking-tight">{proj.name || 'Névtelen Projekt'}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {proj.serial_number ? `Sorszám: ${proj.serial_number}` : ''} · 📍 {proj.address || 'Cím nélkül'}
                    </div>
                  </div>
                  
                  {/* Modern Apple-style kapszula kifizetve toggle */}
                  <button
                    onClick={() => toggleProjectPaid(proj.id, proj.paid)}
                    className="px-3.5 py-1.5 rounded-full font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 duration-200 flex items-center space-x-1"
                    style={{
                      background: proj.paid ? 'rgba(46, 209, 88, 0.12)' : 'rgba(255, 69, 58, 0.08)',
                      color: proj.paid ? 'var(--green)' : 'var(--red)',
                      border: proj.paid ? '1px solid rgba(46, 209, 88, 0.25)' : '1px solid rgba(255, 69, 58, 0.15)'
                    }}
                  >
                    <span>{proj.paid ? '🟢 Fizetve' : '🔴 Fizetésre vár'}</span>
                  </button>
                </div>

                {/* Összeg részletező */}
                <div className="flex justify-between items-center pt-2.5 border-t border-white/5 text-xs">
                  <span className="text-slate-400 font-medium">Megrendelési érték:</span>
                  <span className="font-extrabold text-slate-200 text-sm">
                    {(proj.client_price || 0).toLocaleString('hu-HU')} Ft
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 👷 NÉZET: DOLGOZÓI BÉRSZÁMFEJTÉS */}
      {activeTab === 'workers' && (
        <div className="mt-4 px-5 pb-24 fu d2 space-y-3.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Könyvelési adatlapok és bérek</span>
            <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-300 font-bold">{workersData.length} fő</span>
          </div>

          {workersData.length === 0 ? (
            <div className="text-center text-xs text-slate-400 italic py-10" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '24px' }}>
              Nincsenek dolgozók a rendszerben.
            </div>
          ) : (
            workersData.map(worker => {
              const isExpanded = expandedWorkerId === worker.id;
              const isEditing = editingWorkerId === worker.id;

              return (
                <div 
                  key={worker.id}
                  className="rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: 'var(--s1)',
                    border: '1px solid var(--b1)',
                    boxShadow: isExpanded ? '0 15px 35px rgba(0, 0, 0, 0.4)' : 'none'
                  }}
                >
                  {/* Felső információs kártya (Összegzés) */}
                  <div 
                    onClick={() => {
                      if (!isEditing) {
                        setExpandedWorkerId(isExpanded ? null : worker.id);
                      }
                    }}
                    className={`p-4 flex flex-col space-y-3 cursor-pointer transition-colors ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          👷
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 text-sm">{worker.full_name || 'Névtelen'}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            ID: {worker.serial_number || 'M-00'} · {worker.job_title || 'Szerelő'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Alap órabér</span>
                        <span className="text-xs font-black text-slate-300">{(worker.hourly_wage || 3500).toLocaleString('hu-HU')} Ft</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/5 text-xs">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Ledolgozott idő</div>
                        <div className="font-bold text-slate-300 flex items-baseline space-x-1">
                          <span className="text-base text-cyan-400 font-black">{worker.totalHours}</span>
                          <span>óra ({worker.totalLogs} nap)</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Kereset (Hó)</div>
                        <div className="font-bold text-slate-300 flex items-baseline space-x-1">
                          <span className="text-base text-yellow-400 font-black">{worker.estimatedPay.toLocaleString('hu-HU')}</span>
                          <span>Ft</span>
                        </div>
                      </div>
                    </div>

                    {/* Kibővítésre felhívó kis jelzés */}
                    <div className="text-center pt-1">
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">
                        {isExpanded ? '▲ Könyvelési lap bezárása' : '▼ Részletes könyvelési adatlap'}
                      </span>
                    </div>
                  </div>

                  {/* 📂 PRIVATE KÖNYVELÉSI ADATLAP PANEL (Csak kinyitott állapotban) */}
                  {isExpanded && (
                    <div className="p-4 bg-black/40 border-t border-white/5 space-y-4 text-xs animate-[fadeIn_0.2s_ease-out]">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">🔒 Bizalmas Könyvelési Adatok</span>
                        
                        {!isEditing ? (
                          <button
                            onClick={() => startEditing(worker)}
                            className="px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider"
                            style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--t1)', border: '1px solid var(--b1)' }}
                          >
                            ✏️ Adatok Szerkesztése
                          </button>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingWorkerId(null)}
                              className="px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider"
                              style={{ background: 'rgba(255, 59, 48, 0.08)', color: 'var(--red)', border: '1px solid rgba(255, 59, 48, 0.15)' }}
                            >
                              Mégse
                            </button>
                            <button
                              onClick={() => saveWorkerEdit(worker.id)}
                              className="px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider"
                              style={{ background: 'linear-gradient(135deg, #2ed158, #1a8a38)', color: '#fff' }}
                            >
                              Mentés
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Szerkesztési mód és Olvasási mód szétválasztása */}
                      {!isEditing ? (
                        // OLVASÁSI MÓD
                        <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 pt-1 text-slate-300">
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Szerződéses órabér</span>
                            <span className="font-extrabold text-slate-200">{(worker.hourly_wage || 3500).toLocaleString('hu-HU')} Ft / óra</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Munkakör</span>
                            <span className="font-extrabold text-slate-200">{worker.job_title || 'Nincs beállítva'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Telefonszám</span>
                            <span className="font-extrabold text-slate-200">{worker.phone || 'Nincs megadva'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Vészhelyzeti Kapcsolat</span>
                            <span className="font-extrabold text-slate-200">{worker.emergency_phone || 'Nincs megadva'}</span>
                          </div>

                          <div className="col-span-2">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Állandó Lakcím</span>
                            <span className="font-extrabold text-slate-200">{worker.address || 'Nincs megadva'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Adóazonosító Jel</span>
                            <span className="font-semibold text-slate-300 tracking-wider">{worker.tax_id || 'Nincs megadva'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">TAJ / TB Szám</span>
                            <span className="font-semibold text-slate-300 tracking-wider">{worker.tb_number || 'Nincs megadva'}</span>
                          </div>

                          <div className="col-span-2">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Bankszámlaszám (Utaláshoz)</span>
                            <span className="font-bold text-slate-200 tracking-wider">{worker.bank_account || 'Nincs megadva'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Személyi Igazolvány Szám</span>
                            <span className="font-semibold text-slate-300 tracking-wider">{worker.id_card_number || 'Nincs megadva'}</span>
                          </div>
                        </div>
                      ) : (
                        // SZERKESZTÉSI MÓD
                        <div className="space-y-3 pt-1 text-slate-300">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Órabér (Ft)</label>
                              <input 
                                type="number" 
                                value={editWage} 
                                onChange={(e) => setEditWage(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Munkakör</label>
                              <input 
                                type="text" 
                                value={editJobTitle} 
                                onChange={(e) => setEditJobTitle(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Telefonszám</label>
                              <input 
                                type="text" 
                                value={editPhone} 
                                onChange={(e) => setEditPhone(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Vészhelyzeti Kapcsolat</label>
                              <input 
                                type="text" 
                                value={editEmergency} 
                                onChange={(e) => setEditEmergency(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Állandó Lakcím</label>
                            <input 
                              type="text" 
                              value={editAddress} 
                              onChange={(e) => setEditAddress(e.target.value)} 
                              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Adószám</label>
                              <input 
                                type="text" 
                                value={editTaxId} 
                                onChange={(e) => setEditTaxId(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">TB (TAJ) Szám</label>
                              <input 
                                type="text" 
                                value={editTbNumber} 
                                onChange={(e) => setEditTbNumber(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Bankszámlaszám</label>
                              <input 
                                type="text" 
                                value={editBankAccount} 
                                onChange={(e) => setEditBankAccount(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Személyi Igazolvány</label>
                              <input 
                                type="text" 
                                value={editIdCard} 
                                onChange={(e) => setEditIdCard(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
