import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTelegramTheme } from '@/hooks/useTelegramTheme';
import { CatalogPage } from '@/pages/CatalogPage';
import { DishPage } from '@/pages/DishPage';
import { CartPage } from '@/pages/CartPage';
import { OrderPage } from '@/pages/OrderPage';
import { AiPickerPage } from '@/pages/AiPickerPage';
import { StatusPage } from '@/pages/StatusPage';

export function App(): JSX.Element {
  useTelegramTheme();

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/dish/:id" element={<DishPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/ai" element={<AiPickerPage />} />
          <Route path="/status/:id" element={<StatusPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
