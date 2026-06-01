import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './context/UserContext';

import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetails from './pages/ProjectDetails';
import Timesheet from './pages/Timesheet';
import Finance from './pages/Finance';
import Issues from './pages/Issues';
import CalendarView from './pages/CalendarView';
import Info from './pages/Info';

export default function App() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 border-4 border-[#4f8ef7] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/" 
          element={user ? <MainLayout /> : <Navigate to="/login" />} 
        >
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="project/:id" element={<ProjectDetails />} />
          <Route path="timesheet" element={<Timesheet />} />
          <Route path="finance" element={user?.role === 'admin' ? <Finance /> : <Navigate to="/" />} />
          <Route path="issues" element={<Issues />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="info" element={<Info />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
