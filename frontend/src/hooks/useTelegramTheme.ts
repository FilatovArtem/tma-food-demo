import { themeParams, useSignal } from '@telegram-apps/sdk-react';
import { useEffect } from 'react';

export function useTelegramTheme(): void {
  const params = useSignal(themeParams.state);

  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(params)) {
      if (typeof v !== 'string') continue;
      const cssKey = '--tg-theme-' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      root.style.setProperty(cssKey, v);
    }
    const bg = (params as Record<string, unknown>).bgColor;
    if (typeof bg === 'string') {
      root.style.colorScheme = isDark(bg) ? 'dark' : 'light';
    }
  }, [params]);
}

function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
