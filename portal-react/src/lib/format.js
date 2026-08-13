/** Formatters. Every one is null-safe: absent data prints an em dash, never NaN. */

export const DASH = '—';

const pad = n => String(n).padStart(2, '0');
const has = v => v !== null && v !== undefined && v !== '' && (typeof v !== 'number' || isFinite(v));

/**
 * Ungrouped digits — 123456.78 — matching the portal's number format.
 *
 * These read-outs are set in a monospace face, where a thousands separator costs
 * a whole character cell and the number reads as two broken pieces. The three
 * names are kept because they mark intent at the call site (currency, metric,
 * plain), but they format identically.
 */
export function inr(v, decimals = 2) {
  return has(v) ? Number(v).toFixed(decimals) : DASH;
}

/** Same, variable precision. `num(1604.83)` → '1604.8'. */
export function num(v, decimals = 1) {
  return inr(v, decimals);
}

/** Plain fixed-decimal. */
export function fixed(v, decimals = 2) {
  return has(v) ? Number(v).toFixed(decimals) : DASH;
}

/** Decimal hours (12.5) → '12:30 PM'. */
export function fmtHours(t, withSeconds) {
  if (!has(t)) return DASH;
  const x = ((t % 24) + 24) % 24;
  const h = Math.floor(x);
  const m = Math.floor((x - h) * 60);
  const s = Math.floor((x * 3600) % 60);
  const ap = h < 12 ? 'AM' : 'PM';
  return (h % 12 || 12) + ':' + pad(m) + (withSeconds ? ':' + pad(s) : '') + ' ' + ap;
}

/** A Date → the top bar's clock string. */
export function fmtClock(date, withSeconds = true) {
  const h = date.getHours();
  return (h % 12 || 12) + ':' + pad(date.getMinutes()) +
         (withSeconds ? ':' + pad(date.getSeconds()) : '') + ' ' + (h < 12 ? 'AM' : 'PM');
}

/** Hour tick label — 0 → '12AM', 14 → '2PM'. */
export function axisHour(h) {
  const x = h % 24;
  return (x % 12 || 12) + (x < 12 ? 'AM' : 'PM');
}

/** ISO timestamp → decimal hours in the viewer's local zone. */
export function hoursFromISO(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

/** 'YYYY-MM-DD' → '20 JULY 2026', the label printed under an x-axis. */
export function fmtDateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '';
  const M = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
             'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
