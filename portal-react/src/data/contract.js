/**
 * ENEROPS OS — data contract.
 *
 * Nothing in this file holds values. It describes the shape the UI expects so a
 * backend developer can fill it in from one place (see PortalData.jsx →
 * `fetchData`). Every field is optional: anything missing renders as an empty
 * state rather than breaking the layout.
 *
 * TIME CONVENTION
 * ---------------
 * Chart x-axes are laid out over a 24-hour day, so every series point carries
 * `t` as DECIMAL HOURS in local plant time: 0 = midnight, 12.5 = 12:30 PM,
 * 19.35 = 19:21. Use `hoursFromISO()` in lib/format.js to convert a timestamp.
 *
 * @typedef {Object} Query
 * @property {string|null} plantId        currently selected plant
 * @property {string|null} deviceType     'Inverter' | 'MFM' | …  (from deviceTypes)
 * @property {string|null} dataPoint      'P_AC' | 'S_AC' | …     (from dataPoints)
 * @property {string}      day            ISO date, 'YYYY-MM-DD'
 *
 * ALARMS PAGE. Every list below means the same thing when EMPTY: no narrowing
 * at all. An empty `alarmPlants` is every plant, not none — the page says so on
 * the control ("All plants"), and a backend that reads it the other way shows a
 * blank table on first load.
 * @property {string[]}    alarmPlants    plant ids; [] = all of them
 * @property {string[]}    alarmDevices   device names; [] = all
 * @property {string[]}    alarmSeverity  'critical'|'alarm'|'warn'|'event'; [] = all
 * @property {string[]}    alarmStatus    'active'|'resolved'; [] = both
 * @property {string}      alarmFromDate  ISO date, window start
 * @property {string}      alarmFromTime  'HH:MM', 24-hour
 * @property {string}      alarmToDate    ISO date, window end
 * @property {string}      alarmToTime    'HH:MM'
 * @property {number}      alarmPage      1-based
 * @property {number}      alarmPageSize
 * @property {string}      alarmSort      column key, e.g. 'recv'
 * @property {1|-1}        alarmSortDir   1 ascending, -1 descending
 * @property {string}      range          'Day' | 'Week' | 'Month' — monitoring chart span
 * @property {number}      year           month-picker year
 * @property {number}      month          month-picker month, 0-11
 * @property {string}      kpiMetric      'CUF' | 'PR' | 'Availability'
 * @property {number}      page           history table, 1-based
 * @property {number}      pageSize       history table rows per page
 * @property {number|'off'} refreshSeconds  polling interval chosen in the top bar
 *
 * @typedef {Object} Plant
 * @property {string} id
 * @property {string} name
 * @property {string} [address]
 * @property {number} [acCapacity]        kW
 * @property {number} [dcCapacity]        kWp
 * @property {number} [livePower]         kW right now — shown on the plant
 *                                        picker's cards so a site is chosen on
 *                                        its state, not just its name
 * @property {number} [activeAlarms]      open faults on that plant; 0 renders
 *                                        as ALL CLEAR, omitted renders as a dash
 * @property {number} [deviceCount]       how many devices the site has — shown on
 *                                        the Monitoring plant card, where the
 *                                        choice is "whose devices am I about to
 *                                        inspect". Omitted simply does not print.
 *
 * @typedef {Object} PlantLive
 * @property {number} [power]             kW, plant active power right now
 * @property {number} [peakPower]         kW, highest plant power reached today
 * @property {string} [peakAt]            display string for that peak, '10:33 AM'
 * @property {number} [energyToday]       kWh
 * @property {number} [energyYesterdaySoFar]  kWh yesterday AT THE SAME HOUR.
 *                                        Send the comparable figure, not the
 *                                        whole of yesterday: at noon a full
 *                                        day always looks like a collapse, and
 *                                        a card that reads -60% every morning
 *                                        is one people learn to ignore.
 * @property {number} [energyTotal]       kWh, lifetime
 * @property {number} [irradiance]        W/m²
 * @property {number} [performanceRatio]  %
 * @property {number} [revenue]           currency units
 * @property {number} [co2Avoided]        kg
 *
 * @typedef {Object} Device
 * @property {string}  id                 'INV07'
 * @property {boolean} online
 * @property {boolean} [warn]             online but outside expected band
 * @property {string}  [model]            'HVERTER SI-350K-NO'
 * @property {number}  [rated]            kW, nameplate — drives the panel gauge
 * @property {number}  [power]            kW   · P_AC
 * @property {number}  [apparent]         kVA  · S_AC
 * @property {number}  [reactive]         kVAR · Q_AC
 * @property {number}  [frequency]        Hz   · F_AC
 * @property {number}  [powerFactor]      COS_PHI
 * @property {number[]} [currents]        A, three phases · I_AC1..3
 * @property {number}  [energyToday]      kWh since midnight — shown on the Home
 *                                        fleet card, and summed across the fleet
 *                                        for the strip's "Energy today"
 * @property {number}  [energyTotal]      kWh — the Monitoring rail card compares
 *                                        this to the fleet average
 * @property {string}  [lastSeen]         display string, offline devices
 *
 * @typedef {Object} Point
 * @property {number} t                   decimal hours, 0-24
 * @property {number|null} v
 *
 * @typedef {Object} Series
 * @property {string} id                  legend name, e.g. 'INV06'
 * @property {Point[]} points
 * @property {string} [color]             CSS colour; omit to take the palette slot
 * @property {boolean} [muted]            drawn thin + dimmed (offline devices)
 *
 * @typedef {Object} Annotation
 * @property {number} t
 * @property {number} v
 * @property {string} [label]             tooltip on the marker
 * @property {string} [seriesId]          the series it belongs to; the marker
 *                                        hides when that series is switched off
 *
 * @typedef {Object} LineChartData
 * @property {Series[]} series
 * @property {string} [unit]              'kW', 'Hz', 'A'… the unit of the chosen
 *                                        data point. Sent, not inferred: the app
 *                                        used to map P_AC→kW, F_AC→Hz and so on
 *                                        from a table it kept itself, which stops
 *                                        being true the moment a site publishes a
 *                                        register that table has never heard of.
 * @property {'line'|'bar'} [kind]        'line' (default) plots `t` as decimal
 *                                        hours across one day. 'bar' plots one
 *                                        column per entry in `categories`, with
 *                                        `t` as the 0-based index into it — used
 *                                        for Week and Month, where a line would
 *                                        imply you can read a value BETWEEN two
 *                                        days and there is nothing there to read.
 * @property {string[]} [categories]      bar mode: the x labels, e.g. ['14','15']
 * @property {number} [max]               y-axis top; falls back to a design default
 * @property {number} [now]               decimal hours — position of the "now" line.
 *                                        Omit in bar mode: the marker, the fill and
 *                                        the annotations all belong to a single
 *                                        day's curve.
 * @property {string} [dateLabel]         printed under the x-axis, e.g. '20 JULY 2026'
 * @property {Annotation[]} [annotations]
 *
 * @typedef {Object} PowerIrradianceData
 * @property {Series[]} [plant]           one series: plant total power
 * @property {Series[]} [devices]         one series per inverter (toggle view)
 * @property {Point[]}  [irradiance]      W/m², drawn on the right-hand axis
 * @property {number} [now]
 * @property {string} [dateLabel]
 *
 * @typedef {Object} DayBar
 * @property {number} day                 1-31
 * @property {number|null} value          null = no reading yet (stub bar)
 *
 * @typedef {Object} DailyEnergyData
 * @property {DayBar[]} days
 * @property {number} [daysInMonth]
 * @property {number} [max]               y-axis top
 * @property {number} [today]             day-of-month drawn at reduced opacity
 * @property {string} [monthLabel]        'JULY 2026 · DAY'
 *
 * @typedef {Object} KpiDay
 * @property {number} day
 * @property {number|null} actual
 * @property {number|null} simulated
 *
 * @typedef {Object} DailyKpiData
 * @property {KpiDay[]} days
 * @property {number} [daysInMonth]
 * @property {number} [max]
 * @property {number} [today]
 * @property {string} [metric]            'CUF' | 'PR' | 'Availability'
 * @property {string} [unit]              '%'
 * @property {string} [monthLabel]
 *
 * @typedef {Object} Alarm
 * @property {string} id                  unique across the WHOLE response. The
 *                                        alarms page can list several plants at
 *                                        once, and two rows sharing an id is a
 *                                        table nobody can cite.
 * @property {'alarm'|'warn'|'event'|'critical'} sev
 * @property {string} message
 * @property {string} [device]
 * @property {string} [category]
 * @property {string} [at]                display string, e.g. '27.07.2026 10:34:22'
 * @property {string} [plant]             plant NAME, for the alarms table's own
 *                                        column — a row from a three-site query
 *                                        has to say which site it came from
 * @property {'active'|'resolved'} [status]
 * @property {string} [receivedAt]        display string. Send it formatted: the
 *                                        portal shows '08.08.2026 16:52:35' and
 *                                        a 12-hour clock hides the day change,
 *                                        but which format is right is a site and
 *                                        locale decision, not this app's.
 * @property {string} [resolvedAt]        display string; omit while still open.
 *                                        An alarm that had not cleared by the
 *                                        end of the window is still OPEN at the
 *                                        end of the window — do not clamp its
 *                                        clear time to the window's edge.
 * @property {number} [receivedTs]        epoch ms, for sorting. Without it the
 *                                        table can only sort the display string,
 *                                        which orders '9.' after '10.'
 * @property {number} [resolvedTs]        epoch ms
 *
 * @typedef {Object} AlarmsPage
 * @property {Alarm[]} rows               the window's alarms, already filtered
 *                                        by everything in the query below
 * @property {number} [total]             matching rows on the server, for the pager
 * @property {string[]} [devices]         the device filter's options — the
 *                                        devices these PLANTS have, not a list
 *                                        this app keeps
 * @property {Array<{id:string,activeAlarms?:number}>} [plantCounts]
 *                                        per-plant open count for the picker's
 *                                        cards. Counted server-side over the
 *                                        SAME window, so the number on the card
 *                                        is the number the table then shows.
 *
 * @typedef {Object} TableColumn
 * @property {string} id
 * @property {string} label               group header, e.g. 'INV06'
 * @property {string} [unit]              sub header. Bracket the unit and keep it
 *                                        ASCII — 'P_AC (kW)', not 'P_AC · kW'.
 *                                        This string goes into the CSV as well as
 *                                        the screen, and a MIDDLE DOT (U+00B7)
 *                                        surfaces in Excel as 'Â·'.
 * @property {string} [color]             ring dot colour
 *
 * @typedef {Object} TableRow
 * @property {string} time
 * @property {Array<number|string|null>} values   one per column, in column order
 * @property {string[]} [flags]           'warn' marks a cell amber
 *
 * @typedef {Object} HistoryData
 * @property {TableColumn[]} columns
 * @property {TableRow[]} rows
 * @property {number} [total]             total rows available on the server
 * @property {number} [page]              1-based
 * @property {number} [pageSize]
 *
 * @typedef {Object} PortalData
 * @property {Plant[]}  plants            populates every plant selector
 * @property {string[]} deviceTypes       the Device type selector. A property of
 *                                        the PLANT, not of the UI — a site with a
 *                                        tracker controller must be able to show
 *                                        one without anybody editing the app.
 * @property {string[]} dataPoints        the Data point selector, likewise: the
 *                                        registers these devices actually publish
 * @property {Plant|null} plant           the selected plant's detail
 * @property {PlantLive|null} live
 * @property {Device[]}  devices
 * @property {Alarm[]}   alarms           HOME's rail + panel: what is open on the
 *                                        selected plant right now
 * @property {AlarmsPage|null} alarmsPage  the ALARMS page: a window of history,
 *                                        possibly across several plants. Kept
 *                                        separate from `alarms` because the two
 *                                        answer different questions and a page
 *                                        that showed one where the other belongs
 *                                        would be quietly wrong.
 * @property {LineChartData|null} devicePower        monitoring · Active Power
 * @property {PowerIrradianceData|null} powerIrradiance   home · top chart
 * @property {DailyEnergyData|null} dailyEnergy      home · Plant Energy Generation
 * @property {DailyKpiData|null} dailyKpi            home · Plant KPI
 * @property {HistoryData|null} history              monitoring · table
 */

export {};
