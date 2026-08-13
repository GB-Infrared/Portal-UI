import { inr, num, DASH } from '../../lib/format';
import { BoltIcon, GaugeIcon, SunSmallIcon, LeafIcon, PeakIcon,
         CalendarIcon } from '../../components/icons';

const Dash = () => <span className="novalue">—</span>;

/**
 * The readouts, in a strip across the top.
 *
 * They used to stand in the left rail, but the rail is needed for the fleet -
 * which is the chart's selector and belongs beside it. Eight summary numbers
 * read fine on one line, and moving them buys the graph the full width.
 *
 * Today's energy sits between peak power and lifetime energy: the two "today"
 * readings stand together, and the day's total lands next to the total it rolls
 * up into. Both carry a sub-line, because otherwise they are two "kWh" numbers
 * side by side with nothing saying which window each covers.
 *
 * @param {Device[]} [props.devices] the fleet, summed for Energy today
 *
 * Plant power is still the hero: the only number that is true *right now*, so it
 * keeps the green wash, the meter bar and the LIVE chip.
 */
export function KpiStrip({ live, capacity, devices }) {
  const power = live && live.power;
  const pct = power != null && capacity ? (power / capacity) * 100 : null;

  /* Energy today is SUMMED from the fleet rather than read as its own figure,
     so the strip and the cards below it cannot drift apart - and so the total
     falls, visibly, when an inverter drops out. A plant-level `energyToday`
     still stands in when no device reports one, rather than showing a dash
     over data the backend did send. */
  const reporting = (devices || []).filter(d => d.energyToday != null);
  const energyToday = reporting.length
    ? reporting.reduce((t, d) => t + d.energyToday, 0)
    : (live && live.energyToday != null ? live.energyToday : null);

  return (
    <div className="kpistrip">
        <div className="kpi hero">
          <div className="lbl">
            Plant power <span className="livechip"><span className="ldot" />LIVE</span>
          </div>
          <div className="val">
            <span>{power != null ? num(power) : <Dash />}</span><span className="u">kW</span>
          </div>
          <div className="meterbar"><i style={{ width: Math.min(100, pct || 0) + '%' }} /></div>
          <div className="sub warn">
            {pct != null ? pct.toFixed(0) : '—'}% of {capacity ? num(capacity, 0) : '—'} kW capacity
          </div>
        </div>

        <div className="kpi">
          <div className="lbl">Peak power today</div>
          <span className="ico"><PeakIcon /></span>
          <div className="val">
            <span>{live && live.peakPower != null ? num(live.peakPower) : <Dash />}</span>
            <span className="u">kW</span>
          </div>
          <div className="sub">at <b>{(live && live.peakAt) || DASH}</b></div>
        </div>

        <Kpi label="Energy today" icon={<CalendarIcon />}
             value={energyToday != null ? inr(energyToday) : null} unit="kWh"
             sub={<><Delta now={energyToday} then={live && live.energyYesterdaySoFar} /> vs yesterday</>} />

        <Kpi label="Plant energy" icon={<BoltIcon />}
             value={live && live.energyTotal != null ? inr(live.energyTotal) : null} unit="kWh"
             sub="Lifetime" />

        <Kpi label="Performance ratio" icon={<GaugeIcon />}
             value={live && live.performanceRatio != null ? live.performanceRatio.toFixed(1) : null} unit="%" />

        <Kpi label="Irradiance" icon={<SunSmallIcon />}
             value={live && live.irradiance != null ? Math.round(live.irradiance) : null} unit="W/m2" />

        <div className="kpi">
          <div className="lbl">Revenue generated</div>
          <span className="ico">₹</span>
          <div className="val">
            <span className="u" style={{ margin: '0 3px 0 0' }}>₹</span>
            <span>{live && live.revenue != null ? inr(live.revenue) : <Dash />}</span>
          </div>
        </div>

        <Kpi label="CO₂ avoided" icon={<LeafIcon />}
             value={live && live.co2Avoided != null ? inr(live.co2Avoided) : null} unit="kg" />
    </div>
  );
}

/**
 * How today compares with yesterday at the same hour.
 *
 * A number on its own says nothing about whether the day is going well. The
 * comparison is against yesterday AT THIS POINT, which the backend sends as
 * `energyYesterdaySoFar` — comparing against a whole day would read as a
 * collapse every morning. With no comparable figure it shows a dash rather than
 * inventing one.
 */
function Delta({ now, then }) {
  if (now == null || then == null || !(then > 0)) return <span className="delta flat">—</span>;
  const pct = ((now - then) / then) * 100;
  const dir = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat';
  return <span className={'delta ' + dir}>{(pct >= 0 ? '+' : '') + pct.toFixed(1)}%</span>;
}

function Kpi({ label, icon, value, unit, sub }) {
  return (
    <div className="kpi">
      <div className="lbl">{label}</div>
      <span className="ico">{icon}</span>
      <div className="val">
        <span>{value != null ? value : <Dash />}</span><span className="u">{unit}</span>
      </div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
