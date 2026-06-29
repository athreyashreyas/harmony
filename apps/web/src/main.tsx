import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import Router from './app/Router';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { initInstallCapture } from './lib/push/install';
import { initSyncStatus } from './lib/sync/status';
import { setupPWA } from './pwa';
import './styles/index.css';

// Capture the browser install prompt early so onboarding screen 6 can offer it.
initInstallCapture();
// Register the service worker and wire seamless updates.
setupPWA();
// Track online/offline for the sync dot (section 20).
initSyncStatus();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* prefers-reduced-motion: reduce makes every spring and tween instant
        app-wide (section 20), without removing any functional motion. */}
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </ErrorBoundary>
    </MotionConfig>
  </StrictMode>,
);
