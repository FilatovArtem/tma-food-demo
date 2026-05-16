import { hapticFeedback } from '@telegram-apps/sdk-react';

type Impact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type Notify = 'success' | 'warning' | 'error';

interface Haptic {
  light: () => void;
  medium: () => void;
  success: () => void;
  warning: () => void;
  error: () => void;
}

function safeImpact(kind: Impact): void {
  try {
    if (hapticFeedback.impactOccurred.isAvailable()) {
      hapticFeedback.impactOccurred(kind);
    }
  } catch {
    // not in TG / older client — silent no-op
  }
}

function safeNotify(kind: Notify): void {
  try {
    if (hapticFeedback.notificationOccurred.isAvailable()) {
      hapticFeedback.notificationOccurred(kind);
    }
  } catch {
    // ignore
  }
}

export function useHaptic(): Haptic {
  return {
    light: () => safeImpact('light'),
    medium: () => safeImpact('medium'),
    success: () => safeNotify('success'),
    warning: () => safeNotify('warning'),
    error: () => safeNotify('error'),
  };
}
