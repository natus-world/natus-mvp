import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { App } from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { installErrorReporting } from '@/supabase/report-error';
import '@/styles/index.css';

installErrorReporting();

/**
 * The private design preview (16 Oct 2026) is a demo build served as a single
 * page under an address the router does not own, so it routes by hash.
 * Production keeps real paths.
 */
function Router({ children }: { children: ReactNode }) {
  return import.meta.env.VITE_ROUTER === 'hash' ? (
    <HashRouter>{children}</HashRouter>
  ) : (
    <BrowserRouter basename={import.meta.env.BASE_URL}>{children}</BrowserRouter>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    {/* basename tracks Vite's base so the app runs at a domain root and under
        a /natus-mvp/ subpath from the same build config. */}
    <Router>
      {/* Catches the shell itself — hydration, the door, the frame. The
          per-route boundary inside App handles anything narrower. */}
      <ErrorBoundary atRoot>
        <App />
      </ErrorBoundary>
    </Router>
  </StrictMode>,
);
