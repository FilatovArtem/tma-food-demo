import type { CartItem as CartItemType } from '@/store/cartStore';
import { QtyControl } from '@/components/QtyControl';
import styles from './CartItem.module.css';

interface Props {
  item: CartItemType;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onChangeQty, onRemove }: Props): JSX.Element {
  const { dish, qty } = item;
  const lineTotal = dish.price * qty;

  return (
    <div className={styles.row}>
      <img src={dish.photo_url} alt={dish.name} className={styles.thumb} loading="lazy" />
      <div className={styles.body}>
        <h4 className={styles.name}>{dish.name}</h4>
        <span className={styles.unitPrice}>{dish.price}₽ × {qty}</span>
        <div className={styles.controls}>
          <QtyControl qty={qty} onChange={onChangeQty} min={1} />
          <button type="button" className={styles.remove} onClick={onRemove} aria-label="Удалить">
            ×
          </button>
        </div>
      </div>
      <span className={styles.lineTotal}>{lineTotal}₽</span>
    </div>
  );
}
