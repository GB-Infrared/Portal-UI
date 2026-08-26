import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Sign in · the portal's front door, in Fleet Control's language.
 *
 * Fleet Control boots before it asks anything: a black field, a log typing
 * itself out a line at a time, and only then OPERATOR / PASSKEY /
 * AUTHENTICATE. Same screen here, in this portal's green and gold rather than
 * Fleet Control's teal and cream, so the two read as one product family.
 *
 * The boot log is honest about what it is booting: the three pages behind the
 * sign-in. Not one line reports a plant — no site has been asked about yet,
 * and a front door that opened with a megawatt figure would be inventing the
 * very thing the portal exists to measure.
 *
 * NOTHING IS AUTHENTICATED HERE. Like every other page in this app, the design
 * is complete and the behaviour it cannot know is left to the host:
 *
 *   <App onSignIn={creds => api.signIn(creds)}
 *        onResetPassword={next => api.resetPassword(next)} />
 *
 * Both take an object and return a promise. Resolve to continue into the
 * portal; reject with an Error whose `message` is shown under the fields — the
 * backend is the only thing that knows WHY a sign-in failed, and this page
 * inventing "wrong passkey" would be guessing at it. With neither wired the
 * page says so in as many words rather than pretending to let anybody in.
 *
 * @param {(c:{email:string,password:string})=>Promise} [onSignIn]
 * @param {(c:{email:string,password:string})=>Promise} [onResetPassword]
 * @param {string} [to]  where an authenticated operator lands; defaults to Home
 */
export default function Login({ onSignIn, onResetPassword, to = '/' }) {
  const navigate = useNavigate();

  /* 'boot' → the log is still typing · 'signin' / 'reset' → the box is up ·
     'granted' → the log has taken over again to narrate the way in */
  const [phase, setPhase] = useState('boot');
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);       // [fieldId, message] | [null, message]
  const [caps, setCaps] = useState(null);
  const [v, setV] = useState({ lu: '', lp: '', ru: '', rp: '', rp2: '' });

  const timer = useRef(null);
  const firstRef = useRef(null);
  /* Every typing run takes a ticket, and a run whose ticket is no longer the
     current one stops appending. StrictMode mounts twice in development: without
     this the first, discarded run kept firing into the same state and the banner
     came out doubled — a real bug on screen, not just a warning in the console. */
  const gen = useRef(0);

  const reduced = typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* One chain of timeouts, and the ref is what lets a skip — or an unmount
     mid-boot — cancel the one still pending. Without that, a component that
     has gone away keeps calling setState and React complains. */
  const type = useCallback((queue, done) => {
    const mine = ++gen.current;
    let i = 0;
    (function next() {
      if (gen.current !== mine) return;
      if (i >= queue.length) { if (done) done(); return; }
      const line = queue[i++];
      setLines(prev => prev.concat([line]));
      timer.current = setTimeout(next, reduced ? 15 : (i < 3 ? 300 : 165));
    })();
  }, [reduced]);

  useEffect(() => {
    /* start from an empty log, so a re-run replays the boot rather than
       appending a second copy of it to the first */
    setLines([]);
    type(BOOT, () => setPhase('signin'));
    return () => { gen.current++; clearTimeout(timer.current); };
  }, [type]);

  /* someone who has seen the boot once should not have to sit through it again */
  useEffect(() => {
    if (phase !== 'boot') return undefined;
    const skip = () => {
      gen.current++;                 /* stop the chain still in flight */
      clearTimeout(timer.current);
      setLines(BOOT);
      setPhase('signin');
    };
    window.addEventListener('keydown', skip, { once: true });
    return () => window.removeEventListener('keydown', skip);
  }, [phase]);

  useEffect(() => {
    if ((phase === 'signin' || phase === 'reset') && firstRef.current) firstRef.current.focus();
  }, [phase]);

  const set = (k, val) => {
    setV(prev => ({ ...prev, [k]: val }));
    setErr(null);
  };

  /* Reset carries the operator across, because the reader has usually just
     typed it into the field above, and being asked for it twice reads as not
     having been listened to the first time. */
  const goStep = next => {
    setErr(null);
    setV(prev => (next === 'reset'
      ? { ...prev, ru: prev.ru || prev.lu }
      : { ...prev, lu: prev.lu || prev.ru }));
    setPhase(next);
  };

  async function submit(kind) {
    const bad = kind === 'signin'
      ? check([['lu', v.lu, 'email'], ['lp', v.lp, 'passkey']])
      : check([['ru', v.ru, 'email'], ['rp', v.rp, 'new'], ['rp2', v.rp2, 'match', v.rp]]);
    if (bad) { setErr(bad); focus(bad[0]); return; }

    const handler = kind === 'signin' ? onSignIn : onResetPassword;
    if (!handler) {
      setErr([null, `NO AUTHENTICATION SERVICE IS CONNECTED — PASS ${
        kind === 'signin' ? 'onSignIn' : 'onResetPassword'} TO <App>`]);
      return;
    }

    setBusy(true);
    setErr(null);
    const who = (kind === 'signin' ? v.lu : v.ru).trim();
    try {
      await handler({ email: who, password: kind === 'signin' ? v.lp : v.rp });
    } catch (e) {
      setBusy(false);
      setErr([null, ((e && e.message) || 'ACCESS DENIED').toUpperCase()]);
      return;
    }
    /* the log takes the screen back and narrates the way in — which is the whole
       idea Fleet Control's front door is built on */
    setBusy(false);
    setPhase('granted');
    type([
      ['', kind === 'signin'
        ? '[ auth   ]  access granted · operator ..... '
        : '[ auth   ]  passkey replaced · operator ... ', who.toUpperCase()],
      ['warm', '>  SELECT A SITE']
    ], () => {
      timer.current = setTimeout(() => navigate(to, { replace: true }), 550);
    });
  }

  function focus(id) {
    const el = document.getElementById('lg-' + id);
    if (el) el.focus();
  }

  const showBox = phase === 'signin' || phase === 'reset';
  const reset = phase === 'reset';

  return (
    <div className="page-login">
      <div className="stars" />
      <Limb />
      <div className="vignette" />
      <div className="grain" />
      <div className="corner tl" />
      <div className="corner br" />

      <div className="boot">
        {/* ONE PANEL, AND IT IS THE OVERVIEW'S OWN. The sign-in used to stand
            bare on the field: type on a background, with nothing bounding it.
            That is why it read as plain — not because anything was missing from
            it, but because nothing on the screen said where it ENDED. This is
            the same glass the site overview's detail card stands on, with the
            same blur, hairline and radius, so brand, log and form are one
            object on one surface in front of one picture. */}
        <div className="stack">
          {/* THE MARK IS BACK, AND IT IS SMALL. A sign-in box floating on a
              photograph of Earth with no name on it is not restrained, it is
              unidentified — this is the one screen a person reaches before they
              have any other way of knowing what they are signing into. It heads
              the panel; it does not announce the product. */}
          <div className="brand">
            <img src="/logo-mark.png" alt="EnerOps Data Systems Pvt Ltd" />
            <span>
              <span className="word">ENEROPS OS</span>
              <span className="sub">Site Control</span>
            </span>
          </div>

          <pre className="bootlog">
            {lines.map((l, i) => (
              <div key={i} className={l[0] || undefined}>
                {l[1]}{l[2] ? <b>{l[2]}</b> : null}
              </div>
            ))}
          </pre>

          {showBox && (
            <div className="lbox">
              {reset ? (
                <>
                  <Row id="ru" label="Operator" value={v.ru} onChange={x => set('ru', x)}
                       bad={err && err[0] === 'ru'} inputRef={firstRef} onEnter={() => submit('reset')}
                       type="email" autoComplete="username" placeholder="you@company.com" />
                  <Row id="rp" label="New passkey" value={v.rp} onChange={x => set('rp', x)}
                       bad={err && err[0] === 'rp'} onEnter={() => submit('reset')}
                       password autoComplete="new-password" placeholder="At least 8 characters"
                       onCaps={on => setCaps(on ? 'rp' : null)} />
                  <Row id="rp2" label="Confirm" value={v.rp2} onChange={x => set('rp2', x)}
                       bad={err && err[0] === 'rp2'} onEnter={() => submit('reset')}
                       password autoComplete="new-password" placeholder="Type it again" />
                  {caps === 'rp' && <div className="lcaps">CAPS LOCK IS ON</div>}
                  <div className="lact">
                    <button className="lgo" type="button" disabled={busy} onClick={() => submit('reset')}>
                      {busy && <span className="spin" />}SET PASSKEY
                    </button>
                    <button className="lalt" type="button" onClick={() => goStep('signin')}>CANCEL</button>
                  </div>
                  <div className="lerr">{err ? err[1] : ''}</div>
                  <div className="lhint">MINIMUM 8 CHARACTERS</div>
                </>
              ) : (
                <>
                  <Row id="lu" label="Operator" value={v.lu} onChange={x => set('lu', x)}
                       bad={err && err[0] === 'lu'} inputRef={firstRef} onEnter={() => submit('signin')}
                       type="email" autoComplete="username" placeholder="you@company.com" />
                  <Row id="lp" label="Passkey" value={v.lp} onChange={x => set('lp', x)}
                       bad={err && err[0] === 'lp'} onEnter={() => submit('signin')}
                       password autoComplete="current-password" placeholder="••••••••"
                       onCaps={on => setCaps(on ? 'lp' : null)} />
                  {caps === 'lp' && <div className="lcaps">CAPS LOCK IS ON</div>}
                  <div className="lact">
                    <button className="lgo" type="button" disabled={busy} onClick={() => submit('signin')}>
                      {busy && <span className="spin" />}AUTHENTICATE
                    </button>
                    {/* No mailed link and no second page: you are already at a
                        keyboard on the screen that refused you, so the reset is
                        asked and answered here, in the same box. */}
                    <button className="lalt" type="button" onClick={() => goStep('reset')}>
                      LOST PASSKEY?
                    </button>
                  </div>
                  <div className="lerr">{err ? err[1] : ''}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {phase === 'boot' && !reduced && <div className="skip">PRESS ANY KEY TO SKIP</div>}
    </div>
  );
}

/* Fleet Control's format — timestamped lines counting up what came online.
   WHAT is counted differs, because what boots here differs: the pages behind
   the sign-in, not a broker uplink and a firmware vault. Every line is a fact
   about this app starting; none of them is a reading from a plant.

   THE BANNER IS GONE, and it had to go the moment the mark arrived at the head
   of the panel: the wordmark was being printed twice on one screen, once in
   type and once in the log underneath it. It was always the product introducing
   itself to somebody who had just opened the product.

   'kernel init' went with it. It was the one line here that was not about this
   application: a plant operator has no kernel, and a status line nobody can act
   on is set dressing pretending to be information. Every line left names a page
   they are about to be able to open.

   'analysis & kpi' is split in two. They are separate pages behind the sign-in,
   they come up separately, and one line covering both was a shortcut in the
   writing that made the log slightly untrue.

   AND THE PROMPT IS GONE. The log used to end on '> AWAITING OPERATOR', which
   was the screen telling the reader it was waiting for them — while the form
   sat beside it with a cursor already in it. The form IS the ask; a line of
   type restating it is the machine narrating its own state rather than
   reporting anything. The log ends on the last thing it actually did. */
const BOOT = [
  ['',     '[ 0.214 ]  monitoring ...................... ', 'READY'],
  ['',     '[ 0.395 ]  alarms .......................... ', 'READY'],
  ['',     '[ 0.611 ]  analysis ........................ ', 'READY'],
  ['',     '[ 0.742 ]  kpi ............................. ', 'READY']
];

/**
 * The edge of the Earth, across the foot of the front door.
 *
 * It replaces the aurora that used to glow there. The aurora was a colour with
 * nothing behind it; this is the planet the fleet is on, seen from one step
 * further out than the site overview shows it, and it puts the sign-in in the
 * same room the portal opens into rather than in a decorated void.
 *
 * THREE THINGS AND NOTHING ELSE:
 *   the ground   a circle whose centre is far below the window, so only its cap
 *                crosses the screen; dark, because a limb is a dark body.
 *   the line     the atmosphere edge-on, brightest under the sun and gone by
 *                the time the terminator has run off to the left.
 *   the haze     the same line spread over seven widening strokes, which is
 *                what an atmosphere does to a horizon and what one stroke of
 *                even alpha cannot imitate.
 *
 * NO SITE IS ON IT. Nothing here is clickable and no figure is printed over it;
 * the fleet lives on the ring on the other side of this door.
 *
 * Painted once per resize — nothing on it moves, and a horizon redrawing itself
 * sixty times a second is a fan spun up to animate a still.
 */
function Limb() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    const lx = cv.getContext('2d');
    if (!lx) return undefined;

    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = window.innerWidth, H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      lx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lx.clearRect(0, 0, W, H);

      /* the sun's place in the frame, read from the same custom property the
         page's own wash is positioned by, so there is one sun on this screen */
      const raw = getComputedStyle(cv).getPropertyValue('--sun-x').trim();
      const n = parseFloat(raw);
      const sx = isFinite(n) ? (raw.indexOf('%') >= 0 ? n / 100 : n / W) : 0.78;

      /* the radius is set from the WIDTH, because the curve is read across the
         screen rather than up it: too small and the horizon is a hill, too
         large and it is a ruled line and the planet has gone */
      const R = Math.max(W * 1.85, H * 2.2);
      const rise = Math.max(58, Math.min(H * 0.27, 230));
      const cx = W * 0.5, cy = H - rise + R;
      const at = t => Math.max(0, Math.min(1, t));

      /* lit ACROSS, not from a point: at this distance the terminator is a soft
         band down the face of the planet, and a radial highlight would put a
         spotlight on a world */
      const g = lx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#080d16');
      g.addColorStop(at(sx - 0.62), '#0a111c');
      g.addColorStop(at(sx - 0.34), '#0f1a2a');
      g.addColorStop(at(sx - 0.12), '#16283e');
      g.addColorStop(at(sx + 0.06), '#1d3a55');
      g.addColorStop(1, '#24455f');
      lx.beginPath(); lx.arc(cx, cy, R, 0, 6.283185); lx.closePath();
      lx.fillStyle = g; lx.fill();

      /* the ground under the sun takes the warm of it — the same gold the
         wordmark is, which is why the two read as one light */
      lx.save();
      lx.beginPath(); lx.arc(cx, cy, R, 0, 6.283185); lx.clip();
      const wy = H - rise * 0.35;
      const wg = lx.createRadialGradient(W * sx, wy, 0, W * sx, wy, Math.max(W * 0.30, 220));
      wg.addColorStop(0, 'rgba(255,206,140,.24)');
      wg.addColorStop(0.40, 'rgba(227,178,60,.08)');
      wg.addColorStop(1, 'rgba(227,178,60,0)');
      lx.fillStyle = wg;
      lx.fillRect(0, H - rise - 40, W, rise + 40);
      lx.restore();

      /* ONE gradient says how lit the air is along the whole arc, and every
         stroke below reads from it — so the hairline and the haze cannot
         disagree about where the day ends */
      const air = lx.createLinearGradient(0, 0, W, 0);
      air.addColorStop(0, 'rgba(90,162,240,0)');
      air.addColorStop(at(sx - 0.66), 'rgba(90,162,240,.10)');
      air.addColorStop(at(sx - 0.38), 'rgba(125,185,245,.34)');
      air.addColorStop(at(sx - 0.14), 'rgba(165,205,250,.72)');
      air.addColorStop(at(sx + 0.04), 'rgba(215,232,255,.96)');
      air.addColorStop(1, 'rgba(255,236,196,.90)');

      /* the haze FIRST, widest and faintest, so the hairline lands on top of
         its own glow rather than under it */
      lx.lineCap = 'butt';
      for (let i = 7; i >= 1; i--) {
        lx.beginPath();
        lx.arc(cx, cy, R + i * 3.6, Math.PI, 6.283185);
        lx.lineWidth = i * 5.2;
        lx.globalAlpha = 0.085 / Math.pow(i, 0.86);
        lx.strokeStyle = air;
        lx.stroke();
      }
      lx.globalAlpha = 1;

      /* and the line itself: thin, because the thing it draws is thin */
      lx.beginPath();
      lx.arc(cx, cy, R + 0.6, Math.PI, 6.283185);
      lx.lineWidth = 1.5;
      lx.strokeStyle = air;
      lx.stroke();
    };

    paint();
    window.addEventListener('resize', paint);
    return () => window.removeEventListener('resize', paint);
  }, []);
  return <canvas className="limb" ref={ref} aria-hidden="true" />;
}

const isEmail = s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

/**
 * The first thing that is wrong, and only the first: a box that lights up every
 * field at once tells you where you are worst rather than where to start.
 * Returns [fieldId, MESSAGE] or null.
 */
function check(fields) {
  for (const [id, value, kind, other] of fields) {
    const s = (value || '').trim();
    if (kind === 'email') {
      if (!s) return [id, 'ENTER YOUR OPERATOR ADDRESS'];
      if (!isEmail(s)) return [id, 'THAT IS NOT AN EMAIL ADDRESS'];
    } else if (kind === 'passkey') {
      if (!value) return [id, 'ENTER YOUR PASSKEY'];
    } else if (kind === 'new') {
      if (!value) return [id, 'CHOOSE A NEW PASSKEY'];
      if (value.length < 8) return [id, 'USE AT LEAST 8 CHARACTERS'];
    } else if (kind === 'match') {
      if (!value) return [id, 'TYPE THE NEW PASSKEY AGAIN'];
      if (value !== other) return [id, 'THE TWO PASSKEYS DO NOT MATCH'];
    }
  }
  return null;
}

const EYE = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.2 12S5.8 5.4 12 5.4 21.8 12 21.8 12 18.2 18.6 12 18.6 2.2 12 2.2 12Z" />
    <circle cx="12" cy="12" r="3.1" />
  </svg>
);
const EYE_OFF = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.4c6.2 0 9.8 6.6 9.8 6.6a17 17 0 0 1-2.9 3.8M6.2 7.5A17 17 0 0 0 2.2 12S5.8 18.6 12 18.6c1.5 0 2.8-.4 3.9-.9" />
    <path d="M10 10a2.9 2.9 0 0 0 4 4" />
    <path d="M3.2 3.2 20.8 20.8" />
  </svg>
);

/**
 * One row of the box: the label column, the field, and — on a passkey — the one
 * reveal. The native eye Edge draws is hidden in CSS, because two controls for
 * one job do not share state and the field could show plain text while ours
 * still offered to show it.
 *
 * Enter submits from any field: a terminal that made you reach for the mouse
 * would not be one.
 */
function Row({ id, label, value, onChange, bad, password, onCaps, onEnter, inputRef,
               type = 'text', ...rest }) {
  const [shown, setShown] = useState(false);
  const own = useRef(null);
  const ref = inputRef || own;

  const capsCheck = e => {
    if (!onCaps) return;
    let on = false;
    try { on = e.getModifierState && e.getModifierState('CapsLock'); } catch { /* older browsers */ }
    onCaps(!!on);
  };

  return (
    <div className="lrow">
      <label htmlFor={'lg-' + id}>{label}</label>
      <span className={'lfield' + (password ? ' pw' : '')}>
        {/* the reveal swaps the TYPE, so `type` is computed here and `rest` is
            spread first — a stray type in rest must not win over it */}
        <input id={'lg-' + id} ref={ref} className={bad ? 'bad' : undefined}
               value={value} onChange={e => onChange(e.target.value)}
               spellCheck="false" autoCapitalize="off"
               onKeyDown={e => { capsCheck(e); if (e.key === 'Enter') onEnter(); }}
               onKeyUp={capsCheck}
               onBlur={() => onCaps && onCaps(false)}
               {...rest}
               type={password ? (shown ? 'text' : 'password') : type} />
        {password && (
          /* title and aria-label name what the CLICK will do rather than what
             the field is doing: a crossed-out eye is read both ways by different
             people, and the control that handles a passkey cannot be a guess */
          <button className="reveal" type="button" aria-pressed={shown}
                  title={shown ? 'Hide passkey' : 'Show passkey'}
                  aria-label={shown ? 'Hide passkey' : 'Show passkey'}
                  onClick={() => { setShown(s => !s); if (ref.current) ref.current.focus(); }}>
            {shown ? EYE_OFF : EYE}
          </button>
        )}
      </span>
    </div>
  );
}
