import { mainButton } from '@telegram-apps/sdk-react';
import { useEffect } from 'react';

export interface MainButtonOptions {
  text: string;
  onClick: () => void;
  enabled?: boolean;
  color?: string;
  textColor?: string;
}

export function useMainButton(options: MainButtonOptions | null): void {
  useEffect(() => {
    if (!mainButton.isMounted()) return undefined;

    if (!options) {
      mainButton.setParams({ isVisible: false });
      return undefined;
    }

    const { text, onClick, enabled = true, color, textColor } = options;
    mainButton.setParams({
      text,
      isVisible: true,
      isEnabled: enabled,
      ...(color !== undefined ? { backgroundColor: color as `#${string}` } : {}),
      ...(textColor !== undefined ? { textColor: textColor as `#${string}` } : {}),
    });

    const off = mainButton.onClick(onClick);
    return () => {
      off();
      mainButton.setParams({ isVisible: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.text, options?.enabled, options?.color, options?.textColor, options?.onClick]);
}
