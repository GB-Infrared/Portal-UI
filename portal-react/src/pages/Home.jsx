import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useChartBudget } from '../lib/useChartBudget';
import { useDateField } from '../lib/useDateField';
import { usePortal } from '../data/PortalData';
import { useToast } from '../components/Toasts';
import { daysInMonth } from '../lib/format';
import { MONTHS_LONG, PLOT_COLORS } from '../data/constants';
import { MonthPicker } from '../components/MonthPicker';
import { PowerIrradianceChart } from '../components/charts/PowerIrradianceChart';
import { DailyBarChart } from '../components/charts/DailyBarChart';
import { GroupedBarChart } from '../components/charts/GroupedBarChart';
import { PlantSwitch } from './home/PlantSwitch';
import { KpiStrip } from './home/KpiStrip';
import { AlarmsBox, AlarmsPanel } from './home/AlarmsBox';
import { FleetStrip } from './home/FleetStrip';

const KPI_METRICS = ['CUF', 'PR', 'Availability'];

/** A legend chip that switches its series off and on. */
function Chip({ k, color, label, hidden, onToggle }) {
  return (
    <span className={'lg' + (hidden.has(k) ? ' off' : '')}
          onClick={() => onToggle(k)} title="Click to hide or show">
      <i style={{ background: color }} /><span className="n">{label}</span>
    </span>
  );
}

export default function Home() {
  const { plant, live, alarms, devices: fleet, powerIrradiance,
          dailyEnergy, dailyKpi, plants, query, setQuery } = usePortal();
  const toast = useToast();

  /* The fleet strip is the chart's control: it holds the inverters charted, empty
     for the plant total. Title, legend and tile states all read from this single
     list rather than each re-deriving the selection from the hidden set, which is
     what let them drift apart. Held in fleet order, not click order, so adding a
     tile never reshuffles the ones already chosen. */
  const [pwSel, setPwSel] = useState([]);
  const pwMode = pwSel.length ? 'inverter' : 'plant';

  /* Legends double as the series switches. A hidden series keeps its chip,
     dimmed, so there is always a visible way back. State is per series, so
     hiding an inverter and flipping views leaves it hidden. */
  const [pwHidden, setPwHidden] = useState(() => new Set());
  const [kpiHidden, setKpiHidden] = useState(() => new Set());
  const toggle = (set, key) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  };
  const pwToggle = k => setPwHidden(s => toggle(s, k));
  const kpiToggle = k => setKpiHidden(s => toggle(s, k));

  /* Selection is multiple: each click adds or removes that inverter, and emptying
     the selection returns the plant total — so comparing two units is one click
     more than looking at one, with no separate control to learn. */
  function devFocus(id) {
    const ids = ((powerIrradiance && powerIrradiance.devices) || []).map(d => d.id);
    const next = (pwSel.includes(id) ? pwSel.filter(x => x !== id) : pwSel.concat(id))
      .sort((a, b) => ids.indexOf(a) - ids.indexOf(b));
    setPwSel(next);
    setPwHidden(s => {
      const n = new Set(s);
      ids.forEach(i => (!next.length || next.includes(i)) ? n.delete(i) : n.add(i));
      return n;
    });
    toast(!next.length ? 'Plant total'
      : next.length === 1 ? `${next[0]} vs irradiance`
      : `${next.length} inverters vs irradiance`);
  }

  /* One inverter is named; more than one reads as a plain "Inverter", since the
     legend beside the title already lists exactly which are on the chart. */
  const pwTitle = !pwSel.length ? 'Plant Power vs Irradiance'
    : pwSel.length === 1 ? `${pwSel[0]} Power vs Irradiance`
    : 'Inverter Power vs Irradiance';

  const monthLabel = `${MONTHS_LONG[query.month].toUpperCase()} ${query.year} · DAY`;
  const days = daysInMonth(query.year, query.month);

  const withMonth = data => data && ({
    daysInMonth: days,
    monthLabel: data.monthLabel || monthLabel,
    ...data
  });

  const devices = (powerIrradiance && powerIrradiance.devices) || [];
  const selectedSeries = pwSel.map(id => devices.filter(d => d.id === id)[0]).filter(Boolean);
  /* one hue per inverter, by position in the FULL fleet - the legend chip, the
     line on the chart and the ring on the rail card must all agree, and they
     only can if none of them indexes a filtered list */
  const colorOf = s => s && (s.color || (s.muted ? 'var(--dim)'
    : PLOT_COLORS[Math.max(0, devices.findIndex(d => d.id === s.id)) % PLOT_COLORS.length]));
  const colorById = id => colorOf(devices.filter(d => d.id === id)[0]) || 'var(--dim)';

  /* ---------- alarms panel: hover to open, 150 ms grace to cross the gap ------ */
  const [alarmsOpen, setAlarmsOpen] = useState(false);
  const [panelMax, setPanelMax] = useState(null);
  const chartCardRef = useRef(null);
  const hideT = useRef(0);

  const openAlarms = useCallback(() => {
    clearTimeout(hideT.current);
    /* cap to the chart's height, measured while the panel is still closed, so
       opening it never stretches the row - a long list scrolls instead */
    if (chartCardRef.current) setPanelMax(chartCardRef.current.offsetHeight);
    setAlarmsOpen(true);
  }, []);
  const keepAlarms = useCallback(() => clearTimeout(hideT.current), []);
  const leaveAlarms = useCallback(() => {
    clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setAlarmsOpen(false), 150);
  }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { clearTimeout(hideT.current); setAlarmsOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(hideT.current); };
  }, []);

  /* ---------- rail height ----------------------------------------------------
     The rail must never make the page taller than the content beside it. CSS can
     cap it to the viewport but not to the main column, which is what let a long
     fleet push the page past its own content. The main column's height does not
     depend on the rail, so measuring it here cannot loop. */
  const railRef = useRef(null);
  const mainRef = useRef(null);
  useLayoutEffect(() => {
    const rail = railRef.current, main = mainRef.current;
    if (!rail || !main) return undefined;
    let raf = 0;
    /* NOT main.offsetHeight. The shell stretches both columns to the row height,
       and the row is as tall as its TALLEST item - so that box already contains
       the rail's own height, and the rail would be capped to itself: a long
       fleet made the row taller than the charts needed and the surplus went to
       the page as scroll no chart resize could reach. Summing the column's
       children gives its true content height, which cannot contain the rail. */
    const fit = () => {
      const gap = parseFloat(getComputedStyle(main).rowGap) || 14;
      const kids = [...main.children];
      const h = kids.reduce((t, c) => t + c.getBoundingClientRect().height, 0)
              + gap * Math.max(0, kids.length - 1);
      if (h > 0) rail.style.maxHeight = Math.round(h) + 'px';
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    ro.observe(main);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  /* ---------- chart heights: fitted to the viewport, not to their own width -- */
  const dayRef = useDateField();
  const pageRef = useRef(null);
  const rowRef = useRef(null);
  const monthCardRef = useRef(null);
  const [picking, setPicking] = useState(false);
  const budget = useChartBudget({
    rowRef, mainRef, pageRef, lineRef: chartCardRef, monthRef: monthCardRef,
    /* the picker sits above these charts, so opening it genuinely takes ~85px
       away; the month charts give it up and the day curve is held, because that
       is the plot being read while you choose */
    holdLine: picking,
    frozen: alarmsOpen
  });

  /* one click back to the plant curve, however many inverters are on the chart */
  function clearFleet() {
    const ids = ((powerIrradiance && powerIrradiance.devices) || []).map(d => d.id);
    setPwSel([]);
    setPwHidden(s => { const n = new Set(s); ids.forEach(i => n.delete(i)); return n; });
    toast('Plant total');
  }

  return (
    <div className="page" ref={pageRef}>
      {/* ===== PLANT HEADER ===== */}
      <PlantSwitch plant={plant} plants={plants}
                   onPick={id => setQuery({ plantId: id })}
                   onOpenChange={setPicking} />

      {/* the fleet goes in too: Energy today is summed from it, not read
          off the plant, so the strip and the rail state one number */}
      <KpiStrip live={live} capacity={plant && plant.acCapacity} devices={fleet} />

      <div className="shell">
        {/* Alarm state first, then the fleet: you read whether something is wrong
            before you read what each unit is doing. */}
        <aside className="rail" ref={railRef}>
          <AlarmsBox alarms={alarms} onOpen={openAlarms} onLeave={leaveAlarms} />
          {/* the cards label themselves, so no heading above them */}
          <FleetStrip devices={fleet} capacity={plant && plant.acCapacity} colorOf={colorById}
                      selected={pwSel} onSelect={devFocus} />
        </aside>

        <main className="maincol" ref={mainRef}>
          {/* ===== ALARM PANEL + POWER vs IRRADIANCE ===== */}
          <div className="g-main" ref={rowRef}>
            <AlarmsPanel alarms={alarms} open={alarmsOpen} maxHeight={panelMax}
                         plantName={plant && (plant.name || plant.id)}
                         onKeep={keepAlarms} onLeave={leaveAlarms} />

            <div className="card" ref={chartCardRef}>
              {/* the per-inverter view is reached from the fleet rail, so the title
                  is a label rather than a second switch for the same thing */}
              <div className="chead">
                <div className="title">{pwTitle}</div>
                {/* Deselecting inverters one by one is the long way back to the
                    plant total. This is the short one, and it only exists while
                    it applies. */}
                {pwSel.length > 0 && (
                  <button className="backchip" type="button" onClick={clearFleet}
                          title="Back to the plant total">
                    <svg className="bk" width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 6l-6 6 6 6" />
                    </svg>Plant total
                  </button>
                )}

                {/* The fleet strip is the selector, so the legend carries only the
                    inverters it put on show, read against irradiance — the whole-fleet
                    roll call belongs on the fleet cards, not repeated here. */}
                <div className="legend">
                  {pwMode === 'plant'
                    ? <Chip k="power" color="var(--green)" label="Power"
                            hidden={pwHidden} onToggle={pwToggle} />
                    : selectedSeries.map(s => (
                        <Chip key={s.id} k={s.id}
                              color={colorOf(s)}
                              label={s.id} hidden={pwHidden} onToggle={pwToggle} />
                      ))}
                  <Chip k="irradiance" color="var(--amber)" label="Irradiance"
                        hidden={pwHidden} onToggle={pwToggle} />
                </div>

                <div className="tools">
                  <label className="field">
                    <span className="fl">Day</span>
                    <input type="date" ref={dayRef} value={query.day}
                           onChange={e => setQuery({ day: e.target.value })} />
                  </label>
                </div>
              </div>

              <PowerIrradianceChart data={powerIrradiance} mode={pwMode} hidden={pwHidden}
                                    height={budget.line} />
            </div>
          </div>

          {/* ===== MONTHLY ENERGY + KPI ===== */}
          <div className="g-half">
            <div className="card" ref={monthCardRef}>
              <div className="chead">
                <div className="title">Plant Energy Generation</div>
                <div className="tools">
                  <MonthPicker year={query.year} month={query.month}
                               onPick={(y, m) => setQuery({ year: y, month: m })} />
                </div>
              </div>
              <DailyBarChart data={withMonth(dailyEnergy)} height={budget.month} />
            </div>

            <div className="card">
              <div className="chead">
                <div className="title">Plant KPI</div>
                <div className="legend compact">
                  <Chip k="actual" color="var(--green)" label="Actual"
                        hidden={kpiHidden} onToggle={kpiToggle} />
                  <Chip k="simulated" color="var(--blue)" label="Simulated"
                        hidden={kpiHidden} onToggle={kpiToggle} />
                </div>
                <div className="tools">
                  <select value={query.kpiMetric} onChange={e => setQuery({ kpiMetric: e.target.value })}>
                    {KPI_METRICS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <MonthPicker year={query.year} month={query.month}
                               onPick={(y, m) => setQuery({ year: y, month: m })} />
                </div>
              </div>
              <GroupedBarChart data={withMonth(dailyKpi && { metric: query.kpiMetric, ...dailyKpi })}
                               hidden={kpiHidden} height={budget.month} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
