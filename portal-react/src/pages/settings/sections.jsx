/**
 * The Settings menu, as data.
 *
 * One list, in one place, so the sidebar and the panel can never disagree about
 * what exists — and so adding a section is one entry rather than an edit in
 * three files.
 *
 * ALL OF THEM ARE DRAWN NOW — the panels live in panels.jsx and Settings.jsx
 * routes to them by id. The `headline`/`note` pair each entry used to carry said
 * what a section WOULD hold while it was still a placeholder; none of them needs
 * one any more. The fallback in Settings.jsx that renders that pair is kept for
 * the next section added to this list, not removed as dead.
 */
export const SECTIONS = [
  {
    id: 'user-profile', group: 'Profile Management', label: 'User Profile'
  },
  {
    id: 'company-profile', group: 'Profile Management', label: 'Company Profile'
  },
  {
    id: 'customer-devices', group: 'Asset Management', label: 'Customer Devices'
  },
  {
    id: 'emission-rate', group: 'System Configuration', label: 'Emission Rate'
  },
  {
    id: 'electricity-rate', group: 'System Configuration', label: 'Electricity Rate'
  },
  {
    id: 'energy-offset', group: 'System Configuration', label: 'Energy Offset'
  },
  {
    id: 'alarms-config', group: 'System Configuration', label: 'Alarms config'
  },
  {
    id: 'access-user', group: 'Access Management', label: 'User'
  },
  {
    id: 'access-role', group: 'Access Management', label: 'Role'
  },
  {
    id: 'access-ctl', group: 'Access Management', label: 'Access Control'
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
