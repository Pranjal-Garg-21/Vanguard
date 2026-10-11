/**
 * All routes in one place. Owner: P2 (P5 owns setup, /who, /join and /facilitator).
 * Add your feature's route here with a PR.
 */
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { Arcade, ArcadeHub, ArcadeRoute } from '@/features/arcade';
import { Landing } from '@/features/landing';
import { BaselineFlow } from '@/features/onboarding';
import { PaisapurGame } from '@/features/paisapur';
import { PlayerPicker, SetupFlow, WelcomeScreen } from '@/features/setup';
import { LearnHub, LessonList, LessonPlayer, PillarLessons } from '@/games/investing/lessons';
import { InvestOrScam } from '@/games/investing/invest-or-scam';
import { MutualFund } from '@/games/investing/mutual-fund';
import { StockMarket } from '@/games/investing/stock-market';
import { TimeMachine } from '@/games/investing/time-machine';
import { Spinner } from '@/ui';
import { DevHome } from './DevHome';
import { TileInspector } from './TileInspector';
import { Gallery } from './Gallery';
import { Dashboard, Minigames, Simulations } from '@/features/home';
import { PhoneLab } from '@/games/safe/phone';
import { SafeHub } from '@/games/safe/SafeHub';

// Lazy so students never download the dashboard.
const FacilitatorApp = lazy(() => import('@/facilitator/FacilitatorApp'));

/** Link inside the class QR code: /join/ABC123 opens setup with the code filled in. */
function JoinLink() {
  const { code = '' } = useParams();
  return <Navigate to={`/setup?code=${encodeURIComponent(code)}`} replace />;
}

/** Village screens keep dark text on parchment; the rest of the app is the dark theme. */
const village = (el: ReactNode) => <div className="theme-village contents">{el}</div>;

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/onboarding', element: <BaselineFlow /> },
  { path: '/arcade', element: <Arcade /> },
  // The older village-styled menu, still opened by the arcade cabinet in town.
  { path: '/arcade/village', element: village(<ArcadeHub />) },
  // The Everyday Money section of the Arcade (P3). ArcadeHub links here.
  { path: '/arcade/everyday', element: <ArcadeRoute /> },
  { path: '/play', element: village(<PaisapurGame />) },
  { path: '/village', element: <Navigate to="/play" replace /> },
  { path: '/welcome', element: <WelcomeScreen /> },
  { path: '/setup', element: <SetupFlow /> },
  { path: '/who', element: <PlayerPicker /> },
  { path: '/join/:code', element: <JoinLink /> },
  { path: '/home', element: <Dashboard /> },
  { path: '/simulations', element: <Simulations /> },
  { path: '/minigames', element: <Minigames /> },
  { path: '/practice', element: <Navigate to="/simulations" replace /> },
  // Developer tools only exist in development builds, so the final demo has no debug pages.
  ...(import.meta.env.DEV
    ? [
        { path: '/dev', element: <DevHome /> },
        { path: '/dev/tiles', element: <TileInspector /> },
        { path: '/dev/phone', element: <PhoneLab /> },
        { path: '/gallery', element: <Gallery /> },
      ]
    : []),
  { path: '/safe', element: <SafeHub /> },
  { path: '/safe/:sim', element: <SafeHub /> },
  { path: '/safe/:sim/:entry', element: <SafeHub /> },

  // Investing: a standalone lessons section, not part of the Paisapur story.
  { path: '/learn', element: <LearnHub /> },
  { path: '/learn/invest', element: <LessonList /> },
  { path: '/learn/invest/time-machine', element: <TimeMachine /> },
  { path: '/learn/invest/stock-market', element: <StockMarket /> },
  { path: '/learn/invest/mutual-fund', element: <MutualFund /> },
  { path: '/learn/invest/invest-or-scam', element: <InvestOrScam /> },
  { path: '/learn/invest/:lessonId', element: <LessonPlayer /> },
  { path: '/learn/:pillar', element: <PillarLessons /> },
  { path: '/learn/:pillar/:lessonId', element: <LessonPlayer /> },
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
