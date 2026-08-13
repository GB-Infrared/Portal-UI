import { useRef, useState } from 'react';
import { useMeasuredSvg } from '../../lib/useMeasuredSvg';
import { linePath, areaPath, nearestIndex, peakAt } from '../../lib/path';
import { fmtHours, fixed } from '../../lib/format';
import { CHART_DEFAULTS, PLOT_COLORS } from '../../data/constants';
import { TimeAxes, CategoryAxes } from './Axes';
import { ChartTip, NO_TIP, placeTip } from './ChartTip';

const M = { l: 46, r: 16, t: 14, b: 34 };

/**
 * Monitoring · Active Power.
 *
 * @param {Object}   props
 * @param {Object}   props.data      LineChartData — see data/contract.js
 * @param {string}   props.unit      axis unit, follows the selected data point
 * @param {Set}      props.hidden    series ids toggled off in the legend
 * @param {Object}   props.rowRef    the .main row, so the plot height does not
 *                                   shrink when the detail panel opens beside it
 * @param {'line'|'bar'} [props.kind] fallback when the data does not say. Week
 *                                   and Month are BARS: a line implies you can
 *                                   read a value between its points, and between
 *                                   two days there is nothing to read — the value
 *                                   IS the day. Day stays a line because a power
 *                                   curve genuinely is continuous.
 */
export function DevicePowerChart({ data, unit = 'kW', hidden, rowRef, kind }) {
  const [wrapRef, { w, h }] = useMeasuredSvg({ ratio: 0.235, min: 240, max: 430, basisRef: rowRef });
  const svgRef = useRef(null);
  const [tip, setTip] = useState(NO_TIP);

  const cfg = CHART_DEFAULTS.devicePower;
  const yMax = (data && data.max) || cfg.max;
  const pw = w - M.l - M.r;
  const ph = h - M.t - M.b;
  const X = t => M.l + (t / 24) * pw;
  const Y = v => M.t + (1 - v / yMax) * ph;

  const all = (data && data.series) || [];
  const shown = all.filter(s => !hidden || !hidden.has(s.id));
  const colorOf = s => s.color || PLOT_COLORS[all.indexOf(s) % PLOT_COLORS.length];
  const bars = ((data && data.kind) || kind) === 'bar';
  /* no trailing separator when the unit is not known yet - "ACTIVE POWER · "
     reads as a missing word rather than as an absent unit */
  const yLabel = 'ACTIVE POWER' + (unit ? ' · ' + unit : '');
  const cats = (data && data.categories) || [];
  const n = Math.max(1, cats.length || (shown[0] && shown[0].points ? shown[0].points.length : 1));
  /* bars sit IN a slot: the label goes under the middle, the gridline on the
     edge - a line through a column reads as dividing that column rather than
     separating two days */
  const slot = pw / n;
  const XB = i => M.l + (i + 0.5) * slot;
  /* Two bars share a day's slot; one series alone takes the pair's width so the
     day still reads as a column rather than a sliver off to one side. The width
     is CAPPED: a week is seven slots across the plot a month puts thirty-one in,
     so a pure fraction gave the week 50px slabs. Past ~26px a bar carries no
     more information, only more ink. */
  const live = shown.length || 1;
  const bw = Math.min(26, slot * (live < 2 ? 0.52 : 0.30));
  const gap = Math.min(6, slot * 0.06);
  const group = bw * live + gap * Math.max(0, live - 1);
  /* the now-marker, the fill and the annotations all belong to one day's curve,
     so they are put away here rather than left pointing at nothing */
  const now = bars ? null : (data && data.now);

  function onMove(e) {
    if (!shown.length || !w) return;
    const r = svgRef.current.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * w;
    const vy = ((e.clientY - r.top) / r.height) * h;
    /* only the plotted rectangle is hoverable — not the axis gutters or the
       margins above and below it, so the tip cannot linger outside the plot */
    if (vx < M.l || vx > w - M.r || vy < M.t || vy > M.t + ph) { setTip(NO_TIP); return; }

    /* week and month read a DAY, not an instant - snap to the slot under the
       pointer rather than the nearest sample */
    let i, xUnits, title;
    if (bars) {
      i = Math.max(0, Math.min(n - 1, Math.floor((vx - M.l) / slot)));
      xUnits = XB(i);
      title = (cats[i] != null ? cats[i] : i + 1) + ' · peak';
    } else {
      const t = ((vx - M.l) / pw) * 24;
      const ref = shown[0].points || [];
      i = nearestIndex(ref, t);
      if (i < 0) { setTip(NO_TIP); return; }
      xUnits = X(ref[i].t);
      title = fmtHours(ref[i].t);
    }
    const pos = placeTip({
      svgRect: r, wrapRect: wrapRef.current.getBoundingClientRect(),
      xUnits, yUnits: Y(peakAt(shown, i)), w, h, width: 156, lift: 14
    });
    setTip({
      show: true, ...pos, at: i, title,
      rows: shown.map(s => ({
        color: colorOf(s),
        label: s.id,
        value: s.points[i] && s.points[i].v != null ? fixed(s.points[i].v, 1) + ' ' + unit : '—'
      }))
    });
  }

  return (
    <div className="chartwrap" ref={wrapRef}>
      {w > 0 && (
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
             onMouseMove={onMove} onMouseLeave={() => setTip(NO_TIP)}>
          <defs>
            {all.map((s, i) => (
              <linearGradient key={s.id} id={`dp-g-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colorOf(s)} stopOpacity=".32" />
                <stop offset="1" stopColor={colorOf(s)} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {bars
            ? <CategoryAxes w={w} h={h} m={M} yMax={yMax} yStep={cfg.step}
                            yLabel={yLabel}
                            dateLabel={(data && data.dateLabel) || ''}
                            categories={cats.length ? cats : Array.from({ length: n }, (_, i) => i + 1)} />
            : <TimeAxes w={w} h={h} m={M} yMax={yMax} yStep={cfg.step}
                        yLabel={yLabel}
                        dateLabel={(data && data.dateLabel) || ''} />}

          {bars
            ? Array.from({ length: n }, (_, i) => {
                const x0 = XB(i) - group / 2;
                return shown.map((s, k) => {
                  const p = s.points && s.points[i];
                  if (!p || p.v == null) return null;
                  return (
                    <rect key={s.id + i} className="bar" x={x0 + k * (bw + gap)} y={Y(p.v)}
                          width={bw} height={Math.max(0, Y(0) - Y(p.v))} rx="2"
                          fill={colorOf(s)} opacity=".9" />
                  );
                });
              })
            : (
              <>
                {shown.map(s => (
                  <path key={'a' + s.id} d={areaPath(s.points, X, Y, Y(0))}
                        fill={`url(#dp-g-${all.indexOf(s)})`} />
                ))}
                {shown.map(s => (
                  <path key={'l' + s.id} d={linePath(s.points, X, Y)} fill="none"
                        stroke={colorOf(s)} strokeWidth="2"
                        strokeLinejoin="round" strokeLinecap="round" />
                ))}
              </>
            )}

          {/* an annotation belongs to its series — it has nothing to say once
              that line is switched off, so it goes with it */}
          {(bars ? [] : ((data && data.annotations) || []))
            .filter(a => !a.seriesId || !(hidden && hidden.has(a.seriesId)))
            .map((a, i) => (
              <g key={i} className="annot" transform={`translate(${X(a.t)} ${Y(a.v) - 13})`}>
                <path d="M-5 -8 L5 -8 L0 0 Z" />
                {a.label && <title>{a.label}</title>}
              </g>
            ))}

          {now != null && (
            <>
              <line x1={X(now)} y1={M.t} x2={X(now)} y2={M.t + ph}
                    strokeWidth="1" strokeDasharray="3 4" opacity=".55" className="nowline" />
              <g transform={`translate(${X(now) > w - M.r - 72 ? X(now) - 66 : X(now) + 7} ${M.t + 3})`}
                 className="nowtag">
                <rect x="0" y="0" width="58" height="17" rx="4" />
                <text x="29" y="12" textAnchor="middle" fontSize="10"
                      fontFamily="ui-monospace,monospace" fontWeight="700">{fmtHours(now)}</text>
              </g>
              {shown.map(s => {
                const i = nearestIndex(s.points || [], now);
                const p = i >= 0 ? s.points[i] : null;
                if (!p || p.v == null) return null;
                return (
                  <g key={'d' + s.id} transform={`translate(${X(now)} ${Y(p.v)})`}>
                    <circle className="pulse" r="5" opacity=".6" fill={colorOf(s)} />
                    <circle r="3.6" strokeWidth="1.4" fill={colorOf(s)} stroke="var(--panel)" />
                  </g>
                );
              })}
            </>
          )}

          {/* crosshair sits on the sample the tip is reading */}
          {tip.show && (
            <line className="xhair" x1={bars ? XB(tip.at) : X(tip.at)} y1={M.t}
                  x2={bars ? XB(tip.at) : X(tip.at)} y2={M.t + ph} strokeWidth="1" opacity=".25" />
          )}
        </svg>
      )}
      {!shown.length && <div className="chart-empty">No series</div>}
      <ChartTip tip={tip} />
    </div>
  );
}
