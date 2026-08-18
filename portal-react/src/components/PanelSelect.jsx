import { usePanel } from '../lib/usePanel';

/**
 * The portal's dropdown, in both of its shapes.
 *
 * `multiple` decides which question it asks, and everything else follows from
 * that rather than from a prop per behaviour:
 *
 *   multiple  tick boxes, an All/None footer, and the panel STAYS OPEN — picking
 *             a second value is the point of the control. An empty selection
 *             means "everything", said in the muted voice, because that is what
 *             an unset filter does everywhere else on this portal.
 *   single    radios, no footer, and the panel closes on the pick: exactly one
 *             of these is true at a time, and the control should say so before
 *             it is used, not after.
 *
 * @param {Array<{value:string,label?:string,count?:number,dot?:string,
 *                 color?:string,note?:string}>} options
 *   `color` is a free colour — the swatch a column picker uses to tie a row to
 *   the line it draws — and sits BEFORE the label, where a reader looks for the
 *   thing being named. `dot` is the fixed severity class Alarms uses and stays
 *   after it. `note` is a short badge on the right, e.g. NO DATA.
 * @param {string[]|string|null} value   array when multiple, else the one value
 * @param {(next:string[]|string)=>void} onChange
 * @param {string} [anyLabel]  what an empty multiple selection is called
 * @param {string} [head]      panel heading
 * @param {boolean} [right]    hang the panel from the control's right edge
 * @param {string} [locked]    a row that is always on and cannot be unticked,
 *                             printed above the rest — a time stamp is not a
 *                             column you may drop, it is what makes the others
 *                             readings. Stated in the panel rather than left out
 *                             of it, or the export silently carries a column the
 *                             picker never mentioned.
 */
export function PanelSelect({ options, value, onChange, multiple, anyLabel = 'All',
                              head, right, title, id, fixedLabel, locked }) {
  const { open, toggle, close, ref } = usePanel();
  const list = options || [];
  const picked = multiple ? (value || []) : value;
  const labelOf = v => {
    const o = list.filter(x => x.value === v)[0];
    return (o && (o.label != null ? o.label : o.value)) || v;
  };

  /* `fixedLabel` is for a control that is NOT reporting a filter — the column
     picker names what it opens, not how many boxes are ticked inside it. "7
     selected" on a toolbar button says nothing a reader wanted to know. */
  const text = fixedLabel || (multiple
    ? (!picked.length ? anyLabel : picked.length === 1 ? labelOf(picked[0]) : `${picked.length} selected`)
    : (picked == null || picked === '' ? anyLabel : labelOf(picked)));
  const muted = !fixedLabel && (multiple ? !picked.length : (picked == null || picked === ''));

  function toggleOne(v, on) {
    const order = list.map(o => o.value);
    const next = on ? picked.concat(v) : picked.filter(x => x !== v);
    /* kept in the offered order, so "2 selected" always expands the same way */
    onChange(next.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  }

  return (
    <div className={'msel' + (open ? ' open' : '')} ref={ref} id={id}>
      <button type="button" className="mbtn" title={title}
              aria-expanded={open} aria-haspopup="listbox"
              onClick={e => { e.stopPropagation(); toggle(); }}>
        <span className={'mlab' + (muted ? ' any' : '')}>{text}</span>
      </button>

      {open && (
        <div className={'mpanel' + (right ? ' right' : '')} role="listbox">
          {head && <div className="mhead">{head}</div>}

          {locked && (
            <>
              <label className="mrow locked">
                <input type="checkbox" checked disabled readOnly />
                {locked}<span className="req">Required</span>
              </label>
              <div className="mdiv" />
            </>
          )}

          {!list.length && <div className="mrow" style={{ color: 'var(--faint)' }}>Nothing to choose</div>}

          {list.map(o => {
            const on = multiple ? picked.includes(o.value) : picked === o.value;
            return (
              <label className="mrow" key={o.value}>
                <input type={multiple ? 'checkbox' : 'radio'} checked={on}
                       name={multiple ? undefined : (id || head || 'one') + '-r'}
                       onChange={e => {
                         if (multiple) toggleOne(o.value, e.target.checked);
                         else { onChange(o.value); close(); }
                       }} />
                {o.color && <i className="sw" style={{ background: o.color }} />}
                {o.label != null ? o.label : o.value}
                {o.count != null && <span className="n">{o.count}</span>}
                {o.note && <span className="note">{o.note}</span>}
                {o.dot && <i className={o.dot} />}
              </label>
            );
          })}

          {multiple && list.length > 0 && (
            <div className="mfoot">
              <button type="button" onClick={() => onChange(list.map(o => o.value))}>All</button>
              <button type="button" onClick={() => onChange([])}>None</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
