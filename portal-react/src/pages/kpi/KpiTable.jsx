import { useRef, useState } from 'react';
import { PanelSelect } from '../../components/PanelSelect';
import { RowPop } from '../../components/RowPop';
import { ROWS_PER_PAGE } from '../../data/constants';
import { downloadCsv } from '../../lib/csv';
import { fixed } from '../../lib/format';
import { KPI_SERIES } from '../../components/charts/KpiBarChart';
import { useToast } from '../../components/Toasts';

/**
 * The graph's data, one row per bucket — not a second dataset that could disagree
 * with it. The picker narrows the table and the export together.
 *
 * Timestamp is locked: a KPI row without the bucket it covers is not a reading.
 * The rest are the three series, so the picker and the chart legend narrow the
 * same data from two directions.
 */
export function KpiTable({ data, title, page, pageSize, onPage, onPageSize, status }) {
  const [cols, setCols] = useState(() => KPI_SERIES.map(s => s.key));
  const toast = useToast();
  /* the row-pop reads this table's live header and cells */
  const wrapRef = useRef(null);

  const buckets = (data && data.buckets) || [];
  const unit = (data && data.unit) || '';
  const dec = data && data.decimals != null ? data.decimals : 1;
  const shown = KPI_SERIES.filter(s => cols.includes(s.key));

  /* Nothing ticked, or nothing to show: the table states its SHAPE and says so
     plainly, the way Analysis and Monitoring do. Timestamp is locked on, so with
     every series unticked the alternative is a column of dates alone in a wide
     card — a list wearing a table's clothes. The greyed header is the contract;
     the note underneath is why it is empty. */
  const blank = !shown.length || !buckets.length;

  const total = data && data.total != null ? data.total : buckets.length;
  const from = (page - 1) * pageSize;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const cell = (b, key) => (b[key] == null || !isFinite(b[key]) ? '—' : fixed(b[key], dec));

  function exportCsv() {
    downloadCsv(
      `KPI_${(data && data.metric) || 'metric'}.csv`,
      ['Timestamp'].concat(shown.map(s => s.label + (unit ? ` (${unit})` : ''))),
      buckets.map(b => [b.stamp || b.label || ''].concat(
        shown.map(s => (b[s.key] == null || !isFinite(b[s.key]) ? '' : fixed(b[s.key], dec)))))
    );
    toast(`Exported ${buckets.length} rows · ${shown.length + 1} columns`);
  }

  return (
    <div className="card">
      <div className="chead"><div className="title">{title}</div></div>

      <div className="ttools">
        <div className="msel-inline">
          <PanelSelect multiple head="Shown in the table and the export" id="k-cols"
                       fixedLabel="COLUMNS" locked="Timestamp"
                       options={KPI_SERIES.map(s => ({ value: s.key, label: s.label }))}
                       value={cols} onChange={setCols} />
        </div>
        <button className="tbtn" type="button" onClick={exportCsv} disabled={blank}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2M4.5 20h15" />
          </svg>EXPORT CSV
        </button>
      </div>

      <div className="tablewrap" ref={wrapRef}>
        <table>
          <thead>
            <tr>
              <th className="ts">Timestamp</th>
              {blank
                ? KPI_SERIES.map(s => <th key={s.key} className="ph">{s.label}</th>)
                : shown.map(s => (
                    <th key={s.key}>{s.label}{unit ? ` (${unit})` : ''}</th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {!blank && buckets.map(b => (
              <tr key={String(b.key)}>
                <td className="ts">{b.stamp || b.label || ''}</td>
                {shown.map(s => (
                  <td key={s.key} className={b[s.key] == null ? 'nil' : undefined}>
                    {cell(b, s.key)}
                  </td>
                ))}
              </tr>
            ))}
            {blank && (
              <tr>
                <td colSpan={KPI_SERIES.length + 1}>
                  <div className="empty-note tall">
                    {status === 'loading' ? 'Loading…'
                      : !buckets.length ? 'Nothing in this period' : 'No columns selected'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* the row under the pointer, spelled out in full, so a wide table is
          never read by scrolling sideways */}
      <RowPop wrapRef={wrapRef} />

      <div className="tfoot">
        <span>Rows per page</span>
        <select value={pageSize} style={{ padding: '5px 26px 5px 9px', fontSize: 12 }}
                onChange={e => onPageSize(Number(e.target.value))}>
          {ROWS_PER_PAGE.map(n => <option key={n}>{n}</option>)}
        </select>
        <span className="sp" />
        <span className="range">
          {blank || !total ? '0-0 of 0'
            : `${from + 1}-${Math.min(from + pageSize, total)} of ${total}`}
        </span>
        <button className="pgbtn" type="button" disabled={blank || page <= 1}
                onClick={() => onPage(page - 1)}>&lsaquo;</button>
        <button className="pgbtn" type="button" disabled={blank || page >= pages}
                onClick={() => onPage(page + 1)}>&rsaquo;</button>
      </div>
    </div>
  );
}
