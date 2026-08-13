const TAG = { critical: 'CRITICAL', alarm: 'ALARM', warn: 'WARNING', event: 'EVENT' };
const dash = <span className="dim">—</span>;

/**
 * The alarms table, in one place.
 *
 * Order here is the order in the table AND in the exported file, so moving a
 * column is one edit rather than two that can drift apart. Received Time is
 * locked: every other column describes an alarm, this one is the alarm's
 * identity in time — a row without it is not a record of anything.
 *
 * `cell` renders and `raw` writes the file. They are separate because a CSV
 * cell must never be a stray <span>, and because a dash reads as "nothing yet"
 * on screen but should be an empty field in a spreadsheet.
 */
export const ALARM_COLUMNS = [
  { key: 'recv', label: 'Received Time', locked: true, cls: 'ts',
    cell: a => a.receivedAt || dash, raw: a => a.receivedAt || '' },
  { key: 'res', label: 'Resolved Time', cls: 'ts',
    cell: a => a.resolvedAt || dash, raw: a => a.resolvedAt || '' },
  { key: 'status', label: 'Status',
    cell: a => (a.status ? <span className={'stt ' + a.status}>{a.status.toUpperCase()}</span> : dash),
    raw: a => (a.status || '').toUpperCase() },
  { key: 'text', label: 'Alarms Text', cls: 'msg',
    cell: a => a.message || dash, raw: a => a.message || '' },
  { key: 'id', label: 'Alarm Id', cell: a => a.id, raw: a => a.id },
  { key: 'sev', label: 'Severity',
    cell: a => (a.sev
      ? <span className={'sev ' + a.sev}>{TAG[a.sev] || String(a.sev).toUpperCase()}</span>
      : dash),
    raw: a => TAG[a.sev] || (a.sev || '').toUpperCase() },
  { key: 'dev', label: 'Device Name', cell: a => a.device || dash, raw: a => a.device || '' },
  { key: 'plant', label: 'Plant Name', cell: a => a.plant || dash, raw: a => a.plant || '' }
];
