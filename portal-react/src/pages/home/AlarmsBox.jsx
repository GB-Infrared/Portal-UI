import { useMemo, useState } from 'react';
import { SEVERITY_BANDS } from '../../data/constants';
import { PanelSelect } from '../../components/PanelSelect';

const TAG = { critical: 'CRITICAL', alarm: 'ALARM', warn: 'WARNING', event: 'EVENT' };
/* worst first, so the list is ranked and the segments read in order of urgency */
const RANK = { critical: 0, alarm: 1, warn: 2, event: 3 };
/* what needs acting on. An EVENT is a log entry - a restart, a firmware push -
   and counting it as an active alarm would put a number on a site with nothing
   wrong, which is how alarm surfaces get ignored. */
const FAULT = new Set(['critical', 'alarm', 'warn']);
const LOUD = new Set(['critical', 'alarm']);

/**
 * The rail summary.
 *
 * The counts are STATED at all times and never hidden. Alarms are the one thing
 * a reader must not have to go looking for — a plant can be in alarm while the
 * page looks calm, and that is the failure mode worth designing against. Only
 * the detail waits for a hover; the panel that shows it is `AlarmsPanel`.
 */
export function AlarmsBox({ alarms, onOpen, onLeave }) {
  const list = alarms || [];
  const n = k => list.filter(a => a.sev === k).length;
  const crit = n('critical'), alarm = n('alarm'), warn = n('warn'), event = n('event');
  const faults = crit + alarm + warn;
  const loud = crit + alarm;

  return (
    /* leaving the box arms the close; entering the panel cancels it, so the gap
       between the two can be crossed without the panel vanishing */
    <div className="alarmbox" tabIndex={0}
         onMouseEnter={onOpen} onFocus={onOpen}
         onMouseLeave={onLeave} onBlur={onLeave}>
      <div className="ab-head">
        <span className="t">Active alarms</span>
        <span className={'ab-n' + (loud ? ' hot' : '')}>{faults}</span>
      </div>
      <div className="ab-bars">
        {faults === 0 && <span className="ab-seg none"><i />ALL CLEAR</span>}
        {crit > 0 && <span className="ab-seg critical"><i />{crit} CRITICAL</span>}
        {alarm > 0 && <span className="ab-seg alarm"><i />{alarm} ALARM</span>}
        {warn > 0 && <span className="ab-seg warn"><i />{warn} WARNING</span>}
        {event > 0 && <span className="ab-seg event"><i />{event} EVENT</span>}
      </div>
      <div className="ab-hint">Hover for detail</div>
    </div>
  );
}

/**
 * The detail, opened by hovering the box above.
 *
 * It is a flex sibling of the chart and comes FIRST in the row, so it opens
 * between the rail and the graph — right beside the box that summoned it, the
 * way the Monitoring device panel does. Showing it narrows the chart, whose
 * ResizeObserver then re-fits the plot.
 */
export function AlarmsPanel({ alarms, open, maxHeight, onKeep, onLeave, plantName }) {
  /* Several bands at once, like every other filter on this portal. One-of-five
     made "alarms and criticals" two passes over the list with nothing on screen
     able to show both — and that pairing is what an operator actually wants.
     Empty means every severity. */
  const [severity, setSeverity] = useState([]);
  const list = alarms || [];
  /* worst first: a list that opens on an event while a critical sits below it
     has buried the thing it exists to surface */
  const shown = useMemo(
    () => (!severity.length ? list : list.filter(a => severity.includes(a.sev)))
      .slice().sort((x, y) => (RANK[x.sev] ?? 9) - (RANK[y.sev] ?? 9)),
    [list, severity]
  );

  if (!open) return null;

  return (
    <aside className="card apanel" style={maxHeight ? { maxHeight } : undefined}
           onMouseEnter={onKeep} onMouseLeave={onLeave}>
      <div className="chead">
        <div className="title">Active alarms</div>
        <div className="tools">
          {/* the panel is narrow and sits at the right of the card, so the list
              hangs from the control's right edge or it leaves the card */}
          <PanelSelect multiple right head="Severity" anyLabel="All severities" id="a-sev"
                       options={SEVERITY_BANDS.map(b => ({
                         ...b, dot: b.value,
                         /* each row states how many of that band are open, so
                            the filter is also a count: it answers "is there
                            anything critical" before it is used */
                         count: list.filter(a => a.sev === b.value).length || undefined
                       }))}
                       value={severity} onChange={setSeverity} />
        </div>
      </div>

      <div className="alist">
        {shown.map(a => (
          <div className="arow" key={a.id}>
            <span className={'sev ' + a.sev} />
            <span className="amid">
              <span className="msg">{a.message}</span>
              <span className="meta">
                {a.device && <b>{a.device}</b>}
                {a.device && a.category ? ' · ' : ''}{a.category}
                {a.at ? ' · ' + a.at : ''}
              </span>
            </span>
            <span className={'atag ' + a.sev}>{TAG[a.sev] || String(a.sev).toUpperCase()}</span>
          </div>
        ))}
        {!shown.length && (
          <EmptyAlarms severity={severity} total={list.length} plantName={plantName}
                       onClear={() => setSeverity([])} />
        )}
      </div>
    </aside>
  );
}

const NICE = { critical: 'critical', alarm: 'alarm', warn: 'warning', event: 'event' };

/**
 * An empty list has to say WHICH kind of empty it is.
 *
 * "Nothing is wrong" and "you are filtering it out" look identical as a blank
 * card, and only one of them is good news — so the first is stated positively,
 * and the second names what is being hidden and offers the way back in one
 * click, rather than leaving the reader to find the control that caused it.
 */
function EmptyAlarms({ severity, total, plantName, onClear }) {
  if (!severity.length) {
    return (
      <div className="anone ok">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M8.2 12.4l2.6 2.6 5-5.4" />
        </svg>
        <span className="t">All clear</span>
        <span className="s">
          Nothing is open on {plantName || 'this plant'} right now.
        </span>
      </div>
    );
  }
  const names = severity.map(k => NICE[k] || k).join(' or ');
  return (
    <div className="anone">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 5.5h17l-6.6 7.6v5.3l-3.8 2.1v-7.4Z" />
      </svg>
      <span className="t">No {names} alarms</span>
      <span className="s">
        {total
          ? `${total} ${total === 1 ? 'alarm is' : 'alarms are'} open at other severities.`
          : 'Nothing is open on this plant right now.'}
      </span>
      {total > 0 && (
        <button className="clr" type="button" onClick={onClear}>Show all severities</button>
      )}
    </div>
  );
}
