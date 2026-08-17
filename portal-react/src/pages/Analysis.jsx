import { useMemo, useState } from 'react';
import { usePortal } from '../data/PortalData';
import { PanelSelect } from '../components/PanelSelect';
import { PlantPicker } from '../components/PlantPicker';
import { DateTimeField } from '../components/DateTimeField';
import { AnalysisChart } from '../components/charts/AnalysisChart';
import { AnalysisTable } from './analysis/AnalysisTable';
import { devicePairs, paramOf, labelOf } from './analysis/pairs';
import { PLOT_COLORS } from '../data/constants';
import { num } from '../lib/format';

/** "None" is a real answer for the second axis, so it is a real option. */
const NONE = '— None —';

/**
 * Colour cannot keep more than four series apart for a colour-blind reader, so
 * only the first four devices are plotted. The rest stay in the table, and the
 * legend says so rather than quietly dropping them.
 */
const PLOTCAP = 4;

/**
 * Analysis · any parameter of any device against any other, over an arbitrary
 * window.
 *
 * The category narrows and the value picks: two dropdowns, one decision. The
 * value list is rebuilt from the category rather than offering every tag on the
 * plant at once, which is what makes the pair worth having over one flat list of
 * forty parameters.
 */
export default function Analysis() {
  const { plants, paramCategories, analysis, query, setQuery, status } = usePortal();
  const [off, setOff] = useState(() => new Set());          /* legend, keyed id|axis */
  const [cols, setCols] = useState(null);                   /* null = follow the bar */

  const cats = paramCategories || [];
  const y1 = paramOf(cats, query.y1Category, query.y1Value);
  const y2 = query.y2Category === NONE || query.y2Category == null
    ? null : paramOf(cats, query.y2Category, query.y2Value);

  const devices = (analysis && analysis.devices) || [];
  const reports = analysis && analysis.reports;
  const rows = (analysis && analysis.rows) || [];

  /* the devices asked for in the bar; empty means the same as everywhere else on
     this portal — no narrowing, so all of them */
  const selected = query.analysisDevices.length ? query.analysisDevices : devices;
  /* the table's own picker only ever narrows what the bar already asked for */
  const tableCols = cols == null ? selected : cols.filter(id => selected.includes(id));

  const win = useMemo(() => {
    const a = Date.parse(`${query.analysisFromDate}T${query.analysisFromTime || '00:00'}:00`);
    const b = Date.parse(`${query.analysisToDate}T${query.analysisToTime || '00:00'}:00`);
    return isFinite(a) && isFinite(b) && b > a ? { from: a, to: b } : null;
  }, [query.analysisFromDate, query.analysisFromTime, query.analysisToDate, query.analysisToTime]);

  /* colour belongs to the DEVICE and by its position in the plotted set, so a
     series keeps its hue when another is switched off in the legend */
  const plotted = selected.slice(0, PLOTCAP);
  const colorOf = id => PLOT_COLORS[plotted.indexOf(id) % PLOT_COLORS.length] || 'var(--dim)';

  const chartPairs = devicePairs({ devices: plotted, reports, y1, y2 });
  const tablePairs = devicePairs({ devices: tableCols, reports, y1, y2 });

  /* one series per pair that is real and not switched off */
  const series = useMemo(() => {
    const out = [];
    chartPairs.forEach(d => d.cells.forEach(c => {
      if (off.has(d.id + '|' + c.axis)) return;
      out.push({
        id: d.id, axis: c.axis, param: c.param, unit: c.unit, color: colorOf(d.id),
        points: rows.map(r => {
          const v = (c.axis === 1 ? r.v1 : r.v2)[d.id];
          return { t: r.t, v: v == null || !isFinite(v) ? null : v };
        })
      });
    }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPairs, rows, off]);

  const toggle = key => setOff(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const valuesOf = category => {
    const c = cats.filter(x => x.value === category)[0];
    return c ? (c.values || []).map(v => ({ value: v.value, label: labelOf(v) })) : [];
  };

  return (
    <div className="page">
      {/* ===================== FILTER BAR ===================== */}
      <div className="toprow">
        <div className="filters">
          <div className="field"><label>Plant</label>
            <PlantPicker plants={plants} value={query.plantId}
                         onChange={id => setQuery({ plantId: id, analysisPage: 1 })}
                         wide anyLabel="No plants"
                         renderState={p => (p.acCapacity != null
                           ? <span className="cap">{num(p.acCapacity)} kW AC</span> : null)} />
          </div>

          <div className="field"><label>Device</label>
            <PanelSelect multiple head="Devices" anyLabel="All devices" id="an-dev"
                         options={devices.map(d => ({ value: d }))}
                         value={query.analysisDevices}
                         onChange={v => setQuery({ analysisDevices: v, analysisPage: 1 })} />
          </div>

          <div className="field"><label>— Y1 category</label>
            <PanelSelect head="Y1 category" anyLabel="No categories" id="an-y1c"
                         options={cats.map(c => ({ value: c.value }))}
                         value={query.y1Category}
                         onChange={v => setQuery({ y1Category: v, y1Value: null, analysisPage: 1 })} />
          </div>
          <div className="field"><label>Y1 value</label>
            <PanelSelect head="Y1 value" anyLabel="No values" id="an-y1v"
                         options={valuesOf(query.y1Category)}
                         value={query.y1Value}
                         onChange={v => setQuery({ y1Value: v, analysisPage: 1 })} />
          </div>

          <div className="field"><label>--- Y2 category</label>
            {/* a second scale that is not wanted should be switchable OFF rather
                than set to something harmless */}
            <PanelSelect head="Y2 category" anyLabel={NONE} id="an-y2c"
                         options={[{ value: NONE }].concat(cats.map(c => ({ value: c.value })))}
                         value={query.y2Category || NONE}
                         onChange={v => setQuery({
                           y2Category: v === NONE ? null : v, y2Value: null, analysisPage: 1
                         })} />
          </div>
          <div className="field"><label>Y2 value</label>
            <PanelSelect head="Y2 value" anyLabel="—" id="an-y2v"
                         options={valuesOf(query.y2Category)}
                         value={query.y2Value}
                         onChange={v => setQuery({ y2Value: v, analysisPage: 1 })} />
          </div>

          <div className="field"><label>Start date time</label>
            <DateTimeField date={query.analysisFromDate} time={query.analysisFromTime}
                           onChange={({ date, time }) => setQuery({
                             analysisFromDate: date, analysisFromTime: time, analysisPage: 1
                           })} />
          </div>
          <div className="field"><label>End date time</label>
            <DateTimeField date={query.analysisToDate} time={query.analysisToTime}
                           onChange={({ date, time }) => setQuery({
                             analysisToDate: date, analysisToTime: time, analysisPage: 1
                           })} />
          </div>
          <div className="field"><label>&nbsp;</label>
            {!win && <span className="dtwarn">End must be after start</span>}
          </div>
        </div>
      </div>

      <div className="wrap">
        {/* ===================== CHART ===================== */}
        <div className="card">
          <div className="chead">
            <div className="title">Analysis Data</div>
            {/* every chip names its device AND its parameter — identity never
                rests on colour alone. Only pairs that EXIST are listed. */}
            <div className="legend">
              {chartPairs.map(d => d.cells.map(c => {
                const key = d.id + '|' + c.axis;
                return (
                  <span key={key} className={'lg' + (off.has(key) ? ' off' : '')}
                        onClick={() => toggle(key)} title="Click to hide or show">
                    <i className={c.axis === 1 ? 'solid' : 'dash'}
                       style={{ borderTopColor: colorOf(d.id) }} />
                    <span className="n">{d.id}</span>
                    <span className="p">{c.param}</span>
                  </span>
                );
              }))}
              {selected.length > PLOTCAP && (
                <span className="lg" style={{ cursor: 'default' }}
                      title="Colour cannot keep more than four series apart for a colour-blind reader. The rest are in the table below.">
                  <span className="p">+{selected.length - PLOTCAP} more in table</span>
                </span>
              )}
            </div>
          </div>

          <AnalysisChart series={series} window={win || { from: 0, to: 1 }}
                         y1Label={labelOf(y1)} y2Label={labelOf(y2)}
                         dateLabel={win ? `${stamp(win.from)}  →  ${stamp(win.to)}` : ''}
                         note={chartNote({ win, status, devices, selected, rows, series, y1, y2 })} />
        </div>

        {/* ===================== THE GRAPH'S DATA ===================== */}
        <AnalysisTable pairs={tablePairs} rows={rows}
                       total={analysis && analysis.total} devices={selected}
                       cols={tableCols} onCols={setCols} status={status} y1={y1} y2={y2}
                       page={query.analysisPage} pageSize={query.analysisPageSize}
                       onPage={p => setQuery({ analysisPage: p })}
                       onPageSize={n => setQuery({ analysisPageSize: n, analysisPage: 1 })} />
      </div>
    </div>
  );
}

/* Every reason a plot can be bare is a different fact, and they do not share a
   sentence: a window nobody set is not the same as a device that does not report
   what was asked for. */
function chartNote({ win, status, devices, selected, rows, series, y1, y2 }) {
  if (!win) return 'Set a window: the end must be after the start';
  if (status === 'loading') return 'Loading…';
  if (!devices.length) return 'No devices on this plant';
  if (!selected.length) return 'Pick one or more devices to plot';
  if (!y1) return 'Pick a parameter for Y1';
  if (!rows.length) return 'No readings in this window';
  if (!series.length) {
    const asked = [y1 && y1.value, y2 && y2.value].filter(Boolean).join(' or ');
    return `None of the selected devices reports ${asked}`;
  }
  return '';
}

const p2 = n => String(n).padStart(2, '0');
function stamp(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
