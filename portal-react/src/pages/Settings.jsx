import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePortal } from '../data/PortalData';
import { useToast } from '../components/Toasts';
import { AccountMenu } from '../components/AccountMenu';
import { useTheme } from '../lib/useTheme';
import { SECTIONS, GROUP_ICON } from './settings/sections';
import {
  CompanyProfile, CustomerDevices, RateBoard, EnergyOffset,
  AlarmsConfig, RoleTable, UserTable, AccessControl
} from './settings/panels';

/**
 * Settings · everything about the account rather than about the plant.
 *
 * Its own chrome, not the portal's: nothing here is a live reading, so the
 * tabs, the clock and the refresh control would all be furniture claiming
 * something the page does not do.
 *
 * The profile prints what the backend sends and an em-dash where it sends
 * nothing — the same bargain every chart in this app makes. A settings screen
 * that filled a missing phone number with a plausible one would be inventing
 * exactly the kind of fact people act on.
 *
 * Every section is drawn. The panels live in settings/panels.jsx and read from
 * the payload; a table the backend has not sent says so in a sentence rather
 * than drawing an empty grid, and no control here writes anything without a
 * host callback to write it with.
 */
export default function Settings() {
  const { user, plant, plants, query, company, deviceRegister, emissionRates,
          electricityRates, energyOffsets, alarmRecipients, roles, users } = usePortal();
  /* the same resolution the top bar uses: the payload may name a plant, or it
     may send only the list and the chosen id, and the pin has to be right either
     way — see the note in App.jsx */
  const chosen = plant || (plants || []).filter(p => p.id === query.plantId)[0];
  const plantName = chosen && (chosen.name || chosen.id);
  const toast = useToast();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [theme, toggleTheme] = useTheme();
  const [shut, setShut] = useState(() => new Set());

  /* EVERY WRITE GOES THROUGH THE HOST, and with no host wired this is what
     every one of them does. Said once rather than at each call site, because
     the answer is the same for all of them and a screen that pretended to save
     would be worse than one that admits it cannot. */
  const notWired = () => toast('Saving is the host application\u2019s to wire — see contract.js');

  /* the hash carries the section, so a link to one part of Settings lands on
     that part rather than on whichever happens to be first */
  const wanted = (hash || '').slice(1);
  const current = SECTIONS.find(s => s.id === wanted) || SECTIONS[0];

  useEffect(() => { document.title = 'ENEROPS OS · ' + current.label; }, [current]);

  /* a group cannot hold the current screen and be shut at the same time */
  useEffect(() => {
    setShut(prev => (prev.has(current.group) ? remove(prev, current.group) : prev));
  }, [current.group]);

  const groups = [];
  SECTIONS.forEach(s => {
    const g = groups.find(x => x.name === s.group);
    if (g) g.items.push(s); else groups.push({ name: s.group, items: [s] });
  });

  return (
    <div className="page-settings">
      <header className="topbar">
        <Link className="brand" to="/" title="Back to the portal">
          <img className="logo" src="/logo-mark.png" alt="EnerOps Data Systems Pvt Ltd" />
          <span className="btext">
            <span className="word">ENEROPS OS</span>
            <span className="sub">Site Overview</span>
          </span>
        </Link>
        <div className="right">
          {/* the way back, said in words as well as in the mark — an image that
              happens to be a link is only a link to someone who already tried it */}
          <Link className="backlink" to="/">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            <span>Back to portal</span>
          </Link>
          <button className="iconbtn" onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? SUN : MOON}
          </button>
          <AccountMenu user={user} onSignOut={() => navigate('/login')} />
        </div>
      </header>

      <div className="shell">
        {/* ===================== SIDEBAR ===================== */}
        <aside className="side">
          <div className="sidehead">
            {GEAR}
            <span className="t">Settings</span>
          </div>

          {/* Every group is open on arrival. A reader who has come to Settings to
              find one thing should see all eleven names at once; collapsing is
              for after they know the shape, not before. */}
          {groups.map(g => (
            <div className={'grp' + (shut.has(g.name) ? ' shut' : '')} key={g.name}>
              <button className="grpbtn" type="button"
                      onClick={() => setShut(prev => toggle(prev, g.name))}>
                {GROUP_ICON[g.name]}
                {g.name}
                <svg className="chev" width="13" height="13" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <div className="grpitems">
                {g.items.map(s => (
                  <button key={s.id} type="button"
                          className={'item' + (s.id === current.id ? ' on' : '')}
                          onClick={() => navigate('/settings#' + s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* ===================== MAIN ===================== */}
        <main className="main">
          {/* the heading names the GROUP and the card names the item, so the
              reader can see both where they are and what they are looking at */}
          <h1 className="pagehead">{current.group}</h1>

          {/* Each panel draws its OWN head, because most of them carry tools —
              a site pin, a count, an ADD button — that belong to the panel
              rather than to the shell around it. User Profile is the one that
              does not, so the shell keeps a head for it alone. */}
          <section className="card">
            {current.id === 'user-profile' ? (
              <>
                <div className="chead">
                  <div className="title">{current.label}</div>
                  <div className="tools">
                    <button className="tbtn" type="button" onClick={notWired}>EDIT</button>
                  </div>
                </div>
                <UserProfile user={user} onChangePassword={notWired} />
              </>
            ) : current.id === 'company-profile' ? (
              <>
                <div className="chead"><div className="title">{current.label}</div></div>
                <CompanyProfile company={company} />
              </>
            ) : current.id === 'customer-devices' ? (
              <CustomerDevices devices={deviceRegister} plantName={plantName} />
            ) : current.id === 'emission-rate' ? (
              <RateBoard title="Emission Rate" unit="kg CO₂ / kWh" rates={emissionRates}
                         plantName={plantName} onAdd={notWired} onRemove={notWired} />
            ) : current.id === 'electricity-rate' ? (
              <RateBoard title="Electricity Rate" unit="₹ / kWh" rates={electricityRates}
                         plantName={plantName} onAdd={notWired} onRemove={notWired} />
            ) : current.id === 'energy-offset' ? (
              <EnergyOffset offsets={energyOffsets} plantName={plantName}
                            onAdd={notWired} onRemove={notWired} />
            ) : current.id === 'alarms-config' ? (
              <AlarmsConfig recipients={alarmRecipients} onAdd={notWired} onEdit={notWired} />
            ) : current.id === 'access-role' ? (
              <RoleTable roles={roles} users={users} plants={plants}
                         onAdd={notWired} onEdit={notWired} />
            ) : current.id === 'access-user' ? (
              <UserTable users={users} roles={roles}
                         onAdd={notWired} onEdit={notWired} onHold={notWired} />
            ) : current.id === 'access-ctl' ? (
              <AccessControl users={users} roles={roles} plants={plants} onAssign={notWired} />
            ) : (
              <>
                <div className="chead"><div className="title">{current.label}</div></div>
                <div className="todo">
                  <span className="badge">Not designed yet</span>
                  <div className="h">{current.headline}</div>
                  <div className="p">{current.note}</div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

/** an em-dash, never a plausible-looking placeholder */
function Value({ children }) {
  const empty = children == null || children === '';
  return <div className={'v' + (empty ? ' none' : '')}>{empty ? '—' : children}</div>;
}

function UserProfile({ user, onChangePassword }) {
  const u = user || {};
  const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ');
  const initial = u.initial || (name ? name[0].toUpperCase() : '');

  return (
    <>
      <div className="who">
        <div className="big">{initial || '—'}</div>
        <div>
          <div className="nm">{name || 'No operator signed in'}</div>
          <div className="ro">{u.role || 'Role not set'}</div>
        </div>
      </div>

      {/* Two columns, filled in reading order. The legacy screen ran Email and
          Contact down the left while the right column sat empty from Address
          onward, which put a hole in the middle of the card and made the pairing
          look meaningful when it was only what the grid did when it ran out. */}
      <div className="fields">
        <div className="f"><div className="k">First name</div><Value>{u.firstName}</Value></div>
        <div className="f"><div className="k">Last name</div><Value>{u.lastName}</Value></div>
        <div className="f"><div className="k">Company name</div><Value>{u.company}</Value></div>
        <div className="f"><div className="k">Address</div><Value>{u.address}</Value></div>
        <div className="f"><div className="k">Email</div><Value>{u.email}</Value></div>
        <div className="f"><div className="k">Contact number</div><Value>{u.phone}</Value></div>
      </div>

      <div className="cfoot">
        <span className="k">Password</span>
        <span className="sp" />
        <button className="linkbtn" type="button" onClick={onChangePassword}>Change password</button>
      </div>
    </>
  );
}

const toggle = (set, k) => {
  const next = new Set(set);
  if (next.has(k)) next.delete(k); else next.add(k);
  return next;
};
const remove = (set, k) => { const next = new Set(set); next.delete(k); return next; };

const GEAR = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09A1.7 1.7 0 0 0 21 10.1a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
  </svg>
);
const MOON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinejoin="round">
    <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" />
  </svg>
);
const SUN = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
  </svg>
);
