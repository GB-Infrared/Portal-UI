/**
 * UI enums — the fixed option lists the design draws. These are protocol /
 * presentation constants, not plant data: they stay the same whichever backend
 * is behind the portal. Anything that varies per site (plant names, device
 * lists) comes through the data contract instead.
 */

/*
 * DEVICE_TYPES and DATA_POINTS used to live here as fixed lists. They are not UI
 * enums: which device types a site has, and which registers those devices
 * publish, are facts about the PLANT. A site with a tracker controller or a
 * string-level meter would have had no way to appear in either selector without
 * someone editing this file — which is exactly the kind of hidden hard-coding
 * this app is meant not to have.
 *
 * They now come through the data contract as `deviceTypes` and `dataPoints`.
 * See contract.js.
 */

/** Top-bar refresh interval, in seconds. */
export const REFRESH_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' }
];

/* SEVERITY_FILTERS was a one-of-five list ("Critical Only", "Alarm Only"...).
   Every severity filter in the portal now takes SEVERAL bands at once, so the
   options are just the bands themselves - see SEVERITY_BANDS below. */

/** One scale, in steps a reader can hold, on both tables that page. */
export const ROWS_PER_PAGE = [25, 50, 75, 100, 150, 200];

/** The four bands, worst first — the rank the lists themselves sort by. */
export const SEVERITY_BANDS = [
  { value: 'critical', label: 'Critical' },
  { value: 'alarm', label: 'Alarm' },
  { value: 'warn', label: 'Warning' },
  { value: 'event', label: 'Event' }
];

export const ALARM_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' }
];

/* The alarms table's columns render markup, so they live in a .jsx module —
   see data/alarmColumns.jsx. Vite only transforms JSX in .jsx files, and a
   component hidden in a .js constants file fails at build time rather than
   politely. */

export const RANGE_TABS = ['Day', 'Week', 'Month'];

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                            'August', 'September', 'October', 'November', 'December'];

/**
 * Plot colours, handed out in order to whichever series the backend sends.
 * Green and blue are the two the design reserves for charted devices; a series
 * may override with its own `color`.
 */
/**
 * One hue per charted device, handed out by position.
 *
 * Colour used to carry STATUS here — green for healthy, blue for warning — and
 * on a chart showing five healthy inverters that made five identical green lines
 * with a legend that could not tell them apart. Colour now carries IDENTITY;
 * status lives on the rail card, where a dot and a word say it better than a hue
 * could. A series that ships its own `color` still wins.
 *
 * The values are tokens, not literals: a mid-tone picked for white sinks into
 * navy, so the dark theme redefines --s1..--s12 and the charts follow.
 */
export const PLOT_COLORS = [
  'var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)',
  'var(--s7)', 'var(--s8)', 'var(--s9)', 'var(--s10)', 'var(--s11)', 'var(--s12)'
];

/**
 * Chart geometry. These belong to the design, not the data — they keep the
 * axes drawn and readable while the backend is not yet connected.
 */
export const CHART_DEFAULTS = {
  devicePower:  { max: 300,  step: 50 },   // monitoring · kW
  plantPower:   { max: 600,  step: 100 },  // home · kW, plant total view
  invertePower: { max: 300,  step: 50 },   // home · kW, per-inverter view
  irradiance:   { max: 1000, step: 200 },  // home · W/m², right-hand axis
  energy:       { max: 14000, step: 3500 },// home · kWh per day
  kpi:          { max: 25,   step: 5 }     // home · %
};

/**
 * Home · the power chart's x-axis frame, in decimal hours.
 *
 * Cut to the daylight window plus an hour of margin rather than midnight to
 * midnight: roughly a third of a 24 h axis is dark every day of the year, and
 * that third renders as empty plot. These are defaults — a site with its own
 * sunrise/sunset should send `window` on PowerIrradianceData instead, since the
 * right frame is seasonal and latitude-dependent.
 *
 * The monitoring chart keeps the full 24 h day: it is a raw device trace, and
 * clipping it would hide overnight readings that are genuinely diagnostic.
 */
export const DAY_WINDOW = { from: 5, to: 21 };

export const DAY_MS = 86400000;
