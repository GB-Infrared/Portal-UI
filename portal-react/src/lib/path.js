/** SVG path builders. `null` values break the line rather than dropping to zero. */

/** @param {{t:number,v:number|null}[]} points */
export function linePath(points, X, Y) {
  let d = '';
  let open = false;
  for (const p of points) {
    if (p == null || p.v == null || !isFinite(p.v)) { open = false; continue; }
    d += (open ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1) + ' ';
    open = true;
  }
  return d.trim();
}

/** Same line, closed down to the baseline so it can carry a gradient fill. */
export function areaPath(points, X, Y, baseY) {
  const solid = points.filter(p => p && p.v != null && isFinite(p.v));
  if (solid.length < 2) return '';
  const first = solid[0], last = solid[solid.length - 1];
  return linePath(solid, X, Y) +
         ' L' + X(last.t).toFixed(1) + ' ' + baseY.toFixed(1) +
         ' L' + X(first.t).toFixed(1) + ' ' + baseY.toFixed(1) + ' Z';
}

/** Index of the point nearest a time, for hover read-out. */
export function nearestIndex(points, t) {
  if (!points || !points.length) return -1;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = Math.abs(points[i].t - t);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/**
 * An axis top cut to the data rather than pinned to a constant, so the curve
 * fills the plot and its shape can be read against whatever it is drawn beside.
 * Returns a round top and a round step, with headroom so the peak never sits
 * on the frame.
 */
export function niceMax(peak) {
  const p = Math.max(1, peak) * 1.08;
  const steps = [10, 20, 25, 50, 100, 150, 200, 250, 500, 1000, 2000];
  for (const s of steps) {
    const n = Math.ceil(p / s);
    if (n <= 5) return { max: s * n, step: s };   // at most 5 bands, so it stays readable
  }
  return { max: Math.ceil(p / 2000) * 2000, step: 2000 };
}

/** Highest value across a set of series — what niceMax() is measured against. */
export function seriesPeak(list) {
  let m = 0;
  for (const s of list || []) {
    for (const p of s.points || []) {
      if (p && p.v != null && p.v > m) m = p.v;
    }
  }
  return m;
}

/** Largest value across several series at one index — used to sit a tip above the data. */
export function peakAt(seriesList, index) {
  let max = 0;
  for (const s of seriesList) {
    const p = s.points && s.points[index];
    if (p && p.v != null && p.v > max) max = p.v;
  }
  return max;
}
