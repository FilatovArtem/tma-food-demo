import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommend } from '@/api/ai';
import { getDishes } from '@/api/catalog';
import type { AIRecommendItem, Dish } from '@/types/api';
import { useCartStore } from '@/store/cartStore';
import { useBackButton } from '@/hooks/useBackButton';
import { useHaptic } from '@/hooks/useHaptic';
import { DishCard } from '@/components/DishCard';
import { CartFab } from '@/components/CartFab';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import styles from './AiPickerPage.module.css';

const EXAMPLES = [
  'что-то лёгкое до 400 рублей',
  'мясо с гарниром',
  'без глютена и сыра',
  'согревающий напиток',
];

export function AiPickerPage(): JSX.Element {
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.add);
  const haptic = useHaptic();

  const [query, setQuery] = useState('');
  const [recs, setRecs] = useState<AIRecommendItem[] | null>(null);
  const [dishes, setDishes] = useState<Map<number, Dish>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBackButton({ to: '/' });

  const handleSearch = async (q?: string): Promise<void> => {
    const text = (q ?? query).trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setRecs(null);
    try {
      const [recRes, allDishes] = await Promise.all([
        recommend(text),
        getDishes(),
      ]);
      const map = new Map<number, Dish>();
      for (const d of allDishes) map.set(d.id, d);
      setDishes(map);
      setRecs(recRes.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка AI');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (dish: Dish): void => {
    addToCart(dish);
    haptic.light();
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>✨ AI-подбор</h1>
      <p className={styles.hint}>Опишите что хотите — AI подберёт блюда из меню</p>

      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: что-то лёгкое до 400₽"
          maxLength={200}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void handleSearch();
            }
          }}
        />
        <button
          type="button"
          className={styles.searchBtn}
          onClick={() => void handleSearch()}
          disabled={loading || query.trim().length === 0}
        >
          {loading ? '…' : 'Подобрать'}
        </button>
      </div>

      <div className={styles.examples}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className={styles.exampleChip}
            onClick={() => {
              setQuery(ex);
              void handleSearch(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : null}

      {error ? (
        <EmptyState
          title="AI временно недоступен"
          description={error}
          action={{ label: 'Попробовать снова', onClick: () => void handleSearch() }}
        />
      ) : null}

      {!loading && recs !== null && recs.length === 0 ? (
        <EmptyState
          title="Ничего не подошло"
          description="Попробуйте сформулировать иначе"
          action={{ label: 'К меню', onClick: () => navigate('/') }}
        />
      ) : null}

      {!loading && recs !== null && recs.length > 0 ? (
        <div className={styles.recList}>
          {recs.map((rec) => {
            const dish = dishes.get(rec.dish_id);
            if (!dish) return null;
            return (
              <DishCard
                key={rec.dish_id}
                dish={dish}
                variant="row"
                onAdd={() => handleAdd(dish)}
                extra={<p className={styles.reason}>{rec.reason}</p>}
              />
            );
          })}
        </div>
      ) : null}

      <CartFab />
    </div>
  );
}
