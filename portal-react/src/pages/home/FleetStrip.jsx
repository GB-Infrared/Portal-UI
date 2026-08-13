import { num } from '../../lib/format';

const stateOf = d => (!d.online ? 'down' : d.warn ? 'warn' : 'ok');
const STATE_LABEL = { ok: 'RUNNING', warn: 'LOW OUTPUT', down: 'OFFLINE' };

/**
 * Home · inverter fleet.
 *
 * The alarms list beside it says which inverters stopped talking; this strip is
 * where that becomes a picture of the plant — who is carrying the load, who is
 * dark, and how far off its rating each running unit is.
 *
 * The tiles are also the only way in and out of the chart's per-inverter view,
 * now that the chart title is a label rather than a switch: clicking one charts
 * that inverter against irradiance, clicking the selected tile again returns
 * the chart to the plant total.
 *
 * @param {Device[]} props.devices   see data/contract.js
 * @param {number}  [props.capacity] plant AC rating, the fallback each unit is
 *                                   read against when it sends no `rated`
 * @param {string[]} props.selected  device ids currently on the chart; empty
 *                                  means the plant total
 */
export function FleetStrip({ devices, capacity, selected, onSelect, colorOf }) {
  const list = devices || [];
  const sel = selected || [];

  return (
    <>
      {list.length === 0
        ? <div className="fleetstrip"><div className="empty-note boxed">No devices</div></div>
        : (
          <div className="fleetstrip">
            {list.map(d => {
              const st = stateOf(d);
              /* an even split of the plant rating is the fallback: the design has
                 no per-inverter nameplate until a backend sends `rated` */
              const rated = d.rated || (capacity ? capacity / list.length : null);
              const pct = d.online && rated && d.power != null
                ? Math.min(100, (d.power / rated) * 100) : 0;
              const isSel = sel.includes(d.id);

              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={isSel}
                  className={'dev' + (isSel ? ' sel' : '') + (sel.length && !isSel ? ' mute' : '')}
                  /* the card is ringed in the colour its line is drawn in, so the
                     rail and the chart name the same inverter the same way */
                  style={colorOf ? { '--ring': colorOf(d.id) } : undefined}
                  onClick={() => onSelect(d.id)}
                  title={isSel ? `Remove ${d.id} from the chart` : `Add ${d.id} to the chart`}
                >
                  <span className="dev-top">
                    <span className={'dev-dot ' + st} />
                    <span className="dev-id">{d.id}</span>
                    <span className={'dev-st ' + st}>{STATE_LABEL[st]}</span>
                  </span>

                  {/* the live reading and the day's energy share a line, so a
                      card is two lines plus its bar - a rail this narrow cannot
                      afford four. The day's figure is spelled "kWh today": it
                      sits beside a kW reading, and without the word the two
                      numbers are only a unit apart. */}
                  <span className="dev-line">
                    <span className={'dev-val' + (d.online ? '' : ' dim')}>
                      <span>{d.online && d.power != null ? num(d.power) : '—'}</span>
                      <span className="u">kW</span>
                    </span>
                    {d.online && d.energyToday != null && (
                      <span className="dev-meta">{num(d.energyToday, 1)} kWh today</span>
                    )}
                  </span>

                  <span className="meterbar">
                    <i className={st === 'warn' ? 'amber' : undefined}
                       style={{ width: pct.toFixed(1) + '%' }} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
    </>
  );
}
