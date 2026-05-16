import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '@/api/orders';
import { useCartStore } from '@/store/cartStore';
import { selectCartList, selectCartTotal } from '@/store/selectors';
import { useBackButton } from '@/hooks/useBackButton';
import { useMainButton } from '@/hooks/useMainButton';
import { useHaptic } from '@/hooks/useHaptic';
import { EmptyState } from '@/components/EmptyState';
import styles from './OrderPage.module.css';

function getInitialName(): string {
  try {
    const params = retrieveLaunchParams() as {
      tgWebAppData?: { user?: { firstName?: string; first_name?: string } };
      initData?: { user?: { firstName?: string; first_name?: string } };
    };
    const candidates = [
      params.initData?.user?.firstName,
      params.initData?.user?.first_name,
      params.tgWebAppData?.user?.firstName,
      params.tgWebAppData?.user?.first_name,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) return c;
    }
    return '';
  } catch {
    return '';
  }
}

const PHONE_REGEX = /^[\d\s+()-]{10,18}$/;

export function OrderPage(): JSX.Element {
  const navigate = useNavigate();
  const items = useCartStore(selectCartList);
  const total = useCartStore(selectCartTotal);
  const clearCart = useCartStore((s) => s.clear);
  const haptic = useHaptic();

  const [name, setName] = useState(getInitialName);
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBackButton({ to: '/cart' });

  const isValid =
    name.trim().length > 0 && PHONE_REGEX.test(phone.trim()) && items.length > 0;

  const handleSubmit = async (): Promise<void> => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrder({
        items: items.map((it) => ({ dish_id: it.dish.id, qty: it.qty })),
        name: name.trim(),
        phone: phone.trim(),
        comment: comment.trim() || null,
      });
      haptic.success();
      clearCart();
      navigate(`/status/${order.id}`);
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? e.message : 'Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  };

  useMainButton(
    items.length > 0
      ? {
          text: submitting ? 'Отправляем…' : 'Подтвердить заказ',
          onClick: () => {
            void handleSubmit();
          },
          enabled: isValid && !submitting,
        }
      : null,
  );

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="Сначала добавьте блюда"
          action={{ label: 'К меню', onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Оформление заказа</h1>

      <section className={styles.summary}>
        <h2 className={styles.summaryTitle}>Ваш заказ</h2>
        {items.map((it) => (
          <div className={styles.summaryRow} key={it.dish.id}>
            <span>
              {it.dish.name} × {it.qty}
            </span>
            <span className={styles.summaryPrice}>{it.dish.price * it.qty}₽</span>
          </div>
        ))}
        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <span>Итого</span>
          <span>{total}₽</span>
        </div>
      </section>

      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <label className={styles.field}>
          <span className={styles.label}>Имя</span>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться?"
            autoComplete="given-name"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Телефон</span>
          <input
            className={styles.input}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 999 123-45-67"
            autoComplete="tel"
            inputMode="tel"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Комментарий (необязательно)</span>
          <textarea
            className={styles.textarea}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Без лука, пожалуйста"
            rows={3}
            maxLength={500}
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button
          type="button"
          className={styles.submit}
          disabled={!isValid || submitting}
          onClick={() => {
            void handleSubmit();
          }}
        >
          {submitting ? 'Отправляем…' : `Подтвердить заказ · ${total}₽`}
        </button>
      </form>
    </div>
  );
}
