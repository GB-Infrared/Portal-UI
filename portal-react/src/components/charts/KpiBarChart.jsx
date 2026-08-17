import { useRef, useState } from 'react';
import { useMeasuredSvg } from '../../lib/useMeasuredSvg';
import { niceMax } from '../../lib/path';
import { fixed } from '../../lib/format';
import { CategoryAxes } from './Axes';
import { ChartTip, NO_TIP, placeTip } from './ChartTip';

/* The left gutter is wider than Monitoring's: this axis can carry a month's
   energy in kWh, which is seven digits, where a power axis is three. */
const M = { l: 64, r: 18, t: 14, b: 38 };

export const KPI_SERIES = [
  { key: 'actual', label: 'Actual', color: 'var(--green)' },
  { key: 'simulated', label: 'Simulated', color: 'var(--blue)' },
  { key: 'forecast', label: 'Forecast', color: 'var(--amber)' }
];

/**
 * KPI · one metric per bucket, measured against the model and — for buckets not
 * yet elapsed — against the forecast.
 *
 * Bars, not a line: a line implies you could read a value between two of its
 * points, and between one week and the next there is nothing to read. The value
 * IS the bucket.
 *
 * Height tracks width but stays in a band, the way Monitoring's does. The ratio
 * is lower than Monitoring's, though, because this page has no side rail: the
 * card is the full width of the screen, and the same ratio buys a plot half a
 * screen tall. A month is at most 31 bars — the height only has to separate
 * them, not fill the window.
 *
 * @param {Object} props.data    KpiData — see data/contract.js
 * @param {Set}    props.hidden  series keys switched off in the legend
 */
export function KpiBarChart({ data, hidden }) {
  const SERIES = KPI_SERIES.filter(s => !(hidden && hidden.has(s.key)));
  const [wrapRef, { w, h }] = useMeasuredSvg({ ratio: 0.20, min: 215, max: 330 });
  const svgRef = useRef(null);
  const [tip, setTip] = useState(NO_TIP);

  const buckets = (data && data.buckets) || [];
  const unit = (data && data.unit) || '';
  const dec = data && data.decimals != null ? data.decimals : 1;

  /* Every value on show, across every series that is still on — the axis is cut
     to the data rather than pinned, which is what keeps a PR chart that lives
     between 79% and 83% readable instead of a row of near-identical stubs. */
  const values = [];
  buckets.forEach(b => SERIES.forEach(s => {
    const v = b[s.key];
    if (v != null && isFinite(v)) values.push(v);
  }));
  const scale = values.length ? niceMax(Math.max(...values)) : null;
  const yMax = (data && data.max) || (scale ? scale.max : 1);
  const yStep = yMax / 5;

  const pw = w - M.l - M.r;
  const ph = h - M.t - M.b;
  const n = Math.max(1, buckets.length);
  const slot = pw / n;
  const Y = v => M.t + (1 - v / yMax) * ph;
  /* capped: five weekly buckets across a 1700px card would otherwise be 300px
     slabs, and past ~24px a bar carries no more information, only more ink */
  const bw = Math.max(3, Math.min(24, (slot - 6) / Math.max(1, SERIES.length)));

  function onMove(e) {
    if (!buckets.length || !w) return;
    const r = svgRef.current.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * w;
    const vy = ((e.clientY - r.top) / r.height) * h;
    if (vx < M.l || vx > w - M.r || vy < M.t || vy > M.t + ph) { setTip(NO_TIP); return; }

    let i = Math.floor((vx - M.l) / slot);
    i = Math.max(0, Math.min(buckets.length - 1, i));
    const b = buckets[i];
    const rows = SERIES
      .filter(s => b[s.key] != null && isFinite(b[s.key]))
      .map(s => ({ color: s.color, label: s.label,
                   value: fixed(b[s.key], dec) + (unit ? ' ' + unit : '') }));
    if (!rows.length) { setTip(NO_TIP); return; }

    /* the tip sits above the tallest bar in the slot, not above the plot */
    const top = Math.max(0, ...SERIES.map(s => (b[s.key] == null ? 0 : b[s.key])));
    setTip({
      show: true, slot: i,
      /* a half-elapsed bucket says so, rather than looking like a bad week */
      title: (b.stamp || b.label || '') + (b.partial ? ' · in progress' : ''),
      rows,
      ...placeTip({ svgRect: r, wrapRect: wrapRef.current.getBoundingClientRect(),
                    xUnits: M.l + (i + 0.5) * slot, yUnits: Y(top), w, h })
    });
  }

  return (
    <div className="chartwrap" ref={wrapRef}>
      {w > 0 && (
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
             onMouseMove={onMove} onMouseLeave={() => setTip(NO_TIP)}>
          <CategoryAxes w={w} h={h} m={M} yMax={yMax} yStep={yStep}
                        categories={buckets.map(b => b.label || '')}
                        /* the axis names what it measures and in what: PR read as
                           0.79 against PR read as 79% is exactly the confusion
                           worth ten pixels of label */
                        yLabel={((data && data.label) || '').toUpperCase() +
                                (unit ? ' · ' + unit : '')}
                        dateLabel={(data && data.periodLabel) || ''}
                        format={v => fixed(v, v >= 1000 ? 0 : dec)} />

          {tip.show && (
            <rect fill="var(--hover-soft)" rx="3"
                  x={M.l + tip.slot * slot} y={M.t} width={slot} height={ph} />
          )}

          {buckets.map((b, i) => SERIES.map((s, k) => {
            const v = b[s.key];
            if (v == null || !isFinite(v)) return null;
            const x = M.l + slot * i + (slot - bw * SERIES.length) / 2 + bw * k;
            return (
              <rect key={String(b.key) + s.key} className="bar" x={x} y={Y(v)}
                    width={bw} height={Math.max(1, M.t + ph - Y(v))} rx="2" fill={s.color}
                    /* a forecast is drawn lighter than a measurement: one of
                       these happened and the other has not */
                    opacity={s.key === 'forecast' ? 0.55 : 0.92} />
            );
          }))}
        </svg>
      )}
      {!buckets.length && <div className="chart-empty">No data for this period</div>}
      {buckets.length > 0 && !values.length &&
        <div className="chart-empty">Nothing to plot for this metric</div>}
      <ChartTip tip={tip} />
    </div>
  );
}
