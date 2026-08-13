import { useRef, useState } from 'react';
import { useMeasuredSvg } from '../../lib/useMeasuredSvg';
import { linePath, areaPath, nearestIndex, niceMax, seriesPeak } from '../../lib/path';
import { fmtHours, fixed } from '../../lib/format';
import { CHART_DEFAULTS, PLOT_COLORS, DAY_WINDOW } from '../../data/constants';
import { TimeAxes } from './Axes';
import { ChartTip, NO_TIP, placeTip } from './ChartTip';

/* Monitoring's margins; the right inset stays wide because this chart carries a
   second axis for irradiance, which that one does not. */
const M = { l: 46, r: 58, t: 14, b: 34 };

/** Offline devices are drawn flat and dimmed, so the whole fleet is still represented. */
/* Identity, not status. Every healthy inverter used to come out the same green,
   which makes a multi-select chart unreadable; the hue now says WHICH inverter,
   and the rail card says how it is doing. A muted (offline) series still reads
   dead, because a flat line at zero should not claim a colour.
   Keyed off the FULL fleet, never the visible subset - indexing the survivors
   would re-colour every remaining line each time one was switched off. */
function deviceColors(all) {
  const m = new Map();
  (all || []).forEach((s, i) => {
    m.set(s.id, s.color || (s.muted ? 'var(--dim)' : PLOT_COLORS[i % PLOT_COLORS.length]));
  });
  return m;
}

/**
 * Home · Plant power vs irradiance, with the per-inverter view behind the title
 * toggle. Irradiance rides its own axis on the right in both views.
 *
 * @param {Object} props.data  PowerIrradianceData — see data/contract.js
 * @param {'plant'|'inverter'} props.mode
 * @param {Set}    props.hidden  keys switched off in the legend: 'power',
 *                               'irradiance', or a device id
 */
export function PowerIrradianceChart({ data, mode = 'plant', hidden, height }) {
  const [wrapRef, { w, h }] = useMeasuredSvg({ ratio: 0.19, min: 150, max: 360, height });
  const svgRef = useRef(null);
  const [tip, setTip] = useState(NO_TIP);
  const isOff = k => !!(hidden && hidden.has(k));

  const irrCfg = CHART_DEFAULTS.irradiance;
  const cfg = mode === 'plant' ? CHART_DEFAULTS.plantPower : CHART_DEFAULTS.invertePower;

  const plant = (data && data.plant) || [];
  const devices = (data && data.devices) || [];
  const irradiance = (data && data.irradiance) || [];
  const showIrr = !isOff('irradiance');
  const now = data && data.now;

  /* only what is actually on show holds the axis open */
  const visible = mode === 'plant'
    ? (isOff('power') ? [] : plant)
    : devices.filter(d => !isOff(d.id));

  /* The axis is cut to the day's own peak rather than pinned to a constant, so
     the curve fills the plot and can be read against irradiance. Both views use
     this same rule — that is what keeps them comparable. A backend may override
     it with an explicit `max`. */
  const peak = seriesPeak(visible);
  const scale = peak > 0 ? niceMax(peak) : { max: cfg.max, step: cfg.step };
  const yMax = (data && data.max) || scale.max;
  const yStep = (data && data.max) ? Math.max(1, Math.round(data.max / 5)) : scale.step;

  /* the frame is the daylight window, not the whole day — see DAY_WINDOW */
  const win = (data && data.window) || DAY_WINDOW;
  const span = win.to - win.from;

  const pw = w - M.l - M.r;
  const ph = h - M.t - M.b;
  const X = t => M.l + ((t - win.from) / span) * pw;
  const Y = v => M.t + (1 - v / yMax) * ph;
  const Yi = v => M.t + (1 - v / irrCfg.max) * ph;

  const series = mode === 'plant' ? plant : devices;
  const colorOf = deviceColors(devices);
  const hasAnything = series.length > 0 || irradiance.length > 0;

  function onMove(e) {
    if (!hasAnything || !w) return;
    const r = svgRef.current.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * w;
    const vy = ((e.clientY - r.top) / r.height) * h;
    if (vx < M.l || vx > w - M.r || vy < M.t || vy > M.t + ph) { setTip(NO_TIP); return; }

    const t = win.from + ((vx - M.l) / pw) * span;
    const ref = (series[0] && series[0].points) || irradiance;
    const i = nearestIndex(ref, t);
    if (i < 0) { setTip(NO_TIP); return; }
    const at = ref[i].t;

    /* the read-out follows the switches: a hidden series is not listed */
    const rows = [];
    for (const s of visible) {
      const p = s.points && s.points[i];
      rows.push({
        color: mode === 'plant' ? 'var(--green)' : colorOf.get(s.id),
        label: mode === 'plant' ? 'Power' : s.id,
        value: p && p.v != null ? fixed(p.v, 1) + ' kW' : '—'
      });
    }
    const ir = showIrr ? irradiance[i] : null;
    if (showIrr) {
      rows.push({ color: 'var(--amber)', label: 'Irradiance',
                  value: ir && ir.v != null ? Math.round(ir.v) + ' W/m²' : '—' });
    }
    if (!rows.length) { setTip(NO_TIP); return; }

    const top = ir && ir.v != null ? Yi(ir.v) : Y(yMax);
    setTip({
      show: true, at, title: fmtHours(at), rows,
      ...placeTip({ svgRect: r, wrapRect: wrapRef.current.getBoundingClientRect(),
                    xUnits: X(at), yUnits: top, w, h })
    });
  }

  return (
    <div className="chartwrap" ref={wrapRef}>
      {w > 0 && (
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
             onMouseMove={onMove} onMouseLeave={() => setTip(NO_TIP)}>
          <defs>
            <linearGradient id="gpw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--green)" stopOpacity=".34" />
              <stop offset="1" stopColor="var(--green)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gpwb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--blue)" stopOpacity=".30" />
              <stop offset="1" stopColor="var(--blue)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <TimeAxes w={w} h={h} m={M} yMax={yMax} yStep={yStep}
                    rightMax={irrCfg.max} rightStep={irrCfg.step}
                    yLabel="ACTIVE POWER · kW" rightLabel="IRRADIANCE · W/m²"
                    dateLabel={(data && data.dateLabel) || ''}
                    t0={win.from} t1={win.to}
                    tickFrom={win.from + 1} tickTo={win.to - 1}
                    hourStep={pw < 560 ? 4 : 2} />

          {mode === 'plant' && !isOff('power') && plant[0] && (
            <>
              <path d={areaPath(plant[0].points, X, Y, Y(0))} fill="url(#gpw)" />
              <path d={linePath(plant[0].points, X, Y)} fill="none" stroke="var(--green)"
                    strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}

          {/* areas first, then lines, so no device's fill covers another's line */}
          {mode === 'inverter' && visible.filter(s => !s.muted).map(s => (
            <path key={'a' + s.id} d={areaPath(s.points, X, Y, Y(0))}
                  fill={s.warn ? 'url(#gpwb)' : 'url(#gpw)'} />
          ))}
          {mode === 'inverter' && visible.map(s => (
            <path key={'l' + s.id} d={linePath(s.points, X, Y)} fill="none"
                  stroke={colorOf.get(s.id)} strokeWidth={s.muted ? 1.3 : 2}
                  strokeLinejoin="round" strokeLinecap="round" opacity={s.muted ? 0.55 : 1}>
              <title>{s.id}</title>
            </path>
          ))}

          {showIrr && irradiance.length > 0 && (
            <path d={linePath(irradiance, X, Yi)} fill="none" stroke="var(--amber)"
                  strokeWidth="1.8" strokeLinejoin="round" strokeDasharray="5 3" opacity=".85" />
          )}

          {now != null && (
            <line x1={X(now)} y1={M.t} x2={X(now)} y2={M.t + ph} className="nowline"
                  strokeWidth="1" strokeDasharray="3 4" opacity=".55" />
          )}
          {now != null && mode === 'plant' && !isOff('power') && plant[0] && (() => {
            const i = nearestIndex(plant[0].points, now);
            const p = i >= 0 ? plant[0].points[i] : null;
            if (!p || p.v == null) return null;
            return (
              <g transform={`translate(${X(now)} ${Y(p.v)})`}>
                <circle className="pulse" r="5" opacity=".6" fill="var(--green)" />
                <circle r="3.6" strokeWidth="1.4" fill="var(--green)" stroke="var(--panel)" />
              </g>
            );
          })()}

          {tip.show && (
            <line className="xhair" x1={X(tip.at)} y1={M.t} x2={X(tip.at)} y2={M.t + ph}
                  strokeWidth="1" opacity=".25" />
          )}
        </svg>
      )}
      {!hasAnything && <div className="chart-empty">No series</div>}
      <ChartTip tip={tip} />
    </div>
  );
}
