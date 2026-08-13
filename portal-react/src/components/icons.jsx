/** Every glyph the design uses, in one place. All stroke `currentColor`. */

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' };

export const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinejoin="round">
    <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" />
  </svg>
);

export const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
  </svg>
);

export const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 2.8V6.6M16 2.8V6.6" />
  </svg>
);

export const CalendarIconLg = () => (
  <svg style={{ marginLeft: 'auto' }} width="15" height="15" viewBox="0 0 24 24" {...stroke}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 2.8V6.6M16 2.8V6.6" />
  </svg>
);

export const BoltIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2 4.5 13.5H11L9.8 22 19 10h-6.6L13 2Z" />
  </svg>
);

export const PeakIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} strokeWidth="1.9" strokeLinejoin="round">
    <path d="M3 17.6 9 11l3.6 3.6L21 6" />
    <path d="M15.6 6H21v5.4" />
  </svg>
);

export const GaugeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round">
    <path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l4.2-4.6" />
  </svg>
);

export const SunSmallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
  </svg>
);

export const LeafIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinejoin="round">
    <path d="M20 4c0 8-5 12-11 12H5c0-8 5-12 11-12h4Z" />
    <path d="M5 20c2.5-4 5.5-6.5 9-8" />
  </svg>
);

export const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ColumnsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 4.5v15M12 4.5v15M19 4.5v15" />
  </svg>
);

/* kept though nothing uses it now: the table's FILTERS button became the column
   picker, and this is the glyph any future filter control would want */
export const FilterIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinejoin="round">
    <path d="M3.5 5h17l-6.6 7.6v5.6l-3.8-1.9v-3.7L3.5 5Z" />
  </svg>
);

export const ExportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2M4.5 20h15" />
  </svg>
);
