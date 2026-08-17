import { PanelSelect } from '../../components/PanelSelect';
import { ROWS_PER_PAGE } from '../../data/constants';
import { downloadCsv } from '../../lib/csv';
import { fixed } from '../../lib/format';
import { stampMs } from '../../components/charts/AnalysisChart';
import { labelOf } from './pairs';
import { useToast } from '../../components/Toasts';

const PLACEHOLDER_COLS = 3;

/**
 * The chart's data, in the shape Monitoring's history table uses: device names
 * across the top, the parameter each one reports beneath, time stamps down the
 * side.
 *
 * The columns are the SAME pairs the chart draws and no others — see pairs.js.
 * Six columns where three were nothing but dashes cost half the table's width to
 * say "not applicable" about a question nobody asked.
 */
export function AnalysisTable({ pairs, rows, total, page, pageSize, onPage, onPageSize,
                                devices, cols, onCols, status, y1, y2 }) {
  const toast = useToast();
  /* nothing to show in either direction — draw the SHAPE and say which it is */
  const blank = !pairs.length || !rows.length;
  const ph = Array.from({ length: PLACEHOLDER_COLS }, (_, i) => i);

  const from = (page - 1) * pageSize;
  const shownTotal = total != null ? total : rows.length;
  const pages = Math.max(1, Math.ceil(shownTotal / pageSize));

  function exportCsv() {
    /* the same pairs the table is drawn from, so the file and the page cannot
       disagree about which device reports what */
    const head = ['Time Stamp'].concat(
      pairs.map(d => d.cells.map(c => d.id + ' ' + labelOf(c))).flat());
    downloadCsv(
      `Analysis_${new Date(rows[0].t).toISOString().slice(0, 10)}.csv`,
      head,
      rows.map(r => [stampMs(r.t)].concat(
        pairs.map(d => d.cells.map(c => {
          const v = (c.axis === 1 ? r.v1 : r.v2)[d.id];
          return v == null || !isFinite(v) ? '' : fixed(v, 2);
        })).flat()))
    );
    toast(`Exported ${rows.length} rows · ${pairs.length} device${pairs.length === 1 ? '' : 's'}`);
  }

  return (
    <div className="card">
      <div className="ttools">
        <div className="msel-inline">
          <PanelSelect multiple head="Shown in the table and the export" id="an-cols"
                       fixedLabel="COLUMNS"
                       options={(devices || []).map(d => ({ value: d }))}
                       value={cols} onChange={onCols} />
        </div>
        <button className="tbtn" type="button" onClick={exportCsv} disabled={blank}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2M4.5 20h15" />
          </svg>EXPORT CSV
        </button>
      </div>

      <div className="tablewrap">
        <table>
          <thead>
            <tr className="grp">
              <th className="ts" rowSpan="2"
                  style={{ verticalAlign: 'bottom', borderBottom: '1px solid var(--line-soft)' }}>
                Time Stamp
              </th>
              {blank
                ? ph.map(i => <th key={i} className="ph">Device Name</th>)
                /* the colspan is the device's OWN column count, not a fixed two:
                   that is what lets an inverter and a weather station sit side by
                   side with different parameters underneath */
                : pairs.map(d => (
                    <th key={d.id} className="dev sep" colSpan={d.cells.length}>{d.id}</th>
                  ))}
            </tr>
            <tr>
              {blank
                ? ph.map(i => <th key={i} className="ph">Variable Name</th>)
                : pairs.map(d => d.cells.map((c, i) => (
                    <th key={d.id + c.axis} className={i ? undefined : 'sep'}>{labelOf(c)}</th>
                  )))}
            </tr>
          </thead>
          <tbody>
            {!blank && rows.map(r => (
              <tr key={r.t}>
                <td className="ts">{stampMs(r.t)}</td>
                {pairs.map(d => d.cells.map((c, i) => {
                  const v = (c.axis === 1 ? r.v1 : r.v2)[d.id];
                  const nil = v == null || !isFinite(v);
                  return (
                    <td key={d.id + c.axis}
                        className={[i ? '' : 'sep', nil ? 'nil' : ''].filter(Boolean).join(' ') || undefined}>
                      {nil ? '—' : fixed(v, 2)}
                    </td>
                  );
                }))}
              </tr>
            ))}
            {blank && (
              <tr>
                <td colSpan={PLACEHOLDER_COLS + 1}>
                  <div className="empty-note tall">{emptyNote({ status, rows, cols, y1, y2 })}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="tfoot">
        <span>Rows per page</span>
        <select value={pageSize} style={{ padding: '5px 26px 5px 9px', fontSize: 12 }}
                onChange={e => onPageSize(Number(e.target.value))}>
          {ROWS_PER_PAGE.map(n => <option key={n}>{n}</option>)}
        </select>
        <span className="sp" />
        <span className="range">
          {blank || !shownTotal ? '0-0 of 0'
            : `${from + 1}-${Math.min(from + pageSize, shownTotal)} of ${shownTotal}`}
        </span>
        <button className="pgbtn" type="button" disabled={blank || page <= 1}
                onClick={() => onPage(page - 1)}>&lsaquo;</button>
        <button className="pgbtn" type="button" disabled={blank || page >= pages}
                onClick={() => onPage(page + 1)}>&rsaquo;</button>
      </div>
    </div>
  );
}

/* four different reasons a table is empty, and they are not the same fact */
function emptyNote({ status, rows, cols, y1, y2 }) {
  if (status === 'loading') return 'Loading…';
  if (!rows.length) return 'No data';
  if (!cols || !cols.length) return 'No columns selected';
  const asked = [y1 && y1.value, y2 && y2.value].filter(Boolean).join(' or ');
  return asked ? `None of these devices reports ${asked}` : 'No parameter selected';
}
