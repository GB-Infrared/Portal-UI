import { useRef, useState } from 'react';
import { useToast } from '../../components/Toasts';
import { RowPop } from '../../components/RowPop';
import { PanelSelect } from '../../components/PanelSelect';
import { ROWS_PER_PAGE } from '../../data/constants';
import { ExportIcon } from '../../components/icons';

/** A column with no value in any row has nothing to export; say so rather than
 *  let someone tick it and get a file of empty cells without warning. */
const hasData = (rows, i) => rows.some(r => r.values && r.values[i] != null);

/** RFC-4180 enough for a spreadsheet: quote anything with a comma or a quote. */
const cell = v => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

/* With no backend behind it the table still states its shape: device over
   variable, time stamp down the side. The header is the contract, so it is drawn
   whether or not a reading has ever arrived — the page reads as a table waiting
   for data rather than as a hole. */
const PLACEHOLDER_COLS = 3;

/**
 * The historical read-out, aligned under the graph so both share the same
 * left edge and the eye travels straight down from a point on the chart to
 * the row that produced it.
 *
 * The column picker is the only filter: what is ticked shows in the table AND
 * goes into the CSV. Time stamp is always present, and is stated in the panel as
 * a locked row rather than left out of it — a column the export carries but the
 * picker never mentions is a surprise waiting in a spreadsheet.
 *
 * It is the portal's own PanelSelect, the control Analysis and KPI use for the
 * same job. This page used to hand-roll the panel, its outside-click handling and
 * a parallel sheet of CSS, which drifted into a second look for one question.
 */
/**
 * A history row is a point in TIME, not a time of day.
 *
 * "12:05:02 PM" reads fine while you are looking at one day and becomes
 * ambiguous the moment the export is opened, or two days are compared, or the
 * range is a month — which of the thirty-one 12:05s is this? So the stamp
 * carries its date, in the sortable YYYY-MM-DD form, and a 24-hour clock so
 * there is no AM/PM to lose in a spreadsheet.
 *
 * A backend that already sends a dated stamp is left alone; this only completes
 * a bare time using the day the query asked for. The table and the CSV go
 * through the same function, so a file opened next week cannot disagree with the
 * screen it came from.
 */
function stamp(time, day) {
  if (!time) return '';
  if (/\d{4}-\d{2}-\d{2}/.test(time)) return time;      // already dated
  const t = String(time).trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!day || !m) return t;
  let h = Number(m[1]);
  const ap = (m[4] || '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  const p = n => String(n).padStart(2, '0');
  return `${day} ${p(h)}:${m[2]}:${m[3] || '00'}`;
}

export function HistoryTable({ data, pageSize, onPageSizeChange, page, onPageChange, day }) {
  const toast = useToast();
  /* the row-pop reads this table's live header and cells */
  const wrapRef = useRef(null);
  const columns = (data && data.columns) || [];
  const rows = (data && data.rows) || [];
  const total = (data && data.total) || 0;
  const from = rows.length ? (page - 1) * pageSize + 1 : 0;
  const to = rows.length ? from + rows.length - 1 : 0;

  /* held as hidden ids, so a column the backend adds later shows by default */
  const [hidden, setHidden] = useState(() => new Set());

  /* keep the source index: row.values is positional against the full column list */
  const shown = columns.map((c, i) => ({ c, i })).filter(({ c }) => !hidden.has(c.id));
  /* Nothing to show in either direction — no columns visible, or no rows — draws
     the SHAPE and says which it is. Time Stamp cannot be unticked, so the
     alternative when every device column is hidden is a lone stamp column
     stretched across the card with its times floating in the middle of it: a list
     wearing a table's clothes. The greyed header is the contract, the note
     underneath is why it is empty. */
  const blank = !shown.length || !rows.length;
  const ph = Array.from({ length: PLACEHOLDER_COLS }, (_, i) => i);

  /* PanelSelect speaks in what is ON; this table stores what is OFF. Converting
     at the boundary keeps the default — a column nobody has heard of yet is
     shown — without teaching the shared control a second way to be asked. */
  const visible = columns.filter(c => !hidden.has(c.id)).map(c => c.id);
  const setVisible = next => {
    const on = new Set(next);
    setHidden(new Set(columns.filter(c => !on.has(c.id)).map(c => c.id)));
  };

  function exportCsv() {
    /* the file carries the same two header rows the table shows: device names
       across the top, the variable each one reports beneath, time stamps down
       the side — so a sheet opened later is laid out like the screen it came from */
    const devRow = [''].concat(shown.map(({ c }) => c.label)).map(cell).join(',');
    const varRow = ['Time Stamp'].concat(shown.map(({ c }) => c.unit || '')).map(cell).join(',');
    const body = rows.map(r =>
      [cell(stamp(r.time, day))].concat(shown.map(({ i }) => cell(r.values && r.values[i]))).join(','));
    const csv = [devRow, varRow].concat(body).join('\r\n');

    /* leading BOM: without it Excel reads the file in the system codepage, and any
       non-ASCII a backend puts in a device name or unit arrives as mojibake — a
       MIDDLE DOT in "P_AC · kW" surfaces as "Â·". */
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring_${day || 'export'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast(shown.length
      ? `Exported ${shown.map(({ c }) => c.label).join(', ')}`
      : 'Exported time stamps only');
  }

  return (
    <div className="card tcard">
      <div className="ttools">
        <div className="msel-inline">
          <PanelSelect multiple head="Shown in the table and the export" id="mon-cols"
                       fixedLabel="COLUMNS" locked="Time Stamp"
                       options={columns.map((c, i) => {
                         /* a column with no reading in any row is marked where the
                            choice is made, not discovered in the file afterwards */
                         const live = hasData(rows, i);
                         return {
                           value: c.id,
                           label: c.label,
                           color: live ? (c.color || 'var(--green)') : 'var(--red)',
                           note: live ? null : 'NO DATA'
                         };
                       })}
                       value={visible} onChange={setVisible} />
        </div>
        {/* nothing on screen is nothing to carry out: the button matches Analysis
            and Alarms rather than handing over a file of headers */}
        <button className="tbtn" type="button" onClick={exportCsv} disabled={blank}>
          <ExportIcon />EXPORT CSV
        </button>
      </div>

      <div className="tablewrap" ref={wrapRef}>
        <table>
          <thead>
            <tr className="grp">
              <th className="ts" rowSpan="2"
                  style={{ verticalAlign: 'bottom', borderBottom: '1px solid var(--line-soft)' }}>
                Time Stamp
              </th>
              {blank
                ? ph.map(i => <th key={i} className="ph">Device Name</th>)
                : shown.map(({ c }) => (
                    <th key={c.id}>
                      <span className="ringdot" style={{ '--ring': c.color || 'var(--line-hi)' }} />
                      {c.label}
                    </th>
                  ))}
            </tr>
            <tr>
              {blank
                ? ph.map(i => <th key={i} className="ph">Variable Name</th>)
                : shown.map(({ c }) => <th key={c.id}>{c.unit || ''}</th>)}
            </tr>
          </thead>
          <tbody>
            {!blank && rows.map((r, i) => (
              <tr key={r.time + i}>
                <td className="ts">{stamp(r.time, day)}</td>
                {shown.map(({ c, i: k }) => (
                  <td key={c.id} className={r.flags && r.flags[k] ? r.flags[k] : undefined}
                      title={r.flags && r.flags[k] === 'warn'
                        ? 'Below expected — see alarms' : undefined}>
                    {r.values[k] == null ? '—' : r.values[k]}
                  </td>
                ))}
              </tr>
            ))}
            {blank && (
              <tr>
                <td colSpan={PLACEHOLDER_COLS + 1}>
                  {/* a query that came back empty and a table with every column
                      unticked are different facts, so they do not share a message */}
                  <div className="empty-note tall">
                    {!rows.length ? 'No data' : 'No columns selected'}
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
        <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}
                style={{ padding: '5px 26px 5px 9px', fontSize: 12 }}>
          {ROWS_PER_PAGE.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="sp" />
        <span className="range">{rows.length ? `${from}–${to} of ${total || to}` : '0 of 0'}</span>
        <button className="pgbtn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
        <button className="pgbtn" disabled={!total || to >= total}
                onClick={() => onPageChange(page + 1)}>›</button>
      </div>
    </div>
  );
}
