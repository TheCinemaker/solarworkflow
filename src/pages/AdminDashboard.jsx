import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import NewWorkerModal from '../components/NewWorkerModal';
import NewProjectModal from '../components/NewProjectModal';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [stats, setStats] = useState({ projects: 0, workers: 0, worklogs: 0 });

  React.useEffect(() => {
    async function fetchStats() {
      const { count: projectsCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      const { count: workersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: worklogsCount } = await supabase.from('worklogs').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0]);
      
      setStats({
        projects: projectsCount || 0,
        workers: workersCount || 0,
        worklogs: worklogsCount || 0
      });
    }
    fetchStats();
  }, [isWorkerModalOpen, isProjectModalOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navbar */}
      <nav className="bg-slate-950/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-white">Admin Vezérlőpult</span>
            </div>
            <div>
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Kijelentkezés
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header section with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Áttekintés</h1>
            <p className="text-slate-400 text-sm mt-1">Kezeld a dolgozókat és a projekteket.</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsWorkerModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
            >
              + Új Dolgozó
            </button>
            <button 
              onClick={() => setIsProjectModalOpen(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-500/20"
            >
              + Új Projekt
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/10">
            <h3 className="text-slate-400 text-sm font-medium">Összes Projekt</h3>
            <p className="text-3xl font-bold text-white mt-2">{stats.projects}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/10">
            <h3 className="text-slate-400 text-sm font-medium">Regisztrált Dolgozók</h3>
            <p className="text-3xl font-bold text-white mt-2">{stats.workers}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/10">
            <h3 className="text-slate-400 text-sm font-medium">Mai Munkalapok</h3>
            <p className="text-3xl font-bold text-white mt-2">{stats.worklogs}</p>
          </div>
        </div>

      </main>

      <NewWorkerModal 
        isOpen={isWorkerModalOpen} 
        onClose={() => setIsWorkerModalOpen(false)} 
        onSuccess={() => alert('Dolgozó sikeresen létrehozva! (Jelentkezz ki és vissza teszteléshez)')} 
      />

      <NewProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={() => alert('Projekt sikeresen létrehozva!')}
      />
    </div>
  );
}
