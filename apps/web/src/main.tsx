import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Router from './app/Router';
import { initInstallCapture } from './lib/push/install';
import { setupPWA } from './pwa';
import './styles/index.css';

// Capture the browser install prompt early so onboarding screen 6 can offer it.
initInstallCapture();
// Register the service worker and wire seamless updates.
setupPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  </StrictMode>,
);
