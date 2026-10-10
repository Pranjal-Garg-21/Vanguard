/**
 * All routes in one place. Owner: P2 (P5 owns setup, /who, /join and /facilitator).
 * Add your feature's route here with a PR.
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { PlayerPicker, SetupFlow, WelcomeScreen } from '@/features/setup';
import { Spinner } from '@/ui';
import { DevHome } from './DevHome';
import { StudentEntry } from './StudentEntry';
import { Dashboard } from '@/features/home';
import { PhoneLab } from '@/games/safe/phone';
import { SafeHub } from '@/games/safe/SafeHub';

// Lazy so students never download the dashboard.
const FacilitatorApp = lazy(() => import('@/facilitator/FacilitatorApp'));

/** Link inside the class QR code: /join/ABC123 opens setup with the code filled in. */
function JoinLink() {
  const { code = '' } = useParams();
  return <Navigate to={`/setup?code=${encodeURIComponent(code)}`} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <StudentEntry /> },
  { path: '/welcome', element: <WelcomeScreen /> },
  { path: '/setup', element: <SetupFlow /> },
  { path: '/who', element: <PlayerPicker /> },
  { path: '/join/:code', element: <JoinLink /> },
  { path: '/home', element: <Dashboard /> },
  // Developer tools only exist in development builds, so the final demo has no debug pages.
  ...(import.meta.env.DEV ? [{ path: '/dev', element: <DevHome /> }, { path: '/dev/phone', element: <PhoneLab /> }] : []),
  { path: '/safe', element: <SafeHub /> },
  { path: '/safe/:sim', element: <SafeHub /> },
  { path: '/safe/:sim/:entry', element: <SafeHub /> },
  {
    path: '/facilitator/*',
    element: (
      <Suspense fallback={<Spinner />}>
        <FacilitatorApp />
      </Suspense>
    ),
  },
  // Anything else (including the developer pages in a production build) goes home.
  { path: '*', element: <Navigate to="/" replace /> },
]);
