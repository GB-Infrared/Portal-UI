import { useCallback, useEffect, useRef, useState } from 'react';

/* Every dropdown on a page registers here, so opening one closes the rest.
   Module scope, not context: these panels appear in a filter bar, in a card
   head and inside a hover panel, and threading a provider through all three to
   express "only one of you at a time" would be ceremony around a single rule. */
const OPEN = new Set();

/**
 * Open/close for a panel dropdown.
 *
 * Handles the three things every one of them needs and each would otherwise
 * re-implement slightly differently: only one open at a time, a click outside
 * closes, Escape closes. The click listener is bound in the CAPTURE phase and
 * the trigger stops propagation, so a click on the button toggles rather than
 * closing and reopening in the same gesture.
 */
export function usePanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    OPEN.add(close);
    return () => { OPEN.delete(close); };
  }, [close]);

  const toggle = useCallback(() => {
    setOpen(was => {
      if (!was) OPEN.forEach(fn => { if (fn !== close) fn(); });
      return !was;
    });
  }, [close]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (!ref.current || !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, toggle, close, ref };
}
