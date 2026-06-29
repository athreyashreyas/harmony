import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './Shell';
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
      <Routes>
        <Route path="sign-in" element={<SignInScreen />} />
        <Route path="sign-up" element={<SignUpScreen />} />
        <Route path="reset-password" element={<ResetPasswordScreen />} />

        <Route element={<AuthGate />}>
          <Route path="onboarding" element={<OnboardingFlow />} />
          <Route path="habit/:habitId" element={<HabitDetailScreen />} />

          <Route element={<Shell />}>
            <Route index element={<HomeScreen />} />
            <Route path="areas" element={<AreasScreen />} />
            <Route path="log" element={<LogScreen />} />
            <Route path="insights" element={<InsightsScreen />} />
            <Route path="me" element={<SettingsScreen />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
