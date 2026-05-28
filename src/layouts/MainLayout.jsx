import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [toast, setToast] = useState(null);

  // Ha az útvonal (oldal) változik, görgessük a közös görgetési konténert (#SA) a legtetejére!
  useEffect(() => {
    const scrollContainer = document.getElementById('SA');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [location.pathname]);

  // Globális Realtime üzenet figyelő értesítésekhez
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-chat-listener')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
        // Ha mi magunk küldtük az üzenetet, ne mutassunk toastot
        if (payload.new.user_id === user.id) return;

        // Ha éppen azon a projekt oldalon vagyunk, nem kell toast
        const isCurrentlyViewingThisProject = location.pathname === `/project/${payload.new.project_id}`;
        if (isCurrentlyViewingThisProject) return;

        try {
          const { data: fullMsg } = await supabase
            .from('messages')
            .select(`
              content,
              projects (name),
              profiles (full_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (fullMsg) {
            setToast({
              projectId: payload.new.project_id,
              projectName: fullMsg.projects?.name || 'Új projekt',
              senderName: fullMsg.profiles?.full_name || 'Munkatárs',
              content: fullMsg.content.length > 45 ? fullMsg.content.substring(0, 45) + '...' : fullMsg.content
            });

            // 5 másodperc után automatikusan elrejti
            const timer = setTimeout(() => {
              setToast(null);
            }, 5000);
            return () => clearTimeout(timer);
          }
        } catch (err) {
          console.error("Global toast helper error:", err);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname]);

  const navItems = [
    { to: '/', icon: '⬡', label: 'Főoldal' },
    { to: '/projects', icon: '📁', label: 'Projektek' },
    { to: '/calendar', icon: '📅', label: 'Naptár' },
    { to: '/timesheet', icon: '📋', label: 'Munkalapok' },
    ...(user?.role === 'admin' ? [{ to: '/finance', icon: '👷', label: 'Dolgozók' }] : []),
  ];

  return (
    <div className="app">
      <div className="glow-top"></div>
      <div className="glow-bot"></div>

      {/* Globális Új Chat Értesítés (Toast) */}
      {toast && (
        <>
          <style>{`
            @keyframes slideDownToast {
              0% { transform: translateY(-30px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div 
            onClick={() => {
              navigate(`/project/${toast.projectId}`);
              setToast(null);
            }}
            className="fu"
            style={{
              position: 'fixed',
              top: '20px',
              left: '15px',
              right: '15px',
              background: 'rgba(20, 24, 35, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(0, 136, 204, 0.4)',
              boxShadow: '0 12px 35px rgba(0, 136, 204, 0.3)',
              borderRadius: '10px',
              padding: '12px 15px',
              zIndex: 99999,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              animation: 'slideDownToast 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <div style={{ fontSize: '22px', marginRight: '12px' }}>💬</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', color: 'var(--blue)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                ÚJ CHAT ÜZENET: {toast.projectName}
              </div>
              <div style={{ fontSize: '12px', color: '#fff', fontWeight: '600', lineHeight: '1.3' }}>
                {toast.senderName}: <span style={{ fontWeight: '400', color: 'var(--t2)' }}>"{toast.content}"</span>
              </div>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--blue)', marginLeft: '10px', fontWeight: 'bold' }}>➔</div>
          </div>
        </>
      )}

      <div className="scroll-area" id="SA">
        <Outlet />
      </div>

      <div className="bnav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx("nb", isActive && "on")}
            end={item.to === '/'}
          >
            <div className="nb-i">{item.icon}</div>
            <div className="nb-l">{item.label}</div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
