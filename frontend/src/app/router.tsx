/**
 * All routes in one place. Owner: P2 (P5 owns setup, /who, /join and /facilitator).
 * Add your feature's route here with a PR.
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { ArcadeHub } from '@/features/arcade';
import { Landing } from '@/features/landing';
import { BaselineFlow } from '@/features/onboarding';
import { PlayerPicker, SetupFlow, WelcomeScreen } from '@/features/setup';
import { VillageGame } from '@/features/village';
import { Spinner } from '@/ui';
import { DevHome } from './DevHome';
import { TileInspector } from './TileInspector';
import { StudentHome } from './StudentHome';

// Lazy so students never download the dashboard.
const FacilitatorApp = lazy(() => import('@/facilitator/FacilitatorApp'));

/** Link inside the class QR code: /join/ABC123 opens setup with the code filled in. */
function JoinLink() {
  const { code = '' } = useParams();
  return <Navigate to={`/setup?code=${encodeURIComponent(code)}`} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/onboarding', element: <BaselineFlow /> },
  { path: '/arcade', element: <ArcadeHub /> },
  { path: '/village', element: <VillageGame /> },
  { path: '/welcome', element: <WelcomeScreen /> },
  { path: '/setup', element: <SetupFlow /> },
  { path: '/who', element: <PlayerPicker /> },
  { path: '/join/:code', element: <JoinLink /> },
  { path: '/home', element: <StudentHome /> },
  { path: '/dev', element: <DevHome /> },
  { path: '/dev/tiles', element: <TileInspector /> },
  {
    path: '/facilitator/*',
    element: (
      <Suspense fallback={<Spinner />}>
        <FacilitatorApp />
      </Suspense>
    ),
  },
]);
