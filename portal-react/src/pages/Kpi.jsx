import { useState } from 'react';
import { usePortal } from '../data/PortalData';
import { PanelSelect } from '../components/PanelSelect';
import { PlantPicker } from '../components/PlantPicker';
import { MonthPicker } from '../components/MonthPicker';
import { KpiBarChart, KPI_SERIES } from '../components/charts/KpiBarChart';
import { KpiTable } from './kpi/KpiTable';
import { MONTHS_LONG } from '../data/constants';
import { num } from '../lib/format';

/** Three buckets, three questions — how to READ a period, not a fact about the site. */
const BUCKETS = ['Daily', 'Weekly', 'Monthly'];

/**
 * KPI · one site examined closely.
 *
 * ONE PLANT. The three bars are Actual, Simulated and Forecast — the same reading
 * measured, modelled and predicted — so the plant has to be fixed for them to
 * mean anything. Comparing sites is what Home's portfolio tiles are for.
 *
 * There is no tile strip above the chart. The six readings for the period live on
 * Home; this page answers how they got there, and the metric is chosen in the
 * filter bar rather than by clicking a tile.
 *
 * No APPLY: every control re-reads on change, so the chart and the table always
 * describe what the bar says.
 */
export default function Kpi() {
  const { plants, kpiMetrics, kpi, query, setQuery, status } = usePortal();
  const [hidden, setHidden] = useState(() => new Set());

  const metric = (kpiMetrics || []).filter(m => m.value === query.kpiPageMetric)[0] || null;
  /* the card is titled with what it is drawing, and the table with the same words
     plus what it is — two views of one query, never two names for it */
  const title = (kpi && kpi.label) || (metric && metric.label) || 'KPI';

  const toggle = key => setHidden(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else if (next.size < KPI_SERIES.length - 1) next.add(key);   /* never all off */
    return next;
  });

  return (
    <div className="page">
      {/* ===================== FILTER BAR ===================== */}
      <div className="toprow">
        <div className="filters">
          <div className="field"><label>Plant</label>
            <PlantPicker plants={plants} value={query.plantId}
                         onChange={id => setQuery({ plantId: id, kpiPage: 1 })}
                         wide anyLabel="No plants"
                         renderState={p => (p.acCapacity != null
                           ? <span className="cap">{num(p.acCapacity)} kW AC</span> : null)} />
          </div>

          <div className="field"><label>KPI metric</label>
            {/* the options are the site's, not the app's: a plant that publishes
                a specific yield we have never heard of must be able to appear
                here without anybody editing this file */}
            <PanelSelect head="KPI metric" anyLabel="No metrics" id="k-met"
                         options={(kpiMetrics || []).map(m => ({ value: m.value, label: m.label }))}
                         value={query.kpiPageMetric}
                         onChange={v => setQuery({ kpiPageMetric: v, kpiPage: 1 })} />
          </div>

          <div className="field"><label>Period</label>
            <MonthPicker year={query.year} month={query.month}
                         onPick={(y, m) => setQuery({ year: y, month: m, kpiPage: 1 })} />
          </div>
        </div>
      </div>

      <div className="wrap">
        {/* ===================== TREND ===================== */}
        <div className="card">
          <div className="chead">
            <div className="title">{title}</div>
            {/* Actual, Simulated, Forecast — measured, modelled, predicted. The
                chips switch a series off, which is how you read one against one
                without a second control. */}
            <div className="legend">
              {KPI_SERIES.map(s => (
                <span key={s.key} className={'lg' + (hidden.has(s.key) ? ' off' : '')}
                      title="Click to hide or show" onClick={() => toggle(s.key)}>
                  <i className="sq" style={{ background: s.color }} />
                  <span className="n">{s.label}</span>
                </span>
              ))}
            </div>
            {/* The bucket switch sits with the legend because both control what
                the chart DRAWS, not what the page is about — and it is the same
                control, at the same size, that Monitoring puts here for its
                range. A page's controls are read as one set across the app or
                not at all. */}
            <div className="tools">
              <div className="seg">
                {BUCKETS.map(b => (
                  <button key={b} type="button" className={b === query.kpiBucket ? 'on' : undefined}
                          onClick={() => setQuery({ kpiBucket: b, kpiPage: 1 })}>{b}</button>
                ))}
              </div>
            </div>
          </div>

          <KpiBarChart data={kpi} hidden={hidden} />
        </div>

        {/* ===================== THE GRAPH'S DATA ===================== */}
        <KpiTable data={kpi} title={`${title} · Data`} status={status}
                  page={query.kpiPage} pageSize={query.kpiPageSize}
                  onPage={p => setQuery({ kpiPage: p })}
                  onPageSize={n => setQuery({ kpiPageSize: n, kpiPage: 1 })} />

        {/* the period the whole page is about, stated once - the bar above can be
            scrolled off on a laptop, and a KPI with no period is not a KPI */}
        <div className="pagenote">
          {MONTHS_LONG[query.month]} {query.year} · {query.kpiBucket.toLowerCase()} buckets
          {metric && metric.unit ? ` · ${metric.label} in ${metric.unit}` : ''}
        </div>
      </div>
    </div>
  );
}
