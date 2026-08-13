import { useCallback, useEffect, useRef, useState } from 'react';
import { num } from '../../lib/format';

/**
 * Home · the plant header, and the switcher built into it.
 *
 * Clicking or hovering the name opens the header downward onto one card per
 * plant. Two earlier passes treated "switch plant" as a menu problem: cycling
 * could not show you what you were choosing between, and a strip of chips could,
 * but only a name and a rating — enough to *identify* a plant, not to *decide*
 * on one. Switching is rarely "take me to Rioja"; it is "which site needs me
 * right now", and neither could answer that.
 *
 * So the cards carry what the decision turns on: what each site is making right
 * now against its rating, and how many alarms are open on it. You pick a plant
 * already knowing its state.
 *
 * Because the panel is a ROW OF THE HEADER rather than a layer above it, it
 * pushes the page down instead of covering it — nothing is ever obscured. The
 * cost is real height while open, which `Home` absorbs by letting the month
 * charts give way (see `chartBudget` there), so the page still does not scroll.
 *
 * The per-plant readings on the cards come from the plant objects themselves
 * (`livePower`, `activeAlarms` in the contract) — nothing here computes a number
 * the backend did not send, and a plant that omits them shows a dash.
 *
 * @param {Plant[]}  props.plants  every plant the user can reach
 * @param {Function} props.onPick  called with a plant id
 * @param {Function} [props.onOpenChange] told when the panel opens or shuts
 */
export function PlantSwitch({ plant, plants, onPick, onOpenChange }) {
  const list = plants || [];
  const [open, setOpen] = useState(false);
  const hideT = useRef(0);
  const zoneRef = useRef(null);

  /* the page below has to know: the panel takes ~85px, and Home hands that back
     by letting the month charts give way rather than letting the page scroll */
  useEffect(() => { if (onOpenChange) onOpenChange(open); }, [open, onOpenChange]);

  const show = useCallback(() => { clearTimeout(hideT.current); setOpen(true); }, []);
  const hide = useCallback(() => {
    clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setOpen(false), 150);
  }, []);

  /* The name and the panel are not adjacent — the address line sits between
     them — so the pointer leaves both while crossing. The grace period is what
     lets it, and a document-level watch is what tells us it landed somewhere
     that counts, since React's onMouseLeave fires per element. */
  useEffect(() => {
    if (!open) return undefined;
    const onMove = e => {
      const t = e.target;
      const inside = t.closest && (t.closest('.pswitch') || t.closest('.pexpand'));
      if (inside) clearTimeout(hideT.current); else hide();
    };
    const onKey = e => { if (e.key === 'Escape') { clearTimeout(hideT.current); setOpen(false); } };
    document.addEventListener('mouseover', onMove);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mouseover', onMove);
      document.removeEventListener('keydown', onKey);
      clearTimeout(hideT.current);
    };
  }, [open, hide]);

  function pick(id) {
    clearTimeout(hideT.current);
    setOpen(false);
    if (id !== (plant && plant.id)) onPick(id);
  }

  const switchable = list.length > 1;

  return (
    <section className="planthead">
      {/* the name/capacity line; the picker is a sibling BELOW it, not a wrapped
          flex item — `gap` sets row-gap too, so a second flex line reserves its
          gap whether or not the line has any height, and the closed header
          silently grew by 28px */}
      <div className="phrow">
        <div className="pname">
          <div className="pswitch">
            <button className="pname-btn" type="button" disabled={!switchable}
                    aria-expanded={open} aria-controls="p-exp"
                    title={switchable ? 'Switch plant' : undefined}
                    onClick={() => switchable && setOpen(o => !o)}
                    onMouseEnter={switchable ? show : undefined}
                    onFocus={switchable ? show : undefined}>
              <span className="n">{(plant && plant.name) || 'No plant selected'}</span>
            </button>
          </div>
          <div className="addr">{(plant && plant.address) || ''}</div>
        </div>

        <div className="caps">
          <div className="cap">
            <div className="k">AC capacity</div>
            <div className="v">
              {plant && plant.acCapacity != null ? num(plant.acCapacity, 2) : '—'}<span className="u">kW</span>
            </div>
          </div>
          <div className="cap">
            <div className="k">DC capacity</div>
            <div className="v">
              {plant && plant.dcCapacity != null ? num(plant.dcCapacity, 2) : '—'}<span className="u">kWp</span>
            </div>
          </div>
        </div>
      </div>

      {/* a row of the header, not a layer over the page */}
      <div className={'pexpand' + (open ? ' open' : '')} id="p-exp" ref={zoneRef}>
        <div className="pgrid">
          {list.map(p => {
            const on = p.id === (plant && plant.id);
            const pw = p.livePower;
            const alarms = p.activeAlarms;
            const pct = pw != null && p.acCapacity ? Math.min(100, (pw / p.acCapacity) * 100) : 0;
            return (
              <button key={p.id} type="button" className={'pcard' + (on ? ' on' : '')}
                      aria-current={on} onClick={() => pick(p.id)}
                      title={[p.name, p.address].filter(Boolean).join(' · ')}>
                {/* identity on the first line, state on the second */}
                <span className="top">
                  <span className="nm">{p.name}</span>
                  <span className="ad">{p.address || ''}</span>
                </span>
                <span className="row">
                  <span className="pw">{pw != null ? num(pw) : '—'}</span>
                  <span className="u">kW</span>
                  <span className="cap">of {p.acCapacity != null ? num(p.acCapacity, 0) : '—'} kW</span>
                  <span className={'alm ' + (alarms ? 'hot' : 'cold')}>
                    {alarms == null ? '—'
                      : alarms ? alarms + ' ALARM' + (alarms === 1 ? '' : 'S')
                      : 'ALL CLEAR'}
                  </span>
                </span>
                <span className="meterbar"><i style={{ width: pct.toFixed(1) + '%' }} /></span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
