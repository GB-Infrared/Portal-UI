import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortal } from '../data/PortalData';
import { num } from '../lib/format';

/**
 * Site overview · the room between the sign-in and the portal.
 *
 * Signing in used to drop you straight onto one plant's Home, which made the
 * portfolio something you discovered afterwards from a dropdown. This makes the
 * portfolio the first thing you see: one core, every site in orbit around it,
 * and the portal opens on whichever one you pick. It is also now the ONLY place
 * a site is switched — Home's plant name links here rather than dropping open a
 * picker of its own, so "which site" is answered in one place by a screen that
 * can show every site's state at once.
 *
 * WHAT THE PICTURE ENCODES, and it is only these three things:
 *   POSITION  nothing. Sites sit evenly around the ring in the order the backend
 *             lists them. It is a picker, not a map — inventing a geography here
 *             would be inventing a fact.
 *   SIZE      AC capacity. The biggest site is the biggest node.
 *   COLOUR    health, and health only.
 * Brightness rides on output, so a fleet at midday glows and the same fleet at
 * midnight goes quiet without a single number being read.
 *
 * NOTHING HERE IS SIMULATED. Every figure comes from the plants the provider
 * was given; a field the backend omits renders as a dash rather than as a
 * plausible number, which is the same bargain every other page in this app
 * makes. With no backend attached the screen says so in as many words.
 *
 * @see contract.js — Plant, and the optional fields this page reads from it
 */
export default function Plants() {
  const { plants, user, alarms } = usePortal();
  const navigate = useNavigate();
  const list = useMemo(() => plants || [], [plants]);

  const theatreRef = useRef(null);
  const canvasRef = useRef(null);
  const chipRefs = useRef([]);

  /* 'hot' is the site under the pointer; 'pin' is one held open by a double
     click. They are separate because a pinned card must survive the pointer
     wandering off, and a hover must not overwrite a card somebody asked to hold. */
  const [hot, setHot] = useState(null);
  const [pin, setPin] = useState(null);
  const shown = pin || hot;

  const [clock, setClock] = useState('');
  useEffect(() => {
    const t = () => setClock(new Date().toLocaleTimeString('en-IN',
      { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------- what the fleet adds up to ----------
     Summed from the plants themselves, so the bar and the ring cannot disagree.
     A missing field contributes nothing and is reported as a dash, never as 0:
     "no reading" and "zero kilowatts" are different facts about a site. */
  const totals = useMemo(() => {
    let ac = 0, kw = 0, e = 0, pk = 0, dev = 0, up = 0, crit = 0, warn = 0;
    let anyAc = false, anyKw = false, anyE = false, anyPk = false, anyDev = false;
    list.forEach(p => {
      if (p.acCapacity != null) { ac += p.acCapacity; anyAc = true; }
      if (p.livePower != null) { kw += p.livePower; anyKw = true; }
      if (p.energyToday != null) { e += p.energyToday; anyE = true; }
      if (p.peakPower != null) { pk += p.peakPower; anyPk = true; }
      if (p.deviceCount != null) {
        dev += p.deviceCount;
        up += p.devicesOnline != null ? p.devicesOnline : p.deviceCount;
        anyDev = true;
      }
      crit += p.criticalAlarms || 0;
      warn += p.warningAlarms || 0;
    });
    return { ac, kw, e, pk, dev, up, crit, warn, anyAc, anyKw, anyE, anyPk, anyDev };
  }, [list]);

  const open = useCallback(p => {
    /* the portal opens ON the site that was picked — the whole point of the
       screen. Home reads ?plant= and selects it. */
    navigate('/?plant=' + encodeURIComponent(p.id));
  }, [navigate]);

  /* A single click opens the site, but it cannot open it IMMEDIATELY: the second
     half of a double click would never arrive, because the first half had already
     navigated away. So a mouse click arms the open and a double click disarms it
     and pins instead. A keyboard Enter arrives as a click with no click count and
     no double coming, so that one opens at once. */
  const clickT = useRef(0);
  const armOpen = useCallback(p => {
    clearTimeout(clickT.current);
    clickT.current = setTimeout(() => open(p), 260);
  }, [open]);
  useEffect(() => () => clearTimeout(clickT.current), []);

  const pinTo = useCallback(p => {
    clearTimeout(clickT.current);
    setPin(cur => (cur && cur.id === p.id ? null : p));
  }, []);
  const unpin = useCallback(() => setPin(null), []);

  /* Stepping the ring is a change of subject, so it releases a pinned card
     rather than walking a focus ring the readout has stopped following. A typed
     character is left alone: nothing here takes text, but a browser find bar
     does, and stealing the arrow keys from it would be rude. */
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') { unpin(); return; }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const n = list.length;
      if (!n) return;
      e.preventDefault();
      unpin();
      const at = chipRefs.current.indexOf(document.activeElement);
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = at < 0 ? (step > 0 ? 0 : n - 1) : (at + step + n) % n;
      const el = chipRefs.current[next];
      if (el) el.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list.length, unpin]);

  /* ================= THE CANVAS =================
     The picture is drawn; the CONTROLS are HTML buttons laid over it. A canvas
     can render a hundred sites beautifully and not one of them would be
     reachable by keyboard, focusable, or readable aloud. */
  const geom = useRef({ W: 0, H: 0, CX: 0, CY: 0, pts: [] });
  const [, force] = useState(0);

  useLayoutEffect(() => {
    const cv = canvasRef.current, box = theatreRef.current;
    if (!cv || !box) return undefined;
    const ox = cv.getContext('2d');
    let raf = 0, theta = 0, last = performance.now();
    const reduced = typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    const size = () => {
      const r = box.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      geom.current.W = r.width; geom.current.H = r.height;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
      ox.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* the canvas measures the MAP, which already starts below the bar and
         stops at the rail, so its own centre is the right one */
      geom.current.CX = r.width / 2; geom.current.CY = r.height / 2;
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(box);

    const COLOR = { ok: '#2fd07a', warn: '#f0b249', crit: '#ff6b6b', off: '#56697f' };
    const RING = 0.66;

    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) theta += dt * 0.035;             /* one turn every three minutes */
      const { W, H, CX, CY } = geom.current;
      const r = Math.min(W, H) * RING * 0.62;
      ox.clearRect(0, 0, W, H);

      /* two hairlines through the core: the field reads as an instrument rather
         than a canvas, and the eye is handed the centre before the ring is */
      ox.strokeStyle = 'rgba(90,162,240,.15)'; ox.lineWidth = 1;
      ox.beginPath();
      ox.moveTo(0, CY); ox.lineTo(W, CY);
      ox.moveTo(CX, 0); ox.lineTo(CX, H);
      ox.stroke();

      ox.beginPath();
      ox.strokeStyle = 'rgba(90,162,240,.20)';
      ox.ellipse(CX, CY, r, r * 0.92, 0, 0, Math.PI * 2);
      ox.stroke();

      const pts = list.map((p, i) => {
        const a = theta + i * Math.PI * 2 / (list.length || 1);
        return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r * 0.92 };
      });
      geom.current.pts = pts;

      /* spokes from the core to each site: the sum is made OF these, and a ring
         with nothing crossing it would be a decoration rather than a relationship */
      pts.forEach(q => {
        ox.beginPath();
        ox.strokeStyle = 'rgba(90,162,240,.12)';
        ox.moveTo(CX, CY); ox.lineTo(q.x, q.y);
        ox.stroke();
      });

      /* ---- the core: glow alone, never a disc ----
         The portfolio total is printed over this point, and a bright disc landed
         between the digits and read as a smudge. The glow breathes with load, so
         a fleet at noon burns and the same fleet at midnight is a cold point. */
      const load = totals.ac ? Math.min(1, totals.kw / totals.ac) : 0;
      const breathe = reduced ? 1 : (1 + Math.sin(now / 1000 * 1.4) * 0.05);
      const R = 17 * breathe * (0.55 + load * 0.45);
      const g = ox.createRadialGradient(CX, CY, 0, CX, CY, R * 5.4);
      const ah = v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
      g.addColorStop(0, '#e3b23c' + ah(0.30 + load * 0.34));
      g.addColorStop(0.18, '#e3b23c' + ah(0.16 + load * 0.20));
      g.addColorStop(0.45, '#e3b23c10');
      g.addColorStop(1, '#e3b23c00');
      ox.fillStyle = g;
      ox.beginPath(); ox.arc(CX, CY, R * 5.4, 0, Math.PI * 2); ox.fill();

      /* the collar: twelve marks on a dial, at a radius that clears the readout
         on both axes so a five-digit total never collides with them */
      const CR = Math.max(96, r * 0.30);
      ox.strokeStyle = '#e3b23c' + ah(0.16 + load * 0.20); ox.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + (reduced ? 0 : now / 1000 * 0.06);
        ox.beginPath();
        ox.moveTo(CX + Math.cos(a) * CR, CY + Math.sin(a) * CR * 0.92);
        ox.lineTo(CX + Math.cos(a) * (CR + 7), CY + Math.sin(a) * (CR + 7) * 0.92);
        ox.stroke();
      }

      list.forEach((p, i) => {
        const q = pts[i];
        const st = stateOf(p), col = COLOR[st];
        const dim = (hot && hot.id !== p.id) ? 0.3 : 1;
        /* SIZE is capacity and brightness is output — two channels, two
           questions, so "big" never has to mean "busy" */
        const cap = p.acCapacity || 0;
        const rad = 7 + Math.sqrt(Math.min(1, cap / 3200)) * 7;
        const lit = st === 'off' || !cap || p.livePower == null
          ? 0 : Math.min(1, p.livePower / cap);

        ox.save(); ox.globalAlpha = dim;
        const halo = ox.createRadialGradient(q.x, q.y, 0, q.x, q.y, rad * 3.4);
        halo.addColorStop(0, col + ah(0.16 + lit * 0.47));
        halo.addColorStop(1, col + '00');
        ox.fillStyle = halo;
        ox.beginPath(); ox.arc(q.x, q.y, rad * 3.4, 0, Math.PI * 2); ox.fill();

        ox.fillStyle = col; ox.globalAlpha = dim * (0.45 + lit * 0.55);
        ox.beginPath(); ox.arc(q.x, q.y, rad, 0, Math.PI * 2); ox.fill();

        ox.globalAlpha = dim; ox.strokeStyle = col; ox.lineWidth = 1.4;
        ox.beginPath(); ox.arc(q.x, q.y, rad + 4, 0, Math.PI * 2); ox.stroke();

        /* a critical site keeps a slow pulse, so it is found without being hunted */
        if (st === 'crit' && !reduced) {
          const t = (now / 1000) % 2 / 2;
          ox.globalAlpha = dim * (1 - t) * 0.55; ox.lineWidth = 1.2;
          ox.beginPath(); ox.arc(q.x, q.y, rad + 4 + t * 22, 0, Math.PI * 2); ox.stroke();
        }
        ox.restore();
      });

      /* the chips are positioned from the same angles the nodes were drawn at,
         so a label can never drift off the thing it names */
      pts.forEach((q, i) => {
        const el = chipRefs.current[i];
        if (el) { el.style.left = q.x + 'px'; el.style.top = q.y + 'px'; }
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [list, hot, totals.ac, totals.kw, force]);

  if (!list.length) {
    return (
      <div className="page-plants">
        <Ambient />
        <Bar user={user} clock={clock} totals={totals} navigate={navigate} />
        <div className="void">No portfolio has been loaded</div>
      </div>
    );
  }

  return (
    <div className="page-plants">
      <Ambient />
      <Bar user={user} clock={clock} totals={totals} navigate={navigate} />

      <section
        className={'theatre' + (hot ? ' hot' : '') + (list.length > 9 ? ' dense' : '')}
        ref={theatreRef}
        aria-label="Portfolio orbital map"
        onClick={e => { if (!e.target.closest('.chip')) unpin(); }}
      >
        <canvas ref={canvasRef} />

        <div className="core">
          <div className="kw">
            <span>{totals.anyKw ? num(totals.kw) : '—'}</span><small>kW</small>
          </div>
          <div className="cap">{list.length} SITES · PORTFOLIO OUTPUT</div>
        </div>

        {list.map((p, i) => {
          const st = stateOf(p), n = openAlarms(p);
          return (
            <button
              key={p.id}
              type="button"
              className={'chip' + (shown && shown.id === p.id ? ' on' : '')}
              ref={el => { chipRefs.current[i] = el; }}
              aria-label={`${p.name || p.id} — ${STATE_TEXT[st]}${
                p.livePower != null ? ', ' + num(p.livePower) + ' kilowatts' : ''}, ${
                n ? n + ' open alarm' + (n > 1 ? 's' : '') : 'no open alarms'}. Open this site.`}
              onClick={e => { if (e.detail === 0) open(p); else armOpen(p); }}
              onDoubleClick={e => { e.preventDefault(); pinTo(p); }}
              onMouseEnter={() => { if (!pin) setHot(p); }}
              onFocus={() => { if (!pin) setHot(p); }}
              onMouseLeave={() => { if (!pin) setHot(null); }}
              onBlur={() => { if (!pin) setHot(null); }}
            >
              <span className="lbl">
                <span className="nm">{p.name || p.id}</span>
                <span className="mt">
                  <span className={'val' + (st === 'ok' ? '' : ' ' + st)}>
                    {st === 'off' ? 'OFFLINE'
                      : p.livePower != null ? num(p.livePower) + ' kW' : '—'}
                  </span>
                  <span className={'alm' + (n ? ' on' : '') + (p.criticalAlarms ? ' crit' : '')}>
                    {n || ''}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <Rail list={list} alarms={alarms} totals={totals} />
      <Detail site={shown} pinned={!!pin} onOpen={open} onUnpin={unpin} />

      {/* the same sites, without the picture, for narrow screens */}
      <div className="fallback">
        <div className="flist">
          {list.map(p => {
            const st = stateOf(p);
            return (
              <button className="frow" type="button" key={p.id} onClick={() => open(p)}>
                <span className="dot" style={{ background: STATE_COLOR[st] }} />
                <span>
                  <span className="nm">{p.name || p.id}</span><br />
                  <span className="ac">
                    {p.acCapacity != null ? num(p.acCapacity) + ' kW AC' : '—'}
                    {p.deviceCount != null && ` · ${p.devicesOnline != null
                      ? p.devicesOnline : p.deviceCount}/${p.deviceCount} online`}
                  </span>
                </span>
                <span className="kw">
                  {st === 'off' ? 'OFFLINE'
                    : p.livePower != null ? num(p.livePower) + ' kW' : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- health, and health only ----------
   Warm anywhere on this ring means somebody has to look at something. The order
   matters: a critical outranks a warning, and a site with nothing coming in is
   neither — it is unknown, which is its own colour. */
const STATE_TEXT = { ok: 'PRODUCING', warn: 'ATTENTION', crit: 'CRITICAL', off: 'OFFLINE' };
const STATE_COLOR = { ok: '#2fd07a', warn: '#f0b249', crit: '#ff6b6b', off: '#56697f' };
function stateOf(p) {
  if (p.criticalAlarms) return 'crit';
  if (p.deviceCount != null && p.devicesOnline === 0) return 'off';
  if (p.livePower == null && p.deviceCount == null) return 'off';
  if (p.warningAlarms || (p.deviceCount != null && p.devicesOnline != null
      && p.devicesOnline < p.deviceCount)) return 'warn';
  return 'ok';
}
/* A site's OPEN ALARMS are its criticals and its warnings. A device that is
   simply down is counted separately and never folded in here: an inverter off
   for maintenance is a fact about the fleet, not somebody shouting. */
const openAlarms = p => (p.criticalAlarms || 0) + (p.warningAlarms || 0)
  || (p.activeAlarms || 0);

/* kW under a megawatt and MW over it. A portfolio line reading 7,500 kW makes
   you count digits to learn it is seven and a half megawatts, which is the whole
   of what the line was for. */
const fmtP = kw => kw >= 1000 ? (kw / 1000).toFixed(kw >= 10000 ? 0 : 1) + ' MW' : num(kw) + ' kW';
const fmtE = e => e >= 1000 ? (e / 1000).toFixed(e >= 10000 ? 0 : 1) + ' MWh' : num(e) + ' kWh';

function Ambient() {
  return (
    <>
      <div className="stars" />
      <div className="aurora" />
      <div className="vignette" />
      <div className="grain" />
      <div className="corner tl" />
      <div className="corner br" />
    </>
  );
}

function Bar({ user, clock, totals, navigate }) {
  return (
    <header className="hud">
      <div className="mark">
        <img src="/logo-mark.png" alt="EnerOps Data Systems Pvt Ltd" />
        <span>
          <span className="word">ENEROPS OS</span>
          <span className="sub">Site Overview</span>
        </span>
      </div>
      <Cell k="Generation today" v={totals.anyE ? fmtE(totals.e) : '—'} />
      <Cell k="Peak power" v={totals.anyPk ? fmtP(totals.pk) : '—'} cls="c2" />
      <Cell k="Capacity" v={totals.anyAc ? fmtP(totals.ac) : '—'} cls="c3" />
      <Cell k="Open alarms" v={totals.crit + totals.warn || '0'} cls="c4" />
      <Cell k="Devices" v={totals.anyDev
        ? <>{totals.up}<small>OF {totals.dev}</small></> : '—'} />
      <div className="right">
        <span className="live" aria-hidden="true" />
        <Cell k="Operator" v={(user && (user.name || user.email)) || '—'} />
        <Cell k="Local" v={clock || '—'} />
        <button className="out" type="button" onClick={() => navigate('/login')}>SIGN OUT</button>
      </div>
    </header>
  );
}
const Cell = ({ k, v, cls }) => (
  <div className={'cell' + (cls ? ' ' + cls : '')}>
    <span className="k">{k}</span><span className="v">{v}</span>
  </div>
);

/**
 * The rail carries what the ring is structurally unable to show: the ring
 * encodes size as size, so it can never say how hard a site is working against
 * its OWN nameplate; and it can say a site is red without saying what tripped.
 */
function Rail({ list, alarms, totals }) {
  const rows = (alarms || []).filter(a => a.status !== 'resolved').slice(0, 60);
  const nc = rows.filter(a => a.sev === 'critical').length;
  const nw = rows.length - nc;
  return (
    <aside className="rail">
      <div className="mod">
        <div className="h">Output <b>//</b> by site
          <span className="r">{totals.anyKw ? fmtP(totals.kw) : '—'}</span>
        </div>
        <div className="bars">
          {list.map(p => {
            const st = stateOf(p);
            const f = p.acCapacity && p.livePower != null
              ? Math.min(1, p.livePower / p.acCapacity) : 0;
            return (
              <div className="bar" key={p.id}>
                <div className="t">
                  <span className="n">{p.name || p.id}</span>
                  <span className="v">
                    {/* Output ALONE cannot be compared across sites of different
                        sizes, so the share of nameplate rides beside it. */}
                    {st === 'off' ? 'OFFLINE'
                      : p.livePower == null ? '—'
                      : `${num(p.livePower)} kW · ${Math.round(f * 100)}%`}
                  </span>
                </div>
                <div className="track">
                  <span className="fill"
                        style={{ width: (f * 100).toFixed(1) + '%', background: STATE_COLOR[st] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mod">
        <div className="h">Peak power <b>//</b> by site
          <span className="r">{totals.anyPk ? fmtP(totals.pk) : '—'}</span>
        </div>
        <div className="bars">
          {list.map(p => (
            <div className="bar" key={p.id}>
              <div className="t">
                <span className="n">{p.name || p.id}</span>
                <span className="v">
                  {p.peakPower != null
                    ? num(p.peakPower) + ' kW' + (p.peakAt ? ' · ' + p.peakAt : '')
                    : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mod grow">
        <div className="h">Alarms <b>//</b> open
          <span className="r">
            {rows.length
              ? <>
                  {!!nc && <><span className="crit">{nc}</span> CRIT</>}
                  {!!nc && !!nw && <span className="sep">·</span>}
                  {!!nw && <><span className="warn">{nw}</span> WARN</>}
                </>
              : <span className="none">NONE</span>}
          </span>
        </div>
        <div className="log">
          {rows.length
            ? rows.map((a, i) => (
                <div className={'row ' + (a.sev === 'critical' ? 'crit' : 'warn')} key={a.id || i}>
                  <span className="tm">{a.at || ''}</span>
                  <span className="sid">{a.plant || ''}</span>
                  <span className="ms">
                    {a.device ? a.device + ' · ' : ''}{a.message}
                  </span>
                </div>
              ))
            : <div className="none">Nothing open across the fleet</div>}
        </div>
      </div>
    </aside>
  );
}

/**
 * The readout for the site under the pointer. Glass rather than a flat panel:
 * it sits OVER the ring, and a solid fill punches a hole in the picture it is
 * describing. Double-clicking a node pins it — a card that vanishes the moment
 * the pointer leaves can be glanced at and nothing else.
 */
function Detail({ site, pinned, onOpen, onUnpin }) {
  const p = site;
  const st = p ? stateOf(p) : 'off';
  const n = p ? openAlarms(p) : 0;
  const f = p && p.acCapacity && p.livePower != null
    ? Math.round(p.livePower / p.acCapacity * 100) : null;
  return (
    <div className={'detail' + (p ? ' on' : '') + (pinned ? ' pin' : '')} aria-live="polite">
      <button className="x" type="button" title="Close" aria-label="Close"
              onClick={onUnpin}>×</button>
      <div className="t">{p ? (p.name || p.id) : '—'}</div>
      <div className="a">{(p && p.address) || ''}</div>
      <div className="sep" />
      <div className="rows">
        <Row k="CAPACITY" v={p && p.acCapacity != null ? fmtP(p.acCapacity) + ' AC' : '—'} />
        <Row k="OUTPUT" v={!p ? '—' : st === 'off' ? 'OFFLINE'
          : p.livePower == null ? '—' : `${num(p.livePower)} kW · ${f}%`} />
        <Row k="PEAK POWER" v={p && p.peakPower != null
          ? num(p.peakPower) + ' kW' + (p.peakAt ? ' · ' + p.peakAt : '') : '—'} />
        <Row k="TODAY ENERGY" v={p && p.energyToday != null ? fmtE(p.energyToday) : '—'} />
        <Row k="DEVICES" v={p && p.deviceCount != null
          ? `${p.devicesOnline != null ? p.devicesOnline : p.deviceCount} of ${p.deviceCount} online`
          : '—'} />
        <Row k="ALARMS" v={n} cls={p && p.criticalAlarms ? 'crit' : n ? 'warn' : 'ok'} />
      </div>
      <button className="go" type="button" onClick={() => { if (pinned && p) onOpen(p); }}>
        ↵ OPEN THIS SITE
      </button>
    </div>
  );
}
const Row = ({ k, v, cls }) => (
  <div className="r">
    <span className="k">{k}</span><span className="dots" />
    <span className={'v' + (cls ? ' ' + cls : '')}>{v}</span>
  </div>
);
