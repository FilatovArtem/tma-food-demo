import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from '../cartStore';
import { selectCartCount, selectCartTotal } from '../selectors';
import type { Dish } from '@/types/api';

function makeDish(id: number, price: number): Dish {
  return {
    id,
    category_id: 1,
    name: `Dish ${id}`,
    description: '',
    composition: null,
    calories: null,
    price,
    photo_url: '',
    is_available: true,
  };
}

beforeEach(() => {
  useCartStore.setState({ items: {} });
});

describe('cartStore.add', () => {
  it('adds a new dish with qty 1', () => {
    useCartStore.getState().add(makeDish(1, 100));
    expect(useCartStore.getState().items[1]?.qty).toBe(1);
  });

  it('increments qty when the same dish is added again', () => {
    const dish = makeDish(1, 100);
    useCartStore.getState().add(dish);
    useCartStore.getState().add(dish);
    expect(useCartStore.getState().items[1]?.qty).toBe(2);
  });
});

describe('cartStore.setQty', () => {
  it('updates qty for an existing item', () => {
    useCartStore.getState().add(makeDish(1, 100));
    useCartStore.getState().setQty(1, 5);
    expect(useCartStore.getState().items[1]?.qty).toBe(5);
  });

  it('removes the item when qty drops to 0', () => {
    useCartStore.getState().add(makeDish(1, 100));
    useCartStore.getState().setQty(1, 0);
    expect(useCartStore.getState().items[1]).toBeUndefined();
  });

  it('removes the item when qty goes negative', () => {
    useCartStore.getState().add(makeDish(1, 100));
    useCartStore.getState().setQty(1, -3);
    expect(useCartStore.getState().items[1]).toBeUndefined();
  });

  it('is a no-op for an id that is not in the cart', () => {
    useCartStore.getState().setQty(999, 3);
    expect(useCartStore.getState().items).toEqual({});
  });
});

describe('cartStore.remove / clear', () => {
  it('removes a single item by id', () => {
    useCartStore.getState().add(makeDish(1, 100));
    useCartStore.getState().add(makeDish(2, 200));
    useCartStore.getState().remove(1);
    expect(Object.keys(useCartStore.getState().items)).toEqual(['2']);
  });

  it('clears the whole cart', () => {
    useCartStore.getState().add(makeDish(1, 100));
    useCartStore.getState().add(makeDish(2, 200));
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toEqual({});
  });
});

describe('selectors', () => {
  it('selectCartCount sums quantities, not item count', () => {
    useCartStore.getState().add(makeDish(1, 100));
    useCartStore.getState().setQty(1, 3);
    useCartStore.getState().add(makeDish(2, 50));
    expect(selectCartCount(useCartStore.getState())).toBe(4);
  });

  it('selectCartTotal sums price * qty across items', () => {
    useCartStore.getState().add(makeDish(1, 150));
    useCartStore.getState().setQty(1, 2); // 300
    useCartStore.getState().add(makeDish(2, 90)); // 90
    expect(selectCartTotal(useCartStore.getState())).toBe(390);
  });

  it('selectCartTotal is 0 for an empty cart', () => {
    expect(selectCartTotal(useCartStore.getState())).toBe(0);
  });
});
