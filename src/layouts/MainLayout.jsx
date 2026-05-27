import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

export default function MainLayout() {
  const navigate = useNavigate();
  const [time, setTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', icon: '⬡', label: 'Főoldal' },
    { to: '/project/1', icon: '📁', label: 'Projektek' },
    { to: '/timesheet', icon: '📋', label: 'Napi lap' },
    { to: '/finance', icon: '👷', label: 'Munkások' },
  ];

  return (
    <div className="app">
      <div className="glow-top"></div>
      <div className="glow-bot"></div>

      <div className="statusbar">
        <div className="sb-time">{time}</div>
        <div className="sb-icons">
          <span className="sb-icon">●●●</span>
          <span className="sb-icon">5G</span>
          <span style={{ fontSize: '16px' }}>🔋</span>
        </div>
      </div>

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
