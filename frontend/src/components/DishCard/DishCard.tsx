import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Dish } from '@/types/api';
import styles from './DishCard.module.css';

interface Props {
  dish: Dish;
  onAdd?: () => void;
  variant?: 'grid' | 'row';
  extra?: ReactNode;
}

export function DishCard({ dish, onAdd, variant = 'grid', extra }: Props): JSX.Element {
  const isRow = variant === 'row';

  return (
    <article className={isRow ? styles.row : styles.card}>
      <Link to={`/dish/${dish.id}`} className={isRow ? styles.rowImageLink : styles.imageLink}>
        <img
          src={dish.photo_url}
          alt={dish.name}
          className={isRow ? styles.rowImage : styles.image}
          loading="lazy"
        />
      </Link>
      <div className={isRow ? styles.rowBody : styles.body}>
        <Link to={`/dish/${dish.id}`} className={styles.titleLink}>
          <h3 className={styles.title}>{dish.name}</h3>
        </Link>
        <p className={styles.desc}>{dish.description}</p>
        {extra}
        <div className={styles.footer}>
          <span className={styles.price}>{dish.price}₽</span>
          {onAdd ? (
            <button
              type="button"
              className={styles.add}
              onClick={(e) => {
                e.preventDefault();
                onAdd();
              }}
            >
              + В корзину
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
