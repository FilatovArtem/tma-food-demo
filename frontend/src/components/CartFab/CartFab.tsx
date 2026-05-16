import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { selectCartCount, selectCartTotal } from '@/store/selectors';
import styles from './CartFab.module.css';

export function CartFab(): JSX.Element | null {
  const navigate = useNavigate();
  const count = useCartStore(selectCartCount);
  const total = useCartStore(selectCartTotal);

  if (count === 0) return null;

  return (
    <button
      type="button"
      className={styles.fab}
      onClick={() => navigate('/cart')}
      aria-label="Открыть корзину"
    >
      <span className={styles.icon}>🛒</span>
      <span className={styles.count}>{count}</span>
      <span className={styles.total}>{total}₽</span>
    </button>
  );
}
