/**
 * All routes in one place. Owner: P2 (P5 owns setup, /who, /join and /facilitator).
 * Add your feature's route here with a PR.
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { PlayerPicker, SetupFlow, WelcomeScreen } from '@/features/setup';
import { LessonList, LessonPlayer } from '@/games/investing/lessons';
import { TimeMachine } from '@/games/investing/time-machine';
import { Spinner } from '@/ui';
import { DevHome } from './DevHome';
import { StudentEntry } from './StudentEntry';
import { Dashboard } from '@/features/home';

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
  { path: '/dev', element: <DevHome /> },
  { path: '/learn/invest', element: <LessonList /> },
  { path: '/learn/invest/time-machine', element: <TimeMachine /> },
  { path: '/learn/invest/:lessonId', element: <LessonPlayer /> },
  {
    path: '/facilitator/*',
    element: (
      <Suspense fallback={<Spinner />}>
        <FacilitatorApp />
      </Suspense>
    ),
  },
]);
