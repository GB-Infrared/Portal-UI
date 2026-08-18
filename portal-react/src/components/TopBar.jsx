import { AccountMenu } from './AccountMenu';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { fmtClock } from '../lib/format';
import { REFRESH_OPTIONS } from '../data/constants';
import { MoonIcon, SunIcon } from './icons';

/** The clock is the viewer's real time, not plant data — it ticks regardless. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function TopBar({ subtitle, refreshSeconds, onRefreshChange,
                         theme, onToggleTheme, user, onSignOut }) {
  const now = useClock();
  const live = refreshSeconds !== 'off';

  return (
    <header className="topbar">
      {/* the mark alone, not the full lockup - that artwork spells out "EnerOps
          Data Systems Pvt ltd", which would print the company name twice */}
      <div className="brand">
        <img className="logo" src="/logo-mark.png" alt="EnerOps Data Systems Pvt Ltd" />
        <span className="btext">
          <span className="word">ENEROPS OS</span>
          {subtitle && <span className="sub">{subtitle}</span>}
        </span>
      </div>

      <nav className="tabs">
        <NavLink className={({ isActive }) => 'tab' + (isActive ? ' active' : '')} to="/">Home</NavLink>
        <NavLink className={({ isActive }) => 'tab' + (isActive ? ' active' : '')} to="/monitoring">Monitoring</NavLink>
        <NavLink className={({ isActive }) => 'tab' + (isActive ? ' active' : '')} to="/alarms">Alarms</NavLink>
        <NavLink className={({ isActive }) => 'tab' + (isActive ? ' active' : '')} to="/analysis">Analysis</NavLink>
        <NavLink className={({ isActive }) => 'tab' + (isActive ? ' active' : '')} to="/kpi">KPI</NavLink>
      </nav>

      <div className="right">
        <span className="clock">{fmtClock(now)}</span>
        <div className="refresh">
          <span className="dot" style={{ animationPlayState: live ? 'running' : 'paused',
                                         opacity: live ? 1 : 0.35 }} />
          <span>Refresh</span>
          <select
            value={refreshSeconds}
            onChange={e => onRefreshChange(e.target.value === 'off' ? 'off' : Number(e.target.value))}
            style={{ padding: '5px 26px 5px 9px', fontSize: 12 }}
          >
            {REFRESH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button className="iconbtn" onClick={onToggleTheme}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <AccountMenu user={user} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
