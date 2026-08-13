import { useLayoutEffect, useRef } from 'react';
import { useDateField } from '../lib/useDateField';
import { usePanel } from '../lib/usePanel';

const pad = n => String(n).padStart(2, '0');

/** One end of a time window: a date input and a time picker sharing one box. */
export function DateTimeField({ date, time, onChange, id }) {
  const dateRef = useDateField();
  const [h, m] = parseTime(time);

  return (
    <div className="dt">
      {/* a real date input, wired by useDateField so the WHOLE field opens the
          calendar, a second click shuts it, and clicking selects no text */}
      <input type="date" ref={dateRef} value={date || ''} id={id}
             onChange={e => onChange({ date: e.target.value, time })} />
      <div className="tpick">
        <TimeBit label={pad(h)} count={24} value={h}
                 onPick={v => onChange({ date, time: pad(v) + ':' + pad(m) })} />
        <span className="tsep">:</span>
        <TimeBit label={pad(m)} count={60} value={m}
                 onPick={v => onChange({ date, time: pad(h) + ':' + pad(v) })} />
      </div>
    </div>
  );
}

function parseTime(t) {
  const mt = /^(\d{1,2}):(\d{2})/.exec(t || '');
  return mt ? [+mt[1], +mt[2]] : [0, 0];
}

/** One half of the clock. Hours and minutes never open at the same time. */
function TimeBit({ label, count, value, onPick }) {
  const { open, toggle, close, ref } = usePanel();
  const listRef = useRef(null);

  /* Open on the value you already have — and SNAPPED to whole rows. A list
     resting part way into a row reads as a misprint even with nothing beside it
     to be out of step with. */
  useLayoutEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current;
    const on = el.querySelector('button.on');
    if (!on) return;
    const rows = el.querySelectorAll('button');
    const step = rows.length > 1 ? (rows[1].offsetTop - rows[0].offsetTop) : on.offsetHeight;
    el.scrollTop = Math.max(0, Math.round((on.offsetTop - el.clientHeight / 2) / step) * step);
  }, [open]);

  return (
    <button type="button" className={'tbit' + (open ? ' open' : '')} ref={ref}
            onClick={e => { e.stopPropagation(); toggle(); }}>
      {label}
      {open && (
        <div className="tlist" ref={listRef} onClick={e => e.stopPropagation()}>
          {Array.from({ length: count }, (_, i) => (
            <button type="button" key={i} className={i === value ? 'on' : undefined}
                    onClick={() => { onPick(i); close(); }}>{pad(i)}</button>
          ))}
        </div>
      )}
    </button>
  );
}
