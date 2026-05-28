import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function MainLayout() {
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: '⬡', label: 'Főoldal' },
    { to: '/projects', icon: '📁', label: 'Projektek' },
    { to: '/calendar', icon: '📅', label: 'Naptár' },
    { to: '/timesheet', icon: '📋', label: 'Napi lap' },
    { to: '/finance', icon: '👷', label: 'Munkások' },
  ];

  return (
    <div className="app">
      <div className="glow-top"></div>
      <div className="glow-bot"></div>

      <div className="scroll-area" id="SA">
        <Outlet />
      </div>

      <div className="fab" onClick={() => navigate('/timesheet')}>+</div>

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
