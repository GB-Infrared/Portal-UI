import { useEffect, useRef } from 'react';

/**
 * The hover rule both pages use: an element stays open while the pointer is on
 * its trigger OR on the panel itself, and closes the moment it goes anywhere
 * else — with a short grace period so crossing the gap between the two does not
 * dismiss it.
 *
 * @param {Object}   o
 * @param {string[]} o.selectors   CSS selectors that count as "inside"
 * @param {boolean}  o.isOpen
 * @param {Function} o.onClose
 * @param {Function} [o.onOpen]    supply to open on hover as well as on click
 * @param {number}   [o.grace]     ms to wait before closing
 * @param {boolean}  [o.closeOnEscape]
 */
export function useHoverZone({ selectors, isOpen, onClose, onOpen, grace = 150, closeOnEscape = true }) {
  const timer = useRef(0);
  const cb = useRef({ onOpen, onClose });
  cb.current = { onOpen, onClose };

  useEffect(() => {
    const inside = target =>
      !!(target && target.closest && selectors.some(s => target.closest(s)));

    const onMouseOver = e => {
      if (inside(e.target)) {
        clearTimeout(timer.current);
        if (!isOpen && cb.current.onOpen) cb.current.onOpen();
      } else if (isOpen) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => cb.current.onClose(), grace);
      }
    };

    document.addEventListener('mouseover', onMouseOver);
    return () => {
      document.removeEventListener('mouseover', onMouseOver);
      clearTimeout(timer.current);
    };
  }, [isOpen, grace, selectors.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!closeOnEscape) return undefined;
    const onKey = e => { if (e.key === 'Escape') cb.current.onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeOnEscape]);
}
