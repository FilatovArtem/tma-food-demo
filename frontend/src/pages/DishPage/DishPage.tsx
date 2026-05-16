import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDish } from '@/api/catalog';
import type { Dish } from '@/types/api';
import { useCartStore } from '@/store/cartStore';
import { useBackButton } from '@/hooks/useBackButton';
import { useMainButton } from '@/hooks/useMainButton';
import { useHaptic } from '@/hooks/useHaptic';
import { QtyControl } from '@/components/QtyControl';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import styles from './DishPage.module.css';

export function DishPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.add);
  const haptic = useHaptic();

  const [dish, setDish] = useState<Dish | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useBackButton({ to: '/' });

  useEffect(() => {
    if (!id) return;
    const dishId = Number(id);
    if (!Number.isFinite(dishId)) return;
    setLoading(true);
    setError(null);
    getDish(dishId)
      .then(setDish)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const total = dish ? dish.price * qty : 0;

  const handleAdd = (): void => {
    if (!dish) return;
    for (let i = 0; i < qty; i += 1) addToCart(dish);
    haptic.success();
    navigate('/');
  };

  useMainButton(
    dish && dish.is_available
      ? { text: `Добавить · ${total}₽`, onClick: handleAdd }
      : null,
  );

  if (loading) return <Spinner />;
  if (error || !dish) {
    return (
      <EmptyState
        title="Блюдо не найдено"
        description={error ?? undefined}
        action={{ label: 'К меню', onClick: () => navigate('/') }}
      />
    );
  }

  return (
    <div className={styles.page}>
      <img src={dish.photo_url} alt={dish.name} className={styles.photo} />
      <div className={styles.body}>
        <h1 className={styles.title}>{dish.name}</h1>
        <p className={styles.desc}>{dish.description}</p>

        {dish.composition ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Состав</h3>
            <p className={styles.sectionText}>{dish.composition}</p>
          </section>
        ) : null}

        {dish.calories != null ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Калорийность</h3>
            <p className={styles.sectionText}>{dish.calories} ккал</p>
          </section>
        ) : null}

        <div className={styles.priceRow}>
          <span className={styles.price}>{dish.price}₽</span>
          <QtyControl qty={qty} onChange={setQty} min={1} />
        </div>

        {!dish.is_available ? (
          <p className={styles.unavailable}>Это блюдо сейчас недоступно</p>
        ) : null}

        <button
          type="button"
          className={styles.addBtn}
          onClick={handleAdd}
          disabled={!dish.is_available}
        >
          Добавить в корзину · {total}₽
        </button>
      </div>
    </div>
  );
}
