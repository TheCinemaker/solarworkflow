import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

const inputStyle = {
  background: 'var(--s1)',
  border: '1px solid var(--b1)',
  borderRadius: '8px',
  padding: '7px 10px',
  color: 'var(--t1)',
  fontSize: '12px',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s ease',
};

const labelXs = {
  display: 'block',
  color: 'var(--t3)',
  fontSize: '9px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: '5px',
};

export default function Finance() {
  const navigate = useNavigate();
  const { user } = useUser();

  // ALL hooks must be declared before any conditional return
  const [projects, setProjects] = useState([]);
  const [workersData, setWorkersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedWorkerId, setExpandedWorkerId] = useState(null);
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
  const [editFullName, setEditFullName] = useState('');
  const [activeTab, setActiveTab] = useState('projects');

  async function loadFinanceData() {
    try {
      setError(null);
      const { data: projs, error: projErr } = await supabase
        .from('projects')
        .select('id, serial_number, name, address, client_price, paid, created_at')
        .order('created_at', { ascending: false });
      if (projErr) throw projErr;
      setProjects(projs || []);

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, serial_number, address, phone, tax_id, tb_number, bank_account, id_card_number, emergency_phone, job_title, hourly_wage')
        .neq('role', 'admin');
      if (profErr) throw profErr;

      const { data: logs, error: logsErr } = await supabase
        .from('worklogs')
        .select('user_id, hours');
      if (logsErr) throw logsErr;

      if (profiles) {
        const aggregated = profiles.map(profile => {
          const workerLogs = logs ? logs.filter(log => log.user_id === profile.id) : [];
          const totalHours = workerLogs.reduce((sum, log) => sum + Number(log.hours), 0);
          const wage = Number(profile.hourly_wage) || 3500;
          return { ...profile, totalHours: parseFloat(totalHours.toFixed(2)), totalLogs: workerLogs.length, estimatedPay: totalHours * wage };
        });
        aggregated.sort((a, b) => b.totalHours - a.totalHours);
        setWorkersData(aggregated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleProjectPaid(id, currentPaid) {
    try {
      await supabase.from('projects').update({ paid: !currentPaid }).eq('id', id);
      loadFinanceData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveWorkerEdit(workerId) {
    try {
      await supabase.from('profiles').update({
        full_name: editFullName,
        hourly_wage: parseInt(editWage) || 3500,
        job_title: editJobTitle,
        phone: editPhone,
        address: editAddress,
        tax_id: editTaxId,
        tb_number: editTbNumber,
        bank_account: editBankAccount,
        id_card_number: editIdCard,
        emergency_phone: editEmergency
      }).eq('id', workerId);
      setEditingWorkerId(null);
      loadFinanceData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteWorker(workerId, workerName) {
    const confirmDelete = window.confirm(`Biztosan véglegesen törölni szeretnéd ${workerName || 'ezt a dolgozót'}? Minden adata (profil, időlapok, rögzítések) véglegesen törlődni fog!`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError(null);
      const { error: deleteErr } = await supabase.rpc('delete_user_by_admin', { 
        target_user_id: workerId 
      });
      if (deleteErr) throw deleteErr;
      setExpandedWorkerId(null);
      loadFinanceData();
      alert(`Sikeresen törölted ${workerName || 'a dolgozót'} a rendszerből.`);
    } catch (err) {
      console.error("Hiba a dolgozó törlésekor:", err);
      setError("Hiba a törlés során: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEditing(worker) {
    setEditingWorkerId(worker.id);
    setEditFullName(worker.full_name || '');
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
    const channel = supabase
      .channel('finance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worklogs' }, () => loadFinanceData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadFinanceData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadFinanceData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Conditional render AFTER all hooks
  if (user?.role !== 'admin') {
    return (
      <div className="page active flex flex-col items-center justify-center h-screen px-6 text-center">
        <div style={{
          background: 'var(--s1)', border: '1px solid rgba(255,59,48,0.2)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px', padding: '32px 24px', maxWidth: '360px', width: '100%',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'rgba(255,59,48,0.10)', border: '1px solid rgba(255,59,48,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', margin: '0 auto 16px',
          }}>🔒</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--t1)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
            Hozzáférés megtagadva
          </div>
          <div style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: '1.5', marginBottom: '24px' }}>
            Ez a felület kizárólag adminisztrátorok számára érhető el.
          </div>
          <button onClick={() => navigate('/')} style={{
            width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '700',
            fontSize: '14px', color: '#fff', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#4f8ef7,#2a5ccc)',
            boxShadow: '0 6px 20px rgba(79,142,247,0.3)', fontFamily: 'inherit',
          }}>
            Vissza a Főoldalra
          </button>
        </div>
      </div>
    );
  }

  const totalContractVolume = projects.reduce((sum, p) => sum + (p.client_price || 0), 0);
  const paidVolume = projects.filter(p => p.paid).reduce((sum, p) => sum + (p.client_price || 0), 0);
  const unpaidVolume = totalContractVolume - paidVolume;
  const totalWorkerHours = workersData.reduce((sum, w) => sum + w.totalHours, 0);
  const totalWorkerPayout = workersData.reduce((sum, w) => sum + w.estimatedPay, 0);

  const tabStyle = (tabName) => ({
    flex: 1, padding: '9px 0', textAlign: 'center', fontSize: '12px', fontWeight: '700',
    borderRadius: '10px', border: activeTab === tabName ? '1px solid var(--b1)' : '1px solid transparent',
    cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit',
    background: activeTab === tabName ? 'var(--s2)' : 'transparent',
    color: activeTab === tabName ? 'var(--t1)' : 'var(--t3)',
  });

  if (loading) {
    return (
      <div className="page active flex items-center justify-center h-screen">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" className="spinner">
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      </div>
    );
  }

  return (
    <div className="page active" id="p-finance">
      <div className="back-btn fu" onClick={() => navigate('/')}>‹ Vissza a Dashboardra</div>

      <div className="page-header fu">
        <div>
          <div className="pg-greet">Mini Könyvelőiroda</div>
          <div className="pg-title">Pénzügy & Bérek</div>
        </div>
        <div className="hdr-btn">💼</div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {/* Tab selector */}
      <div className="px-5 mt-4">
        <div className="flex p-1 rounded-xl" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
          <button onClick={() => setActiveTab('projects')} style={tabStyle('projects')}>🏢 Megrendelői Kifizetések</button>
          <button onClick={() => setActiveTab('workers')} style={tabStyle('workers')}>👷 Dolgozói Bérszámfejtés</button>
        </div>
      </div>

      {/* Stat cards */}
      {activeTab === 'projects' ? (
        <div className="stats-grid fu d1 mt-4">
          <div className="sc" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--b1)' }}>
            <div className="sc-lbl" style={{ color: 'var(--t2)' }}>Szerződéses állomás</div>
            <div className="sc-val" style={{ color: 'var(--t1)', fontSize: '24px', fontWeight: '800' }}>{totalContractVolume.toLocaleString('hu-HU')} Ft</div>
            <div className="sc-sub">Összes rögzített projektérték</div>
          </div>
          <div className="sc" style={{ background: 'rgba(46,209,88,0.04)', border: '1px solid rgba(46,209,88,0.2)' }}>
            <div className="sc-lbl" style={{ color: 'var(--t2)' }}>Beérkezett összeg</div>
            <div className="sc-val" style={{ color: 'var(--green)', fontSize: '24px', fontWeight: '800' }}>{paidVolume.toLocaleString('hu-HU')} Ft</div>
            <div className="sc-sub">Kifizetett projektek összege</div>
          </div>
          <div className="sc" style={{ background: 'rgba(255,59,48,0.04)', border: '1px solid rgba(255,59,48,0.2)' }}>
            <div className="sc-lbl" style={{ color: 'var(--t2)' }}>Kinnlövőség</div>
            <div className="sc-val" style={{ color: 'var(--red)', fontSize: '24px', fontWeight: '800' }}>{unpaidVolume.toLocaleString('hu-HU')} Ft</div>
            <div className="sc-sub">Fizetésre váró tételek</div>
          </div>
        </div>
      ) : (
        <div className="stats-grid fu d1 mt-4">
          <div className="sc" style={{ background: 'rgba(46,209,88,0.05)', border: '1px solid rgba(46,209,88,0.15)' }}>
            <div className="sc-lbl">Összes ledolgozott óra</div>
            <div className="sc-val" style={{ color: 'var(--green)' }}>{totalWorkerHours}</div>
            <div className="sc-sub">Terepi munkalapok alapján</div>
          </div>
          <div className="sc" style={{ background: 'rgba(255,214,10,0.05)', border: '1px solid rgba(255,214,10,0.15)' }}>
            <div className="sc-lbl">Összesített bérköltség</div>
            <div className="sc-val" style={{ color: 'var(--yellow)', fontSize: '18px' }}>{totalWorkerPayout.toLocaleString('hu-HU')} Ft</div>
            <div className="sc-sub">Egyedi órabérekkel felszorozva</div>
          </div>
        </div>
      )}

      {/* MEGRENDELŐI KIFIZETÉSEK */}
      {activeTab === 'projects' && (
        <div className="mt-4 px-5 pb-24 fu d2 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t3)' }}>
              PROJEKTEK FIZETÉSI ÁLLAPOTA
            </span>
            <span style={{ fontSize: '10px', background: 'var(--s1)', border: '1px solid var(--b1)', padding: '2px 8px', borderRadius: '20px', color: 'var(--t2)', fontWeight: '700' }}>
              {projects.length} db
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-10" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>
              Nincsenek projektek a rendszerben.
            </div>
          ) : (
            projects.map(proj => (
              <div key={proj.id} className="p-4 flex flex-col space-y-3" style={{
                background: 'var(--s1)', borderRadius: '16px',
                border: proj.paid ? '1px solid rgba(46,209,88,0.18)' : '1px solid rgba(255,59,48,0.15)',
              }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--t1)', fontSize: '14px', letterSpacing: '-0.3px' }}>
                      {proj.name || 'Névtelen Projekt'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '600', marginTop: '3px' }}>
                      {proj.serial_number ? `${proj.serial_number} · ` : ''}📍 {proj.address || 'Cím nélkül'}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleProjectPaid(proj.id, proj.paid)}
                    style={{
                      padding: '5px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '10px',
                      textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'all 0.2s ease', border: 'none',
                      background: proj.paid ? 'rgba(46,209,88,0.12)' : 'rgba(255,59,48,0.08)',
                      color: proj.paid ? 'var(--green)' : 'var(--red)',
                      outline: proj.paid ? '1px solid rgba(46,209,88,0.25)' : '1px solid rgba(255,59,48,0.18)',
                    }}
                  >
                    {proj.paid ? '✓ FIZETVE' : '× FIZETÉSRE VÁR'}
                  </button>
                </div>
                <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--b1)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--t3)' }}>Megrendelési érték:</span>
                  <span style={{ fontWeight: '700', color: 'var(--t1)', fontSize: '14px' }}>
                    {(proj.client_price || 0).toLocaleString('hu-HU')} Ft
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DOLGOZÓI BÉRSZÁMFEJTÉS */}
      {activeTab === 'workers' && (
        <div className="mt-4 px-5 pb-24 fu d2 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--t3)' }}>
              Könyvelési adatlapok és bérek
            </span>
            <span style={{ fontSize: '10px', background: 'var(--s1)', border: '1px solid var(--b1)', padding: '2px 8px', borderRadius: '20px', color: 'var(--t2)', fontWeight: '700' }}>
              {workersData.length} fő
            </span>
          </div>

          {workersData.length === 0 ? (
            <div className="text-center py-10" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px', fontSize: '13px', color: 'var(--t3)', fontStyle: 'italic' }}>
              Nincsenek dolgozók a rendszerben.
            </div>
          ) : (
            workersData.map(worker => {
              const isExpanded = expandedWorkerId === worker.id;
              const isEditing = editingWorkerId === worker.id;

              return (
                <div key={worker.id} style={{
                  background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px',
                  overflow: 'hidden', boxShadow: isExpanded ? '0 12px 30px rgba(0,0,0,0.35)' : 'none',
                }}>
                  <div
                    onClick={() => { if (!isEditing) setExpandedWorkerId(isExpanded ? null : worker.id); }}
                    className="p-4 flex flex-col space-y-3 cursor-pointer"
                    style={{ background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2.5">
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                          background: 'var(--s2)', border: '1px solid var(--b1)',
                        }}>👷</div>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--t1)', fontSize: '14px' }}>{worker.full_name || 'Névtelen'}</div>
                          <div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                            {worker.serial_number || 'M-00'} · {worker.job_title || 'Szerelő'}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Órabér</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t2)', marginTop: '2px' }}>
                          {(worker.hourly_wage || 3500).toLocaleString('hu-HU')} Ft
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2.5" style={{ borderTop: '1px solid var(--b1)' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Ledolgozott idő</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontSize: '17px', fontWeight: '700', color: 'var(--blue)' }}>{worker.totalHours}</span>
                          <span style={{ fontSize: '12px', color: 'var(--t2)' }}>óra ({worker.totalLogs} nap)</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Kereset (Hó)</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontSize: '17px', fontWeight: '700', color: 'var(--yellow)' }}>{worker.estimatedPay.toLocaleString('hu-HU')}</span>
                          <span style={{ fontSize: '12px', color: 'var(--t2)' }}>Ft</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                      <span style={{ fontSize: '9px', color: 'var(--t3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {isExpanded ? '▲ Könyvelési lap bezárása' : '▼ Részletes könyvelési adatlap'}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-4 fu" style={{ background: 'rgba(0,0,0,0.35)', borderTop: '1px solid var(--b1)' }}>
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--green)' }}>
                          🔒 Bizalmas adatok
                        </span>
                        {!isEditing ? (
                          <div className="flex space-x-2">
                            <button onClick={() => startEditing(worker)} style={{
                              padding: '5px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '10px',
                              textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
                              background: 'var(--s1)', color: 'var(--t1)', border: '1px solid var(--b1)',
                              fontFamily: 'inherit',
                            }}>✏️ Szerkesztés</button>
                            <button onClick={() => handleDeleteWorker(worker.id, worker.full_name)} style={{
                              padding: '5px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '10px',
                              textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
                              background: 'rgba(255, 59, 48, 0.08)', color: 'var(--red)', border: '1px solid rgba(255, 59, 48, 0.15)',
                              fontFamily: 'inherit',
                            }}>🗑️ Törlés</button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button onClick={() => setEditingWorkerId(null)} style={{
                              padding: '5px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '10px',
                              cursor: 'pointer', background: 'rgba(255,59,48,0.08)', color: 'var(--red)',
                              border: '1px solid rgba(255,59,48,0.15)', fontFamily: 'inherit',
                            }}>Mégse</button>
                            <button onClick={() => saveWorkerEdit(worker.id)} style={{
                              padding: '5px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '10px',
                              cursor: 'pointer', background: 'linear-gradient(135deg,#2ed158,#1a8a38)',
                              color: '#fff', border: 'none', fontFamily: 'inherit',
                            }}>Mentés</button>
                          </div>
                        )}
                      </div>

                      {!isEditing ? (
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-1">
                          {[
                            ['Szerződéses órabér', `${(worker.hourly_wage || 3500).toLocaleString('hu-HU')} Ft / óra`],
                            ['E-mail cím', worker.email || '—'],
                            ['Munkakör', worker.job_title || '—'],
                            ['Telefonszám', worker.phone || '—'],
                            ['Vészhelyzeti', worker.emergency_phone || '—'],
                          ].map(([lbl, val]) => (
                            <div key={lbl}>
                              <div style={labelXs}>{lbl}</div>
                              <div style={{ fontWeight: '600', color: 'var(--t1)', fontSize: '12px' }}>{val}</div>
                            </div>
                          ))}
                          <div className="col-span-2">
                            <div style={labelXs}>Állandó Lakcím</div>
                            <div style={{ fontWeight: '600', color: 'var(--t1)', fontSize: '12px' }}>{worker.address || '—'}</div>
                          </div>
                          {[['Adóazonosító', worker.tax_id || '—'], ['TAJ / TB', worker.tb_number || '—']].map(([lbl, val]) => (
                            <div key={lbl}>
                              <div style={labelXs}>{lbl}</div>
                              <div style={{ fontWeight: '600', color: 'var(--t2)', fontSize: '12px', letterSpacing: '0.03em' }}>{val}</div>
                            </div>
                          ))}
                          <div className="col-span-2">
                            <div style={labelXs}>Bankszámlaszám</div>
                            <div style={{ fontWeight: '600', color: 'var(--t1)', fontSize: '12px', letterSpacing: '0.03em' }}>{worker.bank_account || '—'}</div>
                          </div>
                          <div>
                            <div style={labelXs}>Személyi Igazolvány</div>
                            <div style={{ fontWeight: '600', color: 'var(--t2)', fontSize: '12px' }}>{worker.id_card_number || '—'}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <div><label style={labelXs}>Teljes Név</label><input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} style={inputStyle} /></div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label style={labelXs}>Órabér (Ft)</label><input type="number" value={editWage} onChange={(e) => setEditWage(e.target.value)} style={inputStyle} /></div>
                            <div><label style={labelXs}>Munkakör</label><input type="text" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} style={inputStyle} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label style={labelXs}>Telefonszám</label><input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={inputStyle} /></div>
                            <div><label style={labelXs}>Vészhelyzeti</label><input type="text" value={editEmergency} onChange={(e) => setEditEmergency(e.target.value)} style={inputStyle} /></div>
                          </div>
                          <div><label style={labelXs}>Állandó Lakcím</label><input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} style={inputStyle} /></div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label style={labelXs}>Adószám</label><input type="text" value={editTaxId} onChange={(e) => setEditTaxId(e.target.value)} style={inputStyle} /></div>
                            <div><label style={labelXs}>TB (TAJ)</label><input type="text" value={editTbNumber} onChange={(e) => setEditTbNumber(e.target.value)} style={inputStyle} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label style={labelXs}>Bankszámlaszám</label><input type="text" value={editBankAccount} onChange={(e) => setEditBankAccount(e.target.value)} style={inputStyle} /></div>
                            <div><label style={labelXs}>Személyi Ig.</label><input type="text" value={editIdCard} onChange={(e) => setEditIdCard(e.target.value)} style={inputStyle} /></div>
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
