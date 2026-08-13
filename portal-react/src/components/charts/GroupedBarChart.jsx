import { useRef, useState } from 'react';
import { useMeasuredSvg } from '../../lib/useMeasuredSvg';
import { fixed } from '../../lib/format';
import { CHART_DEFAULTS } from '../../data/constants';
import { DayAxes } from './Axes';
import { ChartTip, NO_TIP, placeTip } from './ChartTip';

/* l matches DailyBarChart's so the two side-by-side plots start on the same x */
const M = { l: 64, r: 16, t: 14, b: 34 };

const ALL_SERIES = [
  { key: 'actual', label: 'Actual', color: 'var(--green)' },
  { key: 'simulated', label: 'Simulated', color: 'var(--blue)' }
];

/**
 * Home · Plant KPI — what happened next to what the design model said, two bars
 * per day. Hovering a day reads every shown series at once, the same as the
 * power chart.
 *
 * @param {Object} props.data    DailyKpiData — see data/contract.js
 * @param {Set}    props.hidden  series keys switched off in the legend
 */
export function GroupedBarChart({ data, hidden, height }) {
  const SERIES = ALL_SERIES.filter(s => !(hidden && hidden.has(s.key)));
  const [wrapRef, { w, h }] = useMeasuredSvg({ ratio: 0.20, min: 140, max: 430, height });
  const svgRef = useRef(null);
  const [tip, setTip] = useState(NO_TIP);

  const cfg = CHART_DEFAULTS.kpi;
  const days = (data && data.daysInMonth) || 31;
  const yMax = (data && data.max) || cfg.max;
  const today = data && data.today;
  const unit = (data && data.unit) || '%';
  const metric = (data && data.metric) || 'CUF';
  const rows = (data && data.days) || [];
  const byDay = new Map(rows.map(r => [r.day, r]));

  const pw = w - M.l - M.r;
  const ph = h - M.t - M.b;
  const slot = pw / days;
  const Y = v => M.t + (1 - v / yMax) * ph;

  /* one series left? it takes the width of the pair, so the day still reads as
     a single column rather than a thin bar floating off-centre */
  const n = SERIES.length || 1;
  const bw = slot * (n === 1 ? 0.5 : 0.34);
  const gap = slot * 0.06;
  const group = bw * n + gap * (n - 1);

  function onMove(e) {
    if (!rows.length || !w) return;
    const r = svgRef.current.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * w;
    const vy = ((e.clientY - r.top) / r.height) * h;
    if (vx < M.l || vx > w - M.r || vy < M.t || vy > M.t + ph) { setTip(NO_TIP); return; }

    let d = Math.ceil((vx - M.l) / slot);
    d = Math.max(1, Math.min(days, d));
    const row = byDay.get(d) || {};
    const cx = M.l + (d - 0.5) * slot;
    if (!SERIES.length) { setTip(NO_TIP); return; }
    const top = Math.max(...SERIES.map(s => row[s.key] || 0), 0);
    setTip({
      show: true, day: d,
      title: `${d} ${(data && data.monthLabel) || ''}`.trim(),
      rows: SERIES.map(s => ({
        color: s.color, label: s.label,
        value: row[s.key] == null ? '—' : fixed(row[s.key], 1) + unit
      })),
      ...placeTip({ svgRect: r, wrapRect: wrapRef.current.getBoundingClientRect(),
                    xUnits: cx, yUnits: Y(top), w, h })
    });
  }

  return (
    <div className="chartwrap" ref={wrapRef}>
      {w > 0 && (
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
             onMouseMove={onMove} onMouseLeave={() => setTip(NO_TIP)}>
          <DayAxes w={w} h={h} m={M} yMax={yMax} yStep={cfg.step} days={days}
                   yLabel={`${metric} · ${unit}`}
                   monthLabel={(data && data.monthLabel) || ''} />

          {tip.show && (
            <rect fill="var(--hover-soft)" rx="3"
                  x={M.l + (tip.day - 1) * slot} y={M.t} width={slot} height={ph} />
          )}

          {Array.from({ length: days }, (_, k) => k + 1).map(d => {
            const row = byDay.get(d) || {};
            const x0 = M.l + (d - 0.5) * slot - group / 2;
            return SERIES.map((s, k) => {
              const v = row[s.key];
              const x = x0 + k * (bw + gap);
              if (v == null) {
                return <rect key={d + s.key} x={x} y={Y(0) - 3} width={bw} height="3"
                             rx="1.5" fill="var(--line-soft)" />;
              }
              return (
                <rect key={d + s.key} className="bar" x={x} y={Y(v)} width={bw}
                      height={Y(0) - Y(v)} rx="1.6" fill={s.color}
                      opacity={d === today ? 0.62 : 0.92} />
              );
            });
          })}
        </svg>
      )}
      {!rows.length && <div className="chart-empty">No data for this month</div>}
      <ChartTip tip={tip} />
    </div>
  );
}
