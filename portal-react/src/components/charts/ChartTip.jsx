/** The floating read-out shared by every chart. */
export function ChartTip({ tip }) {
  return (
    <div className="tip" style={{ left: tip.x, top: tip.y, opacity: tip.show ? 1 : 0 }}>
      {tip.title && <div className="tt">{tip.title}</div>}
      {(tip.rows || []).map((r, i) => (
        <div className="tr" key={i}>
          <i style={{ background: r.color }} />{r.label}<b>{r.value}</b>
        </div>
      ))}
    </div>
  );
}

export const NO_TIP = { show: false, x: 0, y: 0, title: '', rows: [] };

/**
 * Place the tip beside the hovered column, flipping to the left when it would
 * overflow the chart, and sit it just above the highest value on show.
 */
export function placeTip({ svgRect, wrapRect, xUnits, yUnits, w, h, width = 165, lift = 10 }) {
  const ox = svgRect.left - wrapRect.left;
  const oy = svgRect.top - wrapRect.top;
  let x = (xUnits / w) * svgRect.width + ox + 14;
  if (x + width > wrapRect.width) x -= width + 28;
  const y = Math.max(4, (yUnits / h) * svgRect.height + oy - lift);
  return { x, y };
}
