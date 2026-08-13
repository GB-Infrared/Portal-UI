import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const MIN_LINE = 150, MAX_LINE = 320, MIN_MONTH = 140, MAX_MONTH = 430;
const SHARE = 0.52;

/**
 * Home · how tall the two chart rows may be.
 *
 * Both rows are sized from the height actually left below the KPI strip, split
 * between them, instead of from their own width. Sizing on width meant the page
 * was wrong in both directions at once — 97px of scroll on a 768-high laptop and
 * 151px of bare page on a 1080p monitor. One budget fixes both, because the
 * thing that varies is the screen, not the chart.
 *
 * The day curve gets the larger share, since it is read for shape rather than
 * one bar at a time, but it is capped: past ~320px it is only taller, not
 * clearer.
 *
 * **Floors are a last resort, not a preferred size.** Held high they stop being
 * a floor for the chart and become a floor for the page: the budget cannot be
 * met, so the overflow goes to the scrollbar instead of to the charts.
 *
 * This cannot loop even though it observes the column: the answer is derived
 * from where the row STARTS and from the viewport, and neither depends on how
 * tall the charts end up. A second pass computes the same numbers and settles.
 *
 * @param {Object} o.rowRef    the .g-main row — its top is the budget's origin
 * @param {Object} o.mainRef   the column, observed for changes
 * @param {Object} o.pageRef   the page, for its bottom padding
 * @param {Object} o.lineRef   the day-curve card, to measure its non-plot chrome
 * @param {Object} o.monthRef  one month card, likewise
 * @param {boolean} o.holdLine keep the curve at its resting height (the plant
 *                             picker is open — see below)
 * @param {boolean} o.frozen   freeze the whole budget (the alarms panel is open)
 */
export function useChartBudget({ rowRef, mainRef, pageRef, lineRef, monthRef, holdLine, frozen }) {
  const [size, setSize] = useState({ line: 0, month: 0 });
  const resting = useRef(null);   // the last size measured with nothing open

  const measure = useCallback(() => {
    const row = rowRef.current, main = mainRef.current, page = pageRef.current;
    const lineCard = lineRef.current, monthCard = monthRef.current;
    if (!row || !main || !page || !lineCard || !monthCard) return;

    /* Frozen while the alarms panel is open. The line card's chrome is measured
       from a live box, and narrowing it moves that measurement by a fraction of
       a pixel — enough to push the floored split one pixel the other way and
       twitch both month charts. Opening an alarm list should change no height
       at all, so the whole budget is held, not just the chart that gives up the
       width. */
    if (frozen && resting.current) { setSize(resting.current); return; }

    /* .chartwrap svg, not the first svg in the card - the card head carries a
       calendar glyph and legend chips, so a bare querySelector measured a 14px
       icon as "the plot" and reported the chrome as 344px instead of 72, which
       starved the budget and left a third of the page empty */
    const lineSvg = lineCard.querySelector('.chartwrap svg');
    const monthSvg = monthCard.querySelector('.chartwrap svg');
    const lineChrome = lineCard.offsetHeight - (lineSvg ? lineSvg.getBoundingClientRect().height : 0);
    const monthChrome = monthCard.offsetHeight - (monthSvg ? monthSvg.getBoundingClientRect().height : 0);

    const top = row.getBoundingClientRect().top + window.scrollY;
    const colGap = parseFloat(getComputedStyle(main).rowGap) || 14;
    const padBottom = parseFloat(getComputedStyle(page).paddingBottom) || 16;
    const budget = document.documentElement.clientHeight
      - top - padBottom - colGap - lineChrome - monthChrome;
    if (!(budget > 0)) return;

    /* floor, not round: the two shares have to sum to AT MOST the budget, and
       rounding each up put the page one pixel over and gave it a scrollbar */
    let line = holdLine && resting.current
      ? resting.current.line
      : Math.floor(Math.min(MAX_LINE, Math.max(MIN_LINE, budget * SHARE)));
    let month = Math.floor(Math.min(MAX_MONTH, budget - line));

    /* the month charts absorb first — they are furthest from the pointer — but
       once they are on the floor the day curve has to give way as well, or the
       page takes the difference and that is the scrollbar again */
    const mFloor = holdLine ? 110 : MIN_MONTH;
    if (month < mFloor) { line = Math.max(holdLine ? 140 : MIN_LINE, line - (mFloor - month)); month = mFloor; }

    const next = { line, month };
    if (!holdLine && !frozen) resting.current = next;
    setSize(prev => (prev.line === next.line && prev.month === next.month ? prev : next));
  }, [rowRef, mainRef, pageRef, lineRef, monthRef, holdLine, frozen]);

  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    if (mainRef.current) ro.observe(mainRef.current);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, mainRef]);

  return size;
}
