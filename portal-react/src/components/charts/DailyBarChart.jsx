import { useRef, useState } from 'react';
import { useMeasuredSvg } from '../../lib/useMeasuredSvg';
import { num } from '../../lib/format';
import { CHART_DEFAULTS } from '../../data/constants';
import { DayAxes } from './Axes';
import { ChartTip, NO_TIP, placeTip } from './ChartTip';

/* l matches GroupedBarChart's: the two cards sit side by side, so their plot
   areas have to start on the same x or the row reads as misaligned. 64 is what
   the widest label here ("14000") needs clear of the rotated axis title. */
const M = { l: 64, r: 16, t: 14, b: 34 };

/**
 * Home · Plant Energy Generation — one bar per day of the selected month.
 * A day with no reading yet keeps its slot as a stub, so the month reads as a
 * calendar rather than a truncated series.
 *
 * @param {Object} props.data  DailyEnergyData — see data/contract.js
 */
export function DailyBarChart({ data, height }) {
  const [wrapRef, { w, h }] = useMeasuredSvg({ ratio: 0.20, min: 140, max: 430, height });
  const svgRef = useRef(null);
  const [tip, setTip] = useState(NO_TIP);

  const cfg = CHART_DEFAULTS.energy;
  const days = (data && data.daysInMonth) || 31;
  const yMax = (data && data.max) || cfg.max;
  const today = data && data.today;
  const rows = (data && data.days) || [];
  const byDay = new Map(rows.map(r => [r.day, r.value]));

  const pw = w - M.l - M.r;
  const ph = h - M.t - M.b;
  const slot = pw / days;
  const Y = v => M.t + (1 - v / yMax) * ph;

  function onMove(e) {
    if (!rows.length || !w) return;
    const r = svgRef.current.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * w;
    const vy = ((e.clientY - r.top) / r.height) * h;
    if (vx < M.l || vx > w - M.r || vy < M.t || vy > M.t + ph) { setTip(NO_TIP); return; }

    let d = Math.ceil((vx - M.l) / slot);
    d = Math.max(1, Math.min(days, d));
    const v = byDay.has(d) ? byDay.get(d) : null;
    const cx = M.l + (d - 0.5) * slot;
    setTip({
      show: true, day: d,
      title: `${d} ${(data && data.monthLabel) || ''}`.trim(),
      rows: [{ color: 'var(--green)', label: 'Energy', value: v == null ? '—' : num(v, 0) + ' kWh' }],
      ...placeTip({ svgRect: r, wrapRect: wrapRef.current.getBoundingClientRect(),
                    xUnits: cx, yUnits: Y(v == null ? 0 : v), w, h })
    });
  }

  return (
    <div className="chartwrap" ref={wrapRef}>
      {w > 0 && (
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
             onMouseMove={onMove} onMouseLeave={() => setTip(NO_TIP)}>
          <DayAxes w={w} h={h} m={M} yMax={yMax} yStep={cfg.step} days={days}
                   yLabel="ENERGY · kWh" monthLabel={(data && data.monthLabel) || ''}
                   format={v => num(v, 0)} />

          {tip.show && (
            <rect fill="var(--hover-soft)" rx="3"
                  x={M.l + (tip.day - 1) * slot} y={M.t} width={slot} height={ph} />
          )}

          {Array.from({ length: days }, (_, k) => k + 1).map(d => {
            const v = byDay.has(d) ? byDay.get(d) : null;
            const x = M.l + (d - 0.5) * slot - slot * 0.34;
            const bw = slot * 0.68;
            if (v == null) {
              return <rect key={d} className="bar" x={x} y={Y(0) - 3} width={bw} height="3"
                           rx="1.5" fill="var(--line-soft)" />;
            }
            return (
              <rect key={d} className="bar" x={x} y={Y(v)} width={bw} height={Y(0) - Y(v)}
                    rx="2.5" fill="var(--green)" opacity={d === today ? 0.62 : 0.9} />
            );
          })}
        </svg>
      )}
      {!rows.length && <div className="chart-empty">No data for this month</div>}
      <ChartTip tip={tip} />
    </div>
  );
}
