import { useMemo } from 'react';
import { usePortal } from '../data/PortalData';
import { useToast } from '../components/Toasts';
import { PanelSelect } from '../components/PanelSelect';
import { PlantPicker } from '../components/PlantPicker';
import { DateTimeField } from '../components/DateTimeField';
import { SEVERITY_BANDS, ALARM_STATUS, ROWS_PER_PAGE } from '../data/constants';
import { ALARM_COLUMNS } from '../data/alarmColumns';
import { downloadCsv } from '../lib/csv';

/**
 * The alarm log.
 *
 * One column, not two: Monitoring needs a device rail because its chart is
 * driven by the device you pick, while this list is driven entirely by the bar
 * above it — every pixel a rail took would come out of the table.
 *
 * There is no APPLY. Every control writes straight to the query, which re-runs
 * `fetchData`; a confirm step would let the bar and the table disagree about
 * what is on screen, and on an alarm page that gap is the dangerous kind.
 */
export default function Alarms() {
  const { plants, alarmsPage, query, setQuery, status } = usePortal();
  const toast = useToast();

  const page = alarmsPage || null;
  const rows = (page && page.rows) || [];
  const total = page && page.total != null ? page.total : rows.length;

  /* Every column, always. The prototype's alarm toolbar carries EXPORT CSV and
     nothing else: an alarm log is read across the row - severity against device
     against message against when it cleared - so a column hidden here is a fact
     missing from the answer rather than clutter removed from it. Monitoring's
     table is the one that needs a picker, because there the columns are DEVICES
     and a fleet of forty will not fit on a screen. */
  const shown = ALARM_COLUMNS;

  /* Devices and per-plant counts are the BACKEND's — the devices these plants
     actually have, and what each plant has open over this same window. An app
     that kept its own list would go stale the first time a site added a meter. */
  const devices = (page && page.devices) || [];
  const counts = useMemo(() => {
    const m = new Map();
    ((page && page.plantCounts) || []).forEach(p => m.set(p.id, p.activeAlarms));
    return m;
  }, [page]);

  const active = rows.filter(a => a.status === 'active');
  const bandCount = k => active.filter(a => a.sev === k).length;

  const from = (query.alarmPage - 1) * query.alarmPageSize;
  const pages = Math.max(1, Math.ceil(total / query.alarmPageSize));

  function sortBy(key) {
    setQuery(query.alarmSort === key
      ? { alarmSortDir: query.alarmSortDir === 1 ? -1 : 1, alarmPage: 1 }
      : { alarmSort: key, alarmSortDir: key === 'recv' || key === 'res' ? -1 : 1, alarmPage: 1 });
  }

  function exportCsv() {
    /* exactly what the table shows, in its order, for the rows on the server's
       answer — a real file, so what is on screen can be checked off screen */
    downloadCsv(
      `Alarms_${query.alarmFromDate}.csv`,
      shown.map(c => c.label),
      rows.map(a => shown.map(c => c.raw(a)))
    );
    toast(`Exported ${rows.length} rows · ${shown.length} columns`);
  }

  return (
    <div className="page">
      {/* ===================== FILTER BAR ===================== */}
      <div className="toprow">
        <div className="filters">
          <div className="field"><label>Plant</label>
            {/* several sites at once: an alarm desk watches a portfolio, and
                "what is open across these three" is the question this page is
                for. Each card is costed before it is offered. */}
            <PlantPicker plants={plants} multiple value={query.alarmPlants}
                         onChange={v => setQuery({ alarmPlants: v, alarmPage: 1 })}
                         renderState={p => {
                           const n = counts.has(p.id) ? counts.get(p.id) : p.activeAlarms;
                           if (n == null) return null;
                           return <span className={'alm ' + (n ? 'hot' : 'cold')}>
                             {n ? `${n} ACTIVE` : 'ALL CLEAR'}</span>;
                         }} />
          </div>

          <div className="field"><label>Device</label>
            <PanelSelect multiple head="Devices" anyLabel="All devices" id="a-dev"
                         options={devices.map(d => ({ value: d }))}
                         value={query.alarmDevices}
                         onChange={v => setQuery({ alarmDevices: v, alarmPage: 1 })} />
          </div>

          <div className="field"><label>Severity</label>
            <PanelSelect multiple head="Severity" anyLabel="Any severity" id="a-sev"
                         options={SEVERITY_BANDS.map(b => ({ ...b, dot: b.value,
                                                             count: bandCount(b.value) || undefined }))}
                         value={query.alarmSeverity}
                         onChange={v => setQuery({ alarmSeverity: v, alarmPage: 1 })} />
          </div>

          <div className="field"><label>Status</label>
            <PanelSelect multiple head="Status" anyLabel="Any status" id="a-st"
                         options={ALARM_STATUS}
                         value={query.alarmStatus}
                         onChange={v => setQuery({ alarmStatus: v, alarmPage: 1 })} />
          </div>

          <div className="field"><label>Start date time</label>
            <DateTimeField date={query.alarmFromDate} time={query.alarmFromTime}
                           onChange={({ date, time }) =>
                             setQuery({ alarmFromDate: date, alarmFromTime: time, alarmPage: 1 })} />
          </div>

          <div className="field"><label>End date time</label>
            <DateTimeField date={query.alarmToDate} time={query.alarmToTime}
                           onChange={({ date, time }) =>
                             setQuery({ alarmToDate: date, alarmToTime: time, alarmPage: 1 })} />
          </div>
        </div>
      </div>

      <div className="wrap">
        {/* ===================== SUMMARY ===================== */}
        {/* counted off the SAME rows the table is showing, so the tiles and the
            list can never disagree about how many alarms there are */}
        {/* A count and what it is counting, nothing else. The caption under each
            number restated the tile's own label — "Needs action now" under Alarm,
            "Watch" under Warning — a line of type per tile saying nothing the
            heading had not already said. */}
        <div className="sumbar">
          <Tile k="Active alarms" v={active.length} cls={active.length ? 'alarm' : 'ok'} />
          <Tile k="Alarm" v={bandCount('critical') + bandCount('alarm')}
                cls={bandCount('critical') + bandCount('alarm') ? 'alarm' : 'ok'} />
          <Tile k="Warning" v={bandCount('warn')} cls={bandCount('warn') ? 'warn' : 'ok'} />
          <Tile k="Resolved" v={rows.length - active.length} cls="ok" />
        </div>

        {/* ===================== TABLE ===================== */}
        <div className="card">
          <div className="chead"><div className="title">Alarm Data</div></div>

          <div className="ttools">
            <button className="tbtn" type="button" onClick={exportCsv} disabled={!rows.length}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2M4.5 20h15" />
              </svg>EXPORT CSV
            </button>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  {shown.map(c => (
                    <th key={c.key} className={'so' + (query.alarmSort === c.key ? ' on' : '')}
                        onClick={() => sortBy(c.key)} title={'Sort by ' + c.label}>
                      {c.label}
                      {query.alarmSort === c.key &&
                        <span className="ar">{query.alarmSortDir < 0 ? '▼' : '▲'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(a => (
                  <tr key={a.id}>
                    {shown.map(c => <td key={c.key} className={c.cls}>{c.cell(a)}</td>)}
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={shown.length}>
                    <div className="empty-note tall">
                      {status === 'loading' ? 'Loading…' : 'No alarms in this window'}
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="tfoot">
            <span>Rows per page</span>
            <select value={query.alarmPageSize} style={{ padding: '5px 26px 5px 9px', fontSize: 12 }}
                    onChange={e => setQuery({ alarmPageSize: Number(e.target.value), alarmPage: 1 })}>
              {ROWS_PER_PAGE.map(n => <option key={n}>{n}</option>)}
            </select>
            <span className="sp" />
            <span className="range">
              {total ? `${from + 1}-${Math.min(from + query.alarmPageSize, total)} of ${total}` : '0-0 of 0'}
            </span>
            <button className="pgbtn" type="button" disabled={query.alarmPage <= 1}
                    onClick={() => setQuery({ alarmPage: query.alarmPage - 1 })}>&lsaquo;</button>
            <button className="pgbtn" type="button" disabled={query.alarmPage >= pages}
                    onClick={() => setQuery({ alarmPage: query.alarmPage + 1 })}>&rsaquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ k, v, cls }) {
  return (
    <div className={'sum ' + cls}>
      <div className="k">{k}</div><div className="v">{v}</div>
    </div>
  );
}
