/**
 * Which device is paired with which parameter — the one decision the chart, the
 * legend, the table and the CSV all read, so they cannot disagree.
 *
 * A device is only ever paired with a parameter it REPORTS. An inverter has no
 * irradiance channel and a weather station has no power factor, so 'INV06 POA' is
 * not a series that happens to be switched off; it is not a series. Listing it
 * greyed out was meant to be honest about the gap, but it reads as a channel that
 * is merely offline — and with two categories chosen, the strip fills with those
 * phantom pairs faster than with the real ones. A device that reports neither
 * parameter drops out entirely rather than contributing a column of dashes.
 *
 * `reports` absent means the backend has not said, and the honest reading of
 * silence is "everything is possible" — the pairs are then all of them.
 *
 * @param {Object} o
 * @param {string[]} o.devices        the devices chosen in the bar
 * @param {Object<string,string[]>} [o.reports]
 * @param {{value:string,unit?:string}|null} o.y1
 * @param {{value:string,unit?:string}|null} o.y2
 * @returns {Array<{id:string,cells:Array<{axis:1|2,param:string,unit:string}>}>}
 */
export function devicePairs({ devices, reports, y1, y2 }) {
  const knows = (id, param) => {
    if (!param) return false;
    if (!reports) return true;
    const list = reports[id];
    return !list || list.indexOf(param) >= 0;
  };
  const out = [];
  (devices || []).forEach(id => {
    const cells = [];
    if (y1 && knows(id, y1.value)) cells.push({ axis: 1, param: y1.value, unit: y1.unit || '' });
    if (y2 && knows(id, y2.value)) cells.push({ axis: 2, param: y2.value, unit: y2.unit || '' });
    if (cells.length) out.push({ id, cells });
  });
  return out;
}

/** The parameter chosen on one axis, with its unit, out of the offered categories. */
export function paramOf(categories, category, value) {
  if (!category || !value) return null;
  const cat = (categories || []).filter(c => c.value === category)[0];
  if (!cat) return null;
  const p = (cat.values || []).filter(v => v.value === value)[0];
  return p ? { value: p.value, unit: p.unit || '' } : null;
}

/** 'P_AC (kW)' — bracketed and ASCII, because this string goes into the CSV too. */
export const labelOf = p => (p ? p.value + (p.unit ? ` (${p.unit})` : '') : '');
