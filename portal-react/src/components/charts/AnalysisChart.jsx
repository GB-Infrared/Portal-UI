import { useRef, useState } from 'react';
import { useMeasuredSvg } from '../../lib/useMeasuredSvg';
import { niceMax } from '../../lib/path';
import { fixed } from '../../lib/format';
import { ChartTip, NO_TIP, placeTip } from './ChartTip';

const M = { l: 64, t: 14, b: 42 };

/**
 * Analysis · any parameter against any other, over an arbitrary window.
 *
 * ONE plot with two scales — Y1 down the left, Y2 down the right — not two
 * stacked panels. The lines are drawn the way Monitoring draws its power curve:
 * same weight, same joins, and the same fill fading away underneath, so a curve
 * read on one page is read the same way on the other. Y2 is dashed, because on a
 * two-scale plot the axis a line belongs to is the one thing a reader cannot work
 * out from the picture.
 *
 * @param {Object} props.series  [{ id, axis: 1|2, param, unit, color, points:[{t,v}] }]
 *                               already filtered to pairs that EXIST — a device
 *                               is never handed a parameter it does not report
 * @param {{from:number,to:number}} props.window   epoch ms
 */
export function AnalysisChart({ series, window: win, dateLabel, y1Label, y2Label, note }) {
  const hasY2 = (series || []).some(s => s.axis === 2);
  /* the right gutter only exists when there is a second scale to print in it */
  const m = { ...M, r: hasY2 ? 58 : 20 };
  const [wrapRef, { w, h }] = useMeasuredSvg({ ratio: 0.26, min: 260, max: 620 });
  const svgRef = useRef(null);
  const [tip, setTip] = useState(NO_TIP);

  const list = series || [];
  const rowsExist = list.some(s => (s.points || []).some(p => p && p.v != null));

  const pw = w - m.l - m.r;
  const ph = h - m.t - m.b;
  const span = win && win.to > win.from ? win.to - win.from : 1;
  const X = t => m.l + ((t - win.from) / span) * pw;

  /* Each axis is cut to its own data: power in kW and irradiance in W/m² share a
     plot but never a scale, and forcing them onto one would flatten whichever is
     the smaller number into the baseline. */
  const extent = axis => {
    const vals = [];
    list.filter(s => s.axis === axis).forEach(s =>
      (s.points || []).forEach(p => { if (p && p.v != null && isFinite(p.v)) vals.push(p.v); }));
    if (!vals.length) return null;
    const lo = Math.min(...vals), hi = Math.max(...vals);
    /* a flat line needs a band, or it sits on the frame and reads as missing */
    if (hi === lo) return [lo - 1, hi + 1];
    return [Math.min(0, lo), niceMax(hi).max];
  };
  const e1 = extent(1);
  const e2 = hasY2 ? extent(2) : null;
  const yFor = e => v => m.t + (1 - (v - e[0]) / (e[1] - e[0])) * ph;

  const scaleTicks = (e, x, anchor, cls) => {
    if (!e) return null;
    const out = [];
    for (let i = 0; i <= 4; i++) {
      const v = e[1] - (e[1] - e[0]) * (i / 4);
      out.push(
        <text key={cls + i} className={'axt' + (cls ? ' ' + cls : '')} x={x}
              y={m.t + ph * (i / 4) + 3.5} textAnchor={anchor}>
          {fixed(v, Math.abs(v) >= 100 ? 0 : 1)}
        </text>
      );
    }
    return out;
  };

  /* time ticks: enough to place a reading, never so many they collide */
  const ticks = [];
  if (win && pw > 0) {
    const count = Math.max(2, Math.min(14, Math.floor(pw / 86)));
    for (let i = 0; i <= count; i++) ticks.push(win.from + (span * i) / count);
  }

  function onMove(e) {
    if (!rowsExist || !w) return;
    const r = svgRef.current.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * w;
    const vy = ((e.clientY - r.top) / r.height) * h;
    if (vx < m.l || vx > w - m.r || vy < m.t || vy > m.t + ph) { setTip(NO_TIP); return; }

    /* snap to a sampled instant: the value between two samples was never measured */
    const ref = (list.find(s => (s.points || []).length) || {}).points || [];
    if (!ref.length) { setTip(NO_TIP); return; }
    let i = Math.round(((vx - m.l) / pw) * (ref.length - 1));
    i = Math.max(0, Math.min(ref.length - 1, i));
    const at = ref[i].t;

    const rows = [];
    list.forEach(s => {
      const p = (s.points || [])[i];
      if (!p || p.v == null || !isFinite(p.v)) return;
      rows.push({ color: s.color, label: s.id + ' ' + s.param,
                  value: fixed(p.v, 2) + (s.unit ? ' ' + s.unit : '') });
    });
    if (!rows.length) { setTip(NO_TIP); return; }

    setTip({
      show: true, at, title: stampMs(at), rows,
      ...placeTip({ svgRect: r, wrapRect: wrapRef.current.getBoundingClientRect(),
                    xUnits: X(at), yUnits: m.t, w, h, width: 190 })
    });
  }

  return (
    <div className="chartwrap" ref={wrapRef}>
      {w > 0 && (
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
             onMouseMove={onMove} onMouseLeave={() => setTip(NO_TIP)}>
          <defs>
            {list.map(s => (
              <linearGradient key={'g' + s.id + s.axis} id={gradId(s)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity={s.axis === 1 ? '.26' : '.16'} />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {(e1 || e2) && [0, 1, 2, 3, 4].map(i => (
            <line key={'h' + i} className="gl" x1={m.l} y1={m.t + ph * (i / 4)}
                  x2={w - m.r} y2={m.t + ph * (i / 4)} />
          ))}
          {ticks.map((t, i) => (
            <g key={'t' + i}>
              <line className="gl v" x1={X(t)} y1={m.t} x2={X(t)} y2={m.t + ph} />
              <text className="axt" x={X(t)} y={h - 14} textAnchor="middle">{tickLabel(t, span)}</text>
            </g>
          ))}

          {/* Y1 labels END at the gutter and run leftward, or they would be
              printed across the plot they are labelling */}
          {scaleTicks(e1, m.l - 8, 'end', '')}
          {scaleTicks(e2, w - m.r + 8, 'start', 'amber')}

          {y1Label && e1 && (
            <text className="axt" transform={`translate(14,${m.t + ph / 2}) rotate(-90)`}
                  textAnchor="middle" style={{ letterSpacing: '.1em' }}>
              {'Y1 · ' + y1Label + ' · solid'}
            </text>
          )}
          {y2Label && e2 && (
            <text className="axt amber" transform={`translate(${w - 13},${m.t + ph / 2}) rotate(90)`}
                  textAnchor="middle" style={{ letterSpacing: '.1em' }}>
              {'Y2 · ' + y2Label + ' · dashed'}
            </text>
          )}
          {dateLabel && (
            <text className="axt" x={w / 2} y={h - 1} textAnchor="middle"
                  style={{ letterSpacing: '.08em' }}>{dateLabel}</text>
          )}

          {/* areas first, then every line, so no series' fill covers another's line */}
          {list.map(s => {
            const e = s.axis === 1 ? e1 : e2;
            if (!e) return null;
            return runs(s.points).map((run, k) => {
              const d = areaOf(run, X, yFor(e), m.t + ph);
              return d ? <path key={'a' + s.id + s.axis + k} d={d} fill={`url(#${gradId(s)})`} /> : null;
            });
          })}
          {list.map(s => {
            const e = s.axis === 1 ? e1 : e2;
            if (!e) return null;
            const d = lineOf(s.points, X, yFor(e));
            if (!d) return null;
            return (
              <path key={'l' + s.id + s.axis} d={d} fill="none" stroke={s.color} strokeWidth="2"
                    strokeLinejoin="round" strokeLinecap="round"
                    strokeDasharray={s.axis === 2 ? '6 4' : undefined}>
                <title>{s.id + ' ' + s.param}</title>
              </path>
            );
          })}

          {tip.show && (
            <line className="xhair" x1={X(tip.at)} y1={m.t} x2={X(tip.at)} y2={m.t + ph}
                  strokeWidth="1" opacity=".25" />
          )}
        </svg>
      )}
      {note && <div className="chart-empty">{note}</div>}
      <ChartTip tip={tip} />
    </div>
  );
}

const gradId = s => 'an-' + String(s.id).replace(/\W/g, '') + '-' + s.axis;

/**
 * A gap in the data is a GAP: the path is broken rather than bridged, so a device
 * that stopped reporting does not get a straight line drawn across the hours it
 * was silent — and the fill is broken with it, one closed shape per run of
 * readings rather than one shape over the hole.
 */
function runs(points) {
  const out = [];
  let run = null;
  (points || []).forEach(p => {
    if (!p || p.v == null || !isFinite(p.v)) { run = null; return; }
    if (!run) { run = []; out.push(run); }
    run.push(p);
  });
  return out;
}

function lineOf(points, X, Y) {
  return runs(points)
    .map(run => run.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' '))
    .join(' ')
    .trim();
}

function areaOf(run, X, Y, baseY) {
  if (!run || run.length < 2) return '';        /* a single point has no area */
  const first = run[0], last = run[run.length - 1];
  return run.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ') +
    ' L' + X(last.t).toFixed(1) + ' ' + baseY.toFixed(1) +
    ' L' + X(first.t).toFixed(1) + ' ' + baseY.toFixed(1) + ' Z';
}

const p2 = n => String(n).padStart(2, '0');

/* below a day, the clock is what places a reading; above it, the date is */
function tickLabel(ms, span) {
  const d = new Date(ms);
  if (span < 86400000) return p2(d.getHours()) + ':' + p2(d.getMinutes());
  return p2(d.getDate()) + '/' + p2(d.getMonth() + 1);
}

export function stampMs(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' +
         p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
}
