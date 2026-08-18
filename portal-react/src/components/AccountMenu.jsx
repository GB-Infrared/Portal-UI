import { Link } from 'react-router-dom';
import { usePanel } from '../lib/usePanel';

/**
 * The avatar, with somewhere to go.
 *
 * It was a dead circle on every page: it named the signed-in operator and
 * offered nothing. This is the only place Settings and Sign out can live
 * without spending a top-level tab on either, and every page carries the same
 * one so the way out is never hunted for.
 *
 * The name and email are the backend's — with no `user` the menu still opens
 * and says so, rather than printing a plausible-looking person nobody is.
 *
 * @param {{name?:string,initial?:string,email?:string}|null} user
 * @param {() => void} onSignOut  what signing out actually does is the host's
 *                                call: this only offers the door
 */
export function AccountMenu({ user, onSignOut }) {
  const { open, toggle, close, ref } = usePanel();
  const u = user || {};
  const name = u.name || '';
  const initial = u.initial || (name ? name[0].toUpperCase() : '');

  return (
    <div className={'acct' + (open ? ' open' : '')} ref={ref}>
      <button className="avatar" type="button" title={name || 'Account'}
              aria-haspopup="menu" aria-expanded={open}
              onClick={e => { e.stopPropagation(); toggle(); }}>
        {/* an empty circle reads as a control that failed to render. With no
            operator the avatar says "a person, unknown" instead of nothing. */}
        {initial || PERSON}
      </button>

      {open && (
        <div className="acctmenu" role="menu">
          <div className="acctwho">
            <div className="nm">{name || 'Not signed in'}</div>
            <div className="em">{u.email || 'No account connected'}</div>
          </div>
          <div className="acctdiv" />
          <Link className="acctitem" role="menuitem" to="/settings" onClick={close}>
            {GEAR}Settings
          </Link>
          <button className="acctitem out" role="menuitem" type="button"
                  onClick={() => { close(); if (onSignOut) onSignOut(); }}>
            {OUT}Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const PERSON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8.4" r="3.5" /><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </svg>
);
const GEAR = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09A1.7 1.7 0 0 0 21 10.1a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
  </svg>
);
const OUT = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.5 16.5v1.8a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V5.7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1.8" />
    <path d="M19.8 12H9.4m10.4 0-3.2-3.2M19.8 12l-3.2 3.2" />
  </svg>
);
