import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import Shell from './Shell';
import BackGuard from './BackGuard';
import SignInScreen from '../screens/auth/SignInScreen';

// AuthGate pulls in Dexie and the Supabase profile sync; lazy so an
// unauthenticated /sign-in visit does not pay for that weight either.
const AuthGate = lazy(() => import('./AuthGate'));

// Only sign in stays eager: it is the true minimal entry point for a visit
// that is not yet authenticated, with no Dexie or drift/template engine
// weight behind it. Everything else, including Home, is code-split so a
// first paint on /sign-in does not pay for Home's full dependency graph
// (section 20: Performance > 90, FCP < 1.5s). Each chunk loads on demand and
// is cached by the service worker after first visit.
const SignUpScreen = lazy(() => import('../screens/auth/SignUpScreen'));
const ResetPasswordScreen = lazy(() => import('../screens/auth/ResetPasswordScreen'));
const OnboardingFlow = lazy(() => import('../screens/onboarding/OnboardingFlow'));
const HabitDetailScreen = lazy(() => import('../screens/habit/HabitDetailScreen'));
const GuideScreen = lazy(() => import('../screens/guide/GuideScreen'));
const HomeScreen = lazy(() => import('../screens/home/HomeScreen'));
const AreasScreen = lazy(() => import('../screens/areas/AreasScreen'));
const LogScreen = lazy(() => import('../screens/log/LogScreen'));
const InsightsScreen = lazy(() => import('../screens/insights/InsightsScreen'));
const SettingsScreen = lazy(() => import('../screens/settings/SettingsScreen'));

// A calm, blank hold during the brief chunk download, not a spinner. Only
// shows on a slow connection's first visit to a route; cached on repeat.
function RouteFallback() {
  return <div className="h-full bg-parchment-100" />;
}

export default function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <BackGuard />
      <Routes>
        <Route path="sign-in" element={<SignInScreen />} />
        <Route path="sign-up" element={<SignUpScreen />} />
        <Route path="reset-password" element={<ResetPasswordScreen />} />

        {/* AuthGate mounts once and owns the sync/realtime lifecycle; the app's
            own routing (including the habit overlay) lives below it in AppRoutes,
            so none of that machinery is torn down or duplicated when a habit is
            opened. */}
        <Route element={<AuthGate />}>
          <Route path="*" element={<AppRoutes />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

// The protected app routes, with the habit detail rendered as an overlay above
// the current tab rather than as a sibling that replaces it.
//
// When a habit is opened we stash the current location in `backgroundLocation`
// (see useOpenHabit). The primary <Routes> is then driven by that background, so
// the tab underneath (Home / Areas / Insights) stays mounted and untouched — its
// scroll, its cards, its Bloom, all preserved. A second <Routes> renders the
// habit on top from the real location. A back gesture drops `backgroundLocation`,
// the overlay unmounts, and the tab is revealed exactly as it was left: no
// remount, no reload, no flash. Opening a habit directly (deep link / refresh)
// has no background, so it simply renders full-screen from the primary <Routes>.
function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)
    ?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route path="onboarding" element={<OnboardingFlow />} />
        <Route path="guide" element={<GuideScreen />} />
        <Route path="habit/:habitId" element={<HabitDetailScreen />} />

        <Route element={<Shell />}>
          <Route index element={<HomeScreen />} />
          <Route path="areas" element={<AreasScreen />} />
          <Route path="log" element={<LogScreen />} />
          <Route path="insights" element={<InsightsScreen />} />
          <Route path="me" element={<SettingsScreen />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {backgroundLocation && (
        <div className="fixed inset-0 z-40 bg-parchment-100">
          <Routes>
            <Route path="habit/:habitId" element={<HabitDetailScreen />} />
          </Routes>
        </div>
      )}
    </>
  );
}
