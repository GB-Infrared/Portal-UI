import { useEffect, useRef, useState } from 'react';
import { MONTHS_SHORT, MONTHS_LONG } from '../data/constants';
import { CalendarIcon } from './icons';

const YSPAN = 12;   // one page of years, a 3x4 grid like the months

/**
 * Month + year picker — **year first, then month.**
 *
 * The old shape asked for the month while the year sat behind two chevrons, so
 * reaching March 2024 meant guessing how many times to press an arrow with the
 * months of the wrong year on screen the whole time. Opening on a grid of years
 * asks the coarse question first and the fine one second, which is the order the
 * answer is actually known in.
 *
 * Never a day grid: both charts it drives are whole-month series, so a day would
 * ask a question neither of them can answer.
 */
export function MonthPicker({ year, month, onPick, label = 'Month & year' }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('year');
  const [viewYear, setViewYear] = useState(year);
  const [page, setPage] = useState(Math.floor(year / YSPAN) * YSPAN);
  const root = useRef(null);

  /* every opening starts at the coarse question again, on the page holding the
     year currently in force — not wherever the last visit wandered to */
  useEffect(() => {
    if (!open) return;
    setStep('year');
    setViewYear(year);
    setPage(Math.floor(year / YSPAN) * YSPAN);
  }, [open, year]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (root.current && !root.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const stop = fn => e => { e.stopPropagation(); fn(); };

  return (
    <div className="mpick" ref={root}>
      {/* the floating label is for a picker standing on its own, as on Home. In a
          filter bar the field above it is already labelled, and two labels for one
          control read as two controls - so `label={null}` drops it. */}
      {label && <span className="fl">{label}</span>}
      <button className="mpick-btn" type="button" aria-expanded={open}
              onClick={stop(() => setOpen(o => !o))}>
        <span className="mpick-lab">{MONTHS_LONG[month]} {year}</span>
        <CalendarIcon />
      </button>

      <div className="mpick-panel" hidden={!open}>
        {step === 'year' ? (
          <>
            <div className="mpick-head">
              <button type="button" aria-label="Earlier years"
                      onClick={stop(() => setPage(p => p - YSPAN))}>&lsaquo;</button>
              <span className="yr">{page} – {page + YSPAN - 1}</span>
              <button type="button" aria-label="Later years"
                      onClick={stop(() => setPage(p => p + YSPAN))}>&rsaquo;</button>
            </div>
            <div className="mpick-grid">
              {Array.from({ length: YSPAN }, (_, i) => page + i).map(y => (
                <button key={y} type="button" className={y === year ? 'on' : undefined}
                        onClick={stop(() => { setViewYear(y); setStep('month'); })}>
                  {y}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* the head becomes the way back, so a year is never a dead end */}
            <div className="mpick-head">
              <button type="button" aria-label="Choose another year"
                      onClick={stop(() => {
                        setPage(Math.floor(viewYear / YSPAN) * YSPAN);
                        setStep('year');
                      })}>&lsaquo;</button>
              <span className="yr">{viewYear}</span>
              <span style={{ width: 26 }} />
            </div>
            <div className="mpick-grid">
              {MONTHS_SHORT.map((name, i) => (
                <button key={name} type="button"
                        className={i === month && viewYear === year ? 'on' : undefined}
                        onClick={stop(() => { setOpen(false); onPick(viewYear, i); })}>
                  {name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
