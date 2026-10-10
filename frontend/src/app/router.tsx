/**
 * All routes in one place. Owner: P2 (P5 owns /setup and /facilitator).
 * Add your feature's route here with a PR.
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { DevHome } from './DevHome';
import { SetupScreen } from '@/features/setup/SetupScreen';

// Lazy so students never download the dashboard.
const FacilitatorApp = lazy(() => import('@/facilitator/FacilitatorApp'));

export const router = createBrowserRouter([
  { path: '/', element: <DevHome /> },
  { path: '/setup', element: <SetupScreen /> },
  {
    path: '/facilitator/*',
    element: (
      <Suspense fallback={<p className="p-4">Loading…</p>}>
        <FacilitatorApp />
      </Suspense>
    ),
  },
]);
