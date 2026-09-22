import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogPage } from '../CatalogPage';
import * as catalogApi from '@/api/catalog';
import type { Category, Dish } from '@/types/api';

const category: Category = { id: 1, name: 'Пицца', slug: 'pizza', order: 1 };
const dish: Dish = {
  id: 1,
  category_id: 1,
  name: 'Маргарита',
  description: 'Томат, моцарелла',
  composition: null,
  calories: null,
  price: 450,
  photo_url: '',
  is_available: true,
};

afterEach(() => {
  vi.restoreAllMocks();
  // vite.config's `test` block has no `globals: true`, so RTL's own
  // auto-cleanup (which hooks a global `afterEach`) never registers.
  cleanup();
});

function renderPage(): void {
  render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>,
  );
}

describe('CatalogPage loading/error/success states', () => {
  it('shows a spinner while the initial fetch is in flight', () => {
    vi.spyOn(catalogApi, 'getCategories').mockReturnValue(new Promise(() => {}));
    vi.spyOn(catalogApi, 'getDishes').mockReturnValue(new Promise(() => {}));

    renderPage();

    // getByRole throws if the spinner isn't there — that's the assertion.
    screen.getByRole('status', { name: 'Загрузка' });
  });

  it('renders the dishes once both requests resolve', async () => {
    vi.spyOn(catalogApi, 'getCategories').mockResolvedValue([category]);
    vi.spyOn(catalogApi, 'getDishes').mockResolvedValue([dish]);

    renderPage();

    await waitFor(() => screen.getByText('Маргарита'));
    expect(screen.queryByRole('status', { name: 'Загрузка' })).toBeNull();
  });

  it('shows the error message and a retry action when the fetch rejects', async () => {
    vi.spyOn(catalogApi, 'getCategories').mockResolvedValue([category]);
    vi.spyOn(catalogApi, 'getDishes').mockRejectedValue(new Error('Сеть недоступна'));

    renderPage();

    await waitFor(() => screen.getByText('Сеть недоступна'));
    screen.getByText('Не удалось загрузить меню');
    screen.getByRole('button', { name: 'Повторить' });
    expect(screen.queryByText('Маргарита')).toBeNull();
  });
});
