import { request } from './client';
import type { Category, Dish } from '@/types/api';

export function getCategories(): Promise<Category[]> {
  return request<Category[]>('/categories');
}

export function getDishes(categoryId?: number | null): Promise<Dish[]> {
  const qs = categoryId != null ? `?category_id=${categoryId}` : '';
  return request<Dish[]>(`/dishes${qs}`);
}

export function getDish(id: number): Promise<Dish> {
  return request<Dish>(`/dishes/${id}`);
}
