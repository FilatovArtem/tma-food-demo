import { backButton } from '@telegram-apps/sdk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseBackButtonOptions {
  to?: string;
}

export function useBackButton(options: UseBackButtonOptions = {}): void {
  const navigate = useNavigate();
  const { to } = options;

  useEffect(() => {
    if (!backButton.isMounted()) return undefined;
    backButton.show();
    const off = backButton.onClick(() => {
      if (to !== undefined) {
        navigate(to);
      } else {
        navigate(-1);
      }
    });
    return () => {
      off();
      backButton.hide();
    };
  }, [navigate, to]);
}
