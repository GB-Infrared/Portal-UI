import { fixed } from '../../lib/format';
import { BoltIcon, CloseIcon } from '../../components/icons';

const C = 2 * Math.PI * 30;   // gauge circumference, r = 30

/**
 * Device detail.
 *
 * The panel is a flex SIBLING of the chart, not an overlay: showing it narrows
 * the graph, and the chart's ResizeObserver re-fits the plot to what is left.
 * Its height is capped to the graph's, measured while it is still hidden, so
 * opening it never stretches the row — a long read-out scrolls instead.
 */
export function DevicePanel({ device, maxHeight, onClose }) {
  if (!device) return null;

  const rated = device.rated;
  const pct = rated && device.power != null
    ? Math.max(0, Math.min(1, device.power / rated))
    : 0;

  const ac = [
    ['S_AC', device.apparent, 'kVA', 2],
    ['Q_AC', device.reactive, 'kVAR', 2],
    ['F_AC', device.frequency, 'Hz', 2],
    ['COS_PHI', device.powerFactor, '', 3]
  ];
  const currents = device.currents || [];

  return (
    <div className="card panel" id="devpanel" aria-labelledby="lp-name"
         style={maxHeight ? { maxHeight } : undefined}>
      <div className="chead">
        <div className="devico"><BoltIcon size={17} /></div>
        <div className="pinfo">
          <div className="nm">
            <span id="lp-name">{device.id}</span>
            <span className={'pill ' + (device.online ? 'on' : 'offp')}>
              {device.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="mdl">{device.model || '—'}</div>
        </div>
        <button className="iconbtn mclose" onClick={onClose} title="Close (Esc)" aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      <div className="pbody">
        <div className="gaugebox">
          <svg width="66" height="66" viewBox="0 0 72 72">
            <circle className="gtrack" cx="36" cy="36" r="30" fill="none" strokeWidth="7" />
            <circle className="garc" cx="36" cy="36" r="30" fill="none" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray={C.toFixed(1)}
                    strokeDashoffset={(C * (1 - pct)).toFixed(1)}
                    transform="rotate(-90 36 36)"
                    style={{ transition: 'stroke-dashoffset .6s' }} />
            <text className="gpct" x="36" y="41" textAnchor="middle" fontSize="14"
                  fontWeight="800" fontFamily="ui-monospace,monospace">
              {rated ? Math.round(pct * 100) + '%' : '—'}
            </text>
          </svg>
          <div className="txt">
            <div className="big"><span>{fixed(device.power, 2)}</span><span className="u">kW</span></div>
            <div className="cap">P_AC{rated ? ` · of ${rated} kW rated` : ''}</div>
          </div>
        </div>

        <div className="ptitle">AC output</div>
        <div className="pgrid">
          {ac.map(([label, value, unit, dp]) => (
            <div className="pv" key={label}>
              <div className="v">
                <span>{fixed(value, dp)}</span>{unit && <span className="u">{unit}</span>}
              </div>
              <div className="l">{label}</div>
            </div>
          ))}
        </div>

        <div className="ptitle">AC current</div>
        <div className="pgrid three">
          {[0, 1, 2].map(i => (
            <div className="pv" key={i}>
              <div className="v"><span>{fixed(currents[i], 2)}</span><span className="u">A</span></div>
              <div className="l">I_AC{i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
