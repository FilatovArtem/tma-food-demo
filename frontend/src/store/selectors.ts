import type { CartItem, CartState } from './cartStore';

export const selectCartList = (s: CartState): CartItem[] => Object.values(s.items);

export const selectCartCount = (s: CartState): number =>
  Object.values(s.items).reduce((n, i) => n + i.qty, 0);

export const selectCartTotal = (s: CartState): number =>
  Object.values(s.items).reduce((sum, i) => sum + i.dish.price * i.qty, 0);
