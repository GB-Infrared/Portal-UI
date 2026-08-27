import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortal } from '../data/PortalData';
import { Globe } from '../components/Globe';
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
 * THE RING IS GONE, AND THE REASON IT WENT is the reason it was defensible in
 * the first place. It spaced sites evenly in backend order, with position
 * encoding NOTHING, on the argument that inventing a geography would be
 * inventing a fact. True — but the geography was never invented, it was simply
 * not being ASKED for, and where a site is decides which crew goes and how long
 * they are on the road. So the picture is the planet now, and a site stands at
 * its own coordinates.
 *
 * WHAT THE PICTURE ENCODES:
 *   POSITION  where the site actually is, from Plant.lat / Plant.lng.
 *   SIZE      AC capacity. The biggest site is the biggest node.
 *   COLOUR    health, and health only.
 * Brightness rides on output, so a fleet at midday glows and the same fleet at
 * midnight goes quiet without a single number being read.
 *
 * A SITE WITH NO COORDINATES IS NOT PLACED. It keeps its row in the rail, which
 * is the control anyway, and simply has no dot — because the one thing worse
 * than a map with a site missing from it is a map with a site in the wrong
 * place. The screen says how many are unplaced rather than quietly dropping
 * them.
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
  const chipRefs = useRef([]);

  /* 'hot' is the site under the pointer, and it is the whole of the state this
     screen keeps about what is being read. There used to be a 'pin' beside it -
     a card held open by a double click - and it is gone with the gesture that
     set it; see the note on open() below. */
  const [hot, setHot] = useState(null);
  const shown = hot;

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

  /* ONE CLICK OPENS, AT ONCE, AND EXACTLY ONCE.
     A click used to be ARMED rather than acted on: it waited 260ms in case a
     second one arrived, because a double click was the gesture that pinned the
     card. That put a delay on the one thing this screen exists to do, in order
     to keep a gesture nobody needed - the card can already be reached without
     pinning, because hovering opens it and it stays while the pointer is on it.
     So the pin is gone and the wait went with it.

     LEAVING IS A LATCH. A double click is still two click events even with
     nothing listening for the pair, and both used to reach here. That looked
     right - the second asked for the same place the first did - but it cost the
     way BACK: two assignments to the history is two entries, so a double click
     meant pressing Back twice to return to the fleet, with the first press
     appearing to do nothing. The first click sets the latch and every click
     after it is ignored, including one aimed at a different site while the page
     is already on its way somewhere. */
  const leaving = useRef(false);
  const open = useCallback(p => {
    if (leaving.current) return;
    leaving.current = true;
    /* the portal opens ON the site that was picked — the whole point of the
       screen. Home reads ?plant= and selects it. */
    navigate('/?plant=' + encodeURIComponent(p.id));
  }, [navigate]);

  /* THE CROSSING. The card stands at the foot of the screen and the ring is in
     the middle of it, so reaching the card means leaving the chip that opened
     it - and closing on mouseleave alone would shut it during the journey. The
     chip and the card are treated as ONE region and the wait covers the gap
     between them, which is what makes the card's own OPEN control reachable at
     all. Without this it is visible and inert, which is worse than absent. */
  const hotT = useRef(0);
  const showCard = useCallback(p => { clearTimeout(hotT.current); setHot(p); }, []);
  const holdCard = useCallback(() => clearTimeout(hotT.current), []);
  const armClose = useCallback(() => {
    clearTimeout(hotT.current);
    hotT.current = setTimeout(() => setHot(null), 260);
  }, []);
  const closeCard = useCallback(() => { clearTimeout(hotT.current); setHot(null); }, []);
  useEffect(() => () => clearTimeout(hotT.current), []);

  /* Stepping the ring moves the focus, and the focused chip lights its own card
     on the way. A typed character is left alone: nothing here takes text, but a
     browser find bar does, and stealing the arrow keys from it would be rude. */
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') { closeCard(); return; }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const n = list.length;
      if (!n) return;
      e.preventDefault();
      closeCard();
      const at = chipRefs.current.indexOf(document.activeElement);
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = at < 0 ? (step > 0 ? 0 : n - 1) : (at + step + n) % n;
      const el = chipRefs.current[next];
      if (el) el.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list.length, closeCard]);

  /* ================= THE PICTURE =================
     Drawn by <Globe/>, which owns the shader, the plates and the camera. What
     stays here is what it cannot know: which sites exist, where their chips go,
     and what the chips say. The chips are HTML over the canvas rather than
     drawn into it — a canvas can render a hundred sites beautifully and not one
     of them would be reachable by keyboard, focusable, or readable aloud. */

  /* Only the sites the backend has placed. A coordinate this app made up would
     put a crew on a road to nowhere. */
  const placed = useMemo(
    () => list.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)), [list]);
  const unplaced = list.length - placed.length;

  /* where the camera rests: the fleet's own centroid, so the portal opens
     looking straight at the sites rather than at a default meridian */
  const home = useMemo(() => {
    if (!placed.length) return { lng: 0, lat: 0 };
    let a = 0, b = 0;
    placed.forEach(p => { a += p.lng; b += p.lat; });
    return { lng: a / placed.length, lat: b / placed.length };
  }, [placed]);

  const globeRef = useRef(null);

  /* Every frame: where each node has landed, and whether it can be seen at all.
     Written straight to style rather than through state — this runs sixty times
     a second, and a setState per frame would re-render the rail and the card to
     move a dot. */
  const onFrame = useCallback(project => {
    for (let i = 0; i < placed.length; i++) {
      const el = chipRefs.current[i];
      if (!el) continue;
      const q = project(placed[i].lng, placed[i].lat);
      /* 0.05 rather than 0: a site exactly on the limb is edge-on and its chip
         would sit on the horizon flickering in and out */
      if (q.c > 0.05) {
        el.style.display = '';
        el.style.left = q.x + 'px';
        el.style.top = q.y + 'px';
      } else {
        el.style.display = 'none';
      }
    }
  }, [placed]);

  if (!list.length) {
    return (
      <div className="page-plants">
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
        className={'theatre' + (hot ? ' hot' : '') + (placed.length > 9 ? ' dense' : '')}
        ref={theatreRef}
        aria-label="The fleet, on the Earth"
        onClick={e => { if (!e.target.closest('.chip')) closeCard(); }}
      >
        <Globe ref={globeRef} home={home} onFrame={onFrame} />

        {placed.map((p, i) => {
          const st = stateOf(p), n = openAlarms(p);
          return (
            <button
              key={p.id}
              type="button"
              className={'chip' + (shown && shown.id === p.id ? ' on' : '') + ' ' + st}
              ref={el => { chipRefs.current[i] = el; }}
              aria-label={`${p.name || p.id} — ${STATE_TEXT[st]}${
                p.livePower != null ? ', ' + num(p.livePower) + ' kilowatts' : ''}, ${
                n ? n + ' open alarm' + (n > 1 ? 's' : '') : 'no open alarms'}. Open this site.`}
              onClick={() => open(p)}
              onMouseEnter={() => showCard(p)}
              onFocus={() => showCard(p)}
              onMouseLeave={armClose}
              onBlur={armClose}
            >
              <span className="dot" />
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
                  <svg className="go" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.5 4.5 16 12l-7.5 7.5" />
                  </svg>
                </span>
              </span>
            </button>
          );
        })}

        {/* The wheel could always do this; these are the same motion made
            visible and clickable, for the pointer that has no wheel. */}
        <div className="zoom" role="group" aria-label="Zoom">
          <button className="zbtn" type="button" aria-label="Zoom out"
                  onClick={() => globeRef.current && globeRef.current.zoomBy(1 / 1.5)}>−</button>
          <button className="zbtn" type="button" aria-label="Zoom in"
                  onClick={() => globeRef.current && globeRef.current.zoomBy(1.5)}>+</button>
        </div>

        {/* said, not swallowed: a fleet with sites missing from the picture has
            to say so, or the picture is quietly claiming to be the whole of it */}
        {!!unplaced && (
          <div className="unplaced">
            {unplaced} {unplaced === 1 ? 'site has' : 'sites have'} no coordinates and {unplaced === 1 ? 'is' : 'are'} not on the map
          </div>
        )}
      </section>

      <Rail list={list} alarms={alarms} totals={totals} />
      <Detail site={shown} onOpen={open} onClose={closeCard}
              onHold={holdCard} onLeave={armClose} />

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

/* THE STARS AND THE AURORA ARE GONE FROM HERE, and they were not deleted so
   much as superseded: the shader draws the real sky behind the planet — NASA's
   Deep Star Maps, turned to the viewer's own sidereal time — and a CSS starfield
   over the top of it would be a second, fake sky disagreeing with the first.

   What is left is frame furniture, which belongs to the window rather than to
   the picture: the vignette closing the corners down, the ruling, and the two
   brackets that say "instrument" in four strokes. */
function Ambient() {
  return (
    <>
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
function Detail({ site, onOpen, onClose, onHold, onLeave }) {
  const p = site;
  const st = p ? stateOf(p) : 'off';
  const n = p ? openAlarms(p) : 0;
  const f = p && p.acCapacity && p.livePower != null
    ? Math.round(p.livePower / p.acCapacity * 100) : null;
  return (
    <div className={'detail' + (p ? ' on' : '')} aria-live="polite"
         onMouseEnter={onHold} onMouseLeave={onLeave}>
      <button className="x" type="button" title="Close" aria-label="Close"
              onClick={onClose}>×</button>
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
      {/* the card's own way in, and it no longer waits to be pinned before it
          will work - it is reachable because hovering keeps it open, and a
          control that is visible but inert is worse than one that is absent */}
      <button className="go" type="button" onClick={() => { if (p) onOpen(p); }}>
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
