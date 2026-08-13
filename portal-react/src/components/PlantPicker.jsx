import { usePanel } from '../lib/usePanel';

/**
 * Choosing a site, by what it is rather than only by its name.
 *
 * The options are cards, not rows, because "which plant" is rarely answered
 * from the name alone — an operator picks the one with alarms open, or the one
 * whose capacity matches what they are about to look at. What appears on the
 * second line is the PAGE's business, so it comes in as `renderState(plant)`:
 * Monitoring states capacity and device count, Alarms states what is open.
 * Nothing is invented here; a page that has nothing to say passes nothing and
 * the card is just the name.
 *
 * @param {Array} plants        from the data contract
 * @param {string[]|string|null} value  array when multiple
 * @param {(next)=>void} onChange
 * @param {boolean} [multiple]  several sites at once (an alarm desk watches a
 *                              portfolio); single elsewhere, because one chart
 *                              and one rail cannot read two sites at once
 * @param {(p)=>React.ReactNode} [renderState]
 */
export function PlantPicker({ plants, value, onChange, multiple, renderState,
                              anyLabel = 'All plants', wide, id }) {
  const { open, toggle, close, ref } = usePanel();
  const list = plants || [];
  const picked = multiple ? (value || []) : value;
  /* Takes an ID and always returns a STRING. It used to fall back to whatever
     it was handed, which meant one call site passing a plant OBJECT by mistake
     put that object straight into the JSX — React's "Objects are not valid as a
     React child", from a helper that looked harmless. */
  const nameOf = pid => {
    const p = list.filter(x => x.id === pid)[0];
    return (p && (p.name || p.id)) || (pid == null ? '' : String(pid));
  };

  /* Before the provider has adopted a plant, the button names the one it is
     ABOUT to adopt — the first on offer — rather than flashing a placeholder
     that is replaced a frame later. */
  const text = multiple
    ? (!picked.length ? anyLabel : picked.length === 1 ? nameOf(picked[0]) : `${picked.length} selected`)
    : (picked == null ? (list.length ? nameOf(list[0].id) : anyLabel) : nameOf(picked));
  const muted = multiple ? !picked.length : picked == null;

  function pick(pid) {
    if (!multiple) { onChange(pid); close(); return; }
    const order = list.map(p => p.id);
    const next = picked.includes(pid) ? picked.filter(x => x !== pid) : picked.concat(pid);
    /* the panel stays open — picking a second site is the point of the control */
    onChange(next.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  }

  return (
    <div className={'msel' + (open ? ' open' : '')} ref={ref} id={id}>
      <button type="button" className="mbtn" aria-expanded={open}
              onClick={e => { e.stopPropagation(); toggle(); }}>
        <span className={'mlab' + (muted ? ' any' : '')}>{text}</span>
      </button>

      {open && (
        <div className={'mpanel pplant' + (wide ? ' wide' : '')}>
          {!list.length && <div className="mrow" style={{ color: 'var(--faint)' }}>No plants</div>}

          {list.map(p => {
            const on = multiple ? picked.includes(p.id) : picked === p.id;
            return (
              <button type="button" key={p.id} value={p.id}
                      className={'pcard' + (on ? ' on' : '')}
                      aria-pressed={multiple ? on : undefined}
                      aria-current={!multiple && on ? 'true' : undefined}
                      title={p.address ? `${p.name || p.id} · ${p.address}` : (p.name || p.id)}
                      onClick={() => pick(p.id)}>
                <span className="top"><span className="nm">{p.name || p.id}</span></span>
                {renderState && <span className="row">{renderState(p)}</span>}
              </button>
            );
          })}

          {multiple && list.length > 0 && (
            <div className="mfoot">
              <button type="button" onClick={() => onChange(list.map(p => p.id))}>All</button>
              <button type="button" onClick={() => onChange([])}>None</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
