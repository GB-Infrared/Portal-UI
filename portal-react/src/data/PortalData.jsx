import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * The one place a backend developer has to touch.
 *
 * `<PortalDataProvider fetchData={…}>` owns the query the user has built with
 * the selectors (plant, device type, data point, day, month) and re-runs
 * `fetchData(query, { signal })` whenever it changes or the refresh interval
 * fires. Whatever that returns is handed to the pages.
 *
 * With no `fetchData` prop — the state this repo ships in — every field stays
 * empty and the pages render their empty states. The design is complete; the
 * numbers are not invented.
 *
 * See contract.js for the expected shape.
 */

/** Everything empty. Pages must stay laid out correctly against exactly this. */
export const EMPTY_DATA = Object.freeze({
  plants: [],
  deviceTypes: [],
  dataPoints: [],
  plant: null,
  live: null,
  devices: [],
  alarms: [],
  alarmsPage: null,
  devicePower: null,
  powerIrradiance: null,
  dailyEnergy: null,
  dailyKpi: null,
  history: null
});

const p2 = n => String(n).padStart(2, '0');
const isoDate = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const isoTime = d => p2(d.getHours()) + ':' + p2(d.getMinutes());

function todayISO() { return isoDate(new Date()); }

/** The alarms window: the last 24 hours, in the VIEWER's local time. */
function defaultWindow() {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 3600 * 1000);
  return {
    alarmFromDate: isoDate(from), alarmFromTime: isoTime(from),
    alarmToDate: isoDate(to), alarmToTime: isoTime(to)
  };
}

const PortalContext = createContext(null);

export function PortalDataProvider({ fetchData, children }) {
  const now = new Date();
  /* Every control the user can touch lands here, so `fetchData` sees the whole
     of what was asked for — not just the selectors that happen to be wired. */
  const [query, setQuery] = useState({
    /* Null, not a guess. 'Inverter' and 'P_AC' were sensible-looking defaults
       that were still this app asserting a fact about someone's plant — and a
       site without them would have opened on a query for something it does not
       have. They are chosen from what the backend actually offers, below. */
    plantId: null,
    deviceType: null,
    dataPoint: null,
    day: todayISO(),
    range: 'Day',                 // monitoring chart · Day | Week | Month
    year: now.getFullYear(),
    month: now.getMonth(),
    kpiMetric: 'CUF',             // home · Plant KPI series
    page: 1,                      // monitoring · history table
    pageSize: 100,

    /* ---- alarms page ----
       Every list here is EMPTY, and empty means "no narrowing": all plants, all
       devices, every severity, both statuses. That is the same rule the rest of
       the portal's filters use, and it is the only default that does not assert
       something about a site this app has never seen. */
    alarmPlants: [],
    alarmDevices: [],
    alarmSeverity: [],
    alarmStatus: [],
    /* The window is the last 24 hours, computed at load — a relative default,
       not a pinned one. Anything written as a literal date here would be a fact
       about a demo, and would still be on screen a year from now. */
    ...defaultWindow(),
    alarmPage: 1,
    alarmPageSize: 100,
    alarmSort: 'recv',
    alarmSortDir: -1,             // newest first: the question you arrive with

    refreshSeconds: 300
  });
  const [data, setData] = useState(EMPTY_DATA);
  const [status, setStatus] = useState(fetchData ? 'loading' : 'idle');
  const [error, setError] = useState(null);

  /* kept in a ref so the polling effect does not restart on every keystroke */
  const queryRef = useRef(query);
  queryRef.current = query;

  /* one flight at a time — a slow response must never overwrite a newer one */
  const flight = useRef(null);
  const load = useCallback(async () => {
    if (!fetchData) { setStatus('idle'); return; }
    if (flight.current) flight.current.abort();
    const ctrl = new AbortController();
    flight.current = ctrl;
    setStatus('loading');
    try {
      const next = await fetchData(queryRef.current, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setData({ ...EMPTY_DATA, ...(next || {}) });
      setError(null);
      setStatus('ready');
    } catch (err) {
      if (ctrl.signal.aborted || (err && err.name === 'AbortError')) return;
      setError(err);
      setStatus('error');
    }
  }, [fetchData]);

  useEffect(() => () => { if (flight.current) flight.current.abort(); }, []);

  /* re-query whenever the user changes anything. setQuery always builds a new
     object, so this fires on exactly one change and never on a re-render. */
  useEffect(() => { load(); }, [load, query]);

  /* …and on the interval chosen in the top bar */
  useEffect(() => {
    const s = query.refreshSeconds;
    if (!fetchData || s === 'off') return undefined;
    const id = setInterval(load, s * 1000);
    return () => clearInterval(id);
  }, [fetchData, load, query.refreshSeconds]);

  const setQueryPart = useCallback(patch => {
    setQuery(q => ({ ...q, ...patch }));
  }, []);

  /* Adopt the first option the backend offers for anything not yet chosen — or
     chosen but no longer on offer, which is what happens when the plant changes
     and the new site has a different device list. Without this the selector
     would sit on a value the site does not have, and the query would ask for it.
     Only ever fills a gap, so it cannot fight the user's own choice. */
  useEffect(() => {
    const patch = {};
    const pick = (key, list) => {
      if (!list || !list.length) return;
      if (query[key] == null || !list.includes(query[key])) patch[key] = list[0];
    };
    pick('deviceType', data.deviceTypes);
    pick('dataPoint', data.dataPoints);
    const ids = (data.plants || []).map(p => p.id);
    if (ids.length && (query.plantId == null || !ids.includes(query.plantId))) patch.plantId = ids[0];
    if (Object.keys(patch).length) setQuery(q => ({ ...q, ...patch }));
  }, [data.deviceTypes, data.dataPoints, data.plants, query.deviceType, query.dataPoint, query.plantId]);

  const value = useMemo(
    () => ({ ...data, query, setQuery: setQueryPart, refresh: load, status, error, live: data.live }),
    [data, query, setQueryPart, load, status, error]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside <PortalDataProvider>');
  return ctx;
}
