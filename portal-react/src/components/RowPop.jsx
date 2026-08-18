import { useEffect, useRef, useState } from 'react';

const NO_POP = { show: false, x: 0, y: 0, head: '', rows: [] };

/**
 * The row under the pointer, spelled out in full.
 *
 * A table wider than the screen is read by scrolling sideways, and a row read
 * sideways is a row half remembered: by the time the last column is on screen,
 * the device name that started it is not. Hovering a row lifts the WHOLE of it
 * out as a card — every column of that one row, label and value, in one place —
 * so the reading is taken in a glance instead of in two swipes.
 *
 * It reads the LIVE header and the LIVE cells rather than being handed the data
 * a second time. Four tables use this, and they hold their columns four different
 * ways — alarm columns, positional device readings, device/parameter pairs, KPI
 * series — so a shared prop shape would have had to be four shapes. Reading what
 * is actually rendered also means the card can never disagree with the table it
 * came out of, which is the whole reason to trust it.
 *
 * @param {React.RefObject} wrapRef  the .tablewrap holding one table
 */
export function RowPop({ wrapRef }) {
  const [pop, setPop] = useState(NO_POP);
  const el = useRef(null);
  const row = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const hide = () => { row.current = null; setPop(p => (p.show ? NO_POP : p)); };

    const onMove = e => {
      const tr = e.target.closest && e.target.closest('tbody tr');
      if (!tr || !wrap.contains(tr)) { hide(); return; }
      const cells = Array.prototype.slice.call(tr.cells);
      /* the "nothing here" row is one cell spanning the table — there is no
         reading to spell out */
      if (cells.length < 2) { hide(); return; }

      /* Flipping needs the card's size, and the card is measured from the render
         BEFORE this one — every row of a given table produces the same shape, so
         the previous measurement is the right one. */
      const box = el.current ? el.current.getBoundingClientRect() : { width: 260, height: 180 };
      let x = e.clientX + 20;
      let y = e.clientY + 18;
      if (x + box.width > window.innerWidth - 10) x = e.clientX - box.width - 20;
      if (y + box.height > window.innerHeight - 10) y = Math.max(10, e.clientY - box.height - 14);

      if (tr === row.current) { setPop(p => ({ ...p, x, y })); return; }
      row.current = tr;
      const labels = headerLabels(wrap.querySelector('table'));
      setPop({
        show: true, x, y,
        /* the first cell is the row's identity — its time stamp — so it heads the
           card rather than sitting in the list as one field among many */
        head: cells[0].textContent.trim(),
        rows: cells.map((td, i) => ({
          k: labels[i] || 'Column ' + (i + 1),
          v: td.textContent.trim() || '—'
        }))
      });
    };

    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', hide);
    /* it is pinned to the pointer, so anything that moves the page under it makes
       it a lie */
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      wrap.removeEventListener('mousemove', onMove);
      wrap.removeEventListener('mouseleave', hide);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [wrapRef]);

  return (
    <div className={'rowpop' + (pop.show ? ' on' : '')} ref={el}
         style={{ left: pop.x, top: pop.y }} aria-hidden="true">
      <div className="rp-h">{pop.head}</div>
      {/* past nine columns it lays out two pairs to a line, so a wide row does not
          become a tall column */}
      <div className={'rp-g' + (pop.rows.length > 9 ? ' two' : '')}>
        {pop.rows.map((r, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span className="rp-k">{r.k}</span>
            <span className={'rp-v' + (r.v === '—' ? ' nil' : '')}>{r.v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Column names, read off the header as it stands. A header cell can span rows and
 * columns, so the deck is laid out into a grid first and each column then reads
 * down its own line — which is what turns "INV06" over "P_AC (kW)" into one name
 * for one column on the two-deck tables.
 */
function headerLabels(table) {
  const head = table && table.tHead;
  if (!head) return [];
  const grid = [];
  Array.prototype.forEach.call(head.rows, (tr, r) => {
    grid[r] = grid[r] || [];
    let c = 0;
    Array.prototype.forEach.call(tr.cells, cell => {
      while (grid[r][c] !== undefined) c++;
      const rs = cell.rowSpan || 1;
      const cs = cell.colSpan || 1;
      /* the sort arrow is a control, not part of the column's name */
      const txt = cell.textContent.replace(/[\u25b2\u25bc]/g, '').trim();
      for (let i = 0; i < rs; i++) {
        grid[r + i] = grid[r + i] || [];
        for (let j = 0; j < cs; j++) grid[r + i][c + j] = txt;
      }
      c += cs;
    });
  });
  const n = grid.reduce((m, g) => Math.max(m, g.length), 0);
  const out = [];
  for (let c = 0; c < n; c++) {
    const parts = [];
    for (let r = 0; r < grid.length; r++) {
      const t = (grid[r] || [])[c];
      if (t && parts[parts.length - 1] !== t) parts.push(t);
    }
    out.push(parts.join(' · '));
  }
  return out;
}
