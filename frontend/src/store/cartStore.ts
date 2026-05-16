import { create } from 'zustand';
import type { Dish } from '@/types/api';

export interface CartItem {
  dish: Dish;
  qty: number;
}

export interface CartState {
  items: Record<number, CartItem>;
  add: (dish: Dish) => void;
  setQty: (dishId: number, qty: number) => void;
  remove: (dishId: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: {},
  add: (dish) =>
    set((s) => {
      const cur = s.items[dish.id];
      return { items: { ...s.items, [dish.id]: { dish, qty: (cur?.qty ?? 0) + 1 } } };
    }),
  setQty: (id, qty) =>
    set((s) => {
      if (qty <= 0) {
        const { [id]: _removed, ...rest } = s.items;
        return { items: rest };
      }
      const cur = s.items[id];
      if (!cur) return s;
      return { items: { ...s.items, [id]: { ...cur, qty } } };
    }),
  remove: (id) =>
    set((s) => {
      const { [id]: _removed, ...rest } = s.items;
      return { items: rest };
    }),
  clear: () => set({ items: {} }),
}));
