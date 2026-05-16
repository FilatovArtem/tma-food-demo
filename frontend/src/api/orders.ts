import { request } from './client';
import type { Order, OrderCreate } from '@/types/api';

export function createOrder(payload: OrderCreate): Promise<Order> {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getOrder(id: number): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}
