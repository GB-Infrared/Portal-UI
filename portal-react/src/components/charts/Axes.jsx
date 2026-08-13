import { axisHour } from '../../lib/format';

/**
 * Axes are design, not data — they are drawn whether or not a series has
 * arrived, so an unconnected page still reads as a chart rather than a hole.
 * Everything uses the .gl / .axt classes from the stylesheet, so the grid
 * re-themes with the tokens and needs no per-chart colour work.
 */

/**
 * Hour x-axis with a linear y-axis, and an optional second axis on the right.
 *
 * The frame spans `t0`..`t1`, midnight to midnight by default. The home power
 * chart narrows it to the daylight window; monitoring keeps the full day.
 * `tickFrom`/`tickTo` let a trimmed frame start its labels one hour inside the
 * edge, so no label sits on the boundary.
 */
export function TimeAxes({
  w, h, m, yMax, yStep, yLabel, dateLabel,
  rightMax, rightStep, rightLabel, hourStep,
  t0 = 0, t1 = 24, tickFrom, tickTo
}) {
  const pw = w - m.l - m.r;
  const ph = h - m.t - m.b;
  const span = t1 - t0;
  const Y = v => m.t + (1 - v / yMax) * ph;
  const X = t => m.l + ((t - t0) / span) * pw;
  /* thin the hour labels when the plot is narrow, so they never collide */
  const step = hourStep || (pw < 560 ? 6 : pw < 820 ? 4 : 2);

  const rows = [];
  for (let v = 0; v <= yMax; v += yStep) rows.push(v);
  const cols = [];
  const from = tickFrom != null ? tickFrom : t0;
  const to = tickTo != null ? tickTo : t1;
  for (let hh = from; hh <= to; hh += step) cols.push(hh);
  const right = [];
  if (rightMax) for (let v = 0; v <= rightMax; v += rightStep) right.push(v);

  return (
    <g>
      {rows.map(v => (
        <g key={'y' + v}>
          <line className="gl" x1={m.l} y1={Y(v)} x2={w - m.r} y2={Y(v)} />
          <text className="axt" x={m.l - 8} y={Y(v) + 3.5} textAnchor="end">{v}</text>
        </g>
      ))}
      {right.map(v => (
        <text key={'r' + v} className="axt amber" x={w - m.r + 8}
              y={m.t + (1 - v / rightMax) * ph + 3.5} textAnchor="start">{v}</text>
      ))}
      {cols.map(hh => (
        <g key={'x' + hh}>
          <line className="gl v" x1={X(hh)} y1={m.t} x2={X(hh)} y2={m.t + ph} />
          <text className="axt" x={X(hh)} y={h - 13} textAnchor="middle">{axisHour(hh)}</text>
        </g>
      ))}
      {yLabel && (
        <text className="axt" transform={`translate(11,${m.t + ph / 2}) rotate(-90)`}
              textAnchor="middle" style={{ letterSpacing: '.14em' }}>{yLabel}</text>
      )}
      {rightLabel && (
        <text className="axt amber" transform={`translate(${w - 11},${m.t + ph / 2}) rotate(90)`}
              textAnchor="middle" style={{ letterSpacing: '.13em' }}>{rightLabel}</text>
      )}
      {dateLabel && (
        <text className="axt" x={w / 2} y={h - 1} textAnchor="middle"
              style={{ letterSpacing: '.08em' }}>{dateLabel}</text>
      )}
    </g>
  );
}

/** Day-of-month x-axis (1…31) with a linear y-axis, for the two bar charts. */
export function DayAxes({ w, h, m, yMax, yStep, days, yLabel, monthLabel, format = String }) {
  const pw = w - m.l - m.r;
  const ph = h - m.t - m.b;
  const slot = pw / days;
  const Y = v => m.t + (1 - v / yMax) * ph;

  const rows = [];
  for (let v = 0; v <= yMax; v += yStep) rows.push(v);
  /* Gridlines stay sparse; DATES are written as densely as the slot allows.
     They were tied together on a fixed every-other-day rule, so half the month
     had no date under it - you could not point at the 27th because the 27th was
     not written. A label needs about 13px; below that the month is thinned, and
     the 1st and the last day are always named so the span is unambiguous. */
  const gStep = pw < 560 ? 4 : 2;
  const lStep = slot >= 13 ? 1 : (slot >= 8.5 ? 2 : 4);
  const grid = [], ticks = [];
  for (let d = 1; d <= days; d++) {
    if (d === 1 || d % gStep === 0) grid.push(d);
    if (d === 1 || d === days || d % lStep === 0) ticks.push(d);
  }

  return (
    <g>
      {rows.map(v => (
        <g key={'y' + v}>
          <line className="gl" x1={m.l} y1={Y(v)} x2={w - m.r} y2={Y(v)} />
          <text className="axt" x={m.l - 8} y={Y(v) + 3.5} textAnchor="end">{format(v)}</text>
        </g>
      ))}
      {/* the plot is ruled vertically as well - without it the bars float in an
          empty field, where the time chart on either page has a grid behind it */}
      {grid.map(d => (
        <line key={'g' + d} className="gl v" x1={m.l + (d - 0.5) * slot} y1={m.t}
              x2={m.l + (d - 0.5) * slot} y2={m.t + ph} />
      ))}
      {ticks.map(d => (
        <g key={'d' + d}>
          <text className="axt" x={m.l + (d - 0.5) * slot} y={h - 16}
                textAnchor="middle" fontSize="9.5">{d}</text>
        </g>
      ))}
      {yLabel && (
        <text className="axt" transform={`translate(15,${m.t + ph / 2}) rotate(-90)`}
              textAnchor="middle" style={{ letterSpacing: '.13em' }}>{yLabel}</text>
      )}
      {monthLabel && (
        <text className="axt" x={w / 2} y={h - 2} textAnchor="middle"
              style={{ letterSpacing: '.08em' }}>{monthLabel}</text>
      )}
    </g>
  );
}

/**
 * A CATEGORY x-axis: one slot per entry, label under the middle, gridline on the
 * edge. A line through a column reads as dividing that column rather than as the
 * boundary between two of them, which is why bar mode cannot reuse TimeAxes.
 *
 * Labels thin when the slots get tight; the first and last are always written so
 * the span is unambiguous.
 */
export function CategoryAxes({ w, h, m, yMax, yStep, yLabel, dateLabel, categories, format = String }) {
  const pw = w - m.l - m.r;
  const ph = h - m.t - m.b;
  const n = Math.max(1, categories.length);
  const slot = pw / n;
  const Y = v => m.t + (1 - v / yMax) * ph;

  const rows = [];
  for (let v = 0; v <= yMax; v += yStep) rows.push(v);
  const step = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 22))));

  return (
    <g>
      {rows.map(v => (
        <g key={'y' + v}>
          <line className="gl" x1={m.l} y1={Y(v)} x2={w - m.r} y2={Y(v)} />
          <text className="axt" x={m.l - 8} y={Y(v) + 3.5} textAnchor="end">{format(v)}</text>
        </g>
      ))}
      {categories.map((c, i) => (
        <line key={'g' + i} className="gl v" x1={m.l + i * slot} y1={m.t}
              x2={m.l + i * slot} y2={m.t + ph} />
      ))}
      <line className="gl v" x1={m.l + pw} y1={m.t} x2={m.l + pw} y2={m.t + ph} />
      {categories.map((c, i) => (
        (i === 0 || i === n - 1 || i % step === 0)
          ? <text key={'t' + i} className="axt" x={m.l + (i + 0.5) * slot} y={h - 13}
                  textAnchor="middle">{c}</text>
          : null
      ))}
      {dateLabel && (
        <text className="axt" x={w / 2} y={h - 1} textAnchor="middle"
              style={{ letterSpacing: '.08em' }}>{dateLabel}</text>
      )}
      <text className="axt" transform={`translate(11,${m.t + ph / 2}) rotate(-90)`}
            textAnchor="middle" style={{ letterSpacing: '.14em' }}>{yLabel}</text>
    </g>
  );
}
