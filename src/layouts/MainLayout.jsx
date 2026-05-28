import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import clsx from 'clsx';
import { useUser } from '../context/UserContext';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  // Ha az útvonal (oldal) változik, görgessük a közös görgetési konténert (#SA) a legtetejére!
  useEffect(() => {
    const scrollContainer = document.getElementById('SA');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [location.pathname]);

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
