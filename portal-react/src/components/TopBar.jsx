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

export function TopBar({ subtitle, plantName, refreshSeconds, onRefreshChange,
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

      {/* ---------- WHICH SITE THE PORTAL IS ON ----------
          A READOUT, NOT A CONTROL. Every page is showing one site, and until now
          only Home said which — so walking to Monitoring or Alarms meant reading
          a screenful of numbers with no statement anywhere of what they were
          numbers ABOUT. It is the same words in the same spot on every page.

          A pin and a name, with no "SITE" label in front of it: the wordmark
          beside it already says SITE OVERVIEW and the tab beside that says Site
          Control, and a third would be the bar saying the word three times
          before saying anything. */}
      <div className="sitenow" title="The site every page in this portal is showing. Change it on Site Control.">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21.2s6.8-6 6.8-10.8a6.8 6.8 0 1 0-13.6 0c0 4.8 6.8 10.8 6.8 10.8z" />
          <circle cx="12" cy="10.2" r="2.5" />
        </svg>
        <span className="n">{plantName || '—'}</span>
      </div>

      <nav className="tabs">
        {/* the way to the overview, from every page rather than from Home's
            plant name alone — choosing a site is one screen's job, and a screen
            you can only reach from one other screen is a screen people forget */}
        <NavLink className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
                 to="/plants" title="Every site, on the globe">Site Control</NavLink>
        <NavLink end className={({ isActive }) => 'tab' + (isActive ? ' active' : '')} to="/">Home</NavLink>
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
