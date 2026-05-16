import styles from './QtyControl.module.css';

interface Props {
  qty: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

export function QtyControl({ qty, onChange, min = 0, max = 99 }: Props): JSX.Element {
  const dec = (): void => {
    if (qty > min) onChange(qty - 1);
  };
  const inc = (): void => {
    if (qty < max) onChange(qty + 1);
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        onClick={dec}
        disabled={qty <= min}
        aria-label="Уменьшить"
      >
        −
      </button>
      <span className={styles.num}>{qty}</span>
      <button
        type="button"
        className={styles.btn}
        onClick={inc}
        disabled={qty >= max}
        aria-label="Увеличить"
      >
        +
      </button>
    </div>
  );
}
