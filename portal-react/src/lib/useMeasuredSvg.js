import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Chart geometry is MEASURED, not fixed — the technique the HTML prototype uses.
 *
 * The viewBox is re-cut to the container's pixel size so 1 SVG unit == 1 CSS px:
 * the plot re-fits the space it is given instead of scaling with it, which keeps
 * label size constant and holds the height inside a readable band.
 *
 * @param {Object}  o
 * @param {number}  o.ratio     height as a fraction of width
 * @param {number}  o.min       height floor, px
 * @param {number}  o.max       height ceiling, px
 * @param {number} [o.pad]      horizontal padding to subtract from the wrapper
 * @param {Object} [o.basisRef] optional element whose width drives the HEIGHT.
 *                              The monitoring chart uses the whole row, so the
 *                              graph does not get shorter when the detail panel
 *                              opens beside it.
 * @param {number} [o.height]   an explicit height, overriding the ratio. Home
 *                              sizes both chart rows from the viewport rather
 *                              than from their own width — sized on width alone
 *                              the page was wrong in both directions at once,
 *                              scrolling on a short screen and leaving bare page
 *                              on a tall one. Width is still measured, so the
 *                              plot re-cuts when a panel opens beside it.
 * @returns {[React.RefObject, {w:number,h:number}]}
 */
export function useMeasuredSvg({ ratio, min, max, pad = 20, basisRef = null, height = 0 }) {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let raf = 0;
    const measure = () => {
      const w = Math.max(280, Math.round(el.clientWidth - pad));
      const basis = (basisRef && basisRef.current) ? basisRef.current.clientWidth : w;
      const h = height > 0
        ? Math.round(height)
        : Math.round(Math.min(max, Math.max(min, basis * ratio)));
      setBox(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    if (basisRef && basisRef.current) ro.observe(basisRef.current);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [ratio, min, max, pad, basisRef, height]);

  return [ref, box];
}
