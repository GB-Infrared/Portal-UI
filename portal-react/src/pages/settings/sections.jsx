/**
 * The Settings menu, as data.
 *
 * One list, in one place, so the sidebar and the panel can never disagree about
 * what exists — and so adding a section is one entry rather than an edit in
 * three files.
 *
 * `headline` and `note` describe what a section will HOLD. Ten of the eleven are
 * not drawn yet, and saying so plainly is the point: a menu item that opens an
 * empty card reads as broken, one that names what belongs there reads as a plan,
 * and the shape of Settings can be reviewed before any of it is built.
 */
export const SECTIONS = [
  {
    id: 'user-profile', group: 'Profile Management', label: 'User Profile'
    /* the only one that is drawn — see Settings.jsx */
  },
  {
    id: 'company-profile', group: 'Profile Management', label: 'Company Profile',
    headline: 'The organisation behind the account',
    note: 'Registered name, address, tax identifiers and the billing contact — the ' +
          'company-level equivalent of the user profile beside it.'
  },
  {
    id: 'customer-devices', group: 'Asset Management', label: 'Customer Devices',
    headline: 'Every device this account owns, across every plant',
    note: 'A table rather than a form: serial, model, plant, commissioning date, and the ' +
          'data points it publishes. It is the register Monitoring reads from, so the ' +
          'columns here should be the ones that page already names.'
  },
  {
    id: 'emission-rate', group: 'System Configuration', label: 'Emission Rate',
    headline: 'kg CO₂ avoided per kWh generated',
    note: 'One rate, versioned by the date it takes effect — a grid factor that changes in ' +
          'April must not silently rewrite last year’s reported savings.'
  },
  {
    id: 'electricity-rate', group: 'System Configuration', label: 'Electricity Rate',
    headline: 'The tariff the savings figures are counted against',
    note: 'Per plant, and dated like the emission rate. If the tariff has slabs or a ' +
          'peak/off-peak split, that structure belongs here rather than flattened into ' +
          'one number.'
  },
  {
    id: 'energy-offset', group: 'System Configuration', label: 'Energy Offset',
    headline: 'A correction applied to metered generation',
    note: 'What it offsets and why needs stating on the screen itself — an adjustment ' +
          'nobody can trace is indistinguishable from a meter that is wrong.'
  },
  {
    id: 'alarms-config', group: 'System Configuration', label: 'Alarms config',
    headline: 'Which conditions raise an alarm, and at what severity',
    note: 'The rules behind the Alarms page: threshold, dead-band, how long a condition ' +
          'must hold before it counts, and who is notified. The severities here have to be ' +
          'the same ones that page already colours.'
  },
  {
    id: 'access-user', group: 'Access Management', label: 'User',
    headline: 'The people who can sign in',
    note: 'A table with invite and deactivate — never delete, because an alarm acknowledged ' +
          'by someone who no longer exists still has to say who acknowledged it.'
  },
  {
    id: 'access-role', group: 'Access Management', label: 'Role',
    headline: 'Named bundles of permissions',
    note: 'Roles are what get assigned; Access Control is where each role’s permissions are ' +
          'set. Keeping the two apart is what stops per-user exceptions accumulating until ' +
          'nobody can say who can do what.'
  },
  {
    id: 'access-ctl', group: 'Access Management', label: 'Access Control',
    headline: 'What each role may do, and to which plants',
    note: 'A grid of roles against permissions. The plant dimension matters as much as the ' +
          'verb: read-everywhere and write-on-one-site is the common case, not the exception.'
  }
];

/** one mark per group, so the four headings are told apart before they are read */
export const GROUP_ICON = {
  'Profile Management': (
    <svg className="gi" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9.5" cy="8" r="3.4" /><path d="M3.4 20a6.6 6.6 0 0 1 12.2-3.4" />
      <circle cx="18.2" cy="17.6" r="2.1" />
      <path d="M18.2 13.9v1.1M18.2 20.2v1.1M21.4 15.8l-1 .5M16 19l-1 .5M21.4 19.4l-1-.5M16 16.2l-1-.5" />
    </svg>
  ),
  'Asset Management': (
    <svg className="gi" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="13.5" width="7" height="7" rx="1.4" />
      <path d="M6.5 13.5V9.2a2 2 0 0 1 2-2h4.6" />
      <rect x="13" y="4" width="8" height="6.4" rx="1.4" />
      <path d="M17 10.4v3.4a2 2 0 0 1-2 2h-1.4" />
    </svg>
  ),
  'System Configuration': (
    <svg className="gi" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.2 6.4a3.6 3.6 0 0 1 4.9-3.3l-2.4 2.4 1.8 1.8 2.4-2.4a3.6 3.6 0 0 1-4.5 4.6L6.6 19.7a1.9 1.9 0 0 1-2.7-2.7l10.2-10.2a3.6 3.6 0 0 1 .1-.4z" />
    </svg>
  ),
  'Access Management': (
    <svg className="gi" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.2 5 6v5.4c0 4.2 2.9 7.6 7 9.4 4.1-1.8 7-5.2 7-9.4V6l-7-2.8z" />
    </svg>
  )
};
