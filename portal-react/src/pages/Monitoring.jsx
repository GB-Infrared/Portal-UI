import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePortal } from '../data/PortalData';
import { useHoverZone } from '../lib/useHoverZone';
import { useDateField } from '../lib/useDateField';
import { PLOT_COLORS, RANGE_TABS } from '../data/constants';
import { fixed, num } from '../lib/format';
import { DevicePowerChart } from '../components/charts/DevicePowerChart';
import { PanelSelect } from '../components/PanelSelect';
import { PlantPicker } from '../components/PlantPicker';
import { DeviceRail } from './monitoring/DeviceRail';
import { DevicePanel } from './monitoring/DevicePanel';
import { HistoryTable } from './monitoring/HistoryTable';

export default function Monitoring() {
  const { plants, deviceTypes, dataPoints, devices, live, devicePower,
          history, query, setQuery } = usePortal();

  const dateRef = useDateField();
  const [panelId, setPanelId] = useState(null);
  const [panelHeight, setPanelHeight] = useState(null);
  const [hiddenSeries, setHiddenSeries] = useState(() => new Set());

  const rowRef = useRef(null);       // the .main row — drives the chart height
  const chartCardRef = useRef(null); // measured to cap the panel's height

  /* the panel stays while the pointer is on a device card or on the panel
     itself; anywhere else closes it, with a grace period to cross the gap */
  const closePanel = useCallback(() => setPanelId(null), []);
  useHoverZone({
    selectors: ['.dcard', '#devpanel'],
    isOpen: panelId != null,
    onClose: closePanel
  });

  /* cap to the graph's own height, measured before the panel takes any space */
  useLayoutEffect(() => {
    if (panelId && chartCardRef.current) setPanelHeight(chartCardRef.current.offsetHeight);
  }, [panelId]);

  const series = useMemo(() => (devicePower && devicePower.series) || [], [devicePower]);

  /* colour rings on the rail match the lines on the chart */
  const plotted = useMemo(() => {
    const map = new Map();
    series.forEach((s, i) => {
      if (!hiddenSeries.has(s.id)) map.set(s.id, s.color || PLOT_COLORS[i % PLOT_COLORS.length]);
    });
    return map;
  }, [series, hiddenSeries]);

  const toggleSeries = id => setHiddenSeries(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const panelDevice = devices.find(d => d.id === panelId) || null;
  const onlineCount = devices.filter(d => d.online).length;
  /* the unit belongs to the data point, and the backend owns the data points -
     inferring it here from a table of our own would go stale the first time a
     site publishes a register we have not heard of */
  const unit = (devicePower && devicePower.unit) || '';
  /* the card is titled with what it is DRAWING. 'Active Power' was a hardcoded
     fact about one register, still on screen after the user had asked for
     frequency - the chart and its title disagreeing is exactly the gap a reader
     is misled by. Data first, because the site may name its own tag better than
     the raw code; then the selection; then a neutral word, never a guess. */
  const title = (devicePower && devicePower.label) || query.dataPoint || 'Device Data';

  return (
    <>
      {/* ===== TOP ROW · title + filters, one line ===== */}
      <div className="toprow">
        <div className="rail-head">
          <span className="t">Devices Live</span>
          <span className="live-chip"><span className="dot" style={{ width: 5, height: 5 }} />LIVE</span>
        </div>
        <div className="filters">
          <div className="field">
            <label>Plant</label>
            {/* the same card picker Home opens, one site at a time: the chart,
                the rail and the table all read ONE plant, and two merged would
                not be a reading. The card states what the rail is about to be
                filled with rather than only naming the site. */}
            <PlantPicker plants={plants} value={query.plantId}
                         onChange={id => setQuery({ plantId: id })}
                         wide anyLabel="No plants"
                         renderState={p => (
                           <>
                             {p.acCapacity != null &&
                               <span className="cap">{num(p.acCapacity)} kW AC</span>}
                             {p.deviceCount != null &&
                               <span className="dv">{p.deviceCount} DEVICES</span>}
                           </>
                         )} />
          </div>
          <div className="field">
            <label>Device type</label>
            {/* the options are the plant's, not the app's — an empty list says so
                rather than offering four types this site may not have */}
            <PanelSelect head="Device type" anyLabel="No device types" id="dt-sel"
                         options={deviceTypes.map(t => ({ value: t }))}
                         value={query.deviceType} onChange={v => setQuery({ deviceType: v })} />
          </div>
          <div className="field">
            <label>Data point</label>
            <PanelSelect head="Data point" anyLabel="No data points" id="dp-sel"
                         options={dataPoints.map(d => ({ value: d }))}
                         value={query.dataPoint} onChange={v => setQuery({ dataPoint: v })} />
          </div>
          <div className="field">
            <label>Date</label>
            {/* a real date input, not a box wrapped round one: useDateField makes
                the whole field open the calendar, toggle it shut, and select
                nothing when clicked */}
            <input type="date" ref={dateRef} value={query.day}
                   onChange={e => setQuery({ day: e.target.value })} />
          </div>
          {/* No APPLY. Every control here already writes straight to the query,
              which re-runs fetchData — the button confirmed something that had
              happened three renders ago. A separate apply step also lets the bar
              and the chart disagree, and that gap is where a reader is misled. */}
        </div>
      </div>

      <div className="shell">
        {/* ===== LEFT RAIL · DEVICES ===== */}
        <aside className="rail">
          <DeviceRail devices={devices} plotted={plotted} selectedId={panelId} onHover={setPanelId} />

          <div className="rail-kpis">
            <div className="kpi">
              <div className="lbl">Plant active power</div>
              <div className="val">
                <span>{live ? num(live.power) : <span className="novalue">—</span>}</span>
                <span className="u">kW</span>
              </div>
            </div>
            <div className="kpi">
              <div className="lbl">Energy today</div>
              <div className="val">
                <span>{live ? num(live.energyToday) : <span className="novalue">—</span>}</span>
                <span className="u">kWh</span>
              </div>
            </div>
          </div>

          <div className="rail-foot">
            <div className="rf on"><span className="n">{onlineCount}</span><span className="k">Online</span></div>
            <div className="rf off"><span className="n">{devices.length - onlineCount}</span><span className="k">Offline</span></div>
          </div>
        </aside>

        {/* ===== MAIN COLUMN ===== */}
        <main className="maincol">
          <div className="main" ref={rowRef}>
            {panelDevice && (
              <DevicePanel device={panelDevice} maxHeight={panelHeight} onClose={closePanel} />
            )}

            <div className="card" ref={chartCardRef}>
              <div className="chead">
                <div className="title">{title}</div>
                <div className="legend">
                  {series.map((s, i) => {
                    const color = s.color || PLOT_COLORS[i % PLOT_COLORS.length];
                    const last = lastValue(s);
                    return (
                      <span key={s.id}
                            className={'lg' + (hiddenSeries.has(s.id) ? ' off' : '')}
                            onClick={() => toggleSeries(s.id)}>
                        <i style={{ background: color }} />
                        <span className="n">{s.id}</span>
                        <span className="v">{last == null ? '—' : fixed(last, 1) + ' ' + unit}</span>
                      </span>
                    );
                  })}
                </div>
                <div className="tools">
                  <div className="seg">
                    {RANGE_TABS.map(t => (
                      <button key={t} className={t === query.range ? 'on' : undefined}
                              onClick={() => setQuery({ range: t })}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>

              <DevicePowerChart data={devicePower} unit={unit} hidden={hiddenSeries} rowRef={rowRef}
                                /* the data may say; if it does not, the range does - Day is a
                                   curve, Week and Month are columns */
                                kind={query.range === 'Day' ? 'line' : 'bar'} />
            </div>
          </div>

          <HistoryTable data={history} pageSize={query.pageSize} page={query.page} day={query.day}
                        onPageSizeChange={n => setQuery({ pageSize: n, page: 1 })}
                        onPageChange={p => setQuery({ page: p })} />
        </main>
      </div>
    </>
  );
}

/* the legend shows each device's latest reading, so the chart doubles as a live read-out */
function lastValue(series) {
  const pts = series.points || [];
  for (let i = pts.length - 1; i >= 0; i--) if (pts[i].v != null) return pts[i].v;
  return null;
}
