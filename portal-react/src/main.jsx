import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

/* Order matters: tokens define every colour, base sets element defaults,
   controls.css holds the one dropdown every page shares, the page sheets are
   scoped so they cannot collide, and app.css adds the handful of rules the
   prototype never needed (empty states). */
import './styles/tokens.css';
import './styles/base.css';
import './styles/chrome.css';
import './styles/controls.css';
import './styles/page-home.css';
import './styles/page-monitoring.css';
import './styles/page-alarms.css';
import './styles/page-analysis.css';
import './styles/page-kpi.css';
import './styles/page-login.css';
import './styles/page-plants.css';
import './styles/page-settings.css';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
