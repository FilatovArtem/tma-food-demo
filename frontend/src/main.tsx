import {
  backButton,
  init,
  mainButton,
  miniApp,
  retrieveLaunchParams,
  themeParams,
  viewport,
} from '@telegram-apps/sdk-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { setInitDataRaw } from './api/client';
import './styles/reset.css';
import './styles/theme.css';

function bootstrap(): void {
  try {
    const launchParams = retrieveLaunchParams();
    const raw = (launchParams as { initDataRaw?: string; tgWebAppData?: unknown })
      .initDataRaw;
    if (raw) setInitDataRaw(raw);
  } catch {
    // Not inside Telegram WebView (dev / direct browser). Continue with empty initData.
    // Requests will 401 unless backend is bypassed via dev proxy.
  }

  try {
    init();
    miniApp.mount();
    themeParams.mount();
    viewport.mount().catch(() => undefined);
    backButton.mount();
    mainButton.mount();
    miniApp.ready();
  } catch {
    // SDK may fail outside TG environment. Pages should still render.
  }
}

bootstrap();

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
