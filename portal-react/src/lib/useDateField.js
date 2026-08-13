import { useCallback, useEffect, useRef } from 'react';

/**
 * Makes a whole `<input type="date">` behave like the button it looks like.
 *
 * A date input only reacts to a click on its 12px indicator glyph, so a click on
 * the number — which is most of the control, and where anyone aims — does
 * nothing. Three things have to be true for it to feel like a button:
 *
 * - **it toggles.** `showPicker()` has no matching close, so the second click
 *   blurs instead, which is what actually dismisses the native popup.
 * - **it selects nothing.** `preventDefault` on mousedown stops the segment
 *   highlight; focus is then given back deliberately so typing still works.
 * - **the open flag stays honest.** The popup can close without us — a pick, an
 *   Escape, a click elsewhere — so each of those resets it. Otherwise the next
 *   click would blur a picker that had already gone, and it would take two
 *   clicks to reopen.
 *
 * Usage: `<input type="date" ref={useDateField()} … />`
 */
export function useDateField() {
  const ref = useRef(null);
  const open = useRef(false);

  const shut = useCallback(() => { open.current = false; }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const onDown = e => {
      /* the indicator already toggles itself; taking it over would mean two
         handlers fighting over the same popup */
      if (e.offsetX >= el.clientWidth - 26) return;
      e.preventDefault();
      if (open.current) { el.blur(); open.current = false; return; }
      el.focus({ preventScroll: true });
      if (el.showPicker) { try { el.showPicker(); open.current = true; } catch { /* unsupported */ } }
    };
    const onKey = e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (open.current) { el.blur(); open.current = false; return; }
      if (el.showPicker) { try { el.showPicker(); open.current = true; } catch { /* unsupported */ } }
    };
    const onDocDown = e => { if (e.target !== el) shut(); };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', shut);
    el.addEventListener('change', shut);
    document.addEventListener('mousedown', onDocDown, true);
    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', shut);
      el.removeEventListener('change', shut);
      document.removeEventListener('mousedown', onDocDown, true);
    };
  }, [shut]);

  return ref;
}
