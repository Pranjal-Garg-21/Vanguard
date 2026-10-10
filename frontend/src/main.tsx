import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { startAccessibility, startSyncTriggers } from './platform';
import { PwaBanner } from './app/pwa/PwaBanner';
import { startPwa } from './app/pwa';
import '@fontsource/ubuntu/latin-400.css';
import '@fontsource/ubuntu/latin-500.css';
import '@fontsource/ubuntu/latin-700.css';
import '@fontsource/ubuntu-mono/latin-400.css';
import '@fontsource/ubuntu-mono/latin-700.css';
import './index.css';

// Save the app on the phone so it opens offline, and upload saved events whenever the phone is online.
startAccessibility();
startPwa();
startSyncTriggers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <PwaBanner />
  </StrictMode>,
);
