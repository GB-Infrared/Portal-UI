import { useMemo, useState } from 'react';

/**
 * The Settings panels · everything about the account rather than about the plant.
 *
 * NOTHING HERE IS INVENTED. Every row comes from the payload the provider was
 * given; a field the backend omits renders as a dash and a table it omits says
 * so in as many words, which is the same bargain every chart in this app makes.
 * A settings screen that filled in a plausible tariff would be inventing exactly
 * the kind of fact people act on.
 *
 * NOTHING HERE WRITES, EITHER. Every control that would change something calls
 * back to the host, and with no host wired it says so rather than pretending to
 * have saved. The design is complete; the behaviour it cannot know is not.
 *
 * @see contract.js — the settings payload these read from
 */

/* ---------- the pieces the panels share ---------- */

/** an em-dash, never a plausible-looking placeholder */
export const Dash = () => <span className="none">—</span>;
const val = v => (v == null || v === '' ? <Dash /> : v);

/**
 * Which site the card is about, said the way every reading page says it: the
 * same pin, the same mono name, the same sentence about where it is changed.
 * Cards that are NOT per-site — the recipient list, the roles, the users — do
 * not carry one, because a person does not stop existing when the orbit is
 * pointed somewhere else.
 */
function SitePin({ name }) {
  return (
    <span className="sitepin" title="The site every page in this portal is showing. Change it on Site Control.">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21.2s6.8-6 6.8-10.8a6.8 6.8 0 1 0-13.6 0c0 4.8 6.8 10.8 6.8 10.8z" />
        <circle cx="12" cy="10.2" r="2.5" />
      </svg>
      <span className="n">{name || '—'}</span>
    </span>
  );
}

/** ACTIVE and SUSPENDED, and the same two colours wherever they appear. */
const Pill = ({ on, onWord = 'Active', offWord = 'Suspended' }) => (
  <span className={'pill ' + (on ? 'live' : 'held')}><span className="dot" />{on ? onWord : offWord}</span>
);

/* a scope that reaches everywhere is worth saying in one chip rather than in
   every name — the reader is checking scope, and "all" is the answer they are
   checking for */
function Chips({ sites, total }) {
  const list = sites || [];
  if (!list.length) return <span className="chip">No sites</span>;
  if (total && list.length === total) return <span className="chip all">All sites</span>;
  return <div className="chips">{list.map(s => <span className="chip" key={s}>{s}</span>)}</div>;
}

const PLUS = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.1" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);

/** A table that says so when it has nothing, rather than drawing an empty grid. */
function Table({ head, rows, empty, wide }) {
  return (
    <div className="tablewrap">
      {rows && rows.length
        ? <table className={wide ? 'wide' : undefined}><thead>{head}</thead><tbody>{rows}</tbody></table>
        : <div className="nodata">{empty}</div>}
    </div>
  );
}

/* ---------- COMPANY PROFILE ----------
   The legacy screen put the signed-in PERSON's name at the top of this card. The
   company's name goes there instead: a card titled Company Profile that leads
   with a person reads as being about the person, and the card beside it already
   carries that name in exactly this position. */
export function CompanyProfile({ company }) {
  const c = company || {};
  return (
    <>
      <div className="who co">
        <div><div className="nm">{c.name || 'No company on the account'}</div></div>
      </div>
      {/* Six fields in reading order, same as the card beside it — which also
          puts the two email addresses next to each other, the one place on this
          card a reader is actually comparing two values. */}
      <div className="fields">
        <div className="f"><div className="k">Company name</div><div className="v">{val(c.name)}</div></div>
        <div className="f"><div className="k">Address</div><div className="v">{val(c.address)}</div></div>
        <div className="f"><div className="k">Company email</div><div className="v">{val(c.email)}</div></div>
        <div className="f"><div className="k">Admin email</div><div className="v">{val(c.adminEmail)}</div></div>
        <div className="f"><div className="k">Contact number</div><div className="v">{val(c.phone)}</div></div>
        <div className="f"><div className="k">Customer service status</div>
          <div className="v">{c.active == null ? <Dash /> : <Pill on={c.active} />}</div></div>
      </div>
      <div className="cfoot">
        <span className="n">Set when the account is provisioned. Nothing on this card is editable from the portal.</span>
      </div>
    </>
  );
}

/* ---------- CUSTOMER DEVICES ----------
   The register the rest of the portal reads from. Monitoring, Alarms, KPI and
   Analysis all name devices; this is the one screen that says what they are.

   NO Sl. COLUMN. It numbered the rows on screen rather than the devices, so it
   renumbered itself every time the table was sorted or paged — a column whose
   value changes when you look at it differently is not an identifier, and there
   is a real one in the next column along. */
export function CustomerDevices({ devices, plantName }) {
  const rows = devices || [];
  const [per, setPer] = useState(25);
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(rows.length / per));
  const at = Math.min(page, pages);
  const from = (at - 1) * per;
  const slice = rows.slice(from, from + per);

  return (
    <>
      <div className="chead">
        <div className="title">Customer Devices</div>
        <div className="tools">
          <SitePin name={plantName} />
          <span className="count">{rows.length ? `${rows.length} devices` : ''}</span>
        </div>
      </div>

      <Table
        empty="No device register has been loaded for this site"
        head={
          <tr>
            <th>Serial</th><th>Name</th><th>Model</th><th>Category</th>
            <th>Commissioned</th><th>Data points</th>
          </tr>}
        rows={slice.map(d => (
          <tr key={d.id || d.serial}>
            <td className="mono nm">{val(d.serial)}</td>
            <td>{val(d.name)}</td>
            <td>{val(d.model)}</td>
            <td>{val(d.category)}</td>
            <td className="mono">{val(d.commissioned)}</td>
            <td className="mono">{d.dataPoints == null ? <Dash /> : d.dataPoints}</td>
          </tr>
        ))} />

      {!!rows.length && (
        <div className="tfoot">
          <span>Rows per page</span>
          <select value={per} onChange={e => { setPer(+e.target.value); setPage(1); }}>
            <option>10</option><option>25</option><option>50</option><option>100</option>
          </select>
          <span className="sp" />
          <span className="range">{from + 1}-{Math.min(from + per, rows.length)} of {rows.length}</span>
          <button className="pgbtn" type="button" disabled={at <= 1}
                  onClick={() => setPage(at - 1)} aria-label="Previous page">‹</button>
          <button className="pgbtn" type="button" disabled={at >= pages}
                  onClick={() => setPage(at + 1)} aria-label="Next page">›</button>
        </div>
      )}
    </>
  );
}

/* ---------- THE RATE BOARDS ----------
   A HISTORY, NOT A SETTING. The grid factor changes; what it was in 2023 is what
   2023's reported savings were computed with, and a screen that let you overwrite
   one number would silently rewrite every figure this portal has ever published.

   So a new rate SUPERSEDES the one before it. Each period keeps its own number,
   the table reads oldest-to-newest, and Until is never typed — a rate runs until
   the next one starts, which is why an Add dialog asks for a start date and never
   for an end.

   The status is WORKED OUT, never stored. A stored status is a second copy of a
   fact, and the two copies disagree the first time somebody adds a row without
   updating both.

   Emission and Electricity are one component for the same reason they were one
   board in the mockups: the day one of them learns something, the other has to
   learn it too. */
export function RateBoard({ title, unit, rates, plantName, onAdd, onRemove }) {
  const list = rates || [];
  return (
    <>
      <div className="chead">
        <div className="title">{title}</div>
        <div className="tools">
          <SitePin name={plantName} />
          <button className="tbtn" type="button" onClick={onAdd}>{PLUS}ADD RATE</button>
        </div>
      </div>

      <Table
        empty={`No ${title.toLowerCase()} has been recorded for this site`}
        head={
          <tr>
            <th>From</th><th>Until</th>
            <th>Rate <span className="u">{unit}</span></th>
            <th>Status</th>
            <th title="When the row was entered, which is not when the rate took effect">Added</th>
            <th />
          </tr>}
        rows={list.map((r, i) => {
          const open = i + 1 >= list.length;
          return (
            <tr key={r.id || r.from}>
              <td className="mono nm">{val(r.from)}</td>
              {/* the dash means "still running" — an empty cell would read as
                  missing data rather than as a period nothing has ended yet */}
              <td className={'mono' + (open ? ' dim' : '')}>{open ? '—' : val(r.until)}</td>
              <td className="mono nm">{val(r.rate)}</td>
              <td><Pill on={open} /></td>
              <td className="mono">{val(r.added)}</td>
              {/* Only the ACTIVE row can go, and removing it hands the period
                  back to the rate before it. Taking one out of the middle would
                  leave a stretch of time priced by nothing, and every figure this
                  portal published for that stretch would lose its basis. */}
              <td>{open && (
                <div className="rowacts">
                  <button className="rowbtn warn" type="button" title="Remove this rate"
                          aria-label={'Remove the rate from ' + (r.from || '')}
                          onClick={() => onRemove && onRemove(r)}>{TRASH}</button>
                </div>)}
              </td>
            </tr>
          );
        })} />
    </>
  );
}

/* ---------- ENERGY OFFSET ----------
   A correction applied to metered generation, versioned exactly like the rate
   boards: a correction that was right for 2024 must not be re-applied to 2026
   just because nobody came back to cancel it.

   REASON is the most important column here. An adjustment nobody can trace is
   indistinguishable from a meter that is wrong, and the difference between those
   two is the difference between a report you can defend and one you cannot. */
export function EnergyOffset({ offsets, plantName, onAdd, onRemove }) {
  const list = offsets || [];
  return (
    <>
      <div className="chead">
        <div className="title">Energy Offset</div>
        <div className="tools">
          <SitePin name={plantName} />
          <button className="tbtn" type="button" onClick={onAdd}>{PLUS}ADD OFFSET</button>
        </div>
      </div>

      <Table
        wide
        empty="No offsets have been recorded for this site"
        head={
          <tr>
            <th>Device</th><th>From</th><th>Until</th>
            <th>Offset <span className="u">kWh</span></th>
            <th>Reason</th><th>Status</th>
            <th title="When the row was entered, which is not when the offset took effect">Added</th>
            <th />
          </tr>}
        rows={list.map((o, i) => {
          const open = o.until == null || o.until === '';
          return (
            <tr key={o.id || i}>
              <td className="nm">{val(o.device)}</td>
              <td className="mono">{val(o.from)}</td>
              <td className={'mono' + (open ? ' dim' : '')}>{open ? '—' : o.until}</td>
              <td className="mono nm">{val(o.offset)}</td>
              <td>{val(o.reason)}</td>
              <td><Pill on={open} /></td>
              <td className="mono">{val(o.added)}</td>
              <td>{open && (
                <div className="rowacts">
                  <button className="rowbtn warn" type="button" title="Remove this offset"
                          aria-label={'Remove the offset on ' + (o.device || '')}
                          onClick={() => onRemove && onRemove(o)}>{TRASH}</button>
                </div>)}
              </td>
            </tr>
          );
        })} />
    </>
  );
}

/* ---------- ALARMS CONFIG ----------
   Who hears about an alarm, and which severities reach them.

   The four columns are the portal's own four levels, in its own order. The legacy
   screen's fourth column was "status", which nothing here raises — a recipient
   list whose headings do not match the events being raised cannot be checked
   against anything, and the person who most needs the critical ones is the person
   most likely to have ticked the wrong box.

   NOT PER SITE, so there is no pin: an alarm reaches a person, and a person does
   not stop existing when the orbit is pointed somewhere else. */
const SEVS = [
  ['critical', 'Critical', 'The worst level this portal raises — it outranks an alarm'],
  ['alarm', 'Alarm', 'Something is wrong and somebody has to act'],
  ['warn', 'Warning', 'Worth looking at before it becomes an alarm'],
  ['event', 'Event', 'Something happened and was recorded — a reconnect, a firmware update']
];

export function AlarmsConfig({ recipients, onAdd, onEdit }) {
  const list = recipients || [];
  return (
    <>
      <div className="chead">
        <div className="title">Alarms config</div>
        <div className="tools">
          <span className="count">{list.length ? `${list.length} recipients` : ''}</span>
          <button className="tbtn" type="button" onClick={onAdd}>{PLUS}ADD RECIPIENT</button>
        </div>
      </div>

      <Table
        empty="No alarm recipients have been configured"
        head={
          <tr>
            <th>Recipient</th><th>Email</th>
            {SEVS.map(([k, label, tip]) => (
              <th key={k} className={'sev-h ' + k} title={tip}>{label}</th>
            ))}
            <th />
          </tr>}
        rows={list.map(r => (
          <tr key={r.id || r.email}>
            <td className="nm">{val(r.name)}</td>
            <td>{val(r.email)}</td>
            {SEVS.map(([k]) => (
              <td key={k} className="tick">{(r.severities || []).includes(k) ? CHECK : <span className="off">—</span>}</td>
            ))}
            <td>
              <div className="rowacts">
                <button className="rowbtn" type="button" title="Edit this recipient"
                        aria-label={'Edit ' + (r.name || r.email || 'recipient')}
                        onClick={() => onEdit && onEdit(r)}>{PEN}</button>
              </div>
            </td>
          </tr>
        ))} />
    </>
  );
}

/* ---------- ROLE ----------
   A role is a name and the sites it reaches. That is the whole of it.

   The legacy screen put a role in a dropdown and then filled the table with twelve
   columns of PLANT detail — id, area, city, state, latitude, address, installation
   date. None of that is role data. It is the site register, which Site Control
   already draws, and repeating it here means two screens that can disagree about
   where a plant is. */
export function RoleTable({ roles, users, plants, onAdd, onEdit }) {
  const list = roles || [];
  const total = (plants || []).length;
  const held = useMemo(() => {
    const m = new Map();
    (users || []).forEach(u => m.set(u.role, (m.get(u.role) || 0) + 1));
    return m;
  }, [users]);

  return (
    <>
      <div className="chead">
        <div className="title">Role</div>
        <div className="tools">
          <span className="count">{list.length ? `${list.length} roles` : ''}</span>
          <button className="tbtn" type="button" onClick={onAdd}>{PLUS}ADD ROLE</button>
        </div>
      </div>

      <Table
        empty="No roles have been defined"
        head={
          <tr>
            <th>Role</th><th>Sites it reaches</th>
            <th title="How many people currently hold this role">Held by</th>
            <th />
          </tr>}
        rows={list.map(r => (
          <tr key={r.id}>
            <td className="nm">{val(r.name)}</td>
            <td><Chips sites={r.sites} total={total} /></td>
            <td className="mono">{held.get(r.id) || 0}</td>
            <td>
              <div className="rowacts">
                <button className="rowbtn" type="button" title="Edit this role"
                        aria-label={'Edit ' + (r.name || 'role')}
                        onClick={() => onEdit && onEdit(r)}>{PEN}</button>
              </div>
            </td>
          </tr>
        ))} />
    </>
  );
}

/* ---------- USER ----------
   The people who can sign in.

   Name, First Name and Last Name were three columns carrying two facts. The split
   matters in the FORM, where the halves are typed separately; in a table read by
   looking for a person, it is one column. Address went with them: every legacy row
   carried the same string — the company's address, which Company Profile holds —
   and a column whose value is identical on every row has stopped asking a question.

   AND THERE IS NO DELETE. An alarm acknowledged by someone who no longer exists
   still has to say who acknowledged it, so a person is suspended and keeps their
   name attached to everything they did. */
export function UserTable({ users, roles, onAdd, onEdit, onHold }) {
  const list = users || [];
  const roleName = id => {
    const r = (roles || []).filter(x => x.id === id)[0];
    return r ? r.name : null;
  };
  return (
    <>
      <div className="chead">
        <div className="title">User</div>
        <div className="tools">
          <span className="count">{list.length ? `${list.length} users` : ''}</span>
          <button className="tbtn" type="button" onClick={onAdd}>{PLUS}ADD USER</button>
        </div>
      </div>

      <Table
        empty="No users have been added to this account"
        head={
          <tr>
            <th>Name</th><th>Email</th><th>Contact number</th>
            <th>Role</th><th>Status</th><th />
          </tr>}
        rows={list.map(u => {
          const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ');
          const rn = roleName(u.role);
          return (
            <tr key={u.id || u.email} className={u.active ? undefined : 'gone'}>
              <td className="nm">{val(name)}</td>
              <td>{val(u.email)}</td>
              <td className="mono">{val(u.phone)}</td>
              <td>{rn || <span className="chip">No role</span>}</td>
              <td><Pill on={!!u.active} /></td>
              <td>
                <div className="rowacts">
                  <button className="rowbtn" type="button" title="Edit this user"
                          aria-label={'Edit ' + (name || 'user')}
                          onClick={() => onEdit && onEdit(u)}>{PEN}</button>
                  <button className={'rowbtn' + (u.active ? ' warn' : '')} type="button"
                          title={u.active ? 'Suspend this user' : 'Let them sign in again'}
                          aria-label={(u.active ? 'Suspend ' : 'Reactivate ') + (name || 'user')}
                          onClick={() => onHold && onHold(u)}>{u.active ? BOX : BACK}</button>
                </div>
              </td>
            </tr>
          );
        })} />
    </>
  );
}

/* ---------- ACCESS CONTROL ----------
   Who holds which role, all of it on one screen.

   The legacy flow was: pick a role from a dropdown, look at the people who hold
   it, press ASSIGN ROLES. That answers "who holds THIS role" one role at a time
   and never answers the question anybody actually arrives with — can this person
   see that site. Checking one user meant cycling every role in the dropdown until
   they turned up in one.

   Every user, every role, one table. The role is changed in the cell where it is
   read, so there is nothing to select first and no dialog to open, and the sites
   it grants are printed beside it because a role name is not something anyone
   should have to remember the meaning of. */
export function AccessControl({ users, roles, plants, onAssign }) {
  const list = users || [];
  const rs = roles || [];
  const total = (plants || []).length;
  return (
    <>
      <div className="chead">
        <div className="title">Access Control</div>
        <div className="tools">
          <span className="count">{list.length ? `${list.length} users` : ''}</span>
        </div>
      </div>

      <Table
        empty="No users have been added to this account"
        head={<tr><th>User</th><th>Role</th><th>Which gives them</th><th>Status</th></tr>}
        rows={list.map(u => {
          const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ');
          const r = rs.filter(x => x.id === u.role)[0];
          return (
            <tr key={u.id || u.email} className={u.active ? undefined : 'gone'}>
              <td className="nm">{val(name)}</td>
              <td>
                {/* changed where it is read */}
                <select className="mini" value={u.role || ''}
                        aria-label={'Role for ' + (name || 'this user')}
                        onChange={e => onAssign && onAssign(u, e.target.value || null)}>
                  <option value="">No role</option>
                  {rs.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </td>
              <td>{r ? <Chips sites={r.sites} total={total} /> : <span className="chip">No sites</span>}</td>
              <td><Pill on={!!u.active} /></td>
            </tr>
          );
        })} />
    </>
  );
}

/* ---------- the row icons ---------- */
const PEN = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" /><path d="M14.5 6.5l3 3" />
  </svg>
);
const TRASH = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 6.5h15M9.5 6.5V4.8h5v1.7M7 6.5l.8 12.2h8.4L17 6.5" />
  </svg>
);
const BOX = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4.5" y="5.5" width="15" height="13" rx="2" /><path d="M9 12h6" />
  </svg>
);
const BACK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 12a7.2 7.2 0 1 0 2.1-5.1M4.8 5.5V11h5.5" />
  </svg>
);
const CHECK = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="yes">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);
