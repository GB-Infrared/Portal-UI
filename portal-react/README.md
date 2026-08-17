# ENEROPS OS — React build

The React port of the five prototype pages — `home.html`, `monitoring.html`,
`alarms.html`, `analysis.html` and `kpi.html`.

This is the **presentation layer only**. It ships with no data of any kind: no
sample plants, no fake inverters, no invented readings. Every page renders its
full design and shows an empty state where a value would go, so what a backend
developer plugs into is the finished UI and nothing to unpick first.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
```

---

## Connecting a backend

One function. In `src/App.jsx`:

```jsx
<PortalDataProvider fetchData={loadPortal}>
```

`loadPortal(query, { signal })` returns (or resolves to) an object matching
`src/data/contract.js`. The provider calls it whenever the user changes a
selector — plant, device type, data point, day, month — and again on the refresh
interval chosen in the top bar. `signal` aborts a request that a newer one has
already superseded.

```js
async function loadPortal(query, { signal }) {
  const r = await fetch(`/api/portal?plant=${query.plantId}&day=${query.day}`, { signal });
  if (!r.ok) throw new Error(r.statusText);
  const api = await r.json();

  return {
    plants: api.plants,
    plant:  api.plant,
    live:   api.live,
    devices: api.devices,
    alarms:  api.alarms,
    devicePower: {
      series: api.inverters.map(i => ({
        id: i.name,
        points: i.samples.map(s => ({ t: hoursFromISO(s.at), v: s.pac }))
      })),
      now: hoursFromISO(api.serverTime)
    }
    // …anything you omit simply stays empty
  };
}
```

Every field is optional. Send half the contract and half the page fills in; the
rest keeps its empty state rather than breaking the layout.

### Time convention

Chart x-axes are laid out over a 24-hour day, so **every series point carries
`t` as decimal hours in plant-local time** — `0` midnight, `12.5` half past
twelve, `19.35` = 19:21. `hoursFromISO()` in `src/lib/format.js` converts a
timestamp. Values use `v`, and `v: null` breaks the line rather than dropping it
to zero, which is what you want for a comms gap.

---

## Layout of the source

```
src/
  data/
    contract.js      every shape the UI expects — start here
    constants.js     fixed option lists and chart geometry (design, not data)
    PortalData.jsx   the provider; the only file that needs editing to wire up
  lib/
    format.js        null-safe formatters — absent data prints "—", never NaN
    path.js          SVG line/area builders, gap-aware
    useMeasuredSvg.js  the measured-viewBox technique (see below)
    useHoverZone.js  the shared open-while-hovered rule
    useTheme.js      light default, dark opt-in, remembered
  components/
    TopBar, Drawer, MonthPicker, Toasts, icons
    charts/          DevicePowerChart, PowerIrradianceChart,
                     DailyBarChart, GroupedBarChart, KpiBarChart,
                     AnalysisChart, Axes, ChartTip
  pages/
    Home.jsx         + home/PlantSwitch, KpiStrip, AlarmsBox, FleetStrip
    Monitoring.jsx   + monitoring/DeviceRail, DevicePanel, HistoryTable
    Alarms.jsx       (uses the shared controls above)
    Analysis.jsx     + analysis/AnalysisTable, pairs.js
    Kpi.jsx          + kpi/KpiTable
  styles/            see below
```

## The shared controls

Every filter on every page opens the same control, and they live in
`components/` rather than in any one page:

| component | what it is |
|---|---|
| `PanelSelect` | the dropdown. `multiple` = tick boxes, an All/None footer and a panel that stays open; single = radios that close on the pick |
| `PlantPicker` | choosing a site by its state, not just its name — the page supplies the card's second line through `renderState` |
| `DateTimeField` | a date input plus two time dropdowns that are never open together |
| `usePanel` | one open at a time, click-outside, Escape |

An empty selection in any multi-select means **no narrowing** — all plants,
every severity. A backend that reads it as "none" will show a blank first load.

---

## Styles: generated once, hand-maintained since

`tools/build-css.py` (`npm run build:css`) bootstrapped `src/styles/` from the
two original prototypes. **Do not run it now.** The sheets have been edited by
hand since, and three files it knows nothing about have been added; regenerating
would overwrite the page sheets with the prototypes' inline CSS and reintroduce
the duplicated chrome that was deliberately extracted. Treat the script as a
record of where the CSS came from, not as a build step.

The prototypes are still the design source of truth — changes are made there
first, reviewed, then ported here by hand.

| file | what it holds |
|---|---|
| `tokens.css` | the two `:root` blocks — light, and `[data-theme="dark"]` |
| `base.css` | reset, scrollbars, element defaults |
| `chrome.css` | the top bar — **unscoped**, because the same header sits above every page. It used to be copied into each page sheet, and the copies had already drifted apart |
| `controls.css` | the shared dropdown, plant cards and date+time field — likewise one copy for all pages |
| `page-home.css` | home's own rules, scoped under `.page-home` |
| `page-monitoring.css` | monitoring's own rules, scoped under `.page-monitoring` |
| `page-alarms.css` | alarms' own rules, scoped under `.page-alarms` |
| `app.css` | empty states and toasts |

The page sheets are scoped because `.kpi`, `.field`, `.pill` and `.rail` mean
different things on each page and would otherwise collide. Anything genuinely
shared belongs in `chrome.css` or `controls.css` instead of being copied. `App.jsx` puts
the active page's class on the wrapper that the whole chrome sits inside.

Two things the generator does on the way through, both listed at the top of
`tools/build-css.py`: it renames the prototype's chart element ids to the classes
the components use (`#nowl` → `.nowline`), and it drops the rules that bind a
colour to one specific device (`#l06{stroke:var(--green)}`) — React takes that
colour from the series instead, so it works for any fleet.

**If you only received this app and not the prototypes**, you never need this
script: `src/styles/` is already generated and checked in. Running it will say
so rather than fail obscurely.

**Colour never appears outside `tokens.css`.** That is what makes dark mode a
single attribute flip, and it is worth keeping true.

---

## Two techniques worth knowing before you edit

**Charts are measured, not scaled.** `useMeasuredSvg` re-cuts each SVG's
viewBox to its container's pixel size, so one SVG unit is one CSS pixel. The
plot re-fits the space it is given instead of stretching: label sizes stay
constant and the height stays inside a readable band at any window width. A
`ResizeObserver`, throttled through `requestAnimationFrame`, drives it.

**Hover-open elements share one rule.** `useHoverZone` keeps a panel open while
the pointer is on its trigger *or* on the panel itself, and closes it 150 ms
after the pointer leaves both — enough to cross the gap between them. The
Monitoring device panel and the Home alarms panel both use it.

One consequence worth not undoing on Home: the severity dropdown inside the
alarms panel is a DESCENDANT of that panel. The panel closes when the pointer
leaves it, so a list mounted anywhere else in the document would be outside the
thing it belongs to — opening the filter would close the panel under it.

---

## Every control reaches `fetchData`

Each of these writes into `query`, so changing it re-runs your loader with the
new value. Nothing on either page is decorative:

| control | field |
|---|---|
| Plant (drawer and filter bar) | `plantId` |
| Device type · Data point | `deviceType` · `dataPoint` |
| Date | `day` |
| Day / Week / Month | `range` |
| Month pickers (both charts) | `year`, `month` |
| Plant KPI metric | `kpiMetric` |
| Rows per page · pager | `pageSize` · `page` |
| Refresh interval | `refreshSeconds` |
| **Alarms** · plant, device, severity, status | `alarmPlants`, `alarmDevices`, `alarmSeverity`, `alarmStatus` — all arrays, empty = no narrowing |
| Alarms · window | `alarmFromDate`/`alarmFromTime`, `alarmToDate`/`alarmToTime` |
| Alarms · pager, sort | `alarmPage`, `alarmPageSize`, `alarmSort`, `alarmSortDir` |

The alarms window defaults to the last 24 hours, computed at load. Nothing in
this app holds a date.

The one exception is the top chart's title toggle on the home page. It switches
between `powerIrradiance.plant` and `powerIrradiance.devices`, which are both in
the same response, so it is a view change rather than a new query.

## Known gaps

Carried over from the prototype and left as-is, because they need a backend
decision rather than a design one:

- The column pickers and `EXPORT CSV` are fully wired on both tables: what is
  ticked is what the table shows and what the file carries, and the export is a
  real download built from the rows on screen. A server-side export endpoint is
  still worth having for a window larger than one page.
- The alarms table sorts through the query (`alarmSort`), so the backend does
  the ordering; the monitoring table sorts what it was given.
- Legend clicks hide a series locally; that is deliberate, it should not re-query.
- Analysis and KPI page BOTH pages: `analysis.rows` and `kpi.buckets` arrive
  already at the resolution the window deserves. The server thins, because the
  browser cannot ask for less than it was sent, and a month at five-minute
  resolution is nine thousand points of ink for a question nobody asked.
- `analysis.reports` — which parameters each device publishes — decides which
  device/parameter pairs exist at all. Omit it and every device is assumed to
  report everything, which puts 'INV06 POA' in the legend and a column of dashes
  in the table. It is the one field on that page worth filling in first.
