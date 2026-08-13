import { num } from '../../lib/format';

/**
 * Every device lives in one list; the list itself scrolls inside the rail.
 * No paging — the scrollbar is the only way through a large fleet, so the rail
 * behaves the same at 7 devices and at 70.
 *
 * The scrollbar stays hidden until the list is hovered (see #strip in the
 * stylesheet), which keeps the rail quiet when nobody is using it.
 */
export function DeviceRail({ devices, plotted, selectedId, onHover }) {
  /* each card compares itself to the fleet, so a weak inverter is visible
     without opening anything */
  const online = devices.filter(d => d.online && d.energyTotal != null);
  const mean = online.length
    ? online.reduce((t, d) => t + d.energyTotal, 0) / online.length
    : 0;

  if (!devices.length) {
    return <div className="strip" id="strip"><div className="empty-note boxed">No devices</div></div>;
  }

  return (
    <div className="strip" id="strip">
      {devices.map(d => {
        const cls = d.online ? (d.warn ? 'warn' : 'on') : 'off';
        const label = d.online ? (d.warn ? 'CHECK' : 'PRODUCING') : 'OFFLINE';
        const ring = plotted && plotted.get(d.id);
        const pct = mean && d.energyTotal != null ? ((d.energyTotal - mean) / mean) * 100 : null;

        return (
          <div
            key={d.id}
            className={'dcard' + (d.online ? '' : ' is-off') + (ring ? ' plotted' : '') +
                       (d.id === selectedId ? ' sel' : '')}
            data-dev={d.id}
            style={ring ? { '--ring': ring } : undefined}
            onMouseEnter={() => onHover(d.id)}
            onClick={() => onHover(d.id)}
          >
            <div className="head">
              <span className="name"><i className={'sdot ' + cls} />{d.id}</span>
              <span className={'status ' + cls}>{label}</span>
            </div>
            {d.online && (
              <div className="foot">
                <span className="etot">
                  {d.energyTotal == null
                    ? <span className="novalue">—</span>
                    : <>{num(d.energyTotal)}<span className="eu">kWh</span></>}
                </span>
                {pct != null && (
                  <span className={'edelta ' + (pct >= 0 ? 'up' : 'down')}
                        title={`vs fleet average (${num(mean)} kWh)`}>
                    {(pct >= 0 ? '+' : '') + pct.toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
