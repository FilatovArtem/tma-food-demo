import type { Category } from '@/types/api';
import styles from './CategoryTabs.module.css';

interface Props {
  categories: Category[];
  activeId: number | null;
  onChange: (id: number | null) => void;
}

export function CategoryTabs({ categories, activeId, onChange }: Props): JSX.Element {
  return (
    <nav className={styles.wrap} aria-label="Категории блюд">
      <button
        type="button"
        className={`${styles.tab} ${activeId === null ? styles.active : ''}`}
        onClick={() => onChange(null)}
      >
        Все
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`${styles.tab} ${activeId === c.id ? styles.active : ''}`}
          onClick={() => onChange(c.id)}
        >
          {c.name}
        </button>
      ))}
    </nav>
  );
}
