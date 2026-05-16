import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { selectCartList, selectCartTotal } from '@/store/selectors';
import { useBackButton } from '@/hooks/useBackButton';
import { useMainButton } from '@/hooks/useMainButton';
import { CartItem } from '@/components/CartItem';
import { EmptyState } from '@/components/EmptyState';
import styles from './CartPage.module.css';

export function CartPage(): JSX.Element {
  const navigate = useNavigate();
  const items = useCartStore(selectCartList);
  const total = useCartStore(selectCartTotal);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  useBackButton({ to: '/' });

  useMainButton(
    items.length > 0
      ? { text: `Оформить заказ · ${total}₽`, onClick: () => navigate('/order') }
      : null,
  );

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Корзина</h1>
        <EmptyState
          icon="🛒"
          title="Корзина пуста"
          description="Добавьте блюда из меню"
          action={{ label: 'К меню', onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Корзина</h1>
      <div className={styles.list}>
        {items.map((it) => (
          <CartItem
            key={it.dish.id}
            item={it}
            onChangeQty={(q) => setQty(it.dish.id, q)}
            onRemove={() => remove(it.dish.id)}
          />
        ))}
      </div>
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Итого</span>
        <span className={styles.totalValue}>{total}₽</span>
      </div>
      <button type="button" className={styles.submit} onClick={() => navigate('/order')}>
        Оформить заказ · {total}₽
      </button>
    </div>
  );
}
