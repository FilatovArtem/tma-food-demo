import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getDishes } from '@/api/catalog';
import type { Category, Dish } from '@/types/api';
import { useCartStore } from '@/store/cartStore';
import { useHaptic } from '@/hooks/useHaptic';
import { CategoryTabs } from '@/components/CategoryTabs';
import { DishCard } from '@/components/DishCard';
import { CartFab } from '@/components/CartFab';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import styles from './CatalogPage.module.css';

export function CatalogPage(): JSX.Element {
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.add);
  const haptic = useHaptic();

  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getCategories(), getDishes(activeCategory ?? undefined)])
      .then(([cats, ds]) => {
        if (cancelled) return;
        setCategories(cats);
        setDishes(ds);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message || 'Не удалось загрузить меню');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const handleAdd = (dish: Dish): void => {
    addToCart(dish);
    haptic.light();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.brand}>FoodOrder</h1>
        <button
          type="button"
          className={styles.aiBtn}
          onClick={() => navigate('/ai')}
        >
          ✨ Подобрать с AI
        </button>
      </header>

      <CategoryTabs
        categories={categories}
        activeId={activeCategory}
        onChange={setActiveCategory}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <EmptyState
          title="Не удалось загрузить меню"
          description={error}
          action={{ label: 'Повторить', onClick: () => setActiveCategory(activeCategory) }}
        />
      ) : dishes.length === 0 ? (
        <EmptyState title="В этой категории пока пусто" />
      ) : (
        <section className={styles.grid}>
          {dishes.map((d) => (
            <DishCard key={d.id} dish={d} onAdd={() => handleAdd(d)} />
          ))}
        </section>
      )}

      <CartFab />
    </div>
  );
}
