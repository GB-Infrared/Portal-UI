import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PortalDataProvider, usePortal } from './data/PortalData';
import { ToastProvider, useToast } from './components/Toasts';
import { TopBar } from './components/TopBar';
import { useTheme } from './lib/useTheme';
import Home from './pages/Home';
import Monitoring from './pages/Monitoring';
import Alarms from './pages/Alarms';
import Analysis from './pages/Analysis';
import Kpi from './pages/Kpi';

/**
 * Connect a backend by passing `fetchData` here:
 *
 *   <PortalDataProvider fetchData={loadPortal}>
 *
 * where `loadPortal(query, { signal })` resolves to the shape in
 * data/contract.js. Until then every page renders its empty state — the design
 * is complete, the numbers are simply not invented.
 */
export default function App({ fetchData }) {
  /* Passed straight through, so a backend can be attached either here or at the
     mount in main.jsx — whichever suits the host app. With nothing passed, the
     provider stays empty and every page renders its empty state. */
  return (
    <PortalDataProvider fetchData={fetchData}>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </PortalDataProvider>
  );
}

const PAGE_CLASS = {
  '/monitoring': 'page-monitoring',
  '/alarms': 'page-alarms',
  '/analysis': 'page-analysis',
  '/kpi': 'page-kpi'
};
const PAGE_SUBTITLE = {
  '/monitoring': 'SITE OVERVIEW', '/alarms': 'SITE OVERVIEW',
  '/analysis': 'SITE OVERVIEW', '/kpi': 'SITE OVERVIEW', '/': 'SITE OVERVIEW'
};

function Shell() {
  const { plants, query, setQuery } = usePortal();
  const [theme, toggleTheme] = useTheme();
  const toast = useToast();
  const { pathname } = useLocation();

  /* The two pages share class names — .kpi, .field, .pill, .rail mean different
     things on each — so their stylesheets are scoped and the active page's
     class is set here, on the wrapper the whole chrome lives inside. */
  const pageClass = PAGE_CLASS[pathname] || 'page-home';

  return (
    <div className={pageClass}>
      {/* The left drawer is gone: its only content was the plant choice, which
          now lives on the plant name itself on Home, and Monitoring picks its
          plant in the filter bar above the grid. */}
      <TopBar
        subtitle={PAGE_SUBTITLE[pathname] || 'SITE OVERVIEW'}
        refreshSeconds={query.refreshSeconds}
        onRefreshChange={v => {
          setQuery({ refreshSeconds: v });
          toast(v === 'off' ? 'Live refresh paused' : `Live refresh · every ${v / 60} min`);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/alarms" element={<Alarms />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/kpi" element={<Kpi />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
