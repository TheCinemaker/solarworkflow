import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetails from './pages/ProjectDetails';
import Timesheet from './pages/Timesheet';
import Finance from './pages/Finance';
import Issues from './pages/Issues';
import CalendarView from './pages/CalendarView';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/" 
          element={session ? <MainLayout /> : <Navigate to="/login" />} 
        >
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="project/:id" element={<ProjectDetails />} />
          <Route path="timesheet" element={<Timesheet />} />
          <Route path="finance" element={<Finance />} />
          <Route path="issues" element={<Issues />} />
          <Route path="calendar" element={<CalendarView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
