import { miniApp } from '@telegram-apps/sdk-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrder } from '@/api/orders';
import type { Order } from '@/types/api';
import { useMainButton } from '@/hooks/useMainButton';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import styles from './StatusPage.module.css';

export function StatusPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const orderId = Number(id);
    if (!Number.isFinite(orderId)) return;
    getOrder(orderId)
      .then(setOrder)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleClose = (): void => {
    try {
      if (miniApp.close.isAvailable()) {
        miniApp.close();
        return;
      }
    } catch {
      // not in TG — fallback below
    }
    navigate('/');
  };

  useMainButton({ text: 'Закрыть', onClick: handleClose });

  if (loading) return <Spinner />;
  if (error || !order) {
    return (
      <EmptyState
        title="Заказ не найден"
        description={error ?? undefined}
        action={{ label: 'К меню', onClick: () => navigate('/') }}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.check}>✅</div>
      <h1 className={styles.title}>Заказ #{order.id} принят!</h1>
      <p className={styles.subtitle}>Мы получили ваш заказ и скоро начнём готовить</p>

      <section className={styles.summary}>
        <h3 className={styles.summaryTitle}>Состав заказа</h3>
        {order.items.map((it) => (
          <div className={styles.row} key={it.dish_id}>
            <span>
              {it.dish_name} × {it.qty}
            </span>
            <span>{it.unit_price * it.qty}₽</span>
          </div>
        ))}
        <div className={`${styles.row} ${styles.total}`}>
          <span>Итого</span>
          <span>{order.total}₽</span>
        </div>
      </section>

      <button type="button" className={styles.closeBtn} onClick={handleClose}>
        Закрыть
      </button>
    </div>
  );
}
