import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './Shell';
import AuthGate from './AuthGate';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import OnboardingFlow from '../screens/onboarding/OnboardingFlow';
import HomeScreen from '../screens/home/HomeScreen';
import AreasScreen from '../screens/areas/AreasScreen';
import LogScreen from '../screens/log/LogScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

export default function Router() {
  return (
    <Routes>
      <Route path="sign-in" element={<SignInScreen />} />
      <Route path="sign-up" element={<SignUpScreen />} />

      <Route element={<AuthGate />}>
        <Route path="onboarding" element={<OnboardingFlow />} />

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
  );
}
